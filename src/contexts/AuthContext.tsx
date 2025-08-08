import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (idToken: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: undefined,
  });

  // Check for existing token on app load
  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const response = await fetch('/functions/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: undefined,
        });
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('auth_token');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: undefined,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Authentication check failed',
      });
    }
  };

  const login = async (idToken: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const response = await fetch('/functions/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.token);
        setAuthState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: undefined,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint (mainly for logging purposes)
      await fetch('/functions/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
    } catch (error) {
      console.error('Logout endpoint failed:', error);
    } finally {
      // Always clean up local state
      localStorage.removeItem('auth_token');
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: undefined,
      });
    }
  };

  const refreshAuth = async () => {
    await checkExistingAuth();
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};