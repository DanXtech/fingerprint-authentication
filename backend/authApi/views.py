import json
import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    PublicKeyCredentialDescriptor,
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    ResidentKeyRequirement,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url

from .models import WebAuthnCredential

RP_ID = settings.WEBAUTHN_RP_ID
RP_NAME = settings.WEBAUTHN_RP_NAME
ORIGIN = settings.WEBAUTHN_ORIGIN
User = get_user_model()


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"detail": "CSRF cookie set"})


class SignupOptionsView(APIView):
    """
    POST /api/authApi/signup/options/
    No auth, no username/password/email required. This is the ENTIRE signup
    form: nothing. We generate a random internal identifier, hand back
    WebAuthn options, and stash that identifier in the session. Nothing is
    saved to the database yet - that only happens once the fingerprint is
    actually verified in SignupVerifyView, so an abandoned signup never
    creates an orphan account.

    resident_key=REQUIRED asks the authenticator to save a "discoverable"
    passkey, which is what lets login happen with zero typed input later
    (the browser can list it in a picker on its own).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        random_id = uuid.uuid4().hex
        pending_username = f"user_{random_id[:16]}"

        options = generate_registration_options(
            rp_id=RP_ID,
            rp_name=RP_NAME,
            user_id=random_id.encode(),
            user_name=pending_username,
            user_display_name="Passkey user",
            authenticator_selection=AuthenticatorSelectionCriteria(
                resident_key=ResidentKeyRequirement.REQUIRED,
                user_verification=UserVerificationRequirement.REQUIRED,
            ),
        )

        request.session["webauthn_signup_challenge"] = bytes_to_base64url(options.challenge)
        request.session["webauthn_signup_username"] = pending_username
        return Response(json.loads(options_to_json(options)))


class SignupVerifyView(APIView):
    """
    POST /api/authApi/signup/verify/
    body: raw JSON returned by navigator.credentials.create(), plus an
    optional "device_name" field.

    Creates the User row (with an unusable password - there is no password
    login path at all in this app) and the WebAuthnCredential row together,
    then logs the new account straight in with a JWT.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        challenge_b64 = request.session.get("webauthn_signup_challenge")
        pending_username = request.session.get("webauthn_signup_username")
        if not challenge_b64 or not pending_username:
            return Response({"detail": "Signup session expired. Please try again."}, status=400)
        challenge = base64url_to_bytes(challenge_b64)

        credential = request.data

        try:
            verification = verify_registration_response(
                credential=credential,
                expected_challenge=challenge,
                expected_origin=ORIGIN,
                expected_rp_id=RP_ID,
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

        user = User(username=pending_username)
        user.set_unusable_password()
        user.save()

        WebAuthnCredential.objects.create(
            user=user,
            credential_id=bytes_to_base64url(verification.credential_id),
            public_key=bytes_to_base64url(verification.credential_public_key),
            sign_count=verification.sign_count,
            transports=credential.get("response", {}).get("transports", []),
            device_name=request.data.get("device_name", "My device"),
        )

        del request.session["webauthn_signup_challenge"]
        del request.session["webauthn_signup_username"]

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
        }, status=201)


