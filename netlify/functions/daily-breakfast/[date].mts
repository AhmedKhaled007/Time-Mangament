import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from '../lib/db';
import { withAuth, type AuthContext } from '../lib/auth';

const handleDailyBreakfast = async (request: Request, auth: AuthContext, context: Context) => {
  const sql = createDbClient();
  
  try {
    const date = context.params?.date;
    const method = request.method;
    
    if (!date) {
      return createJsonResponse({ error: 'Date is required' }, 400);
    }
    
    // GET /api/daily-breakfast/:date - Get daily breakfast selection
    if (method === 'GET') {
      const result = await sql`
        SELECT date, breakfast_id
        FROM daily_breakfasts
        WHERE date = ${date} AND user_id = ${auth.userId}
      `;
      
      if (result.length === 0) {
        return createJsonResponse({ date, breakfast_id: null });
      }
      
      return createJsonResponse(result[0]);
    }
    
    // PUT /api/daily-breakfast/:date - Update daily breakfast selection
    if (method === 'PUT') {
      const body = await request.json();
      const { breakfast_id } = body;
      
      if (breakfast_id === null || breakfast_id === undefined) {
        // Remove breakfast selection
        await sql`DELETE FROM daily_breakfasts WHERE date = ${date} AND user_id = ${auth.userId}`;
        return createJsonResponse({ message: 'Daily breakfast updated successfully', date, breakfast_id: null });
      }
      
      // Upsert breakfast selection
      const result = await sql`
        INSERT INTO daily_breakfasts (user_id, date, breakfast_id)
        VALUES (${auth.userId}, ${date}, ${breakfast_id})
        ON CONFLICT (user_id, date) 
        DO UPDATE SET breakfast_id = ${breakfast_id}, updated_at = CURRENT_TIMESTAMP
        RETURNING date, breakfast_id
      `;
      
      return createJsonResponse({ 
        message: 'Daily breakfast updated successfully', 
        date: result[0].date, 
        breakfast_id: result[0].breakfast_id 
      });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};

export default withAuth(handleDailyBreakfast);