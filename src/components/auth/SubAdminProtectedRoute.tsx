import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/loader/PageLoader';
import { authService } from '@/services/authService';

interface SubAdminProtectedRouteProps {
  children: React.ReactNode;
}

const SubAdminProtectedRoute: React.FC<SubAdminProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isSubAdmin, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isSubAdmin) {
    console.log('SubAdminProtectedRoute: User not subadmin, clearing auth and redirecting');
    
    // Clear auth data silently
    authService.clearAuthData();
    
    // If user is a vendor, redirect to vendor portal
    if (user?.role === 'agent') {
      console.log('SubAdminProtectedRoute: Vendor detected, redirecting to vendor login');
      return <Navigate to="/vendor/login" state={{ message: 'Please login through the Vendor Portal' }} replace />;
    }
    
    // Redirect to login
    return <Navigate to="/login" state={{ message: 'Please login with the correct portal' }} replace />;
  }

  return <>{children}</>;
};

export default SubAdminProtectedRoute;
