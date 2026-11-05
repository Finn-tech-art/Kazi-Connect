"""Business rules for accounts, verification and the provider upgrade.

Views call these functions; they raise BusinessRuleError when a rule is broken.
"""

import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac

from core.exceptions import BusinessRuleError

from .models import Account, Consent, PhoneVerification, ProviderProfile, StudentVerification, UniversityDomain
from .sms import send_sms

OTP_LIFETIME = timedelta(minutes=5)  # SR-F-ACC-03
OTP_MAX_ATTEMPTS = 3
OTP_MAX_PER_PHONE_PER_HOUR = 5
STUDENT_LINK_LIFETIME = timedelta(hours=24)  # SR-F-VER-02


# --- Registration -----------------------------------------------------------


def phone_verification_enabled():
    return settings.PHONE_VERIFICATION_ENABLED


@transaction.atomic
def create_account(identity, full_name, phone):
    """Create the Kazi Connect account for a Supabase user who just signed up (SR-F-ACC-01).

    Supabase only gives a session to users who confirmed their email, so the email
    is verified by the time we get here (requires "Confirm email" to stay on in Supabase).
    With phone verification switched off, that is enough to activate the account.
    """
    if Account.objects.filter(email=identity.email).exists():
        raise BusinessRuleError("An account with this email already exists.", "email_taken")
    _ensure_phone_is_free(phone)

    account = Account.objects.create(
        supabase_user_id=identity.id,
        email=identity.email,
        email_verified_at=timezone.now(),
        full_name=full_name.strip(),
        phone=phone,
        status=Account.Status.PENDING_VERIFICATION if phone_verification_enabled() else Account.Status.ACTIVE,
    )
    for kind in (Consent.Kind.TERMS, Consent.Kind.PRIVACY):
        Consent.objects.create(account=account, kind=kind, version=settings.LEGAL_DOCUMENT_VERSIONS[kind])
    return account


def update_account(account, full_name=None, phone=None):
    if full_name is not None:
        account.full_name = full_name.strip()
    if phone is not None and phone != account.phone:
        if account.phone_verified_at:
            raise BusinessRuleError("Your phone number is verified and can't be changed here. Contact support.")
        _ensure_phone_is_free(phone)
        account.phone = phone
    account.save()
    return account


def activate_without_phone_check(account):
    """Activate an account left waiting for a phone code from before verification was switched off."""
    if not phone_verification_enabled() and account.status == Account.Status.PENDING_VERIFICATION and account.email_verified_at:
        account.status = Account.Status.ACTIVE
        account.save(update_fields=["status", "updated_at"])
    return account


def _ensure_phone_is_free(phone, exclude_account=None):
    """SR-F-ACC-04: one account per number.

    With verification on, only proven numbers count, so nobody can block a number by typing it.
    With it off, nothing is proven, so the first account to enter a number keeps it.
    """
    taken = Account.objects.filter(phone=phone)
    if phone_verification_enabled():
        taken = taken.filter(phone_verified_at__isnull=False)
    if exclude_account:
        taken = taken.exclude(pk=exclude_account.pk)
    if taken.exists():
        raise BusinessRuleError("This phone number is already used by another account.", "phone_taken")


# --- Phone codes (OTP) ------------------------------------------------------


def _hash_code(phone, code):
    return salted_hmac("kazi.phone-code", f"{phone}:{code}").hexdigest()


def _require_phone_verification():
    if not phone_verification_enabled():
        raise BusinessRuleError("Phone verification by SMS is switched off for now.", "phone_verification_off")


def _send_code(account, phone, purpose):
    _require_phone_verification()
    an_hour_ago = timezone.now() - timedelta(hours=1)
    if PhoneVerification.objects.filter(phone=phone, created_at__gte=an_hour_ago).count() >= OTP_MAX_PER_PHONE_PER_HOUR:
        raise BusinessRuleError("Too many codes were sent to this number. Try again in an hour.", "otp_rate_limited")

    code = f"{secrets.randbelow(1_000_000):06d}"
    PhoneVerification.objects.create(
        account=account,
        purpose=purpose,
        phone=phone,
        code_hash=_hash_code(phone, code),
        expires_at=timezone.now() + OTP_LIFETIME,
    )
    send_sms(phone, f"Your Kazi Connect code is {code}. It expires in 5 minutes. Never share it.")


