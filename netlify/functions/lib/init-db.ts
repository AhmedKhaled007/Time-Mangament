import { createDbClient } from './db';

// Database initialization function - ensures all tables exist
export async function initializeDatabase(): Promise<void> {
  const sql = createDbClient();
  
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        picture VARCHAR(500),
        locale VARCHAR(10) DEFAULT 'en',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create weekly tasks table
    await sql`
      CREATE TABLE IF NOT EXISTS weekly_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text VARCHAR(500) NOT NULL,
        date DATE NOT NULL,
        from_time TIME,
        to_time TIME,
        completed BOOLEAN DEFAULT FALSE,
        priority VARCHAR(10) DEFAULT 'medium',
        ticktick_id VARCHAR(100),
        project_id VARCHAR(100),
        recurring_tasks_id INTEGER REFERENCES recurring_tasks(id) ON DELETE SET NULL DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create distractions table
    await sql`
      CREATE TABLE IF NOT EXISTS distractions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text VARCHAR(500) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create meal ideas table (replaces lunch_ideas and breakfast_ideas)
    await sql`
      CREATE TABLE IF NOT EXISTS meal_ideas (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create daily meals table (replaces daily_lunches and daily_breakfasts)
    await sql`
      CREATE TABLE IF NOT EXISTS daily_meals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
        meal_id INTEGER REFERENCES meal_ideas(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date, meal_type)
      )
    `;

    // Create recurring tasks table for daily recurring tasks
    await sql`
      CREATE TABLE IF NOT EXISTS recurring_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text VARCHAR(500) NOT NULL,
        from_time TIME,
        to_time TIME,
        priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        category VARCHAR(100),
        weekdays INTEGER[] NOT NULL DEFAULT '{}', -- Array of weekday numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create table to track populated recurring tasks to prevent duplicates
  
    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_weekly_tasks_user_id ON weekly_tasks(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_weekly_tasks_user_date ON weekly_tasks(user_id, date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_weekly_tasks_completed ON weekly_tasks(completed)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_distractions_user_id ON distractions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_distractions_created_at ON distractions(created_at)`;
    
    // New meal table indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_meal_ideas_user_id ON meal_ideas(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_meal_ideas_user_type ON meal_ideas(user_id, meal_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_meals_user_date ON daily_meals(user_id, date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_meals_user_date_type ON daily_meals(user_id, date, meal_type)`;
    
    // Recurring tasks table indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_recurring_tasks_user_id ON recurring_tasks(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_recurring_tasks_user_active ON recurring_tasks(user_id, is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_recurring_tasks_weekdays ON recurring_tasks(weekdays)`;

    // Create update function
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language plpgsql
    `;

    // Create triggers for updated_at columns
    await sql`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_weekly_tasks_updated_at') THEN
              CREATE TRIGGER update_weekly_tasks_updated_at BEFORE UPDATE ON weekly_tasks
                  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
      END $$
    `;

    // Create trigger for new daily_meals table
    await sql`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_daily_meals_updated_at') THEN
              CREATE TRIGGER update_daily_meals_updated_at BEFORE UPDATE ON daily_meals
                  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
      END $$
    `;

    // Create trigger for recurring_tasks table
    await sql`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_recurring_tasks_updated_at') THEN
              CREATE TRIGGER update_recurring_tasks_updated_at BEFORE UPDATE ON recurring_tasks
                  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
      END $$
    `;

    await sql`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
              CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
                  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
      END $$
    `;


    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Helper function to ensure database is initialized (call from functions)
export async function ensureDbInitialized(): Promise<void> {
  try {
    await initializeDatabase();
  } catch (error) {
    // Log error but don't throw - let the function continue
    console.error('Database initialization warning:', error);
  }
}