// User & Authentication Types
export interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  picture?: string;
  locale?: string;
  created_at: string;
  updated_at: string;
  last_login: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
}

export interface GoogleTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  at_hash: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
  iat: number;
  exp: number;
}

// API Types

export interface WeeklyTask {
  id: number;
  text: string;
  completed: boolean;
  from_time?: string; // HH:MM format
  to_time?: string;   // HH:MM format
  date: string;       // YYYY-MM-DD format
  priority?: string;  // 'low', 'medium', 'high'
  lunch_id?: number;  // References LunchIdea.id
  breakfast_id?: number;  // References BreakfastIdea.id
  created_at: string;
  updated_at: string;
}

export interface WeeklyTaskCreate {
  text: string;
  completed?: boolean;
  from_time?: string;
  to_time?: string;
  date: string;
}

export interface WeeklyTaskUpdate {
  text?: string;
  completed?: boolean;
  from_time?: string;
  to_time?: string;
  lunch_id?: number;
  breakfast_id?: number;
}

// Recurring Tasks Types
export type Priority = 'low' | 'medium' | 'high';
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday, 1=Monday, ..., 6=Saturday

export interface RecurringTask {
  id: number;
  text: string;
  from_time?: string; // HH:MM format
  to_time?: string;   // HH:MM format
  priority: Priority;
  category?: string;
  weekdays: Weekday[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringTaskCreate {
  text: string;
  from_time?: string;
  to_time?: string;
  priority?: Priority;
  category?: string;
  weekdays: Weekday[];
}

export interface RecurringTaskUpdate {
  text?: string;
  from_time?: string;
  to_time?: string;
  priority?: Priority;
  category?: string;
  weekdays?: Weekday[];
  is_active?: boolean;
}


export interface PopulateRecurringTasksRequest {
  start_date: string; // YYYY-MM-DD format
  end_date: string;   // YYYY-MM-DD format
}

export interface PopulatedTaskResult {
  recurring_task_id: number;
  weekly_task: WeeklyTask;
  date: string;
}

export interface PopulateRecurringTasksResponse {
  message: string;
  total_populated: number;
  populated_tasks: PopulatedTaskResult[];
}

// Meal Types (replaces LunchIdea and BreakfastIdea)
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealIdea {
  id: number;
  name: string;
  meal_type: MealType;
  created_at: string;
}

export interface MealIdeaCreate {
  name: string;
  meal_type: MealType;
}

export interface MealIdeaUpdate {
  name?: string;
  meal_type?: MealType;
}

// Daily Meals (replaces DailyLunch and DailyBreakfast)
export interface DailyMeal {
  date: string;
  meal_type: MealType;
  meal_id?: number;
  meal_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DailyMealUpdate {
  date: string;
  meal_type: MealType;
  meal_id?: number;
}

// Weekly meals structure for easier frontend consumption
export interface WeeklyMeals {
  [date: string]: {
    [mealType in MealType]?: {
      meal_id?: number;
      meal_name?: string;
      created_at?: string;
      updated_at?: string;
    };
  };
}


export interface Distraction {
  id: number;
  text: string;
  time: string;
  created_at: string;
}

export interface DistractionCreate {
  text: string;
  time?: string;
}

// Timer Types
export type TimerStatus = 'ready' | 'running' | 'paused' | 'completed';

export interface TimerState {
  status: TimerStatus;
  timeLeft: number; // seconds
  isBreak: boolean;
  sessionsCompleted: number;
  currentSession: number;
  startedAt?: string;
  pausedAt?: string;
}

export interface TimerSettings {
  workDuration: number;    // minutes
  breakDuration: number;   // minutes
  longBreakDuration: number; // minutes
  sessionsUntilLongBreak: number;
}

// Stats Types
export interface TaskStats {
  total_weekly_tasks: number;
  completed_weekly_tasks: number;
  total_distractions: number;
  productivity_score: number;
}

// Obsidian Types
export interface ObsidianSettings {
  vault_path?: string;
  vault_folder_path?: string;
  auto_sync_enabled: boolean;
  last_sync?: string;
  file_exists: boolean;
  current_file_name?: string;
  current_file_path?: string;
}

export interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  file_path?: string;
  last_sync?: string;
  imported_count?: number;
}


// TickTick Types
export interface TickTickSettings {
  enabled: boolean;
  access_token: string | null;
  default_project_id: string | null;
  username: string | null;
}

export interface TickTickProject {
  id: string;
  name: string;
}

export interface TickTickSyncResult {
  imported: number;
  exported: number;
  errors: string[];
  success: boolean;
}

// UI Types
export type TabType = 'pomodoro' | 'weekly' | 'recurring' | 'settings';

export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}