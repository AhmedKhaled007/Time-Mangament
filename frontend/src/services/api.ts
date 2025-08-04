import axios from 'axios';
import type {
  User,
  WeeklyTask,
  WeeklyTaskCreate,
  WeeklyTaskUpdate,
  Distraction,
  DistractionCreate,
  TaskStats,
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
  // Use environment variable if available
  if (import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Check if we're in production (Netlify deployment)
  if (import.meta.env?.PROD) {
    // In production, use Netlify functions
    return '/.netlify/functions';
  }
  
  // For local development with Netlify dev
  return '/.netlify/functions';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication and debugging
api.interceptors.request.use((config) => {
  console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
  
  // Add authentication token if available
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
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

// Authentication API
export const authApi = {
  // Google OAuth login
  googleLogin: (idToken: string): Promise<{ user: User; token: string; message: string }> =>
    api.post('/auth/google', { idToken }).then((response) => response.data),
  
  // Verify JWT token
  verifyToken: (token: string): Promise<{ user: User; valid: boolean }> =>
    api.post('/auth/verify', { token }).then((response) => response.data),
  
  // Logout
  logout: (): Promise<{ message: string }> =>
    api.post('/auth/logout').then((response) => response.data),
};

// Task Statistics API
export const tasksApi = {
  // Get task statistics
  getStats: (): Promise<TaskStats> =>
    api.get('/stats').then((response) => response.data),
};

// Weekly Tasks API
export const weeklyTasksApi = {
  // Get weekly tasks (optionally by date)
  getWeeklyTasks: (date?: string): Promise<WeeklyTask[]> => {
    const params = date ? { date } : {};
    return api.get('/weekly-tasks', { params }).then((response) => response.data);
  },

  // Create new weekly task
  createWeeklyTask: (task: WeeklyTaskCreate): Promise<WeeklyTask> =>
    api.post('/weekly-tasks', task).then((response) => response.data),

  // Update weekly task
  updateWeeklyTask: (id: number, task: WeeklyTaskUpdate): Promise<WeeklyTask> =>
    api.put(`/weekly-tasks/${id}`, task).then((response) => response.data),

  // Toggle weekly task completion
  toggleWeeklyTask: (id: number): Promise<WeeklyTask> =>
    api.post(`/weekly-tasks/${id}/toggle`).then((response) => response.data),

  // Delete weekly task
  deleteWeeklyTask: (id: number): Promise<void> =>
    api.delete(`/weekly-tasks/${id}`).then(() => undefined),
};

// Distractions API
export const distractionsApi = {
  // Get all distractions
  getDistractions: (): Promise<Distraction[]> =>
    api.get('/distractions').then((response) => response.data),

  // Log new distraction
  logDistraction: (distraction: DistractionCreate): Promise<Distraction> =>
    api.post('/distractions', distraction).then((response) => response.data),
};

// Note: Obsidian Integration is not available in serverless mode
// File system access is not supported in serverless functions
export const obsidianApi = {
  setVaultPath: () => Promise.reject(new Error('Obsidian integration not available in serverless mode')),
  getSyncStatus: () => Promise.reject(new Error('Obsidian integration not available in serverless mode')),
  manualSync: () => Promise.reject(new Error('Obsidian integration not available in serverless mode')),
  getContent: () => Promise.reject(new Error('Obsidian integration not available in serverless mode')),
  importFromObsidian: () => Promise.reject(new Error('Obsidian integration not available in serverless mode')),
  clearSettings: () => Promise.reject(new Error('Obsidian integration not available in serverless mode')),
};

// Lunch Ideas API
export const lunchIdeasApi = {
  // Get all lunch ideas
  getLunchIdeas: (): Promise<LunchIdea[]> =>
    api.get('/lunch-ideas').then((response) => response.data),

  // Create new lunch idea
  createLunchIdea: (lunchIdea: LunchIdeaCreate): Promise<LunchIdea> =>
    api.post('/lunch-ideas', lunchIdea).then((response) => response.data),

  // Update lunch idea
  updateLunchIdea: (id: number, lunchIdea: LunchIdeaUpdate): Promise<LunchIdea> =>
    api.put(`/lunch-ideas/${id}`, lunchIdea).then((response) => response.data),

  // Delete lunch idea
  deleteLunchIdea: (id: number): Promise<void> =>
    api.delete(`/lunch-ideas/${id}`).then(() => undefined),

  // Get daily lunch selection
  getDailyLunch: (date: string): Promise<DailyLunch> =>
    api.get(`/daily-lunch/${date}`).then((response) => response.data),

  // Update daily lunch selection
  updateDailyLunch: (date: string, lunchId?: number): Promise<{ message: string; date: string; lunch_id?: number }> =>
    api.put(`/daily-lunch/${date}`, { lunch_id: lunchId }).then((response) => response.data),
};

// Breakfast Ideas API
export const breakfastIdeasApi = {
  // Get all breakfast ideas
  getBreakfastIdeas: (): Promise<BreakfastIdea[]> =>
    api.get('/breakfast-ideas').then((response) => response.data),

  // Create new breakfast idea
  createBreakfastIdea: (breakfastIdea: BreakfastIdeaCreate): Promise<BreakfastIdea> =>
    api.post('/breakfast-ideas', breakfastIdea).then((response) => response.data),

  // Update breakfast idea
  updateBreakfastIdea: (id: number, breakfastIdea: BreakfastIdeaUpdate): Promise<BreakfastIdea> =>
    api.put(`/breakfast-ideas/${id}`, breakfastIdea).then((response) => response.data),

  // Delete breakfast idea
  deleteBreakfastIdea: (id: number): Promise<void> =>
    api.delete(`/breakfast-ideas/${id}`).then(() => undefined),

  // Get daily breakfast selection
  getDailyBreakfast: (date: string): Promise<DailyBreakfast> =>
    api.get(`/daily-breakfast/${date}`).then((response) => response.data),

  // Update daily breakfast selection
  updateDailyBreakfast: (date: string, breakfastId?: number): Promise<{ message: string; date: string; breakfast_id?: number }> =>
    api.put(`/daily-breakfast/${date}`, { breakfast_id: breakfastId }).then((response) => response.data),
};

export default api;