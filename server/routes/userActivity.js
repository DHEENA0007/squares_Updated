const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Role = require('../models/Role');
const { authenticateToken } = require('../middleware/authMiddleware');

// Permission constants
const PERMISSIONS = {
    USERS_VIEW: 'users.view',
    USERS_EDIT: 'users.edit',
    ROLES_VIEW: 'roles.view',
    ROLES_EDIT: 'roles.edit',
    PROPERTIES_VIEW: 'properties.view',
    PROPERTIES_APPROVE: 'properties.approve',
    VENDORS_VIEW: 'vendors.view',
    VENDORS_APPROVE: 'vendors.approve',
    SUPPORT_TICKETS_READ: 'support.tickets.read',
    SUPPORT_TICKETS_REPLY: 'support.tickets.reply',
    ADDON_SERVICES_READ: 'addon.services.read',
    ADDON_SERVICES_MANAGE: 'addon.services.manage',
    REVIEWS_VIEW: 'reviews.view',
    REVIEWS_DELETE: 'reviews.delete',
    POLICIES_EDIT_PRIVACY: 'policies.edit.privacy',
    POLICIES_EDIT_REFUND: 'policies.edit.refund'
};

// Helper function to calculate date range
const getDateRange = (timeRange) => {
    const now = new Date();
    let startDate;

    switch (timeRange) {
        case '7days':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
        case '30days':
            startDate = new Date(now.setDate(now.getDate() - 30));
            break;
        case '90days':
            startDate = new Date(now.setDate(now.getDate() - 90));
            break;
        case 'all':
        default:
            startDate = new Date(0); // Beginning of time
            break;
    }

    return startDate;
};

