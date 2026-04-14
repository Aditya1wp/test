import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import { auth } from '../lib/firebase';
import './AuthPages.css';

const steps = [
  { id: 1, label: 'Identity', icon: Smartphone },
  { id: 2, label: 'Profile', icon: UserRound },
  { id: 3, label: 'Security', icon: ShieldCheck },
];

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
  const num = Math.floor(100000 + Math.random() * 899999);
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
    username: generateRandomUsername(),
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizedUsername = useMemo(() => normalizeUsername(formData.username), [formData.username]);
  const identityLooksLikeEmail = /\S+@\S+\.\S+/.test(formData.identity.trim());
  const identityLooksLikePhone = /^[+\d][\d\s-]{7,}$/.test(formData.identity.trim());
  const canContinueIdentity = identityLooksLikeEmail || identityLooksLikePhone;
  const canContinueProfile = formData.fullName.trim().length >= 2;
  const canSubmit = formData.password.trim().length >= 6 && !loading;

  const updateField = (field, value) => {
    setError('');
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1 && canContinueIdentity) setStep(2);
    if (step === 2 && canContinueProfile) setStep(3);
  };

  const handleBack = () => {
    setError('');
    setStep((current) => Math.max(1, current - 1));
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.identity.trim(), formData.password);
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      navigate('/verify-email', { state: { email: formData.identity.trim() } });
    } catch (signupError) {
      setError(formatSignupError(signupError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="authx-page">
      <section className="authx-visual">
        <div className="authx-visual-content">
          <div className="authx-badge">
            <AuraIcon className="w-4 h-4" />
            <span>ELITE ONBOARDING</span>
          </div>

          <div>
            <h1 className="authx-visual-title">
              Start with <span className="authx-gradient">Identity.</span>
            </h1>
            <p className="authx-visual-copy">
              A structured signup path for serious aspirants. Clear progress,
              elite feedback, and a premium first impression.
            </p>
          </div>

          <div className="authx-stack">
            <div className="authx-card authx-card--front">
              <span className="authx-label">STRUCTURED PATH</span>
              <div className="authx-insight-row">
                <div className="authx-icon-wrap">
                  <Layout size={20} />
                </div>
                <div>
                  <p className="authx-insight-title">Step {step} of 3</p>
                  <p className="authx-muted">Identity, profile, and security</p>
                </div>
              </div>
              <div className="authx-progress">
                <div className="authx-progress-bar">
                  <div className="authx-progress-fill" style={{ width: `${(step / 3) * 100}%` }} />
                </div>
                <p className="authx-progress-note">Built to get aspirants into the mock engine quickly.</p>
              </div>
            </div>

            <div className="authx-card authx-card--back">
              <span className="authx-label">VERIFIED STATUS</span>
              <div className="authx-insight-row">
                <div className="authx-icon-wrap">
                  <UserCheck size={20} />
                </div>
                <div>
                  <p className="authx-insight-title">Connected Setup</p>
                  <p className="authx-muted">Real-time ranking and insights await after signup.</p>
                </div>
              </div>
              <p className="authx-visual-copy" style={{ marginTop: '1rem', fontSize: '0.92rem', maxWidth: '100%' }}>
                Connect your account to the official NIMCET Mock engine for real-time ranking and performance tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="authx-panel">
        <div className="authx-form-wrap">
          <h2 className="authx-heading">Create your account</h2>
          <p className="authx-subheading">
            Structured onboarding. Optimized for success.
          </p>

          <form onSubmit={handleSignup} className="authx-form" style={{ marginTop: '1.25rem' }}>
            <div className="authx-step-row">
              {steps.map(({ id, label }) => (
                <div key={id} className={`authx-step ${step === id ? 'is-current' : ''}`}>
                  {id}. {label}
                </div>
              ))}
            </div>

            {step === 1 ? (
              <>
                <label className="authx-field">
                  <span>Email or mobile number</span>
                  <input
                    className="authx-input"
                    type="text"
                    value={formData.identity}
                    onChange={(event) => updateField('identity', event.target.value)}
                    placeholder="Email or mobile number"
                    autoComplete="username"
                  />
                </label>
                <p className="authx-helper">
                  Use email for Firebase Auth today. Phone can be connected in the next integration pass.
                </p>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <label className="authx-field">
                  <span>Full name</span>
                  <input
                    className="authx-input"
                    type="text"
                    value={formData.fullName}
                    onChange={(event) => updateField('fullName', event.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                  />
                </label>
                <p className="authx-helper">
                  Use at least 2 characters for your full name.
                </p>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <label className="authx-field">
                  <span>Create password</span>
                  <input
                    className="authx-input"
                    type="password"
                    value={formData.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                  />
                </label>
                <p className={`authx-helper ${formData.password.length >= 6 ? 'is-ready' : ''}`}>
                  {formData.password.length >= 6 ? 'Password length looks good.' : 'Your password must be at least 6 characters.'}
                </p>
              </>
            ) : null}

            {error ? <div className="authx-alert">{error}</div> : null}

            <div className="authx-split-actions">
              {step > 1 ? (
                <button type="button" onClick={handleBack} className="authx-button authx-button--secondary">
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
                  className="authx-button"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={!canSubmit} className="authx-button">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign up'}
                </button>
              )}
            </div>
          </form>

          <p className="authx-footer">
            Have an account? <Link to="/login" className="authx-link">Log in</Link>
          </p>

          <div className="authx-footer-links">
            <Link to="/terms" className="authx-link">Terms</Link>
            <Link to="/privacy" className="authx-link">Privacy Policy</Link>
            <Link to="/cookies" className="authx-link">Cookies</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
