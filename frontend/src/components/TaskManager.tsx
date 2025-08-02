import React, { useState } from 'react';
import type { Task } from '../types';

interface TaskManagerProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onToggleTask: (id: number) => Promise<void>;
  onDeleteTask: (id: number) => Promise<void>;
}

const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask
}) => {
  const [taskText, setTaskText] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (taskText.trim()) {
      await onAddTask({
        text: taskText.trim(),
        priority,
        completed: false
      });
      setTaskText('');
    }
  };

  const topTasks = tasks.slice(0, 3);

  const getPriorityEmoji = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
    }
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-6 text-gray-800 border-b-2 border-blue-500 pb-3">
        🎯 Today's Top 3 Priorities
      </h3>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <input
          type="text"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          placeholder="Add a task..."
          className="input-field mb-4"
        />
        <div className="flex gap-3 mb-4">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Task['priority'])}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="high">🔴 High Priority</option>
            <option value="medium">🟡 Medium Priority</option>
            <option value="low">🟢 Low Priority</option>
          </select>
          <button
            type="submit"
            className="btn-primary"
          >
            Add
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {topTasks.map((task) => (
          <div
            key={task.id}
            className={`task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`}
          >
            <span
              onClick={() => onToggleTask(task.id)}
              className="cursor-pointer flex-grow flex items-center"
            >
              {task.completed ? '✅' : '⭕'} {getPriorityEmoji(task.priority)} {task.text}
            </span>
            <button
              onClick={() => onDeleteTask(task.id)}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        ))}
        {topTasks.length === 0 && (
          <p className="text-gray-500 text-center py-4">No tasks yet. Add your first task!</p>
        )}
      </div>
    </div>
  );
};

export default TaskManager;