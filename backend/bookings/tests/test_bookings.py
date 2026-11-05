from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.db import transaction
from django.utils import timezone

from accounts.models import ProviderProfile
from bookings import services
from bookings.models import Booking
from core.exceptions import BusinessRuleError
from core.testing import KaziAPITestCase
from listings.models import Listing, ServiceCategory


class BookingTests(KaziAPITestCase):
    def setUp(self):
        super().setUp()
        self.provider_account = self.create_account(email="baraka@example.com", phone="+254711111111", full_name="Baraka Mwangi")
        self.provider = ProviderProfile.objects.create(account=self.provider_account, status=ProviderProfile.Status.ACTIVE)
        self.tutoring = ServiceCategory.objects.get(slug="tutoring")
        self.listing = Listing.objects.create(
            provider=self.provider, category=self.tutoring, title="KCSE Maths revision", price=800,
            pricing_unit="per_session", area_name="Rongai", status=Listing.Status.PUBLISHED,
            provider_terms="Bring past papers.",
        )
        self.client_account = self.create_account(email="amina@example.com", phone="+254722222222")

    def act_as(self, account):
        self.sign_in(sub=account.supabase_user_id, email=account.email)

    def request_data(self, **overrides):
        return {
            "listing": self.listing.id,
            "scheduled_start": (timezone.now() + timedelta(days=2)).isoformat(),
            "quantity": 2,
            "location_text": "Hostel B, room 12",
            "notes": "Focus on calculus.",
            "accept_job_rules": True,
            "accept_provider_terms": True,
            **overrides,
        }

    def request_booking(self, **overrides):
        self.act_as(self.client_account)
        response = self.client.post("/api/bookings/", self.request_data(**overrides), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return Booking.objects.get(pk=response.data["id"])

    def accept(self, booking):
        self.act_as(self.provider_account)
        return self.client.post(f"/api/provider/bookings/{booking.id}/accept/", {"accept_job_rules": True}, format="json")

    # Requesting (SR-F-BKG-01, 02)

    def test_request_copies_the_listing_terms(self):
        booking = self.request_booking()
        self.assertEqual(booking.state, "requested")
        self.assertRegex(booking.reference, r"^KZ-\d{6}$")
        self.assertEqual((booking.unit_price_kes, booking.quantity, booking.price_kes), (800, 2, 1600))
        self.assertEqual(booking.job_rules_snapshot, self.tutoring.job_rules)
        self.assertEqual(booking.provider_terms_snapshot, "Bring past papers.")
        self.assertAlmostEqual(booking.response_due_at, timezone.now() + timedelta(hours=24), delta=timedelta(minutes=1))
        event = booking.events.get()
        self.assertEqual((event.from_state, event.to_state, event.actor_type), ("", "requested", "client"))

    def test_a_later_price_change_does_not_change_the_booking(self):
        booking = self.request_booking()
        self.listing.price = 1000
        self.listing.save()
        booking.refresh_from_db()
        self.assertEqual(booking.price_kes, 1600)

    def test_per_job_prices_always_book_one_unit(self):
        self.listing.pricing_unit = "per_job"
        self.listing.save()
        self.assertEqual(self.request_booking(quantity=5).price_kes, 800)

    def test_rules_and_provider_terms_must_be_accepted(self):
        self.act_as(self.client_account)
        for field, code in [("accept_job_rules", "job_rules_not_accepted"), ("accept_provider_terms", "provider_terms_not_accepted")]:
            response = self.client.post("/api/bookings/", self.request_data(**{field: False}), format="json")
            self.assertEqual((response.status_code, response.data["code"]), (400, code))

    def test_cannot_book_own_listing(self):
        self.act_as(self.provider_account)
        response = self.client.post("/api/bookings/", self.request_data(), format="json")
        self.assertEqual(response.data["code"], "own_listing")

    def test_cannot_book_an_unpublished_listing(self):
        self.listing.status = Listing.Status.PAUSED
        self.listing.save()
        self.act_as(self.client_account)
        response = self.client.post("/api/bookings/", self.request_data(), format="json")
        self.assertEqual(response.data["code"], "listing_unavailable")

    def test_start_must_be_in_the_future(self):
        self.act_as(self.client_account)
        response = self.client.post("/api/bookings/", self.request_data(scheduled_start=timezone.now().isoformat()), format="json")
        self.assertEqual(response.data["code"], "start_in_past")

    def test_location_needed_unless_remote(self):
        self.act_as(self.client_account)
        response = self.client.post("/api/bookings/", self.request_data(location_text=""), format="json")
        self.assertIn("location_text", response.data)
        self.assertEqual(self.request_booking(location_text="", is_remote=True).state, "requested")

    def test_one_waiting_request_per_listing(self):
        self.request_booking()
        response = self.client.post("/api/bookings/", self.request_data(), format="json")
        self.assertEqual(response.data["code"], "duplicate_request")

    def test_other_accounts_cannot_see_a_booking(self):
        booking = self.request_booking()
        self.create_account(email="otieno@example.com", phone="+254733333333")
        self.assertEqual(self.client.get(f"/api/bookings/{booking.id}/").status_code, 404)

    # Answering (SR-F-BKG-03, 04)

    def test_provider_sees_the_exact_location_only_after_accepting(self):
        booking = self.request_booking()
        self.act_as(self.provider_account)
        data = self.client.get(f"/api/provider/bookings/{booking.id}/").data
        self.assertEqual((data["location_text"], data["location_hidden"]), ("", True))
        self.assertEqual(data["actions"], ["accept", "decline"])

        data = self.accept(booking).data
        self.assertEqual((data["location_text"], data["location_hidden"]), ("Hostel B, room 12", False))

    def test_accepting_needs_the_rules_and_starts_the_payment_window(self):
        booking = self.request_booking()
        self.act_as(self.provider_account)
        response = self.client.post(f"/api/provider/bookings/{booking.id}/accept/", {}, format="json")
        self.assertEqual(response.data["code"], "job_rules_not_accepted")

        response = self.accept(booking)
        self.assertEqual(response.data["state"], "accepted")
        booking.refresh_from_db()
        self.assertIsNotNone(booking.provider_accepted_rules_at)
        self.assertAlmostEqual(booking.payment_due_at, timezone.now() + timedelta(hours=2), delta=timedelta(minutes=1))
        self.assertEqual([e.to_state for e in booking.events.all()], ["requested", "accepted"])

    def test_a_declined_request_cannot_then_be_accepted(self):
        booking = self.request_booking()
        self.act_as(self.provider_account)
        response = self.client.post(f"/api/provider/bookings/{booking.id}/decline/", {"reason": "Fully booked"}, format="json")
        self.assertEqual(response.data["state"], "declined")
        self.assertEqual(response.data["events"][-1]["note"], "Fully booked")
        self.assertEqual(self.accept(booking).data["code"], "invalid_state")

    def test_clients_cannot_answer_their_own_requests(self):
        booking = self.request_booking()
        response = self.client.post(f"/api/provider/bookings/{booking.id}/accept/", {"accept_job_rules": True}, format="json")
        self.assertEqual(response.status_code, 403)  # the client has no provider profile

    # Cancelling (SR-F-BKG-07 a)

    def test_either_party_can_cancel_an_accepted_booking(self):
        for actor, url in [(self.client_account, "/api/bookings/{}/cancel/"), (self.provider_account, "/api/provider/bookings/{}/cancel/")]:
            booking = self.request_booking()
            self.accept(booking)
            self.act_as(actor)
            data = self.client.post(url.format(booking.id), {}, format="json").data
            self.assertEqual(data["state"], "cancelled")
            self.assertEqual(data["cancelled_by"], "client" if actor == self.client_account else "provider")

    def test_a_request_cannot_be_cancelled_before_the_provider_answers(self):
        booking = self.request_booking()  # Figure 5 has no Requested -> Cancelled move
        response = self.client.post(f"/api/bookings/{booking.id}/cancel/", {}, format="json")
        self.assertEqual(response.data["code"], "invalid_state")

    # Deadlines

    def test_unanswered_request_expires(self):
        booking = self.request_booking()
        Booking.objects.filter(pk=booking.pk).update(response_due_at=timezone.now() - timedelta(minutes=1))
        self.act_as(self.provider_account)
        response = self.accept(booking)
        self.assertEqual(response.status_code, 400)
        self.assertIn("expired", response.data["detail"])
        booking.refresh_from_db()
        self.assertEqual(booking.state, "expired")  # the expiry is kept even though the accept failed
        self.assertEqual(booking.events.last().actor_type, "system")

    def test_sweep_cancels_unpaid_bookings(self):
        booking = self.request_booking()
        self.accept(booking)
        Booking.objects.filter(pk=booking.pk).update(payment_due_at=timezone.now() - timedelta(minutes=1))
        out = StringIO()
        call_command("run_booking_deadlines", stdout=out)
        self.assertIn("1", out.getvalue())
        booking.refresh_from_db()
        self.assertEqual((booking.state, booking.cancelled_by), ("cancelled", "system"))
        call_command("run_booking_deadlines", stdout=out)  # running again changes nothing
        self.assertEqual(booking.events.count(), 3)

    def test_transitions_outside_figure_5_are_refused(self):
        booking = self.request_booking()
        with transaction.atomic(), self.assertRaises(BusinessRuleError):
            services.transition(booking, Booking.State.RELEASED, Booking.Actor.ADMIN)
