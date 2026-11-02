"""Test helpers: sign tokens the way Supabase does, with a key made for the tests."""

import time
import uuid
from types import SimpleNamespace
from unittest import mock

import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from django.conf import settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Account

TEST_SIGNING_KEY = ec.generate_private_key(ec.SECP256R1())


class FakeJWKSClient:
    def get_signing_key_from_jwt(self, token):
        return SimpleNamespace(key=TEST_SIGNING_KEY.public_key())


def make_token(sub=None, email="amina@example.com", key=TEST_SIGNING_KEY, **overrides):
    now = int(time.time())
    claims = {
        "sub": str(sub or uuid.uuid4()),
        "email": email,
        "aud": settings.SUPABASE_JWT_AUDIENCE,
        "iss": settings.SUPABASE_JWT_ISSUER,
        "role": "authenticated",
        "iat": now,
        "exp": now + 3600,
        "is_anonymous": False,
        **overrides,
    }
    return jwt.encode(claims, key, algorithm="ES256", headers={"kid": "test-key"})


class KaziAPITestCase(APITestCase):
    def setUp(self):
        super().setUp()
        patcher = mock.patch("accounts.authentication.jwks_client", return_value=FakeJWKSClient())
        patcher.start()
        self.addCleanup(patcher.stop)

    def sign_in(self, sub=None, email="amina@example.com"):
        """Act as a Supabase user. Returns their Supabase user id."""
        sub = sub or uuid.uuid4()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {make_token(sub=sub, email=email)}")
        return sub

    def create_account(self, email="amina@example.com", phone="+254712345678", active=True, **fields):
        """Create an account directly and sign in as its owner."""
        sub = self.sign_in(email=email)
        now = timezone.now()
        return Account.objects.create(
            supabase_user_id=sub,
            email=email,
            full_name=fields.pop("full_name", "Amina Otieno"),
            phone=phone,
            email_verified_at=now,
            phone_verified_at=now if active else None,
            status=Account.Status.ACTIVE if active else Account.Status.PENDING_VERIFICATION,
            **fields,
        )
