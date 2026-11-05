from rest_framework import serializers

from core.models import PlatformSettings

from . import services
from .models import Account
from .phone import mask_phone, normalize_kenyan_mobile


class KenyanPhoneField(serializers.CharField):
    def to_internal_value(self, data):
        phone = normalize_kenyan_mobile(super().to_internal_value(data))
        if phone is None:
            raise serializers.ValidationError("Enter a Kenyan mobile number like 0712 345 678.")
        return phone


class AccountCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(min_length=2, max_length=120)
    phone = KenyanPhoneField()
    accept_terms = serializers.BooleanField()
    accept_privacy = serializers.BooleanField()

    def validate_accept_terms(self, value):
        if not value:
            raise serializers.ValidationError("You need to accept the terms of use.")
        return value

    def validate_accept_privacy(self, value):
        if not value:
            raise serializers.ValidationError("You need to accept the privacy notice.")
        return value


class AccountUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(min_length=2, max_length=120, required=False)
    phone = KenyanPhoneField(required=False)


class CodeSerializer(serializers.Serializer):
    code = serializers.RegexField(r"^\d{6}$", error_messages={"invalid": "Enter the 6-digit code."})


class PhoneSerializer(serializers.Serializer):
    phone = KenyanPhoneField()


class ModeSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=Account.Mode.choices)


class CategoryChoiceSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=Account.Category.choices)


class StudentEmailSerializer(serializers.Serializer):
    student_email = serializers.EmailField()


class TokenSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=100)


class ProviderUpdateSerializer(serializers.Serializer):
    bio = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    skills = serializers.ListField(
        child=serializers.CharField(max_length=40), max_length=15, required=False
    )


class AccountSerializer(serializers.ModelSerializer):
    """Everything the app needs about the signed-in user, returned by every account action."""

    phone_verified = serializers.SerializerMethodField()
    phone_verification_enabled = serializers.SerializerMethodField()
    student_verification = serializers.SerializerMethodField()
    provider = serializers.SerializerMethodField()
    commission_percent = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            "id", "full_name", "email", "phone", "phone_verified", "phone_verification_enabled", "category", "status",
            "active_mode", "created_at", "student_verification", "provider", "commission_percent",
        ]

    def get_phone_verified(self, account):
        return account.phone_verified_at is not None

    def get_phone_verification_enabled(self, account):
        """Tells the app whether to ask for SMS codes (system evolution E-02)."""
        return services.phone_verification_enabled()

    def get_student_verification(self, account):
        verification = services.current_student_verification(account)
        if verification is None:
            return None
        return {
            "student_email": verification.student_email,
            "verified_at": verification.verified_at,
            "expires_at": verification.expires_at,
            "link_pending": verification.token_hash is not None,
        }

    def get_provider(self, account):
        profile = account.provider_profile_or_none
        if profile is None:
            return None
        checklist = services.provider_checklist(profile)
        return {
            "status": profile.status,
            "bio": profile.bio,
            "skills": profile.skills,
            "payout_phone": mask_phone(profile.payout_phone),
            "payout_phone_verified": profile.payout_phone_verified_at is not None,
            "experience_level": profile.experience_level,
            "checklist": checklist,
            "steps_done": sum(step["done"] for step in checklist),
        }

    def get_commission_percent(self, account):
        return PlatformSettings.load().commission_percent_for(account.category)
