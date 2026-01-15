import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS } from '../config/permissionConfig';

export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // SuperAdmin has all permissions
    if (user.role === 'superadmin') return true;

    // Check if user has the specific permission
    const permissions = user.rolePermissions || [];
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every(permission => hasPermission(permission));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions: user?.rolePermissions || [],
    PERMISSIONS
  };
};
