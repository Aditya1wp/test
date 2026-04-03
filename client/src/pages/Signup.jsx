import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FacebookAuthProvider, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldCheck, Smartphone, UserRound, XCircle } from 'lucide-react';
import { auth, db } from '../lib/firebase';

const steps = [
  { id: 1, label: 'Identity', icon: Smartphone },
  { id: 2, label: 'Profile', icon: UserRound },
  { id: 3, label: 'Security', icon: ShieldCheck },
];

function FacebookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073c0 6.019 4.388 10.998 10.125 11.902v-8.42H7.078v-3.48h3.047V9.42c0-3.017 1.792-4.685 4.533-4.685 1.313 0 2.686.236 2.686.236v2.962H15.83c-1.49 0-1.956.93-1.956 1.885v2.257h3.328l-.532 3.48h-2.796v8.42C19.612 23.07 24 18.091 24 12.073Z" />
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

function Layout({ className, size = 24 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
    </svg>
  );
}

function UserCheck({ className, size = 24 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" />
    </svg>
  );
}

function normalizeUsername(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
}

function generateRandomUsername() {
  const adjectives = ['expert', 'fast', 'smart', 'aim', 'rank', 'mock', 'crack', 'nimcet'];
  const nouns = ['aspirant', 'warrior', 'learner', 'solver', 'topper', 'scholar'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}_${noun}_${num}`;
}

function formatSignupError(error) {
  switch (error?.code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/network-request-failed':
      return 'Network error. Please try again when you are back online.';
    default:
      return 'Could not create your account right now.';
  }
}

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    identity: '',
    fullName: '',
    username: generateRandomUsername(), // Pre-filled with random username
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('idle');

  const normalizedUsername = useMemo(() => normalizeUsername(formData.username), [formData.username]);
  const identityLooksLikeEmail = /\S+@\S+\.\S+/.test(formData.identity.trim());
  const identityLooksLikePhone = /^[+\d][\d\s-]{7,}$/.test(formData.identity.trim());
  const canContinueIdentity = identityLooksLikeEmail || identityLooksLikePhone;
  const canContinueProfile = formData.fullName.trim().length >= 2 && usernameStatus === 'available';
  const canSubmit = formData.password.trim().length >= 6 && !loading;

  useEffect(() => {
    let isActive = true;
    if (step !== 2 || normalizedUsername.length < 3) {
      setUsernameStatus('idle');
      return undefined;
    }

    const timeoutId = setTimeout(async () => {
      setUsernameStatus('checking');
      try {
        const usernameQuery = query(collection(db, 'users'), where('username', '==', normalizedUsername));
        const snapshot = await getDocs(usernameQuery);
        if (!isActive) {
          return;
        }
        setUsernameStatus(snapshot.empty ? 'available' : 'taken');
      } catch (checkError) {
        if (isActive) {
          setUsernameStatus('error');
        }
      }
    }, 500);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [normalizedUsername, step]);

  const updateField = (field, value) => {
    setError('');
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1 && canContinueIdentity) {
      setStep(2);
    }
    if (step === 2 && canContinueProfile) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setError('');
    setStep((current) => Math.max(1, current - 1));
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.identity.trim(), formData.password);
      const firebaseUser = userCredential.user;

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        display_name: formData.fullName.trim(),
        username: normalizedUsername,
        email: formData.identity.trim(),
        created_at: new Date().toISOString(),
        profile_pic_url: 'https://placehold.co/160x160/121212/ffffff?text=%2B',
      });

      navigate('/profile-setup');
    } catch (signupError) {
      setError(formatSignupError(signupError));
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignup = async () => {
    setLoading(true);
    setError('');

    try {
      const provider = new FacebookAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/profile-setup');
    } catch (signupError) {
      setError(formatSignupError(signupError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell auth-shell--signup">
      <section className="auth-visual-panel">
        <div className="auth-visual-backdrop" />
        <div className="auth-visual-content">
          <div className="auth-badge">
            <AuraIcon className="w-4 h-4" />
            ELITE ONBOARDING
          </div>
          <h1 className="auth-hero-title">
            <span className="block text-white">Start with</span>
            <span className="block auth-gradient-text">Identity.</span>
          </h1>
          <p className="auth-hero-copy">
            A structured path for serious aspirants. Clear progress, elite feedback.
          </p>

          <div className="insight-hub">
            <div className="glass-card glass-card--stats" style={{ top: '20px' }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Layout className="text-blue-400" size={20} />
                </div>
                <p className="font-bold">Structured Path</p>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Identity Setup</span>
                  <span className="text-blue-400">Step 1/3</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full">
                  <div className="h-full w-1/3 bg-blue-500 rounded-full" />
                </div>
              </div>
            </div>

            <div className="glass-card glass-card--insights" style={{ top: '160px', left: '80px' }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <UserCheck className="text-emerald-400" size={20} />
                </div>
                <p className="font-bold">Verified Status</p>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Connect your account to the official NIMCET Mock engine for real-time ranking and elite insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <p className="auth-brand-mark">NIMCET Mock</p>
            <h2>Create your account</h2>
            <p>Structured onboarding. Optimized for success.</p>
          </div>

          <button type="button" onClick={handleFacebookSignup} disabled={loading} className="facebook-button facebook-button--filled">
            <FacebookIcon className="h-5 w-5" />
            <span>Log in with Facebook</span>
          </button>

          <div className="auth-divider auth-divider--spaced">
            <span />
            <p>OR</p>
            <span />
          </div>

          <form onSubmit={handleSignup} className="auth-form">
            <div className="signup-step-indicator">
              {steps.map(({ id, label }) => (
                <div key={id} className={`signup-step-pill ${step === id ? 'is-current' : ''}`}>
                  <span>{id}</span>
                  <p>{label}</p>
                </div>
              ))}
            </div>

            {step === 1 ? (
              <>
                <label className="auth-field">
                  <span>Email or mobile number</span>
                  <input
                    type="text"
                    value={formData.identity}
                    onChange={(event) => updateField('identity', event.target.value)}
                    placeholder="Email or mobile number"
                    autoComplete="username"
                  />
                </label>
                <p className="auth-helper-text">
                  Use email for Firebase Auth today. Phone can be connected in the next integration pass.
                </p>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <label className="auth-field">
                  <span>Full name</span>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(event) => updateField('fullName', event.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                  />
                </label>

                <label className="auth-field">
                  <span>Username</span>
                  <div className="auth-password-wrap">
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(event) => updateField('username', event.target.value)}
                      placeholder="Choose a unique username"
                      autoComplete="off"
                    />
                    <div className="auth-status-icon" aria-live="polite">
                      {usernameStatus === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {usernameStatus === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : null}
                      {usernameStatus === 'taken' ? <XCircle className="h-4 w-4 text-red-400" /> : null}
                    </div>
                  </div>
                </label>

                <p className={`auth-helper-text ${usernameStatus === 'available' ? 'is-ready' : ''}`}>
                  {usernameStatus === 'available' && `@${normalizedUsername} is available.`}
                  {usernameStatus === 'taken' && 'This username is already taken.'}
                  {usernameStatus === 'checking' && 'Checking availability in Firestore...'}
                  {usernameStatus === 'error' && 'Could not validate username availability.'}
                  {(usernameStatus === 'idle' || !formData.username) && 'Use 3+ characters. Letters, numbers, dots, and underscores are allowed.'}
                </p>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <label className="auth-field">
                  <span>Create password</span>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                  />
                </label>
                <p className={`auth-helper-text ${formData.password.length >= 6 ? 'is-ready' : ''}`}>
                  {formData.password.length >= 6 ? 'Password length looks good.' : 'Your password must be at least 6 characters.'}
                </p>
              </>
            ) : null}

            {error ? <div className="auth-alert">{error}</div> : null}

            <div className="signup-actions">
              {step > 1 ? (
                <button type="button" onClick={handleBack} className="auth-secondary-button">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={step === 1 ? !canContinueIdentity : !canContinueProfile}
                  className="auth-primary-button auth-primary-button--inline"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={!canSubmit} className="auth-primary-button auth-primary-button--inline">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign up'}
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="auth-card auth-card--compact">
          <p>
            Have an account? <Link to="/login">Log in</Link>
          </p>
        </div>

        <footer className="auth-legal-footer">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/cookies">Cookies</Link>
        </footer>
      </section>
    </main>
  );
}
