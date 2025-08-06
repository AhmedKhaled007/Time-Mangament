import axios from 'axios';
import type {
  User,
  WeeklyTask,
  WeeklyTaskCreate,
  WeeklyTaskUpdate,
  Distraction,
  DistractionCreate,
  TaskStats,
  MealIdea,
  MealIdeaCreate,
  MealIdeaUpdate,
  DailyMeal,
  DailyMealUpdate,
  WeeklyMeals,
  MealType,
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

// Meal Ideas API (new unified approach)
export const mealIdeasApi = {
  // Get meal ideas (optionally filtered by meal type)
  getMealIdeas: (mealType?: MealType): Promise<MealIdea[]> => {
    const params = mealType ? { meal_type: mealType } : {};
    return api.get('/meal-ideas', { params }).then((response) => response.data);
  },

  // Create new meal idea
  createMealIdea: (mealIdea: MealIdeaCreate): Promise<MealIdea> =>
    api.post('/meal-ideas', mealIdea).then((response) => response.data),

  // Update meal idea
  updateMealIdea: (id: number, mealIdea: MealIdeaUpdate): Promise<MealIdea> =>
    api.put(`/meal-ideas/${id}`, mealIdea).then((response) => response.data),

  // Delete meal idea
  deleteMealIdea: (id: number): Promise<void> =>
    api.delete(`/meal-ideas/${id}`).then(() => undefined),
};

// Daily Meals API (new unified approach)
export const dailyMealsApi = {
  // Get daily meals for a specific date
  getDailyMeals: (date: string, mealType?: MealType): Promise<DailyMeal[]> => {
    const params: any = { date };
    if (mealType) params.meal_type = mealType;
    return api.get('/daily-meals', { params }).then((response) => response.data);
  },

  // Get weekly meals (returns grouped structure)
  getWeeklyMeals: (startDate: string, endDate: string, mealType?: MealType): Promise<WeeklyMeals> => {
    const params: any = { start_date: startDate, end_date: endDate };
    if (mealType) params.meal_type = mealType;
    return api.get('/daily-meals', { params }).then((response) => response.data);
  },

  // Update daily meal selection
  updateDailyMeal: (dailyMeal: DailyMealUpdate): Promise<{ message: string; date: string; meal_type: string; meal_id?: number }> =>
    api.put('/daily-meals', dailyMeal).then((response) => response.data),

  // Remove daily meal selection
  removeDailyMeal: (date: string, mealType: MealType): Promise<{ message: string }> =>
    api.delete('/daily-meals', { data: { date, meal_type: mealType } }).then((response) => response.data),
};


export default api;