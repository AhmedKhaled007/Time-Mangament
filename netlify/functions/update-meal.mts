import type { Config, Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleMealIdea = async (request: Request, auth: AuthContext, context: Context) => {
  const sql = createDbClient();
  
  try {
    const mealId = context.params?.id;
    const method = request.method;
    
    if (!mealId) {
      return createJsonResponse({ error: 'Meal ID is required' }, 400);
    }
    
    // PUT /api/meal-ideas/:id - Update meal idea
    if (method === 'PUT') {
      const body = await request.json();
      const { name, meal_type } = body;
      
      if (!name || !name.trim()) {
        return createJsonResponse({ error: 'Name is required' }, 400);
      }
      
      if (meal_type && !['breakfast', 'lunch', 'dinner', 'snack'].includes(meal_type)) {
        return createJsonResponse({ error: 'Invalid meal_type. Must be one of: breakfast, lunch, dinner, snack' }, 400);
      }
      
      const updateFields = { name: name.trim() };
      if (meal_type) {
        updateFields.meal_type = meal_type;
      }
      
      const result = await sql`
        UPDATE meal_ideas 
        SET name = ${updateFields.name}
            ${meal_type ? sql`, meal_type = ${meal_type}` : sql``}
        WHERE id = ${mealId} AND user_id = ${auth.userId}
        RETURNING id, name, meal_type, created_at
      `;
      
      if (result.length === 0) {
        return createJsonResponse({ error: 'Meal idea not found' }, 404);
      }
      
      return createJsonResponse(result[0]);
    }
    
    // DELETE /api/meal-ideas/:id - Delete meal idea
    if (method === 'DELETE') {
      const result = await sql`
        DELETE FROM meal_ideas 
        WHERE id = ${mealId} AND user_id = ${auth.userId} 
        RETURNING id
      `;
      
      if (result.length === 0) {
        return createJsonResponse({ error: 'Meal idea not found' }, 404);
      }
      
      return createJsonResponse({ message: 'Meal idea deleted successfully' });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};

export default withAuth(handleMealIdea);

export const config: Config = {
  path: "/functions/meal-ideas/:id"
};