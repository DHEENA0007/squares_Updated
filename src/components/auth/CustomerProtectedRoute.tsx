import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/loader/PageLoader';
import { authService } from '@/services/authService';

interface CustomerProtectedRouteProps {
  children: React.ReactNode;
}

const CustomerProtectedRoute: React.FC<CustomerProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    // Redirect to login and preserve the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If vendor tries to access customer routes, redirect to vendor portal
  if (user?.role === 'agent') {
    console.log('CustomerProtectedRoute: Vendor detected, clearing auth and redirecting to vendor login');
    authService.clearAuthData();
    return <Navigate to="/vendor/login" state={{ message: 'Please login through the Vendor Portal' }} replace />;
  }

  // If admin tries to access customer routes, redirect to admin portal
  if (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'subadmin') {
    console.log('CustomerProtectedRoute: Admin detected, clearing auth and redirecting to login');
    authService.clearAuthData();
    return <Navigate to="/login" state={{ message: 'Please login through the Admin Portal' }} replace />;
  }

  return <>{children}</>;
};

export default CustomerProtectedRoute;
