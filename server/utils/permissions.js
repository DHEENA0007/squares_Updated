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

    // Clients Management
    CLIENTS_READ: 'clients.read',
    CLIENTS_ACCESS_ACTIONS: 'clients.accessActions',
    CLIENTS_ACCESS_DETAILS: 'clients.accessDetails',
    CLIENTS_DETAILS_EDIT: 'clients.detailsEdit',

    // Plans Management
    PLANS_READ: 'plans.read',
    PLANS_CREATE: 'plans.create',
    PLANS_EDIT: 'plans.edit',

    // Addons Management
    ADDONS_READ: 'addons.read',
    ADDONS_CREATE: 'addons.create',
    ADDONS_EDIT: 'addons.edit',
    ADDONS_DEACTIVATE: 'addons.deactivate',
    ADDONS_DELETE: 'addons.delete',

    // Property Management (Optimized)
    PM_READ: 'propertyManagement.read',
    PM_T_CREATE: 'propertyManagement.tCreate',
    PM_T_STATUS: 'propertyManagement.tStatus',
    PM_T_EDIT: 'propertyManagement.tEdit',
    PM_T_DELETE: 'propertyManagement.tDelete',
    PM_T_MANAGE_FIELDS: 'propertyManagement.tManageFields',
    PM_T_ORDER: 'propertyManagement.tOrder',
    PM_A_CREATE: 'propertyManagement.aCreate',
    PM_A_STATUS: 'propertyManagement.aStatus',
    PM_A_EDIT: 'propertyManagement.aEdit',
    PM_A_DELETE: 'propertyManagement.aDelete',
    PM_A_ORDER: 'propertyManagement.aOrder',

    // Filter Management
    FILTER_READ: 'filterManagement.read',
    FILTER_CREATE_NTP: 'filterManagement.createNtp',
    FILTER_CREATE_FTO: 'filterManagement.createFto',
    FILTER_ORDER: 'filterManagement.order',
    FILTER_STATUS: 'filterManagement.status',
    FILTER_EDIT: 'filterManagement.edit',
    FILTER_DELETE: 'filterManagement.delete',

    // Support Tickets
    SUPPORT_TICKETS_READ: 'supportTickets.read',
    SUPPORT_TICKETS_VIEW: 'supportTickets.view',
    SUPPORT_TICKETS_REPLY: 'supportTickets.reply',
    SUPPORT_TICKETS_STATUS: 'supportTickets.status',

    // Addon Services
    ADDON_SERVICES_READ: 'addonServices.read',
    ADDON_SERVICES_SCHEDULE: 'addonServices.schedule',
    ADDON_SERVICES_MANAGE: 'addonServices.manage',
    ADDON_SERVICES_STATUS: 'addonServices.status',
    ADDON_SERVICES_NOTES: 'addonServices.notes',

    // Policies
    POLICIES_READ: 'policies.read',
    POLICIES_EDIT_PRIVACY: 'policies.editPrivacy',
    POLICIES_EDIT_REFUND: 'policies.editRefund',

    // Notifications
    NOTIFICATIONS_VIEW: 'notifications.view',
    NOTIFICATIONS_SEND: 'notifications.send',
    NOTIFICATIONS_MANAGE: 'notifications.manage',

    // Dashboard
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

    // Check if user has the specific permission in rolePermissions array (user-specific overrides)
    if (user.rolePermissions && Array.isArray(user.rolePermissions)) {
        if (user.rolePermissions.includes(permission)) {
            return true;
        }
    }

    // Check if user's role has the permission (role-based permissions)
    if (user.roleObject && user.roleObject.permissions && Array.isArray(user.roleObject.permissions)) {
        return user.roleObject.permissions.includes(permission);
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
