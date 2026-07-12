
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

async function ensureCsrfToken() {
  const existing = getCookie('csrftoken');
  if (existing) return existing;

  const response = await fetch(`${API_BASE_URL}/csrf/`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    return null;
  }

  return getCookie('csrftoken');
}

export function saveTokens({access, refresh}) {
  sessionStorage.setItem('access', access);
  if (refresh) sessionStorage.setItem('refresh', refresh);
}

export function getAccessToken() {
  return sessionStorage.getItem('access');
}

export function clearTokens() {
  sessionStorage.removeItem('access');
  sessionStorage.removeItem('refresh');
}

export function isLoggedIn() {
  return !!getAccessToken();
}


// --- generic request helper --------------------------------------------
async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const isUnsafeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  if (isUnsafeMethod) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) headers['X-CSRFToken'] = csrfToken;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include', // sends the session cookie WebAuthn needs
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // some endpoints (e.g. DELETE) return no body
  }

  if (!res.ok) {
    const message = data?.detail || JSON.stringify(data) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

// --- passwordless signup (creates a brand-new account) ---------------------
export const getSignupOptions = () =>
  request('/signup/options/', { method: 'POST' });

export const verifySignup = (attestation, deviceName) =>
  request('/signup/verify/', {
    method: 'POST',
    body: { ...attestation, device_name: deviceName },
  });

// --- passwordless login (existing account) ---------------------------------
export const getLoginOptions = () =>
  request('/login/options/', { method: 'POST', body: {} });

export const verifyLogin = (assertion) =>
  request('/login/verify/', { method: 'POST', body: assertion });

// --- add an extra fingerprint/device to an account you're already in -------
export const getRegistrationOptions = () =>
  request('/register/options/', { method: 'POST', auth: true });

export const verifyRegistration = (attestation, deviceName) =>
  request('/register/verify/', {
    method: 'POST',
    auth: true,
    body: { ...attestation, device_name: deviceName },
  });

export const listCredentials = () =>
  request('/credentials/', { auth: true });

export const deleteCredential = (id) =>
  request(`/credentials/${id}/`, { method: 'DELETE', auth: true });

// --- logout ----------------------------------------------------------------
export const logout = () =>
  request('/logout/', { method: 'POST', auth: true });

// --- dashboard -------------------------------------------------------------
export const getProfile = () => request('/profile/', { auth: true });

