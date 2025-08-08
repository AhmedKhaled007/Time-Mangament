import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleWeeklyTaskById = async (request: Request, auth: AuthContext, context: Context) => {
  const sql = createDbClient();
  
  try {
    const taskId = context.params?.id;
    const method = request.method;
    
    if (!taskId) {
      return createJsonResponse({ error: 'Task ID is required' }, 400);
    }
    
    // PUT /api/weekly-tasks/:id - Update weekly task
    if (method === 'PUT') {
      const body = await request.json();
      const { text, date, from_time, to_time, completed, priority } = body;
      
      const result = await sql`
        UPDATE weekly_tasks 
        SET text = COALESCE(${text}, text),
            date = COALESCE(${date}, date),
            from_time = COALESCE(${from_time}, from_time),
            to_time = COALESCE(${to_time}, to_time),
            completed = COALESCE(${completed}, completed),
            priority = COALESCE(${priority}, priority),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${taskId} AND user_id = ${auth.userId}
        RETURNING id, text, date, from_time, to_time, completed, priority, 
                  ticktick_id, project_id, created_at, updated_at
      `;
      
      if (result.length === 0) {
        return createJsonResponse({ error: 'Task not found' }, 404);
      }
      
      return createJsonResponse(result[0]);
    }
    
    // DELETE /api/weekly-tasks/:id - Delete weekly task
    if (method === 'DELETE') {
      const result = await sql`
        DELETE FROM weekly_tasks 
        WHERE id = ${taskId} AND user_id = ${auth.userId} 
        RETURNING id
      `;
      
      if (result.length === 0) {
        return createJsonResponse({ error: 'Task not found' }, 404);
      }
      
      return createJsonResponse({ message: 'Task deleted successfully' });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};

export default withAuth(handleWeeklyTaskById);

export const config = {
  path: "/functions/weekly-tasks/:id"
};