// Get user's activity report
router.get('/report', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { timeRange = '30days' } = req.query;
        const startDate = getDateRange(timeRange);

        const activityReport = {
            userId,
            userName: req.user.name || 'Unknown User',
            role: req.user.role,
            timeRange,
            generatedAt: new Date(),
            activities: {}
        };

        // Users Activity
        if (req.user.rolePermissions?.includes(PERMISSIONS.USERS_VIEW) || 
            req.user.rolePermissions?.includes(PERMISSIONS.USERS_EDIT)) {
            try {
                // Count users created by this user
                const usersCreated = await User.countDocuments({
                    createdBy: userId,
                    createdAt: { $gte: startDate }
                });

                // Count users edited by this user (if you track this in updateHistory)
                const usersEdited = await User.countDocuments({
                    'updateHistory.userId': userId,
                    'updateHistory.timestamp': { $gte: startDate }
                });

                const usersLast7Days = await User.countDocuments({
                    createdBy: userId,
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                });

                const usersLast30Days = await User.countDocuments({
                    createdBy: userId,
                    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                });

                activityReport.activities.users = {
                    created: usersCreated,
                    edited: usersEdited,
                    last7Days: usersLast7Days,
                    last30Days: usersLast30Days
                };
            } catch (error) {
                console.error('Error fetching user activity:', error);
            }
        }

        // Roles Activity
        if (req.user.rolePermissions?.includes(PERMISSIONS.ROLES_VIEW) || 
            req.user.rolePermissions?.includes(PERMISSIONS.ROLES_EDIT)) {
            try {
                const rolesCreated = await Role.countDocuments({
                    createdBy: userId,
                    createdAt: { $gte: startDate }
                });

                const rolesEdited = await Role.countDocuments({
                    'updateHistory.userId': userId,
                    'updateHistory.timestamp': { $gte: startDate }
                });

                activityReport.activities.roles = {
                    created: rolesCreated,
                    edited: rolesEdited
                };
            } catch (error) {
                console.error('Error fetching role activity:', error);
            }
        }

        // Properties Activity (you'll need to add createdBy/approvedBy fields to Property model)
        if (req.user.rolePermissions?.includes(PERMISSIONS.PROPERTIES_VIEW) || 
            req.user.rolePermissions?.includes(PERMISSIONS.PROPERTIES_APPROVE)) {
            try {
                // TODO: Implement when Property model has tracking fields
                // const Property = require('../models/Property');
                // const propertiesApproved = await Property.countDocuments({
                //     approvedBy: userId,
                //     approvedAt: { $gte: startDate }
                // });

                activityReport.activities.properties = {
                    approved: 0, // Placeholder
                    rejected: 0,
                    last7Days: 0,
                    last30Days: 0
                };
            } catch (error) {
                console.error('Error fetching property activity:', error);
            }
        }

        // Support Tickets Activity
        if (req.user.rolePermissions?.includes(PERMISSIONS.SUPPORT_TICKETS_READ) || 
            req.user.rolePermissions?.includes(PERMISSIONS.SUPPORT_TICKETS_REPLY)) {
            try {
                const SupportTicket = require('../models/SupportTicket');
                
                // Count tickets replied to by this user
                const ticketsReplied = await SupportTicket.countDocuments({
                    'messages.sender': userId,
                    'messages.senderModel': 'User',
                    'messages.createdAt': { $gte: startDate }
                });

                // Count tickets resolved by this user
                const ticketsResolved = await SupportTicket.countDocuments({
                    resolvedBy: userId,
                    resolvedAt: { $gte: startDate }
                });

                // Count tickets closed by this user
                const ticketsClosed = await SupportTicket.countDocuments({
                    closedBy: userId,
                    closedAt: { $gte: startDate }
                });

                const ticketsLast7Days = await SupportTicket.countDocuments({
                    'messages.sender': userId,
                    'messages.createdAt': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                });

                const ticketsLast30Days = await SupportTicket.countDocuments({
                    'messages.sender': userId,
                    'messages.createdAt': { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                });

                // Calculate average response time for this user
                const userTickets = await SupportTicket.find({
                    'messages.sender': userId,
                    'messages.createdAt': { $gte: startDate }
                }).select('messages createdAt');

                let totalResponseTime = 0;
                let responseCount = 0;

                userTickets.forEach(ticket => {
                    const userMessages = ticket.messages.filter(m => 
                        m.sender.toString() === userId.toString() && 
                        m.createdAt >= startDate
                    );
                    
                    userMessages.forEach(msg => {
                        const timeDiff = new Date(msg.createdAt) - new Date(ticket.createdAt);
                        totalResponseTime += timeDiff;
                        responseCount++;
                    });
                });

                const avgResponseTime = responseCount > 0 
                    ? Math.round((totalResponseTime / responseCount) / (1000 * 60 * 60)) // Convert to hours
                    : 0;

                activityReport.activities.supportTickets = {
                    replied: ticketsReplied,
                    resolved: ticketsResolved,
                    closed: ticketsClosed,
                    avgResponseTime,
                    last7Days: ticketsLast7Days,
                    last30Days: ticketsLast30Days
                };
            } catch (error) {
                console.error('Error fetching support ticket activity:', error);
            }
        }

        // Addon Services Activity
        if (req.user.rolePermissions?.includes(PERMISSIONS.ADDON_SERVICES_READ) || 
            req.user.rolePermissions?.includes(PERMISSIONS.ADDON_SERVICES_MANAGE)) {
            try {
                const AddonService = require('../models/AddonService');
                
                const servicesScheduled = await AddonService.countDocuments({
                    scheduledBy: userId,
                    scheduledAt: { $gte: startDate }
                });

                const servicesCompleted = await AddonService.countDocuments({
                    completedBy: userId,
                    completedAt: { $gte: startDate }
                });

                const servicesLast7Days = await AddonService.countDocuments({
                    scheduledBy: userId,
                    scheduledAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                });

                activityReport.activities.addonServices = {
                    scheduled: servicesScheduled,
                    completed: servicesCompleted,
                    last7Days: servicesLast7Days
                };
            } catch (error) {
                console.error('Error fetching addon service activity:', error);
            }
        }

        // Reviews Activity
        if (req.user.rolePermissions?.includes(PERMISSIONS.REVIEWS_VIEW) || 
            req.user.rolePermissions?.includes(PERMISSIONS.REVIEWS_DELETE)) {
            try {
                const Review = require('../models/Review');
                
                const reviewsDeleted = await Review.countDocuments({
                    deletedBy: userId,
                    deletedAt: { $gte: startDate }
                });

                const reviewsReported = await Review.countDocuments({
                    'reports.reportedBy': userId,
                    'reports.reportedAt': { $gte: startDate }
                });

                const reviewsLast7Days = await Review.countDocuments({
                    deletedBy: userId,
                    deletedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                });

                activityReport.activities.reviews = {
                    deleted: reviewsDeleted,
                    reported: reviewsReported,
                    last7Days: reviewsLast7Days
                };
            } catch (error) {
                console.error('Error fetching review activity:', error);
            }
        }

        // Policies Activity
        if (req.user.rolePermissions?.includes(PERMISSIONS.POLICIES_EDIT_PRIVACY) || 
            req.user.rolePermissions?.includes(PERMISSIONS.POLICIES_EDIT_REFUND)) {
            try {
                const Policy = require('../models/Policy');
                
                const privacyEdits = await Policy.countDocuments({
                    type: 'privacy',
                    'updateHistory.userId': userId,
                    'updateHistory.timestamp': { $gte: startDate }
                });

                const refundEdits = await Policy.countDocuments({
                    type: 'refund',
                    'updateHistory.userId': userId,
                    'updateHistory.timestamp': { $gte: startDate }
                });

                activityReport.activities.policies = {
                    privacyEdits,
                    refundEdits
                };
            } catch (error) {
                console.error('Error fetching policy activity:', error);
            }
        }

        // Vendors Activity
        if (req.user.rolePermissions?.includes(PERMISSIONS.VENDORS_VIEW) || 
            req.user.rolePermissions?.includes(PERMISSIONS.VENDORS_APPROVE)) {
            try {
                const Vendor = require('../models/Vendor');
                
                const vendorsApproved = await Vendor.countDocuments({
                    approvedBy: userId,
                    approvedAt: { $gte: startDate }
                });

                const vendorsLast7Days = await Vendor.countDocuments({
                    approvedBy: userId,
                    approvedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                });

                activityReport.activities.vendors = {
                    approved: vendorsApproved,
                    last7Days: vendorsLast7Days
                };
            } catch (error) {
                console.error('Error fetching vendor activity:', error);
            }
        }

        res.json({
            success: true,
            data: activityReport
        });

    } catch (error) {
        console.error('Error generating activity report:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating activity report',
            error: error.message
        });
    }
});

// Export user activity report (PDF/CSV)
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const { format = 'csv' } = req.query;
        
        // TODO: Implement PDF/CSV generation
        // For now, return JSON
        res.json({
            success: true,
            message: 'Export functionality coming soon',
            format
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error exporting report',
            error: error.message
        });
    }
});

module.exports = router;
