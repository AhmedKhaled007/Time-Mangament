import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleMigrateDb = async (request: Request, auth: AuthContext, context: Context) => {
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