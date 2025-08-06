import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import GoogleSignIn from './GoogleSignIn';
import toast from 'react-hot-toast';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, error } = useAuth();

  const handleSignInSuccess = () => {
    toast.success('Successfully signed in!');
  };

  const handleSignInError = (error: string) => {
    toast.error(`Sign-in failed: ${error}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        <p className="text-center text-gray-600 mt-4">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <GoogleSignIn 
              onSuccess={handleSignInSuccess}
              onError={handleSignInError}
            />
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;