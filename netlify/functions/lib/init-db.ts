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

    // Create legacy tables for migration purposes (will be removed after migration)
    await sql`
      CREATE TABLE IF NOT EXISTS lunch_ideas (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS breakfast_ideas (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

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
    
    // New meal table indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_meal_ideas_user_id ON meal_ideas(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_meal_ideas_user_type ON meal_ideas(user_id, meal_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_meals_user_date ON daily_meals(user_id, date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_meals_user_date_type ON daily_meals(user_id, date, meal_type)`;
    
    // Legacy table indexes (for migration)
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

    // Legacy triggers (for migration)
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

    // Perform data migration from legacy tables to new unified tables
    await migrateLegacyMealData(sql);

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Data migration function to transfer legacy meal data to new unified tables
async function migrateLegacyMealData(sql: any): Promise<void> {
  try {
    console.log('Starting meal data migration...');

    // Migrate lunch ideas to meal_ideas
    await sql`
      INSERT INTO meal_ideas (user_id, name, meal_type, created_at)
      SELECT user_id, name, 'lunch', created_at
      FROM lunch_ideas li
      WHERE NOT EXISTS (
        SELECT 1 FROM meal_ideas mi 
        WHERE mi.user_id = li.user_id 
        AND mi.name = li.name 
        AND mi.meal_type = 'lunch'
      )
    `;

    // Migrate breakfast ideas to meal_ideas
    await sql`
      INSERT INTO meal_ideas (user_id, name, meal_type, created_at)
      SELECT user_id, name, 'breakfast', created_at
      FROM breakfast_ideas bi
      WHERE NOT EXISTS (
        SELECT 1 FROM meal_ideas mi 
        WHERE mi.user_id = bi.user_id 
        AND mi.name = bi.name 
        AND mi.meal_type = 'breakfast'
      )
    `;

    // Migrate daily lunches to daily_meals
    await sql`
      INSERT INTO daily_meals (user_id, date, meal_type, meal_id, created_at, updated_at)
      SELECT 
        dl.user_id, 
        dl.date, 
        'lunch',
        mi.id,
        dl.created_at,
        dl.updated_at
      FROM daily_lunches dl
      JOIN lunch_ideas li ON dl.lunch_id = li.id
      JOIN meal_ideas mi ON li.user_id = mi.user_id AND li.name = mi.name AND mi.meal_type = 'lunch'
      WHERE NOT EXISTS (
        SELECT 1 FROM daily_meals dm 
        WHERE dm.user_id = dl.user_id 
        AND dm.date = dl.date 
        AND dm.meal_type = 'lunch'
      )
    `;

    // Migrate daily breakfasts to daily_meals
    await sql`
      INSERT INTO daily_meals (user_id, date, meal_type, meal_id, created_at, updated_at)
      SELECT 
        db.user_id, 
        db.date, 
        'breakfast',
        mi.id,
        db.created_at,
        db.updated_at
      FROM daily_breakfasts db
      JOIN breakfast_ideas bi ON db.breakfast_id = bi.id
      JOIN meal_ideas mi ON bi.user_id = mi.user_id AND bi.name = mi.name AND mi.meal_type = 'breakfast'
      WHERE NOT EXISTS (
        SELECT 1 FROM daily_meals dm 
        WHERE dm.user_id = db.user_id 
        AND dm.date = db.date 
        AND dm.meal_type = 'breakfast'
      )
    `;

    console.log('Meal data migration completed successfully');
  } catch (error) {
    console.error('Meal data migration failed:', error);
    // Don't throw error to prevent blocking initialization
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