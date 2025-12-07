import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@/services/authService';
import { toast } from '@/components/ui/use-toast';

interface User {
  id: string;
  email: string;
  role: string;
  rolePages?: string[];
  profile?: any;
}

interface LoginResult {
  success: boolean;
  error?: string;
  isVendorPendingApproval?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSubAdmin: boolean;
  isSuperAdmin: boolean;
  isVendor: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: (skipRedirect?: boolean) => void;
  checkAuth: () => Promise<void>;
  clearAuthDataAndUser: () => void; // add clearAuthDataAndUser to context type
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      if (authService.isAuthenticated()) {
        const storedUser = authService.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        } else {
          const response = await authService.getCurrentUser();
          if (response.success) {
            setUser(response.data.user);
          } else {
            authService.logout();
          }
        }
      } else {
        // Not authenticated
      }
    } catch (error) {
      authService.logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const response = await authService.login({ email, password });
      if (response.success && response.data?.user) {
        const userData = response.data.user;
        setUser(userData);
        return { success: true };
      }
      return { success: false, error: response.message || 'Login failed' };
    } catch (error: any) {
      // Handle specific vendor pending approval case
      if (error.message?.includes('pending approval') || error.message?.includes('pending_approval')) {
        return { 
          success: false, 
          error: 'Your vendor profile is pending approval. You will be notified once approved by our admin team.', 
          isVendorPendingApproval: true 
        };
      }
      return { success: false, error: error.message || 'An error occurred. Please try again.' };
    }
  };

  const logout = (skipRedirect?: boolean) => {
    authService.logout();
    setUser(null);
    
    // Only redirect if not explicitly skipped
    if (!skipRedirect) {
      // Force reload to clear all state and redirect to login
      window.location.href = '/v2/login';
    }
  };

  const clearAuthDataAndUser = () => {
    authService.clearAuthData();
    setUser(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'subadmin';
  const isSuperAdmin = user?.role === 'superadmin';
  const isSubAdmin = user?.role === 'subadmin';
  const isVendor = user?.role === 'agent';

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated, 
        isAdmin, 
        isSuperAdmin,
        isSubAdmin,
        isVendor,
        loading, 
        login, 
        logout, 
        checkAuth,
        clearAuthDataAndUser // add to context
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
