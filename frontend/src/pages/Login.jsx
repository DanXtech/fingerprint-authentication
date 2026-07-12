import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BiometricLogin } from '../components/BiometricAuth';
import { useToast } from '../components/toast';

export default function Login() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const handleBiometricSuccess = (tokens) => {
    success('Welcome back', `You're signed in as ${tokens.username}.`);
    navigate('/dashboard');
  };

  const handleBiometricError = (errorMsg) => {
    toastError('Sign-in failed', errorMsg || 'Sign-in was cancelled or failed.');
  };

  return (
    <div className="auth-card">
      <h1>Welcome back</h1>
      <p className="muted">Sign in with your fingerprint</p>
      <BiometricLogin onSuccess={handleBiometricSuccess} onError={handleBiometricError} />
      <div>Don't have an account? <Link to="/register">Sign up</Link></div>
    </div>
  );
}