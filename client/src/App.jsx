import React, { useState, useEffect } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import ExamInterface from './pages/ExamInterface';
import Analysis from './pages/Analysis';
import InstallPrompt from './components/InstallPrompt';
import { auth } from './lib/firebase';
import { signInAnonymously } from 'firebase/auth';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error", error, info);
    this.setState({ info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace' }}>
          <h2>Something went wrong in the UI.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.info && this.state.info.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}


function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const toggleTheme = () => setIsDark(!isDark);

  const [user, setUser] = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    // Authenticate anonymously so Firestore securely tracks this session without logging in
    signInAnonymously(auth)
      .then((cred) => {
        console.log("Signed in anonymously:", cred.user.uid);
        setUser({
          uid: cred.user.uid,
          name: 'Guest Aspirant',
          email: 'anonymous@nimcet.in'
        });
      })
      .catch((error) => {
        console.error("Anonymous auth failed (Firestore widgets may be disabled):", error);
        // Fallback to a local guest user for the FastAPI backend features
        setUser({
          uid: 'guest_local_id',
          name: 'Guest Aspirant',
          email: 'anonymous@nimcet.in'
        });
      });
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-panel text-main transition-colors duration-300">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard isDark={isDark} toggleTheme={toggleTheme} user={user} setUser={setUser} />} />
            <Route path="/test" element={<ExamInterface isDark={isDark} toggleTheme={toggleTheme} user={user} />} />
            <Route path="/analysis/:testId" element={<Analysis isDark={isDark} toggleTheme={toggleTheme} user={user} />} />
          </Routes>
        </ErrorBoundary>
        <InstallPrompt />
      </div>
    </BrowserRouter>
  );
}

export default App;
