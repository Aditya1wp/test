import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, ChevronLeft, Flag, CheckCircle, Sun, Moon } from 'lucide-react';
import { apiFetch } from '../lib/api';
import ProfileMenu from '../components/ProfileMenu';

const SECTIONS = [
  { id: 'Mathematics', title: 'Mathematics', duration: 70 * 60 },
  { id: 'Logical Reasoning', title: 'Analytical & Logical Reasoning', duration: 30 * 60 },
  { id: 'Computer', title: 'Computer Awareness & English', duration: 20 * 60 }
];

const ExamInterface = ({ isDark, toggleTheme, user, setUser }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const testId = location.state?.testId;

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECTIONS[0].duration);
  const [answers, setAnswers] = useState({}); // { q_id: "A" }
  const [flags, setFlags] = useState({}); // { q_id: true }

  useEffect(() => {
    if (!testId) {
      navigate('/');
      return;
    }
    const savedSession = localStorage.getItem(`nimcet_session_${testId}`);
    if (savedSession) {
      const session = JSON.parse(savedSession);
      setTimeLeft(session.timeLeft);
      setCurrentSectionIndex(session.currentSectionIndex);
      setCurrentQuestionIndex(session.currentQuestionIndex);
      setAnswers(session.answers || {});
      setFlags(session.flags || {});
      setLoading(false);
      // We still need to fetch questions if not in session, but let's assume we fetch them regardless to be safe
    }

    apiFetch(`/api/tests/${testId}`)
      .then(res => res.json())
      .then(data => {
        setQuestions(data.questions || []);
        if (!savedSession) setLoading(false);
      })
      .catch(err => {
        console.error("Fetch test error:", err);
        setLoading(false);
      });
  }, [testId, navigate]);

  const submitTest = async () => {
    try {
      const payload = {
        answers: Object.keys(answers).map(qid => ({
          question_id: parseInt(qid),
          selected_option: answers[qid],
          time_spent_seconds: 0 // Mock for now
        }))
      };
      const res = await apiFetch(`/api/tests/${testId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      localStorage.removeItem(`nimcet_session_${testId}`);
      navigate(`/analysis/${testId}`);
    } catch(err) {
      alert("Error submitting: " + err);
    }
  };

  useEffect(() => {
    if (loading) return;
    
    if (timeLeft <= 0) {
      // Auto move section or submit
      if (currentSectionIndex < SECTIONS.length - 1) {
        const nextIdx = currentSectionIndex + 1;
        setCurrentSectionIndex(nextIdx);
        setTimeLeft(SECTIONS[nextIdx].duration);
        setCurrentQuestionIndex(0);
      } else {
        submitTest();
      }
      return;
    }
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        // Save session state
        localStorage.setItem(`nimcet_session_${testId}`, JSON.stringify({
          timeLeft: next,
          currentSectionIndex,
          currentQuestionIndex,
          answers,
          flags
        }));
        return next;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, currentSectionIndex, currentQuestionIndex, answers, flags, loading, testId]);

  if (loading) return <div className="h-screen flex items-center justify-center text-xl font-bold bg-panel">Loading Exam Material...</div>;

  const section = SECTIONS[currentSectionIndex];
  // Filter questions for current section conceptually, or just group them by what we have.
  // Our generator created sections exactly matching id labels.
  const sectionQuestions = questions.filter(q => {
      if (section.id === 'Computer') return q.section === 'Computer' || q.section === 'English';
      return q.section === section.id;
  });
  
  const question = sectionQuestions[currentQuestionIndex];

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (optLine) => {
    const letter = optLine.split('.')[0]; // Assumes "A. Text" format
    setAnswers({ ...answers, [question.id]: letter });
  };

  const toggleFlag = () => {
    setFlags({ ...flags, [question.id]: !flags[question.id] });
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < sectionQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const currentAnsLetter = answers[question?.id] || null;

  return (
    <div className="h-screen flex flex-col bg-panel transition-colors duration-300 overflow-hidden">
      <header className="bg-panel shadow-md border-b border-main px-6 py-4 flex justify-between items-center z-50">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-600 text-white font-bold px-3 py-1 rounded shadow-sm text-sm">NIMCET MOCK</div>
          <div className="text-lg font-bold">
            <span className="opacity-60 font-medium">Section:</span> <span className="text-blue-600 dark:text-blue-400">{section.title}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-8">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
          {user ? <ProfileMenu user={user} setUser={setUser} /> : null}
          
          <div className="text-right flex items-center bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
            <div className="mr-3 text-right">
              <div className="text-[10px] uppercase tracking-tighter text-gray-500 dark:text-gray-400 font-black leading-none mb-1">Time Left</div>
              <div className={`text-2xl font-mono font-bold leading-none ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-blue-600 dark:text-blue-400'}`}>
                {formatTime(timeLeft)}
              </div>
            </div>
            <Clock className={`w-6 h-6 ${timeLeft < 300 ? 'text-red-500' : 'text-blue-600'}`} />
          </div>
          
          <button onClick={submitTest} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg transition transform hover:scale-105 active:scale-95">
            Submit Test
          </button>
        </div>
      </header>

      {/* Main Board */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question Area */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {question ? (
            <div className="bg-panel flex-1 rounded-2xl shadow-2xl border border-main p-10 flex flex-col max-w-4xl mx-auto w-full mb-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-3">
                  <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 w-10 h-10 flex items-center justify-center rounded-xl font-black text-lg shadow-inner">
                    {currentQuestionIndex + 1}
                  </span>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">Question</h2>
                </div>
                <div className="text-xs font-black px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-300 tracking-widest shadow-sm">
                  {section.id === 'Mathematics' ? '12 MARKS' : section.id === 'English' ? '4 MARKS' : '6 MARKS'}
                </div>
              </div>
              
              <div className="text-lg mb-8 border-b border-main pb-8 flex-1 whitespace-pre-wrap">
                {question.content}
              </div>
              
              <div className="space-y-4 flex-1">
                {question.options.map((opt, i) => {
                  const isChecked = currentAnsLetter === opt.split('.')[0];
                  return (
                    <label key={i} className={`flex items-center p-4 border rounded-lg cursor-pointer transition ${isChecked ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300' : 'hover:bg-blue-50 dark:hover:bg-blue-900/10 border-main'}`}>
                      <input 
                        type="radio" 
                        name={`answer-${question.id}`} 
                        checked={isChecked}
                        onChange={() => handleOptionSelect(opt)}
                        className="h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500" 
                      />
                      <span className="ml-3 text-lg">{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-panel rounded-xl shadow-sm">No questions available for this section.</div>
          )}
          
          {/* Action Bar */}
          <div className="mt-6 flex justify-between items-center bg-panel p-4 rounded-xl shadow-sm border border-main">
            <button 
              onClick={toggleFlag}
              className={`flex items-center font-medium px-4 py-2 border rounded transition ${flags[question?.id] ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 text-orange-700 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400 border-main hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              <Flag className="w-4 h-4 mr-2" /> {flags[question?.id] ? 'Unmark for Review' : 'Mark for Review'}
            </button>
            <div className="flex space-x-4">
              <button 
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="flex items-center px-5 py-2 border border-main rounded font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5 mr-1" /> Previous
              </button>
              <button 
                onClick={nextQuestion}
                disabled={currentQuestionIndex >= sectionQuestions.length - 1}
                className="flex items-center px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-sm transition disabled:opacity-50"
              >
                Save & Next <ChevronRight className="w-5 h-5 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Nav */}
        <div className="w-80 bg-panel border-l border-main flex flex-col shadow-2xl z-40">
          <div className="p-6 border-b border-main bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Question Palette</h3>
            <div className="grid grid-cols-2 gap-3 text-[10px] font-bold uppercase tracking-tight text-main">
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-500 mr-2 shadow-sm"></div> Answered</div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-orange-400 mr-2 shadow-sm"></div> Tagged</div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-panel border-2 border-main mr-2"></div> Not Visited</div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-lg ring-2 ring-blue-500 bg-panel mr-2"></div> Current</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <div className="grid grid-cols-4 gap-3">
              {sectionQuestions.map((q, i) => {
                let badgeClass = "bg-panel text-main border-2 border-main";
                if (answers[q.id]) badgeClass = "bg-green-500 text-white border-green-600 shadow-md";
                if (flags[q.id]) badgeClass = "bg-orange-400 text-white border-orange-500 shadow-md";
                if (answers[q.id] && flags[q.id]) badgeClass = "bg-green-500 text-white border-orange-500 ring-4 ring-orange-400/50";
                
                const isCurrent = currentQuestionIndex === i;
                
                return (
                  <button 
                    key={i} 
                    onClick={() => setCurrentQuestionIndex(i)}
                    className={`w-12 h-12 rounded-xl text-sm font-black transition-all duration-200 ${badgeClass} ${isCurrent ? 'ring-4 ring-blue-500/50 border-blue-500 scale-110 z-10' : 'hover:border-blue-400'}`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="p-6 bg-panel border-t border-main">
              <div className="text-center text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-4">Exam Summary</div>
              <div className="flex justify-between text-xs font-bold mb-2 text-main">
                  <span>Answered:</span>
                  <span className="text-green-600 dark:text-green-400 font-black">{Object.keys(answers).filter(id => sectionQuestions.some(sq => sq.id === parseInt(id))).length} / {sectionQuestions.length}</span>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamInterface;
