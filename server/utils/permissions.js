/**
 * Permission checking utilities for backend routes
 * This module provides helper functions to check user permissions
 * instead of hardcoded role checks
 */

const PERMISSIONS = {
    // User Management
    USERS_VIEW: 'users.view',
    USERS_CREATE: 'users.create',
    USERS_EDIT: 'users.edit',
    USERS_DELETE: 'users.delete',
    USERS_PROMOTE: 'users.promote',
    USERS_STATUS: 'users.status',

    // Role Management
    ROLES_VIEW: 'roles.view',
    ROLES_CREATE: 'roles.create',
    ROLES_EDIT: 'roles.edit',
    ROLES_DELETE: 'roles.delete',

    // Property Management
    PROPERTIES_VIEW: 'properties.view',
    PROPERTIES_CREATE: 'properties.create',
    PROPERTIES_EDIT: 'properties.edit',
    PROPERTIES_DELETE: 'properties.delete',
    PROPERTIES_APPROVE: 'properties.approve',

    // Vendor Management
    VENDORS_VIEW: 'vendors.view',
    VENDORS_APPROVE: 'vendors.approve',
    VENDORS_MANAGE: 'vendors.manage',

    // Content & Moderation
    CONTENT_MODERATE: 'content.moderate',
    REVIEWS_MANAGE: 'reviews.manage',

    // Messages & Communication
    MESSAGES_VIEW: 'messages.view',
    MESSAGES_SEND: 'messages.send',
    MESSAGES_DELETE: 'messages.delete',

    // Notifications
    NOTIFICATIONS_VIEW: 'notifications.view',
    NOTIFICATIONS_SEND: 'notifications.send',
    NOTIFICATIONS_MANAGE: 'notifications.manage',

    // System
    SETTINGS_MANAGE: 'settings.manage',
    LOGS_VIEW: 'logs.view',
    DASHBOARD_VIEW: 'dashboard.view',
    ANALYTICS_VIEW: 'analytics.view',
};

/**
 * Check if user has a specific permission
 * @param {Object} user - req.user object
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
const hasPermission = (user, permission) => {
    if (!user) return false;

    // Superadmin has all permissions
    if (user.role === 'superadmin') return true;

    // Check if user has the specific permission
    if (user.rolePermissions && Array.isArray(user.rolePermissions)) {
        return user.rolePermissions.includes(permission);
    }

    return false;
};

/**
 * Check if user has any of the specified permissions
 * @param {Object} user - req.user object
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
const hasAnyPermission = (user, permissions) => {
    if (!user) return false;

    // Superadmin has all permissions
    if (user.role === 'superadmin') return true;

    // Check if user has any of the permissions
    return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Check if user has all of the specified permissions
 * @param {Object} user - req.user object
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
const hasAllPermissions = (user, permissions) => {
    if (!user) return false;

    // Superadmin has all permissions
    if (user.role === 'superadmin') return true;

    // Check if user has all permissions
    return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Check if user is an admin (superadmin, admin, or subadmin)
 * @param {Object} user - req.user object
 * @returns {boolean}
 */
const isAdmin = (user) => {
    if (!user) return false;
    return ['superadmin', 'admin', 'subadmin'].includes(user.role);
};

/**
 * Check if user is superadmin
 * @param {Object} user - req.user object
 * @returns {boolean}
 */
const isSuperAdmin = (user) => {
    if (!user) return false;
    return user.role === 'superadmin';
};

/**
 * Check if user has permission OR is an admin
 * This is useful for routes that should be accessible to admins and users with specific permissions
 * @param {Object} user - req.user object
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
const hasPermissionOrIsAdmin = (user, permission) => {
    return isAdmin(user) || hasPermission(user, permission);
};

/**
 * Middleware to require specific permission
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!hasPermission(req.user, permission)) {
            return res.status(403).json({
                success: false,
                message: `Insufficient permissions. Required: ${permission}`
            });
        }
        next();
    };
};

/**
 * Middleware to require any of the specified permissions
 * @param {string[]} permissions - Array of permissions
 * @returns {Function} Express middleware
 */
const requireAnyPermission = (permissions) => {
    return (req, res, next) => {
        if (!hasAnyPermission(req.user, permissions)) {
            return res.status(403).json({
                success: false,
                message: `Insufficient permissions. Required one of: ${permissions.join(', ')}`
            });
        }
        next();
    };
};

/**
 * Middleware to require admin access
 * @returns {Function} Express middleware
 */
const requireAdminAccess = () => {
    return (req, res, next) => {
        if (!isAdmin(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        next();
    };
};

module.exports = {
    PERMISSIONS,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    isSuperAdmin,
    hasPermissionOrIsAdmin,
    requirePermission,
    requireAnyPermission,
    requireAdminAccess
};
