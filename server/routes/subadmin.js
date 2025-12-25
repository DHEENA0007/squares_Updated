const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const User = require('../models/User');
const Message = require('../models/Message');
const SupportTicket = require('../models/SupportTicket');
const Review = require('../models/Review');
const Subscription = require('../models/Subscription');
const AddonService = require('../models/AddonService');
const emailService = require('../utils/emailService');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isSubAdmin, hasPermission, SUB_ADMIN_PERMISSIONS } = require('../middleware/roleMiddleware');
const { asyncHandler } = require('../middleware/errorMiddleware');
const adminRealtimeService = require('../services/adminRealtimeService');
const { PERMISSIONS } = require('../utils/permissions');
const { sanitizeSearchQuery, sanitizePagination, sanitizeCSV, validateDate } = require('../utils/sanitize');

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(isSubAdmin);

// Get sub admin dashboard statistics (user-specific)
router.get('/dashboard', asyncHandler(async (req, res) => {
  const subAdminId = req.user.id;

  // Date ranges for analytics
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalPropertiesApproved,
    availablePropertiesApproved,
    pendingProperties,
    rejectedPropertiesApproved,
    totalSupport,
    openSupport,
    resolvedSupport,
    closedSupport,
    // Analytics data
    propertiesApprovedLast7Days,
    propertiesApprovedLast30Days,
    supportTicketsResolvedLast7Days,
    supportTicketsResolvedLast30Days,
    // This month vs last month
    propertiesApprovedThisMonth,
    propertiesApprovedLastMonth,
    supportTicketsThisMonth,
    supportTicketsLastMonth,
    // Recent activities
    recentApprovals,
    recentRejections,
    recentTickets
  ] = await Promise.all([
    // Properties approved by this subadmin
    Property.countDocuments({ approvedBy: subAdminId }),
    Property.countDocuments({ approvedBy: subAdminId, status: 'available' }),
    // All pending properties (not user-specific, as they haven't been assigned yet)
    Property.countDocuments({ status: 'pending' }),
    // Rejected properties by this subadmin
    Property.countDocuments({ approvedBy: subAdminId, status: 'rejected' }),
    // Support tickets handled by this subadmin
    SupportTicket.countDocuments({ assignedTo: subAdminId }),
    SupportTicket.countDocuments({ assignedTo: subAdminId, status: 'open' }),
    SupportTicket.countDocuments({ assignedTo: subAdminId, status: 'resolved' }),
    SupportTicket.countDocuments({ assignedTo: subAdminId, status: 'closed' }),
    // Last 7 days analytics
    Property.countDocuments({
      approvedBy: subAdminId,
      approvedAt: { $gte: last7Days }
    }),
    Property.countDocuments({
      approvedBy: subAdminId,
      approvedAt: { $gte: last30Days }
    }),
    SupportTicket.countDocuments({
      assignedTo: subAdminId,
      status: 'resolved',
      updatedAt: { $gte: last7Days }
    }),
    SupportTicket.countDocuments({
      assignedTo: subAdminId,
      status: 'resolved',
      updatedAt: { $gte: last30Days }
    }),
    // This month vs last month
    Property.countDocuments({
      approvedBy: subAdminId,
      approvedAt: { $gte: thisMonthStart }
    }),
    Property.countDocuments({
      approvedBy: subAdminId,
      approvedAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    }),
    SupportTicket.countDocuments({
      assignedTo: subAdminId,
      createdAt: { $gte: thisMonthStart }
    }),
    SupportTicket.countDocuments({
      assignedTo: subAdminId,
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    }),
    // Recent activities
    Property.find({ approvedBy: subAdminId, status: 'available' })
      .sort({ approvedAt: -1 })
      .limit(5)
      .select('title type approvedAt')
      .populate('owner', 'profile.firstName profile.lastName email'),
    Property.find({ approvedBy: subAdminId, status: 'rejected' })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title type rejectionReason updatedAt'),
    SupportTicket.find({ assignedTo: subAdminId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('subject status priority updatedAt')
      .populate('user', 'profile.firstName profile.lastName email')
  ]);

  // Calculate trends
  const propertyApprovalTrend = propertiesApprovedLastMonth > 0
    ? ((propertiesApprovedThisMonth - propertiesApprovedLastMonth) / propertiesApprovedLastMonth * 100).toFixed(1)
    : propertiesApprovedThisMonth > 0 ? 100 : 0;

  const supportTicketTrend = supportTicketsLastMonth > 0
    ? ((supportTicketsThisMonth - supportTicketsLastMonth) / supportTicketsLastMonth * 100).toFixed(1)
    : supportTicketsThisMonth > 0 ? 100 : 0;

  // Calculate average response time
  const avgResponseTime = await SupportTicket.aggregate([
    {
      $match: {
        assignedTo: subAdminId,
        status: { $in: ['resolved', 'closed'] }
      }
    },
    {
      $project: {
        responseTime: {
          $subtract: ['$updatedAt', '$createdAt']
        }
      }
    },
    {
      $group: {
        _id: null,
        avgTime: { $avg: '$responseTime' }
      }
    }
  ]);

  const avgResponseTimeHours = avgResponseTime.length > 0
    ? (avgResponseTime[0].avgTime / (1000 * 60 * 60)).toFixed(1)
    : 0;

  res.json({
    success: true,
    data: {
      // Basic stats
      totalPropertiesApproved,
      availablePropertiesApproved,
      pendingProperties,
      rejectedPropertiesApproved,
      totalSupport,
      openSupport,
      resolvedSupport,
      closedSupport,
      // Analytics
      analytics: {
        propertiesApprovedLast7Days,
        propertiesApprovedLast30Days,
        supportTicketsResolvedLast7Days,
        supportTicketsResolvedLast30Days,
        propertiesApprovedThisMonth,
        propertiesApprovedLastMonth,
        supportTicketsThisMonth,
        supportTicketsLastMonth,
        propertyApprovalTrend: parseFloat(propertyApprovalTrend),
        supportTicketTrend: parseFloat(supportTicketTrend),
        avgResponseTimeHours: parseFloat(avgResponseTimeHours)
      },
      // Recent activity
      recentActivity: {
        approvals: recentApprovals,
        rejections: recentRejections,
        tickets: recentTickets
      }
    }
  });
}));

// Property Review and Approval Routes
router.get('/properties/pending',
  hasPermission(SUB_ADMIN_PERMISSIONS.REVIEW_PROPERTIES),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '', type, listingType, startDate, endDate } = req.query;
    const pagination = sanitizePagination(page, limit);

    let query = { status: 'pending' };

    // Search filter
    if (search) {
      const sanitizedSearch = sanitizeSearchQuery(search);
      query.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { 'address.city': { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    // Property type filter
    if (type && type !== 'all') {
      query.type = type;
    }

    // Listing type filter
    if (listingType && listingType !== 'all') {
      query.listingType = listingType;
    }

    // Date range filters
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const [properties, total] = await Promise.all([
      Property.find(query)
        .populate('owner', 'email profile')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Property.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        properties,
        total,
        totalPages: Math.ceil(total / pagination.limit),
        currentPage: pagination.page,
        hasNext: pagination.page < Math.ceil(total / pagination.limit),
        hasPrev: pagination.page > 1
      }
    });
  })
);

// Approve property
router.post('/properties/:id/approve',
  hasPermission(SUB_ADMIN_PERMISSIONS.APPROVE_PROPERTIES),
  asyncHandler(async (req, res) => {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      {
        status: 'available',
        verified: true,
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      { new: true }
    ).populate('owner', 'email profile');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Send approval email to property owner (non-blocking)
    const owner = property.owner;
    if (owner && owner.email) {
      emailService.sendEmail({
        to: owner.email,
        subject: 'Property Approved',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Property Approved</h2>
            <p>Dear ${owner.profile?.firstName || 'User'},</p>
            <p>Great news! Your property "<strong>${property.title}</strong>" has been approved and is now live on our platform.</p>
            <p>You can view and manage your property from your dashboard.</p>
            <p>Best regards,<br>BuildHomeMartSquares Team</p>
          </div>
        `
      }).catch(err => console.error('Email send error:', err));
    }

    // Emit real-time event for property approval
    adminRealtimeService.broadcastNotification({
      type: 'property_approved',
      title: 'Property Approved',
      message: `Property "${property.title}" has been approved`,
      data: {
        propertyId: property._id,
        propertyTitle: property.title,
        approvedBy: req.user.email,
        approvedAt: new Date()
      },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Property approved successfully',
      data: property
    });
  })
);

// Reject property
router.post('/properties/:id/reject',
  hasPermission(SUB_ADMIN_PERMISSIONS.REJECT_PROPERTIES),
  asyncHandler(async (req, res) => {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const property = await Property.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectionReason: reason,
        rejectedBy: req.user.id,
        rejectedAt: new Date()
      },
      { new: true }
    ).populate('owner', 'email profile');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Send rejection email to property owner (non-blocking)
    const owner = property.owner;
    if (owner && owner.email) {
      emailService.sendEmail({
        to: owner.email,
        subject: 'Property Listing Rejected',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Property Listing Rejected</h2>
            <p>Dear ${owner.profile?.firstName || 'User'},</p>
            <p>We regret to inform you that your property listing "<strong>${property.title}</strong>" has been rejected.</p>
            <p><strong>Rejection Reason:</strong></p>
            <p style="padding: 10px; background-color: #fee2e2; border-left: 4px solid #dc2626;">${reason}</p>
            <p>You can review the rejection details and make necessary corrections before resubmitting your property listing.</p>
            <p>If you have any questions or need assistance, please contact our support team.</p>
            <p>Best regards,<br>BuildHomeMartSquares Team</p>
          </div>
        `
      }).catch(err => console.error('Email send error:', err));
    }

    // Emit real-time event for property rejection
    adminRealtimeService.broadcastNotification({
      type: 'property_rejected',
      title: 'Property Rejected',
      message: `Property "${property.title}" has been rejected`,
      data: {
        propertyId: property._id,
        propertyTitle: property.title,
        rejectedBy: req.user.email,
        rejectionReason: reason,
        rejectedAt: new Date()
      },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Property rejected successfully',
      data: property
    });
  })
);

// Get rejected properties
router.get('/properties/rejected',
  hasPermission(SUB_ADMIN_PERMISSIONS.REVIEW_PROPERTIES),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const pagination = sanitizePagination(page, limit);

    let query = { status: 'rejected' };

    if (search) {
      const sanitizedSearch = sanitizeSearchQuery(search);
      query.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { 'address.city': { $regex: sanitizedSearch, $options: 'i' } },
        { 'address.state': { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    const [properties, total] = await Promise.all([
      Property.find(query)
        .populate('owner', 'email profile')
        .populate('rejectedBy', 'email profile')
        .sort({ rejectedAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Property.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        properties,
        total,
        totalPages: Math.ceil(total / pagination.limit),
        currentPage: pagination.page,
        hasNext: pagination.page < Math.ceil(total / pagination.limit),
        hasPrev: pagination.page > 1
      }
    });
  })
);

// Reactivate rejected property for review
router.post('/properties/:id/reactivate',
  hasPermission(SUB_ADMIN_PERMISSIONS.APPROVE_PROPERTIES),
  asyncHandler(async (req, res) => {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      {
        status: 'pending',
        $unset: {
          rejectionReason: 1,
          rejectedBy: 1,
          rejectedAt: 1
        },
        reactivatedBy: req.user.id,
        reactivatedAt: new Date()
      },
      { new: true }
    ).populate('owner', 'email profile');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    adminRealtimeService.broadcastNotification({
      type: 'property_reactivated',
      title: 'Property Reactivated',
      message: `Property "${property.title}" has been reactivated for review`,
      data: {
        propertyId: property._id,
        propertyTitle: property.title,
        reactivatedBy: req.user.email
      },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Property reactivated successfully',
      data: property
    });
  })
);

// Content Moderation Routes
router.get('/content/reports',
  hasPermission(SUB_ADMIN_PERMISSIONS.MODERATE_CONTENT),
  asyncHandler(async (req, res) => {
    const { status = 'pending', search = '' } = req.query;

    // Placeholder implementation - would need ContentReport model
    res.json({
      success: true,
      data: {
        reports: [],
        total: 0
      }
    });
  })
);

// Resolve content report
router.post('/content/reports/:id/resolve',
  hasPermission(SUB_ADMIN_PERMISSIONS.MODERATE_CONTENT),
  asyncHandler(async (req, res) => {
    const { note } = req.body;

    res.json({
      success: true,
      message: 'Content report resolved successfully'
    });
  })
);

// Dismiss content report
router.post('/content/reports/:id/dismiss',
  hasPermission(SUB_ADMIN_PERMISSIONS.MODERATE_CONTENT),
  asyncHandler(async (req, res) => {
    const { note } = req.body;

    res.json({
      success: true,
      message: 'Content report dismissed successfully'
    });
  })
);

// Support Ticket Routes
router.get('/support/tickets',
  hasPermission(PERMISSIONS.SUPPORT_TICKETS_READ),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status = 'open' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status && status !== 'all') {
      // Support both hyphenated and underscored values for robustness
      if (status === 'in-progress') query.status = 'in_progress';
      else query.status = status;
    }

    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .populate('user', 'email profile')
        .populate('assignedTo', 'email profile')
        .populate('lockedBy', 'email profile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      SupportTicket.countDocuments(query)
    ]);

    // Transform tickets to match frontend interface
    const transformedTickets = tickets.map(ticket => ({
      _id: ticket._id,
      sender: ticket.user,
      subject: ticket.subject,
      message: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      ticketNumber: ticket.ticketNumber,
      attachments: ticket.attachments,
      assignedTo: ticket.assignedTo,
      lockedBy: ticket.lockedBy,
      lockedAt: ticket.lockedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      responses: ticket.responses
    }));

    res.json({
      success: true,
      data: {
        tickets: transformedTickets,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  })
);

