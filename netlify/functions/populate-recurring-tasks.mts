import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handlePopulateRecurringTasks = async (request: Request, auth: AuthContext, context: Context) => {
  // Ensure database tables exist
  
  const sql = createDbClient();
  
  try {
    const method = request.method;
    
    if (method === 'POST') {
      const body = await request.json();
      const { start_date, end_date } = body;
      
      if (!start_date || !end_date) {
        return createJsonResponse({ error: 'start_date and end_date are required' }, 400);
      }
      
      console.log(`🚀 Populating recurring tasks from ${start_date} to ${end_date} for user ${auth.userId}`);
      
      // Get active recurring tasks
      const recurringTasks = await sql`
        SELECT id, text, from_time, to_time, priority, weekdays
        FROM recurring_tasks
        WHERE user_id = ${auth.userId} AND is_active = true
      `;
      
      if (recurringTasks.length === 0) {
        return createJsonResponse({
          message: `No active recurring tasks found for user ${auth.userId}. `,
          total_populated: 0,
          populated_tasks: []
        });
      }
      
      console.log(`📋 Found ${recurringTasks.length} recurring tasks`);
      
      let totalPopulated = 0;
      const populatedTasks: any[] = [];
      
      // Process each recurring task
      for (const task of recurringTasks) {
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, etc.
          
          if (task.weekdays.includes(dayOfWeek)) {
            const dateStr = currentDate.toISOString().split('T')[0];
            
            // CHECK FIRST - Let's see what's actually in the database
            const existingTasks = await sql`
              SELECT id, text, date, from_time, to_time FROM weekly_tasks 
              WHERE user_id = ${auth.userId} AND date = ${dateStr} AND recurring_tasks_id = ${task.id}
            `;
            
            console.log(`🔍 Existing tasks for ${dateStr}: `);
            
            if (existingTasks.length > 0) {
              console.log(`⚠️ EXACT MATCH FOUND, skipping`);
              currentDate.setDate(currentDate.getDate() + 1);
              continue;

            }
            
            try {
              // Insert the weekly task (no ON CONFLICT needed)
              const result = await sql`
                INSERT INTO weekly_tasks (user_id, text, date, from_time, to_time, priority, completed, recurring_tasks_id)
                VALUES (${auth.userId}, ${task.text}, ${dateStr}, ${task.from_time}, ${task.to_time}, ${task.priority}, false, ${task.id})
                RETURNING id, text, date, from_time, to_time, priority, completed, created_at, updated_at
              `;
              
              const weeklyTask = result[0];
              
    
              
              totalPopulated++;
              populatedTasks.push({
                recurring_task_id: task.id,
                weekly_task: weeklyTask,
                date: dateStr
              });
              
              console.log(`✅ Created task "${task.text}" for ${dateStr}`);
            } catch (error) {
              console.error(`❌ Error inserting task "${task.text}" for ${dateStr}:`, error);
            }
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      console.log(`✅ Populated ${totalPopulated} tasks`);
      
      return createJsonResponse({
        message: `Successfully populated ${totalPopulated} recurring task instances`,
        total_populated: totalPopulated,
        populated_tasks: populatedTasks
      });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    console.error('❌ Populate error:', error);
    return handleDbError(error);
  }
};

export default withAuth(handlePopulateRecurringTasks);