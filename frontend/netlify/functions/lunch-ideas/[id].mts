import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from '../lib/db';
import { withAuth, type AuthContext } from '../lib/auth';

const handleLunchIdea = async (request: Request, auth: AuthContext, context: Context) => {
  const client = await createDbClient();
  
  try {
    const lunchId = context.params?.id;
    const method = request.method;
    
    if (!lunchId) {
      return createJsonResponse({ error: 'Lunch ID is required' }, 400);
    }
    
    // PUT /api/lunch-ideas/:id - Update lunch idea
    if (method === 'PUT') {
      const body = await request.json();
      const { name } = body;
      
      if (!name || !name.trim()) {
        return createJsonResponse({ error: 'Name is required' }, 400);
      }
      
      const query = `
        UPDATE lunch_ideas 
        SET name = $3
        WHERE id = $1 AND user_id = $2
        RETURNING id, name, created_at
      `;
      
      const result = await client.query(query, [lunchId, auth.userId, name.trim()]);
      
      if (result.rows.length === 0) {
        return createJsonResponse({ error: 'Lunch idea not found' }, 404);
      }
      
      return createJsonResponse(result.rows[0]);
    }
    
    // DELETE /api/lunch-ideas/:id - Delete lunch idea
    if (method === 'DELETE') {
      const query = 'DELETE FROM lunch_ideas WHERE id = $1 AND user_id = $2 RETURNING id';
      const result = await client.query(query, [lunchId, auth.userId]);
      
      if (result.rows.length === 0) {
        return createJsonResponse({ error: 'Lunch idea not found' }, 404);
      }
      
      return createJsonResponse({ message: 'Lunch idea deleted successfully' });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  } finally {
    await client.end();
  }
};

export default withAuth(handleLunchIdea);