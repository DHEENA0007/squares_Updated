import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@/services/authService';

interface User {
  id: string;
  email: string;
  role: string;
  rolePages?: string[];
  profile?: any;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSubAdmin: boolean;
  isSuperAdmin: boolean;
  isVendor: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
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
        console.log('AuthContext: checkAuth - storedUser:', storedUser);
        if (storedUser) {
          setUser(storedUser);
          console.log('AuthContext: checkAuth - User set from stored data:', storedUser);
        } else {
          // Try to get current user from API
          const response = await authService.getCurrentUser();
          if (response.success) {
            setUser(response.data.user);
            console.log('AuthContext: checkAuth - User set from API:', response.data.user);
          } else {
            // Clear invalid auth
            console.log('AuthContext: checkAuth - Invalid auth, logging out');
            authService.logout();
          }
        }
      } else {
        console.log('AuthContext: checkAuth - User not authenticated');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      authService.logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login({ email, password });
      if (response.success && response.data?.user) {
        const userData = response.data.user;
        setUser(userData);
        console.log('AuthContext: User set after login:', userData);
        console.log('AuthContext: User role is:', userData.role);
        console.log('AuthContext: isAdmin will be:', userData.role === 'admin' || userData.role === 'superadmin' || userData.role === 'subadmin');
        console.log('AuthContext: isSuperAdmin will be:', userData.role === 'superadmin');
        console.log('AuthContext: isSubAdmin will be:', userData.role === 'subadmin');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    authService.logout();
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
        checkAuth 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
