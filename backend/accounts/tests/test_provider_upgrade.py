from unittest import mock

from django.core import mail
from django.test import override_settings

from accounts.models import Account, StudentVerification, UniversityDomain
from core.testing import KaziAPITestCase
from listings.models import ServiceCategory


@override_settings(PHONE_VERIFICATION_ENABLED=True)  # covers the SMS payout step; the no-SMS step is in test_registration
@mock.patch("accounts.services.send_sms")
class ProviderUpgradeTests(KaziAPITestCase):
    def setUp(self):
        super().setUp()
        self.account = self.create_account()
        self.tutoring = ServiceCategory.objects.get(slug="tutoring")

    def checklist(self, response):
        return {step["key"]: step["done"] for step in response.data["provider"]["checklist"]}

    def verify_payout_phone(self, send_sms):
        self.client.post("/api/provider/payout-phone/send-code/", {"phone": "0712345678"})
        code = send_sms.call_args.args[1].split("code is ")[1][:6]
        return self.client.post("/api/provider/payout-phone/verify/", {"code": code})

    def test_all_five_steps_activate_the_provider(self, send_sms):
        response = self.client.post("/api/provider/")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["provider"]["status"], "pending")
        self.assertEqual(response.data["provider"]["steps_done"], 0)

        self.client.patch("/api/provider/", {"bio": "Third-year maths student.", "skills": ["Maths"]}, format="json")
        self.verify_payout_phone(send_sms)
        self.client.post("/api/provider/category/", {"category": "general"})
        response = self.client.post("/api/provider/code-of-conduct/")
        self.assertEqual(response.data["provider"]["steps_done"], 4)
        self.assertEqual(response.data["provider"]["status"], "pending")

        listing = {"category": self.tutoring.id, "title": "KCSE Maths revision", "price": 800, "pricing_unit": "per_session"}
        self.assertEqual(self.client.post("/api/provider/listings/", listing, format="json").status_code, 201)

        response = self.client.get("/api/me/")
        self.assertTrue(all(self.checklist(response).values()))
        self.assertEqual(response.data["provider"]["status"], "active")
        self.assertEqual(self.client.post("/api/me/mode/", {"mode": "provider"}).data["active_mode"], "provider")

    def test_pending_provider_cannot_switch_to_working_mode(self, send_sms):
        self.client.post("/api/provider/")
        self.assertEqual(self.client.post("/api/me/mode/", {"mode": "provider"}).status_code, 400)

    def test_pending_account_cannot_start_the_upgrade(self, send_sms):
        self.create_account(email="new@example.com", phone="+254700000001", active=False)
        self.assertEqual(self.client.post("/api/provider/").status_code, 403)

    def test_student_category_needs_a_verified_student_email(self, send_sms):
        self.client.post("/api/provider/")
        response = self.client.post("/api/provider/category/", {"category": "student"})
        self.assertEqual(response.status_code, 400)


class StudentVerificationTests(KaziAPITestCase):
    def setUp(self):
        super().setUp()
        self.account = self.create_account()

    def request_link(self, email="amina.otieno@students.mmu.ac.ke"):
        return self.client.post("/api/me/student-verification/", {"student_email": email})

    def token_from_email(self):
        return mail.outbox[-1].body.split("token=")[1].split()[0]

    def test_link_makes_the_account_student_for_a_year(self):
        self.assertEqual(self.request_link().status_code, 200)
        self.client.credentials()  # the link may be opened while signed out
        response = self.client.post("/api/student-verification/confirm/", {"token": self.token_from_email()})
        self.assertEqual(response.status_code, 200)
        self.account.refresh_from_db()
        self.assertEqual(self.account.category, Account.Category.STUDENT)
        verification = StudentVerification.objects.get()
        self.assertEqual(verification.expires_at.year, verification.verified_at.year + 1)
        self.assertEqual(verification.expires_at.month, verification.verified_at.month)

    def test_link_works_once(self):
        self.request_link()
        token = self.token_from_email()
        self.client.post("/api/student-verification/confirm/", {"token": token})
        response = self.client.post("/api/student-verification/confirm/", {"token": token})
        self.assertEqual(response.data["code"], "link_invalid")

    def test_only_approved_university_domains(self):
        self.assertEqual(self.request_link("amina@gmail.com").data["code"], "domain_not_approved")
        UniversityDomain.objects.create(domain="students.uonbi.ac.ke", university_name="University of Nairobi")
        self.assertEqual(self.request_link("amina@students.uonbi.ac.ke").status_code, 200)

    def test_a_student_email_belongs_to_one_account(self):
        self.request_link()
        self.client.post("/api/student-verification/confirm/", {"token": self.token_from_email()})
        self.create_account(email="other@example.com", phone="+254700000002")
        self.assertEqual(self.request_link().data["code"], "student_email_taken")

    def test_providers_get_the_category_step_done_when_verified(self):
        self.client.post("/api/provider/")
        self.request_link()
        self.client.post("/api/student-verification/confirm/", {"token": self.token_from_email()})
        self.account.provider_profile.refresh_from_db()
        self.assertIsNotNone(self.account.provider_profile.category_confirmed_at)
