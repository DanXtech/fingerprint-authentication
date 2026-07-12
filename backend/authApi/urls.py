from django.urls import path
from .views import (
    RegistrationOptionsView, RegistrationVerifyView,
    LoginOptionsView, LoginVerifyView, SignupOptionsView, SignupVerifyView,
    CredentialListView, CredentialDeleteView, ProfileView, BiometricLogoutView,
    CsrfTokenView,
)

urlpatterns = [
    path("csrf/", CsrfTokenView.as_view(), name="auth_csrf"),

    # Create a brand-new passwordless account with a fingerprint (no form at all)
    path("signup/options/", SignupOptionsView.as_view(), name="auth_signup_options"),
    path("signup/verify/", SignupVerifyView.as_view(), name="auth_signup_verify"),
    
    
    # Add an additional fingerprint/device to an account you're already logged into
    path("register/options/", RegistrationOptionsView.as_view(), name="auth_registration_options"),
    path("register/verify/", RegistrationVerifyView.as_view(), name="auth_registration_verify"),
    
    path("login/options/", LoginOptionsView.as_view(), name="auth_login_options"),
    path("login/verify/", LoginVerifyView.as_view(), name="auth_login_verify"),
    path("logout/", BiometricLogoutView.as_view(), name="auth_logout"),
    
    path("credentials/", CredentialListView.as_view(), name="auth_credentials"),
    path("credentials/<int:pk>/", CredentialDeleteView.as_view(), name="auth_credential_delete"),
    path("profile/", ProfileView.as_view(), name="dashboard_profile"),
]
