import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { startRegistration } from '@simplewebauthn/browser';

import {
  getSignupOptions, verifySignup,
  saveTokens,
} from '../api';
import { useToast } from '../components/toast';

const FingerprintIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12 2a7 7 0 0 0-7 7v2c0 3.5-1 6-2 8" strokeLinecap="round" />
    <path d="M12 2a7 7 0 0 1 7 7v2c0 1.2.15 2.4.4 3.5" strokeLinecap="round" />
    <path d="M8 21c1-2 1.5-4.5 1.5-7v-2a2.5 2.5 0 0 1 5 0v2c0 1 .1 2.3.5 3.5" strokeLinecap="round" />
    <path d="M5.5 20c1.2-2.7 1.5-5 1.5-7v-2a5 5 0 0 1 10 0" strokeLinecap="round" />
    <path d="M12 9v3c0 2.8.6 5.2 1.6 7.2" strokeLinecap="round" />
  </svg>
);

export default function Register() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  async function handleSignUp() {
    setStatus('Follow the prompt to create your fingerprint…');
    setBusy(true);
    try {
      // 1. Ask the backend for a signup challenge - no form data needed.
      const options = await getSignupOptions();
      // 2. OS prompts for a fingerprint and creates a new key pair.
      const attestation = await startRegistration({ optionsJSON: options });
      // 3. Backend verifies it, creates the account, logs it straight in.
      const tokens = await verifySignup(attestation, 'My device');
      saveTokens(tokens);
      success('Account created', 'Your passkey is set up. You can now sign in.');
      navigate('/login');
    } catch (err) {
      toastError('Sign-up failed', err.message || 'Could not create a passkey on this device.');
    } finally {
      setBusy(false);
      setStatus('');
    }
  }

  return (
    <div className="auth-card">
      <h1>Create Account</h1>
      <p className="muted">Sign up if this is your first time</p>

      <button className="fingerprint-btn secondary" onClick={handleSignUp} disabled={busy}>
        <span className="fingerprint-icon" aria-hidden="true"><FingerprintIcon /></span>
      </button>
      <div>Have an account?<Link to="/login"> Login</Link></div>

      {status && <p className="muted small status-line">{status}</p>}
    </div>
  );
}