import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  PlayCircle, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  Eye, 
  Sun, 
  Moon, 
  User as UserIcon,
  MessageSquare,
  Send,
  Crown,
  CreditCard,
  Calendar,
  Zap,
  Loader2
} from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { apiFetch } from '../lib/api.js';
import MyNotes from '../components/MyNotes';
import TeamMembers from '../components/TeamMembers';
import MyFiles from '../components/MyFiles';
import ProfileMenu from '../components/ProfileMenu';
import InstallPrompt from '../components/InstallPrompt';

const EXAM_CONFIG = {
  nimcet: { name: 'NIMCET', color: 'blue', icon: 'N', fullName: 'NIMCET MOCK', gradient: 'from-blue-600 to-blue-400' },
  jee: { name: 'JEE Mains', color: 'indigo', icon: 'J', fullName: 'JEE MOCK', gradient: 'from-indigo-600 to-indigo-400' },
  neet: { name: 'NEET', color: 'rose', icon: 'H', fullName: 'NEET MOCK', gradient: 'from-rose-600 to-rose-400' },
  upsc: { name: 'UPSC', color: 'amber', icon: 'U', fullName: 'UPSC MOCK', gradient: 'from-amber-600 to-amber-400' },
  general: { name: 'General Competition', color: 'emerald', icon: 'G', fullName: 'GEN COMP MOCK', gradient: 'from-emerald-600 to-emerald-400' },
};