// Update support ticket status
router.patch('/support/tickets/:id',
  hasPermission(PERMISSIONS.SUPPORT_TICKETS_STATUS),
  asyncHandler(async (req, res) => {
    const { status, response } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    // Check if ticket is locked by another user
    if (ticket.lockedBy && ticket.lockedBy.toString() !== req.user.id.toString()) {
      const lockedUser = await User.findById(ticket.lockedBy).select('profile email');
      const lockedByName = lockedUser?.profile?.firstName
        ? `${lockedUser.profile.firstName} ${lockedUser.profile.lastName || ''}`
        : lockedUser?.email || 'Another user';

      return res.status(423).json({ // 423 Locked
        success: false,
        message: `This ticket is currently being handled by ${lockedByName}`,
        lockedBy: {
          id: ticket.lockedBy,
          name: lockedByName,
          lockedAt: ticket.lockedAt
        }
      });
    }

    // Lock the ticket for this user on first interaction
    if (!ticket.lockedBy) {
      ticket.lockedBy = req.user.id;
      ticket.lockedAt = new Date();
    }

    const updateData = {
      status,
      assignedTo: req.user.id,
      assignedAt: new Date(),
      lockedBy: req.user.id,
      lockedAt: ticket.lockedAt || new Date()
    };

    // Add response if provided
    if (response) {
      // Prevent replies to closed or resolved tickets
      if (ticket.status === 'closed' || ticket.status === 'resolved') {
        return res.status(400).json({
          success: false,
          message: `Cannot reply to ${ticket.status} tickets. Only open or in-progress tickets can receive replies.`
        });
      }

      ticket.responses.push({
        message: response,
        author: req.user.profile?.firstName
          ? `${req.user.profile.firstName} ${req.user.profile.lastName || ''}`
          : req.user.email,
        authorId: req.user.id,
        isAdmin: true
      });

      if (status === 'resolved') {
        ticket.resolution = response;
        ticket.resolvedBy = req.user.id;
        ticket.resolvedAt = new Date();
        // Auto-close ticket when marked as resolved
        ticket.status = 'closed';
        // Unlock ticket when closed
        ticket.lockedBy = null;
        ticket.lockedAt = null;
      } else {
        ticket.status = status;
      }

      ticket.assignedTo = req.user.id;
      ticket.assignedAt = new Date();

      await ticket.save();

      await ticket.populate('user', 'email profile');
      await ticket.populate('assignedTo', 'email profile');
      await ticket.populate('lockedBy', 'email profile');

      // Emit real-time event
      adminRealtimeService.broadcastNotification({
        type: 'support_ticket_updated',
        title: 'Support Ticket Updated',
        message: `Ticket #${ticket.ticketNumber} status: ${status}`,
        data: {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          status,
          updatedBy: req.user.email,
          lockedBy: req.user.id
        },
        timestamp: new Date()
      });

      return res.json({
        success: true,
        message: 'Support ticket updated successfully',
        data: {
          _id: ticket._id,
          sender: ticket.user,
          subject: ticket.subject,
          message: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          ticketNumber: ticket.ticketNumber,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          responses: ticket.responses,
          assignedTo: ticket.assignedTo,
          lockedBy: ticket.lockedBy
        }
      });
    }

    // Auto-close resolved tickets and unlock
    if (status === 'resolved') {
      ticket.status = 'closed';
      ticket.resolvedBy = req.user.id;
      ticket.resolvedAt = new Date();
      ticket.assignedTo = req.user.id;
      ticket.assignedAt = new Date();
      ticket.lockedBy = null;
      ticket.lockedAt = null;
      await ticket.save();
    } else {
      ticket.status = status;
      ticket.assignedTo = req.user.id;
      ticket.assignedAt = new Date();
      await ticket.save();
    }

    await ticket.populate('user', 'email profile');
    await ticket.populate('assignedTo', 'email profile');
    await ticket.populate('lockedBy', 'email profile');

    // Emit real-time event
    adminRealtimeService.broadcastNotification({
      type: 'support_ticket_updated',
      title: 'Support Ticket Updated',
      message: `Ticket #${ticket.ticketNumber} status: ${status}`,
      data: {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        updatedBy: req.user.email,
        lockedBy: req.user.id
      },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Support ticket updated successfully',
      data: {
        _id: ticket._id,
        sender: ticket.user,
        subject: ticket.subject,
        message: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        ticketNumber: ticket.ticketNumber,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        responses: ticket.responses,
        assignedTo: ticket.assignedTo,
        lockedBy: ticket.lockedBy
      }
    });
  })
);

