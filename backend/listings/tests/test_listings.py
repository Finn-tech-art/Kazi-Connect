from io import StringIO

from django.core.management import call_command
from django.utils import timezone

from accounts.models import Consent, ProviderProfile
from core.money import commission_for
from core.testing import KaziAPITestCase
from listings.models import Listing, ServiceCategory

DESCRIPTION = "Exam-focused revision for KCSE candidates. Each session covers one topic from past papers, then practice."


class CommissionTests(KaziAPITestCase):
    def test_commission_rounds_down_in_the_providers_favour(self):
        self.assertEqual(commission_for(800, 5), 40)
        self.assertEqual(commission_for(799, 5), 39)  # 39.95 -> 39
        self.assertEqual(commission_for(1, 10), 0)


class ListingTests(KaziAPITestCase):
    def setUp(self):
        super().setUp()
        call_command("seed_demo", stdout=StringIO())
        self.account = self.create_account()
        self.tutoring = ServiceCategory.objects.get(slug="tutoring")

    def make_active_provider(self):
        now = timezone.now()
        profile = ProviderProfile.objects.create(
            account=self.account, bio="Maths tutor", skills=["Maths"], payout_phone="+254712345678",
            payout_phone_verified_at=now, category_confirmed_at=now,
        )
        Consent.objects.create(account=self.account, kind="code_of_conduct", version="draft-2026-11")
        return profile

    def listing_data(self, **overrides):
        return {
            "category": self.tutoring.id, "title": "KCSE Maths revision", "description": DESCRIPTION,
            "price": 800, "pricing_unit": "per_session", "area_name": "MMU Main Campus, Rongai", "radius_km": 8,
            **overrides,
        }

    def test_client_without_provider_profile_cannot_create_listings(self):
        response = self.client.post("/api/provider/listings/", self.listing_data(), format="json")
        self.assertEqual(response.status_code, 403)

    def test_draft_then_publish(self):
        self.make_active_provider()
        response = self.client.post("/api/provider/listings/", self.listing_data(), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "draft")
        self.assertEqual(response.data["commission"], 80)  # General account, demo rate 10%
        self.assertEqual(response.data["net_payout"], 720)

        response = self.client.post(f"/api/provider/listings/{response.data['id']}/publish/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "published")

        self.client.credentials()
        public = self.client.get("/api/listings/?category=tutoring").data["results"]
        self.assertEqual([listing["title"] for listing in public], ["KCSE Maths revision"])
        self.assertNotIn("latitude", public[0])

    def test_price_must_be_inside_category_limits(self):
        self.make_active_provider()
        response = self.client.post("/api/provider/listings/", self.listing_data(price=5000), format="json")
        self.assertEqual(response.data["code"], "price_out_of_range")

    def test_a_live_listing_cannot_be_edited_into_an_invalid_state(self):
        self.make_active_provider()
        listing = self.client.post("/api/provider/listings/", self.listing_data(), format="json").data
        self.client.post(f"/api/provider/listings/{listing['id']}/publish/")
        response = self.client.patch(f"/api/provider/listings/{listing['id']}/", {"description": "Too short"}, format="json")
        self.assertEqual(response.data["code"], "not_ready_to_publish")
        self.assertEqual(Listing.objects.get().description, DESCRIPTION)

    def test_short_description_blocks_publishing(self):
        self.make_active_provider()
        listing = self.client.post("/api/provider/listings/", self.listing_data(description="Too short"), format="json").data
        response = self.client.post(f"/api/provider/listings/{listing['id']}/publish/")
        self.assertEqual(response.data["code"], "not_ready_to_publish")
        self.assertIn("Description", response.data["detail"])

    def test_pending_provider_can_draft_but_not_publish(self):
        ProviderProfile.objects.create(account=self.account)
        listing = self.client.post("/api/provider/listings/", self.listing_data(), format="json").data
        response = self.client.post(f"/api/provider/listings/{listing['id']}/publish/")
        self.assertIn("Provider steps complete", response.data["detail"])

    def test_providers_only_see_and_change_their_own_listings(self):
        self.make_active_provider()
        listing = self.client.post("/api/provider/listings/", self.listing_data(), format="json").data
        other = self.create_account(email="other@example.com", phone="+254700000003")
        ProviderProfile.objects.create(account=other)
        self.assertEqual(self.client.get("/api/provider/listings/").data["count"], 0)
        self.assertEqual(self.client.patch(f"/api/provider/listings/{listing['id']}/", {"price": 900}).status_code, 404)

    def test_removed_listings_are_kept_but_hidden(self):
        self.make_active_provider()
        listing = self.client.post("/api/provider/listings/", self.listing_data(), format="json").data
        self.assertEqual(self.client.delete(f"/api/provider/listings/{listing['id']}/").status_code, 204)
        self.assertEqual(Listing.objects.get().status, Listing.Status.REMOVED)
        self.assertEqual(self.client.get("/api/provider/listings/").data["count"], 0)

    def test_categories_are_public_with_job_rules_and_estimates(self):
        self.client.credentials()
        categories = self.client.get("/api/categories/").data
        self.assertEqual([c["slug"] for c in categories], ["tutoring", "home-cleaning", "photography", "graphic-design"])
        tutoring = categories[0]
        self.assertIn("parent or guardian", tutoring["job_rules"])
        self.assertEqual(tutoring["pricing"][0]["estimates"]["experienced"], {"low": 700, "high": 1000})
