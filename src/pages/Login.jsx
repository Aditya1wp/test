import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut, signInWithPopup } from 'firebase/auth';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import './AuthPages.css';

function TrendingUp({ className, size = 24 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

function GoogleIcon({ className, size = 18 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
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
      return `Technical Error (${error?.code || 'unknown'}): Please check the console for details.`;
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
    if (!password.length) return 'Use your email and password to access your dashboard.';
    if (!passwordReady) return 'Password must be at least 6 characters.';
    return 'Ready to sign in securely.';
  }, [password.length, passwordReady]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, identifier.trim(), password);
      if (!userCredential.user.emailVerified) {
        navigate('/verify-email', { state: { email: identifier.trim() } });
        return;
      }
      navigate('/home');
    } catch (authError) {
      console.error("Email Login Error:", authError);
      setError(resolveAuthError(authError));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/home');
    } catch (authError) {
      console.error("Google Login Error:", authError);
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
              The most advanced mock engine for serious aspirants. Premium tools,
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

          <button type="button" onClick={handleGoogleLogin} disabled={loading} className="authx-google-button">
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="authx-divider">Or continue with email</div>

          <form onSubmit={handleLogin} className="authx-form">
            <label className="authx-field">
              <span>Email Address</span>
              <input
                className="authx-input"
                type="email"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="student@example.com"
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

            <p className={`authx-helper ${passwordReady ? 'is-ready' : ''}`}>{helperText}</p>

            {error ? <div className="authx-alert">{error}</div> : null}

            <button type="submit" disabled={!canSubmit} className="authx-button">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Log in'}
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
