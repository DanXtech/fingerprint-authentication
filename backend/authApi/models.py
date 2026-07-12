from django.conf import settings
from django.db import models


class WebAuthnCredential(models.Model):
    """
    One row per enrolled fingerprint/Face ID/security key. A user can have
    several (e.g. laptop Touch ID + phone Face ID), which is why this is a
    separate table with a ForeignKey rather than a field on User.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="webauthn_credentials"
    )
    credential_id = models.CharField(max_length=255, unique=True)  # base64url string
    public_key = models.TextField()       # base64url-encoded COSE public key
    sign_count = models.BigIntegerField(default=0)
    transports = models.JSONField(default=list, blank=True)
    device_name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "credential_id")

    def __str__(self):
        return f"{self.user.username} - {self.device_name or self.credential_id[:12]}"
