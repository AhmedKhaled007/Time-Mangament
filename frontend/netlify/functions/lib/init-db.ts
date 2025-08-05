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

    // Create lunch ideas table
    await sql`
      CREATE TABLE IF NOT EXISTS lunch_ideas (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create breakfast ideas table
    await sql`
      CREATE TABLE IF NOT EXISTS breakfast_ideas (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create daily lunches table
    await sql`
      CREATE TABLE IF NOT EXISTS daily_lunches (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        lunch_id INTEGER REFERENCES lunch_ideas(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      )
    `;

    // Create daily breakfasts table
    await sql`
      CREATE TABLE IF NOT EXISTS daily_breakfasts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        breakfast_id INTEGER REFERENCES breakfast_ideas(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      )
    `;

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_weekly_tasks_user_id ON weekly_tasks(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_weekly_tasks_user_date ON weekly_tasks(user_id, date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_weekly_tasks_completed ON weekly_tasks(completed)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_distractions_user_id ON distractions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_distractions_created_at ON distractions(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_lunch_ideas_user_id ON lunch_ideas(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_breakfast_ideas_user_id ON breakfast_ideas(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_lunches_user_date ON daily_lunches(user_id, date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_breakfasts_user_date ON daily_breakfasts(user_id, date)`;

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

    await sql`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_daily_lunches_updated_at') THEN
              CREATE TRIGGER update_daily_lunches_updated_at BEFORE UPDATE ON daily_lunches
                  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
      END $$
    `;

    await sql`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_daily_breakfasts_updated_at') THEN
              CREATE TRIGGER update_daily_breakfasts_updated_at BEFORE UPDATE ON daily_breakfasts
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