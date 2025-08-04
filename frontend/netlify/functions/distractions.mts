import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleDistractions = async (request: Request, auth: AuthContext, context: Context) => {
  const client = await createDbClient();
  
  try {
    const method = request.method;
    
    // GET /api/distractions - Get all distractions
    if (method === 'GET') {
      const query = `
        SELECT id, text, created_at
        FROM distractions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `;
      
      const result = await client.query(query, [auth.userId]);
      return createJsonResponse(result.rows);
    }
    
    // POST /api/distractions - Log new distraction
    if (method === 'POST') {
      const body = await request.json();
      const { text } = body;
      
      if (!text || !text.trim()) {
        return createJsonResponse({ error: 'Text is required' }, 400);
      }
      
      const query = `
        INSERT INTO distractions (user_id, text)
        VALUES ($1, $2)
        RETURNING id, text, created_at
      `;
      
      const result = await client.query(query, [auth.userId, text.trim()]);
      return createJsonResponse(result.rows[0], 201);
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  } finally {
    await client.end();
  }
};

export default withAuth(handleDistractions);