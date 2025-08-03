import React, { useState } from 'react';
import type { WeeklyTask, LunchIdea, BreakfastIdea } from '../types';
import TaskModal from './TaskModal';

interface DayCardProps {
  date: Date;
  dayName: string;
  isToday: boolean;
  tasks: WeeklyTask[];
  onAddTask: (task: Omit<WeeklyTask, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onToggleTask: (taskId: number) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onEditTask: (taskId: number, task: Partial<WeeklyTask>) => Promise<void>;
  lunchIdeas: LunchIdea[];
  selectedLunchId?: number;
  onLunchChange: (lunchId?: number) => void;
  breakfastIdeas: BreakfastIdea[];
  selectedBreakfastId?: number;
  onBreakfastChange: (breakfastId?: number) => void;
}

const DayCard: React.FC<DayCardProps> = ({
  date,
  dayName,
  isToday,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onEditTask,
  lunchIdeas,
  selectedLunchId,
  onLunchChange,
  breakfastIdeas,
  selectedBreakfastId,
  onBreakfastChange
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<WeeklyTask | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    taskId: number;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, taskId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      taskId
    });
  };

  const hideContextMenu = () => {
    setContextMenu(null);
  };

  const handleEdit = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setEditingTask(task);
    }
    hideContextMenu();
  };

  const handleDelete = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && window.confirm(`Are you sure you want to delete this task?\n\n"${task.text}"`)) {
      onDeleteTask(taskId);
    }
    hideContextMenu();
  };


  React.useEffect(() => {
    const handleClick = () => hideContextMenu();
    if (contextMenu?.visible) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu?.visible]);

  return (
    <>
      <div className={`day-card ${isToday ? 'today' : ''}`}>
        <div className="day-header">
          {dayName} {date.getDate()}
        </div>
        
        {/* Breakfast Selection */}
        <div className="breakfast-selection mb-3 flex items-center gap-2">
          <span className="text-lg">🥐</span>
          <select
            value={selectedBreakfastId || ''}
            onChange={(e) => onBreakfastChange(e.target.value ? parseInt(e.target.value) : undefined)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">No breakfast selected</option>
            {breakfastIdeas.map((idea) => (
              <option key={idea.id} value={idea.id}>
                {idea.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Lunch Selection */}
        <div className="lunch-selection mb-4 flex items-center gap-2">
          <span className="text-lg">🍽️</span>
          <select
            value={selectedLunchId || ''}
            onChange={(e) => onLunchChange(e.target.value ? parseInt(e.target.value) : undefined)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="">No lunch selected</option>
            {lunchIdeas.map((idea) => (
              <option key={idea.id} value={idea.id}>
                {idea.name}
              </option>
            ))}
          </select>
        </div>

        {/* Separator line between meals and tasks */}
        <hr className="border-gray-200 my-4" />

        <div className="space-y-3 mb-4 min-h-[60px]">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div
                key={task.id}
                className={`group relative bg-white border-l-4 ${
                  task.completed 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-blue-500 hover:border-blue-600'
                } rounded-r-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer`}
                onClick={() => onToggleTask(task.id)}
                onContextMenu={(e) => handleContextMenu(e, task.id)}
              >
                <div className="flex items-start gap-3 p-3">
                  {/* Checkbox */}
                  <div className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center ${
                    task.completed 
                      ? 'bg-green-500 border-green-500' 
                      : 'border-gray-300 group-hover:border-blue-500'
                  }`}>
                    {task.completed && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </div>
                  
                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {task.from_time || task.to_time ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              ⏰ {task.from_time || '--:--'} - {task.to_time || '--:--'}
                            </span>
                          </div>
                          <div className="font-medium">{task.text}</div>
                        </div>
                      ) : (
                        <div className="font-medium">{task.text}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Menu indicator - clickable 3 dots */}
                  <div 
                    className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering task toggle
                      handleContextMenu(e, task.id);
                    }}
                    title="Task options"
                  >
                    <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                    </svg>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-xs">No tasks yet</p>
              </div>
            </div>
          )}
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Task
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu?.visible && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[140px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
            onClick={() => handleEdit(contextMenu.taskId)}
          >
            ✏️ Edit Task
          </div>
          <div
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer flex items-center gap-2"
            onClick={() => handleDelete(contextMenu.taskId)}
          >
            🗑️ Delete Task
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <TaskModal
          title="Add Task"
          task={null}
          onSave={async (taskData) => {
            setShowAddModal(false);
            await onAddTask(taskData);
          }}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskModal
          title="Edit Task"
          task={editingTask}
          onSave={async (taskData) => {
            setEditingTask(null);
            await onEditTask(editingTask.id, taskData);
          }}
          onCancel={() => setEditingTask(null)}
        />
      )}
    </>
  );
};

export default DayCard;