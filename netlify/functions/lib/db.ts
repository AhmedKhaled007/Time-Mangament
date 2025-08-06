import { neon } from '@netlify/neon';

// Database connection utility - uses NETLIFY_DATABASE_URL automatically
export function createDbClient() {
  return neon(); // Automatically uses NETLIFY_DATABASE_URL
}

// Helper function to handle database errors
export function handleDbError(error: any): Response {
  console.error('Database error:', error);
  
  if (error.code === '23505') {
    return new Response(JSON.stringify({ error: 'Resource already exists' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (error.code === '23503') {
    return new Response(JSON.stringify({ error: 'Referenced resource not found' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ error: 'Internal server error' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Helper function to create JSON response
export function createJsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}