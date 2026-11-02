from cryptography.hazmat.primitives.asymmetric import ec

from core.testing import KaziAPITestCase, make_token


class SupabaseTokenTests(KaziAPITestCase):
    url = "/api/me/"

    def test_no_token_is_rejected_with_401(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_valid_token_without_account_gets_404(self):
        self.sign_in()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["code"], "no_account")

    def test_expired_token_is_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {make_token(exp=1)}")
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_token_signed_with_another_key_is_rejected(self):
        forged = make_token(key=ec.generate_private_key(ec.SECP256R1()))
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {forged}")
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_wrong_audience_or_issuer_is_rejected(self):
        for overrides in ({"aud": "anon"}, {"iss": "https://evil.example.com/auth/v1"}):
            self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {make_token(**overrides)}")
            self.assertEqual(self.client.get(self.url).status_code, 401, overrides)

    def test_anonymous_supabase_sessions_are_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {make_token(is_anonymous=True)}")
        self.assertEqual(self.client.get(self.url).status_code, 401)
