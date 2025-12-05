import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PORTAL_PAGES, PageConfig, getPagesByIds } from '@/config/pages.config';

export const useUserPages = (): PageConfig[] => {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return [];

    // Superadmins always get all admin pages
    if (user.role === 'superadmin') {
      return PORTAL_PAGES.filter(page => page.category === 'admin');
    }

    // For development/testing - if user has no role pages defined, use default based on role type
    if (!user.rolePages || user.rolePages.length === 0) {
      // Fallback to category-based filtering for backward compatibility
      const roleCategory = getRoleCategoryFromRole(user.role);
      if (roleCategory) {
        return PORTAL_PAGES.filter(page => page.category === roleCategory);
      }
      return [];
    }

    // Return pages based on user's assigned role pages
    return getPagesByIds(user.rolePages);
  }, [user]);
};

// Helper function to map old role names to categories
const getRoleCategoryFromRole = (role: string): 'admin' | 'subadmin' | 'vendor' | 'customer' | null => {
  const normalizedRole = role.toLowerCase();
  
  if (normalizedRole === 'superadmin') return 'admin';
  if (normalizedRole === 'subadmin') return 'subadmin';
  if (normalizedRole === 'agent' || normalizedRole === 'vendor') return 'vendor';
  if (normalizedRole === 'customer') return 'customer';
  
  return null;
};
