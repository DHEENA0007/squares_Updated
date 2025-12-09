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

    // Property Management (Extended)
    PM_READ: 'propertyManagement.read',
    PM_T_CREATE: 'propertyManagement.tCreate',
    PM_T_EDIT: 'propertyManagement.tEdit',
    PM_T_DELETE: 'propertyManagement.tDelete',
    PM_T_STATUS: 'propertyManagement.tStatus',
    PM_T_MANAGE_FIELDS: 'propertyManagement.tManageFields',
    PM_T_ORDER: 'propertyManagement.tOrder',
    PM_A_CREATE: 'propertyManagement.aCreate',
    PM_A_EDIT: 'propertyManagement.aEdit',
    PM_A_DELETE: 'propertyManagement.aDelete',
    PM_A_STATUS: 'propertyManagement.aStatus',
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
    NOTIFICATIONS_DELETE: 'notifications.delete',

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
        id: 'clients',
        label: 'Clients Management',
        permissions: [
            { id: PERMISSIONS.CLIENTS_READ, label: 'View Clients' },
            { id: PERMISSIONS.CLIENTS_ACCESS_ACTIONS, label: 'Access Client Actions' },
            { id: PERMISSIONS.CLIENTS_ACCESS_DETAILS, label: 'View Client Details' },
            { id: PERMISSIONS.CLIENTS_DETAILS_EDIT, label: 'Edit Client Details (Cancel Subscription)' },
        ]
    },
    {
        id: 'plans',
        label: 'Plans Management',
        permissions: [
            { id: PERMISSIONS.PLANS_READ, label: 'View Plans' },
            { id: PERMISSIONS.PLANS_CREATE, label: 'Create Plan' },
            { id: PERMISSIONS.PLANS_EDIT, label: 'Edit Plan' },
        ]
    },
    {
        id: 'addons',
        label: 'Addons Management',
        permissions: [
            { id: PERMISSIONS.ADDONS_READ, label: 'View Addons' },
            { id: PERMISSIONS.ADDONS_CREATE, label: 'Create Addon' },
            { id: PERMISSIONS.ADDONS_EDIT, label: 'Edit Addon' },
            { id: PERMISSIONS.ADDONS_DEACTIVATE, label: 'Deactivate Addon' },
            { id: PERMISSIONS.ADDONS_DELETE, label: 'Delete Addon' },
        ]
    },
    {
        id: 'propertyManagement',
        label: 'Property Management',
        permissions: [
            { id: PERMISSIONS.PM_READ, label: 'View Property Management' },
            { id: PERMISSIONS.PM_T_CREATE, label: 'Create Property Type & Category' },
            { id: PERMISSIONS.PM_T_EDIT, label: 'Edit Property Type' },
            { id: PERMISSIONS.PM_T_DELETE, label: 'Delete Property Type' },
            { id: PERMISSIONS.PM_T_STATUS, label: 'Toggle Property Type Status' },
            { id: PERMISSIONS.PM_T_MANAGE_FIELDS, label: 'Manage Property Fields' },
            { id: PERMISSIONS.PM_T_ORDER, label: 'Manage Property Type Order' },
            { id: PERMISSIONS.PM_A_CREATE, label: 'Create Amenity' },
            { id: PERMISSIONS.PM_A_EDIT, label: 'Edit Amenity' },
            { id: PERMISSIONS.PM_A_DELETE, label: 'Delete Amenity' },
            { id: PERMISSIONS.PM_A_STATUS, label: 'Toggle Amenity Status' },
            { id: PERMISSIONS.PM_A_ORDER, label: 'Manage Amenity Order' },
        ]
    },
    {
        id: 'filterManagement',
        label: 'Filter Management',
        permissions: [
            { id: PERMISSIONS.FILTER_READ, label: 'View Filters (Read Only)' },
            { id: PERMISSIONS.FILTER_CREATE_NTP, label: 'Create Filter Type' },
            { id: PERMISSIONS.FILTER_CREATE_FTO, label: 'Create Filter Type Option' },
            { id: PERMISSIONS.FILTER_ORDER, label: 'Manage Filter Order' },
            { id: PERMISSIONS.FILTER_STATUS, label: 'Toggle Filter Status' },
            { id: PERMISSIONS.FILTER_EDIT, label: 'Edit Filter' },
            { id: PERMISSIONS.FILTER_DELETE, label: 'Delete Filter' },
        ]
    },
    {
        id: 'supportTickets',
        label: 'Support Tickets',
        permissions: [
            { id: PERMISSIONS.SUPPORT_TICKETS_READ, label: 'View Support Tickets' },
            { id: PERMISSIONS.SUPPORT_TICKETS_VIEW, label: 'View Full Conversation' },
            { id: PERMISSIONS.SUPPORT_TICKETS_REPLY, label: 'Reply to Tickets' },
            { id: PERMISSIONS.SUPPORT_TICKETS_STATUS, label: 'Update Ticket Status' },
        ]
    },
    {
        id: 'addonServices',
        label: 'Addon Services',
        permissions: [
            { id: PERMISSIONS.ADDON_SERVICES_READ, label: 'View Vendor Addon Services' },
            { id: PERMISSIONS.ADDON_SERVICES_SCHEDULE, label: 'Schedule Addon Services' },
            { id: PERMISSIONS.ADDON_SERVICES_MANAGE, label: 'Manage Service Schedules' },
            { id: PERMISSIONS.ADDON_SERVICES_STATUS, label: 'Update Schedule Status' },
            { id: PERMISSIONS.ADDON_SERVICES_NOTES, label: 'Add Notes to Schedules' },
        ]
    },
    {
        id: 'policies',
        label: 'Policies Management',
        permissions: [
            { id: PERMISSIONS.POLICIES_READ, label: 'View Policies' },
            { id: PERMISSIONS.POLICIES_EDIT_PRIVACY, label: 'Edit Privacy Policy' },
            { id: PERMISSIONS.POLICIES_EDIT_REFUND, label: 'Edit Refund Policy' },
        ]
    },
    {
        id: 'notifications',
        label: 'Notifications',
        permissions: [
            { id: PERMISSIONS.NOTIFICATIONS_VIEW, label: 'View Notifications' },
            { id: PERMISSIONS.NOTIFICATIONS_SEND, label: 'Send Notifications' },
            { id: PERMISSIONS.NOTIFICATIONS_DELETE, label: 'Delete Notifications' },
        ]
    }
];
