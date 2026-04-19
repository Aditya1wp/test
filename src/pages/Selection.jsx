import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Database, 
  Activity, 
  Globe, 
  LayoutGrid,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import './AuthPages.css';

const exams = [
  {
    id: 'nimcet',
    name: 'NIMCET',
    description: 'Master Mathematics, Computer Awareness, and Logical Reasoning for MCA entrance.',
    icon: BookOpen,
    color: 'from-blue-600 to-blue-400',
    glow: 'shadow-blue-500/20',
  },
  {
    id: 'jee',
    name: 'JEE Mains & Advanced',
    description: 'Comprehensive mock tests for Physics, Chemistry, and Mathematics.',
    icon: Database,
    color: 'from-indigo-600 to-indigo-400',
    glow: 'shadow-indigo-500/20',
  },
  {
    id: 'neet',
    name: 'NEET',
    description: 'Focused preparation for Biology, Chemistry, and Physics aspirants.',
    icon: Activity,
    color: 'from-rose-600 to-rose-400',
    glow: 'shadow-rose-500/20',
  },
  {
    id: 'upsc',
    name: 'UPSC Civil Services',
    description: 'GS and CSAT mocks with deep analytics and current affairs.',
    icon: Globe,
    color: 'from-amber-600 to-amber-400',
    glow: 'shadow-amber-500/20',
  },
  {
    id: 'general',
    name: 'General Competition',
    description: 'Quantitative aptitude, verbal ability, and logical reasoning for all exams.',
    icon: LayoutGrid,
    color: 'from-emerald-600 to-emerald-400',
    glow: 'shadow-emerald-500/20',
  }
];

const Selection = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-panel py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] -ml-48 -mb-48"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-100 dark:border-blue-800/50 mb-6">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Select Your Goal</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
            The Hub of <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">Excellence</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-gray-500 dark:text-gray-400 font-medium">
            Choose your target exam and start your journey with India's most advanced mock test engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {exams.map((exam) => (
            <button
              key={exam.id}
              onClick={() => navigate(`/dashboard/${exam.id}`)}
              className="group relative flex flex-col items-start p-8 bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 rounded-[2.5rem] text-left transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:border-blue-500/50 overflow-hidden"
            >
              {/* Card Background Glow */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${exam.color} opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 blur-3xl transition-opacity duration-500`}></div>
              
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${exam.color} ${exam.glow} text-white mb-6 group-hover:scale-110 transition-transform duration-500`}>
                <exam.icon className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {exam.name}
              </h3>
              
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8">
                {exam.description}
              </p>

              <div className="mt-auto flex items-center text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-500">
                Explore Dashboard <ChevronRight className="ml-2 w-4 h-4" />
              </div>

              {/* Decorative accent */}
              <div className="absolute bottom-0 right-0 p-1 opcaity-20">
                <div className={`w-8 h-8 rounded-tl-full border-r-4 border-b-4 border-transparent group-hover:border-blue-500/20 transition-all duration-700`}></div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-20 text-center">
          <p className="text-sm font-bold text-gray-400 dark:text-gray-500 flex items-center justify-center">
            <span className="w-12 h-[1px] bg-gray-200 dark:bg-gray-700 mr-4"></span>
            More exams coming soon
            <span className="w-12 h-[1px] bg-gray-200 dark:bg-gray-700 ml-4"></span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Selection;
