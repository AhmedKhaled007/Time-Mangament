import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleToggleTask = async (request: Request, auth: AuthContext, context: Context) => {
  const sql = createDbClient();
  
  try {
    const taskId = context.params?.id;
    const method = request.method;
    
    if (!taskId) {
      return createJsonResponse({ error: 'Task ID is required' }, 400);
    }
    
    // POST /api/weekly-tasks/:id/toggle - Toggle task completion
    if (method === 'POST') {
      const result = await sql`
        UPDATE weekly_tasks 
        SET completed = NOT completed,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${taskId} AND user_id = ${auth.userId}
        RETURNING id, text, date::text as date, from_time, to_time, completed, priority, 
                  ticktick_id, project_id, created_at, updated_at
      `;
      
      if (result.length === 0) {
        return createJsonResponse({ error: 'Task not found' }, 404);
      }
      
      return createJsonResponse(result[0]);
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};

export default withAuth(handleToggleTask);


export const config = {
  path: "/functions/weekly-tasks/:id/toggle"
};