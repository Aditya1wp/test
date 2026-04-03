import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FacebookAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { auth } from '../lib/firebase';


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

const demoIdentifiers = ['cracknimcet', 'aspirant@example.com', '+91 98765 43210'];

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
      return 'User not found. Check your username, email, or phone.';
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid credentials. Please try again.';
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
      return 'Use your username, email, or phone number.';
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
    <main className="auth-shell">
      <section className="auth-visual-panel">
        <div className="auth-visual-backdrop" />
        <div className="auth-visual-content">
          <div className="auth-badge">
            <AuraIcon className="h-4 w-4" />
            <span>Instagram-inspired auth journey</span>
          </div>

          <div className="space-y-5">
            <p className="auth-kicker">Built for intense preparation</p>
            <h1 className="auth-hero-title">
              Prep in public.
              <span className="auth-gradient-text"> Perform in private.</span>
            </h1>
            <p className="auth-hero-copy">
              A social-first entrance for your NIMCET practice platform, designed to feel premium from the first tap.
            </p>
          </div>

          <div className="insight-hub">
            <div className="glass-card glass-card--stats">
              <span className="card-label">EXAM STATISTICS</span>
              <div className="stat-grid">
                <div className="stat-item">
                  <p>48K+</p>
                  <span>Mock Tests</span>
                </div>
                <div className="stat-item">
                  <p>94.5%</p>
                  <span>Top Score</span>
                </div>
                <div className="stat-item">
                  <p>87%</p>
                  <span>Avg Rank</span>
                </div>
              </div>
              <div className="card-chart" />
            </div>

            <div className="glass-card glass-card--insights">
              <span className="card-label">ASPIRANT INSIGHTS</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <TrendingUp className="text-indigo-400" size={24} />
                </div>
                <div>
                  <p className="font-bold text-lg">Current Performance</p>
                  <p className="text-sm text-zinc-400">78th Percentile (Active)</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                </div>
                <p className="text-xs text-zinc-500">Target Rank: AIR &lt; 50</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <p className="auth-brand-mark">NIMCET Mock</p>
            <h2>Welcome Back</h2>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <label className="auth-field">
              <span>Username, email, or phone</span>
              <input
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Phone number, username, or email"
                autoComplete="username"
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div className="auth-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="auth-ghost-button">
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

            <p className={`auth-helper-text ${passwordReady ? 'is-ready' : ''}`}>{helperText}</p>

            {error ? <div className="auth-alert">{error}</div> : null}

            <button type="submit" disabled={!canSubmit} className="auth-primary-button">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Log in'}
            </button>

            <div className="auth-divider">
              <span />
              <p>OR</p>
              <span />
            </div>

            <button type="button" onClick={handleFacebookLogin} disabled={loading} className="facebook-button">
              <FacebookIcon className="h-5 w-5" />
              <span>Log in with Facebook</span>
            </button>
          </form>
        </div>

        <div className="auth-card auth-card--compact">
          <p>
            Don&apos;t have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
