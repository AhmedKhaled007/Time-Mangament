import React, { useState, useEffect } from 'react';
import { recurringTasksApi } from '../services/api';
import type { RecurringTask, RecurringTaskCreate, Priority, Weekday } from '../types';

const RecurringTasks: React.FC = () => {
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);

  // Form state
  const [formData, setFormData] = useState<RecurringTaskCreate & { is_active?: boolean }>({
    text: '',
    from_time: '',
    to_time: '',
    priority: 'medium',
    category: '',
    weekdays: [],
    is_active: true
  });

  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    loadRecurringTasks();
  }, []);

  const loadRecurringTasks = async () => {
    try {
      setLoading(true);
      const tasks = await recurringTasksApi.getRecurringTasks();
      setRecurringTasks(tasks);
      setError(null);
    } catch (err) {
      console.error('Failed to load recurring tasks:', err);
      setError('Failed to load recurring tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text.trim() || formData.weekdays.length === 0) {
      setError('Task text and at least one weekday are required');
      return;
    }

    try {
      setError(null);
      if (editingTask) {
        // Update existing task
        const updatedTask = await recurringTasksApi.updateRecurringTask(editingTask.id, formData);
        setRecurringTasks(prev => prev.map(task => task.id === editingTask.id ? updatedTask : task));
      } else {
        // Create new task
        const newTask = await recurringTasksApi.createRecurringTask({
          text: formData.text,
          from_time: formData.from_time || undefined,
          to_time: formData.to_time || undefined,
          priority: formData.priority,
          category: formData.category || undefined,
          weekdays: formData.weekdays
        });
        setRecurringTasks(prev => [newTask, ...prev]);
      }

      // Reset form
      setFormData({
        text: '',
        from_time: '',
        to_time: '',
        priority: 'medium',
        category: '',
        weekdays: [],
        is_active: true
      });
      setShowCreateForm(false);
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to save recurring task:', err);
      setError('Failed to save recurring task');
    }
  };

  const handleEdit = (task: RecurringTask) => {
    setEditingTask(task);
    setFormData({
      text: task.text,
      from_time: task.from_time || '',
      to_time: task.to_time || '',
      priority: task.priority,
      category: task.category || '',
      weekdays: task.weekdays,
      is_active: task.is_active
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this recurring task? This will also remove all future instances.')) {
      return;
    }

    try {
      await recurringTasksApi.deleteRecurringTask(taskId);
      setRecurringTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (err) {
      console.error('Failed to delete recurring task:', err);
      setError('Failed to delete recurring task');
    }
  };

  const toggleTaskActive = async (task: RecurringTask) => {
    try {
      const updatedTask = await recurringTasksApi.updateRecurringTask(task.id, { is_active: !task.is_active });
      setRecurringTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    } catch (err) {
      console.error('Failed to toggle task:', err);
      setError('Failed to update task status');
    }
  };

  const handleWeekdayToggle = (day: Weekday) => {
    setFormData(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(day)
        ? prev.weekdays.filter(d => d !== day)
        : [...prev.weekdays, day].sort()
    }));
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const cancelForm = () => {
    setShowCreateForm(false);
    setEditingTask(null);
    setFormData({
      text: '',
      from_time: '',
      to_time: '',
      priority: 'medium',
      category: '',
      weekdays: [],
      is_active: true
    });
    setError(null);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recurring Daily Tasks</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={showCreateForm}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          + Add Recurring Task
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button 
            onClick={() => setError(null)}
            className="float-right font-bold text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            {editingTask ? 'Edit Recurring Task' : 'Create New Recurring Task'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Description *
              </label>
              <input
                type="text"
                value={formData.text}
                onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Enter task description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Time
                </label>
                <input
                  type="time"
                  value={formData.from_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, from_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Time
                </label>
                <input
                  type="time"
                  value={formData.to_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, to_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category (Optional)
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Work, Personal, Health..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repeat on Days *
              </label>
              <div className="flex flex-wrap gap-2">
                {weekdayNames.map((name, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleWeekdayToggle(index as Weekday)}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      formData.weekdays.includes(index as Weekday)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {weekdayAbbr[index]}
                  </button>
                ))}
              </div>
            </div>

            {editingTask && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active (task will be automatically added to weekly planner)
                </label>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-4">
        {recurringTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg mb-2">No recurring tasks yet</p>
            <p>Create your first recurring task to automatically populate your weekly planner!</p>
          </div>
        ) : (
          recurringTasks.map((task) => (
            <div
              key={task.id}
              className={`border rounded-lg p-4 ${task.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{task.text}</h3>
                  {task.category && (
                    <p className="text-sm text-gray-600 mt-1">Category: {task.category}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority.toUpperCase()}
                  </span>
                  {!task.is_active && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                      INACTIVE
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                {(task.from_time || task.to_time) && (
                  <div className="flex items-center">
                    <span className="font-medium">Time:</span>
                    <span className="ml-1">
                      {task.from_time && task.to_time ? `${task.from_time} - ${task.to_time}` : 
                       task.from_time ? `From ${task.from_time}` : 
                       task.to_time ? `Until ${task.to_time}` : ''}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center">
                  <span className="font-medium">Days:</span>
                  <div className="flex gap-1 ml-2">
                    {task.weekdays.map(day => (
                      <span key={day} className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                        {weekdayAbbr[day]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Created: {new Date(task.created_at).toLocaleDateString()}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleTaskActive(task)}
                    className={`px-3 py-1 rounded text-sm ${
                      task.is_active 
                        ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' 
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {task.is_active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleEdit(task)}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecurringTasks;