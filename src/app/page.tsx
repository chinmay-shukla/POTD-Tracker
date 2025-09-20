import React, { useState, useEffect } from 'react';
import { CheckCircle2, Trophy, Target, Calendar, Upload, Star, Flame, TrendingUp, Moon, Sun, LucideProps, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Interfaces ---
interface Problem {
  id: string;
  title: string;
  url: string;
  platform: string;
  completed: boolean;
  completedDate?: string;
}

interface Stats {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  lastCompletedDate?: string;
}

// --- Prop Types for Sub-Components ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<LucideProps>;
  color: string;
  darkMode: boolean;
}

interface TodayProblemCardProps {
  problem: Problem;
  onComplete: (id: string) => void;
  darkMode: boolean;
}

interface GetStartedCardProps {
  onAddProblems: () => void;
  darkMode: boolean;
}

interface PotdDoneForTodayCardProps {
    darkMode: boolean;
}

interface AllProblemsDoneCardProps {
  darkMode: boolean;
}

interface ProblemHistoryProps {
  problems: Problem[];
  onComplete: (id: string) => void;
  onIncomplete: (id: string) => void;
  darkMode: boolean;
}

interface ProblemHistoryItemProps {
  problem: Problem;
  index: number;
  onComplete: (id: string) => void;
  onIncomplete: (id: string) => void;
  darkMode: boolean;
}

interface PlatformTagProps {
    platform: string;
    darkMode: boolean;
}


