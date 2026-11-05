from unittest import mock

from django.test import override_settings

from accounts import services
from accounts.models import Account, Consent, PhoneVerification
from accounts.phone import normalize_kenyan_mobile
from core.testing import KaziAPITestCase


class PhoneNumberTests(KaziAPITestCase):
    def test_kenyan_formats_are_normalised(self):
        for raw in ["0712345678", "0712 345 678", "254712345678", "+254712345678"]:
            self.assertEqual(normalize_kenyan_mobile(raw), "+254712345678")
        self.assertEqual(normalize_kenyan_mobile("0112345678"), "+254112345678")

    def test_non_kenyan_mobile_numbers_are_refused(self):
        for raw in ["0212345678", "+255712345678", "071234567", "hello"]:
            self.assertIsNone(normalize_kenyan_mobile(raw))


@override_settings(PHONE_VERIFICATION_ENABLED=True)  # the SMS flow, kept for when an SMS provider is chosen
@mock.patch("accounts.services.send_sms")
class RegistrationTests(KaziAPITestCase):
    def register(self, **overrides):
        data = {"full_name": "Amina Otieno", "phone": "0712 345 678", "accept_terms": True, "accept_privacy": True}
        return self.client.post("/api/me/", {**data, **overrides}, format="json")

    def sent_code(self, send_sms):
        return send_sms.call_args.args[1].split("code is ")[1][:6]

    def test_new_user_registers_as_pending_client_with_consents(self, send_sms):
        self.sign_in(email="Amina@Example.com")
        response = self.register()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "pending_verification")
        self.assertEqual(response.data["active_mode"], "client")
        self.assertEqual(response.data["category"], "general")
        self.assertEqual(response.data["email"], "amina@example.com")
        self.assertEqual(response.data["phone"], "+254712345678")
        account = Account.objects.get()
        self.assertEqual(set(account.consents.values_list("kind", flat=True)), {Consent.Kind.TERMS, Consent.Kind.PRIVACY})

    def test_terms_must_be_accepted(self, send_sms):
        self.sign_in()
        response = self.register(accept_terms=False)
        self.assertEqual(response.status_code, 400)
        self.assertIn("accept_terms", response.data)

    def test_registering_twice_conflicts(self, send_sms):
        self.sign_in()
        self.register()
        self.assertEqual(self.register().status_code, 409)

    def test_phone_verification_activates_the_account(self, send_sms):
        self.sign_in()
        self.register()
        self.assertEqual(self.client.post("/api/me/phone/send-code/").status_code, 200)
        response = self.client.post("/api/me/phone/verify/", {"code": self.sent_code(send_sms)})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "active")
        self.assertTrue(response.data["phone_verified"])

    def test_wrong_codes_are_counted_and_lock_after_three(self, send_sms):
        self.sign_in()
        self.register()
        self.client.post("/api/me/phone/send-code/")
        right = self.sent_code(send_sms)
        wrong = "000000" if right != "000000" else "111111"
        for _ in range(3):
            self.assertEqual(self.client.post("/api/me/phone/verify/", {"code": wrong}).status_code, 400)
        self.assertEqual(PhoneVerification.objects.get().attempts, 3)
        response = self.client.post("/api/me/phone/verify/", {"code": right})
        self.assertEqual(response.data["code"], "otp_locked")

    def test_at_most_five_codes_per_number_per_hour(self, send_sms):
        account = self.create_account(active=False)
        for _ in range(services.OTP_MAX_PER_PHONE_PER_HOUR):
            services.send_account_phone_code(account)
        response = self.client.post("/api/me/phone/send-code/")
        self.assertEqual(response.data["code"], "otp_rate_limited")

    def test_a_verified_phone_cannot_be_registered_again(self, send_sms):
        self.create_account(email="first@example.com", phone="+254712345678")
        self.sign_in(email="second@example.com")
        response = self.register(phone="+254712345678")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "phone_taken")

    def test_pending_account_cannot_post_jobs(self, send_sms):
        self.create_account(active=False)
        response = self.client.get("/api/job-posts/mine/")
        self.assertEqual(response.status_code, 403)
        self.assertIn("Verify your phone", response.data["detail"])


@override_settings(PHONE_VERIFICATION_ENABLED=False)
@mock.patch("accounts.services.send_sms")
class PhoneVerificationOffTests(KaziAPITestCase):
    """System evolution E-02: no SMS provider yet, so the confirmed email is enough to activate."""

    def register(self, phone="0712 345 678"):
        data = {"full_name": "Amina Otieno", "phone": phone, "accept_terms": True, "accept_privacy": True}
        return self.client.post("/api/me/", data, format="json")

    def test_account_is_active_straight_after_registering(self, send_sms):
        self.sign_in()
        response = self.register()
        self.assertEqual(response.data["status"], "active")
        self.assertFalse(response.data["phone_verified"])
        self.assertFalse(response.data["phone_verification_enabled"])
        send_sms.assert_not_called()

    def test_sms_endpoints_are_refused(self, send_sms):
        self.create_account(active=False)
        response = self.client.post("/api/me/phone/send-code/")
        self.assertEqual(response.data["code"], "phone_verification_off")
        send_sms.assert_not_called()

    def test_accounts_left_waiting_for_a_code_are_activated(self, send_sms):
        account = self.create_account(active=False)
        self.assertEqual(self.client.get("/api/me/").data["status"], "active")
        account.refresh_from_db()
        self.assertEqual(account.status, Account.Status.ACTIVE)

    def test_a_number_already_entered_by_another_account_is_refused(self, send_sms):
        self.create_account(email="baraka@example.com", phone="+254712345678", active=False)
        self.sign_in(email="amina@example.com")
        self.assertEqual(self.register().data["code"], "phone_taken")

    def test_payout_number_is_saved_without_a_code(self, send_sms):
        self.create_account()
        self.client.post("/api/provider/")
        self.assertEqual(self.client.post("/api/provider/payout-phone/send-code/", {"phone": "0712345678"}).data["code"], "phone_verification_off")
        response = self.client.post("/api/provider/payout-phone/", {"phone": "0712345678"})
        steps = {step["key"]: step["done"] for step in response.data["provider"]["checklist"]}
        self.assertTrue(steps["payout_phone"])
        self.assertFalse(response.data["provider"]["payout_phone_verified"])
