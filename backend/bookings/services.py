"""Booking rules: the SRS Figure 5 state machine and the request, answer and cancel steps (SR-F-BKG)."""

import secrets
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from core.exceptions import BusinessRuleError
from core.models import PlatformSettings
from listings.models import PricingUnit
from listings.services import is_bookable

from .models import Booking, BookingEvent

State = Booking.State
Actor = Booking.Actor

# SRS Figure 5. Any move not listed here is refused (SR-F-BKG-06).
ALLOWED_TRANSITIONS = {
    State.REQUESTED: {State.ACCEPTED, State.DECLINED, State.EXPIRED},
    State.ACCEPTED: {State.PAID, State.CANCELLED},
    State.PAID: {State.IN_PROGRESS, State.CANCELLED, State.DISPUTED},
    State.IN_PROGRESS: {State.DELIVERED, State.DISPUTED},
    State.DELIVERED: {State.RELEASED, State.DISPUTED},
    State.DISPUTED: {State.RELEASED, State.REFUNDED},
    State.RELEASED: {State.COMPLETED},
}


def transition(booking, to_state, actor_type, actor_account=None, note="", **fields):
    """Move a locked booking to a new state and record who did it and when.

    Call inside a transaction, on a row read with select_for_update().
    """
    if to_state not in ALLOWED_TRANSITIONS.get(booking.state, set()):
        raise BusinessRuleError(
            f"A {booking.get_state_display().lower()} booking can't become {State(to_state).label.lower()}.",
            "invalid_transition",
        )
    from_state = booking.state
    booking.state = to_state
    for field, value in fields.items():
        setattr(booking, field, value)
    booking.save()
    BookingEvent.objects.create(
        booking=booking, from_state=from_state, to_state=to_state,
        actor_type=actor_type, actor_account=actor_account, note=note,
    )
    return booking


def _new_reference():
    return f"KZ-{secrets.randbelow(900_000) + 100_000}"


def _insert_with_reference(booking):
    """Give the booking a random unique reference, trying again on the rare clash."""
    for attempt in range(5):
        booking.reference = _new_reference()
        try:
            with transaction.atomic():
                booking.save()
            return booking
        except IntegrityError:
            if attempt == 4 or not Booking.objects.filter(reference=booking.reference).exists():
                raise


def request_booking(client, listing, scheduled_start, accept_job_rules, accept_provider_terms=False,
                    quantity=1, is_remote=False, location_text="", notes=""):
    """SR-F-BKG-01, 02: a client asks for a listing on a date, after accepting the rules."""
    provider = listing.provider
    if provider.account_id == client.id:
        raise BusinessRuleError("You can't book your own listing.", "own_listing")
    if not is_bookable(listing):
        raise BusinessRuleError("This listing isn't taking bookings right now.", "listing_unavailable")
    if not accept_job_rules:
        raise BusinessRuleError(f"Accept the {listing.category.name} job rules to send this request.", "job_rules_not_accepted")
    if listing.provider_terms.strip() and not accept_provider_terms:
        raise BusinessRuleError("Accept the provider's terms to send this request.", "provider_terms_not_accepted")
    now = timezone.now()
    if scheduled_start <= now:
        raise BusinessRuleError("Choose a start time in the future.", "start_in_past")
    if Booking.objects.filter(client=client, listing=listing, state=State.REQUESTED).exists():
        raise BusinessRuleError("You already have a request waiting for this provider's answer.", "duplicate_request")

    if listing.pricing_unit == PricingUnit.PER_JOB:
        quantity = 1
    settings = PlatformSettings.load()
    with transaction.atomic():
        booking = _insert_with_reference(Booking(
            client=client,
            provider=provider,
            listing=listing,
            category=listing.category,
            scheduled_start=scheduled_start,
            quantity=quantity,
            is_remote=is_remote,
            location_text="" if is_remote else location_text.strip(),
            notes=notes.strip(),
            unit_price_kes=listing.price,
            pricing_unit=listing.pricing_unit,
            price_kes=listing.price * quantity,
            job_rules_snapshot=listing.category.job_rules,
            provider_terms_snapshot=listing.provider_terms,
            client_accepted_rules_at=now,
            response_due_at=now + timedelta(hours=settings.booking_response_hours),
        ))
        BookingEvent.objects.create(booking=booking, to_state=State.REQUESTED, actor_type=Actor.CLIENT, actor_account=client)
    return booking


