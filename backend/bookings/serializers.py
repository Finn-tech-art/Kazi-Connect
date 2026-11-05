from rest_framework import serializers

from listings.models import Listing

from .models import Booking, BookingEvent

State = Booking.State


class BookingRequestSerializer(serializers.Serializer):
    """What a client sends to request a booking (SR-F-BKG-01)."""

    listing = serializers.PrimaryKeyRelatedField(
        queryset=Listing.objects.select_related("category", "provider__account"),
        error_messages={"does_not_exist": "This listing isn't available."},
    )
    scheduled_start = serializers.DateTimeField()
    quantity = serializers.IntegerField(min_value=1, max_value=24, default=1)
    is_remote = serializers.BooleanField(default=False)
    location_text = serializers.CharField(max_length=200, allow_blank=True, default="")
    notes = serializers.CharField(max_length=1000, allow_blank=True, default="")
    accept_job_rules = serializers.BooleanField(default=False)
    accept_provider_terms = serializers.BooleanField(default=False)

    def validate(self, data):
        if not data["is_remote"] and not data["location_text"].strip():
            raise serializers.ValidationError({"location_text": "Say where the job is, or choose remote."})
        return data


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=300, allow_blank=True, default="")


class AcceptSerializer(serializers.Serializer):
    accept_job_rules = serializers.BooleanField(default=False)


class BookingEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingEvent
        fields = ["from_state", "to_state", "actor_type", "note", "created_at"]


class BookingSerializer(serializers.ModelSerializer):
    """A booking as one party sees it. The view puts "client" or "provider" in context["role"]."""

    state_label = serializers.CharField(source="get_state_display", read_only=True)
    listing = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    location_text = serializers.SerializerMethodField()
    location_hidden = serializers.SerializerMethodField()
    client = serializers.SerializerMethodField()
    provider = serializers.SerializerMethodField()
    events = BookingEventSerializer(many=True, read_only=True)
    actions = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id", "reference", "state", "state_label", "listing", "category_name", "scheduled_start",
            "quantity", "pricing_unit", "unit_price_kes", "price_kes", "is_remote", "location_text",
            "location_hidden", "notes", "job_rules_snapshot", "provider_terms_snapshot", "response_due_at",
            "payment_due_at", "accepted_at", "cancelled_at", "cancelled_by", "created_at", "client",
            "provider", "events", "actions",
        ]

    @property
    def role(self):
        return self.context["role"]

    def get_listing(self, booking):
        return booking.listing and {"id": booking.listing.id, "title": booking.listing.title}

    def get_location_hidden(self, booking):
        # The provider learns the exact place only after accepting (SR-F-SRC-07).
        return self.role == "provider" and booking.accepted_at is None and not booking.is_remote

    def get_location_text(self, booking):
        return "" if self.get_location_hidden(booking) else booking.location_text

    def get_client(self, booking):
        return {
            "first_name": booking.client.full_name.split()[0],
            "account_category": booking.client.category,
            "member_since": booking.client.created_at,
        }

    def get_provider(self, booking):
        account = booking.provider.account
        return {"name": account.full_name, "account_category": account.category, "experience_level": booking.provider.experience_level}

    def get_actions(self, booking):
        """What the viewer can do now, so the page shows only buttons that will work."""
        if booking.state == State.ACCEPTED:
            return ["cancel"]
        if booking.state == State.REQUESTED and self.role == "provider":
            return ["accept", "decline"]
        return []
