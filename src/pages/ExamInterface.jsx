import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, ChevronLeft, Flag, CheckCircle, Sun, Moon } from 'lucide-react';
import { apiFetch } from '../lib/api.js';
import ProfileMenu from '../components/ProfileMenu';
import { MathJax } from "better-react-mathjax";

const SECTIONS_CONFIG = {
  nimcet: [
    { id: 'Mathematics', title: 'Mathematics', duration: 50 * 60 },
    { id: 'Logical Reasoning', title: 'Analytical Ability & Logical Reasoning', duration: 45 * 60 },
    { id: 'Computer Awareness', title: 'Computer Awareness', duration: 10 * 60 },
    { id: 'General English', title: 'General English', duration: 15 * 60 }
  ],
  jee: [
    { id: 'Physics', title: 'Physics', duration: 60 * 60 },
    { id: 'Chemistry', title: 'Chemistry', duration: 60 * 60 },
    { id: 'Mathematics', title: 'Mathematics', duration: 60 * 60 }
  ],
  neet: [
    { id: 'Biology', title: 'Biology', duration: 90 * 60 },
    { id: 'Physics', title: 'Physics', duration: 45 * 60 },
    { id: 'Chemistry', title: 'Chemistry', duration: 45 * 60 }
  ],
  upsc: [
    { id: 'General Studies', title: 'General Studies', duration: 120 * 60 },
    { id: 'CSAT', title: 'CSAT', duration: 120 * 60 }
  ],
  general: [
    { id: 'Aptitude', title: 'Quantitative Aptitude', duration: 60 * 60 },
    { id: 'Reasoning', title: 'Logical Reasoning', duration: 60 * 60 }
  ]
};

const EXAM_CONFIG = {
  nimcet: { name: 'NIMCET', color: 'blue', fullName: 'NIMCET MOCK' },
  jee: { name: 'JEE Mains', color: 'indigo', fullName: 'JEE MOCK' },
  neet: { name: 'NEET', color: 'rose', fullName: 'NEET MOCK' },
  upsc: { name: 'UPSC', color: 'amber', fullName: 'UPSC MOCK' },
  general: { name: 'General Competition', color: 'emerald', fullName: 'GEN COMP MOCK' },
};

