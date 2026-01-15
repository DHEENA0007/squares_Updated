const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user exists and is active
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is not active'
      });
    }

    // Fetch role permissions from database for all roles (including default roles)
    let rolePermissions = [];
    let roleObject = null;
    const Role = require('../models/Role');
    const roleDoc = await Role.findOne({ name: user.role, isActive: true });

    if (roleDoc && roleDoc.permissions) {
      rolePermissions = roleDoc.permissions;
      roleObject = roleDoc;
    }

    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.email,
      profile: user.profile,
      rolePermissions: rolePermissions, // For backward compatibility and user-specific overrides
      roleObject: roleObject // Full role document with permissions
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user's role is explicitly allowed
    if (roles.includes(req.user.role)) {
      return next();
    }

    // For custom roles, check if they have the proper permissions/level
    // Do NOT grant access just because it's a custom role
    const defaultRoles = ['customer', 'agent', 'admin', 'subadmin', 'superadmin'];
    const isCustomRole = !defaultRoles.includes(req.user.role);

    if (isCustomRole && req.user.roleObject) {
      // Check if custom role has sufficient level for admin routes
      if (roles.includes('admin') && req.user.roleObject.level >= 8) {
        return next();
      }
      // Check if custom role has sufficient level for subadmin routes
      if (roles.includes('subadmin') && req.user.roleObject.level >= 7) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions'
    });
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (user && user.status === 'active') {
      req.user = {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.email,
        profile: user.profile
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check if user has admin or superadmin role
  if (['admin', 'superadmin'].includes(req.user.role)) {
    return next();
  }

  // Check if custom role has admin-level permissions (level >= 8)
  const defaultRoles = ['customer', 'agent', 'admin', 'subadmin', 'superadmin'];
  const isCustomRole = !defaultRoles.includes(req.user.role);

  if (isCustomRole && req.user.roleObject && req.user.roleObject.level >= 8) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Admin access required'
  });
};

const requireSubAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check if user has subadmin, admin, or superadmin role
  if (['subadmin', 'admin', 'superadmin'].includes(req.user.role)) {
    return next();
  }

  // Check if custom role has subadmin-level permissions (level >= 7)
  const defaultRoles = ['customer', 'agent', 'admin', 'subadmin', 'superadmin'];
  const isCustomRole = !defaultRoles.includes(req.user.role);

  if (isCustomRole && req.user.roleObject && req.user.roleObject.level >= 7) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'SubAdmin access required'
  });
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  optionalAuth,
  requireAdmin,
  requireSubAdmin
};