import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleBreakfastIdeas = async (request: Request, auth: AuthContext, context: Context) => {
  
  const sql = createDbClient();
  
  try {
    const method = request.method;
    
    // GET /api/breakfast-ideas - Get all breakfast ideas
    if (method === 'GET') {
      const result = await sql`
        SELECT id, name, created_at
        FROM breakfast_ideas
        WHERE user_id = ${auth.userId}
        ORDER BY created_at DESC
      `;
      return createJsonResponse(result);
    }
    
    // POST /api/breakfast-ideas - Create new breakfast idea
    if (method === 'POST') {
      const body = await request.json();
      const { name } = body;
      
      if (!name || !name.trim()) {
        return createJsonResponse({ error: 'Name is required' }, 400);
      }
      
      const result = await sql`
        INSERT INTO breakfast_ideas (user_id, name)
        VALUES (${auth.userId}, ${name.trim()})
        RETURNING id, name, created_at
      `;
      return createJsonResponse(result[0], 201);
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};

export default withAuth(handleBreakfastIdeas);