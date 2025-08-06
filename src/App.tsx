import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import Header from './components/Header';
import Tabs from './components/Tabs';
import PomodoroTimer from './components/PomodoroTimer';
import FloatingTimer from './components/FloatingTimer';
import DistractionTracker from './components/DistractionTracker';
import StatsCard from './components/StatsCard';
import WeeklyPlanner from './components/WeeklyPlanner';
import Settings from './components/Settings';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTimer } from './hooks/useTimer';
import { distractionsApi, weeklyTasksApi } from './services/api';
import type { Distraction as ApiDistraction, WeeklyTask as ApiWeeklyTask } from './types';

function App() {
  const [activeTab, setActiveTab] = useState('pomodoro');
  const [isTimerMinimized, setIsTimerMinimized] = useState(false);
  
  // State management with API integration
  const [distractions, setDistractions] = useState<ApiDistraction[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<ApiWeeklyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Keep some local storage for offline features
  const [focusSessions, setFocusSessions] = useLocalStorage<number>('devTimeMaster_focusSessions', 0);
  
  // Week navigation
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day + 2) % 7;
    return new Date(d.setDate(d.getDate() - diff));
  };
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));

  // Load data from backend on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [distractionsData, weeklyTasksData] = await Promise.all([
          distractionsApi.getDistractions(),
          weeklyTasksApi.getWeeklyTasks()
        ]);
        console.log('📊 Loaded data:', { 
          distractionsCount: distractionsData.length, 
          weeklyTasksCount: weeklyTasksData.length,
          weeklyTasksData 
        });
        setDistractions(distractionsData);
        setWeeklyTasks(weeklyTasksData);
        setError(null);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to connect to backend. Please check if the server is running.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Timer hook
  const timer = useTimer(25, () => {
    setFocusSessions(prev => prev + 1);
  });

  // Update browser tab title with timer when running
  useEffect(() => {
    const formatTime = (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (timer.isRunning) {
      document.title = `⏰ ${formatTime(timer.timeLeft)} - ${timer.status} | Time Management`;
    } else if (isTimerMinimized) {
      document.title = `⏸️ ${formatTime(timer.timeLeft)} - ${timer.status} | Time Management`;
    } else {
      document.title = 'Time Management Dashboard';
    }

    return () => {
      // Cleanup: Reset title when component unmounts
      document.title = 'Time Management Dashboard';
    };
  }, [timer.timeLeft, timer.isRunning, timer.status, isTimerMinimized]);

  const handleMinimizeTimer = () => {
    setIsTimerMinimized(true);
  };

  const handleRestoreTimer = () => {
    setIsTimerMinimized(false);
    setActiveTab('pomodoro');
  };

  const handleHideFloatingTimer = () => {
    setIsTimerMinimized(false);
  };


  // Distraction management functions with API integration
  const addDistraction = async (distractionData: Omit<ApiDistraction, 'id' | 'created_at'>) => {
    try {
      const newDistraction = await distractionsApi.logDistraction({
        text: distractionData.text,
        time: distractionData.time
      });
      setDistractions(prev => [newDistraction, ...prev]);
    } catch (err) {
      console.error('Failed to log distraction:', err);
      setError('Failed to log distraction');
    }
  };

  // Weekly planner functions
  const handleWeekChange = async (direction: number) => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction * 7));
      return newDate;
    });
    // Reload weekly tasks for new week
    try {
      const weeklyTasksData = await weeklyTasksApi.getWeeklyTasks();
      setWeeklyTasks(weeklyTasksData);
    } catch (err) {
      console.error('Failed to load weekly tasks:', err);
    }
  };

  const addWeeklyTask = async (taskData: Omit<ApiWeeklyTask, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newTask = await weeklyTasksApi.createWeeklyTask({
        text: taskData.text,
        completed: taskData.completed || false,
        from_time: taskData.from_time,
        to_time: taskData.to_time,
        date: taskData.date
      });
      setWeeklyTasks(prev => [newTask, ...prev]);
    } catch (err) {
      console.error('Failed to create weekly task:', err);
      setError('Failed to create weekly task');
    }
  };

  const toggleWeeklyTask = async (id: number) => {
    try {
      const updatedTask = await weeklyTasksApi.toggleWeeklyTask(id);
      setWeeklyTasks(prev => prev.map(task => 
        task.id === id ? updatedTask : task
      ));
    } catch (err) {
      console.error('Failed to toggle weekly task:', err);
      setError('Failed to update weekly task');
    }
  };

  const deleteWeeklyTask = async (id: number) => {
    try {
      await weeklyTasksApi.deleteWeeklyTask(id);
      setWeeklyTasks(prev => prev.filter(task => task.id !== id));
    } catch (err) {
      console.error('Failed to delete weekly task:', err);
      setError('Failed to delete weekly task');
    }
  };

  const updateWeeklyTask = async (id: number, taskData: Partial<ApiWeeklyTask>) => {
    try {
      const updatedTask = await weeklyTasksApi.updateWeeklyTask(id, {
        text: taskData.text,
        completed: taskData.completed,
        from_time: taskData.from_time,
        to_time: taskData.to_time
      });
      setWeeklyTasks(prev => prev.map(task => 
        task.id === id ? updatedTask : task
      ));
    } catch (err) {
      console.error('Failed to update weekly task:', err);
      setError('Failed to update weekly task');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
          <div className="container mx-auto max-w-7xl bg-white rounded-t-3xl shadow-2xl overflow-hidden">
            <Header />
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-8 mt-4">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
                <button 
                  onClick={() => setError(null)}
                  className="float-right font-bold text-red-700 hover:text-red-900"
                >
                  ×
                </button>
              </div>
            )}
            <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
            
            {/* Pomodoro Tab Content */}
            {activeTab === 'pomodoro' && (
              <div className="p-8">
                <div className="mb-8">
                  <DistractionTracker
                    distractions={distractions}
                    onAddDistraction={addDistraction}
                  />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <PomodoroTimer
                    timeLeft={timer.timeLeft}
                    isRunning={timer.isRunning}
                    status={timer.status}
                    onStart={timer.start}
                    onPause={timer.pause}
                    onReset={timer.reset}
                    isMinimized={isTimerMinimized}
                    onMinimize={handleMinimizeTimer}
                  />
                  
                  <StatsCard
                    focusSessions={focusSessions}
                    distractions={distractions}
                  />
                </div>
              </div>
            )}

            {/* Weekly Tab Content */}
            {activeTab === 'weekly' && (
              <div className="p-8">
                <WeeklyPlanner
                  weeklyTasks={weeklyTasks}
                  onAddWeeklyTask={addWeeklyTask}
                  onToggleWeeklyTask={toggleWeeklyTask}
                  onDeleteWeeklyTask={deleteWeeklyTask}
                  onUpdateWeeklyTask={updateWeeklyTask}
                  currentWeekStart={currentWeekStart}
                  onWeekChange={handleWeekChange}
                />
              </div>
            )}
            
            {/* Settings Tab Content */}
            {activeTab === 'settings' && <Settings />}
          </div>
          
          {/* Floating Timer */}
          <FloatingTimer
            timeLeft={timer.timeLeft}
            isRunning={timer.isRunning}
            status={timer.status}
            onStart={timer.start}
            onPause={timer.pause}
            onReset={timer.reset}
            onRestore={handleRestoreTimer}
            onHide={handleHideFloatingTimer}
            isVisible={isTimerMinimized}
          />
        </div>
      </AuthGuard>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;