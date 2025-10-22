import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface VendorProtectedRouteProps {
  children: React.ReactNode;
}

const VendorProtectedRoute: React.FC<VendorProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, redirect to vendor login
  if (!isAuthenticated) {
    console.log('VendorProtectedRoute: User not authenticated, redirecting to login');
    return <Navigate to="/vendor/login" replace />;
  }

  // If authenticated but not a vendor (agent), redirect to vendor login with error
  if (user?.role !== 'agent') {
    console.log('VendorProtectedRoute: User role is', user?.role, 'expected agent, redirecting to login');
    return <Navigate to="/vendor/login" replace />;
  }

  console.log('VendorProtectedRoute: User authenticated as vendor, rendering protected content');
  // If authenticated and is a vendor, render the protected content
  return <>{children}</>;
};

export default VendorProtectedRoute;