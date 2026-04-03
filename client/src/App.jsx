import React, { useState, useEffect } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import Dashboard from "./pages/Dashboard";
import ExamInterface from "./pages/ExamInterface";
import Analysis from "./pages/Analysis";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProfileSetup from "./pages/ProfileSetup";
import InstallPrompt from "./components/InstallPrompt";
import { auth } from "./lib/firebase";

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
        <div style={{ padding: "20px", color: "red", fontFamily: "monospace" }}>
          <h2>Something went wrong in the UI.</h2>
          <details style={{ whiteSpace: "pre-wrap" }}>
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
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme !== null ? savedTheme === "dark" : false; // Default to light mode
  });
  const toggleTheme = () => setIsDark(!isDark);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--border-color)] border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--app-bg)] text-main transition-colors duration-300 font-sans">
        <ErrorBoundary>
          <Routes>
            {/* Auth Routes */}
            <Route
              path="/login"
              element={user ? <Navigate to="/home" replace /> : <Login />}
            />
            <Route
              path="/signup"
              element={user ? <Navigate to="/home" replace /> : <Signup />}
            />
            <Route
              path="/profile-setup"
              element={user ? <ProfileSetup /> : <Navigate to="/login" />}
            />

            {/* Protected App Routes */}
            <Route
              path="/home"
              element={
                user ? (
                  <Dashboard
                    isDark={isDark}
                    toggleTheme={toggleTheme}
                    user={user}
                    setUser={setUser}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/test"
              element={
                user ? (
                  <ExamInterface
                    isDark={isDark}
                    toggleTheme={toggleTheme}
                    user={user}
                    setUser={setUser}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/analysis/:testId"
              element={
                user ? (
                  <Analysis
                    isDark={isDark}
                    toggleTheme={toggleTheme}
                    user={user}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            {/* Redirect root to home or login */}
            <Route
              path="/"
              element={<Navigate to={user ? "/home" : "/login"} replace />}
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
        <InstallPrompt />
      </div>
    </BrowserRouter>
  );
}

export default App;
