import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { login, register, isAuthenticated } from '../../services/auth.service';
import { redirectToOAuth } from '../../api/auth';
import './Login.css';

type Mode = 'signin' | 'signup';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode]                       = useState<Mode>('signin');
  const [username, setUsername]               = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                     = useState('');
  const [loading, setLoading]                 = useState(false);
  const [showPw, setShowPw]                   = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);

  // Already authenticated → skip straight to the dashboard
  if (isAuthenticated()) return <Navigate to="/dashboard" replace />;

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Both fields are required.');
      return;
    }

    if (mode === 'signup') {
      if (!email.trim())               { setError('Email is required.');             return; }
      if (password !== confirmPassword) { setError("Passwords don't match.");        return; }
      if (password.length < 8)         { setError('Password needs 8+ characters.'); return; }
      setLoading(true);
      try {
        await register(email.trim(), password, username.trim() || undefined);
        navigate('/dashboard', { replace: true });
      } catch (err: unknown) {
        const s = (err as { response?: { status?: number } })?.response?.status;
        if (s === 409) setError('An account with that email already exists.');
        else setError("Couldn't create your account. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const s = (err as { response?: { status?: number } })?.response?.status;
      if (s === 401 || s === 403) setError('Wrong username or password.');
      else setError("Can't reach the server right now. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  const isSignUp = mode === 'signup';

  return (
    <div className="auth-page">
      <div className="auth-box">

        {/* ── Brand ── */}
        <div className="auth-brand">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#F4A825"/>
            <path d="M9 23L16 9l7 14" stroke="#111111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <circle cx="16" cy="19" r="2.5" fill="#111111"/>
          </svg>
          <span className="auth-brand-name">Data Engine</span>
        </div>

        {/* ── Heading ── */}
        <div className="auth-header">
          <h1 className="auth-title">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h1>
          <p className="auth-sub">
            {isSignUp ? 'Already have one? ' : 'No account yet? '}
            <button
              type="button"
              className="auth-inline-link"
              onClick={() => switchMode(isSignUp ? 'signin' : 'signup')}
            >
              {isSignUp ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>

        {/* ── OAuth buttons — 2 × 2 grid ── */}
        <div className="auth-oauth">
          <button
            type="button"
            className="oauth google"
            onClick={() => redirectToOAuth('google')}
            disabled={loading}
          >
            <GoogleIcon /> Continue with Google
          </button>
          <button
            type="button"
            className="oauth github"
            onClick={() => redirectToOAuth('github')}
            disabled={loading}
          >
            <GithubIcon /> Continue with GitHub
          </button>
          <button
            type="button"
            className="oauth builder"
            onClick={() => redirectToOAuth('builderid')}
            disabled={loading}
          >
            <BuilderIcon /> Continue with Builder ID
          </button>
        </div>

        {/* ── Divider ── */}
        <div className="auth-divider"><span>or continue with email</span></div>

        {/* ── Form ── */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <div className="auth-field">
            <label htmlFor="a-username">
              {isSignUp ? 'Username' : 'Username or email'}
            </label>
            <input
              id="a-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              disabled={loading}
              spellCheck={false}
            />
          </div>

          {isSignUp && (
            <div className="auth-field">
              <label htmlFor="a-email">Email address</label>
              <input
                id="a-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>
          )}

          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="a-password">Password</label>
              {!isSignUp && (
                <button type="button" className="auth-inline-link small">
                  Forgot password?
                </button>
              )}
            </div>
            <div className="auth-pw">
              <input
                id="a-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                disabled={loading}
              />
              <button
                type="button"
                className="auth-pw-eye"
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff /> : <EyeOn />}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div className="auth-field">
              <label htmlFor="a-confirm">Confirm password</label>
              <div className="auth-pw">
                <input
                  id="a-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="auth-pw-eye"
                  onClick={() => setShowConfirm(v => !v)}
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Hide' : 'Show'}
                >
                  {showConfirm ? <EyeOff /> : <EyeOn />}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? <span className="auth-spinner" aria-hidden="true" />
              : isSignUp ? 'Create account' : 'Sign in'
            }
          </button>

        </form>

        {isSignUp && (
          <p className="auth-terms">
            By signing up you agree to the{' '}
            <a href="#">Terms of Service</a> and{' '}
            <a href="#">Privacy Policy</a>.
          </p>
        )}

      </div>
    </div>
  );
}

/* ── Icons ──────────────────────────────────────────────────────────────────── */

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  );
}

function BuilderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor" aria-hidden="true">
      <rect x="0.5" y="0.5" width="6" height="6" rx="1.2"/>
      <rect x="8.5" y="0.5" width="6" height="6" rx="1.2" opacity="0.5"/>
      <rect x="0.5" y="8.5" width="6" height="6" rx="1.2" opacity="0.5"/>
      <rect x="8.5" y="8.5" width="6" height="6" rx="1.2" opacity="0.25"/>
    </svg>
  );
}

function EyeOn() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.39 1 12a10.94 10.94 0 0 1 2.06-3.94M9.9 4.24A9 9 0 0 1 12 4c5 0 9.27 3.61 11 8a10.94 10.94 0 0 1-1.04 2.02"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
