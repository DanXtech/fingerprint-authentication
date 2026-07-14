# Bass Bank

A passwordless authentication demo that uses Django REST Framework for the backend and a React/Vite frontend. The app lets users sign up and log in using WebAuthn passkeys (fingerprint / Face ID / security key) instead of a password.

## How it works

### Backend

- Built with Django and Django REST Framework.
- Uses `webauthn` for WebAuthn registration and authentication.
- Uses `djangorestframework-simplejwt` to issue JWT access and refresh tokens after a successful biometric login.
- Stores enrolled passkeys in `backend/authApi/models.py` as `WebAuthnCredential` records.
- Uses SQLite (`db.sqlite3`) for local development.
- Exposes API endpoints under `/api/v1/`.

### Frontend

- Built with React and Vite.
- Uses `@simplewebauthn/browser` to interact with the browser's WebAuthn APIs.
- Uses `frontend/src/api.js` to call the backend and attach JWT tokens.
- Stores the access token and refresh token in `sessionStorage`.
- Supports a registration page and login page.

## Key authentication flow

### Sign up (passwordless onboarding)

1. Frontend calls `POST /api/v1/signup/options/` to request a WebAuthn registration challenge.
2. The browser triggers `navigator.credentials.create()` via `@simplewebauthn/browser`.
3. The frontend sends the attestation response to `POST /api/v1/signup/verify/`.
4. Backend verifies the response, creates a new Django user with an unusable password, saves the passkey credential, and returns JWT tokens.
5. The user is now authenticated by token.

### Log in

1. Frontend calls `POST /api/v1/login/options/` to request a WebAuthn authentication challenge.
2. The browser triggers `navigator.credentials.get()` via `@simplewebauthn/browser`.
3. The frontend sends the assertion response to `POST /api/v1/login/verify/`.
4. Backend verifies the assertion against the stored public key and sign count.
5. If successful, backend returns JWT tokens.

### Logout

- Frontend calls `POST /api/v1/logout/` and clears stored tokens.
- Backend clears any active login challenge state.

## Important backend endpoints

- `GET /api/v1/csrf/` - ensures `csrftoken` cookie is set for POST requests.
- `POST /api/v1/signup/options/` - start creating a new passkey account.
- `POST /api/v1/signup/verify/` - verify sign-up attestation and create the account.
- `POST /api/v1/login/options/` - start biometric login.
- `POST /api/v1/login/verify/` - verify biometric login assertion and issue tokens.
- `POST /api/v1/register/options/` - request a new passkey registration for an existing user.
- `POST /api/v1/register/verify/` - verify a newly enrolled passkey for a logged-in user.
- `GET /api/v1/credentials/` - list enrolled passkeys for the current user.
- `DELETE /api/v1/credentials/<id>/` - remove a saved passkey.
- `GET /api/v1/profile/` - fetch user profile data.

## Configuration notes

- The backend uses `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, and `WEBAUTHN_ORIGIN` from environment variables if available.
- Default local values are:
  - `WEBAUTHN_RP_ID=localhost`
  - `WEBAUTHN_ORIGIN=http://localhost:5173`
- CORS is configured to allow the frontend origin `http://localhost:5173` and `http://127.0.0.1:5173`.
- `frontend/src/api.js` defaults API calls to `/api/v1` and can be overridden with `VITE_API_BASE_URL`.

## Running the project locally

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Then open the frontend app at `http://localhost:5173`.

## What this project demonstrates

- Passwordless authentication using WebAuthn passkeys.
- A Django REST API with JWT token issuance.
- A React frontend that uses browser biometric APIs securely.
- A simple passkey-backed user model with no password login path.

## Notes

- The dashboard currently displays the signed-in user and logout action.
- Backend support exists for adding and removing additional biometric credentials, even if the UI is not fully exposed.
- This app is configured for local development and should be hardened before production use.




deployment using render for the backend and vercel for the frontend.
#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --no-input

# Run migrations
python manage.py migrate
pip install -r requirements.







