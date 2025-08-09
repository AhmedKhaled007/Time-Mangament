import React, { useState, useEffect } from "react";
import WeekNavigation from "./WeekNavigation";
import DayCard from "./DayCard";
import type { WeeklyTask, MealIdea, WeeklyMeals, MealType } from "../types";
import {
  mealIdeasApi,
  dailyMealsApi,
  recurringTasksApi,
  weeklyTasksApi,
} from "../services/api";
import RecurringTasks from "./RecurringTasks";

export interface WeeklyTasks {
  [dateStr: string]: WeeklyTask[];
}

interface WeeklyPlannerProps {
  weeklyTasks: WeeklyTask[];
  onAddWeeklyTask: (
    task: Omit<WeeklyTask, "id" | "created_at" | "updated_at">
  ) => Promise<void>;
  onToggleWeeklyTask: (id: number) => Promise<void>;
  onDeleteWeeklyTask: (id: number) => Promise<void>;
  onUpdateWeeklyTask: (id: number, task: Partial<WeeklyTask>) => Promise<void>;
  currentWeekStart: Date;
  onWeekChange: (direction: number) => Promise<void>;
  onTasksPopulated?: () => Promise<void>; // Callback to refresh tasks after population
}

const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({
  weeklyTasks,
  onAddWeeklyTask,
  onToggleWeeklyTask,
  onDeleteWeeklyTask,
  onUpdateWeeklyTask,
  currentWeekStart,
  onWeekChange,
  onTasksPopulated,
}) => {
  console.log("🗓️ WeeklyPlanner received tasks:", {
    count: weeklyTasks.length,
    tasks: weeklyTasks,
  });
  const [mealIdeas, setMealIdeas] = useState<MealIdea[]>([]);
  const [newMealIdea, setNewMealIdea] = useState("");
  const [newMealType, setNewMealType] = useState<MealType>("lunch");
  const [weeklyMeals, setWeeklyMeals] = useState<WeeklyMeals>({});
  const [isPopulating, setIsPopulating] = useState(false);

  // Load meal ideas on component mount
  useEffect(() => {
    const loadMealIdeas = async () => {
      try {
        const ideas = await mealIdeasApi.getMealIdeas();
        setMealIdeas(ideas);
      } catch (error) {
        console.error("Failed to load meal ideas:", error);
      }
    };
    loadMealIdeas();
  }, []);

  // Helper function to group meals by date
  const groupMealsByDate = (meals: any[]): WeeklyMeals => {
    const groupedMeals: WeeklyMeals = {};
    meals.forEach((meal: any) => {
      if (!groupedMeals[meal.date]) {
        groupedMeals[meal.date] = {};
      }
      groupedMeals[meal.date][meal.meal_type] = {
        meal_id: meal.meal_id,
        meal_name: meal.meal_name,
        created_at: meal.created_at,
        updated_at: meal.updated_at
      };
    });
    return groupedMeals;
  };

  useEffect(() => {
    const loadWeeklyMeals = async () => {
      const weekDays = getWeekDays();
      const startDate = formatDate(weekDays[0]);
      const endDate = formatDate(weekDays[weekDays.length - 1]);

      try {
        const rawMeals = await dailyMealsApi.getWeeklyMeals(startDate, endDate);
        const groupedMeals = groupMealsByDate(rawMeals);
        setWeeklyMeals(groupedMeals);

        const today = new Date();
        const isCurrentWeek = weekDays.some(
          (day) => formatDate(day) === formatDate(today)
        );
        if (isCurrentWeek) {
          await handlePopulateRecurringTasks();
        }

        // Don't auto-populate - user will click button when needed
      } catch (error) {
        console.error("Failed to load weekly meals:", error);
        // Initialize empty weekly meals structure on error
        setWeeklyMeals({});
      }
    };

    loadWeeklyMeals();
  }, [currentWeekStart]);

  const getWeekDays = (): Date[] => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const getDayName = (date: Date) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[date.getDay()];
  };

  const addTask = async (
    dateStr: string,
    task: Omit<WeeklyTask, "id" | "created_at" | "updated_at">
  ) => {
    await onAddWeeklyTask({
      ...task,
      date: dateStr,
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

  // Meal Ideas Management
  const handleAddMealIdea = async () => {
    if (!newMealIdea.trim()) return;

    try {
      const newIdea = await mealIdeasApi.createMealIdea({
        name: newMealIdea.trim(),
        meal_type: newMealType,
      });
      setMealIdeas((prev) => [...prev, newIdea]);
      setNewMealIdea("");
    } catch (error) {
      console.error("Failed to add meal idea:", error);
    }
  };

  const handleDeleteMealIdea = async (id: number) => {
    try {
      await mealIdeasApi.deleteMealIdea(id);
      setMealIdeas((prev) => prev.filter((idea) => idea.id !== id));

      // Clear any daily meal selections using this idea
      setWeeklyMeals((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((date) => {
          Object.keys(updated[date] || {}).forEach((mealType) => {
            if (updated[date][mealType as MealType]?.meal_id === id) {
              delete updated[date][mealType as MealType];
            }
          });
        });
        return updated;
      });
    } catch (error) {
      console.error("Failed to delete meal idea:", error);
    }
  };

  const handleDailyMealChange = async (
    date: string,
    mealType: MealType,
    mealId?: number
  ) => {
    try {
      console.log(`Updating ${mealType} for ${date} to meal ID:`, mealId);
      await dailyMealsApi.updateDailyMeal({
        date,
        meal_type: mealType,
        meal_id: mealId,
      });

      // Update local state
      setWeeklyMeals((prev) => {
        const updated = { ...prev };
        if (!updated[date]) updated[date] = {};

        if (mealId) {
          const mealIdea = mealIdeas.find((idea) => idea.id === mealId);
          updated[date][mealType] = {
            meal_id: mealId,
            meal_name: mealIdea?.name,
          };
        } else {
          delete updated[date][mealType];
        }

        return updated;
      });

      console.log(`Successfully updated ${mealType} for ${date}`);
    } catch (error) {
      console.error(`Failed to update daily ${mealType}:`, error);
      if (error instanceof Error && "response" in error) {
        console.error("API Response:", (error as any).response?.data);
      }
    }
  };

  // Group weekly tasks by date and sort by completion status then time
  const getTasksForDate = (dateStr: string): WeeklyTask[] => {
    const tasks = weeklyTasks.filter((task) => {
      // Normalize both dates to ensure consistent comparison
      const taskDate = task.date.split("T")[0]; // Remove time portion if present
      const targetDate = dateStr.split("T")[0]; // Remove time portion if present
      return taskDate === targetDate;
    });

    // Sort tasks: incomplete tasks first (by time), then completed tasks (by time)
    return tasks.sort((a, b) => {
      // First sort by completion status (incomplete tasks first)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1; // false (incomplete) comes before true (completed)
      }

      // Then sort by time within the same completion status
      const aFromTime = a.from_time || "99:99";
      const bFromTime = b.from_time || "99:99";
      const aToTime = a.to_time || "99:99";
      const bToTime = b.to_time || "99:99";

      if (aFromTime !== bFromTime) {
        return aFromTime.localeCompare(bFromTime);
      }
      return aToTime.localeCompare(bToTime);
    });
  };

  // Clear all tasks (for debugging/testing)
  const handleClearAllTasks = async () => {
    if (
      !confirm(
        "⚠️ This will delete ALL your weekly and recurring tasks. This cannot be undone. Are you sure?"
      )
    ) {
      return;
    }

    try {
      console.log("🗑️ Clearing all tasks...");
      const result = await weeklyTasksApi.clearAllTasks();
      console.log("✅ Clear result:", result);

      // Refresh the page data
      if (onTasksPopulated) {
        await onTasksPopulated();
      }

      // Reload local data
      setMealIdeas([]);
      setWeeklyMeals({});

      alert(`✅ Successfully cleared ${result.total_deleted} tasks`);
    } catch (error) {
      console.error("❌ Failed to clear tasks:", error);
      alert("❌ Failed to clear tasks. Check console for details.");
    }
  };

  // Migrate database (for debugging/testing)
  const handleMigrateDatabase = async () => {
    try {
      console.log("🚀 Running database migration...");
      const result = await weeklyTasksApi.migrateDatabase();
      console.log("✅ Migration result:", result);
      alert("✅ Database migration completed successfully");
    } catch (error) {
      console.error("❌ Failed to migrate database:", error);
      alert("❌ Failed to migrate database. Check console for details.");
    }
  };

  // Manually populate recurring tasks
  const handlePopulateRecurringTasks = async () => {
    if (isPopulating) return;

    setIsPopulating(true);
    const weekDays = getWeekDays();
    const startDate = formatDate(weekDays[0]);
    const endDate = formatDate(weekDays[weekDays.length - 1]);

    try {
      console.log("🔄 Manually populating recurring tasks");
      const populateResult = await recurringTasksApi.populateRecurringTasks({
        start_date: startDate,
        end_date: endDate,
      });

      console.log("📊 Populate result:", populateResult);

      if (populateResult.total_populated > 0 && onTasksPopulated) {
        await onTasksPopulated();
      }
    } catch (error) {
      console.error("❌ Failed to populate recurring tasks:", error);
      alert(
        "❌ Failed to populate recurring tasks. Check console for details."
      );
    } finally {
      setIsPopulating(false);
    }
  };

  const weekDays = getWeekDays();
  const today = new Date();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 sm:gap-0">
        <WeekNavigation
          currentWeekStart={currentWeekStart}
          onWeekChange={onWeekChange}
        />

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-2 items-center">
          {isPopulating && (
            <span className="text-xs text-blue-600 font-medium whitespace-nowrap">
              🔄 Populating tasks...
            </span>
          )}
          <button
            onClick={handlePopulateRecurringTasks}
            disabled={isPopulating}
            className="px-3 py-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 min-h-[36px] touch-manipulation"
            title="Populate recurring tasks for this week"
          >
            🔄 Populate
          </button>
          <button
            onClick={handleMigrateDatabase}
            className="px-3 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[36px] touch-manipulation"
            title="Run database migration (for debugging/testing)"
          >
            🔧 Migrate DB
          </button>
          <button
            onClick={handleClearAllTasks}
            className="px-3 py-2 text-xs bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[36px] touch-manipulation"
            title="Clear all tasks (for debugging/testing)"
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mt-6">
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
              lunchIdeas={mealIdeas.filter(
                (idea) => idea.meal_type === "lunch"
              )}
              selectedLunchId={weeklyMeals[dateStr]?.lunch?.meal_id}
              onLunchChange={(lunchId) =>
                handleDailyMealChange(dateStr, "lunch", lunchId)
              }
              breakfastIdeas={mealIdeas.filter(
                (idea) => idea.meal_type === "breakfast"
              )}
              selectedBreakfastId={weeklyMeals[dateStr]?.breakfast?.meal_id}
              onBreakfastChange={(breakfastId) =>
                handleDailyMealChange(dateStr, "breakfast", breakfastId)
              }
            />
          );
        })}
      </div>

      {/* Unified Meal Ideas Section */}
      <div className="mt-6 sm:mt-8">
        <div className="bg-blue-50 p-4 sm:p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">🍽️ Meal Ideas</h3>

          {/* Add New Meal Idea */}
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
            <select
              value={newMealType}
              onChange={(e) => setNewMealType(e.target.value as MealType)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
            >
              <option value="breakfast">🥐 Breakfast</option>
              <option value="lunch">🍽️ Lunch</option>
              <option value="dinner">🍖 Dinner</option>
              <option value="snack">🍪 Snack</option>
            </select>
            <input
              type="text"
              value={newMealIdea}
              onChange={(e) => setNewMealIdea(e.target.value)}
              placeholder="Add a new meal idea..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
              onKeyDown={(e) => e.key === "Enter" && handleAddMealIdea()}
            />
            <button
              onClick={handleAddMealIdea}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
            >
              Add
            </button>
          </div>

          {/* Meal Ideas Lists by Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map(
              (mealType) => {
                const typeIdeas = mealIdeas.filter(
                  (idea) => idea.meal_type === mealType
                );
                const mealEmojis = {
                  breakfast: "🥐",
                  lunch: "🍽️",
                  dinner: "🍖",
                  snack: "🍪",
                };
                const mealColors = {
                  breakfast: "bg-green-50 border-green-200",
                  lunch: "bg-yellow-50 border-yellow-200",
                  dinner: "bg-red-50 border-red-200",
                  snack: "bg-purple-50 border-purple-200",
                };

                return (
                  <div
                    key={mealType}
                    className={`p-4 rounded-lg border ${mealColors[mealType]}`}
                  >
                    <h4 className="font-medium mb-3 capitalize">
                      {mealEmojis[mealType]} {mealType} Ideas (
                      {typeIdeas.length})
                    </h4>

                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {typeIdeas.map((idea) => (
                        <div
                          key={idea.id}
                          className="flex items-center gap-1 bg-white px-3 py-1 rounded border text-sm"
                        >
                          <span>{idea.name}</span>
                          <button
                            onClick={() => handleDeleteMealIdea(idea.id)}
                            className="text-red-500 hover:text-red-700 text-lg leading-none"
                            title={`Delete ${mealType} idea`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    {typeIdeas.length === 0 && (
                      <p className="text-gray-500 text-sm italic">
                        No {mealType} ideas yet.
                      </p>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
      <RecurringTasks />
    </div>
  );
};

export default WeeklyPlanner;
