// API Types
export interface Task {
  id: number;
  text: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  text: string;
  priority?: 'high' | 'medium' | 'low';
  completed?: boolean;
}

export interface TaskUpdate {
  text?: string;
  priority?: 'high' | 'medium' | 'low';
  completed?: boolean;
}

export interface WeeklyTask {
  id: number;
  text: string;
  completed: boolean;
  from_time?: string; // HH:MM format
  to_time?: string;   // HH:MM format
  date: string;       // YYYY-MM-DD format
  lunch_id?: number;  // References LunchIdea.id
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
}

export interface LunchIdea {
  id: number;
  name: string;
  created_at: string;
}

export interface LunchIdeaCreate {
  name: string;
}

export interface LunchIdeaUpdate {
  name?: string;
}

export interface DailyLunch {
  date: string;
  lunch_id?: number;
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
  total_daily_tasks: number;
  completed_daily_tasks: number;
  total_weekly_tasks: number;
  completed_weekly_tasks: number;
  total_distractions: number;
  productivity_score: number;
}

// Obsidian Types
export interface ObsidianSettings {
  vault_path?: string;
  auto_sync_enabled: boolean;
  last_sync?: string;
  file_exists: boolean;
}

export interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  file_path?: string;
  last_sync?: string;
  imported_count?: number;
}


// UI Types
export type TabType = 'daily' | 'weekly';

export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}