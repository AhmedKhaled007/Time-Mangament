import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleWeeklyTasks = async (request: Request, auth: AuthContext, context: Context) => {
  // Ensure database tables exist
  
  const sql = createDbClient();
  
  try {
    const url = new URL(request.url);
    const method = request.method;
    
    // GET /api/weekly-tasks - Get all weekly tasks, optionally filtered by date
    if (method === 'GET') {
      const date = url.searchParams.get('date');
      
      let result;
      
      if (date) {
        result = await sql`
          SELECT id, text, date::text as date, from_time, to_time, completed, priority, 
                 ticktick_id, project_id, created_at, updated_at
          FROM weekly_tasks
          WHERE user_id = ${auth.userId} AND date = ${date}
          ORDER BY completed ASC, from_time ASC NULLS LAST, to_time ASC NULLS LAST
        `;
      } else {
        result = await sql`
          SELECT id, text, date::text as date, from_time, to_time, completed, priority, 
                 ticktick_id, project_id, created_at, updated_at
          FROM weekly_tasks
          WHERE user_id = ${auth.userId}
          ORDER BY completed ASC, from_time ASC NULLS LAST, to_time ASC NULLS LAST
        `;
      }
      return createJsonResponse(result);
    }
    
    // POST /api/weekly-tasks - Create new weekly task
    if (method === 'POST') {
      const body = await request.json();
      const { text, date, from_time, to_time, priority = 'medium', ticktick_id, project_id } = body;
      
      const result = await sql`
        INSERT INTO weekly_tasks (user_id, text, date, from_time, to_time, priority, ticktick_id, project_id)
        VALUES (${auth.userId}, ${text}, ${date}, ${from_time}, ${to_time}, ${priority}, ${ticktick_id}, ${project_id})
        RETURNING id, text, date::text as date, from_time, to_time, completed, priority, 
                  ticktick_id, project_id, created_at, updated_at
      `;
      return createJsonResponse(result[0], 201);
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};

export default withAuth(handleWeeklyTasks);


export const config = {
  path: "/functions/weekly-tasks"
};