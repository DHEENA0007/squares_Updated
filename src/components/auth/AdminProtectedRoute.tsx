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

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    console.log('AdminProtectedRoute: User not authenticated, redirecting to login');
    // Redirect to login and preserve the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    console.log('AdminProtectedRoute: User not admin, redirecting to customer dashboard');
    // Redirect non-admin users to customer dashboard
    return <Navigate to="/customer/dashboard" replace />;
  }

  console.log('AdminProtectedRoute: Access granted to admin area');
  return <>{children}</>;
};

export default AdminProtectedRoute;
