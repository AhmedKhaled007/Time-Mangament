import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleRecurringTasks = async (request: Request, auth: AuthContext, context: Context) => {
  // Ensure database tables exist
  
  const sql = createDbClient();
  
  try {
    const url = new URL(request.url);
    const method = request.method;
    
    // GET /api/recurring-tasks - Get all recurring tasks for user
    if (method === 'GET') {
      const result = await sql`
        SELECT id, text, from_time, to_time, priority, category, weekdays, is_active, created_at, updated_at
        FROM recurring_tasks
        WHERE user_id = ${auth.userId}
        ORDER BY created_at DESC
      `;
      return createJsonResponse(result);
    }
    
    // POST /api/recurring-tasks - Create new recurring task
    if (method === 'POST') {
      const body = await request.json();
      const { text, from_time, to_time, priority = 'medium', category, weekdays } = body;
      
      if (!text || !text.trim()) {
        return createJsonResponse({ error: 'Task text is required' }, 400);
      }
      
      if (!weekdays || !Array.isArray(weekdays) || weekdays.length === 0) {
        return createJsonResponse({ error: 'At least one weekday must be selected' }, 400);
      }
      
      // Validate weekdays are valid integers (0-6)
      const validWeekdays = weekdays.filter(day => Number.isInteger(day) && day >= 0 && day <= 6);
      if (validWeekdays.length !== weekdays.length) {
        return createJsonResponse({ error: 'Invalid weekday values. Must be integers 0-6 (0=Sunday, 6=Saturday)' }, 400);
      }
      
      if (priority && !['low', 'medium', 'high'].includes(priority)) {
        return createJsonResponse({ error: 'Priority must be one of: low, medium, high' }, 400);
      }
      
      const result = await sql`
        INSERT INTO recurring_tasks (user_id, text, from_time, to_time, priority, category, weekdays)
        VALUES (${auth.userId}, ${text.trim()}, ${from_time}, ${to_time}, ${priority}, ${category}, ${validWeekdays})
        RETURNING id, text, from_time, to_time, priority, category, weekdays, is_active, created_at, updated_at
      `;
      
      return createJsonResponse(result[0], 201);
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};

export default withAuth(handleRecurringTasks);

export const config = {
  path: "/functions/recurring-tasks"
};