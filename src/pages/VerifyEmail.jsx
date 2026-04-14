import { useLocation, Link } from 'react-router-dom';
import { MailCheck, ArrowLeft } from 'lucide-react';
import './AuthPages.css';

export default function VerifyEmail() {
  const location = useLocation();
  const email = location.state?.email || 'your email address';

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
          
          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <Link to="/login" className="authx-button" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              Log in to your account
            </Link>
            
            <Link to="/signup" className="authx-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <ArrowLeft size={16} /> Return to sign up
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
