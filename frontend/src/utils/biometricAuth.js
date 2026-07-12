import { startAuthentication } from '@simplewebauthn/browser';
import {
  getLoginOptions,
  verifyLogin,
  saveTokens,
  clearTokens,
  logout,
  getAccessToken,
} from '../api';

/**
 * Complete biometric login flow without recovery codes
 * Returns: { access, refresh, username, success: true }
 */
export async function biometricLogin() {
  try {
    // Step 1: Get challenge from server
    const options = await getLoginOptions();

    // Step 2: Start biometric authentication (user taps fingerprint/face)
    const assertion = await startAuthentication({ optionsJSON: options });

    // Step 3: Verify credential with backend
    const tokens = await verifyLogin(assertion);

    // Step 4: Store tokens - user is now fully authenticated
    saveTokens(tokens);

    return { ...tokens, success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Biometric authentication failed',
    };
  }
}

/**
 * Biometric logout - clears all authentication state
 */
export async function biometricLogout() {
  try {
    // Call backend logout endpoint
    await logout();
  } catch (err) {
    console.warn('Backend logout failed:', err.message);
  } finally {
    // Always clear frontend tokens
    clearTokens();
  }
  return { success: true };
}

/**
 * Check if user is authenticated (has valid access token)
 */
export function isAuthenticated() {
  return !!getAccessToken();
}

/**
 * Handle post-authentication flow
 */
export function handlePostAuthSuccess(tokens, onNavigate) {
  // Tokens are already stored in saveTokens()
  if (onNavigate) {
    onNavigate('/dashboard');
  }
  return true;
}

/**
 * Handle post-logout flow
 */
export function handlePostLogout(onNavigate) {
  // State is cleared in biometricLogout()
  if (onNavigate) {
    onNavigate('/login');
  }
  return true;
}
