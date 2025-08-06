import jwt from 'jsonwebtoken';
import { createDbClient, createJsonResponse } from './db';

export interface AuthContext {
  userId: number;
  email: string;
  googleId: string;
}

export async function authenticateUser(request: Request): Promise<AuthContext | Response> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createJsonResponse({ error: 'Authorization token required' }, 401);
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Verify user still exists in database
    const sql = createDbClient();
    const userResult = await sql`SELECT id, email, google_id FROM users WHERE id = ${decoded.userId}`;
    
    if (userResult.length === 0) {
      return createJsonResponse({ error: 'User not found' }, 404);
    }
    
    const user = userResult[0];
    return {
      userId: user.id,
      email: user.email,
      googleId: user.google_id
    };
    
  } catch (jwtError) {
    console.error('JWT verification error:', jwtError);
    return createJsonResponse({ error: 'Invalid or expired token' }, 401);
  }
}

// Middleware wrapper function
export function withAuth<T extends any[]>(
  handler: (request: Request, auth: AuthContext, ...args: T) => Promise<Response>
) {
  return async (request: Request, ...args: T): Promise<Response> => {
    const authResult = await authenticateUser(request);
    
    // If authResult is a Response, it means authentication failed
    if (authResult instanceof Response) {
      return authResult;
    }
    
    // If authentication succeeded, call the handler with auth context
    return handler(request, authResult, ...args);
  };
}