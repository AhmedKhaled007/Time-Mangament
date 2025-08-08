import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleMigrateDb = async (request: Request, _auth: AuthContext) => {
  const sql = createDbClient();
  
  try {
    const method = request.method;
    
    if (method === 'POST') {
      console.log('🚀 Running database migrations...');
      
      // Add recurring_tasks_id column to weekly_tasks table
      await sql`
        ALTER TABLE weekly_tasks 
        ADD COLUMN IF NOT EXISTS recurring_tasks_id INTEGER REFERENCES recurring_tasks(id) ON DELETE SET NULL DEFAULT NULL
      `;
      console.log('✅ Added recurring_tasks_id column to weekly_tasks table');
      
      // Ensure daily_meals.date column is proper DATE type and normalize data
      console.log('🔄 Ensuring daily_meals.date column is proper DATE type...');
      
      // Check current column type
      const columnInfo = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'daily_meals' AND column_name = 'date'
      `;
      console.log('📊 Current date column info:', columnInfo[0]);
      
      // First, let's see what dates we have
      const sampleDates = await sql`SELECT id, date FROM daily_meals LIMIT 5`;
      console.log('📊 Sample dates before migration:', sampleDates.map(row => ({ id: row.id, date: row.date, type: typeof row.date })));
      
      // Ensure the column is of DATE type (this will convert any existing data)
      await sql`
        ALTER TABLE daily_meals 
        ALTER COLUMN date TYPE DATE USING date::DATE
      `;
      console.log('✅ Ensured daily_meals.date column is of DATE type');
      
      // Also normalize any remaining timestamp strings in the data
      await sql`
        UPDATE daily_meals 
        SET date = (
          CASE 
            WHEN date::text LIKE '%T%' THEN date::date
            ELSE date
          END
        )
        WHERE date IS NOT NULL
      `;
      console.log('✅ Normalized any remaining timestamp data to DATE format');
      
      // Verify the conversion worked - force text conversion to see actual stored format
      const sampleDatesAfter = await sql`SELECT id, date, date::text as date_as_text FROM daily_meals LIMIT 5`;
      console.log('📊 Sample dates after migration:', sampleDatesAfter.map(row => ({ 
        id: row.id, 
        date: row.date, 
        dateType: typeof row.date,
        dateAsText: row.date_as_text,
        textType: typeof row.date_as_text 
      })));
      
      // Count total records to show what was processed
      const totalRecords = await sql`SELECT COUNT(*) as count FROM daily_meals`;
      console.log(`✅ Processed ${totalRecords[0].count} records in daily_meals table`);
      
      // Verify column type after migration
      const columnInfoAfter = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'daily_meals' AND column_name = 'date'
      `;
      console.log('📊 Final date column info:', columnInfoAfter[0]);

      console.log('🎉 Database migration completed');
      
      return createJsonResponse({
        message: 'Database migration completed successfully',
        status: 'success'
      });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    return handleDbError(error);
  }
};

export default withAuth(handleMigrateDb);

export const config = {
  path: "/functions/migrate-db"
};