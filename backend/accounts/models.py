from django.db import models
from django.db.models import Q


class AccountCategory(models.TextChoices):
    STUDENT = "student", "Student"
    GENERAL = "general", "General"


class AccountStatus(models.TextChoices):
    PENDING_VERIFICATION = "pending_verification", "Pending verification"
    ACTIVE = "active", "Active"
    SUSPENDED = "suspended", "Suspended"
    BANNED = "banned", "Banned"
    DEACTIVATED = "deactivated", "Deactivated"


class AccountMode(models.TextChoices):
    CLIENT = "client", "Hiring"
    PROVIDER = "provider", "Working"


class Account(models.Model):
    """A Kazi Connect user (the SRS "User" entity).

    Supabase Auth owns the password and sign-in. This row holds everything the
    marketplace needs, linked to the Supabase user by `supabase_user_id`.
    Staff accounts are separate: they are Django admin users (BRU-18).
    """

    Category = AccountCategory
    Status = AccountStatus
    Mode = AccountMode

    supabase_user_id = models.UUIDField(unique=True, editable=False)
    full_name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    phone = models.CharField(max_length=13, help_text="Kenyan mobile number, e.g. +254712345678")
    phone_verified_at = models.DateTimeField(null=True, blank=True)
    category = models.CharField(max_length=10, choices=Category.choices, default=Category.GENERAL)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING_VERIFICATION)
    active_mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.CLIENT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # SR-F-ACC-04: a phone number belongs to one account. Only verified numbers count,
            # so nobody can block a number by typing it into the sign-up form.
            models.UniqueConstraint(
                fields=["phone"], condition=Q(phone_verified_at__isnull=False), name="account_verified_phone_unique"
            ),
            models.CheckConstraint(condition=Q(category__in=AccountCategory.values), name="account_category_valid"),
            models.CheckConstraint(condition=Q(status__in=AccountStatus.values), name="account_status_valid"),
            models.CheckConstraint(condition=Q(active_mode__in=AccountMode.values), name="account_mode_valid"),
        ]

    def __str__(self):
        return f"{self.full_name} <{self.email}>"

    @property
    def is_active(self):
        return self.status == self.Status.ACTIVE

    @property
    def provider_profile_or_none(self):
        try:
            return self.provider_profile
        except ProviderProfile.DoesNotExist:
            return None

    @property
    def is_active_provider(self):
        profile = self.provider_profile_or_none
        return profile is not None and profile.status == ProviderProfile.Status.ACTIVE


class ProviderProfileStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACTIVE = "active", "Active"


class ProviderProfileExperienceLevel(models.TextChoices):
    ENTRY = "entry", "Entry"
    INTERMEDIATE = "intermediate", "Intermediate"
    EXPERIENCED = "experienced", "Experienced"


class ProviderProfile(models.Model):
    """Created when a client starts the upgrade to provider (SR-F-ACC-08/09)."""

    Status = ProviderProfileStatus
    ExperienceLevel = ProviderProfileExperienceLevel

    account = models.OneToOneField(Account, on_delete=models.CASCADE, related_name="provider_profile")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    bio = models.TextField(blank=True)
    skills = models.JSONField(default=list, blank=True)
    payout_phone = models.CharField(max_length=13, blank=True)
    payout_phone_verified_at = models.DateTimeField(null=True, blank=True)
    category_confirmed_at = models.DateTimeField(null=True, blank=True)
    # Recalculated from completed bookings once bookings exist (SR-F-PRC-02).
    experience_level = models.CharField(max_length=12, choices=ExperienceLevel.choices, default=ExperienceLevel.ENTRY)
    activated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(status__in=ProviderProfileStatus.values), name="providerprofile_status_valid"),
            models.CheckConstraint(
                condition=Q(experience_level__in=ProviderProfileExperienceLevel.values), name="providerprofile_level_valid"
            ),
        ]

    def __str__(self):
        return f"Provider: {self.account.full_name}"


class PhoneVerification(models.Model):
    """A 6-digit SMS code sent to confirm a phone number (SR-F-ACC-03)."""

    class Purpose(models.TextChoices):
        ACCOUNT_PHONE = "account_phone", "Account phone"
        PAYOUT_PHONE = "payout_phone", "M-Pesa payout number"

    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="phone_verifications")
    purpose = models.CharField(max_length=20, choices=Purpose.choices)
    phone = models.CharField(max_length=13)
    code_hash = models.CharField(max_length=64)  # never store the code itself
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["phone", "created_at"], name="phoneverif_phone_created_idx")]

    def __str__(self):
        return f"{self.get_purpose_display()} code for {self.phone}"


class UniversityDomain(models.Model):
    """Email domains that prove Student status. Adding a campus is a new row, not a code change (BO-4)."""

    domain = models.CharField(max_length=100, unique=True, help_text="e.g. students.mmu.ac.ke")
    university_name = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.domain

    def save(self, *args, **kwargs):
        self.domain = self.domain.strip().lower()
        super().save(*args, **kwargs)


class StudentVerification(models.Model):
    """A student email address and how long its Student status lasts (SR-F-VER-01 to 07).

    One row per account and student email. A yearly reverification sends a new link
    and updates the same row.
    """

    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="student_verifications")
    student_email = models.EmailField()
    token_hash = models.CharField(max_length=64, unique=True, null=True, blank=True)
    link_expires_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["account", "student_email"], name="studentverif_account_email_unique"),
            # SR-F-VER-03: a verified student email is linked to one account only.
            models.UniqueConstraint(
                fields=["student_email"],
                condition=Q(verified_at__isnull=False),
                name="studentverif_verified_email_unique",
            ),
        ]

    def __str__(self):
        return self.student_email


class Consent(models.Model):
    """A record that a user accepted a legal text (SR-F-PRV-01, BR-NF-05, SR-F-ACC-08d)."""

    class Kind(models.TextChoices):
        TERMS = "terms", "Terms of use"
        PRIVACY = "privacy", "Privacy notice"
        CODE_OF_CONDUCT = "code_of_conduct", "Provider code of conduct"
        LOCATION = "location", "Location access"

    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="consents")
    kind = models.CharField(max_length=20, choices=Kind.choices)
    version = models.CharField(max_length=20)
    accepted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["account", "kind", "version"], name="consent_once_per_version"),
        ]

    def __str__(self):
        return f"{self.account.email} accepted {self.kind} {self.version}"
