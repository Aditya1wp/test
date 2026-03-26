import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Globe } from 'lucide-react';
import { apiFetch, API_BASE_URL } from '../lib/api';

const Login = ({ isDark, setUser }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email_or_mobile: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_or_mobile: formData.email_or_mobile.trim(),
          password: formData.password
        })
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await res.json()
        : null;

      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        navigate('/');
      } else {
        setError(data?.detail || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(`Unable to reach the server at ${API_BASE_URL}. Make sure the backend is running.`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    alert("Google Login Integration requires a Client ID. This is a UI placeholder for now.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-panel p-4 transition-colors duration-300">
      {/* Background Blobs */}
      <div className="fixed top-0 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/10 dark:bg-gray-900/50 backdrop-blur-xl border border-white/20 dark:border-gray-800 rounded-3xl shadow-2xl p-8 md:p-12 z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black italic mx-auto mb-6 shadow-lg shadow-blue-600/30">N</div>
          <h2 className="text-3xl font-black text-main tracking-tight">Welcome Back</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 font-medium">Log in to continue your preparation.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <Mail className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
            <input
              type="text"
              name="email_or_mobile"
              placeholder="Email or Mobile"
              required
              className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-800/50 border border-main rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm font-medium"
              value={formData.email_or_mobile}
              onChange={handleChange}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-800/50 border border-main rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm font-medium"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 transition transform active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>{loading ? "Logging in..." : "Log In"}</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-main"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-panel px-4 text-gray-500 font-bold tracking-widest">Or continue with</span></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-4 rounded-2xl border border-main hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center space-x-3 shadow-sm"
          >
            <Globe className="w-5 h-5 text-red-500" />
            <span>Google Account</span>
          </button>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium pt-6">
            Don't have an account? <Link to="/signup" className="text-blue-600 font-bold hover:underline">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
