from django.contrib import admin

from .models import Booking, BookingEvent


class BookingEventInline(admin.TabularInline):
    model = BookingEvent
    fields = ["created_at", "from_state", "to_state", "actor_type", "actor_account", "note"]
    readonly_fields = fields
    extra = 0
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    """Read-only for now: state changes must go through the booking service so they are recorded."""

    list_display = ["reference", "state", "client", "provider", "category", "scheduled_start", "price_kes", "created_at"]
    list_filter = ["state", "category"]
    search_fields = ["reference", "client__full_name", "client__email", "provider__account__full_name"]
    inlines = [BookingEventInline]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
