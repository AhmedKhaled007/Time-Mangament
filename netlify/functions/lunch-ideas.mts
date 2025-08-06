import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleLunchIdeas = async (request: Request, auth: AuthContext, context: Context) => {
  // Ensure database tables exist
  
  const sql = createDbClient();
  
  try {
    const method = request.method;
    
    // GET /api/lunch-ideas - Get all lunch ideas
    if (method === 'GET') {
      const result = await sql`
        SELECT id, name, created_at
        FROM lunch_ideas
        WHERE user_id = ${auth.userId}
        ORDER BY created_at DESC
      `;
      return createJsonResponse(result);
    }
    
    // POST /api/lunch-ideas - Create new lunch idea
    if (method === 'POST') {
      const body = await request.json();
      const { name } = body;
      
      if (!name || !name.trim()) {
        return createJsonResponse({ error: 'Name is required' }, 400);
      }
      
      const result = await sql`
        INSERT INTO lunch_ideas (user_id, name)
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

export default withAuth(handleLunchIdeas);