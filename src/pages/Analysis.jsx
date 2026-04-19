import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Info, Clock, BarChart, Sun, Moon } from 'lucide-react';
import { apiFetch } from '../lib/api.js';

const EXAM_CONFIG = {
  nimcet: { name: 'NIMCET', color: 'blue', icon: 'N', fullName: 'NIMCET MOCK' },
  jee: { name: 'JEE Mains', color: 'indigo', icon: 'J', fullName: 'JEE MOCK' },
  neet: { name: 'NEET', color: 'rose', icon: 'H', fullName: 'NEET MOCK' },
  upsc: { name: 'UPSC', color: 'amber', icon: 'U', fullName: 'UPSC MOCK' },
  general: { name: 'General Competition', color: 'emerald', icon: 'G', fullName: 'GEN COMP MOCK' },
};

const Analysis = ({ isDark, toggleTheme, user }) => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const examType = location.state?.examType || 'nimcet';
  const config = EXAM_CONFIG[examType] || EXAM_CONFIG.nimcet;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!testId) {
      navigate('/');
      return;
    }
    const fetchAnalysis = async () => {
      try {
        const res = await apiFetch(`/api/tests/${testId}/analysis`);
        if (!res.ok) throw new Error("Failed to fetch analysis");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        alert("Error loading analysis data");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [testId]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-panel">
      <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-${config.color}-600`}></div>
    </div>
  );

  if (!data) return <div className="p-8 text-center bg-panel">No analysis data found.</div>;

  return (
    <div className="min-h-screen bg-panel transition-colors duration-300">
      <header className="border-b border-main p-4 flex justify-between items-center sticky top-0 bg-panel z-50 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-10 h-10 bg-${config.color}-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg`}>{config.icon || config.name[0]}</div>
          <div className="text-xl font-black tracking-tight">{config.name} <span className={`text-${config.color}-600`}>MOCK</span></div>
        </div>
        <button 
          onClick={toggleTheme}
          className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-main"
        >
          {isDark ? <Sun className="w-6 h-6 text-yellow-500" /> : <Moon className="w-6 h-6 text-gray-600" />}
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
      <button 
        onClick={() => navigate(`/dashboard/${examType}`)}
        className={`flex items-center text-${config.color}-600 hover:text-${config.color}-700 font-medium mb-6 transition`}
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
      </button>

      <div className="bg-panel rounded-2xl shadow-lg border border-main overflow-hidden mb-8">
        <div className={`bg-${config.color}-600 p-8 text-white`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Test Analysis</h1>
              <p className="opacity-90">Test ID: #{testId} • Taken on {new Date(data.started_at).toLocaleDateString()}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-xl text-center min-w-[140px]">
              <div className="text-sm uppercase tracking-wider opacity-80 mb-1 font-bold">Total Score</div>
              <div className="text-4xl font-extrabold">{data.total_score.toFixed(1)}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-main border-b border-main">
          {['math', 'reasoning', 'computer', 'english', 'physics', 'chemistry', 'biology', 'gs', 'csat', 'aptitude'].map(s => (
            data[`${s}_score`] !== undefined && (
              <div key={s} className="p-4 text-center">
                <div className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold mb-1">{s.replace('_', ' ').toUpperCase()}</div>
                <div className="text-lg font-bold">{data[`${s}_score`].toFixed(1)}</div>
              </div>
            )
          ))}
          <div className="p-4 text-center">
            <div className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold mb-1">Accuracy</div>
            <div className="text-lg font-bold">
              {data.questions.length > 0 
                ? `${((data.questions.filter(q => q.is_correct).length / data.questions.length) * 100).toFixed(0)}%`
                : '0%'
              }
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-bold px-2">Question Analysis</h3>
        {data.questions.map((q, idx) => {
          const isCorrect = q.is_correct;
          const isSkipped = !q.selected_option;
          
          return (
            <div key={idx} className={`bg-panel rounded-xl shadow-sm border ${isCorrect ? 'border-green-200 dark:border-green-900/30' : isSkipped ? 'border-gray-200 dark:border-gray-700' : 'border-red-200 dark:border-red-900/30'} overflow-hidden transition-all hover:shadow-md`}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg font-bold text-gray-700 dark:text-gray-300">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 underline decoration-blue-500/30">
                      {q.section}
                    </span>
                  </div>
                  <div className="flex items-center">
                    {isCorrect ? (
                      <div className="flex items-center text-green-600 dark:text-green-400 font-bold">
                        <CheckCircle2 className="w-5 h-5 mr-1" /> Correct
                      </div>
                    ) : isSkipped ? (
                      <div className="flex items-center text-gray-400 font-bold">
                        <Clock className="w-5 h-5 mr-1" /> Skipped
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600 dark:text-red-400 font-bold">
                        <XCircle className="w-5 h-5 mr-1" /> Incorrect
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-lg font-medium mb-6 leading-relaxed">
                  {q.content}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {Object.entries(q.options).map(([key, value]) => {
                    const isSelected = q.selected_option === key;
                    const isCorrectOption = q.correct_option === key;
                    
                    let bgClass = "bg-panel border-main";
                    if (isSelected && isCorrectOption) bgClass = "bg-green-50 border-green-500 dark:bg-green-900/20";
                    else if (isSelected && !isCorrectOption) bgClass = "bg-red-50 border-red-500 dark:bg-red-900/20";
                    else if (isCorrectOption) bgClass = "bg-green-50 border-green-500 dark:bg-green-900/20";

                    return (
                      <div key={key} className={`p-4 border rounded-xl flex items-center transition ${bgClass}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 font-bold ${
                          isCorrectOption ? 'bg-green-500 text-white' : 
                          isSelected ? 'bg-red-500 text-white' : 
                          'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {key}
                        </div>
                        <span className="flex-1">{value}</span>
                        {isCorrectOption && <CheckCircle2 className="w-5 h-5 text-green-500 ml-2" />}
                      </div>
                    );
                  })}
                </div>

                <div className={`bg-${config.color}-50 dark:bg-${config.color}-900/20 p-4 rounded-xl flex items-start`}>
                  <Info className={`w-5 h-5 text-${config.color}-600 dark:text-${config.color}-400 mt-1 mr-3 flex-shrink-0`} />
                  <div>
                    <h4 className={`font-bold text-${config.color}-800 dark:text-${config.color}-300 text-sm mb-1 uppercase tracking-wider`}>Step-by-Step Logic</h4>
                    <p className={`text-${config.color}-900 dark:text-${config.color}-100 text-sm leading-relaxed`}>{q.explanation}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
};

export default Analysis;
