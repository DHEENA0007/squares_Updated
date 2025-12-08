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
    const Role = require('../models/Role');
    const roleDoc = await Role.findOne({ name: user.role, isActive: true });

    if (roleDoc && roleDoc.permissions) {
      rolePermissions = roleDoc.permissions;
    }

    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.email,
      profile: user.profile,
      rolePermissions: rolePermissions
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

    console.log(`[AuthMiddleware] User role: ${req.user.role}, Allowed roles: [${roles.join(', ')}]`);

    // Check if user's role is explicitly allowed
    if (roles.includes(req.user.role)) {
      return next();
    }

    // Allow custom roles if the route allows 'subadmin' or 'admin'
    // We assume custom roles are administrative in nature
    const defaultRoles = ['customer', 'agent', 'admin', 'subadmin', 'superadmin'];
    const isCustomRole = !defaultRoles.includes(req.user.role);

    if (isCustomRole && (roles.includes('admin') || roles.includes('subadmin'))) {
      console.log(`[AuthMiddleware] Allowing custom role: ${req.user.role}`);
      return next();
    }

    console.log(`[AuthMiddleware] Access denied for role: ${req.user.role}`);
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

  const defaultRoles = ['customer', 'agent', 'admin', 'subadmin', 'superadmin'];
  const isCustomRole = !defaultRoles.includes(req.user.role);

  if (!['admin', 'superadmin'].includes(req.user.role) && !isCustomRole) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

const requireSubAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const defaultRoles = ['customer', 'agent', 'admin', 'subadmin', 'superadmin'];
  const isCustomRole = !defaultRoles.includes(req.user.role);

  if (!['subadmin', 'admin', 'superadmin'].includes(req.user.role) && !isCustomRole) {
    return res.status(403).json({
      success: false,
      message: 'SubAdmin access required'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  optionalAuth,
  requireAdmin,
  requireSubAdmin
};