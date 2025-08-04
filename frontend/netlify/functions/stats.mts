import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleStats = async (request: Request, auth: AuthContext, context: Context) => {
  const client = await createDbClient();
  
  try {
    const method = request.method;
    
    // GET /api/stats - Get task statistics
    if (method === 'GET') {
      const queries = [
        // Total weekly tasks
        'SELECT COUNT(*) as total_weekly_tasks FROM weekly_tasks WHERE user_id = $1',
        // Completed weekly tasks
        'SELECT COUNT(*) as completed_weekly_tasks FROM weekly_tasks WHERE user_id = $1 AND completed = true',
        // Total distractions
        'SELECT COUNT(*) as total_distractions FROM distractions WHERE user_id = $1'
      ];
      
      const results = await Promise.all(
        queries.map(query => client.query(query, [auth.userId]))
      );
      
      const totalWeeklyTasks = parseInt(results[0].rows[0].total_weekly_tasks);
      const completedWeeklyTasks = parseInt(results[1].rows[0].completed_weekly_tasks);
      const totalDistractions = parseInt(results[2].rows[0].total_distractions);
      
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
  } finally {
    await client.end();
  }
};

export default withAuth(handleStats);