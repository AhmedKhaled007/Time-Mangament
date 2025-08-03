import axios from 'axios';
import type {
  WeeklyTask,
  WeeklyTaskCreate,
  WeeklyTaskUpdate,
  Distraction,
  DistractionCreate,
  TaskStats,
  ObsidianSettings,
  SyncResult,
  LunchIdea,
  LunchIdeaCreate,
  LunchIdeaUpdate,
  DailyLunch,
  BreakfastIdea,
  BreakfastIdeaCreate,
  BreakfastIdeaUpdate,
  DailyBreakfast,
} from '../types';

// Auto-detect API base URL based on environment
const getApiBaseUrl = () => {
  // Check if we're in Docker by looking at the hostname/port
  const isDocker = window.location.port === '5000';
  
  if (isDocker) {
    // In Docker, both frontend and backend are accessible from the host
    return 'http://127.0.0.1:8000/api/v1';
  }
  
  // For local development with Vite proxy
  return '/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for debugging
api.interceptors.request.use((config) => {
  console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Task Statistics API
export const tasksApi = {
  // Get task statistics
  getStats: (): Promise<TaskStats> =>
    api.get('/tasks/stats').then((response) => response.data),
};

// Weekly Tasks API
export const weeklyTasksApi = {
  // Get weekly tasks (optionally by date)
  getWeeklyTasks: (date?: string): Promise<WeeklyTask[]> => {
    const params = date ? { date } : {};
    return api.get('/tasks/weekly', { params }).then((response) => response.data);
  },

  // Create new weekly task
  createWeeklyTask: (task: WeeklyTaskCreate): Promise<WeeklyTask> =>
    api.post('/tasks/weekly', task).then((response) => response.data),

  // Update weekly task
  updateWeeklyTask: (id: number, task: WeeklyTaskUpdate): Promise<WeeklyTask> =>
    api.put(`/tasks/weekly/${id}`, task).then((response) => response.data),

  // Toggle weekly task completion
  toggleWeeklyTask: (id: number): Promise<WeeklyTask> =>
    api.post(`/tasks/weekly/${id}/toggle`).then((response) => response.data),

  // Delete weekly task
  deleteWeeklyTask: (id: number): Promise<void> =>
    api.delete(`/tasks/weekly/${id}`).then(() => undefined),
};

// Distractions API
export const distractionsApi = {
  // Get all distractions
  getDistractions: (): Promise<Distraction[]> =>
    api.get('/tasks/distractions').then((response) => response.data),

  // Log new distraction
  logDistraction: (distraction: DistractionCreate): Promise<Distraction> =>
    api.post('/tasks/distractions', distraction).then((response) => response.data),
};

// Obsidian Integration API
export const obsidianApi = {
  // Set vault path
  setVaultPath: (path: string): Promise<SyncResult> =>
    api.post('/obsidian/set-path', { path }).then((response) => response.data),

  // Get sync status
  getSyncStatus: (): Promise<ObsidianSettings> =>
    api.get('/obsidian/status').then((response) => response.data),

  // Manual sync
  manualSync: (): Promise<SyncResult> =>
    api.post('/obsidian/sync').then((response) => response.data),

  // Get content preview
  getContent: (): Promise<{ success: boolean; content: string; generated_at?: string }> =>
    api.get('/obsidian/content').then((response) => response.data),

  // Import from Obsidian
  importFromObsidian: (): Promise<SyncResult> =>
    api.post('/obsidian/import').then((response) => response.data),

  // Clear settings
  clearSettings: (): Promise<{ message: string; auto_sync_enabled: boolean }> =>
    api.delete('/obsidian/clear').then((response) => response.data),
};

// Lunch Ideas API
export const lunchIdeasApi = {
  // Get all lunch ideas
  getLunchIdeas: (): Promise<LunchIdea[]> =>
    api.get('/tasks/lunch-ideas').then((response) => response.data),

  // Create new lunch idea
  createLunchIdea: (lunchIdea: LunchIdeaCreate): Promise<LunchIdea> =>
    api.post('/tasks/lunch-ideas', lunchIdea).then((response) => response.data),

  // Update lunch idea
  updateLunchIdea: (id: number, lunchIdea: LunchIdeaUpdate): Promise<LunchIdea> =>
    api.put(`/tasks/lunch-ideas/${id}`, lunchIdea).then((response) => response.data),

  // Delete lunch idea
  deleteLunchIdea: (id: number): Promise<void> =>
    api.delete(`/tasks/lunch-ideas/${id}`).then(() => undefined),

  // Get daily lunch selection
  getDailyLunch: (date: string): Promise<DailyLunch> =>
    api.get(`/tasks/weekly/${date}/lunch`).then((response) => response.data),

  // Update daily lunch selection
  updateDailyLunch: (date: string, lunchId?: number): Promise<{ message: string; date: string; lunch_id?: number }> =>
    api.put(`/tasks/weekly/${date}/lunch`, { lunch_id: lunchId }).then((response) => response.data),
};

// Breakfast Ideas API
export const breakfastIdeasApi = {
  // Get all breakfast ideas
  getBreakfastIdeas: (): Promise<BreakfastIdea[]> =>
    api.get('/tasks/breakfast-ideas').then((response) => response.data),

  // Create new breakfast idea
  createBreakfastIdea: (breakfastIdea: BreakfastIdeaCreate): Promise<BreakfastIdea> =>
    api.post('/tasks/breakfast-ideas', breakfastIdea).then((response) => response.data),

  // Update breakfast idea
  updateBreakfastIdea: (id: number, breakfastIdea: BreakfastIdeaUpdate): Promise<BreakfastIdea> =>
    api.put(`/tasks/breakfast-ideas/${id}`, breakfastIdea).then((response) => response.data),

  // Delete breakfast idea
  deleteBreakfastIdea: (id: number): Promise<void> =>
    api.delete(`/tasks/breakfast-ideas/${id}`).then(() => undefined),

  // Get daily breakfast selection
  getDailyBreakfast: (date: string): Promise<DailyBreakfast> =>
    api.get(`/tasks/weekly/${date}/breakfast`).then((response) => response.data),

  // Update daily breakfast selection
  updateDailyBreakfast: (date: string, breakfastId?: number): Promise<{ message: string; date: string; breakfast_id?: number }> =>
    api.put(`/tasks/weekly/${date}/breakfast`, { breakfast_id: breakfastId }).then((response) => response.data),
};

// Health check
export const healthCheck = (): Promise<{ status: string; message: string }> =>
  api.get('/health', { baseURL: 'http://127.0.0.1:8000' }).then((response) => response.data);

export default api;