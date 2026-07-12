from django.contrib import admin

from .models import WebAuthnCredential


@admin.register(WebAuthnCredential)
class WebAuthnCredentialAdmin(admin.ModelAdmin):
    list_display = ("user", "device_name", "sign_count", "created_at")
    search_fields = ("user__username", "device_name")
