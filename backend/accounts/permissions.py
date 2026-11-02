from rest_framework.permissions import BasePermission

from .models import Account


class HasAccount(BasePermission):
    """Signed in with Supabase and has created a Kazi Connect account."""

    message = "Finish creating your Kazi Connect account first."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.account)


class IsActiveAccount(HasAccount):
    """The account is Active: email and phone verified, not suspended (BR-F-02, SR-F-SAF-03)."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        status = request.user.account.status
        if status == Account.Status.PENDING_VERIFICATION:
            self.message = "Verify your phone number to activate your account."
        elif status != Account.Status.ACTIVE:
            self.message = f"Your account is {request.user.account.get_status_display().lower()}. Contact support."
        return status == Account.Status.ACTIVE


class HasProviderProfile(IsActiveAccount):
    """Has started the provider upgrade. Pending providers may draft listings."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        self.message = "Start the upgrade to a provider account first."
        return request.user.account.provider_profile_or_none is not None


class IsActiveProvider(IsActiveAccount):
    """Has finished every provider upgrade step (SR-F-ACC-09)."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        self.message = "Finish the provider upgrade steps first."
        return request.user.account.is_active_provider
