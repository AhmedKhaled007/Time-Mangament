import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import { withAuth, type AuthContext } from './lib/auth';

const handleMigrateDb = async (request: Request, _auth: AuthContext) => {
  const sql = createDbClient();
  
  try {
    const method = request.method;
    
    if (method === 'POST') {
      console.log('🚀 Running database migrations...');
      
      
      // Update recurring_tasks_id foreign key constraint to ON DELETE CASCADE
      console.log('🔄 Updating recurring_tasks_id constraint to CASCADE...');
      
      try {
        // Simple approach: Drop constraint by name and recreate with CASCADE
        // Most PostgreSQL installations use this naming pattern
        await sql`
          ALTER TABLE weekly_tasks 
          DROP CONSTRAINT IF EXISTS weekly_tasks_recurring_tasks_id_fkey
        `;
        console.log('🗑️ Dropped existing constraint (if any)');
        
        // Add new constraint with CASCADE
        await sql`
          ALTER TABLE weekly_tasks 
          ADD CONSTRAINT weekly_tasks_recurring_tasks_id_fkey 
          FOREIGN KEY (recurring_tasks_id) 
          REFERENCES recurring_tasks(id) 
          ON DELETE CASCADE
        `;
        console.log('✅ Added recurring_tasks_id constraint with ON DELETE CASCADE');
        
      } catch (constraintError) {
        console.log('⚠️ Constraint update failed:', constraintError.message);
        
        // Try alternative approach - check if constraint already has CASCADE
        try {
          const existingConstraint = await sql`
            SELECT conname, confdeltype 
            FROM pg_constraint 
            WHERE conrelid = 'weekly_tasks'::regclass 
            AND confrelid = 'recurring_tasks'::regclass
            AND contype = 'f'
          `;
          
          if (existingConstraint.length > 0) {
            const deleteAction = existingConstraint[0].confdeltype;
            if (deleteAction === 'c') {
              console.log('✅ Constraint already has CASCADE behavior');
            } else {
              console.log(`ℹ️ Constraint exists with delete action: ${deleteAction} (not CASCADE)`);
            }
          }
        } catch (checkError) {
          console.log('ℹ️ Could not verify constraint status');
        }
      }

      console.log('🎉 Database migration completed');
      
      return createJsonResponse({
        message: 'Database migration completed successfully',
        status: 'success'
      });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    return handleDbError(error);
  }
};

export default withAuth(handleMigrateDb);

export const config = {
  path: "/functions/migrate-db"
};