const Dashboard = ({ isDark, toggleTheme, user, setUser }) => {
  const navigate = useNavigate();
  const { examType } = useParams();
  const config = EXAM_CONFIG[examType] || EXAM_CONFIG.nimcet;
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [feedback, setFeedback] = useState({ subject: '', comment: '' });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [stats, setStats] = useState({
    completed: 0,
    avgScore: 0,
    totalTime: "0h 0m"
  });

  // Payment State
  const [paymentStep, setPaymentStep] = useState('pricing'); // 'pricing' or 'gateway'
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [utr, setUtr] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    
    // Real-time user profile sync
    const userRef = doc(db, 'users', user.uid);
    const unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
      }
    });

    fetchHistory();
    return () => unsubscribeProfile();
  }, [user?.uid]);

  // Timer Logic
  useEffect(() => {
    if (paymentStep !== 'gateway' || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPaymentStep('pricing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentStep, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  const fetchHistory = async () => {
    try {
      const res = await apiFetch('/api/history');
      const data = await res.json();
      setHistory(data);
      
      if (data.length > 0) {
        const completed = data.filter(t => t.completed_at).length;
        const totalScore = data.reduce((acc, t) => acc + (t.total_score || 0), 0);
        const avgScore = (totalScore / data.length).toFixed(1);
        
        setStats({
          completed,
          avgScore,
          totalTime: `${Math.floor(data.length * 1.5)}h 0m` // Mocked aggregate time for now
        });
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const startTest = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/tests/generate', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_type: examType || 'nimcet' })
      });
      
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        const text = await res.text();
        console.error("API Error Status:", res.status, "Body:", text);
        try {
          const errData = JSON.parse(text);
          alert(`Test Generation Failed (${res.status}): ${errData.error || 'Unknown error'}`);
        } catch(e) {
          alert(`Server Error (${res.status}): ${text.substring(0, 100)}...`);
        }
        return;
      }

      if (!contentType || !contentType.includes("application/json")) {
         console.error("Non-JSON response received:", contentType);
         alert("Invalid server response. Please try again later.");
         return;
      }
      
      const data = await res.json();
      if (data.test_id) {
        navigate('/test', { state: { testId: data.test_id, examType: examType || 'nimcet' } });
      } else if (data.error) {
        alert("Generation Error: " + data.error);
      } else {
        alert("Failed to create test: ID missing in response.");
      }
    } catch (err) {
      console.error("Fetch error during test generation:", err);
      alert("Connectivity Error: Could not reach the engine. Details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Premium Logic
  const isPremium = profile?.isPremium && profile?.premiumExpiryDate && new Date(profile.premiumExpiryDate) > new Date();
  const expiryDate = profile?.premiumExpiryDate ? new Date(profile.premiumExpiryDate).toLocaleDateString() : null;

  const handleStartPayment = () => {
    setPaymentStep('gateway');
    setTimeLeft(900); // 15 minutes
  };

  const handleVerifyPayment = async () => {
    if (!user?.uid) return;
    if (!utr.trim()) {
      alert("Please enter a valid Transaction ID / UTR for verification.");
      return;
    }
    setProcessingPayment(true);
    
    try {
      const now = new Date();
      let newExpiryDate = new Date(now.getTime());

      if (isPremium && profile.premiumExpiryDate) {
        const currentExpiry = new Date(profile.premiumExpiryDate);
        newExpiryDate = new Date(currentExpiry.getTime());
      }
      
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);

      await updateDoc(doc(db, 'users', user.uid), {
        isPremium: true,
        premiumStartDate: profile?.premiumStartDate || now.toISOString(),
        premiumExpiryDate: newExpiryDate.toISOString(),
        plan: 'pro',
        lastUtr: utr.trim() // Store for manual audit
      });

      alert("Verification request submitted! Premium activated. (Admin will verify your Transaction ID).");
      setIsPremiumModalOpen(false);
      setPaymentStep('pricing');
      setUtr('');
    } catch (err) {
      console.error("Premium Update Error:", err);
      alert("Failed to process verification. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-panel transition-colors duration-300">
      <header className="max-w-7xl mx-auto mt-4 sm:mt-6 px-6 py-4 border border-main rounded-2xl sm:rounded-3xl flex justify-between items-center sticky top-4 bg-panel/80 backdrop-blur-xl z-[60] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none dark:bg-panel dark:mt-0 dark:rounded-none dark:max-w-none dark:px-4">
        <div className="flex items-center space-x-2">
          <div className={`w-10 h-10 bg-${config.color}-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg`}>{config.icon}</div>
          <div className="text-xl font-black tracking-tight">{config.name} <span className={`text-${config.color}-600`}>MOCK</span></div>
        </div>
        <div className="flex items-center space-x-3">
          {/* Premium Button */}
          {user && (
            <button
              onClick={() => setIsPremiumModalOpen(true)}
              className={`hidden sm:flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all duration-300 font-bold text-xs ${
                isPremium 
                ? 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/10 dark:text-blue-400 hover:bg-blue-100' 
                : 'bg-gradient-to-r from-[#2563EB] to-[#6366F1] border-transparent text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95'
              }`}
            >
              <Crown className={`w-4 h-4 ${isPremium ? `text-${config.color}-500` : 'text-white'}`} />
              <span>{isPremium ? `Premium Active (until ${expiryDate})` : 'Go Premium'}</span>
            </button>
          )}

          {user && (
            <div className="hidden md:block text-right mr-2">
              <div className="text-xs font-bold opacity-60 uppercase tracking-widest">Aspirant</div>
              <div className="text-sm font-black">{profile?.display_name || user.displayName || user.email}</div>
            </div>
          )}
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-main"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="w-6 h-6 text-yellow-500" /> : <Moon className="w-6 h-6 text-gray-600" />}
          </button>
          {user ? (
            <ProfileMenu 
              user={user} 
              setUser={setUser} 
              isPremium={isPremium} 
              expiryDate={expiryDate}
              onPremiumClick={() => setIsPremiumModalOpen(true)}
            />
          ) : null}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Dashboard</h1>
        <button 
          onClick={startTest}
          disabled={loading}
          className={`${loading ? `bg-${config.color}-400 cursor-not-allowed` : `bg-${config.color}-600 hover:bg-${config.color}-700`} text-white font-black py-3 px-8 rounded-full flex items-center shadow-xl shadow-${config.color}-500/20 transition-all hover:scale-105 active:scale-95 duration-200 text-sm uppercase tracking-wider`}
        >
          <PlayCircle className="mr-2 h-5 w-5" />
          {loading ? "Generating..." : "Start New Test"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-8 lg:mb-12">
        <div className="bg-panel border border-main rounded-3xl dark:rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-sm p-8 dark:p-6 lg:col-span-1 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center">
            <div className={`p-3 rounded-full bg-${config.color}-100 text-${config.color}-600 dark:bg-${config.color}-900/30 dark:text-${config.color}-400`}>
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-400 tracking-wide uppercase">Tests Completed</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-panel border border-main rounded-3xl dark:rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-sm p-8 dark:p-6 lg:col-span-1 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-400 tracking-wide uppercase">Average Score</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.avgScore}</p>
              </div>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800/50 rounded-lg backdrop-blur-sm border-2 border-gray-100 dark:border-gray-700">
              <BarChart3 className="h-6 w-6 text-gray-300 dark:opacity-40" />
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br ${config.gradient} text-white rounded-3xl dark:rounded-xl shadow-[0_8px_30px_rgb(59,130,246,0.15)] p-8 dark:p-6 lg:col-span-2 flex flex-col justify-center hover:-translate-y-1 transition-transform duration-300`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/80 text-sm font-medium mb-1 drop-shadow-sm">Time Spent</p>
              <p className="text-2xl font-bold">{stats.totalTime}</p>
            </div>
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8 mb-8">
        {user && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <MyFiles uid={user.uid} isPremium={isPremium} />
            <TeamMembers uid={user.uid} userName={profile?.display_name} />
          </div>
        )}

        {!user && (
          <div className="h-40 flex items-center justify-center border border-dashed border-main rounded-xl">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-${config.color}-600`}></div>
          </div>
        )}

        {/* Row 2: Notes Layer */}
        <div>
          {user && <MyNotes uid={user.uid} />}
        </div>

        {/* Row 3: History & Feedback */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 bg-panel rounded-3xl dark:rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-sm border border-main overflow-hidden h-fit">
        <div className="px-8 py-6 border-b border-main flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Recent Test History</h3>
        </div>
        <div className="overflow-x-auto">
          {history.length > 0 ? (
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-main">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Test ID</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Score</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-main">
                {history.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="px-6 py-4 font-medium">#{test.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(test.started_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-main">
                      {(test.total_score || 0).toFixed(1)}
                    </td>
                    <td className="px-6 py-4">
                      {test.completed_at ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                          Completed
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                          In Progress
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => navigate(`/analysis/${test.id}`, { state: { examType } })}
                        className={`text-${config.color}-600 hover:text-${config.color}-700 dark:text-${config.color}-400 dark:hover:text-${config.color}-300 font-medium flex items-center justify-end ml-auto`}
                      >
                        <Eye className="w-4 h-4 mr-1" /> View Analysis
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              No tests taken yet. Click 'Start New Test' to begin your {config.name} preparation.
            </div>
          )}
        </div>
          </div>
        <div className="space-y-8">
          <div className="bg-panel rounded-3xl dark:rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-sm border border-main p-8 dark:p-6 text-center">
            <div className={`w-16 h-16 bg-${config.color}-50 dark:bg-${config.color}-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-${config.color}-500`}>
              <PlayCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-2">Ready for a challenge?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Generate a new mock test based on the latest {config.name} syllabus and pattern.
            </p>
            <button 
              onClick={startTest}
              disabled={loading}
              className={`w-full bg-${config.color}-600 hover:bg-${config.color}-700 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-${config.color}-500/30 flex items-center justify-center disabled:opacity-50`}
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              {loading ? "Generating..." : "Start New Test"}
            </button>
          </div>

          <div className="bg-panel rounded-3xl dark:rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-sm border border-main overflow-hidden">
            <div className="p-8 dark:p-6 border-b border-main bg-gray-50/30 dark:from-gray-800 dark:to-gray-800">
              <h3 className="text-xl font-black flex items-center text-gray-900 dark:text-blue-300 uppercase tracking-tight">
                <MessageSquare className={`w-6 h-6 mr-3 text-${config.color}-600`} />
                Feedback
              </h3>
            </div>
            
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmittingFeedback(true);
                try {
                  const res = await apiFetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...feedback, email: user?.email })
                  });
                  if (res.ok) {
                    alert('Feedback submitted successfully! Thank you.');
                    setFeedback({ subject: '', comment: '' });
                  } else {
                    alert('Failed to submit feedback.');
                  }
                } catch (err) {
                  console.error(err);
                  alert('Error submitting feedback.');
                }
                setSubmittingFeedback(false);
              }}
              className="p-8 dark:p-6 space-y-6"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input 
                  type="text" 
                  required
                  className={`w-full px-4 py-2 border border-main rounded-lg bg-panel focus:ring-2 focus:ring-${config.color}-500 outline-none transition text-sm`}
                  value={feedback.subject}
                  onChange={(e) => setFeedback({...feedback, subject: e.target.value})}
                  placeholder="Bug, Suggestion, Question..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea 
                  required
                  rows="3"
                  className={`w-full px-4 py-2 border border-main rounded-lg bg-panel focus:ring-2 focus:ring-${config.color}-500 outline-none transition text-sm resize-none`}
                  value={feedback.comment}
                  onChange={(e) => setFeedback({...feedback, comment: e.target.value})}
                  placeholder="How can we improve?"
                ></textarea>
              </div>
              <button 
                type="submit"
                disabled={submittingFeedback}
                className="w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 font-bold py-3 rounded-xl transition border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm disabled:opacity-50"
              >
                {submittingFeedback ? 'Submitting...' : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Send Feedback
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      </div>
      
      {/* Premium Modal */}
      {isPremiumModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !processingPayment && setIsPremiumModalOpen(false)}></div>
          <div className="bg-panel w-full max-w-md rounded-3xl shadow-2xl relative border border-main overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-br from-[#3B82F6] to-[#6366F1] dark:from-violet-600 dark:to-indigo-700 p-8 text-white text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <Crown className="w-16 h-16 mx-auto mb-4 drop-shadow-lg" />
              <h2 className="text-3xl font-black mb-1">Upgrade to Premium</h2>
              <p className="opacity-80 text-sm font-medium">{config.fullName} PRO ACCESS</p>
            </div>

            <div className="p-8 space-y-6">
              {isPremium ? (
                <div className={`bg-${config.color}-50 dark:bg-panel p-4 rounded-2xl border border-${config.color}-100 dark:border-main`}>
                  <div className={`flex items-start space-x-3 text-${config.color}-700 dark:text-white`}>
                    <Calendar className={`w-5 h-5 mt-0.5 shrink-0 text-${config.color}-600`} />
                    <div>
                      <p className="text-sm font-bold">Renewal Active</p>
                      <p className="text-xs opacity-80 text-gray-700 dark:text-gray-300">Your plan expires on {expiryDate}. You can extend it by 1 more year (365 days) today.</p>
                    </div>
                  </div>
                </div>
              ) : paymentStep === 'pricing' ? (
                <ul className="space-y-3">
                  <li className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-300">
                    <CheckCircle className="w-4 h-4 mr-3 text-emerald-500" /> Unlimited File Storage
                  </li>
                  <li className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-300">
                    <CheckCircle className="w-4 h-4 mr-3 text-emerald-500" /> Create Unlimited Folders
                  </li>
                  <li className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-300">
                    <CheckCircle className="w-4 h-4 mr-3 text-emerald-500" /> Advanced Mock Analysis
                  </li>
                  <li className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-300">
                    <CheckCircle className="w-4 h-4 mr-3 text-emerald-500" /> 1 Year Full Access
                  </li>
                </ul>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 p-3 rounded-xl border border-main">
                    <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-widest">
                      <Clock className="w-4 h-4 mr-2" /> Expires in
                    </div>
                    <div className={`text-lg font-black text-${config.color}-600 dark:text-${config.color}-400 tabular-nums`}>
                      {formatTime(timeLeft)}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-100 dark:border-gray-800">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=${config.color === 'blue' ? '2563eb' : config.color === 'indigo' ? '4f46e5' : config.color === 'rose' ? 'e11d48' : config.color === 'amber' ? 'd97706' : '059669'}&data=${encodeURIComponent(`upi://pay?pa=adityagaurav1122@okhdfcbank&pn=Aditya&am=50&cu=INR&tn=${config.name}_PRO`)}`}
                      alt="UPI QR Code"
                      className="w-40 h-40 mb-3"
                    />
                    <p className="text-[10px] font-black uppercase tracking-tighter text-gray-400">Scan with any UPI App</p>
                  </div>

                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-500 mb-1">UPI ID: adityagaurav1122@okhdfcbank</p>
                      <p className="text-xl font-black text-main">Amount: ₹50</p>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-1">Submit Transaction ID / UTR</label>
                      <input 
                        type="text"
                        placeholder="12-digit Transaction ID"
                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-${config.color}-500 rounded-xl outline-none transition text-sm font-bold`}
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {paymentStep === 'pricing' ? (
                  <button
                    disabled={processingPayment}
                    type="button"
                    onClick={handleStartPayment}
                    className={`w-full bg-${config.color}-600 hover:bg-${config.color}-700 disabled:bg-${config.color}-400 text-white font-black py-4 rounded-2xl shadow-xl shadow-${config.color}-500/20 transition-all active:scale-[0.98] flex items-center justify-center text-lg uppercase tracking-wider`}
                  >
                    Pay ₹50 & Upgrade
                  </button>
                ) : (
                  <button
                    disabled={processingPayment}
                    type="button"
                    onClick={handleVerifyPayment}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center text-lg uppercase tracking-wider"
                  >
                    {processingPayment ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm & Verify'}
                  </button>
                )}
                
                <button
                  disabled={processingPayment}
                  type="button"
                  onClick={() => {
                    setIsPremiumModalOpen(false);
                    setPaymentStep('pricing');
                    setUtr('');
                  }}
                  className="w-full text-center text-sm font-bold text-gray-400 hover:text-gray-600 transition"
                >
                  {paymentStep === 'gateway' ? 'Cancel Payment' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <InstallPrompt />
      </div>
    </div>
  );
};

export default Dashboard;
