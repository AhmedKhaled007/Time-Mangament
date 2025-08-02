import { useState, useEffect } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import PomodoroTimer from './components/PomodoroTimer';
import FloatingTimer from './components/FloatingTimer';
import TaskManager from './components/TaskManager';
import DistractionTracker from './components/DistractionTracker';
import StatsCard from './components/StatsCard';
import WeeklyPlanner from './components/WeeklyPlanner';
import TickTickSettings from './components/TickTickSettings';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTimer } from './hooks/useTimer';
import { tasksApi, distractionsApi, weeklyTasksApi } from './services/api';
import type { Task as ApiTask, Distraction as ApiDistraction, WeeklyTask as ApiWeeklyTask } from './types';

function App() {
  const [activeTab, setActiveTab] = useState('daily');
  const [isTimerMinimized, setIsTimerMinimized] = useState(false);
  
  // State management with API integration
  const [tasks, setTasks] = useState<ApiTask[]>([]);
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
        const [tasksData, distractionsData, weeklyTasksData] = await Promise.all([
          tasksApi.getTasks(),
          distractionsApi.getDistractions(),
          weeklyTasksApi.getWeeklyTasks()
        ]);
        setTasks(tasksData);
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

  const handleMinimizeTimer = () => {
    setIsTimerMinimized(true);
  };

  const handleRestoreTimer = () => {
    setIsTimerMinimized(false);
    setActiveTab('daily');
  };

  const handleHideFloatingTimer = () => {
    setIsTimerMinimized(false);
  };

  // Task management functions with API integration
  const addTask = async (taskData: Omit<ApiTask, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newTask = await tasksApi.createTask({
        text: taskData.text,
        priority: taskData.priority,
        completed: taskData.completed
      });
      setTasks(prev => [newTask, ...prev]);
    } catch (err) {
      console.error('Failed to create task:', err);
      setError('Failed to create task');
    }
  };

  const toggleTask = async (id: number) => {
    try {
      const updatedTask = await tasksApi.toggleTask(id);
      setTasks(prev => prev.map(task => 
        task.id === id ? updatedTask : task
      ));
    } catch (err) {
      console.error('Failed to toggle task:', err);
      setError('Failed to update task');
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await tasksApi.deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task');
    }
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
        
        {/* Daily Tab Content */}
        {activeTab === 'daily' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            <div className="col-span-full">
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
            </div>
            
            <TaskManager
              tasks={tasks}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
            />
            
            <DistractionTracker
              distractions={distractions}
              onAddDistraction={addDistraction}
            />
            
            <div className="col-span-full">
              <StatsCard
                focusSessions={focusSessions}
                tasks={tasks}
                distractions={distractions}
              />
            </div>
          </div>
        )}
        
        {/* Weekly Tab Content */}
        {activeTab === 'weekly' && (
          <WeeklyPlanner
            weeklyTasks={weeklyTasks}
            onAddWeeklyTask={addWeeklyTask}
            onToggleWeeklyTask={toggleWeeklyTask}
            onDeleteWeeklyTask={deleteWeeklyTask}
            onUpdateWeeklyTask={updateWeeklyTask}
            currentWeekStart={currentWeekStart}
            onWeekChange={handleWeekChange}
            dailyTasks={tasks}
            focusSessions={focusSessions}
          />
        )}
        
        {/* Settings Tab Content */}
        {activeTab === 'settings' && (
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <TickTickSettings />
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4">Other Settings</h2>
                <p className="text-gray-600">More settings coming soon...</p>
              </div>
            </div>
          </div>
        )}
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
  );
}

export default App;