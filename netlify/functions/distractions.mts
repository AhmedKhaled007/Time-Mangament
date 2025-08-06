import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleDistractions = async (request: Request, auth: AuthContext, context: Context) => {
  // Ensure database tables exist
  
  const sql = createDbClient();
  
  try {
    const method = request.method;
    
    // GET /api/distractions - Get all distractions
    if (method === 'GET') {
      const result = await sql`
        SELECT id, text, created_at
        FROM distractions
        WHERE user_id = ${auth.userId}
        ORDER BY created_at DESC
        LIMIT 100
      `;
      return createJsonResponse(result);
    }
    
    // POST /api/distractions - Log new distraction
    if (method === 'POST') {
      const body = await request.json();
      const { text } = body;
      
      if (!text || !text.trim()) {
        return createJsonResponse({ error: 'Text is required' }, 400);
      }
      
      const result = await sql`
        INSERT INTO distractions (user_id, text)
        VALUES (${auth.userId}, ${text.trim()})
        RETURNING id, text, created_at
      `;
      return createJsonResponse(result[0], 201);
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};

export default withAuth(handleDistractions);