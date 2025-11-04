const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const User = require('../models/User');
const Message = require('../models/Message');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isSubAdmin, hasPermission, SUB_ADMIN_PERMISSIONS } = require('../middleware/roleMiddleware');
const { asyncHandler } = require('../middleware/errorMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(isSubAdmin);

// Get sub admin dashboard statistics
router.get('/dashboard', asyncHandler(async (req, res) => {
  const [
    pendingProperties,
    totalProperties,
    pendingSupport,
    totalUsers
  ] = await Promise.all([
    Property.countDocuments({ status: 'pending' }),
    Property.countDocuments(),
    Message.countDocuments({ type: 'support', status: 'open' }),
    User.countDocuments({ role: { $in: ['customer', 'agent'] } })
  ]);

  res.json({
    success: true,
    data: {
      pendingProperties,
      totalProperties,
      pendingSupport,
      totalUsers,
      recentActivity: []
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
        status: 'active',
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      { new: true }
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

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
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    res.json({
      success: true,
      message: 'Property rejected successfully',
      data: property
    });
  })
);

// Content Moderation Routes
router.get('/content/reports',
  hasPermission(SUB_ADMIN_PERMISSIONS.MODERATE_CONTENT),
  asyncHandler(async (req, res) => {
    // This would be implemented based on your content reporting system
    res.json({
      success: true,
      data: {
        reports: [],
        total: 0
      }
    });
  })
);

// Support Ticket Routes
router.get('/support/tickets',
  hasPermission(SUB_ADMIN_PERMISSIONS.HANDLE_SUPPORT),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status = 'open' } = req.query;
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      Message.find({ 
        type: 'support',
        ...(status !== 'all' && { status })
      })
        .populate('sender', 'email profile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Message.countDocuments({ 
        type: 'support',
        ...(status !== 'all' && { status })
      })
    ]);

    res.json({
      success: true,
      data: {
        tickets,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      }
    });
  })
);

// Vendor Performance Tracking
router.get('/vendors/performance',
  hasPermission(SUB_ADMIN_PERMISSIONS.TRACK_PERFORMANCE),
  asyncHandler(async (req, res) => {
    const vendors = await User.aggregate([
      { $match: { role: 'agent' } },
      {
        $lookup: {
          from: 'properties',
          localField: '_id',
          foreignField: 'owner',
          as: 'properties'
        }
      },
      {
        $project: {
          email: 1,
          'profile.firstName': 1,
          'profile.lastName': 1,
          totalProperties: { $size: '$properties' },
          activeProperties: {
            $size: {
              $filter: {
                input: '$properties',
                cond: { $eq: ['$$this.status', 'active'] }
              }
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: { vendors }
    });
  })
);

// Promotion Approval Routes
router.get('/promotions/pending',
  hasPermission(SUB_ADMIN_PERMISSIONS.APPROVE_PROMOTIONS),
  asyncHandler(async (req, res) => {
    // This would be implemented based on your promotion system
    res.json({
      success: true,
      data: {
        promotions: [],
        total: 0
      }
    });
  })
);

// Notification Routes
router.post('/notifications/send',
  hasPermission(SUB_ADMIN_PERMISSIONS.SEND_NOTIFICATIONS),
  asyncHandler(async (req, res) => {
    const { title, message, recipients, type = 'general' } = req.body;

    // Implementation would depend on your notification system
    res.json({
      success: true,
      message: 'Notification sent successfully'
    });
  })
);

// Reports Generation
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

module.exports = router;