// --- Main Component ---
const PotdTracker = () => {
  // --- State Management ---
  const [problems, setProblems] = useState<Problem[]>([]);
  const [stats, setStats] = useState<Stats>({
    currentStreak: 0,
    longestStreak: 0,
    totalCompleted: 0
  });
  const [showUpload, setShowUpload] = useState(false);
  const [problemInput, setProblemInput] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  // --- Local Storage Hooks ---
  const saveToStorage = (key: string, data: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`❌ Failed to save ${key}:`, error);
      alert('Storage quota exceeded! Consider clearing old data.');
    }
  };

  const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved) as T;
      }
    } catch (error) {
      console.error(`❌ Failed to load ${key}:`, error);
    }
    return defaultValue;
  };

  useEffect(() => {
    setProblems(loadFromStorage<Problem[]>('potd-problems', []));
    setStats(loadFromStorage<Stats>('potd-stats', {
      currentStreak: 0,
      longestStreak: 0,
      totalCompleted: 0
    }));
    setDarkMode(loadFromStorage<boolean>('potd-darkmode', false));
  }, []);

  useEffect(() => {
    // Avoid saving empty problems array on initial load if it exists in storage
    if (problems && problems.length > 0) {
      saveToStorage('potd-problems', problems);
    }
  }, [problems]);

  useEffect(() => {
    saveToStorage('potd-stats', stats);
  }, [stats]);

  useEffect(() => {
    saveToStorage('potd-darkmode', darkMode);
  }, [darkMode]);


  // --- Core Logic ---
  const recalculateStatsFromHistory = (problemList: Problem[]) => {
    const completed = problemList
        .filter(p => p.completed && p.completedDate)
        .sort((a, b) => new Date(a.completedDate!).getTime() - new Date(b.completedDate!).getTime());

    if (completed.length === 0) {
        setStats({
            currentStreak: 0,
            longestStreak: stats.longestStreak, // Keep longest streak unless it needs recalculating too
            totalCompleted: 0,
            lastCompletedDate: undefined
        });
        return;
    }

    let currentStreak = 0;
    let longestStreak = 0;
    
    if(completed.length > 0){
        currentStreak = 1;
        longestStreak = 1;
    }

    for (let i = 1; i < completed.length; i++) {
        const currentDate = new Date(completed[i].completedDate!);
        const prevDate = new Date(completed[i - 1].completedDate!);
        
        const diffTime = currentDate.getTime() - prevDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            currentStreak++;
        } else if (diffDays > 1) {
            currentStreak = 1;
        }
        
        if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
        }
    }
    
    const lastCompleted = completed[completed.length - 1];
    const today = new Date();
    const lastDate = new Date(lastCompleted.completedDate!);
    const diffTimeFromToday = today.getTime() - lastDate.getTime();
    const diffDaysFromToday = Math.floor(diffTimeFromToday / (1000 * 60 * 60 * 24));

    if (diffDaysFromToday > 1) {
        currentStreak = 0;
    }

    setStats({
        totalCompleted: completed.length,
        currentStreak,
        longestStreak: Math.max(stats.longestStreak, longestStreak), // Ensure longest streak is never less than before
        lastCompletedDate: lastCompleted.completedDate
    });
  };

  const markComplete = (problemId: string) => {
    const today = new Date().toDateString();
    const updatedProblems = problems.map(p =>
      p.id === problemId
        ? { ...p, completed: true, completedDate: today }
        : p
    );
    setProblems(updatedProblems);

    // Update stats
    const newTotalCompleted = stats.totalCompleted + 1;
    let newCurrentStreak = stats.currentStreak;
    
    if (stats.lastCompletedDate) {
      const lastDate = new Date(stats.lastCompletedDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastDate.toDateString() === yesterday.toDateString()) {
        newCurrentStreak += 1; // Consecutive day
      } else if (lastDate.toDateString() !== today) {
        newCurrentStreak = 1; // Streak broken
      }
    } else {
      newCurrentStreak = 1; // First completion
    }
    
    setStats({
      totalCompleted: newTotalCompleted,
      currentStreak: newCurrentStreak,
      longestStreak: Math.max(stats.longestStreak, newCurrentStreak),
      lastCompletedDate: today
    });

    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      zIndex: 9999
    });
  };

  const markIncomplete = (problemId: string) => {
    const updatedProblems = problems.map(p =>
      p.id === problemId
        ? { ...p, completed: false, completedDate: undefined }
        : p
    );
    setProblems(updatedProblems);
    recalculateStatsFromHistory(updatedProblems);
  };


  // --- Problem & Data Handling ---
  const parseProblems = (input: string): Problem[] => {
    const lines = input.trim().split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      const urlMatch = line.match(/https?:\/\/[^\s]+/);
      const url = urlMatch ? urlMatch[0] : '';
      
      let platform = 'Unknown';
      const title = line.replace(url, '').trim() || `Problem ${index + 1}`;
      
      if (url.includes('leetcode')) platform = 'LeetCode';
      else if (url.includes('codeforces')) platform = 'Codeforces';
      else if (url.includes('codechef')) platform = 'CodeChef';
      else if (url.includes('hackerrank')) platform = 'HackerRank';

      return {
        id: `problem-${Date.now()}-${index}`,
        title,
        url,
        platform,
        completed: false
      };
    });
  };

  const handleUploadProblems = () => {
    if (!problemInput.trim()) return;
    const newProblems = parseProblems(problemInput);
    setProblems(prev => [...prev, ...newProblems]);
    setProblemInput('');
    setShowUpload(false);
  };

  const exportData = () => {
    const exportContent = { problems, stats, darkMode };
    const dataStr = JSON.stringify(exportContent, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `potd-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (importedData.problems) setProblems(importedData.problems);
        if (importedData.stats) setStats(importedData.stats);
        if (typeof importedData.darkMode === 'boolean') setDarkMode(importedData.darkMode);
        alert('✅ Data imported successfully!');
      } catch (error) {
        console.error("Failed to import data:", error);
        alert('❌ Error importing data. Please check the file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };

  const clearAllData = () => {
    if (window.confirm('⚠️ Are you sure you want to clear all data? This cannot be undone!')) {
      localStorage.removeItem('potd-problems');
      localStorage.removeItem('potd-stats');
      localStorage.removeItem('potd-darkmode');
      setProblems([]);
      setStats({ currentStreak: 0, longestStreak: 0, totalCompleted: 0 });
      setDarkMode(false);
      alert('🗑️ All data cleared!');
    }
  };

  // --- Derived State for Rendering ---
  const today = new Date().toDateString();
  const isPotdDoneForToday = stats.lastCompletedDate === today;
  const nextIncompleteProblem = problems.find(p => !p.completed) || null;
  const allProblemsCompleted = problems.length > 0 && !nextIncompleteProblem;
  const completedProblems = problems.filter(p => p.completed);
  const progressPercentage = problems.length > 0 ? (completedProblems.length / problems.length) * 100 : 0;


  // --- Render Method ---
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-purple-50 text-gray-800'
    }`}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              POTD Tracker
            </h1>
            <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Your daily coding challenge companion
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-3 rounded-full transition-all ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
              } shadow-lg`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
                id="import-data"
              />
              <label
                htmlFor="import-data"
                className={`p-3 rounded-full transition-all cursor-pointer inline-block ${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                } shadow-lg`}
                title="Import Data"
              >
                📥
              </label>
            </div>
            
            <button
              onClick={exportData}
              className={`p-3 rounded-full transition-all ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
              } shadow-lg`}
              title="Export Data"
            >
              📤
            </button>
            
            <button
              onClick={clearAllData}
              className={`p-3 rounded-full transition-all ${
                darkMode ? 'bg-red-900 hover:bg-red-800' : 'bg-red-50 hover:bg-red-100'
              } shadow-lg text-red-600`}
              title="Clear All Data"
            >
              🗑️
            </button>
            
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              <Upload className="w-4 h-4" />
              Add Problems
            </button>
          </div>
        </div>

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
            <div className={`${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } rounded-2xl p-6 max-w-2xl w-full`}>
              <h3 className="text-2xl font-bold mb-4">Upload Problem Links</h3>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                Paste your problem links (one per line). Include titles if you want:
              </p>
              <textarea
                value={problemInput}
                onChange={(e) => setProblemInput(e.target.value)}
                placeholder="Example:&#10;Two Sum https://leetcode.com/problems/two-sum/&#10;https://codeforces.com/problem/1/A"
                className={`w-full h-32 p-4 rounded-lg border-2 ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                } focus:border-blue-500 outline-none resize-none`}
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowUpload(false)}
                  className={`px-4 py-2 rounded-lg ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  } transition-colors`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadProblems}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Upload Problems
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard title="Current Streak" value={stats.currentStreak} icon={Flame} color="orange" darkMode={darkMode} />
            <StatCard title="Longest Streak" value={stats.longestStreak} icon={Trophy} color="yellow" darkMode={darkMode} />
            <StatCard title="Total Completed" value={stats.totalCompleted} icon={Target} color="green" darkMode={darkMode} />
            <StatCard title="Progress" value={`${Math.round(progressPercentage)}%`} icon={TrendingUp} color="purple" darkMode={darkMode} />
        </div>

        {/* Progress Bar */}
        {problems.length > 0 && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-100'} shadow-lg mb-8`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Overall Progress</h3>
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {completedProblems.length} / {problems.length} problems
              </span>
            </div>
            <div className={`w-full h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Main Content Area: Today's Problem or Placeholders */}
        <div className="main-content-area">
            {problems.length === 0 ? (
                <GetStartedCard onAddProblems={() => setShowUpload(true)} darkMode={darkMode} />
            ) : isPotdDoneForToday ? (
                <PotdDoneForTodayCard darkMode={darkMode} />
            ) : nextIncompleteProblem ? (
                <TodayProblemCard problem={nextIncompleteProblem} onComplete={markComplete} darkMode={darkMode} />
            ) : allProblemsCompleted ? (
                <AllProblemsDoneCard darkMode={darkMode}/>
            ) : null}
        </div>


        {/* Problem History */}
        {problems.length > 0 && (
          <ProblemHistory problems={problems} onComplete={markComplete} onIncomplete={markIncomplete} darkMode={darkMode} />
        )}
      </div>
    </div>
  );
};


// --- Sub-Components ---
const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, darkMode }) => {
    return (
        <div className={`group ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} p-6 rounded-2xl border shadow-lg hover:shadow-2xl hover:shadow-${color}-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm font-medium`}>{title}</p>
                    <p className={`text-3xl font-bold text-${color}-500 group-hover:scale-110 transition-transform duration-300`}>{value}</p>
                </div>
                <Icon className={`w-8 h-8 text-${color}-500 group-hover:animate-bounce`} />
            </div>
        </div>
    );
};

const TodayProblemCard: React.FC<TodayProblemCardProps> = ({ problem, onComplete, darkMode }) => (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-8 rounded-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-100'} shadow-lg mb-8`}>
        <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold">Today&apos;s Problem</h2>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">{problem.title}</h3>
                <div className="flex items-center gap-3 mb-4">
                    <PlatformTag platform={problem.platform} darkMode={darkMode} />
                    <a href={problem.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 text-sm underline">
                        View Problem →
                    </a>
                </div>
            </div>
            <button
                onClick={() => onComplete(problem.id)}
                className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full font-medium shadow-lg hover:shadow-2xl hover:shadow-green-500/30 transform hover:scale-105 transition-all duration-300 relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <CheckCircle2 className="w-5 h-5 group-hover:rotate-[360deg] transition-transform duration-500" />
                <span className="relative z-10">Mark as Complete</span>
            </button>
        </div>
    </div>
);

