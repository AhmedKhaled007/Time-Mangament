import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from '../lib/db';
import { withAuth, type AuthContext } from '../lib/auth';

const handleDailyLunch = async (request: Request, auth: AuthContext, context: Context) => {
  const sql = createDbClient();
  
  try {
    const date = context.params?.date;
    const method = request.method;
    
    if (!date) {
      return createJsonResponse({ error: 'Date is required' }, 400);
    }
    
    // GET /api/daily-lunch/:date - Get daily lunch selection
    if (method === 'GET') {
      const result = await sql`
        SELECT date, lunch_id
        FROM daily_lunches
        WHERE date = ${date} AND user_id = ${auth.userId}
      `;
      
      if (result.length === 0) {
        return createJsonResponse({ date, lunch_id: null });
      }
      
      return createJsonResponse(result[0]);
    }
    
    // PUT /api/daily-lunch/:date - Update daily lunch selection
    if (method === 'PUT') {
      const body = await request.json();
      const { lunch_id } = body;
      
      if (lunch_id === null || lunch_id === undefined) {
        // Remove lunch selection
        await sql`DELETE FROM daily_lunches WHERE date = ${date} AND user_id = ${auth.userId}`;
        return createJsonResponse({ message: 'Daily lunch updated successfully', date, lunch_id: null });
      }
      
      // Upsert lunch selection
      const result = await sql`
        INSERT INTO daily_lunches (user_id, date, lunch_id)
        VALUES (${auth.userId}, ${date}, ${lunch_id})
        ON CONFLICT (user_id, date) 
        DO UPDATE SET lunch_id = ${lunch_id}, updated_at = CURRENT_TIMESTAMP
        RETURNING date, lunch_id
      `;
      
      return createJsonResponse({ 
        message: 'Daily lunch updated successfully', 
        date: result[0].date, 
        lunch_id: result[0].lunch_id 
      });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};

export default withAuth(handleDailyLunch);