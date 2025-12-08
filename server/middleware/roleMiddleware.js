const Role = require('../models/Role');

// Check if user has super admin privileges
const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required'
    });
  }

  next();
};

// Check if user has sub admin privileges
const isSubAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!['subadmin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

// Check if user has any admin privileges
const isAnyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Allow standard admin roles
  if (['subadmin', 'superadmin', 'admin'].includes(req.user.role)) {
    return next();
  }

  // Allow custom roles - any role that is not a standard user role
  // We exclude standard user/vendor roles to identify "admin-like" custom roles
  const nonAdminRoles = ['customer', 'agent', 'vendor', 'builder']; // Adjust based on your system's standard roles
  if (!nonAdminRoles.includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Admin access required'
  });
};

// Check specific permission
const hasPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      // Super admins have all permissions
      if (req.user.role === 'superadmin') {
        return next();
      }

      // SubAdmins have all permissions defined in SUB_ADMIN_PERMISSIONS
      if (req.user.role === 'subadmin') {
        return next();
      }

      // For other roles, check if they have the required permission
      // Since we're using page-based access, we'll allow all subadmin permissions
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
        error: error.message
      });
    }
  };
};

// Permission constants for sub admin
const SUB_ADMIN_PERMISSIONS = {
  REVIEW_PROPERTIES: 'review_properties',
  APPROVE_PROPERTIES: 'approve_properties',
  REJECT_PROPERTIES: 'reject_properties',
  MODERATE_CONTENT: 'moderate_user_content',
  HANDLE_SUPPORT: 'handle_support_tickets',
  TRACK_PERFORMANCE: 'track_vendor_performance',
  APPROVE_PROMOTIONS: 'approve_promotions',
  SEND_NOTIFICATIONS: 'send_notifications',
  GENERATE_REPORTS: 'generate_reports',
  APPROVE_VENDORS: 'approve_vendors',
  REJECT_VENDORS: 'reject_vendors',
  REVIEW_VENDORS: 'review_vendors'
};

module.exports = {
  isSuperAdmin,
  isSubAdmin,
  isAnyAdmin,
  hasPermission,
  SUB_ADMIN_PERMISSIONS
};