def _check_code(account, phone, purpose, code):
    """Consume the latest code for this phone. Raises BusinessRuleError if it is wrong or used up.

    The error is raised after the transaction commits. Raising inside it would roll back
    the attempt counter and allow unlimited guesses.
    """
    _require_phone_verification()
    error = None
    with transaction.atomic():
        verification = (
            PhoneVerification.objects.select_for_update()
            .filter(account=account, purpose=purpose, phone=phone, verified_at__isnull=True)
            .order_by("-created_at")
            .first()
        )
        if verification is None or verification.expires_at <= timezone.now():
            error = BusinessRuleError("This code has expired. Request a new one.", "otp_expired")
        elif verification.attempts >= OTP_MAX_ATTEMPTS:
            error = BusinessRuleError("Too many wrong attempts. Request a new code.", "otp_locked")
        else:
            verification.attempts += 1
            if constant_time_compare(_hash_code(phone, code), verification.code_hash):
                verification.verified_at = timezone.now()
            else:
                left = OTP_MAX_ATTEMPTS - verification.attempts
                message = f"That code is wrong. {left} attempt(s) left." if left else "That code is wrong. Request a new code."
                error = BusinessRuleError(message, "otp_wrong")
            verification.save(update_fields=["attempts", "verified_at"])
    if error:
        raise error


def send_account_phone_code(account):
    if account.phone_verified_at:
        raise BusinessRuleError("Your phone number is already verified.")
    _send_code(account, account.phone, PhoneVerification.Purpose.ACCOUNT_PHONE)


def verify_account_phone(account, code):
    """Confirm the account phone. With the email already verified, this activates the account (US-01)."""
    _ensure_phone_is_free(account.phone, exclude_account=account)
    _check_code(account, account.phone, PhoneVerification.Purpose.ACCOUNT_PHONE, code)
    account.phone_verified_at = timezone.now()
    if account.status == Account.Status.PENDING_VERIFICATION:
        account.status = Account.Status.ACTIVE
    account.save()
    return account


# --- Mode switch ------------------------------------------------------------


def switch_mode(account, mode):
    """Switch between Hiring (client) and Working (provider) mode (SR-F-ACC-10).

    Mode only changes what the app shows. Permissions always come from the provider status.
    """
    if mode == Account.Mode.PROVIDER and not account.is_active_provider:
        raise BusinessRuleError("Finish the provider upgrade before switching to Working mode.")
    account.active_mode = mode
    account.save(update_fields=["active_mode", "updated_at"])
    return account


# --- Student verification ---------------------------------------------------


def _hash_token(token):
    return hashlib.sha256(token.encode()).hexdigest()


def one_year_after(moment):
    try:
        return moment.replace(year=moment.year + 1)
    except ValueError:  # 29 February
        return moment.replace(year=moment.year + 1, day=28)


def request_student_verification(account, student_email):
    """Email a single-use link to a student address on an approved domain (SR-F-VER-01, 02)."""
    student_email = student_email.strip().lower()
    domain = student_email.rsplit("@", 1)[-1]
    if not UniversityDomain.objects.filter(domain=domain, is_active=True).exists():
        raise BusinessRuleError("Use your university student email, for example name@students.mmu.ac.ke.", "domain_not_approved")
    if StudentVerification.objects.filter(student_email=student_email, verified_at__isnull=False).exclude(account=account).exists():
        raise BusinessRuleError("This student email is already linked to another account.", "student_email_taken")

    token = secrets.token_urlsafe(32)
    verification, _ = StudentVerification.objects.get_or_create(account=account, student_email=student_email)
    verification.token_hash = _hash_token(token)
    verification.link_expires_at = timezone.now() + STUDENT_LINK_LIFETIME
    verification.save()

    link = f"{settings.FRONTEND_URL}/verify-student?token={token}"
    send_mail(
        subject="Confirm your student email for Kazi Connect",
        message=(
            f"Hi {account.full_name},\n\nConfirm {student_email} to get the Student category on Kazi Connect:\n{link}\n\n"
            "The link works once and expires in 24 hours. If you didn't ask for this, ignore this email."
        ),
        from_email=None,
        recipient_list=[student_email],
    )
    return verification


@transaction.atomic
def confirm_student_verification(token):
    """Open the emailed link: the account becomes Student for 12 months (SR-F-VER-04, 07)."""
    verification = (
        StudentVerification.objects.select_for_update()
        .select_related("account")
        .filter(token_hash=_hash_token(token))
        .first()
    )
    if verification is None or verification.link_expires_at <= timezone.now():
        raise BusinessRuleError("This link is invalid or has expired. Request a new one from your account page.", "link_invalid")
    if StudentVerification.objects.filter(student_email=verification.student_email, verified_at__isnull=False).exclude(account=verification.account).exists():
        raise BusinessRuleError("This student email is already linked to another account.", "student_email_taken")

    now = timezone.now()
    verification.verified_at = now
    verification.expires_at = one_year_after(now)
    verification.token_hash = None  # single use
    verification.save()

    account = verification.account
    account.category = Account.Category.STUDENT
    account.save(update_fields=["category", "updated_at"])

    profile = account.provider_profile_or_none
    if profile and profile.category_confirmed_at is None:
        profile.category_confirmed_at = now
        profile.save(update_fields=["category_confirmed_at", "updated_at"])
        refresh_provider_status(profile)
    return verification


