import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleLunchIdeas = async (request: Request, auth: AuthContext, context: Context) => {
  const client = await createDbClient();
  
  try {
    const method = request.method;
    
    // GET /api/lunch-ideas - Get all lunch ideas
    if (method === 'GET') {
      const query = `
        SELECT id, name, created_at
        FROM lunch_ideas
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [auth.userId]);
      return createJsonResponse(result.rows);
    }
    
    // POST /api/lunch-ideas - Create new lunch idea
    if (method === 'POST') {
      const body = await request.json();
      const { name } = body;
      
      if (!name || !name.trim()) {
        return createJsonResponse({ error: 'Name is required' }, 400);
      }
      
      const query = `
        INSERT INTO lunch_ideas (user_id, name)
        VALUES ($1, $2)
        RETURNING id, name, created_at
      `;
      
      const result = await client.query(query, [auth.userId, name.trim()]);
      return createJsonResponse(result.rows[0], 201);
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  } finally {
    await client.end();
  }
};

export default withAuth(handleLunchIdeas);