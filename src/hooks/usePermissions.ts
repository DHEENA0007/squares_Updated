import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/config/permissionConfig';

export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    
    // SuperAdmin has all permissions
    if (user.role === 'superadmin') return true;
    
    // Check if user has the specific permission
    const permissions = user.rolePermissions || [];
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions: user?.rolePermissions || []
  };
};