// Vendor Performance Tracking
router.get('/vendors/performance',
  hasPermission(SUB_ADMIN_PERMISSIONS.TRACK_PERFORMANCE),
  asyncHandler(async (req, res) => {
    const { search = '', sortBy = 'performanceScore' } = req.query;

    try {
      let matchQuery = { role: 'agent' };
      if (search) {
        const sanitizedSearch = sanitizeSearchQuery(search);
        matchQuery.$or = [
          { email: { $regex: sanitizedSearch, $options: 'i' } },
          { 'profile.firstName': { $regex: sanitizedSearch, $options: 'i' } },
          { 'profile.lastName': { $regex: sanitizedSearch, $options: 'i' } }
        ];
      }

      const vendors = await User.aggregate([
        { $match: matchQuery },
        {
          $lookup: {
            from: 'properties',
            localField: '_id',
            foreignField: 'owner',
            as: 'properties'
          }
        },
        {
          $lookup: {
            from: 'reviews',
            let: { vendorId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$vendor', '$$vendorId'] },
                  status: 'active'
                }
              }
            ],
            as: 'reviews'
          }
        },
        {
          $lookup: {
            from: 'messages',
            let: { vendorId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ['$sender', '$$vendorId'] },
                      { $eq: ['$recipient', '$$vendorId'] }
                    ]
                  }
                }
              }
            ],
            as: 'messages'
          }
        },
        {
          $addFields: {
            name: {
              $concat: [
                { $ifNull: ['$profile.firstName', ''] },
                ' ',
                { $ifNull: ['$profile.lastName', ''] }
              ]
            },
            phone: { $ifNull: ['$profile.phone', ''] },
            joinedDate: '$createdAt',
            lastActive: { $ifNull: ['$profile.lastLogin', '$updatedAt'] },
            totalProperties: { $size: '$properties' },
            availableProperties: {
              $size: {
                $filter: {
                  input: '$properties',
                  as: 'prop',
                  cond: { $eq: ['$$prop.status', 'available'] }
                }
              }
            },
            rejectedProperties: {
              $size: {
                $filter: {
                  input: '$properties',
                  as: 'prop',
                  cond: { $eq: ['$$prop.status', 'rejected'] }
                }
              }
            },
            totalReviews: { $size: '$reviews' },
            averageRating: {
              $cond: {
                if: { $gt: [{ $size: '$reviews' }, 0] },
                then: {
                  $round: [
                    { $avg: '$reviews.rating' },
                    1
                  ]
                },
                else: 0
              }
            },
            totalMessages: { $size: '$messages' },
            sentMessages: {
              $size: {
                $filter: {
                  input: '$messages',
                  as: 'msg',
                  cond: { $eq: ['$$msg.sender', '$_id'] }
                }
              }
            },
            receivedMessages: {
              $size: {
                $filter: {
                  input: '$messages',
                  as: 'msg',
                  cond: { $eq: ['$$msg.recipient', '$_id'] }
                }
              }
            }
          }
        },
        {
          $addFields: {
            responseRate: {
              $cond: {
                if: { $gt: ['$receivedMessages', 0] },
                then: {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ['$sentMessages', '$receivedMessages'] },
                        100
                      ]
                    },
                    0
                  ]
                },
                else: 0
              }
            },
            averageResponseTime: {
              $cond: {
                if: { $gt: ['$sentMessages', 0] },
                then: {
                  $round: [
                    { $divide: ['$receivedMessages', { $add: ['$sentMessages', 1] }] },
                    0
                  ]
                },
                else: 0
              }
            }
          }
        },
        {
          $addFields: {
            performanceScore: {
              $round: [
                {
                  $divide: [
                    {
                      $add: [
                        // Available properties ratio (40%)
                        {
                          $multiply: [
                            {
                              $cond: {
                                if: { $gt: ['$totalProperties', 0] },
                                then: { $divide: ['$availableProperties', '$totalProperties'] },
                                else: 0
                              }
                            },
                            40
                          ]
                        },
                        // Rating score (30%)
                        {
                          $multiply: [
                            { $divide: ['$averageRating', 5] },
                            30
                          ]
                        },
                        // Response rate (20%)
                        {
                          $multiply: [
                            { $divide: ['$responseRate', 100] },
                            20
                          ]
                        },
                        // Review count bonus (10%)
                        {
                          $multiply: [
                            {
                              $cond: {
                                if: { $gte: ['$totalReviews', 10] },
                                then: 1,
                                else: { $divide: ['$totalReviews', 10] }
                              }
                            },
                            10
                          ]
                        }
                      ]
                    },
                    1
                  ]
                },
                0
              ]
            }
          }
        },
        {
          $project: {
            _id: 1,
            email: 1,
            name: 1,
            phone: 1,
            joinedDate: 1,
            lastActive: 1,
            totalProperties: 1,
            availableProperties: 1,
            rejectedProperties: 1,
            averageRating: 1,
            totalReviews: 1,
            totalMessages: 1,
            responseRate: 1,
            averageResponseTime: 1,
            performanceScore: 1
          }
        }
      ]);

      // Sort in JavaScript after aggregation
      const sortField = sortBy || 'performanceScore';
      vendors.sort((a, b) => {
        const aVal = a[sortField] || 0;
        const bVal = b[sortField] || 0;
        return bVal - aVal; // Descending order
      });

      res.json({
        success: true,
        data: { vendors }
      });
    } catch (error) {
      console.error('Vendor performance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vendor performance',
        error: error.message
      });
    }
  })
);

// Promotion Routes
router.get('/promotions',
  hasPermission(SUB_ADMIN_PERMISSIONS.APPROVE_PROMOTIONS),
  asyncHandler(async (req, res) => {
    const { status = 'active', search = '' } = req.query;

    res.json({
      success: true,
      data: {
        promotions: [],
        total: 0
      }
    });
  })
);

router.post('/promotions/:id/end',
  hasPermission(SUB_ADMIN_PERMISSIONS.APPROVE_PROMOTIONS),
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: 'Promotion ended successfully'
    });
  })
);

