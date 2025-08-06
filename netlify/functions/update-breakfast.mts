import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleBreakfastIdea = async (request: Request, auth: AuthContext, context: Context) => {
  const sql = createDbClient();
  
  try {
    const breakfastId = context.params?.id;
    const method = request.method;
    
    if (!breakfastId) {
      return createJsonResponse({ error: 'Breakfast ID is required' }, 400);
    }
    
    // PUT /api/breakfast-ideas/:id - Update breakfast idea
    if (method === 'PUT') {
      const body = await request.json();
      const { name } = body;
      
      if (!name || !name.trim()) {
        return createJsonResponse({ error: 'Name is required' }, 400);
      }
      
      const result = await sql`
        UPDATE breakfast_ideas 
        SET name = ${name.trim()}
        WHERE id = ${breakfastId} AND user_id = ${auth.userId}
        RETURNING id, name, created_at
      `;
      
      if (result.length === 0) {
        return createJsonResponse({ error: 'Breakfast idea not found' }, 404);
      }
      
      return createJsonResponse(result[0]);
    }
    
    // DELETE /api/breakfast-ideas/:id - Delete breakfast idea
    if (method === 'DELETE') {
      const result = await sql`
        DELETE FROM breakfast_ideas 
        WHERE id = ${breakfastId} AND user_id = ${auth.userId} 
        RETURNING id
      `;
      
      if (result.length === 0) {
        return createJsonResponse({ error: 'Breakfast idea not found' }, 404);
      }
      
      return createJsonResponse({ message: 'Breakfast idea deleted successfully' });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};

export default withAuth(handleBreakfastIdea);

export const config = {
  path: "/breakfast-ideas/:id"
};