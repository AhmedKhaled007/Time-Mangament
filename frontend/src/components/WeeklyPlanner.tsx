import React, { useState, useEffect } from 'react';
import WeekNavigation from './WeekNavigation';
import DayCard from './DayCard';
import type { WeeklyTask, LunchIdea, BreakfastIdea } from '../types';
import { lunchIdeasApi, breakfastIdeasApi } from '../services/api';

export interface WeeklyTasks {
  [dateStr: string]: WeeklyTask[];
}

interface WeeklyPlannerProps {
  weeklyTasks: WeeklyTask[];
  onAddWeeklyTask: (task: Omit<WeeklyTask, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onToggleWeeklyTask: (id: number) => Promise<void>;
  onDeleteWeeklyTask: (id: number) => Promise<void>;
  onUpdateWeeklyTask: (id: number, task: Partial<WeeklyTask>) => Promise<void>;
  currentWeekStart: Date;
  onWeekChange: (direction: number) => Promise<void>;
}

const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({
  weeklyTasks,
  onAddWeeklyTask,
  onToggleWeeklyTask,
  onDeleteWeeklyTask,
  onUpdateWeeklyTask,
  currentWeekStart,
  onWeekChange
}) => {
  const [lunchIdeas, setLunchIdeas] = useState<LunchIdea[]>([]);
  const [newLunchIdea, setNewLunchIdea] = useState('');
  const [dailyLunches, setDailyLunches] = useState<Record<string, number | undefined>>({});
  const [breakfastIdeas, setBreakfastIdeas] = useState<BreakfastIdea[]>([]);
  const [newBreakfastIdea, setNewBreakfastIdea] = useState('');
  const [dailyBreakfasts, setDailyBreakfasts] = useState<Record<string, number | undefined>>({});

  // Load lunch ideas on component mount
  useEffect(() => {
    const loadLunchIdeas = async () => {
      try {
        const ideas = await lunchIdeasApi.getLunchIdeas();
        setLunchIdeas(ideas);
      } catch (error) {
        console.error('Failed to load lunch ideas:', error);
      }
    };
    loadLunchIdeas();
  }, []);

  // Load breakfast ideas on component mount
  useEffect(() => {
    const loadBreakfastIdeas = async () => {
      try {
        const ideas = await breakfastIdeasApi.getBreakfastIdeas();
        setBreakfastIdeas(ideas);
      } catch (error) {
        console.error('Failed to load breakfast ideas:', error);
      }
    };
    loadBreakfastIdeas();
  }, []);

  // Load daily lunches for the current week
  useEffect(() => {
    const loadDailyLunches = async () => {
      const weekDays = getWeekDays();
      const lunches: Record<string, number | undefined> = {};
      
      try {
        await Promise.all(
          weekDays.map(async (day) => {
            const dateStr = formatDate(day);
            try {
              const dailyLunch = await lunchIdeasApi.getDailyLunch(dateStr);
              lunches[dateStr] = dailyLunch.lunch_id;
            } catch (error) {
              // No lunch selected for this day
              lunches[dateStr] = undefined;
            }
          })
        );
        setDailyLunches(lunches);
      } catch (error) {
        console.error('Failed to load daily lunches:', error);
      }
    };
    
    loadDailyLunches();
  }, [currentWeekStart]);

  // Load daily breakfasts for the current week
  useEffect(() => {
    const loadDailyBreakfasts = async () => {
      const weekDays = getWeekDays();
      const breakfasts: Record<string, number | undefined> = {};
      
      try {
        await Promise.all(
          weekDays.map(async (day) => {
            const dateStr = formatDate(day);
            try {
              const dailyBreakfast = await breakfastIdeasApi.getDailyBreakfast(dateStr);
              breakfasts[dateStr] = dailyBreakfast.breakfast_id;
            } catch (error) {
              // No breakfast selected for this day
              breakfasts[dateStr] = undefined;
            }
          })
        );
        setDailyBreakfasts(breakfasts);
      } catch (error) {
        console.error('Failed to load daily breakfasts:', error);
      }
    };
    
    loadDailyBreakfasts();
  }, [currentWeekStart]);

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getDayName = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const addTask = async (dateStr: string, task: Omit<WeeklyTask, 'id' | 'created_at' | 'updated_at'>) => {
    await onAddWeeklyTask({
      ...task,
      date: dateStr
    });
  };

  const toggleTask = async (taskId: number) => {
    await onToggleWeeklyTask(taskId);
  };

  const deleteTask = async (taskId: number) => {
    await onDeleteWeeklyTask(taskId);
  };

  const editTask = async (taskId: number, updatedTask: Partial<WeeklyTask>) => {
    await onUpdateWeeklyTask(taskId, updatedTask);
  };

  // Lunch Ideas Management
  const handleAddLunchIdea = async () => {
    if (!newLunchIdea.trim()) return;
    
    try {
      const newIdea = await lunchIdeasApi.createLunchIdea({ name: newLunchIdea.trim() });
      setLunchIdeas(prev => [...prev, newIdea]);
      setNewLunchIdea('');
    } catch (error) {
      console.error('Failed to add lunch idea:', error);
    }
  };

  const handleDeleteLunchIdea = async (id: number) => {
    try {
      await lunchIdeasApi.deleteLunchIdea(id);
      setLunchIdeas(prev => prev.filter(idea => idea.id !== id));
      
      // Clear any daily lunch selections using this idea
      setDailyLunches(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(date => {
          if (updated[date] === id) {
            updated[date] = undefined;
          }
        });
        return updated;
      });
    } catch (error) {
      console.error('Failed to delete lunch idea:', error);
    }
  };

