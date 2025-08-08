import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleClearAllTasks = async (request: Request, auth: AuthContext, context: Context) => {
  const sql = createDbClient();
  
  try {
    const method = request.method;
    
    if (method === 'DELETE') {
      console.log(`🗑️ Clearing all tasks for user ${auth.userId}`);
      
      // Delete all user's data in correct order (foreign key constraints)
      const [weeklyTasksDeleted] = await Promise.all([
        sql`DELETE FROM weekly_tasks WHERE user_id = ${auth.userId}`,
      ]);
      
      
      
      return createJsonResponse({
        message: `Successfully cleared all tasks for user`,
        weekly_tasks_deleted: weeklyTasksDeleted.count,
      });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    console.error('❌ Clear all tasks error:', error);
    return handleDbError(error);
  }
};

export default withAuth(handleClearAllTasks);

export const config = {
  path: "/functions/clear-all-tasks"
};