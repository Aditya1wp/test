import { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { MailCheck, ArrowLeft, RotateCw, Loader2, LogOut } from 'lucide-react';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import './AuthPages.css';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const email = location.state?.email || 'your email address';

  const handleResend = async () => {
    if (!auth.currentUser) {
      setError('Your session expired. Please log in again to resend the email.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await sendEmailVerification(auth.currentUser);
      setSuccess('A new verification link has been sent to your email.');
    } catch (err) {
      console.error(err);
      setError('Failed to send email. Please try again in a few minutes.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <main className="authx-page" style={{ justifyContent: 'center' }}>
      <section className="authx-panel" style={{ maxWidth: '480px', flex: 'none', borderLeft: 'none', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        <div className="authx-form-wrap" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1.5rem', backgroundColor: '#FEF3C7', borderRadius: '50%', color: '#D97706' }}>
              <MailCheck size={48} />
            </div>
          </div>
          <h2 className="authx-heading">Verify your email</h2>
          
          <p className="authx-subheading" style={{ marginTop: '1rem', fontSize: '1rem', lineHeight: '1.6' }}>
            We have sent you a verification email to <strong style={{color: '#D97706'}}>{email}</strong>. Please verify it and log in.
          </p>

          {error && <div className="authx-alert" style={{ marginTop: '1.5rem' }}>{error}</div>}
          {success && <div className="authx-alert" style={{ marginTop: '1.5rem', backgroundColor: '#ECFDF5', color: '#059669', borderColor: '#10B981' }}>{success}</div>}
          
          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', width: '100%' }}>
            <Link to="/login" className="authx-button" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              I have verified already
            </Link>

            <button 
              onClick={handleResend} 
              disabled={loading}
              className="authx-button authx-button--secondary" 
              style={{ display: 'flex', justifyContent: 'center', width: '100%', gap: '0.5rem' }}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <RotateCw size={18} />}
              Resend verification email
            </button>
            
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
              <Link to="/signup" className="authx-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Edit Email
              </Link>
              <button onClick={handleLogout} className="authx-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'none' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
