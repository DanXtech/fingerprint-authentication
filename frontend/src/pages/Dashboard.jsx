import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { startRegistration } from '@simplewebauthn/browser';
import { BiometricLogout } from '../components/BiometricAuth';
import {
  getProfile, getRegistrationOptions, verifyRegistration,
  listCredentials, deleteCredential, clearTokens, logout,
} from '../api';
import { useToast } from '../components/toast';

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [deviceName, setDeviceName] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  async function loadData() {
    try {
      const [p, c] = await Promise.all([getProfile(), listCredentials()]);
      setProfile(p);
      setCredentials(c);
    } catch (err) {
      // Access token missing/expired -> send back to login
      navigate('/login');
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      clearTokens();
      navigate('/login');
    }
  }

  async function handleEnroll(e) {
    e.preventDefault();
    setBusy(true);
    try {
      // 1. Get a registration challenge from the backend.
      const options = await getRegistrationOptions();
      // 2. Trigger the OS fingerprint/Face ID/security-key enrollment prompt.
      const attestation = await startRegistration({ optionsJSON: options });
      // 3. Send the result back so the backend can store the public key.
      await verifyRegistration(attestation, deviceName || 'My device');
      success('Fingerprint enrolled', 'Your new device can now be used to sign in.');
      setDeviceName('');
      await loadData();
    } catch (err) {
      toastError('Enrollment failed', err.message || 'Could not enroll this device.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id) {
    try {
      await deleteCredential(id);
      setCredentials((prev) => prev.filter((c) => c.id !== id));
      success('Passkey removed');
    } catch (err) {
      toastError('Could not remove passkey', err.message);
    }
  }

  if (!profile) return <div className="dashboard-card"><p>Loading…</p></div>;

  return (
    <div className="dashboard-card">
      <header className="dashboard-header">
        <div>
          <h1>Welcome back</h1>
          <p className="muted account-id">Account ID: {profile.account_id}</p>
        </div>
        <BiometricLogout onLogout={() => navigate('/login')} />
      </header>

      {/* <section className="panel">
        <h2>Enrolled fingerprints / passkeys</h2>
        {credentials.length === 0 ? (
          <p className="muted">No passkeys yet. Enroll one below so you can log in without a password.</p>
        ) : (
          <ul className="credential-list">
            {credentials.map((c) => (
              <li key={c.id}>
                <span>{c.device_name}</span>
                <span className="muted small">{new Date(c.created_at).toLocaleDateString()}</span>
                <button className="link-btn" onClick={() => handleRemove(c.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}

        <form className="form inline" onSubmit={handleEnroll}>
          <input
            placeholder="Device name (e.g. MacBook Touch ID)"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
          />
          <button type="submit" disabled={busy}>Enroll this device's fingerprint</button>
        </form>
      </section> */}
    </div>
  );
}