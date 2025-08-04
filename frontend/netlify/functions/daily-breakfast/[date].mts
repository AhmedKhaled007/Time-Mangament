import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from '../lib/db';
import { withAuth, type AuthContext } from '../lib/auth';

const handleDailyBreakfast = async (request: Request, auth: AuthContext, context: Context) => {
  const client = await createDbClient();
  
  try {
    const date = context.params?.date;
    const method = request.method;
    
    if (!date) {
      return createJsonResponse({ error: 'Date is required' }, 400);
    }
    
    // GET /api/daily-breakfast/:date - Get daily breakfast selection
    if (method === 'GET') {
      const query = `
        SELECT date, breakfast_id
        FROM daily_breakfasts
        WHERE date = $1 AND user_id = $2
      `;
      
      const result = await client.query(query, [date, auth.userId]);
      
      if (result.rows.length === 0) {
        return createJsonResponse({ date, breakfast_id: null });
      }
      
      return createJsonResponse(result.rows[0]);
    }
    
    // PUT /api/daily-breakfast/:date - Update daily breakfast selection
    if (method === 'PUT') {
      const body = await request.json();
      const { breakfast_id } = body;
      
      if (breakfast_id === null || breakfast_id === undefined) {
        // Remove breakfast selection
        const query = 'DELETE FROM daily_breakfasts WHERE date = $1 AND user_id = $2';
        await client.query(query, [date, auth.userId]);
        return createJsonResponse({ message: 'Daily breakfast updated successfully', date, breakfast_id: null });
      }
      
      // Upsert breakfast selection
      const query = `
        INSERT INTO daily_breakfasts (user_id, date, breakfast_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, date) 
        DO UPDATE SET breakfast_id = $3, updated_at = CURRENT_TIMESTAMP
        RETURNING date, breakfast_id
      `;
      
      const result = await client.query(query, [auth.userId, date, breakfast_id]);
      return createJsonResponse({ 
        message: 'Daily breakfast updated successfully', 
        date: result.rows[0].date, 
        breakfast_id: result.rows[0].breakfast_id 
      });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  } finally {
    await client.end();
  }
};

export default withAuth(handleDailyBreakfast);