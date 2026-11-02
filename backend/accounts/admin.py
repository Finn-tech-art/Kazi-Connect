from django.contrib import admin, messages

from .models import Account, Consent, PhoneVerification, ProviderProfile, StudentVerification, UniversityDomain


class ProviderProfileInline(admin.StackedInline):
    model = ProviderProfile
    extra = 0
    readonly_fields = ["status", "activated_at", "payout_phone_verified_at", "category_confirmed_at"]


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ["full_name", "email", "phone", "category", "status", "active_mode", "created_at"]
    list_filter = ["status", "category", "active_mode"]
    search_fields = ["full_name", "email", "phone"]
    readonly_fields = ["supabase_user_id", "email", "email_verified_at", "phone_verified_at", "created_at", "updated_at"]
    inlines = [ProviderProfileInline]
    actions = ["suspend", "reinstate"]

    @admin.action(description="Suspend selected accounts")
    def suspend(self, request, queryset):
        count = queryset.filter(status=Account.Status.ACTIVE).update(status=Account.Status.SUSPENDED)
        self.message_user(request, f"Suspended {count} account(s).", messages.SUCCESS)

    @admin.action(description="Reinstate selected suspended accounts")
    def reinstate(self, request, queryset):
        count = queryset.filter(status=Account.Status.SUSPENDED).update(status=Account.Status.ACTIVE)
        self.message_user(request, f"Reinstated {count} account(s).", messages.SUCCESS)


@admin.register(UniversityDomain)
class UniversityDomainAdmin(admin.ModelAdmin):
    list_display = ["domain", "university_name", "is_active"]


@admin.register(StudentVerification)
class StudentVerificationAdmin(admin.ModelAdmin):
    list_display = ["student_email", "account", "verified_at", "expires_at"]
    search_fields = ["student_email", "account__email"]
    exclude = ["token_hash"]
    readonly_fields = ["account", "student_email", "link_expires_at", "verified_at", "expires_at"]


@admin.register(PhoneVerification)
class PhoneVerificationAdmin(admin.ModelAdmin):
    list_display = ["phone", "purpose", "created_at", "attempts", "verified_at"]
    exclude = ["code_hash"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Consent)
class ConsentAdmin(admin.ModelAdmin):
    list_display = ["account", "kind", "version", "accepted_at"]
    list_filter = ["kind", "version"]

    def has_change_permission(self, request, obj=None):
        return False
