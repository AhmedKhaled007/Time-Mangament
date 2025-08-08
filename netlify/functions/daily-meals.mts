import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleDailyMeals = async (request: Request, auth: AuthContext, context: Context) => {
  const sql = createDbClient();
  
  try {
    const url = new URL(request.url);
    const method = request.method;
    
    // GET /api/daily-meals - Get daily meals for a week or specific date
    if (method === 'GET') {
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');
      const date = url.searchParams.get('date');
      const mealType = url.searchParams.get('meal_type');
      
      let result;
      
      if (startDate && endDate) {
        // Get meals for a week range
        let query = sql`
          SELECT dm.date, dm.meal_type, dm.meal_id, mi.name as meal_name,
                 dm.created_at, dm.updated_at
          FROM daily_meals dm
          LEFT JOIN meal_ideas mi ON dm.meal_id = mi.id
          WHERE dm.user_id = ${auth.userId} 
            AND dm.date >= ${startDate} 
            AND dm.date <= ${endDate}
        `;
        
        if (mealType) {
          query = sql`
            SELECT dm.date, dm.meal_type, dm.meal_id, mi.name as meal_name,
                   dm.created_at, dm.updated_at
            FROM daily_meals dm
            LEFT JOIN meal_ideas mi ON dm.meal_id = mi.id
            WHERE dm.user_id = ${auth.userId} 
              AND dm.date >= ${startDate} 
              AND dm.date <= ${endDate}
              AND dm.meal_type = ${mealType}
          `;
        }
        
        result = await query;
        
        // Group by date for easier frontend consumption
        const groupedMeals: Record<string, Record<string, any>> = {};
        result.forEach((meal: any) => {
          if (!groupedMeals[meal.date]) {
            groupedMeals[meal.date] = {};
          }
          groupedMeals[meal.date][meal.meal_type] = {
            meal_id: meal.meal_id,
            meal_name: meal.meal_name,
            created_at: meal.created_at,
            updated_at: meal.updated_at
          };
        });
        
        return createJsonResponse(groupedMeals);
        
      } else if (date) {
        // Get meals for a specific date
        let query = sql`
          SELECT dm.date, dm.meal_type, dm.meal_id, mi.name as meal_name,
                 dm.created_at, dm.updated_at
          FROM daily_meals dm
          LEFT JOIN meal_ideas mi ON dm.meal_id = mi.id
          WHERE dm.user_id = ${auth.userId} AND dm.date = ${date}
        `;
        
        if (mealType) {
          query = sql`
            SELECT dm.date, dm.meal_type, dm.meal_id, mi.name as meal_name,
                   dm.created_at, dm.updated_at
            FROM daily_meals dm
            LEFT JOIN meal_ideas mi ON dm.meal_id = mi.id
            WHERE dm.user_id = ${auth.userId} 
              AND dm.date = ${date} 
              AND dm.meal_type = ${mealType}
          `;
        }
        
        result = await query;
        return createJsonResponse(result);
        
      } else {
        return createJsonResponse({ error: 'Either date or start_date/end_date parameters are required' }, 400);
      }
    }
    
    // PUT /api/daily-meals - Update daily meal selection
    if (method === 'PUT') {
      const body = await request.json();
      const { date, meal_type, meal_id } = body;
      
      if (!date || !meal_type) {
        return createJsonResponse({ error: 'Date and meal_type are required' }, 400);
      }
      
      if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(meal_type)) {
        return createJsonResponse({ error: 'Invalid meal_type. Must be one of: breakfast, lunch, dinner, snack' }, 400);
      }
      
      if (meal_id) {
        // Verify the meal idea exists and belongs to the user
        const mealExists = await sql`
          SELECT id FROM meal_ideas 
          WHERE id = ${meal_id} AND user_id = ${auth.userId}
        `;
        
        if (mealExists.length === 0) {
          return createJsonResponse({ error: 'Meal idea not found' }, 404);
        }
      }
      
      // Upsert the daily meal selection
      const result = await sql`
        INSERT INTO daily_meals (user_id, date, meal_type, meal_id)
        VALUES (${auth.userId}, ${date}, ${meal_type}, ${meal_id})
        ON CONFLICT (user_id, date, meal_type)
        DO UPDATE SET meal_id = EXCLUDED.meal_id, updated_at = CURRENT_TIMESTAMP
        RETURNING date, meal_type, meal_id
      `;
      
      return createJsonResponse({
        message: 'Daily meal updated successfully',
        date: result[0].date,
        meal_type: result[0].meal_type,
        meal_id: result[0].meal_id
      });
    }
    
    // DELETE /api/daily-meals - Remove daily meal selection
    if (method === 'DELETE') {
      const body = await request.json();
      const { date, meal_type } = body;
      
      if (!date || !meal_type) {
        return createJsonResponse({ error: 'Date and meal_type are required' }, 400);
      }
      
      const result = await sql`
        DELETE FROM daily_meals 
        WHERE user_id = ${auth.userId} AND date = ${date} AND meal_type = ${meal_type}
        RETURNING date, meal_type
      `;
      
      if (result.length === 0) {
        return createJsonResponse({ error: 'Daily meal selection not found' }, 404);
      }
      
      return createJsonResponse({ message: 'Daily meal selection removed successfully' });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};

export default withAuth(handleDailyMeals);

export const config = {
  path: "/functions/daily-meals"
};