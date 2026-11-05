from django.db import models
from django.db.models import Q

from accounts.models import Account, ProviderProfile
from listings.models import Listing, PricingUnit, ServiceCategory


class BookingState(models.TextChoices):
    """Every state in SRS Figure 5. Payment, delivery and disputes use the later ones."""

    REQUESTED = "requested", "Requested"
    DECLINED = "declined", "Declined"
    EXPIRED = "expired", "Expired"
    ACCEPTED = "accepted", "Accepted"
    CANCELLED = "cancelled", "Cancelled"
    PAID = "paid", "Paid"
    IN_PROGRESS = "in_progress", "In progress"
    DELIVERED = "delivered", "Delivered"
    DISPUTED = "disputed", "Disputed"
    RELEASED = "released", "Released"
    REFUNDED = "refunded", "Refunded"
    COMPLETED = "completed", "Completed"


class BookingActor(models.TextChoices):
    CLIENT = "client", "Client"
    PROVIDER = "provider", "Provider"
    SYSTEM = "system", "System"
    ADMIN = "admin", "Admin"


class Booking(models.Model):
    """A client's request for a provider's service, and everything that happens to it (SR-F-BKG)."""

    State = BookingState
    Actor = BookingActor

    reference = models.CharField(max_length=12, unique=True, help_text="Shown to people, e.g. KZ-204317")
    client = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="bookings")
    provider = models.ForeignKey(ProviderProfile, on_delete=models.PROTECT, related_name="bookings")
    # Bookings from accepted job responses arrive with CR-01 phase 2; then exactly one of the two is set.
    listing = models.ForeignKey(Listing, on_delete=models.PROTECT, related_name="bookings", null=True, blank=True)
    category = models.ForeignKey(ServiceCategory, on_delete=models.PROTECT, related_name="bookings")
    scheduled_start = models.DateTimeField()
    quantity = models.PositiveSmallIntegerField(default=1, help_text="Hours or sessions; always 1 for per-job prices")
    is_remote = models.BooleanField(default=False)
    location_text = models.CharField(max_length=200, blank=True, help_text="Shown to the provider only after accepting.")
    notes = models.TextField(blank=True)

    # Copied from the listing when the request is made, so later edits don't change it (DB-8, SR-F-LST-04).
    unit_price_kes = models.PositiveIntegerField()
    pricing_unit = models.CharField(max_length=12, choices=PricingUnit.choices)
    price_kes = models.PositiveIntegerField(help_text="unit price × quantity")
    job_rules_snapshot = models.TextField()
    provider_terms_snapshot = models.TextField(blank=True)
    client_accepted_rules_at = models.DateTimeField()
    provider_accepted_rules_at = models.DateTimeField(null=True, blank=True)

    state = models.CharField(max_length=20, choices=State.choices, default=State.REQUESTED)
    response_due_at = models.DateTimeField()
    payment_due_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.CharField(max_length=10, choices=Actor.choices, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["client", "state"], name="booking_client_state_idx"),
            models.Index(fields=["provider", "state"], name="booking_provider_state_idx"),
            # The sweep only reads rows whose deadline can still pass.
            models.Index(fields=["response_due_at"], condition=Q(state="requested"), name="booking_response_due_idx"),
            models.Index(fields=["payment_due_at"], condition=Q(state="accepted"), name="booking_payment_due_idx"),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(state__in=BookingState.values), name="booking_state_valid"),
            models.CheckConstraint(condition=Q(quantity__gte=1), name="booking_quantity_positive"),
            models.CheckConstraint(condition=Q(unit_price_kes__gte=1), name="booking_price_positive"),
            models.CheckConstraint(condition=Q(is_remote=True) | ~Q(location_text=""), name="booking_location_unless_remote"),
        ]

    def __str__(self):
        return self.reference


class BookingEvent(models.Model):
    """One state change: when, who and why (SR-F-BKG-06). Rows are only ever added."""

    booking = models.ForeignKey(Booking, on_delete=models.PROTECT, related_name="events")
    from_state = models.CharField(max_length=20, blank=True, help_text="Empty for the request itself")
    to_state = models.CharField(max_length=20)
    actor_type = models.CharField(max_length=10, choices=BookingActor.choices)
    actor_account = models.ForeignKey(Account, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"{self.booking}: {self.from_state or 'new'} → {self.to_state}"
