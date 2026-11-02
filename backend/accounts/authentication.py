import uuid
from functools import cached_property, lru_cache

import jwt
from django.conf import settings
from rest_framework import authentication, exceptions, status

from .models import Account


class AuthServiceUnavailable(exceptions.APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Sign-in is temporarily unavailable. Please try again in a minute."


class SupabaseUser:
    """The person behind a verified Supabase access token. Views see this as `request.user`.

    `account` is their Kazi Connect account, or None if they have signed up with
    Supabase but not yet completed their profile.
    """

    is_authenticated = True
    is_anonymous = False

    def __init__(self, claims):
        self.id = uuid.UUID(claims["sub"])
        self.pk = self.id  # DRF's throttles identify users by pk
        self.email = claims["email"].lower()
        self.claims = claims

    @cached_property
    def account(self):
        return Account.objects.select_related("provider_profile").filter(supabase_user_id=self.id).first()


@lru_cache(maxsize=1)
def jwks_client():
    # Caches Supabase's public keys, so most requests don't make a network call.
    return jwt.PyJWKClient(settings.SUPABASE_JWKS_URL, cache_keys=True, lifespan=600)


class SupabaseJWTAuthentication(authentication.BaseAuthentication):
    """Accepts `Authorization: Bearer <Supabase access token>`.

    The token is trusted only if its signature matches one of Supabase's published
    keys and its issuer, audience and expiry are right. Roles are never read from
    the token: they come from our own Account rows (SDD section 6, rule 2).
    """

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).split()
        if not header or header[0].lower() != b"bearer":
            return None  # no token: the request is anonymous
        if len(header) != 2:
            raise exceptions.AuthenticationFailed("Invalid Authorization header.")
        token = header[1].decode()

        try:
            signing_key = jwks_client().get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience=settings.SUPABASE_JWT_AUDIENCE,
                issuer=settings.SUPABASE_JWT_ISSUER,
                options={"require": ["exp", "sub", "iss", "aud"]},
            )
        except jwt.PyJWKClientConnectionError as error:
            raise AuthServiceUnavailable() from error
        except (jwt.PyJWKClientError, jwt.InvalidTokenError) as error:
            raise exceptions.AuthenticationFailed("Your session is invalid or has expired. Please sign in again.") from error

        if claims.get("is_anonymous") or not claims.get("email"):
            raise exceptions.AuthenticationFailed("Sign in with a verified email address.")
        return SupabaseUser(claims), token

    def authenticate_header(self, request):
        # Makes DRF answer 401 (not 403) when the token is missing or bad.
        return 'Bearer realm="api"'
