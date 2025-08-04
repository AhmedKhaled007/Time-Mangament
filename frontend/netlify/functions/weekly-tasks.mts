import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleWeeklyTasks = async (request: Request, auth: AuthContext, context: Context) => {
  const client = await createDbClient();
  
  try {
    const url = new URL(request.url);
    const method = request.method;
    
    // GET /api/weekly-tasks - Get all weekly tasks, optionally filtered by date
    if (method === 'GET') {
      const date = url.searchParams.get('date');
      
      let query = `
        SELECT id, text, date, from_time, to_time, completed, priority, 
               ticktick_id, project_id, created_at, updated_at
        FROM weekly_tasks
        WHERE user_id = $1
      `;
      let params: any[] = [auth.userId];
      
      if (date) {
        query += ' AND date = $2';
        params.push(date);
      }
      
      query += ' ORDER BY completed ASC, from_time ASC NULLS LAST, to_time ASC NULLS LAST';
      
      const result = await client.query(query, params);
      return createJsonResponse(result.rows);
    }
    
    // POST /api/weekly-tasks - Create new weekly task
    if (method === 'POST') {
      const body = await request.json();
      const { text, date, from_time, to_time, priority = 'medium', ticktick_id, project_id } = body;
      
      const query = `
        INSERT INTO weekly_tasks (user_id, text, date, from_time, to_time, priority, ticktick_id, project_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, text, date, from_time, to_time, completed, priority, 
                  ticktick_id, project_id, created_at, updated_at
      `;
      
      const result = await client.query(query, [auth.userId, text, date, from_time, to_time, priority, ticktick_id, project_id]);
      return createJsonResponse(result.rows[0], 201);
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  } finally {
    await client.end();
  }
};

export default withAuth(handleWeeklyTasks);