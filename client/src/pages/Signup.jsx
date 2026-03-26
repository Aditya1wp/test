import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Phone, MapPin, GraduationCap, Calendar, Lock, ArrowRight } from 'lucide-react';
import { apiFetch, API_BASE_URL } from '../lib/api';

const Signup = ({ isDark, setUser }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    state: '',
    study_place: '',
    exam_year: '2024',
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
      const res = await apiFetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          name: formData.name.trim(),
          email: formData.email.trim(),
          mobile: formData.mobile.trim(),
          state: formData.state.trim(),
          study_place: formData.study_place.trim()
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
        setError(data?.detail || 'Signup failed. Please try again.');
      }
    } catch (err) {
      setError(`Unable to reach the server at ${API_BASE_URL}. Make sure the backend is running.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-panel p-4 transition-colors duration-300">
      {/* Background Blobs */}
      <div className="fixed top-0 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="fixed bottom-0 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>

      <div className="w-full max-w-2xl bg-white/10 dark:bg-gray-900/50 backdrop-blur-xl border border-white/20 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col md:flex-row">
        {/* Left Side: Branding */}
        <div className="md:w-5/12 bg-blue-600 p-10 text-white flex flex-col justify-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md mb-8">
            <span className="text-4xl font-black italic">N</span>
          </div>
          <h1 className="text-3xl font-black mb-4 tracking-tight leading-tight">Join the<br/>Future of<br/>NIMCET Mock</h1>
          <p className="opacity-80 text-sm font-medium">Create your account to start your personalized journey to success.</p>
        </div>

        {/* Right Side: Form */}
        <div className="md:w-7/12 p-8 md:p-12">
          <h2 className="text-2xl font-black mb-8 text-main">Create Account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-main rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  placeholder="Email ID"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-main rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="mobile"
                  placeholder="Mobile Number"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-main rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                  value={formData.mobile}
                  onChange={handleChange}
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="state"
                  placeholder="State"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-main rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                  value={formData.state}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="relative">
              <GraduationCap className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="study_place"
                placeholder="College / Institute Name"
                required
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-main rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                value={formData.study_place}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <select
                  name="exam_year"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-main rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm appearance-none"
                  onChange={handleChange}
                  value={formData.exam_year}
                >
                  <option value="2024">Exam Year: 2024</option>
                  <option value="2025">Exam Year: 2025</option>
                  <option value="2026">Exam Year: 2026</option>
                </select>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  placeholder="Create Password"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-main rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-600/30 transition transform active:scale-95 flex items-center justify-center space-x-2"
            >
              <span>{loading ? "Creating Account..." : "Sign Up Now"}</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium pt-4">
              Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Log in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
