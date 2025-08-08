import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleMealIdeas = async (request: Request, auth: AuthContext, context: Context) => {
  const sql = createDbClient();
  
  try {
    const url = new URL(request.url);
    const method = request.method;
    
    // GET /api/meal-ideas - Get meal ideas, optionally filtered by meal_type
    if (method === 'GET') {
      const mealType = url.searchParams.get('meal_type');
      
      let result;
      
      if (mealType) {
        result = await sql`
          SELECT id, name, meal_type, created_at
          FROM meal_ideas
          WHERE user_id = ${auth.userId} AND meal_type = ${mealType}
          ORDER BY name ASC
        `;
      } else {
        result = await sql`
          SELECT id, name, meal_type, created_at
          FROM meal_ideas
          WHERE user_id = ${auth.userId}
          ORDER BY meal_type ASC, name ASC
        `;
      }
      return createJsonResponse(result);
    }
    
    // POST /api/meal-ideas - Create new meal idea
    if (method === 'POST') {
      const body = await request.json();
      const { name, meal_type } = body;
      
      if (!name || !meal_type) {
        return createJsonResponse({ error: 'Name and meal_type are required' }, 400);
      }
      
      if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(meal_type)) {
        return createJsonResponse({ error: 'Invalid meal_type. Must be one of: breakfast, lunch, dinner, snack' }, 400);
      }
      
      const result = await sql`
        INSERT INTO meal_ideas (user_id, name, meal_type)
        VALUES (${auth.userId}, ${name}, ${meal_type})
        RETURNING id, name, meal_type, created_at
      `;
      return createJsonResponse(result[0], 201);
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};

export default withAuth(handleMealIdeas);

export const config = {
  path: "/functions/meal-ideas"
};