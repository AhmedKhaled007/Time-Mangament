import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from '../lib/db';
import { withAuth, type AuthContext } from '../lib/auth';

const handleLunchIdea = async (request: Request, auth: AuthContext, context: Context) => {
  const sql = createDbClient();
  
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
      
      const result = await sql`
        UPDATE lunch_ideas 
        SET name = ${name.trim()}
        WHERE id = ${lunchId} AND user_id = ${auth.userId}
        RETURNING id, name, created_at
      `;
      
      if (result.length === 0) {
        return createJsonResponse({ error: 'Lunch idea not found' }, 404);
      }
      
      return createJsonResponse(result[0]);
    }
    
    // DELETE /api/lunch-ideas/:id - Delete lunch idea
    if (method === 'DELETE') {
      const result = await sql`
        DELETE FROM lunch_ideas 
        WHERE id = ${lunchId} AND user_id = ${auth.userId} 
        RETURNING id
      `;
      
      if (result.length === 0) {
        return createJsonResponse({ error: 'Lunch idea not found' }, 404);
      }
      
      return createJsonResponse({ message: 'Lunch idea deleted successfully' });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};

export default withAuth(handleLunchIdea);

export const config = {
  path: "/lunch-ideas/:id"
};