// Notification Routes
router.get('/notifications',
  hasPermission(SUB_ADMIN_PERMISSIONS.SEND_NOTIFICATIONS),
  asyncHandler(async (req, res) => {
    const { status = 'sent', search = '', page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const Notification = require('../models/Notification');

    let query = {};

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate('sentBy', 'email profile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(query)
    ]);

    // Transform to match frontend interface
    const transformedNotifications = notifications.map(notif => ({
      _id: notif._id,
      title: notif.title,
      message: notif.message,
      type: notif.type === 'informational' ? 'info' :
        notif.type === 'alert' ? 'warning' :
          notif.type === 'system' ? 'success' : notif.type,
      recipients: notif.targetAudience === 'all_users' ? 'all' :
        notif.targetAudience === 'vendors' ? 'vendors' :
          notif.targetAudience === 'customers' ? 'customers' : 'specific',
      recipientCount: notif.statistics?.totalRecipients || 0,
      sentBy: {
        _id: notif.sentBy?._id || notif.sentBy,
        name: notif.sentBy?.profile?.firstName
          ? `${notif.sentBy.profile.firstName} ${notif.sentBy.profile.lastName || ''}`.trim()
          : notif.sentBy?.email || 'System'
      },
      createdAt: notif.createdAt,
      status: notif.status,
      readCount: notif.statistics?.opened || 0
    }));

    res.json({
      success: true,
      data: {
        notifications: transformedNotifications,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  })
);

router.post('/notifications/send',
  hasPermission(SUB_ADMIN_PERMISSIONS.SEND_NOTIFICATIONS),
  asyncHandler(async (req, res) => {
    const {
      title,
      message,
      recipients = 'all',
      type = 'info',
      sendEmail = true,
      sendInApp = true
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Build user query based on recipients
    let userQuery = {};
    if (recipients === 'vendors') {
      userQuery.role = 'agent';
    } else if (recipients === 'customers') {
      userQuery.role = 'customer';
    } else {
      userQuery.role = { $in: ['agent', 'customer'] };
    }

    // Fetch target users
    const targetUsers = await User.find(userQuery)
      .select('_id email profile.firstName profile.preferences.notifications')
      .lean();

    let emailsSent = 0;
    let inAppSent = 0;
    const notificationService = require('../services/notificationService');

    // Send in-app notifications
    if (sendInApp) {
      const userIds = targetUsers.map(u => u._id.toString());

      notificationService.broadcast({
        type: type,
        title,
        message,
        data: {
          sentBy: req.user.email,
          sentByName: `${req.user.profile?.firstName || ''} ${req.user.profile?.lastName || ''}`.trim() || req.user.email,
          recipients,
          sentAt: new Date(),
          category: 'system_announcement'
        }
      });

      inAppSent = userIds.length;
    }

    // Send email notifications
    if (sendEmail) {
      for (const user of targetUsers) {
        // Check if user has email notifications enabled
        const emailEnabled = user.profile?.preferences?.notifications?.email !== false;

        if (emailEnabled && user.email) {
          try {
            await emailService.sendTemplateEmail(
              user.email,
              'system-notification',
              {
                firstName: user.profile?.firstName || 'User',
                notificationTitle: title,
                notificationMessage: message,
                notificationType: type,
                dashboardUrl: `${process.env.FRONTEND_URL || 'https://buildhomemartsquares.com'}/dashboard`,
                websiteUrl: process.env.FRONTEND_URL || 'https://buildhomemartsquares.com'
              }
            );
            emailsSent++;
          } catch (error) {
            console.error(`Failed to send email to ${user.email}:`, error);
          }
        }
      }
    }

    // Create notification record
    const Notification = require('../models/Notification');
    const notificationRecord = await Notification.create({
      title,
      subject: title,
      message,
      type: type === 'info' ? 'informational' :
        type === 'warning' ? 'alert' :
          type === 'success' ? 'system' : 'alert',
      targetAudience: recipients === 'all' ? 'all_users' :
        recipients === 'vendors' ? 'vendors' : 'customers',
      channels: [
        sendInApp ? 'in_app' : null,
        sendEmail ? 'email' : null
      ].filter(Boolean),
      recipients: targetUsers.map(u => ({
        user: u._id,
        delivered: sendInApp || sendEmail
      })),
      status: 'sent',
      sentAt: new Date(),
      sentBy: req.user.id,
      statistics: {
        totalRecipients: targetUsers.length,
        delivered: emailsSent + inAppSent
      }
    });

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: {
        recipientCount: targetUsers.length,
        emailsSent,
        inAppSent,
        notificationId: notificationRecord._id
      }
    });
  })
);

// Save notification as draft
router.post('/notifications/draft',
  hasPermission(SUB_ADMIN_PERMISSIONS.SEND_NOTIFICATIONS),
  asyncHandler(async (req, res) => {
    const {
      title,
      message,
      recipients = 'all',
      type = 'info',
      sendEmail = true,
      sendInApp = true
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Calculate potential recipient count
    let userQuery = {};
    if (recipients === 'vendors') {
      userQuery.role = 'agent';
    } else if (recipients === 'customers') {
      userQuery.role = 'customer';
    } else {
      userQuery.role = { $in: ['agent', 'customer'] };
    }

    const recipientCount = await User.countDocuments(userQuery);

    // Create draft notification record
    const Notification = require('../models/Notification');
    const draftNotification = await Notification.create({
      title,
      subject: title,
      message,
      type: type === 'info' ? 'informational' :
        type === 'warning' ? 'alert' :
          type === 'success' ? 'system' : 'alert',
      targetAudience: recipients === 'all' ? 'all_users' :
        recipients === 'vendors' ? 'vendors' : 'customers',
      channels: [
        sendInApp ? 'in_app' : null,
        sendEmail ? 'email' : null
      ].filter(Boolean),
      status: 'draft',
      sentBy: req.user.id,
      statistics: {
        totalRecipients: recipientCount,
        delivered: 0,
        opened: 0
      }
    });

    res.json({
      success: true,
      message: 'Notification saved as draft',
      data: {
        notificationId: draftNotification._id
      }
    });
  })
);

// Send a draft notification
router.post('/notifications/draft/:id/send',
  hasPermission(SUB_ADMIN_PERMISSIONS.SEND_NOTIFICATIONS),
  asyncHandler(async (req, res) => {
    const Notification = require('../models/Notification');

    // Get the draft notification
    const draftNotification = await Notification.findOne({
      _id: req.params.id,
      status: 'draft'
    });

    if (!draftNotification) {
      return res.status(404).json({
        success: false,
        message: 'Draft notification not found'
      });
    }

    // Determine recipients based on targetAudience
    const recipients = draftNotification.targetAudience === 'all_users' ? 'all' :
      draftNotification.targetAudience === 'vendors' ? 'vendors' : 'customers';

    // Determine notification type
    const type = draftNotification.type === 'informational' ? 'info' :
      draftNotification.type === 'alert' ? 'warning' :
        draftNotification.type === 'system' ? 'success' : 'info';

    const sendEmail = draftNotification.channels.includes('email');
    const sendInApp = draftNotification.channels.includes('in_app');

    // Build user query based on recipients
    let userQuery = {};
    if (recipients === 'vendors') {
      userQuery.role = 'agent';
    } else if (recipients === 'customers') {
      userQuery.role = 'customer';
    } else {
      userQuery.role = { $in: ['agent', 'customer'] };
    }

    // Fetch target users
    const targetUsers = await User.find(userQuery)
      .select('_id email profile.firstName profile.preferences.notifications')
      .lean();

    let emailsSent = 0;
    let inAppSent = 0;
    const notificationService = require('../services/notificationService');

    // Send in-app notifications
    if (sendInApp) {
      const userIds = targetUsers.map(u => u._id.toString());

      notificationService.broadcast({
        type: type,
        title: draftNotification.title,
        message: draftNotification.message,
        data: {
          sentBy: req.user.email,
          sentByName: `${req.user.profile?.firstName || ''} ${req.user.profile?.lastName || ''}`.trim() || req.user.email,
          recipients,
          sentAt: new Date(),
          category: 'system_announcement'
        }
      });

      inAppSent = userIds.length;
    }

    // Send email notifications
    if (sendEmail) {
      for (const user of targetUsers) {
        const emailEnabled = user.profile?.preferences?.notifications?.email !== false;

        if (emailEnabled && user.email) {
          try {
            await emailService.sendTemplateEmail(
              user.email,
              'system-notification',
              {
                firstName: user.profile?.firstName || 'User',
                notificationTitle: draftNotification.title,
                notificationMessage: draftNotification.message,
                notificationType: type,
                dashboardUrl: `${process.env.FRONTEND_URL || 'https://buildhomemartsquares.com'}/dashboard`,
                websiteUrl: process.env.FRONTEND_URL || 'https://buildhomemartsquares.com'
              }
            );
            emailsSent++;
          } catch (error) {
            console.error(`Failed to send email to ${user.email}:`, error);
          }
        }
      }
    }

    // Update notification record to sent status
    await Notification.findByIdAndUpdate(req.params.id, {
      status: 'sent',
      sentAt: new Date(),
      'statistics.totalRecipients': targetUsers.length,
      'statistics.delivered': emailsSent + inAppSent
    });

    res.json({
      success: true,
      message: 'Draft notification sent successfully',
      data: {
        recipientCount: targetUsers.length,
        emailsSent,
        inAppSent
      }
    });
  })
);

// Delete a draft notification
router.delete('/notifications/draft/:id',
  hasPermission(SUB_ADMIN_PERMISSIONS.SEND_NOTIFICATIONS),
  asyncHandler(async (req, res) => {
    const Notification = require('../models/Notification');

    const draft = await Notification.findOneAndDelete({
      _id: req.params.id,
      status: 'draft'
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Draft notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Draft notification deleted successfully'
    });
  })
);

// Reports Generation
router.get('/reports',
  hasPermission(SUB_ADMIN_PERMISSIONS.GENERATE_REPORTS),
  asyncHandler(async (req, res) => {
    const { range = '30days' } = req.query;
    const subAdminId = req.user.id;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (range) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const [
      // Properties handled by this subadmin
      myPropertiesStats,
      myPropertiesInRange,
      // Vendors I approved
      myApprovedVendors,
      myApprovedVendorsInRange,
      // Support tickets I handled
      mySupportTickets,
      myOpenTickets,
      myResolvedTickets,
      myClosedTickets,
      myTicketsInRange,
      // Content moderation by me
      myContentModerations,
      myContentModerationsInRange
    ] = await Promise.all([
      // My property approvals by status
      Property.aggregate([
        {
          $match: { approvedBy: subAdminId }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      // My properties in selected range
      Property.countDocuments({
        approvedBy: subAdminId,
        updatedAt: { $gte: startDate }
      }),
      // Total vendors I approved
      User.countDocuments({
        role: 'agent',
        'vendorProfile': { $exists: true }
      }).then(async () => {
        const VendorProfile = require('../models/VendorProfile');
        return await VendorProfile.countDocuments({
          $or: [
            { 'approvals.subadmin.reviewedBy': subAdminId },
            { 'approvals.subadmin.approvedBy': subAdminId }
          ]
        });
      }),
      // Vendors approved in range
      (async () => {
        const VendorProfile = require('../models/VendorProfile');
        return await VendorProfile.countDocuments({
          $or: [
            {
              'approvals.subadmin.reviewedBy': subAdminId,
              'approvals.subadmin.reviewedAt': { $gte: startDate }
            },
            {
              'approvals.subadmin.approvedBy': subAdminId,
              'approvals.subadmin.approvedAt': { $gte: startDate }
            }
          ]
        });
      })(),
      // Support tickets assigned to me
      SupportTicket.countDocuments({ assignedTo: subAdminId }),
      SupportTicket.countDocuments({ assignedTo: subAdminId, status: 'open' }),
      SupportTicket.countDocuments({ assignedTo: subAdminId, status: 'resolved' }),
      SupportTicket.countDocuments({ assignedTo: subAdminId, status: 'closed' }),
      SupportTicket.countDocuments({
        assignedTo: subAdminId,
        updatedAt: { $gte: startDate }
      }),
      // Content moderation count (assuming rejection is content moderation)
      Property.countDocuments({
        rejectedBy: subAdminId
      }),
      Property.countDocuments({
        rejectedBy: subAdminId,
        rejectedAt: { $gte: startDate }
      })
    ]);

    const myPropertyStatsMap = myPropertiesStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    // Calculate average resolution time for my tickets
    const myResolvedTicketsWithTime = await SupportTicket.find({
      assignedTo: subAdminId,
      status: 'resolved',
      resolvedAt: { $exists: true }
    }).select('createdAt resolvedAt assignedAt');

    let myAvgResolutionTime = 0;
    if (myResolvedTicketsWithTime.length > 0) {
      const totalHours = myResolvedTicketsWithTime.reduce((sum, ticket) => {
        const startTime = ticket.assignedAt || ticket.createdAt;
        const diff = new Date(ticket.resolvedAt).getTime() - new Date(startTime).getTime();
        return sum + (diff / (1000 * 60 * 60));
      }, 0);
      myAvgResolutionTime = Math.round(totalHours / myResolvedTicketsWithTime.length);
    }

    res.json({
      success: true,
      data: {
        myActivity: {
          propertiesReviewed: Object.values(myPropertyStatsMap).reduce((sum, count) => sum + count, 0),
          propertiesApproved: myPropertyStatsMap.available || 0,
          propertiesRejected: myPropertyStatsMap.rejected || 0,
          propertiesPending: myPropertyStatsMap.pending || 0,
          vendorsApproved: myApprovedVendors,
          ticketsHandled: mySupportTickets,
          ticketsResolved: myResolvedTickets,
          contentModerated: myContentModerations,
          recentPropertiesReviewed: myPropertiesInRange,
          recentVendorsApproved: myApprovedVendorsInRange,
          recentTicketsHandled: myTicketsInRange,
          recentContentModerated: myContentModerationsInRange
        },
        myPerformance: {
          avgResolutionTime: myAvgResolutionTime,
          openTickets: myOpenTickets,
          closedTickets: myClosedTickets,
          responseRate: mySupportTickets > 0 ? Math.round((myResolvedTickets / mySupportTickets) * 100) : 0,
          approvalRate: Object.values(myPropertyStatsMap).reduce((sum, count) => sum + count, 0) > 0
            ? Math.round(((myPropertyStatsMap.available || 0) / Object.values(myPropertyStatsMap).reduce((sum, count) => sum + count, 0)) * 100)
            : 0
        }
      }
    });
  })
);

router.get('/reports/export',
  hasPermission(SUB_ADMIN_PERMISSIONS.GENERATE_REPORTS),
  asyncHandler(async (req, res) => {
    const { type, range = '30days' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (range) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    let csvContent = '';
    const timestamp = new Date().toISOString().split('T')[0];

    try {
      switch (type) {
        case 'properties':
          const properties = await Property.find()
            .populate('owner', 'email profile role')
            .populate('vendor', 'email profile')
            .select('title type listingType price address status views createdAt')
            .sort({ createdAt: -1 })
            .limit(1000);

          csvContent = 'Property ID,Title,Type,Listing Type,Price,City,State,Status,Views,Created Date,Owner Email,Owner Role\n';
          properties.forEach(prop => {
            const ownerEmail = sanitizeCSV(prop.owner?.email || 'N/A');
            const ownerRole = sanitizeCSV(prop.owner?.role || 'N/A');
            const title = sanitizeCSV(prop.title);
            const city = sanitizeCSV(prop.address?.city || 'N/A');
            const state = sanitizeCSV(prop.address?.state || 'N/A');
            csvContent += `"${prop._id}","${title}","${prop.type}","${prop.listingType}","${prop.price}","${city}","${state}","${prop.status}","${prop.views || 0}","${new Date(prop.createdAt).toLocaleDateString()}","${ownerEmail}","${ownerRole}"\n`;
          });
          break;

        case 'users':
          const users = await User.find({
            role: { $nin: ['superadmin', 'subadmin'] }
          })
            .select('email role profile createdAt status')
            .sort({ createdAt: -1 })
            .limit(1000);

          csvContent = 'User ID,Email,Role,Name,Phone,City,Status,Join Date\n';
          users.forEach(user => {
            const name = `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();
            csvContent += `"${user._id}","${user.email}","${user.role}","${name}","${user.profile?.phone || 'N/A'}","${user.profile?.address?.city || 'N/A'}","${user.status}","${new Date(user.createdAt).toLocaleDateString()}"\n`;
          });
          break;

        case 'engagement':
          const [propertyViews, reviews, messages, allReviews] = await Promise.all([
            Property.aggregate([
              {
                $group: {
                  _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                  totalViews: { $sum: { $ifNull: ['$views', 0] } },
                  propertyCount: { $sum: 1 }
                }
              },
              { $sort: { _id: -1 } },
              { $limit: 100 }
            ]),
            Review.countDocuments({ status: 'active' }),
            Message.countDocuments(),
            Review.find({ status: 'active' })
              .populate('vendor', 'email profile')
              .populate('client', 'email profile')
              .populate('property', 'title')
              .select('rating comment reviewType createdAt')
              .sort({ createdAt: -1 })
              .limit(500)
          ]);

          csvContent = 'Date,Properties,Total Views,Average Views\n';
          propertyViews.forEach(day => {
            const avgViews = day.propertyCount > 0 ? (day.totalViews / day.propertyCount).toFixed(2) : 0;
            csvContent += `"${day._id}","${day.propertyCount}","${day.totalViews}","${avgViews}"\n`;
          });
          csvContent += `\n"Summary"\n`;
          csvContent += `"Total Reviews","${reviews}"\n`;
          csvContent += `"Total Messages","${messages}"\n\n`;

          csvContent += 'Recent Reviews\n';
          csvContent += 'Review ID,Vendor,Client,Property,Rating,Review Type,Comment,Date\n';
          allReviews.forEach(review => {
            const vendorName = review.vendor ? `${review.vendor.profile?.firstName || ''} ${review.vendor.profile?.lastName || ''}`.trim() || review.vendor.email : 'N/A';
            const clientName = review.client ? `${review.client.profile?.firstName || ''} ${review.client.profile?.lastName || ''}`.trim() || review.client.email : 'N/A';
            const propertyTitle = review.property?.title || 'N/A';
            const comment = (review.comment || '').replace(/"/g, '""'); // Escape quotes
            csvContent += `"${review._id}","${vendorName}","${clientName}","${propertyTitle}","${review.rating}","${review.reviewType}","${comment}","${new Date(review.createdAt).toLocaleDateString()}"\n`;
          });
          break;

        case 'support':
          const tickets = await SupportTicket.find()
            .populate('user', 'email profile')
            .populate('assignedTo', 'email profile')
            .select('subject status priority createdAt resolvedAt')
            .sort({ createdAt: -1 })
            .limit(500);

          csvContent = 'Ticket ID,Subject,Status,Priority,User Email,Assigned To,Created Date,Resolved Date,Resolution Time (hours)\n';
          tickets.forEach(ticket => {
            const userEmail = ticket.user?.email || 'N/A';
            const assignedToEmail = ticket.assignedTo?.email || 'Unassigned';
            const createdDate = new Date(ticket.createdAt).toLocaleDateString();
            const resolvedDate = ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleDateString() : 'N/A';
            const resolutionTime = ticket.resolvedAt
              ? Math.round((new Date(ticket.resolvedAt) - new Date(ticket.createdAt)) / (1000 * 60 * 60))
              : 'N/A';

            csvContent += `"${ticket._id}","${ticket.subject}","${ticket.status}","${ticket.priority}","${userEmail}","${assignedToEmail}","${createdDate}","${resolvedDate}","${resolutionTime}"\n`;
          });
          break;

        case 'full':
        default:
          const [
            propertyCount,
            userCount,
            totalViews,
            totalReviews,
            totalMessages,
            totalTickets
          ] = await Promise.all([
            Property.countDocuments(),
            User.countDocuments(),
            Property.aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ['$views', 0] } } } }]),
            Review.countDocuments({ status: 'active' }),
            Message.countDocuments(),
            SupportTicket.countDocuments()
          ]);

          csvContent = 'Report Summary\n';
          csvContent += `"Report Type","${type}"\n`;
          csvContent += `"Date Range","${range}"\n`;
          csvContent += `"Generated On","${new Date().toLocaleString()}"\n\n`;
          csvContent += 'Metric,Value\n';
          csvContent += `"Total Properties","${propertyCount}"\n`;
          csvContent += `"Total Users","${userCount}"\n`;
          csvContent += `"Total Property Views","${totalViews[0]?.total || 0}"\n`;
          csvContent += `"Total Reviews","${totalReviews}"\n`;
          csvContent += `"Total Messages","${totalMessages}"\n`;
          csvContent += `"Total Support Tickets","${totalTickets}"\n`;
          break;
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="subadmin_${type}_report_${timestamp}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate CSV report'
      });
    }
  })
);

router.get('/reports/city/:city',
  hasPermission(SUB_ADMIN_PERMISSIONS.GENERATE_REPORTS),
  asyncHandler(async (req, res) => {
    const { city } = req.params;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const [
      propertyStats,
      userStats
    ] = await Promise.all([
      Property.aggregate([
        {
          $match: {
            'address.city': { $regex: city, $options: 'i' },
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' }
          }
        }
      ]),
      User.countDocuments({
        'profile.address.city': { $regex: city, $options: 'i' },
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      })
    ]);

    res.json({
      success: true,
      data: {
        city,
        propertyStats,
        userStats,
        period: { startDate, endDate }
      }
    });
  })
);

// Addon Services Routes
router.get('/addon-services',
  hasPermission(PERMISSIONS.ADDON_SERVICES_READ),
  asyncHandler(async (req, res) => {
    const { status = 'active', search = '', page = 1, limit = 10 } = req.query;
    const AddonServiceSchedule = require('../models/AddonServiceSchedule');

    try {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build match query for subscriptions
      let matchQuery = {};

      if (status === 'active') {
        matchQuery.status = 'active';
        matchQuery.endDate = { $gt: new Date() };
        matchQuery.addons = { $exists: true, $ne: [] }; // Only subscriptions with addons
      } else if (status === 'expired') {
        matchQuery.$or = [
          { status: 'expired' },
          { endDate: { $lte: new Date() } }
        ];
        matchQuery.addons = { $exists: true, $ne: [] };
      } else {
        // All vendors with addon purchases (including expired)
        matchQuery.addons = { $exists: true, $ne: [] };
      }

      // Aggregate vendor addon data
      const vendorAddons = await Subscription.aggregate([
        { $match: matchQuery },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $lookup: {
            from: 'addonservices',
            localField: 'addons',
            foreignField: '_id',
            as: 'addonDetails'
          }
        },
        // Filter users by search term if provided
        ...(search ? [{
          $match: {
            $or: [
              { 'user.email': { $regex: search, $options: 'i' } },
              { 'user.profile.firstName': { $regex: search, $options: 'i' } },
              { 'user.profile.lastName': { $regex: search, $options: 'i' } }
            ]
          }
        }] : []),
        {
          $group: {
            _id: '$user._id',
            user: { $first: '$user' },
            totalAddons: { $sum: { $size: '$addons' } },
            activeAddons: { $addToSet: '$addonDetails' },
            subscriptions: {
              $push: {
                _id: '$_id',
                status: '$status',
                startDate: '$startDate',
                endDate: '$endDate',
                addons: '$addonDetails'
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            user: {
              _id: '$user._id',
              name: {
                $concat: [
                  { $ifNull: ['$user.profile.firstName', ''] },
                  ' ',
                  { $ifNull: ['$user.profile.lastName', ''] }
                ]
              },
              email: '$user.email',
              profile: '$user.profile'
            },
            totalAddons: 1,
            activeAddons: {
              $reduce: {
                input: '$activeAddons',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this'] }
              }
            },
            subscriptions: 1
          }
        },
        // Remove duplicates from activeAddons array
        {
          $addFields: {
            activeAddons: {
              $filter: {
                input: {
                  $reduce: {
                    input: '$activeAddons',
                    initialValue: [],
                    in: {
                      $cond: [
                        { $in: ['$$this._id', '$$value._id'] },
                        '$$value',
                        { $concatArrays: ['$$value', ['$$this']] }
                      ]
                    }
                  }
                },
                as: 'addon',
                cond: { $ne: ['$$addon', null] }
              }
            }
          }
        },
        { $sort: { totalAddons: -1 } }
      ]);

      const totalVendors = vendorAddons.length;
      const totalPages = Math.ceil(totalVendors / limitNum);

      // Apply pagination
      const paginatedVendors = vendorAddons.slice(skip, skip + limitNum);

      // Fetch schedules for paginated vendors
      const vendorIds = paginatedVendors.map(v => v._id);
      const schedules = await AddonServiceSchedule.find({
        vendor: { $in: vendorIds }
      })
        .populate('addon', 'name category')
        .populate('scheduledBy', 'email profile.firstName profile.lastName')
        .sort({ createdAt: -1 })
        .lean();

      // Map schedules to vendors
      const vendorScheduleMap = {};
      schedules.forEach(schedule => {
        const vendorId = schedule.vendor.toString();
        if (!vendorScheduleMap[vendorId]) {
          vendorScheduleMap[vendorId] = [];
        }
        vendorScheduleMap[vendorId].push(schedule);
      });

      // Add schedules to vendor data
      const vendorAddonsWithSchedules = paginatedVendors.map(vendor => ({
        ...vendor,
        schedules: vendorScheduleMap[vendor._id.toString()] || []
      }));

      res.json({
        success: true,
        data: {
          vendorAddons: vendorAddonsWithSchedules,
          total: totalVendors,
          totalPages,
          currentPage: pageNum
        }
      });
    } catch (error) {
      console.error('Addon services error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch addon services data',
        error: error.message
      });
    }
  })
);

// Addon Services Stats
router.get('/addon-services/stats',
  hasPermission(PERMISSIONS.ADDON_SERVICES_READ),
  asyncHandler(async (req, res) => {
    const { status = 'active' } = req.query;
    const AddonServiceSchedule = require('../models/AddonServiceSchedule');

    try {
      // Build match query for subscriptions
      let matchQuery = {};

      if (status === 'active') {
        matchQuery.status = 'active';
        matchQuery.endDate = { $gt: new Date() };
        matchQuery.addons = { $exists: true, $ne: [] };
      } else if (status === 'expired') {
        matchQuery.$or = [
          { status: 'expired' },
          { endDate: { $lte: new Date() } }
        ];
        matchQuery.addons = { $exists: true, $ne: [] };
      } else {
        matchQuery.addons = { $exists: true, $ne: [] };
      }

      // Aggregate vendor addon data for stats
      const vendorAddons = await Subscription.aggregate([
        { $match: matchQuery },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $lookup: {
            from: 'addonservices',
            localField: 'addons',
            foreignField: '_id',
            as: 'addonDetails'
          }
        },
        {
          $group: {
            _id: '$user._id',
            totalAddons: { $sum: { $size: '$addons' } },
            activeAddons: { $addToSet: '$addonDetails' }
          }
        },
        {
          $project: {
            _id: 1,
            totalAddons: 1,
            activeAddons: {
              $reduce: {
                input: '$activeAddons',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this'] }
              }
            }
          }
        }
      ]);

      const vendorIds = vendorAddons.map(v => v._id);

      // Get all schedules for stats
      const allSchedules = await AddonServiceSchedule.find({
        vendor: { $in: vendorIds }
      }).lean();

      // Calculate stats
      const stats = {
        activeVendors: vendorAddons.filter(v => v.totalAddons > 0).length,
        totalAddons: vendorAddons.reduce((sum, v) => sum + v.totalAddons, 0),
        totalSchedules: allSchedules.length,
        completedSchedules: allSchedules.filter(s => s.status === 'completed').length,
        inProgressSchedules: allSchedules.filter(s => s.status === 'in_progress').length,
        scheduledSchedules: allSchedules.filter(s => s.status === 'scheduled').length,
        cancelledSchedules: allSchedules.filter(s => s.status === 'cancelled').length,
        categories: new Set(vendorAddons.flatMap(v => v.activeAddons.map(a => a.category))).size
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Addon services stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch addon services stats',
        error: error.message
      });
    }
  })
);

module.exports = router;
