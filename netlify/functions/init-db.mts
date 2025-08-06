import type { Context } from '@netlify/functions';
import { initializeDatabase } from './lib/init-db';
import { createJsonResponse, handleDbError } from './lib/db';

export default async (request: Request, context: Context) => {
  try {
    const method = request.method;
    
    // POST /init-db - Initialize database tables
    if (method === 'POST') {
      await initializeDatabase();
      
      return createJsonResponse({
        message: 'Database initialized successfully',
        timestamp: new Date().toISOString()
      });
    }
    
    // GET /init-db - Check database status
    if (method === 'GET') {
      return createJsonResponse({
        message: 'Database initialization endpoint',
        usage: 'POST to initialize database tables'
      });
    }
    
    return createJsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    return handleDbError(error);
  }
};