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
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = { status: 'pending' };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }

    const [properties, total] = await Promise.all([
      Property.find(query)
        .populate('owner', 'email profile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Property.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        properties,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
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
    const skip = (page - 1) * limit;

    let query = { status: 'rejected' };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } },
        { 'owner.email': { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [properties, total] = await Promise.all([
      Property.find(query)
        .populate('owner', 'email profile')
        .populate('rejectedBy', 'email profile')
        .sort({ rejectedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Property.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        properties,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
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
  hasPermission(SUB_ADMIN_PERMISSIONS.HANDLE_SUPPORT),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status = 'open' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .populate('user', 'email profile')
        .populate('assignedTo', 'email profile')
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
  hasPermission(SUB_ADMIN_PERMISSIONS.HANDLE_SUPPORT),
  asyncHandler(async (req, res) => {
    const { status, response } = req.body;

    const updateData = {
      status,
      assignedTo: req.user.id
    };

    // Add response if provided
    if (response) {
      const ticket = await SupportTicket.findById(req.params.id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Support ticket not found'
        });
      }

      ticket.responses.push({
        message: response,
        author: req.user.profile?.firstName 
          ? `${req.user.profile.firstName} ${req.user.profile.lastName || ''}`
          : req.user.email,
        isAdmin: true
      });

      if (status === 'resolved') {
        ticket.resolution = response;
        ticket.resolvedBy = req.user.id;
        ticket.resolvedAt = new Date();
        // Auto-close ticket when marked as resolved
        ticket.status = 'closed';
      } else {
        ticket.status = status;
      }

      await ticket.save();

      await ticket.populate('user', 'email profile');
      await ticket.populate('assignedTo', 'email profile');

      // Emit real-time event
      adminRealtimeService.broadcastNotification({
        type: 'support_ticket_updated',
        title: 'Support Ticket Updated',
        message: `Ticket #${ticket.ticketNumber} status: ${status}`,
        data: {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          status,
          updatedBy: req.user.email
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
          responses: ticket.responses
        }
      });
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('user', 'email profile')
     .populate('assignedTo', 'email profile');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    // Emit real-time event
    adminRealtimeService.broadcastNotification({
      type: 'support_ticket_updated',
      title: 'Support Ticket Updated',
      message: `Ticket #${ticket.ticketNumber} status: ${status}`,
      data: {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status,
        updatedBy: req.user.email
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
        responses: ticket.responses
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
        matchQuery.$or = [
          { email: { $regex: search, $options: 'i' } },
          { 'profile.firstName': { $regex: search, $options: 'i' } },
          { 'profile.lastName': { $regex: search, $options: 'i' } }
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
            const ownerEmail = prop.owner?.email || 'N/A';
            const ownerRole = prop.owner?.role || 'N/A';
            csvContent += `"${prop._id}","${prop.title}","${prop.type}","${prop.listingType}","${prop.price}","${prop.address?.city || 'N/A'}","${prop.address?.state || 'N/A'}","${prop.status}","${prop.views || 0}","${new Date(prop.createdAt).toLocaleDateString()}","${ownerEmail}","${ownerRole}"\n`;
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
  hasPermission(SUB_ADMIN_PERMISSIONS.APPROVE_PROMOTIONS), // Reusing promotions permission for addon services
  asyncHandler(async (req, res) => {
    const { status = 'active', search = '' } = req.query;
    const AddonServiceSchedule = require('../models/AddonServiceSchedule');

    try {
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

      // Fetch schedules for all vendors
      const vendorIds = vendorAddons.map(v => v._id);
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
      const vendorAddonsWithSchedules = vendorAddons.map(vendor => ({
        ...vendor,
        schedules: vendorScheduleMap[vendor._id.toString()] || []
      }));

      res.json({
        success: true,
        data: {
          vendorAddons: vendorAddonsWithSchedules,
          total: vendorAddonsWithSchedules.length
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

// Schedule addon service - Send email to vendor
router.post('/addon-services/schedule',
  hasPermission(SUB_ADMIN_PERMISSIONS.SEND_NOTIFICATIONS),
  asyncHandler(async (req, res) => {
    const { vendorId, addonId, subscriptionId, subject, message, vendorEmail, priority = 'medium', scheduledDate } = req.body;
    const AddonServiceSchedule = require('../models/AddonServiceSchedule');

    if (!vendorId || !addonId || !subject || !message || !vendorEmail || !scheduledDate) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: vendorId, addonId, subject, message, vendorEmail, scheduledDate'
      });
    }

    try {
      // Get vendor and addon details
      const [vendor, addon] = await Promise.all([
        User.findById(vendorId).select('email profile'),
        AddonService.findById(addonId)
      ]);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      if (!addon) {
        return res.status(404).json({
          success: false,
          message: 'Addon service not found'
        });
      }

      // Check if already scheduled
      const existingSchedule = await AddonServiceSchedule.findOne({
        vendor: vendorId,
        addon: addonId,
        status: { $in: ['pending', 'scheduled', 'in_progress'] }
      });

      if (existingSchedule) {
        return res.status(400).json({
          success: false,
          message: 'This addon service is already scheduled for this vendor',
          data: {
            schedule: existingSchedule
          }
        });
      }

      // Create schedule record with scheduled status and date
      const schedule = await AddonServiceSchedule.create({
        vendor: vendorId,
        addon: addonId,
        subscription: subscriptionId,
        scheduledBy: req.user.id,
        emailSubject: subject,
        emailMessage: message,
        status: 'scheduled', // Auto-set to scheduled when date is provided
        priority,
        scheduledDate: new Date(scheduledDate)
      });

      // Format the scheduled date for email (Indian Standard Time)
      const formattedDate = new Date(scheduledDate).toLocaleString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
      });

      // Send email to vendor
      await emailService.sendEmail({
        to: vendorEmail,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">Service Scheduled</h1>
              <p style="color: #6b7280; margin: 5px 0;">From: ${req.user.email}</p>
            </div>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 10px 0; color: #1f2937;">Vendor Information</h3>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${vendor.profile?.firstName || ''} ${vendor.profile?.lastName || ''}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${vendor.email}</p>
            </div>

            <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #16a34a;">
              <h3 style="margin: 0 0 10px 0; color: #1f2937;">📅 Scheduled Date & Time</h3>
              <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #16a34a;">${formattedDate}</p>
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
                Please mark your calendar and ensure availability for this service.
              </p>
            </div>

            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 10px 0; color: #1f2937;">Service Details</h3>
              <p style="margin: 5px 0;"><strong>Service:</strong> ${addon.name}</p>
              <p style="margin: 5px 0;"><strong>Category:</strong> ${addon.category.charAt(0).toUpperCase() + addon.category.slice(1)}</p>
              <p style="margin: 5px 0;"><strong>Description:</strong> ${addon.description}</p>
              <p style="margin: 5px 0;"><strong>Priority:</strong> <span style="color: ${priority === 'urgent' ? '#dc2626' : priority === 'high' ? '#ea580c' : priority === 'medium' ? '#ca8a04' : '#16a34a'}; font-weight: bold;">${priority.toUpperCase()}</span></p>
            </div>

            <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #1f2937;">Additional Message</h3>
              <div style="white-space: pre-wrap; line-height: 1.6; color: #374151;">${message}</div>
            </div>

            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                ⚠️ <strong>Important:</strong> If you need to reschedule or have any questions, please reply to this email immediately.
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                This service has been scheduled. Please reply to this email if you need to make any changes.
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
                Email sent on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">
                Schedule ID: ${schedule._id}
              </p>
            </div>
          </div>
        `
      });

      // Populate schedule for response
      await schedule.populate([
        { path: 'addon', select: 'name category description' },
        { path: 'scheduledBy', select: 'email profile.firstName profile.lastName' }
      ]);

      // Broadcast real-time notification
      adminRealtimeService.broadcastNotification({
        type: 'addon_service_scheduled',
        title: 'Addon Service Scheduled',
        message: `Service scheduled for ${vendor.profile?.firstName || vendor.email} - ${addon.name} on ${formattedDate}`,
        data: {
          vendorId,
          vendorEmail,
          addonId,
          addonName: addon.name,
          scheduleId: schedule._id,
          scheduledBy: req.user.email,
          scheduledAt: new Date(),
          serviceDate: scheduledDate
        },
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: 'Service scheduled successfully and confirmation email sent to vendor',
        data: {
          schedule,
          vendor: {
            id: vendor._id,
            name: `${vendor.profile?.firstName || ''} ${vendor.profile?.lastName || ''}`.trim(),
            email: vendor.email
          },
          addon: {
            id: addon._id,
            name: addon.name,
            category: addon.category
          },
          scheduledDate: scheduledDate,
          emailSent: true,
          sentAt: new Date()
        }
      });
    } catch (error) {
      console.error('Email sending error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule service',
        error: error.message
      });
    }
  })
);

// Update addon service schedule status
router.patch('/addon-services/schedule/:scheduleId/status',
  hasPermission(SUB_ADMIN_PERMISSIONS.SEND_NOTIFICATIONS),
  asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    const { status, scheduledDate, vendorResponse, cancellationReason } = req.body;
    const AddonServiceSchedule = require('../models/AddonServiceSchedule');

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    try {
      const currentSchedule = await AddonServiceSchedule.findById(scheduleId)
        .populate('vendor', 'email profile.firstName profile.lastName')
        .populate('addon', 'name category description')
        .populate('scheduledBy', 'email profile.firstName profile.lastName');
      
      if (!currentSchedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
      }

      // Real-world status flow validation
      const currentStatus = currentSchedule.status;
      const validTransitions = {
        scheduled: ['in_progress', 'completed', 'cancelled'],
        in_progress: ['completed', 'cancelled'],
        completed: [], // Cannot change from completed
        cancelled: [] // Cannot change from cancelled
      };

      // Only allow valid status transitions
      if (currentStatus === 'completed' || currentStatus === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: `Cannot change status from ${currentStatus}. This service is already finalized.`
        });
      }

      if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition from ${currentStatus} to ${status}`
        });
      }

      // Check if scheduled date has passed for in_progress and completed
      const now = new Date();
      const serviceDate = currentSchedule.scheduledDate || now;
      
      if (status === 'in_progress' && serviceDate > now) {
        return res.status(400).json({
          success: false,
          message: `Cannot mark as "In Progress" before the scheduled date (${new Date(serviceDate).toLocaleString()})`
        });
      }

      if (status === 'completed' && serviceDate > now) {
        return res.status(400).json({
          success: false,
          message: `Cannot mark as "Completed" before the scheduled date (${new Date(serviceDate).toLocaleString()})`
        });
      }

      const updateData = { status };
      const vendor = currentSchedule.vendor;
      const addon = currentSchedule.addon;
      let sendEmailNotification = false;
      let emailTemplate = null;
      let emailData = {};
      
      // Local time formatting options (Indian Standard Time)
      const localTimeOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
      };
      
      // Handle cancelled status - require cancellation reason
      if (status === 'cancelled') {
        if (!cancellationReason || !cancellationReason.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Cancellation reason is required when cancelling a service'
          });
        }
        updateData.cancellationReason = cancellationReason;
        updateData.cancelledAt = new Date();

        sendEmailNotification = true;
        emailTemplate = 'addon-service-cancelled';
        emailData = {
          addonName: addon.name,
          category: addon.category.charAt(0).toUpperCase() + addon.category.slice(1),
          cancellationReason: cancellationReason,
          cancelledAt: new Date().toLocaleString('en-IN', localTimeOptions)
        };
      }
      
      // Handle in_progress status - record start time
      if (status === 'in_progress') {
        updateData.inProgressAt = new Date();

        sendEmailNotification = true;
        emailTemplate = 'addon-service-in-progress';
        emailData = {
          addonName: addon.name,
          category: addon.category.charAt(0).toUpperCase() + addon.category.slice(1),
          inProgressAt: new Date().toLocaleString('en-IN', localTimeOptions),
          scheduledDate: serviceDate ? new Date(serviceDate).toLocaleString('en-IN', localTimeOptions) : null,
          notes: vendorResponse || null
        };
      }

      // Handle completed status - auto-set completion date
      if (status === 'completed') {
        updateData.completedDate = new Date();
        updateData.completedAt = new Date();

        sendEmailNotification = true;
        emailTemplate = 'addon-service-completed';
        emailData = {
          addonName: addon.name,
          category: addon.category.charAt(0).toUpperCase() + addon.category.slice(1),
          completedAt: new Date().toLocaleString('en-IN', localTimeOptions),
          scheduledDate: serviceDate ? new Date(serviceDate).toLocaleString('en-IN', localTimeOptions) : null,
          inProgressAt: currentSchedule.inProgressAt ? new Date(currentSchedule.inProgressAt).toLocaleString('en-IN', localTimeOptions) : null,
          notes: vendorResponse || null
        };
      }

      // Handle re-scheduling (updating scheduled date) - Manual email with local time
      if (scheduledDate && scheduledDate !== currentSchedule.scheduledDate?.toISOString()) {
        const newScheduledDate = new Date(scheduledDate);
        updateData.scheduledDate = newScheduledDate;

        const formattedNewDate = newScheduledDate.toLocaleString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata'
        });

        const formattedOldDate = currentSchedule.scheduledDate 
          ? new Date(currentSchedule.scheduledDate).toLocaleString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Kolkata'
            })
          : '';

        // Send reschedule email (manual template)
        try {
          await emailService.sendEmail({
            to: vendor.email,
            subject: `Service Rescheduled - ${addon.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ea580c; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px; background-color: #ffedd5; padding: 20px; border-radius: 8px;">
                  <h1 style="color: #ea580c; margin: 0;">📅 Service Rescheduled</h1>
                  <p style="color: #c2410c; margin: 5px 0;">New Date & Time Confirmed</p>
                </div>
                
                <div style="background-color: #fff7ed; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ea580c;">
                  <h3 style="margin: 0 0 10px 0; color: #1f2937;">Service Information</h3>
                  <p style="margin: 5px 0;"><strong>Service:</strong> ${addon.name}</p>
                  <p style="margin: 5px 0;"><strong>Category:</strong> ${addon.category.charAt(0).toUpperCase() + addon.category.slice(1)}</p>
                  <p style="margin: 5px 0;"><strong>Description:</strong> ${addon.description}</p>
                </div>

                <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #16a34a;">
                  <h3 style="margin: 0 0 10px 0; color: #1f2937;">📅 NEW Scheduled Date & Time</h3>
                  <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #16a34a;">${formattedNewDate}</p>
                </div>

                ${formattedOldDate ? `
                <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                  <p style="margin: 0; color: #991b1b;"><strong>Previous Date:</strong> ${formattedOldDate}</p>
                </div>` : ''}

                ${vendorResponse ? `
                <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 10px 0; color: #1f2937;">Additional Notes</h3>
                  <p style="margin: 0; white-space: pre-wrap;">${vendorResponse}</p>
                </div>` : ''}

                <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    ⚠️ <strong>Important:</strong> Please mark your calendar with the new date and time.
                  </p>
                </div>

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    If you need to make any changes, please reply to this email.
                  </p>
                </div>
              </div>
            `
          });
        } catch (emailError) {
          console.error('Failed to send reschedule email:', emailError);
        }
      }
      
      if (vendorResponse) {
        updateData.vendorResponse = vendorResponse;
      }

      const schedule = await AddonServiceSchedule.findByIdAndUpdate(
        scheduleId,
        updateData,
        { new: true }
      )
        .populate('vendor', 'email profile.firstName profile.lastName')
        .populate('addon', 'name category description')
        .populate('scheduledBy', 'email profile.firstName profile.lastName');

      // Send email notification to vendor using templates for status updates
      if (sendEmailNotification && emailTemplate && vendor.email) {
        try {
          await emailService.sendEmail({
            to: vendor.email,
            template: emailTemplate,
            data: emailData
          });
        } catch (emailError) {
          console.error('Failed to send status update email:', emailError);
        }
      }

      // Broadcast real-time notification
      adminRealtimeService.broadcastNotification({
        type: 'addon_schedule_updated',
        title: 'Addon Schedule Updated',
        message: `Schedule status updated to ${status}${status === 'cancelled' ? ': ' + cancellationReason : ''}`,
        data: {
          scheduleId: schedule._id,
          status,
          addonName: schedule.addon?.name,
          vendorEmail: schedule.vendor?.email,
          updatedBy: req.user.email,
          ...(status === 'cancelled' && { cancellationReason }),
          ...(status === 'completed' && { completedAt: schedule.completedAt }),
          ...(status === 'in_progress' && { inProgressAt: schedule.inProgressAt }),
          ...(scheduledDate && { rescheduledDate: scheduledDate })
        },
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: `Schedule ${status === 'cancelled' ? 'cancelled' : status === 'completed' ? 'completed' : scheduledDate && scheduledDate !== currentSchedule.scheduledDate?.toISOString() ? 'rescheduled' : 'updated'} successfully. Email notification sent to vendor.`,
        data: { schedule }
      });
    } catch (error) {
      console.error('Update schedule status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update schedule status',
        error: error.message
      });
    }
  })
);

// Add note to addon service schedule
router.post('/addon-services/schedule/:scheduleId/notes',
  hasPermission(SUB_ADMIN_PERMISSIONS.SEND_NOTIFICATIONS),
  asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    const { message } = req.body;
    const AddonServiceSchedule = require('../models/AddonServiceSchedule');

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Note message is required'
      });
    }

    try {
      const schedule = await AddonServiceSchedule.findById(scheduleId);

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
      }

      schedule.notes.push({
        message,
        author: req.user.id,
        createdAt: new Date()
      });

      await schedule.save();
      
      await schedule.populate([
        { path: 'vendor', select: 'email profile.firstName profile.lastName' },
        { path: 'addon', select: 'name category description' },
        { path: 'scheduledBy', select: 'email profile.firstName profile.lastName' },
        { path: 'notes.author', select: 'email profile.firstName profile.lastName' }
      ]);

      res.json({
        success: true,
        message: 'Note added successfully',
        data: { schedule }
      });
    } catch (error) {
      console.error('Add note error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add note',
        error: error.message
      });
    }
  })
);

// Get schedule details
router.get('/addon-services/schedule/:scheduleId',
  hasPermission(SUB_ADMIN_PERMISSIONS.APPROVE_PROMOTIONS),
  asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    const AddonServiceSchedule = require('../models/AddonServiceSchedule');

    try {
      const schedule = await AddonServiceSchedule.findById(scheduleId)
        .populate('vendor', 'email profile.firstName profile.lastName')
        .populate('addon', 'name category description price currency')
        .populate('scheduledBy', 'email profile.firstName profile.lastName')
        .populate('notes.author', 'email profile.firstName profile.lastName');

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
      }

      res.json({
        success: true,
        data: { schedule }
      });
    } catch (error) {
      console.error('Get schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch schedule details',
        error: error.message
      });
    }
  })
);

module.exports = router;
