import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import AuthVisualPanel from '../components/AuthVisualPanel';
import './LoginPage.css';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canSubmit = email.trim().length > 0 && password.trim().length > 0 && !loading;

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/home');
    } catch (authError) {
      setError(resolveAuthError(authError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page-container">
      <div className="login-left">
        <AuthVisualPanel />
      </div>

      <div className="login-right">
        <div className="login-form-container">
          <h2>Welcome Back</h2>
          <p className="login-subtitle">
            Enter your credentials to access your insights.
          </p>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="aspirant@example.com"
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="........"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#forgot" className="forgot-password">
                Forgot Password?
              </a>
            </div>

            {error ? <div className="login-feedback">{error}</div> : null}

            <button type="submit" className="login-button" disabled={!canSubmit}>
              {loading ? 'Signing In...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <p className="signup-prompt">
            Don&apos;t have an account? <Link to="/signup">Create an account</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
