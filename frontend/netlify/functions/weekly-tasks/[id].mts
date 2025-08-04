import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from '../lib/db';
import { withAuth, type AuthContext } from '../lib/auth';

const handleWeeklyTaskById = async (request: Request, auth: AuthContext, context: Context) => {
  const client = await createDbClient();
  
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
      
      const query = `
        UPDATE weekly_tasks 
        SET text = COALESCE($3, text),
            date = COALESCE($4, date),
            from_time = COALESCE($5, from_time),
            to_time = COALESCE($6, to_time),
            completed = COALESCE($7, completed),
            priority = COALESCE($8, priority),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING id, text, date, from_time, to_time, completed, priority, 
                  ticktick_id, project_id, created_at, updated_at
      `;
      
      const result = await client.query(query, [taskId, auth.userId, text, date, from_time, to_time, completed, priority]);
      
      if (result.rows.length === 0) {
        return createJsonResponse({ error: 'Task not found' }, 404);
      }
      
      return createJsonResponse(result.rows[0]);
    }
    
    // DELETE /api/weekly-tasks/:id - Delete weekly task
    if (method === 'DELETE') {
      const query = 'DELETE FROM weekly_tasks WHERE id = $1 AND user_id = $2 RETURNING id';
      const result = await client.query(query, [taskId, auth.userId]);
      
      if (result.rows.length === 0) {
        return createJsonResponse({ error: 'Task not found' }, 404);
      }
      
      return createJsonResponse({ message: 'Task deleted successfully' });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  } finally {
    await client.end();
  }
};

export default withAuth(handleWeeklyTaskById);