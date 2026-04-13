import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FacebookAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { auth } from '../lib/firebase';
import './AuthPages.css';

function TrendingUp({ className, size = 24 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function AuraIcon({ className, size = 24 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
    </svg>
  );
}

function FacebookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073c0 6.019 4.388 10.998 10.125 11.902v-8.42H7.078v-3.48h3.047V9.42c0-3.017 1.792-4.685 4.533-4.685 1.313 0 2.686.236 2.686.236v2.962H15.83c-1.49 0-1.956.93-1.956 1.885v2.257h3.328l-.532 3.48h-2.796v8.42C19.612 23.07 24 18.091 24 12.073Z" />
    </svg>
  );
}

function resolveAuthError(error) {
  switch (error?.code) {
    case 'auth/user-not-found':
      return 'No account was found for that email address.';
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'Unable to log in right now. Please try again.';
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordReady = password.trim().length >= 6;
  const canSubmit = identifier.trim().length > 0 && passwordReady && !loading;
  const helperText = useMemo(() => {
    if (!password.length) {
      return 'Use your email and password to access your dashboard.';
    }
    if (!passwordReady) {
      return 'Password must be at least 6 characters.';
    }
    return 'Ready to sign in securely.';
  }, [password.length, passwordReady]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, identifier.trim(), password);
      navigate('/home');
    } catch (authError) {
      setError(resolveAuthError(authError));
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const provider = new FacebookAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/home');
    } catch (authError) {
      setError(resolveAuthError(authError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="authx-page">
      <section className="authx-visual">
        <div className="authx-visual-content">
          <div className="authx-badge">
            <AuraIcon className="h-4 w-4" />
            <span>PREMIUM PREP ENGINE</span>
          </div>

          <div>
            <h1 className="authx-visual-title">
              Analyze. <span className="authx-gradient">Prepare. Ace.</span>
            </h1>
            <p className="authx-visual-copy">
              The most advanced mock engine for NIMCET aspirants. Premium tools,
              elite insights.
            </p>
          </div>

          <div className="authx-stack">
            <div className="authx-card authx-card--front">
              <span className="authx-label">EXAM STATISTICS</span>
              <div className="authx-stats">
                <div>
                  <p className="authx-stat-value">48K+</p>
                  <span className="authx-stat-text">Mock Tests</span>
                </div>
                <div>
                  <p className="authx-stat-value">94.5%</p>
                  <span className="authx-stat-text">Top Score</span>
                </div>
                <div>
                  <p className="authx-stat-value">87%</p>
                  <span className="authx-stat-text">Avg Rank</span>
                </div>
              </div>
              <div className="authx-chart" />
            </div>

            <div className="authx-card authx-card--back">
              <span className="authx-label">ASPIRANT INSIGHTS</span>
              <div className="authx-insight-row">
                <div className="authx-icon-wrap">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="authx-insight-title">Current Performance</p>
                  <p className="authx-muted">78th Percentile (Active)</p>
                </div>
              </div>
              <div className="authx-progress">
                <div className="authx-progress-bar">
                  <div className="authx-progress-fill" style={{ width: '75%' }} />
                </div>
                <p className="authx-progress-note">Target Rank: AIR &lt; 50</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="authx-panel">
        <div className="authx-form-wrap">
          <h2 className="authx-heading">Welcome Back</h2>
          <p className="authx-subheading">
            Enter your credentials to access your insights.
          </p>

          <form onSubmit={handleLogin} className="authx-form">
            <label className="authx-field">
              <span>Email Address</span>
              <input
                className="authx-input"
                type="email"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="aspirant@example.com"
                autoComplete="username"
                required
              />
            </label>

            <label className="authx-field">
              <span>Password</span>
              <div className="authx-input-wrap">
                <input
                  className="authx-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="authx-toggle">
                  {showPassword ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Show
                    </>
                  )}
                </button>
              </div>
            </label>

            <div className="authx-row">
              <label className="authx-checkbox">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#forgot" className="authx-link">
                Forgot Password?
              </a>
            </div>

            <p className={`authx-helper ${passwordReady ? 'is-ready' : ''}`}>{helperText}</p>

            {error ? <div className="authx-alert">{error}</div> : null}

            <button type="submit" disabled={!canSubmit} className="authx-button">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Log in'}
            </button>

            <button type="button" onClick={handleFacebookLogin} disabled={loading} className="authx-button authx-button--secondary">
              <FacebookIcon className="h-5 w-5" />
              <span>Log in with Facebook</span>
            </button>
          </form>

          <p className="authx-footer">
            Don&apos;t have an account? <Link to="/signup" className="authx-link">Create an account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
