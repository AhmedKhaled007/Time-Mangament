import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import jwt from 'jsonwebtoken';

interface GoogleTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  at_hash?: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
  iat: number;
  exp: number;
}

// Verify Google ID token and get payload
async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
  // For production, you should verify the token with Google's API
  // For now, we'll decode the JWT without verification (development only)
  const decoded = jwt.decode(idToken) as GoogleTokenPayload;
  
  if (!decoded || !decoded.email || !decoded.sub) {
    throw new Error('Invalid token payload');
  }
  
  // In production, add proper token verification:
  // const ticket = await client.verifyIdToken({
  //   idToken,
  //   audience: process.env.GOOGLE_CLIENT_ID,
  // });
  // const payload = ticket.getPayload();
  
  return decoded;
}

export default async (request: Request, context: Context) => {
  const client = await createDbClient();
  
  try {
    const method = request.method;
    const url = new URL(request.url);
    
    // POST /auth/google - Google OAuth login
    if (method === 'POST' && url.pathname.endsWith('/auth/google')) {
      const body = await request.json();
      const { idToken } = body;
      
      if (!idToken) {
        return createJsonResponse({ error: 'ID token is required' }, 400);
      }
      
      try {
        const payload = await verifyGoogleToken(idToken);
        
        // Check if user exists, if not create new user
        let userQuery = 'SELECT * FROM users WHERE google_id = $1';
        let userResult = await client.query(userQuery, [payload.sub]);
        
        let user;
        if (userResult.rows.length === 0) {
          // Create new user
          const insertQuery = `
            INSERT INTO users (google_id, email, name, picture, locale, last_login)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            RETURNING *
          `;
          const insertResult = await client.query(insertQuery, [
            payload.sub,
            payload.email,
            payload.name,
            payload.picture,
            payload.locale || 'en'
          ]);
          user = insertResult.rows[0];
        } else {
          // Update existing user's last login and info
          const updateQuery = `
            UPDATE users 
            SET name = $2, picture = $3, locale = $4, last_login = CURRENT_TIMESTAMP
            WHERE google_id = $1
            RETURNING *
          `;
          const updateResult = await client.query(updateQuery, [
            payload.sub,
            payload.name,
            payload.picture,
            payload.locale || 'en'
          ]);
          user = updateResult.rows[0];
        }
        
        // Create JWT token for the user
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        const token = jwt.sign(
          { 
            userId: user.id, 
            email: user.email,
            googleId: user.google_id 
          },
          jwtSecret,
          { expiresIn: '7d' }
        );
        
        return createJsonResponse({
          user,
          token,
          message: 'Authentication successful'
        });
        
      } catch (tokenError) {
        console.error('Token verification error:', tokenError);
        return createJsonResponse({ error: 'Invalid token' }, 401);
      }
    }
    
    // POST /auth/verify - Verify JWT token
    if (method === 'POST' && url.pathname.endsWith('/auth/verify')) {
      const body = await request.json();
      const { token } = body;
      
      if (!token) {
        return createJsonResponse({ error: 'Token is required' }, 400);
      }
      
      try {
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jwt.verify(token, jwtSecret) as any;
        
        // Get updated user info from database
        const userQuery = 'SELECT * FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [decoded.userId]);
        
        if (userResult.rows.length === 0) {
          return createJsonResponse({ error: 'User not found' }, 404);
        }
        
        return createJsonResponse({
          user: userResult.rows[0],
          valid: true
        });
        
      } catch (jwtError) {
        return createJsonResponse({ error: 'Invalid or expired token' }, 401);
      }
    }
    
    // POST /auth/logout - Logout (client-side token removal)
    if (method === 'POST' && url.pathname.endsWith('/auth/logout')) {
      return createJsonResponse({ message: 'Logged out successfully' });
    }
    
    return createJsonResponse({ error: 'Endpoint not found' }, 404);
    
  } catch (error) {
    return handleDbError(error);
  } finally {
    await client.end();
  }
};