const ExamInterface = ({ isDark, toggleTheme, user, setUser }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const testId = location.state?.testId;
  const examType = location.state?.examType || 'nimcet';
  
  const SECTIONS = SECTIONS_CONFIG[examType] || SECTIONS_CONFIG.nimcet;
  const config = EXAM_CONFIG[examType] || EXAM_CONFIG.nimcet;

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECTIONS[0].duration);
  const [answers, setAnswers] = useState({}); // { q_id: "A" }
  const [flags, setFlags] = useState({}); // { q_id: true }

  useEffect(() => {
    let effectiveTestId = testId;
    
    // Recovery logic: if testId is missing (e.g. page refresh), check for recently active session
    if (!effectiveTestId) {
       const keys = Object.keys(localStorage);
       const sessionKey = keys.find(k => k.startsWith('nimcet_session_'));
       if (sessionKey) {
         effectiveTestId = sessionKey.replace('nimcet_session_', '');
         console.log("Recovered session for test:", effectiveTestId);
       }
    }

    if (!effectiveTestId) {
       console.warn("No testId found in state or localStorage. Redirecting home.");
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
      navigate(`/analysis/${testId}`, { state: { examType } });
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
  const sectionQuestions = questions.filter(q => q.section === section.id);
  
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

  const autoWrapMath = (text) => {
    if (!text) return text;
    // Improved regex to find math expressions but NOT swallowing whole sentences
    // This looks for:
    // 1. Expressions with =, +, -, *, / that look like equations
    // 2. Power notation (x^2)
    // 3. Square roots (√)
    // 4. Trig/log functions with arguments
    return text.replace(/(\b[a-zA-Z0-9\.\^√\(\)\/]+(?:\s*[\+\-\*\/=]\s*[a-zA-Z0-9\.\^√\(\)\/]+)+\b|[\w\d]+\^[\w\d]+|√[\w\d]+|\b(?:sin|cos|tan|log|log\d+)\b(?:\s*\(.*?\))?)/g, (match) => {
      if (match.trim().length < 2) return match;
      // We use backticks for AsciiMath as it's more forgiving with spaces within the formula
      return ` \`${match.trim()}\` `;
    });
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < sectionQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const currentAnsLetter = answers[question?.id] || null;

  return (
    <div className="h-screen flex flex-col bg-panel transition-colors duration-300 overflow-hidden">
      <header className="bg-panel shadow-md border-b border-main px-4 md:px-6 lg:px-10 py-3 md:py-4 lg:py-6 flex flex-col lg:flex-row justify-between items-center z-50 gap-4">
        <div className="flex items-center justify-between w-full lg:w-auto">
          <div className="flex items-center space-x-4 md:space-x-6">
            <div className={`bg-${config.color}-600 text-white font-bold px-3 py-1 rounded shadow-sm text-xs md:text-sm lg:text-base uppercase`}>{config.fullName}</div>
            <div className="text-sm md:text-lg lg:text-2xl font-bold truncate max-w-[150px] md:max-w-none">
              <span className="opacity-60 font-medium hidden xs:inline">Section:</span> <span className={`text-${config.color}-600 dark:text-${config.color}-400`}>{section.title}</span>
            </div>
          </div>
          <div className="flex lg:hidden items-center space-x-2">
            <button 
              onClick={toggleTheme}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              {isDark ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-gray-600" />}
            </button>
            {user ? <ProfileMenu user={user} setUser={setUser} /> : null}
          </div>
        </div>
        
        <div className="flex items-center justify-between w-full lg:w-auto lg:space-x-12">
          <div className="hidden lg:flex items-center space-x-6">
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              {isDark ? <Sun className="w-6 h-6 text-yellow-500" /> : <Moon className="w-6 h-6 text-gray-600" />}
            </button>
            {user ? <ProfileMenu user={user} setUser={setUser} /> : null}
          </div>
          
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 px-4 md:px-8 rounded-xl flex-1 lg:flex-none justify-center h-12 md:h-16 lg:h-16">
            <div className="mr-3 md:mr-6 text-right">
              <div className="text-[8px] md:text-[10px] lg:text-xs uppercase tracking-tighter text-gray-500 dark:text-gray-400 font-black leading-none mb-1">Time Left</div>
              <div className={`text-xl md:text-2xl lg:text-3xl font-mono font-bold leading-none ${timeLeft < 300 ? 'text-red-500 animate-pulse' : `text-${config.color}-600 dark:text-${config.color}-400`}`}>
                {formatTime(timeLeft)}
              </div>
            </div>
            <Clock className={`w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 ${timeLeft < 300 ? 'text-red-500' : `text-${config.color}-600`}`} />
          </div>
          
          <button 
            onClick={submitTest} 
            className={`min-w-[140px] md:min-w-[200px] h-12 md:h-16 lg:h-16 bg-${config.color}-600 hover:bg-${config.color}-700 text-white px-6 md:px-12 rounded-xl text-sm md:text-lg lg:text-xl font-black shadow-lg transition transform hover:scale-105 active:scale-95 flex items-center justify-center whitespace-nowrap`}
          >
            Submit Test
          </button>
        </div>
      </header>

      {/* Main Board */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Question Area */}
        <div className="flex-1 flex flex-col p-3 md:p-6 overflow-y-auto">
          {question ? (
            <div className="bg-panel flex-1 rounded-2xl md:rounded-[2rem] shadow-2xl border border-main p-5 md:p-10 lg:p-16 flex flex-col max-w-6xl mx-auto w-full mb-4 md:mb-6">
              <div className="flex justify-between items-start mb-6 md:mb-10">
                <div className="flex items-center space-x-4 md:space-x-6">
                  <span className={`bg-${config.color}-100 dark:bg-${config.color}-900/50 text-${config.color}-700 dark:text-${config.color}-200 w-8 h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 flex items-center justify-center rounded-lg md:rounded-2xl font-black text-base md:text-xl lg:text-3xl shadow-inner`}>
                    {currentQuestionIndex + 1}
                  </span>
                  <h2 className="text-lg md:text-2xl lg:text-4xl font-black text-gray-900 dark:text-white">Question</h2>
                </div>
                <div className={`text-[10px] md:text-sm font-black px-3 md:px-6 py-1.5 md:py-3 bg-${config.color}-50 dark:bg-${config.color}-900/30 rounded-full text-${config.color}-600 dark:text-${config.color}-300 tracking-widest shadow-sm uppercase italic`}>
                  {section.id}
                </div>
              </div>
              
              <div className="text-base md:text-xl lg:text-3xl mb-8 md:mb-12 border-b border-main pb-8 md:pb-12 flex-1 whitespace-pre-wrap leading-relaxed">
                <MathJax>{autoWrapMath(question.content)}</MathJax>
              </div>
              
              <div className="space-y-4 md:space-y-6 flex-1">
                {question.options.map((opt, i) => {
                  const isChecked = currentAnsLetter === opt.split('.')[0];
                  return (
                    <label key={i} className={`flex items-center p-4 md:p-6 lg:p-8 border-2 rounded-xl lg:rounded-2xl cursor-pointer transition ${isChecked ? `bg-${config.color}-50 dark:bg-${config.color}-900/20 border-${config.color}-500 shadow-md` : `hover:bg-${config.color}-50 dark:hover:bg-${config.color}-900/10 border-main`}`}>
                      <input 
                        type="radio" 
                        name={`answer-${question.id}`} 
                        checked={isChecked}
                        onChange={() => handleOptionSelect(opt)}
                        className={`h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-${config.color}-600 border-gray-300 focus:ring-${config.color}-500`} 
                      />
                      <span className="ml-4 md:ml-6 text-base md:text-xl lg:text-2xl font-medium">
                        <MathJax inline>{autoWrapMath(opt)}</MathJax>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-panel rounded-xl shadow-sm">No questions available for this section.</div>
          )}
          
          {/* Action Bar */}
          {/* Action Bar - Symmetric Navigation */}
          <div className="mt-4 md:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 bg-panel p-4 md:p-8 rounded-2xl shadow-xl border border-main">
            <button 
              onClick={toggleFlag}
              className={`w-full flex items-center justify-center h-14 md:h-20 font-black px-6 border-2 rounded-xl transition ${flags[question?.id] ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-400 text-orange-700 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400 border-main hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              <Flag className="w-5 h-5 mr-3" /> {flags[question?.id] ? 'Unmark' : 'Mark'}
            </button>
            <button 
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="w-full flex items-center justify-center h-14 md:h-20 border-2 border-main rounded-xl font-black hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-base md:text-xl"
            >
              <ChevronLeft className="w-6 h-6 mr-1" /> Previous
            </button>
            <button 
              onClick={nextQuestion}
              disabled={currentQuestionIndex >= sectionQuestions.length - 1}
              className={`w-full flex items-center justify-center h-14 md:h-20 bg-${config.color}-600 hover:bg-${config.color}-700 text-white rounded-xl font-black shadow-lg transition disabled:opacity-50 text-base md:text-xl`}
            >
              Next <ChevronRight className="w-6 h-6 ml-1" />
            </button>
          </div>
        </div>

        {/* Sidebar Nav */}
        <div className="w-full lg:w-96 bg-panel border-t lg:border-t-0 lg:border-l border-main flex flex-col shadow-2xl z-40 max-h-[40vh] lg:max-h-none">
          <div className="p-4 md:p-8 border-b-2 border-main bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-[10px] md:text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-4 md:mb-6">Question Palette</h3>
            <div className="grid grid-cols-2 gap-3 md:gap-4 text-[8px] md:text-xs font-bold uppercase tracking-tight text-main">
              <div className="flex items-center"><div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-green-500 mr-2 shadow-sm"></div> Answered</div>
              <div className="flex items-center"><div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-orange-400 mr-2 shadow-sm"></div> Tagged</div>
              <div className="flex items-center"><div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-panel border-2 border-main mr-2"></div> Not Visited</div>
              <div className="flex items-center"><div className={`w-3 h-3 md:w-4 md:h-4 rounded-lg ring-2 ring-${config.color}-500 bg-panel mr-2`}></div> Current</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">
            <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-8 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
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
                    className={`aspect-square flex items-center justify-center rounded-xl text-sm md:text-lg lg:text-2xl font-black transition-all duration-200 ${badgeClass} ${isCurrent ? `ring-4 ring-${config.color}-500/50 border-${config.color}-500 scale-110 z-10` : `hover:border-${config.color}-400 active:scale-95`}`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="p-6 md:p-10 bg-panel border-t-2 border-main lg:block hidden">
              <div className="text-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.3em] mb-6">Exam Summary</div>
              <div className="space-y-4">
                <div className="flex justify-between text-base font-bold text-main">
                    <span>Questions:</span>
                    <span className="font-black">{sectionQuestions.length}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-main">
                    <span>Answered:</span>
                    <span className="text-green-600 dark:text-green-400 font-black">{Object.keys(answers).filter(id => sectionQuestions.some(sq => sq.id === parseInt(id))).length}</span>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamInterface;