def _apply_deadline(pk, now):
    """Expire or cancel one booking if its deadline has passed. Returns the booking as it now stands."""
    with transaction.atomic():
        booking = Booking.objects.select_for_update().get(pk=pk)
        if booking.state == State.REQUESTED and booking.response_due_at <= now:
            transition(booking, State.EXPIRED, Actor.SYSTEM, note="The provider didn't answer in time.")
        elif booking.state == State.ACCEPTED and booking.payment_due_at and booking.payment_due_at <= now:
            transition(
                booking, State.CANCELLED, Actor.SYSTEM, note="Not paid in time.",
                cancelled_at=now, cancelled_by=Actor.SYSTEM,
            )
        return booking


def apply_due_deadlines(scope=Q()):
    """SR-F-BKG-03, 04: expire unanswered requests and cancel unpaid bookings whose time is up.

    Safe to run any number of times. The scheduler runs it for everyone; the API also runs it
    for the signed-in user's bookings so they never see an out-of-date state.
    """
    now = timezone.now()
    due = Booking.objects.filter(scope).filter(
        Q(state=State.REQUESTED, response_due_at__lte=now) | Q(state=State.ACCEPTED, payment_due_at__lte=now)
    )
    pks = list(due.values_list("pk", flat=True))
    for pk in pks:
        _apply_deadline(pk, now)
    return len(pks)


def _locked_in_state(booking, state, action):
    """Re-read the booking with a row lock and check it can still take this action."""
    booking = Booking.objects.select_for_update().get(pk=booking.pk)
    if booking.state == state:
        return booking
    if booking.state == State.EXPIRED:
        raise BusinessRuleError("This request expired: the provider didn't answer in time.", "invalid_state")
    if booking.state == State.CANCELLED and booking.cancelled_by == Actor.SYSTEM:
        raise BusinessRuleError("This booking was cancelled because it wasn't paid in time.", "invalid_state")
    raise BusinessRuleError(f"You can't {action} this booking: it's {booking.get_state_display().lower()}.", "invalid_state")


def accept_booking(booking, provider_account, accept_job_rules):
    """SR-F-BKG-03, 04: the provider accepts the same job rules, and the client's payment window starts."""
    if not accept_job_rules:
        raise BusinessRuleError(f"Accept the {booking.category.name} job rules to take this booking.", "job_rules_not_accepted")
    now = timezone.now()
    _apply_deadline(booking.pk, now)  # committed on its own, so an expiry isn't rolled back by the error below
    with transaction.atomic():
        booking = _locked_in_state(booking, State.REQUESTED, "accept")
        return transition(
            booking, State.ACCEPTED, Actor.PROVIDER, provider_account,
            accepted_at=now,
            provider_accepted_rules_at=now,
            payment_due_at=now + timedelta(hours=PlatformSettings.load().payment_window_hours),
        )


def decline_booking(booking, provider_account, reason=""):
    _apply_deadline(booking.pk, timezone.now())
    with transaction.atomic():
        booking = _locked_in_state(booking, State.REQUESTED, "decline")
        return transition(booking, State.DECLINED, Actor.PROVIDER, provider_account, note=reason.strip())


def cancel_booking(booking, account, actor_type, reason=""):
    """SR-F-BKG-07 (a): either party may cancel before payment at no cost.

    Cancelling a paid booking needs refunds, so it arrives with payments.
    """
    now = timezone.now()
    _apply_deadline(booking.pk, now)
    with transaction.atomic():
        booking = _locked_in_state(booking, State.ACCEPTED, "cancel")
        return transition(
            booking, State.CANCELLED, actor_type, account, note=reason.strip(),
            cancelled_at=now, cancelled_by=actor_type,
        )
