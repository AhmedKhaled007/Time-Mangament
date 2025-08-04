import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from '../lib/db';
import { withAuth, type AuthContext } from '../lib/auth';

const handleDailyLunch = async (request: Request, auth: AuthContext, context: Context) => {
  const client = await createDbClient();
  
  try {
    const date = context.params?.date;
    const method = request.method;
    
    if (!date) {
      return createJsonResponse({ error: 'Date is required' }, 400);
    }
    
    // GET /api/daily-lunch/:date - Get daily lunch selection
    if (method === 'GET') {
      const query = `
        SELECT date, lunch_id
        FROM daily_lunches
        WHERE date = $1 AND user_id = $2
      `;
      
      const result = await client.query(query, [date, auth.userId]);
      
      if (result.rows.length === 0) {
        return createJsonResponse({ date, lunch_id: null });
      }
      
      return createJsonResponse(result.rows[0]);
    }
    
    // PUT /api/daily-lunch/:date - Update daily lunch selection
    if (method === 'PUT') {
      const body = await request.json();
      const { lunch_id } = body;
      
      if (lunch_id === null || lunch_id === undefined) {
        // Remove lunch selection
        const query = 'DELETE FROM daily_lunches WHERE date = $1 AND user_id = $2';
        await client.query(query, [date, auth.userId]);
        return createJsonResponse({ message: 'Daily lunch updated successfully', date, lunch_id: null });
      }
      
      // Upsert lunch selection
      const query = `
        INSERT INTO daily_lunches (user_id, date, lunch_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, date) 
        DO UPDATE SET lunch_id = $3, updated_at = CURRENT_TIMESTAMP
        RETURNING date, lunch_id
      `;
      
      const result = await client.query(query, [auth.userId, date, lunch_id]);
      return createJsonResponse({ 
        message: 'Daily lunch updated successfully', 
        date: result.rows[0].date, 
        lunch_id: result.rows[0].lunch_id 
      });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  } finally {
    await client.end();
  }
};

export default withAuth(handleDailyLunch);