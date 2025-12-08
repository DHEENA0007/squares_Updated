import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/loader/PageLoader';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();
  const location = useLocation();

  console.log('AdminProtectedRoute: User:', user);
  console.log('AdminProtectedRoute: isAuthenticated:', isAuthenticated);
  console.log('AdminProtectedRoute: isAdmin:', isAdmin);
  console.log('AdminProtectedRoute: loading:', loading);
  console.log('AdminProtectedRoute: Current path:', location.pathname);

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    console.log('AdminProtectedRoute: User not authenticated, redirecting to login');
    // Redirect to login and preserve the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Allow access for:
  // 1. admin, superadmin, subadmin roles
  // 2. Custom roles with rolePermissions
  const isCustomRole = user?.rolePermissions && user.rolePermissions.length > 0;
  const isStandardAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'subadmin';

  if (!isStandardAdmin && !isCustomRole) {
    console.log('AdminProtectedRoute: User not admin and no custom permissions, clearing auth and redirecting');

    // Clear auth data silently
    const { authService } = require('@/services/authService');
    authService.clearAuthData();

    // If user is a vendor, redirect to vendor portal
    if (user?.role === 'agent') {
      console.log('AdminProtectedRoute: Vendor detected, redirecting to vendor login');
      return <Navigate to="/vendor/login" state={{ message: 'Please login through the Vendor Portal' }} replace />;
    }

    // Redirect to customer login
    return <Navigate to="/login" state={{ message: 'Please login through the Customer Portal' }} replace />;
  }

  console.log('AdminProtectedRoute: Access granted to admin area');
  return <>{children}</>;
};

export default AdminProtectedRoute;
