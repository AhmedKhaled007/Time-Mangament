import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleRecurringTask = async (request: Request, auth: AuthContext, context: Context) => {
  // Ensure database tables exist
  
  const sql = createDbClient();
  
  try {
    const taskId = context.params?.id;
    const method = request.method;
    
    if (!taskId) {
      return createJsonResponse({ error: 'Recurring task ID is required' }, 400);
    }
    
    // PUT /api/recurring-tasks/:id - Update recurring task
    if (method === 'PUT') {
      const body = await request.json();
      const { text, from_time, to_time, priority, category, weekdays, is_active } = body;
      
      // Build dynamic update query
      const updates = [];
      const values: any[] = [];
      
      if (text !== undefined) {
        if (!text.trim()) {
          return createJsonResponse({ error: 'Task text cannot be empty' }, 400);
        }
        updates.push('text = $' + (values.length + 1));
        values.push(text.trim());
      }
      
      if (from_time !== undefined) {
        updates.push('from_time = $' + (values.length + 1));
        values.push(from_time);
      }
      
      if (to_time !== undefined) {
        updates.push('to_time = $' + (values.length + 1));
        values.push(to_time);
      }
      
      if (priority !== undefined) {
        if (!['low', 'medium', 'high'].includes(priority)) {
          return createJsonResponse({ error: 'Priority must be one of: low, medium, high' }, 400);
        }
        updates.push('priority = $' + (values.length + 1));
        values.push(priority);
      }
      
      if (category !== undefined) {
        updates.push('category = $' + (values.length + 1));
        values.push(category);
      }
      
      if (weekdays !== undefined) {
        if (!Array.isArray(weekdays) || weekdays.length === 0) {
          return createJsonResponse({ error: 'At least one weekday must be selected' }, 400);
        }
        const validWeekdays = weekdays.filter(day => Number.isInteger(day) && day >= 0 && day <= 6);
        if (validWeekdays.length !== weekdays.length) {
          return createJsonResponse({ error: 'Invalid weekday values. Must be integers 0-6 (0=Sunday, 6=Saturday)' }, 400);
        }
        updates.push('weekdays = $' + (values.length + 1));
        values.push(validWeekdays);
      }
      
      if (is_active !== undefined) {
        updates.push('is_active = $' + (values.length + 1));
        values.push(is_active);
      }
      
      if (updates.length === 0) {
        return createJsonResponse({ error: 'No fields to update' }, 400);
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      
      // Use a more straightforward approach for updates
      let result;
      if (text !== undefined && weekdays !== undefined) {
        result = await sql`
          UPDATE recurring_tasks 
          SET text = ${text.trim()}, 
              from_time = ${from_time}, 
              to_time = ${to_time}, 
              priority = ${priority || 'medium'}, 
              category = ${category}, 
              weekdays = ${weekdays}, 
              is_active = ${is_active !== undefined ? is_active : true},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${taskId} AND user_id = ${auth.userId}
          RETURNING id, text, from_time, to_time, priority, category, weekdays, is_active, created_at, updated_at
        `;
      } else {
        // For partial updates, we need to get current values first
        const current = await sql`
          SELECT * FROM recurring_tasks 
          WHERE id = ${taskId} AND user_id = ${auth.userId}
        `;
        
        if (current.length === 0) {
          return createJsonResponse({ error: 'Recurring task not found' }, 404);
        }
        
        const currentTask = current[0];
        result = await sql`
          UPDATE recurring_tasks 
          SET text = ${text !== undefined ? text.trim() : currentTask.text}, 
              from_time = ${from_time !== undefined ? from_time : currentTask.from_time}, 
              to_time = ${to_time !== undefined ? to_time : currentTask.to_time}, 
              priority = ${priority !== undefined ? priority : currentTask.priority}, 
              category = ${category !== undefined ? category : currentTask.category}, 
              weekdays = ${weekdays !== undefined ? weekdays : currentTask.weekdays}, 
              is_active = ${is_active !== undefined ? is_active : currentTask.is_active},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${taskId} AND user_id = ${auth.userId}
          RETURNING id, text, from_time, to_time, priority, category, weekdays, is_active, created_at, updated_at
        `;
      }
      
      if (result.length === 0) {
        return createJsonResponse({ error: 'Recurring task not found' }, 404);
      }
      
      return createJsonResponse(result[0]);
    }
    
    // DELETE /api/recurring-tasks/:id - Delete recurring task
    if (method === 'DELETE') {
      // First, delete all instances of this recurring task
      await sql`
        DELETE FROM recurring_task_instances 
        WHERE recurring_task_id = ${taskId} AND user_id = ${auth.userId}
      `;
      
      // Then delete the recurring task itself
      const result = await sql`
        DELETE FROM recurring_tasks 
        WHERE id = ${taskId} AND user_id = ${auth.userId} 
        RETURNING id
      `;
      
      if (result.length === 0) {
        return createJsonResponse({ error: 'Recurring task not found' }, 404);
      }
      
      return createJsonResponse({ message: 'Recurring task and all instances deleted successfully' });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};

export default withAuth(handleRecurringTask);

export const config = {
  path: "/recurring-tasks/:id"
};