const GetStartedCard: React.FC<GetStartedCardProps> = ({ onAddProblems, darkMode }) => (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-8 rounded-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-100'} shadow-lg mb-8 text-center`}>
        <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Get Started</h2>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
            Upload your first set of problems to begin your coding journey!
        </p>
        <button onClick={onAddProblems} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
            Add Problems
        </button>
    </div>
);

const PotdDoneForTodayCard: React.FC<PotdDoneForTodayCardProps> = ({ darkMode }) => (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-8 rounded-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-100'} shadow-lg mb-8 text-center`}>
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Great Job!</h2>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            You&apos;ve finished your problem for today. Come back tomorrow for the next one!
        </p>
    </div>
);


const AllProblemsDoneCard: React.FC<AllProblemsDoneCardProps> = ({ darkMode }) => (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-8 rounded-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-100'} shadow-lg mb-8 text-center`}>
        <Star className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Congratulations!</h2>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            You&apos;ve completed all problems! Time to add more challenges.
        </p>
    </div>
);

const ProblemHistory: React.FC<ProblemHistoryProps> = ({ problems, onComplete, onIncomplete, darkMode }) => (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-100'} shadow-lg`}>
        <h3 className="text-xl font-bold mb-6">Problem History</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
            {problems.map((problem, index) => (
                <ProblemHistoryItem key={problem.id} problem={problem} index={index} onComplete={onComplete} onIncomplete={onIncomplete} darkMode={darkMode} />
            ))}
        </div>
    </div>
);

