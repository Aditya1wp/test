import React, { useState, useEffect } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import ExamInterface from './pages/ExamInterface';
import Analysis from './pages/Analysis';
import Login from './pages/Login';
import Signup from './pages/Signup';

const ProtectedRoute = ({ children, user }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicOnlyRoute = ({ children, user }) => {
  if (user) return <Navigate to="/" replace />;
  return children;
};

function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const toggleTheme = () => setIsDark(!isDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return (saved && saved !== 'undefined') ? JSON.parse(saved) : null;
    } catch (e) {
      localStorage.removeItem('user');
      return null;
    }
  });

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-panel text-main transition-colors duration-300">
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute user={user}><Login isDark={isDark} toggleTheme={toggleTheme} setUser={setUser} /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute user={user}><Signup isDark={isDark} toggleTheme={toggleTheme} setUser={setUser} /></PublicOnlyRoute>} />
          <Route path="/" element={<ProtectedRoute user={user}><Dashboard isDark={isDark} toggleTheme={toggleTheme} user={user} setUser={setUser} /></ProtectedRoute>} />
          <Route path="/test" element={<ProtectedRoute user={user}><ExamInterface isDark={isDark} toggleTheme={toggleTheme} user={user} /></ProtectedRoute>} />
          <Route path="/analysis/:testId" element={<ProtectedRoute user={user}><Analysis isDark={isDark} toggleTheme={toggleTheme} user={user} /></ProtectedRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
