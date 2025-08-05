import type { Context } from '@netlify/functions';
import { createDbClient, handleDbError, createJsonResponse } from './lib/db';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

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
  const client = new OAuth2Client();
  
  try {
    // Verify the token with Google's API
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('Google Client ID not configured');
    }
    
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    
    const payload = ticket.getPayload();
    
    if (!payload || !payload.email || !payload.sub) {
      throw new Error('Invalid token payload');
    }
    
    // Map Google payload to our interface
    const googlePayload: GoogleTokenPayload = {
      iss: payload.iss!,
      azp: payload.azp!,
      aud: payload.aud as string,
      sub: payload.sub!,
      email: payload.email!,
      email_verified: payload.email_verified as boolean,
      at_hash: payload.at_hash,
      name: payload.name!,
      picture: payload.picture!,
      given_name: payload.given_name!,
      family_name: payload.family_name!,
      locale: payload.locale!,
      iat: payload.iat!,
      exp: payload.exp!
    };
    
    return googlePayload;
  } catch (error) {
    console.error('Google token verification failed:', error);
    throw new Error('Invalid or expired Google token');
  }
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