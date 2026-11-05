from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .permissions import HasAccount, HasProviderProfile, IsActiveAccount
from .serializers import (
    AccountCreateSerializer,
    AccountSerializer,
    AccountUpdateSerializer,
    CategoryChoiceSerializer,
    CodeSerializer,
    ModeSerializer,
    PhoneSerializer,
    ProviderUpdateSerializer,
    StudentEmailSerializer,
    TokenSerializer,
)


def account_response(account, status_code=status.HTTP_200_OK):
    account.refresh_from_db()
    return Response(AccountSerializer(account).data, status=status_code)


def validated(serializer_class, request):
    serializer = serializer_class(data=request.data)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


class MeView(APIView):
    """GET the signed-in user's account, POST to create it after Supabase sign-up, PATCH to edit it."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        account = request.user.account
        if account is None:
            return Response({"detail": "No Kazi Connect account yet.", "code": "no_account"}, status=status.HTTP_404_NOT_FOUND)
        return Response(AccountSerializer(services.activate_without_phone_check(account)).data)

    def post(self, request):
        if request.user.account is not None:
            return Response({"detail": "You already have an account."}, status=status.HTTP_409_CONFLICT)
        data = validated(AccountCreateSerializer, request)
        account = services.create_account(request.user, data["full_name"], data["phone"])
        return account_response(account, status.HTTP_201_CREATED)

    def patch(self, request):
        if request.user.account is None:
            return Response({"detail": "No Kazi Connect account yet."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AccountUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return account_response(services.update_account(request.user.account, **serializer.validated_data))


class SendPhoneCodeView(APIView):
    permission_classes = [HasAccount]
    throttle_scope = "otp"

    def post(self, request):
        services.send_account_phone_code(request.user.account)
        return Response({"detail": "We sent a 6-digit code to your phone."})


class VerifyPhoneView(APIView):
    permission_classes = [HasAccount]

    def post(self, request):
        data = validated(CodeSerializer, request)
        return account_response(services.verify_account_phone(request.user.account, data["code"]))


class SwitchModeView(APIView):
    permission_classes = [IsActiveAccount]

    def post(self, request):
        data = validated(ModeSerializer, request)
        return account_response(services.switch_mode(request.user.account, data["mode"]))


class StudentVerificationRequestView(APIView):
    permission_classes = [IsActiveAccount]
    throttle_scope = "student_email"

    def post(self, request):
        data = validated(StudentEmailSerializer, request)
        verification = services.request_student_verification(request.user.account, data["student_email"])
        return Response({"detail": f"We emailed a link to {verification.student_email}. It expires in 24 hours."})


class StudentVerificationConfirmView(APIView):
    """Opened from the emailed link, possibly in a browser where the user isn't signed in."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        data = validated(TokenSerializer, request)
        verification = services.confirm_student_verification(data["token"])
        return Response({"detail": f"{verification.student_email} is verified. Your account is now in the Student category."})


class ProviderView(APIView):
    """POST starts the provider upgrade; PATCH saves bio and skills (checklist step a)."""

    def get_permissions(self):
        return [IsActiveAccount()] if self.request.method == "POST" else [HasProviderProfile()]

    def post(self, request):
        services.start_provider_upgrade(request.user.account)
        return account_response(request.user.account, status.HTTP_201_CREATED)

    def patch(self, request):
        data = validated(ProviderUpdateSerializer, request)
        services.update_provider_profile(request.user.account.provider_profile, **data)
        return account_response(request.user.account)


class PayoutPhoneView(APIView):
    """Save the payout number without a code, while SMS verification is switched off."""

    permission_classes = [HasProviderProfile]

    def post(self, request):
        data = validated(PhoneSerializer, request)
        services.set_payout_phone(request.user.account.provider_profile, data["phone"])
        return account_response(request.user.account)


class PayoutPhoneSendCodeView(APIView):
    permission_classes = [HasProviderProfile]
    throttle_scope = "otp"

    def post(self, request):
        data = validated(PhoneSerializer, request)
        services.send_payout_phone_code(request.user.account.provider_profile, data["phone"])
        return Response({"detail": "We sent a 6-digit code to your M-Pesa number."})


class PayoutPhoneVerifyView(APIView):
    permission_classes = [HasProviderProfile]

    def post(self, request):
        data = validated(CodeSerializer, request)
        services.verify_payout_phone(request.user.account.provider_profile, data["code"])
        return account_response(request.user.account)


class ProviderCategoryView(APIView):
    permission_classes = [HasProviderProfile]

    def post(self, request):
        data = validated(CategoryChoiceSerializer, request)
        services.confirm_provider_category(request.user.account.provider_profile, data["category"])
        return account_response(request.user.account)


class CodeOfConductView(APIView):
    permission_classes = [HasProviderProfile]

    def post(self, request):
        services.accept_code_of_conduct(request.user.account.provider_profile)
        return account_response(request.user.account)
