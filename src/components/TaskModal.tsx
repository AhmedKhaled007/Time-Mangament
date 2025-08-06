import React, { useState, useEffect } from 'react';
import type { WeeklyTask } from '../types';

interface TaskModalProps {
  title: string;
  task: WeeklyTask | null;
  onSave: (task: Omit<WeeklyTask, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({
  title,
  task,
  onSave,
  onCancel
}) => {
  const [taskText, setTaskText] = useState(task?.text || '');
  const [fromTime, setFromTime] = useState(task?.from_time || '');
  const [toTime, setToTime] = useState(task?.to_time || '');

  useEffect(() => {
    // Focus on task input when modal opens
    const input = document.getElementById('taskTextInput');
    if (input) {
      input.focus();
      if (task) {
        (input as HTMLInputElement).select();
      }
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (taskText.trim()) {
      const taskData: Omit<WeeklyTask, 'id' | 'created_at' | 'updated_at'> = {
        text: taskText.trim(),
        completed: task?.completed || false,
        date: task?.date || '',
      };
      
      if (fromTime) taskData.from_time = fromTime;
      if (toTime) taskData.to_time = toTime;
      
      await onSave(taskData);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-2xl p-8 min-w-96 max-w-lg shadow-2xl">
        <h3 className="text-xl font-bold mb-6 text-gray-800">{title}</h3>
        
        <form onSubmit={handleSubmit}>
          <input
            id="taskTextInput"
            type="text"
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            placeholder="Enter task description..."
            className="w-full p-3 border-2 border-gray-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="block mb-2 font-semibold text-gray-600">From:</label>
              <input
                type="time"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-2 font-semibold text-gray-600">To:</label>
              <input
                type="time"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {task ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;