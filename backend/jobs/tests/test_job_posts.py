from datetime import timedelta

from django.utils import timezone

from accounts.models import ProviderProfile
from core.testing import KaziAPITestCase
from jobs.models import JobPost
from listings.models import ServiceCategory


class JobPostTests(KaziAPITestCase):
    def setUp(self):
        super().setUp()
        self.cleaning = ServiceCategory.objects.get(slug="home-cleaning")
        self.client_account = self.create_account(email="client@example.com", phone="+254711111111")

    def job_data(self, **overrides):
        return {
            "category": self.cleaning.id,
            "title": "Clean a 2-bedroom flat",
            "description": "Two bedrooms, kitchen and bathroom. I'll be home all morning.",
            "budget_min": 1000,
            "budget_max": 1500,
            "area_name": "Rongai, near MMU gate",
            "accept_job_rules": True,
            **overrides,
        }

    def sign_in_as_active_provider(self):
        provider = self.create_account(email="provider@example.com", phone="+254722222222")
        ProviderProfile.objects.create(account=provider, status=ProviderProfile.Status.ACTIVE)
        return provider

    def test_active_client_posts_a_job(self):
        response = self.client.post("/api/job-posts/mine/", self.job_data(), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "open")
        self.assertEqual(response.data["category_name"], "Home cleaning")
        post = JobPost.objects.get()
        self.assertEqual(post.client, self.client_account)
        self.assertIsNotNone(post.job_rules_accepted_at)
        self.assertEqual(post.expires_at - post.job_rules_accepted_at, timedelta(days=30))

    def test_job_rules_must_be_accepted(self):
        response = self.client.post("/api/job-posts/mine/", self.job_data(accept_job_rules=False), format="json")
        self.assertEqual(response.data["code"], "job_rules_not_accepted")

    def test_budget_and_location_are_validated(self):
        response = self.client.post("/api/job-posts/mine/", self.job_data(budget_min=2000), format="json")
        self.assertIn("budget_max", response.data)
        response = self.client.post("/api/job-posts/mine/", self.job_data(area_name=""), format="json")
        self.assertIn("area_name", response.data)
        response = self.client.post("/api/job-posts/mine/", self.job_data(area_name="", is_remote=True), format="json")
        self.assertEqual(response.status_code, 201)

    def test_preferred_date_cannot_be_in_the_past(self):
        yesterday = (timezone.now() - timedelta(days=2)).date().isoformat()
        response = self.client.post("/api/job-posts/mine/", self.job_data(preferred_date=yesterday), format="json")
        self.assertIn("preferred_date", response.data)

    def test_client_closes_their_post(self):
        post = self.client.post("/api/job-posts/mine/", self.job_data(), format="json").data
        response = self.client.post(f"/api/job-posts/mine/{post['id']}/close/")
        self.assertEqual(response.data["status"], "closed")
        self.assertEqual(self.client.patch(f"/api/job-posts/mine/{post['id']}/", {"title": "New title"}).status_code, 400)

    def test_active_providers_browse_open_posts_without_client_contact_details(self):
        self.client.post("/api/job-posts/mine/", self.job_data(), format="json")
        self.sign_in_as_active_provider()
        results = self.client.get("/api/job-posts/").data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["client"]["first_name"], "Amina")
        self.assertNotIn("email", results[0]["client"])
        self.assertNotIn("phone", results[0]["client"])

    def test_closed_and_expired_posts_are_hidden_from_providers(self):
        closed = self.client.post("/api/job-posts/mine/", self.job_data(), format="json").data
        self.client.post(f"/api/job-posts/mine/{closed['id']}/close/")
        expired = self.client.post("/api/job-posts/mine/", self.job_data(), format="json").data
        JobPost.objects.filter(pk=expired["id"]).update(expires_at=timezone.now() - timedelta(minutes=1))
        self.sign_in_as_active_provider()
        self.assertEqual(self.client.get("/api/job-posts/").data["count"], 0)

    def test_clients_who_are_not_providers_cannot_browse(self):
        self.assertEqual(self.client.get("/api/job-posts/").status_code, 403)

    def test_clients_only_see_their_own_posts(self):
        self.client.post("/api/job-posts/mine/", self.job_data(), format="json")
        self.create_account(email="someone@example.com", phone="+254733333333")
        self.assertEqual(self.client.get("/api/job-posts/mine/").data["count"], 0)
