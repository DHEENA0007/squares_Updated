export const PERMISSIONS = {
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

    // Review Management
    REVIEWS_VIEW: 'reviews.view',
    REVIEWS_RESPOND: 'reviews.respond',
    REVIEWS_REPORT: 'reviews.report',
    REVIEWS_DELETE: 'reviews.delete',

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

    // Dashboard
    DASHBOARD_VIEW: 'dashboard.view',
    ANALYTICS_VIEW: 'analytics.view',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const PERMISSION_GROUPS = [
    {
        id: 'users',
        label: 'User Management',
        permissions: [
            { id: PERMISSIONS.USERS_VIEW, label: 'View Users' },
            { id: PERMISSIONS.USERS_CREATE, label: 'Create Users' },
            { id: PERMISSIONS.USERS_EDIT, label: 'Edit Users' },
            { id: PERMISSIONS.USERS_DELETE, label: 'Delete Users' },
            { id: PERMISSIONS.USERS_PROMOTE, label: 'Promote Users' },
            { id: PERMISSIONS.USERS_STATUS, label: 'Change User Status' },
        ]
    },
    {
        id: 'roles',
        label: 'Role Management',
        permissions: [
            { id: PERMISSIONS.ROLES_VIEW, label: 'View Roles' },
            { id: PERMISSIONS.ROLES_CREATE, label: 'Create Roles' },
            { id: PERMISSIONS.ROLES_EDIT, label: 'Edit Roles' },
            { id: PERMISSIONS.ROLES_DELETE, label: 'Delete Roles' },
        ]
    },
    {
        id: 'properties',
        label: 'Property Management',
        permissions: [
            { id: PERMISSIONS.PROPERTIES_VIEW, label: 'View Properties' },
            { id: PERMISSIONS.PROPERTIES_CREATE, label: 'Create Properties' },
            { id: PERMISSIONS.PROPERTIES_EDIT, label: 'Edit Properties' },
            { id: PERMISSIONS.PROPERTIES_DELETE, label: 'Delete Properties' },
            { id: PERMISSIONS.PROPERTIES_APPROVE, label: 'Approve Properties' },
        ]
    },
    {
        id: 'vendors',
        label: 'Vendor Management',
        permissions: [
            { id: PERMISSIONS.VENDORS_VIEW, label: 'View Vendors' },
            { id: PERMISSIONS.VENDORS_APPROVE, label: 'Approve Vendors' },
            { id: PERMISSIONS.VENDORS_MANAGE, label: 'Manage Vendors' },
        ]
    },
    {
        id: 'reviews',
        label: 'Review Management',
        permissions: [
            { id: PERMISSIONS.REVIEWS_VIEW, label: 'View Reviews' },
            { id: PERMISSIONS.REVIEWS_RESPOND, label: 'Respond to Reviews' },
            { id: PERMISSIONS.REVIEWS_REPORT, label: 'Report Inappropriate Reviews' },
            { id: PERMISSIONS.REVIEWS_DELETE, label: 'Delete Reviews' },
        ]
    },
    {
        id: 'messages',
        label: 'Messages & Communication',
        permissions: [
            { id: PERMISSIONS.MESSAGES_VIEW, label: 'View Messages' },
            { id: PERMISSIONS.MESSAGES_SEND, label: 'Send Messages' },
            { id: PERMISSIONS.MESSAGES_DELETE, label: 'Delete Messages' },
        ]
    },
    {
        id: 'notifications',
        label: 'Notifications',
        permissions: [
            { id: PERMISSIONS.NOTIFICATIONS_VIEW, label: 'View Notifications' },
            { id: PERMISSIONS.NOTIFICATIONS_SEND, label: 'Send Notifications' },
            { id: PERMISSIONS.NOTIFICATIONS_MANAGE, label: 'Manage Notifications' },
        ]
    },
    {
        id: 'system',
        label: 'System',
        permissions: [
            { id: PERMISSIONS.SETTINGS_MANAGE, label: 'Manage Settings' },
            { id: PERMISSIONS.LOGS_VIEW, label: 'View Logs' },
            { id: PERMISSIONS.DASHBOARD_VIEW, label: 'View Dashboard' },
            { id: PERMISSIONS.ANALYTICS_VIEW, label: 'View Analytics' },
        ]
    }
];
