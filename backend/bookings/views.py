from django.db.models import Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsActiveAccount, IsActiveProvider

from . import services
from .models import Booking
from .serializers import AcceptSerializer, BookingRequestSerializer, BookingSerializer, ReasonSerializer


class BookingViewSetBase(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    role = None  # "client" or "provider": whose side of the booking the viewer is on

    def scope(self):
        raise NotImplementedError

    def get_queryset(self):
        services.apply_due_deadlines(self.scope())
        bookings = (
            Booking.objects.filter(self.scope())
            .select_related("listing", "category", "client", "provider__account")
            .prefetch_related("events")
            .order_by("-created_at")
        )
        state = self.request.query_params.get("state")
        return bookings.filter(state=state) if state else bookings

    def get_serializer_class(self):
        return BookingSerializer

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "role": self.role}

    def respond(self, booking, code=status.HTTP_200_OK):
        """The booking as the viewer sees it, with its events, after an action."""
        return Response(self.get_serializer(self.get_queryset().get(pk=booking.pk)).data, status=code)

    def input(self, serializer_class):
        serializer = serializer_class(data=self.request.data)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data


class ClientBookingViewSet(mixins.CreateModelMixin, BookingViewSetBase):
    """Bookings the signed-in account requested (Hiring mode)."""

    permission_classes = [IsActiveAccount]
    role = "client"

    def scope(self):
        return Q(client=self.request.user.account)

    def create(self, request, *args, **kwargs):
        booking = services.request_booking(request.user.account, **self.input(BookingRequestSerializer))
        return self.respond(booking, status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        reason = self.input(ReasonSerializer)["reason"]
        return self.respond(services.cancel_booking(self.get_object(), request.user.account, Booking.Actor.CLIENT, reason))


class ProviderBookingViewSet(BookingViewSetBase):
    """Booking requests for the signed-in provider (Working mode)."""

    permission_classes = [IsActiveProvider]
    role = "provider"

    def scope(self):
        return Q(provider__account=self.request.user.account)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        data = self.input(AcceptSerializer)
        return self.respond(services.accept_booking(self.get_object(), request.user.account, data["accept_job_rules"]))

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        reason = self.input(ReasonSerializer)["reason"]
        return self.respond(services.decline_booking(self.get_object(), request.user.account, reason))

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        reason = self.input(ReasonSerializer)["reason"]
        return self.respond(services.cancel_booking(self.get_object(), request.user.account, Booking.Actor.PROVIDER, reason))