  const handleDailyLunchChange = async (date: string, lunchId?: number) => {
    try {
      console.log(`Updating lunch for ${date} to lunch ID:`, lunchId);
      await lunchIdeasApi.updateDailyLunch(date, lunchId);
      setDailyLunches(prev => ({ ...prev, [date]: lunchId }));
      console.log(`Successfully updated lunch for ${date}`);
    } catch (error) {
      console.error('Failed to update daily lunch:', error);
      if (error instanceof Error && 'response' in error) {
        console.error('API Response:', (error as any).response?.data);
      }
    }
  };

  const handleDailyBreakfastChange = async (date: string, breakfastId?: number) => {
    try {
      console.log(`Updating breakfast for ${date} to breakfast ID:`, breakfastId);
      await breakfastIdeasApi.updateDailyBreakfast(date, breakfastId);
      setDailyBreakfasts(prev => ({ ...prev, [date]: breakfastId }));
      console.log(`Successfully updated breakfast for ${date}`);
    } catch (error) {
      console.error('Failed to update daily breakfast:', error);
      if (error instanceof Error && 'response' in error) {
        console.error('API Response:', (error as any).response?.data);
      }
    }
  };

  // Group weekly tasks by date
  const getTasksForDate = (dateStr: string): WeeklyTask[] => {
    return weeklyTasks.filter(task => task.date === dateStr);
  };

  const weekDays = getWeekDays();
  const today = new Date();

  // Breakfast Ideas Management
  const handleAddBreakfastIdea = async () => {
    if (!newBreakfastIdea.trim()) return;
    
    try {
      const newIdea = await breakfastIdeasApi.createBreakfastIdea({ name: newBreakfastIdea.trim() });
      setBreakfastIdeas(prev => [...prev, newIdea]);
      setNewBreakfastIdea('');
    } catch (error) {
      console.error('Failed to add breakfast idea:', error);
    }
  };

  const handleDeleteBreakfastIdea = async (id: number) => {
    try {
      await breakfastIdeasApi.deleteBreakfastIdea(id);
      setBreakfastIdeas(prev => prev.filter(idea => idea.id !== id));
      
      // Clear any daily breakfast selections using this idea
      setDailyBreakfasts(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(date => {
          if (updated[date] === id) {
            updated[date] = undefined;
          }
        });
        return updated;
      });
    } catch (error) {
      console.error('Failed to delete breakfast idea:', error);
    }
  };

  return (
    <div className="p-8">
      <WeekNavigation
        currentWeekStart={currentWeekStart}
        onWeekChange={onWeekChange}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
        {weekDays.map((date) => {
          const dateStr = formatDate(date);
          const isToday = formatDate(today) === dateStr;
          const dayTasks = getTasksForDate(dateStr);
          
          return (
            <DayCard
              key={dateStr}
              date={date}
              dayName={getDayName(date)}
              isToday={isToday}
              tasks={dayTasks}
              onAddTask={(task) => addTask(dateStr, task)}
              onToggleTask={(taskId) => toggleTask(taskId)}
              onDeleteTask={(taskId) => deleteTask(taskId)}
              onEditTask={(taskId, task) => editTask(taskId, task)}
              lunchIdeas={lunchIdeas}
              selectedLunchId={dailyLunches[dateStr]}
              onLunchChange={(lunchId) => handleDailyLunchChange(dateStr, lunchId)}
              breakfastIdeas={breakfastIdeas}
              selectedBreakfastId={dailyBreakfasts[dateStr]}
              onBreakfastChange={(breakfastId) => handleDailyBreakfastChange(dateStr, breakfastId)}
            />
          );
        })}
      </div>

      {/* Meal Ideas Section */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakfast Ideas Section */}
        <div className="breakfast-ideas-section bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">🥐 Breakfast Ideas</h3>
          
          {/* Add New Breakfast Idea */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newBreakfastIdea}
              onChange={(e) => setNewBreakfastIdea(e.target.value)}
              placeholder="Add a new breakfast idea..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddBreakfastIdea()}
            />
            <button
              onClick={handleAddBreakfastIdea}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Add
            </button>
          </div>

          {/* Breakfast Ideas List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {breakfastIdeas.map((idea) => (
              <div key={idea.id} className="flex items-center justify-between bg-white p-2 rounded border">
                <span className="text-sm">{idea.name}</span>
                <button
                  onClick={() => handleDeleteBreakfastIdea(idea.id)}
                  className="text-red-500 hover:text-red-700 ml-2"
                  title="Delete breakfast idea"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          {breakfastIdeas.length === 0 && (
            <p className="text-gray-500 text-sm italic">No breakfast ideas yet. Add some ideas above!</p>
          )}
        </div>

        {/* Lunch Ideas Section */}
        <div className="lunch-ideas-section bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">🍽️ Lunch Ideas</h3>
          
          {/* Add New Lunch Idea */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newLunchIdea}
              onChange={(e) => setNewLunchIdea(e.target.value)}
              placeholder="Add a new lunch idea..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddLunchIdea()}
            />
            <button
              onClick={handleAddLunchIdea}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              Add
            </button>
          </div>

          {/* Lunch Ideas List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {lunchIdeas.map((idea) => (
              <div key={idea.id} className="flex items-center justify-between bg-white p-2 rounded border">
                <span className="text-sm">{idea.name}</span>
                <button
                  onClick={() => handleDeleteLunchIdea(idea.id)}
                  className="text-red-500 hover:text-red-700 ml-2"
                  title="Delete lunch idea"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          {lunchIdeas.length === 0 && (
            <p className="text-gray-500 text-sm italic">No lunch ideas yet. Add some ideas above!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlanner;