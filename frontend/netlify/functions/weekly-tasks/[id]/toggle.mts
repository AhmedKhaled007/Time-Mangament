import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from '../../lib/db';
import { withAuth, type AuthContext } from '../../lib/auth';

const handleToggleTask = async (request: Request, auth: AuthContext, context: Context) => {
  const client = await createDbClient();
  
  try {
    const taskId = context.params?.id;
    const method = request.method;
    
    if (!taskId) {
      return createJsonResponse({ error: 'Task ID is required' }, 400);
    }
    
    // POST /api/weekly-tasks/:id/toggle - Toggle task completion
    if (method === 'POST') {
      const query = `
        UPDATE weekly_tasks 
        SET completed = NOT completed,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING id, text, date, from_time, to_time, completed, priority, 
                  ticktick_id, project_id, created_at, updated_at
      `;
      
      const result = await client.query(query, [taskId, auth.userId]);
      
      if (result.rows.length === 0) {
        return createJsonResponse({ error: 'Task not found' }, 404);
      }
      
      return createJsonResponse(result.rows[0]);
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  } finally {
    await client.end();
  }
};

export default withAuth(handleToggleTask);