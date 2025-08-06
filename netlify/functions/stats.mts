import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleStats = async (request: Request, auth: AuthContext, context: Context) => {
  // Ensure database tables exist
  
  const sql = createDbClient();
  
  try {
    const method = request.method;
    
    // GET /api/stats - Get task statistics
    if (method === 'GET') {
      const results = await Promise.all([
        // Total weekly tasks
        sql`SELECT COUNT(*) as total_weekly_tasks FROM weekly_tasks WHERE user_id = ${auth.userId}`,
        // Completed weekly tasks
        sql`SELECT COUNT(*) as completed_weekly_tasks FROM weekly_tasks WHERE user_id = ${auth.userId} AND completed = true`,
        // Total distractions
        sql`SELECT COUNT(*) as total_distractions FROM distractions WHERE user_id = ${auth.userId}`
      ]);
      
      const totalWeeklyTasks = parseInt(results[0][0].total_weekly_tasks);
      const completedWeeklyTasks = parseInt(results[1][0].completed_weekly_tasks);
      const totalDistractions = parseInt(results[2][0].total_distractions);
      
      // Calculate productivity score (max 100, reduced by distractions)
      const productivityScore = Math.max(0, 100 - (totalDistractions * 10));
      
      const stats = {
        total_weekly_tasks: totalWeeklyTasks,
        completed_weekly_tasks: completedWeeklyTasks,
        total_distractions: totalDistractions,
        productivity_score: productivityScore
      };
      
      return createJsonResponse(stats);
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};

export default withAuth(handleStats);