def current_student_verification(account):
    return account.student_verifications.order_by("-verified_at", "-updated_at").first()


def expire_student_statuses(now=None):
    """Move accounts whose student verification lapsed back to General (SR-F-VER-06).

    Meant to run from the scheduler (SDD D-04). Emails are added with notifications.
    """
    now = now or timezone.now()
    still_valid = StudentVerification.objects.filter(verified_at__isnull=False, expires_at__gt=now).values("account_id")
    return Account.objects.filter(category=Account.Category.STUDENT).exclude(pk__in=still_valid).update(
        category=Account.Category.GENERAL, updated_at=now
    )


# --- Provider upgrade -------------------------------------------------------

CHECKLIST_LABELS = {
    "profile": "Bio and skills",
    "payout_phone": "Add your M-Pesa payout number",
    "category": "Choose your account category",
    "code_of_conduct": "Accept the provider code of conduct",
    "listing": "Create your first listing",
}


def start_provider_upgrade(account):
    """Begin the upgrade from client to provider (BRU-02). The client account is unchanged."""
    profile, _ = ProviderProfile.objects.get_or_create(account=account)
    return profile


def provider_checklist(profile):
    """The SR-F-ACC-08 steps and whether each is done.

    Step (a) also needs a profile photo; that waits for the file storage decision (SDD D-02).
    """
    from listings.models import Listing  # avoids a circular import: listings depends on accounts

    conduct_version = settings.LEGAL_DOCUMENT_VERSIONS["code_of_conduct"]
    done = {
        "profile": bool(profile.bio.strip()) and len(profile.skills) > 0,
        "payout_phone": profile.payout_phone_verified_at is not None if phone_verification_enabled() else bool(profile.payout_phone),
        "category": profile.category_confirmed_at is not None,
        "code_of_conduct": profile.account.consents.filter(kind=Consent.Kind.CODE_OF_CONDUCT, version=conduct_version).exists(),
        "listing": profile.listings.exclude(status=Listing.Status.REMOVED).exists(),
    }
    return [{"key": key, "label": label, "done": done[key]} for key, label in CHECKLIST_LABELS.items()]


def refresh_provider_status(profile):
    """Activate the provider once every step is done (SR-F-ACC-09). An active provider stays active."""
    if profile.status == ProviderProfile.Status.PENDING and all(step["done"] for step in provider_checklist(profile)):
        profile.status = ProviderProfile.Status.ACTIVE
        profile.activated_at = timezone.now()
        profile.save(update_fields=["status", "activated_at", "updated_at"])
    return profile


def update_provider_profile(profile, bio=None, skills=None):
    if bio is not None:
        profile.bio = bio.strip()
    if skills is not None:
        profile.skills = skills
    profile.save()
    return refresh_provider_status(profile)


def send_payout_phone_code(profile, phone):
    _send_code(profile.account, phone, PhoneVerification.Purpose.PAYOUT_PHONE)
    profile.payout_phone = phone
    profile.payout_phone_verified_at = None
    profile.save(update_fields=["payout_phone", "payout_phone_verified_at", "updated_at"])


def set_payout_phone(profile, phone):
    """Step (b) while SMS verification is off: the number is saved without a code."""
    if phone_verification_enabled():
        raise BusinessRuleError("Verify this number with the code we text to it.", "phone_verification_on")
    profile.payout_phone = phone
    profile.payout_phone_verified_at = None
    profile.save(update_fields=["payout_phone", "payout_phone_verified_at", "updated_at"])
    return refresh_provider_status(profile)


def verify_payout_phone(profile, code):
    if not profile.payout_phone:
        raise BusinessRuleError("Enter your M-Pesa number first.")
    _check_code(profile.account, profile.payout_phone, PhoneVerification.Purpose.PAYOUT_PHONE, code)
    profile.payout_phone_verified_at = timezone.now()
    profile.save(update_fields=["payout_phone_verified_at", "updated_at"])
    return refresh_provider_status(profile)


def confirm_provider_category(profile, category):
    """Step (c): General is chosen directly; Student needs a current student verification."""
    account = profile.account
    if category == Account.Category.STUDENT and account.category != Account.Category.STUDENT:
        raise BusinessRuleError("Verify your student email first. We'll set the Student category when you open the link.")
    if category == Account.Category.GENERAL and account.category == Account.Category.STUDENT:
        raise BusinessRuleError("Your account is already in the Student category.")
    profile.category_confirmed_at = timezone.now()
    profile.save(update_fields=["category_confirmed_at", "updated_at"])
    return refresh_provider_status(profile)


def accept_code_of_conduct(profile):
    Consent.objects.get_or_create(
        account=profile.account,
        kind=Consent.Kind.CODE_OF_CONDUCT,
        version=settings.LEGAL_DOCUMENT_VERSIONS["code_of_conduct"],
    )
    return refresh_provider_status(profile)