class RegistrationOptionsView(APIView):
    """
    POST /api/authApi/register/options/
    User must already be logged in (via an existing passkey) to enroll an
    ADDITIONAL fingerprint/device on the same account - e.g. adding your
    phone as a second passkey after signing up on your laptop. This is
    different from SignupOptionsView above, which creates the account.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        exclude = [
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(c.credential_id))
            for c in user.webauthn_credentials.all()
        ]

        options = generate_registration_options(
            rp_id=RP_ID,
            rp_name=RP_NAME,
            user_id=str(user.id).encode(),
            user_name=user.username,
            user_display_name=user.get_full_name() or user.username,
            exclude_credentials=exclude,
            authenticator_selection=AuthenticatorSelectionCriteria(
                resident_key=ResidentKeyRequirement.PREFERRED,
                user_verification=UserVerificationRequirement.REQUIRED,
            ),
        )

        # Stash the challenge server-side so we can check it in the verify step.
        cache.set(f"webauthn_reg_challenge_{user.id}", options.challenge, timeout=300)
        return Response(json.loads(options_to_json(options)))


class RegistrationVerifyView(APIView):
    """
    POST register/verify/
    body: raw JSON returned by navigator.credentials.create(), plus an
    optional "device_name" field (e.g. "MacBook Touch ID").
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        challenge = cache.get(f"webauthn_reg_challenge_{user.id}")
        if not challenge:
            return Response({"detail": "Challenge expired or missing. Please try again."}, status=400)

        credential = request.data

        try:
            verification = verify_registration_response(
                credential=credential,
                expected_challenge=challenge,
                expected_origin=ORIGIN,
                expected_rp_id=RP_ID,
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

        WebAuthnCredential.objects.create(
            user=user,
            credential_id=bytes_to_base64url(verification.credential_id),
            public_key=bytes_to_base64url(verification.credential_public_key),
            sign_count=verification.sign_count,
            transports=credential.get("response", {}).get("transports", []),
            device_name=request.data.get("device_name", ""),
        )

        cache.delete(f"webauthn_reg_challenge_{user.id}")
        return Response({"verified": True}, status=201)


class LoginOptionsView(APIView):
    """
    POST /api/authApi/login/options/
    No auth required - this is how a fingerprint login begins.
    body (optional): { "username": "..." } - if omitted, the browser will
    offer any discoverable passkey for this site ("usernameless" login).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        allow_credentials = None

        if username:
            try:
                user = User.objects.get(username=username)
                allow_credentials = [
                    PublicKeyCredentialDescriptor(id=base64url_to_bytes(c.credential_id))
                    for c in user.webauthn_credentials.all()
                ] or None
            except User.DoesNotExist:
                pass  # don't leak whether the username exists

        options = generate_authentication_options(
            rp_id=RP_ID,
            allow_credentials=allow_credentials,
            user_verification=UserVerificationRequirement.REQUIRED,
        )

        # Session-based because we may not know the user yet.
        request.session["webauthn_login_challenge"] = bytes_to_base64url(options.challenge)

        return Response(json.loads(options_to_json(options)))


class LoginVerifyView(APIView):
    """
    POST /api/authApi/login/verify/
    body: raw JSON returned by navigator.credentials.get().
    Returns JWT { access, refresh } on success, same shape as password login.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        challenge_b64 = request.session.get("webauthn_login_challenge")
        if not challenge_b64:
            return Response({"detail": "Challenge expired or missing. Please try again."}, status=400)
        challenge = base64url_to_bytes(challenge_b64)

        credential = request.data
        credential_id_b64 = credential.get("id")

        try:
            stored = WebAuthnCredential.objects.select_related("user").get(
                credential_id=credential_id_b64
            )
        except WebAuthnCredential.DoesNotExist:
            return Response({"detail": "Unknown credential"}, status=400)

        try:
            verification = verify_authentication_response(
                credential=credential,
                expected_challenge=challenge,
                expected_origin=ORIGIN,
                expected_rp_id=RP_ID,
                credential_public_key=base64url_to_bytes(stored.public_key),
                credential_current_sign_count=stored.sign_count,
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

        stored.sign_count = verification.new_sign_count
        stored.save(update_fields=["sign_count"])
        del request.session["webauthn_login_challenge"]

        refresh = RefreshToken.for_user(stored.user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": stored.user.username,
        })


class CredentialListView(APIView):
    """
    GET /api/authApi/credentials/  - list the current user's enrolled devices
    DELETE /api/authApi/credentials/<id>/  - remove one (handled below)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        creds = request.user.webauthn_credentials.all().order_by("-created_at")
        data = [
            {
                "id": c.id,
                "device_name": c.device_name or "Unnamed device",
                "created_at": c.created_at,
                "transports": c.transports,
            }
            for c in creds
        ]
        return Response(data)


class CredentialDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        deleted, _ = request.user.webauthn_credentials.filter(pk=pk).delete()
        if not deleted:
            return Response({"detail": "Not found"}, status=404)
        return Response(status=204)
    
    
class BiometricLogoutView(APIView):
    """
    POST /api/authApi/logout/
    Clears session on backend. Frontend handles token clearing.
    User must be authenticated.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Clear any server-side session state
        if "webauthn_login_challenge" in request.session:
            del request.session["webauthn_login_challenge"]
        
        return Response({
            "detail": "Logged out successfully",
            "authenticated": False
        }, status=200)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "account_id": user.username,
            "date_joined": user.date_joined,
            "passkey_count": user.webauthn_credentials.count(),  # was user.auth_credentials
        })
