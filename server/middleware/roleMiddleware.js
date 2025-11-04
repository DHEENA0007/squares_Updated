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

// Check if user has any admin privileges (legacy admin becomes superadmin)
const isAnyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!['admin', 'subadmin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
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

      // Check role-based permissions
      const userRole = await Role.findOne({ name: req.user.role });
      
      if (!userRole || !userRole.permissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `Permission '${permission}' required`
        });
      }

      next();
    } catch (error) {
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
  GENERATE_REPORTS: 'generate_reports'
};

module.exports = {
  isSuperAdmin,
  isSubAdmin,
  isAnyAdmin,
  hasPermission,
  SUB_ADMIN_PERMISSIONS
};