const ProblemHistoryItem: React.FC<ProblemHistoryItemProps> = ({ problem, index, onComplete, onIncomplete, darkMode }) => (
    <div className={`flex items-center justify-between p-4 rounded-lg transition-all ${problem.completed ? (darkMode ? 'bg-green-900/20' : 'bg-green-50') : (darkMode ? 'bg-gray-700' : 'bg-gray-50')}`}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
            <span className={`text-sm font-medium px-2 py-1 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                #{index + 1}
            </span>
            <div className="truncate">
                <h4 className={`font-medium truncate ${problem.completed ? 'line-through opacity-75' : ''}`}>{problem.title}</h4>
                <div className="flex items-center gap-3">
                    <PlatformTag platform={problem.platform} darkMode={darkMode} />
                    <a href={problem.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 text-xs underline">
                        View Problem
                    </a>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            {problem.completed ? (
                <>
                    <div className="flex items-center gap-2 text-green-500">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-medium hidden sm:inline">Completed</span>
                    </div>
                     <button onClick={() => onIncomplete(problem.id)} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`} title="Mark as incomplete">
                        <RotateCcw className="w-4 h-4 text-gray-500" />
                    </button>
                </>
            ) : (
                <button onClick={() => onComplete(problem.id)} className="group px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-all transform hover:scale-105">
                    Mark Done
                </button>
            )}
        </div>
    </div>
);

const PlatformTag: React.FC<PlatformTagProps> = ({ platform, darkMode }) => {
    const baseStyle = "text-xs px-2 py-1 rounded-full ";
    const lightModeColors: { [key: string]: string } = {
        'LeetCode': 'bg-yellow-100 text-yellow-800',
        'Codeforces': 'bg-red-100 text-red-800',
        'CodeChef': 'bg-orange-100 text-orange-800',
        'HackerRank': 'bg-green-100 text-green-800',
        'Unknown': 'bg-gray-100 text-gray-800'
    };
    const darkModeColors: { [key: string]: string } = {
        'LeetCode': 'bg-yellow-900/50 text-yellow-300',
        'Codeforces': 'bg-red-900/50 text-red-300',
        'CodeChef': 'bg-orange-900/50 text-orange-300',
        'HackerRank': 'bg-green-900/50 text-green-300',
        'Unknown': 'bg-gray-700 text-gray-300'
    };
    return (
        <span className={baseStyle + (darkMode ? darkModeColors[platform] : lightModeColors[platform])}>
            {platform}
        </span>
    );
};

export default PotdTracker;

