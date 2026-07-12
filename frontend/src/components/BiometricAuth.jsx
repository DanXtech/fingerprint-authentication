import { useState } from 'react';
import { biometricLogin, biometricLogout } from '../utils/biometricAuth';

const FingerprintIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="26"
    height="26"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
  >
    <path d="M12 2a7 7 0 0 0-7 7v2c0 3.5-1 6-2 8" strokeLinecap="round" />
    <path d="M12 2a7 7 0 0 1 7 7v2c0 1.2.15 2.4.4 3.5" strokeLinecap="round" />
    <path
      d="M8 21c1-2 1.5-4.5 1.5-7v-2a2.5 2.5 0 0 1 5 0v2c0 1 .1 2.3.5 3.5"
      strokeLinecap="round"
    />
    <path
      d="M5.5 20c1.2-2.7 1.5-5 1.5-7v-2a5 5 0 0 1 10 0"
      strokeLinecap="round"
    />
    <path d="M12 9v3c0 2.8.6 5.2 1.6 7.2" strokeLinecap="round" />
  </svg>
);

/**
 * BiometricLogin - Biometric login component
 * Props: onSuccess(tokens), onError(errorMsg)
 */
export const BiometricLogin = ({ onSuccess, onError }) => {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const authenticate = async () => {
    setStatus('Scanning your fingerprint…');
    setBusy(true);
    const result = await biometricLogin();
    setBusy(false);

    if (result.success) {
      setStatus('');
      onSuccess && onSuccess(result);
    } else {
      setStatus('');
      onError && onError(result.error);
    }
  };

  return (
    <div className="biometric-auth">
      <button
        className="fingerprint-btn"
        onClick={authenticate}
        disabled={busy}
        title="Sign in with fingerprint"
      >
        <span className="fingerprint-icon" aria-hidden="true">
          <FingerprintIcon />
        </span>
      </button>
      {status && <p className="muted small status-line">{status}</p>}
    </div>
  );
};

/**
 * BiometricLogout - Biometric logout button
 * Props: onLogout()
 */
export const BiometricLogout = ({ onLogout }) => {
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    setBusy(true);
    await biometricLogout();
    onLogout && onLogout();
  };

  return (
    <button
      className="ghost-btn logout-btn"
      onClick={handleLogout}
      disabled={busy}
      title="Log out"
    >
      {busy ? 'Logging out…' : 'Log out'}
    </button>
  );
};
