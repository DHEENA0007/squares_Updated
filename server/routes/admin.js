const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Property = require('../models/Property');
const Message = require('../models/Message');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const Role = require('../models/Role');
const AddonService = require('../models/AddonService');
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorMiddleware');
const adminRealtimeService = require('../services/adminRealtimeService');

// Admin access middleware
router.use(authenticateToken);
router.use((req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
});

// Enhanced dashboard statistics with real-time data
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get comprehensive statistics
    const [
      totalUsers,
      totalProperties,
      totalSubscriptions,
      totalRevenue,
      newUsersThisMonth,
      newPropertiesThisMonth,
      newUsersThisWeek,
      newUsersToday,
      activeSubscriptions,
      pendingUsers,
      suspendedUsers,
      totalMessages,
      unreadMessages
    ] = await Promise.all([
      // Basic counts
      User.countDocuments(),
      Property.countDocuments(),
      Subscription.countDocuments(),
      
      // Revenue calculation
      Subscription.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then(result => result[0]?.total || 0),
      
      // Time-based user stats
      User.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
      Property.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
      User.countDocuments({ createdAt: { $gte: firstDayOfWeek } }),
      User.countDocuments({ createdAt: { $gte: yesterday } }),
      
      // Status-based counts
      Subscription.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'pending' }),
      User.countDocuments({ status: 'suspended' }),
      Message.countDocuments(),
      Message.countDocuments({ status: 'unread' })
    ]);

    // Get user growth data for charts (last 30 days)
    const userGrowthData = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Get revenue data for charts (last 30 days)
    const revenueData = await Subscription.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Get user role distribution
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activities
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('email profile.firstName profile.lastName createdAt role status');

    const recentProperties = await Property.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('owner', 'email profile.firstName profile.lastName')
      .select('title status createdAt owner');

    const recentSubscriptions = await Subscription.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'email profile.firstName profile.lastName')
      .populate('plan', 'name')
      .select('user plan amount status createdAt');

    // Filter out subscriptions with null plans or users
    const validRecentSubscriptions = recentSubscriptions.filter(sub => sub.user && sub.plan);

    // Calculate growth percentages
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const [lastMonthUsers, lastMonthProperties] = await Promise.all([
      User.countDocuments({ 
        createdAt: { $gte: lastMonth, $lt: endOfLastMonth } 
      }),
      Property.countDocuments({ 
        createdAt: { $gte: lastMonth, $lt: endOfLastMonth } 
      })
    ]);

    const stats = {
      // Overview metrics
      totalUsers,
      totalProperties,
      totalSubscriptions,
      totalRevenue,
      
      // Growth metrics
      newUsersThisMonth,
      newPropertiesThisMonth,
      newUsersThisWeek,
      newUsersToday,
      userGrowthPercent: calculateGrowth(newUsersThisMonth, lastMonthUsers),
      propertyGrowthPercent: calculateGrowth(newPropertiesThisMonth, lastMonthProperties),
      
      // Status metrics
      activeSubscriptions,
      pendingUsers,
      suspendedUsers,
      totalMessages,
      unreadMessages,
      
      // Chart data
      userGrowthData,
      revenueData,
      usersByRole,
      
      // Recent activities
      recentActivities: [
        ...recentUsers.map(user => ({
          id: user._id,
          type: 'user_registered',
          title: 'New User Registration',
          description: `${user.profile?.firstName || 'User'} ${user.profile?.lastName || ''} (${user.role})`,
          date: user.createdAt,
          status: user.status,
          metadata: {
            email: user.email,
            role: user.role,
            status: user.status
          }
        })),
        ...recentProperties.map(property => ({
          id: property._id,
          type: 'property_listed',
          title: 'New Property Listed',
          description: property.title,
          date: property.createdAt,
          status: property.status,
          metadata: {
            owner: property.owner?.email,
            status: property.status
          }
        })),
        ...validRecentSubscriptions.map(subscription => ({
          id: subscription._id,
          type: 'subscription_created',
          title: 'New Subscription',
          description: `${subscription.plan?.name || 'Unknown Plan'} - ₹${subscription.amount}`,
          date: subscription.createdAt,
          status: subscription.status,
          metadata: {
            user: subscription.user?.email,
            plan: subscription.plan?.name || 'Unknown',
            amount: subscription.amount
          }
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15),
      
      // Real-time metrics
      lastUpdated: new Date(),
      systemHealth: {
        database: 'connected',
        server: 'running',
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Real-time system metrics
router.get('/system-metrics', async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const metrics = {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        collections: await mongoose.connection.db.stats(),
      },
      activity: {
        last24Hours: {
          userRegistrations: await User.countDocuments({ createdAt: { $gte: last24Hours } }),
          propertyListings: await Property.countDocuments({ createdAt: { $gte: last24Hours } }),
          subscriptions: await Subscription.countDocuments({ createdAt: { $gte: last24Hours } }),
          messages: await Message.countDocuments({ createdAt: { $gte: last24Hours } })
        }
      },
      timestamp: now
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('System metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system metrics'
    });
  }
});

// Enhanced user management endpoints
router.get('/users', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      role = '', 
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    let query = {};

    // Build search query
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    if (role) query.role = role;
    if (status) query.status = status;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select('email profile role status createdAt updatedAt lastLogin')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get specific user details
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password')
      .populate('businessInfo');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's properties and subscriptions
    const [properties, subscriptions, messages] = await Promise.all([
      Property.find({ owner: userId }).select('title status createdAt'),
      Subscription.find({ user: userId }).populate('plan').select('plan status amount createdAt'),
      Message.countDocuments({ 
        $or: [{ sender: userId }, { recipient: userId }] 
      })
    ]);

    res.json({
      success: true,
      data: {
        user,
        statistics: {
          totalProperties: properties.length,
          totalSubscriptions: subscriptions.length,
          totalMessages: messages,
          properties,
          subscriptions
        }
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details'
    });
  }
});

// Update user status
router.patch('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        status,
        ...(status === 'suspended' && { suspendedAt: new Date(), suspensionReason: reason }),
        ...(status === 'active' && { $unset: { suspendedAt: 1, suspensionReason: 1 } })
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user },
      message: `User status updated to ${status}`
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user has properties or subscriptions
    const [properties, subscriptions] = await Promise.all([
      Property.countDocuments({ owner: userId }),
      Subscription.countDocuments({ user: userId, status: 'active' })
    ]);

    if (properties > 0 || subscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user with active properties or subscriptions'
      });
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// Property management endpoints
router.get('/properties', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '',
      listingType = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (listingType) query.listingType = listingType;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [properties, totalProperties] = await Promise.all([
      Property.find(query)
        .populate('owner', 'email profile.firstName profile.lastName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Property.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalProperties / limit);

    res.json({
      success: true,
      data: {
        properties,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProperties,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties'
    });
  }
});

// Get single property (Admin)
router.get('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format'
      });
    }

    const property = await Property.findById(id)
      .populate('owner', 'profile.firstName profile.lastName email');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    res.json({
      success: true,
      data: { property }
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property'
    });
  }
});

// Create property (Admin)
router.post('/properties', async (req, res) => {
  try {
    const propertyData = {
      ...req.body,
      owner: req.user.id, // Admin creating the property
      createdBy: req.user.id,
      status: 'active', // Admin properties are directly active
      verified: true, // Admin properties are pre-verified
      createdAt: new Date()
    };

    const property = await Property.create(propertyData);
    
    await property.populate('owner', 'profile.firstName profile.lastName');

    res.status(201).json({
      success: true,
      data: { property },
      message: 'Property created and listed successfully'
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create property'
    });
  }
});

// Update property status
router.patch('/properties/:propertyId/status', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['active', 'inactive', 'pending', 'rejected', 'sold', 'rented'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updateData = { 
      status,
      modifiedBy: req.user.id,
      modifiedAt: new Date()
    };

    // If approving, mark as verified
    if (status === 'active') {
      updateData.verified = true;
      updateData.approvedBy = req.user.id;
      updateData.approvedAt = new Date();
    }

    // If rejecting, add rejection reason
    if (status === 'rejected' && reason) {
      updateData.rejectionReason = reason;
      updateData.rejectedBy = req.user.id;
      updateData.rejectedAt = new Date();
    }

    const property = await Property.findByIdAndUpdate(
      propertyId,
      updateData,
      { new: true }
    ).populate('owner', 'email profile.firstName profile.lastName');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Prepare response message
    let message = `Property status updated to ${status}`;
    if (status === 'active') {
      message = 'Property approved and listed successfully';
    } else if (status === 'rejected') {
      message = 'Property rejected';
    }

    res.json({
      success: true,
      data: { property },
      message
    });
  } catch (error) {
    console.error('Update property status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update property status'
    });
  }
});

// Delete property (Admin)
router.delete('/properties/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;

    const property = await Property.findByIdAndDelete(propertyId);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete property'
    });
  }
});

// Toggle property featured status
router.patch('/properties/:propertyId/featured', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { featured } = req.body;

    const property = await Property.findByIdAndUpdate(
      propertyId,
      { 
        featured,
        modifiedBy: req.user.id,
        modifiedAt: new Date()
      },
      { new: true }
    ).populate('owner', 'profile.firstName profile.lastName');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    res.json({
      success: true,
      data: { property },
      message: `Property ${featured ? 'marked as featured' : 'removed from featured'}`
    });
  } catch (error) {
    console.error('Update property featured error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update property'
    });
  }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateRange;
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateRange = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        dateRange = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get comprehensive analytics
    const [
      userTrends,
      propertyTrends,
      revenueTrends,
      subscriptionTrends,
      topPerformingProperties,
      userEngagement
    ] = await Promise.all([
      // User registration trends
      User.aggregate([
        { $match: { createdAt: { $gte: dateRange } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            users: { $sum: 1 },
            byRole: { $push: "$role" }
          }
        },
        { $sort: { "_id": 1 } }
      ]),

      // Property listing trends
      Property.aggregate([
        { $match: { createdAt: { $gte: dateRange } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            properties: { $sum: 1 },
            byType: { $push: "$listingType" },
            avgPrice: { $avg: "$price" }
          }
        },
        { $sort: { "_id": 1 } }
      ]),

      // Revenue trends
      Subscription.aggregate([
        { $match: { createdAt: { $gte: dateRange } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            revenue: { $sum: "$amount" },
            subscriptions: { $sum: 1 }
          }
        },
        { $sort: { "_id": 1 } }
      ]),

      // Subscription type distribution
      Subscription.aggregate([
        { $match: { createdAt: { $gte: dateRange } } },
        {
          $lookup: {
            from: 'plans',
            localField: 'plan',
            foreignField: '_id',
            as: 'planDetails'
          }
        },
        {
          $group: {
            _id: "$planDetails.name",
            count: { $sum: 1 },
            revenue: { $sum: "$amount" }
          }
        }
      ]),

      // Top performing properties
      Property.aggregate([
        { $match: { createdAt: { $gte: dateRange } } },
        {
          $lookup: {
            from: 'users',
            localField: 'owner',
            foreignField: '_id',
            as: 'ownerDetails'
          }
        },
        {
          $project: {
            title: 1,
            views: 1,
            price: 1,
            status: 1,
            owner: { $arrayElemAt: ["$ownerDetails.email", 0] }
          }
        },
        { $sort: { views: -1 } },
        { $limit: 10 }
      ]),

      // User engagement metrics
      Message.aggregate([
        { $match: { createdAt: { $gte: dateRange } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            messages: { $sum: 1 },
            uniqueUsers: { $addToSet: "$sender" }
          }
        },
        {
          $project: {
            _id: 1,
            messages: 1,
            activeUsers: { $size: "$uniqueUsers" }
          }
        },
        { $sort: { "_id": 1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        userTrends,
        propertyTrends,
        revenueTrends,
        subscriptionTrends,
        topPerformingProperties,
        userEngagement,
        period,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
});

// Real-time notifications for admin
router.get('/notifications', async (req, res) => {
  try {
    const { limit = 20, unreadOnly = false } = req.query;
    
    // Get recent system events for notifications
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const notifications = [];

    // Pending user approvals
    const pendingUsers = await User.find({ status: 'pending' })
      .select('email profile createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    pendingUsers.forEach(user => {
      notifications.push({
        id: `user_pending_${user._id}`,
        type: 'user_pending',
        title: 'User Approval Required',
        message: `${user.profile?.firstName || user.email} is waiting for approval`,
        timestamp: user.createdAt,
        priority: 'high',
        actionUrl: `/admin/users/${user._id}`,
        isRead: false
      });
    });

    // Properties pending review
    const pendingProperties = await Property.find({ status: 'pending' })
      .populate('owner', 'email profile.firstName')
      .select('title owner createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    pendingProperties.forEach(property => {
      notifications.push({
        id: `property_pending_${property._id}`,
        type: 'property_pending',
        title: 'Property Review Required',
        message: `"${property.title}" by ${property.owner?.profile?.firstName || property.owner?.email} needs review`,
        timestamp: property.createdAt,
        priority: 'medium',
        actionUrl: `/admin/properties/${property._id}`,
        isRead: false
      });
    });

    // High-value subscriptions
    const recentSubscriptions = await Subscription.find({
      createdAt: { $gte: last24Hours },
      amount: { $gte: 5000 }
    }).populate('user', 'email profile.firstName')
      .populate('plan', 'name')
      .sort({ createdAt: -1 });

    recentSubscriptions.forEach(subscription => {
      notifications.push({
        id: `subscription_high_value_${subscription._id}`,
        type: 'subscription_created',
        title: 'High-Value Subscription',
        message: `${subscription.user?.profile?.firstName || subscription.user?.email} subscribed to ${subscription.plan?.name} for ₹${subscription.amount}`,
        timestamp: subscription.createdAt,
        priority: 'low',
        actionUrl: `/admin/subscriptions/${subscription._id}`,
        isRead: false
      });
    });

    // Sort by timestamp and apply limit
    const sortedNotifications = notifications
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        notifications: sortedNotifications,
        unreadCount: notifications.filter(n => !n.isRead).length,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Real-time service management endpoints

// Get real-time service status and connected clients
router.get('/realtime/status', (req, res) => {
  try {
    const connectedClients = adminRealtimeService.getConnectedClients();
    const systemHealth = adminRealtimeService.getSystemHealth();
    
    res.json({
      success: true,
      data: {
        isActive: true,
        connectedClients: connectedClients.length,
        clients: connectedClients,
        systemHealth,
        features: {
          liveMetrics: true,
          databaseChangeStreams: true,
          notifications: true,
          userActivityTracking: true
        }
      }
    });
  } catch (error) {
    console.error('Real-time status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get real-time service status'
    });
  }
});

// Get current live metrics
router.get('/realtime/metrics', async (req, res) => {
  try {
    const metrics = await adminRealtimeService.generateLiveMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Live metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate live metrics'
    });
  }
});

// Send notification to all admin clients
router.post('/realtime/broadcast', (req, res) => {
  try {
    const { title, message, type = 'info', priority = 'medium', data = {} } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }
    
    const notification = {
      title,
      message,
      type,
      priority,
      data,
      sentBy: req.user.id,
      sentByName: req.user.name || req.user.email
    };
    
    adminRealtimeService.broadcastNotification(notification);
    
    res.json({
      success: true,
      message: 'Notification broadcast successfully',
      data: notification
    });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast notification'
    });
  }
});

// Force refresh metrics for all connected clients
router.post('/realtime/refresh-metrics', async (req, res) => {
  try {
    const connectedClients = adminRealtimeService.getConnectedClients();
    
    // Send updated metrics to all connected admin clients
    for (const client of connectedClients) {
      await adminRealtimeService.sendLiveMetrics(client.clientId);
    }
    
    res.json({
      success: true,
      message: `Metrics refreshed for ${connectedClients.length} connected clients`,
      data: {
        clientsUpdated: connectedClients.length,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Refresh metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh metrics'
    });
  }
});

// Get system health and alerts
router.get('/realtime/health', async (req, res) => {
  try {
    const systemHealth = adminRealtimeService.getSystemHealth();
    const alerts = await adminRealtimeService.getSystemAlerts();
    
    res.json({
      success: true,
      data: {
        health: systemHealth,
        alerts,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('System health error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system health'
    });
  }
});

// ===== ADDON MANAGEMENT ROUTES =====

// @desc    Get all addon services (Admin)
// @route   GET /api/admin/addons
// @access  Private/Admin
router.get('/addons', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    search = '', 
    category = '', 
    isActive 
  } = req.query;

  const skip = (page - 1) * limit;
  let query = {};

  // Build search query
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  if (category) query.category = category;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const [addons, totalAddons] = await Promise.all([
    AddonService.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    AddonService.countDocuments(query)
  ]);

  const totalPages = Math.ceil(totalAddons / limit);

  res.json({
    success: true,
    data: {
      addons,
      total: totalAddons,
      totalPages,
      currentPage: parseInt(page),
      hasNext: page < totalPages,
      hasPrev: page > 1,
      limit: parseInt(limit)
    }
  });
}));

// @desc    Get addon service by ID (Admin)
// @route   GET /api/admin/addons/:id
// @access  Private/Admin
router.get('/addons/:id', asyncHandler(async (req, res) => {
  const addon = await AddonService.findById(req.params.id);

  if (!addon) {
    return res.status(404).json({
      success: false,
      message: 'Addon service not found'
    });
  }

  res.json({
    success: true,
    data: addon
  });
}));

// @desc    Create new addon service (Admin)
// @route   POST /api/admin/addons
// @access  Private/Admin
router.post('/addons', asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    currency = 'INR',
    billingType,
    category,
    icon,
    isActive = true,
    sortOrder = 0
  } = req.body;

  // Validate required fields
  if (!name || !description || !price || !billingType || !category) {
    return res.status(400).json({
      success: false,
      message: 'Name, description, price, billing type, and category are required'
    });
  }

  // Validate enums
  const validBillingTypes = ['per_property', 'monthly', 'yearly', 'one_time'];
  const validCategories = ['photography', 'marketing', 'technology', 'support', 'crm'];
  const validCurrencies = ['INR', 'USD', 'EUR'];

  if (!validBillingTypes.includes(billingType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid billing type'
    });
  }

  if (!validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid category'
    });
  }

  if (!validCurrencies.includes(currency)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid currency'
    });
  }

  // Check if addon with same name exists
  const existingAddon = await AddonService.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existingAddon) {
    return res.status(400).json({
      success: false,
      message: 'Addon service with this name already exists'
    });
  }

  const addon = await AddonService.create({
    name,
    description,
    price,
    currency,
    billingType,
    category,
    icon,
    isActive,
    sortOrder
  });

  res.status(201).json({
    success: true,
    data: addon,
    message: 'Addon service created successfully'
  });
}));

// @desc    Update addon service (Admin)
// @route   PUT /api/admin/addons/:id
// @access  Private/Admin
router.put('/addons/:id', asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    currency,
    billingType,
    category,
    icon,
    isActive,
    sortOrder
  } = req.body;

  const addon = await AddonService.findById(req.params.id);

  if (!addon) {
    return res.status(404).json({
      success: false,
      message: 'Addon service not found'
    });
  }

  // Validate enums if provided
  if (billingType) {
    const validBillingTypes = ['per_property', 'monthly', 'yearly', 'one_time'];
    if (!validBillingTypes.includes(billingType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing type'
      });
    }
  }

  if (category) {
    const validCategories = ['photography', 'marketing', 'technology', 'support', 'crm'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }
  }

  if (currency) {
    const validCurrencies = ['INR', 'USD', 'EUR'];
    if (!validCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid currency'
      });
    }
  }

  // Check if name is being changed and if it conflicts
  if (name && name !== addon.name) {
    const existingAddon = await AddonService.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: req.params.id }
    });
    if (existingAddon) {
      return res.status(400).json({
        success: false,
        message: 'Addon service with this name already exists'
      });
    }
  }

  // Update fields
  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (description !== undefined) updateFields.description = description;
  if (price !== undefined) updateFields.price = price;
  if (currency !== undefined) updateFields.currency = currency;
  if (billingType !== undefined) updateFields.billingType = billingType;
  if (category !== undefined) updateFields.category = category;
  if (icon !== undefined) updateFields.icon = icon;
  if (isActive !== undefined) updateFields.isActive = isActive;
  if (sortOrder !== undefined) updateFields.sortOrder = sortOrder;

  const updatedAddon = await AddonService.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: updatedAddon,
    message: 'Addon service updated successfully'
  });
}));

// @desc    Delete addon service (Admin)
// @route   DELETE /api/admin/addons/:id
// @access  Private/Admin
router.delete('/addons/:id', asyncHandler(async (req, res) => {
  const addon = await AddonService.findById(req.params.id);

  if (!addon) {
    return res.status(404).json({
      success: false,
      message: 'Addon service not found'
    });
  }

  // Check if addon is being used in any active subscriptions
  const subscriptionsUsingAddon = await Subscription.countDocuments({
    addons: req.params.id,
    status: 'active'
  });

  if (subscriptionsUsingAddon > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete addon service. It is currently being used in ${subscriptionsUsingAddon} active subscription(s)`
    });
  }

  await AddonService.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Addon service deleted successfully'
  });
}));

// @desc    Toggle addon service status (Admin)
// @route   PATCH /api/admin/addons/:id/toggle-status
// @access  Private/Admin
router.patch('/addons/:id/toggle-status', asyncHandler(async (req, res) => {
  const addon = await AddonService.findById(req.params.id);

  if (!addon) {
    return res.status(404).json({
      success: false,
      message: 'Addon service not found'
    });
  }

  addon.isActive = !addon.isActive;
  await addon.save();

  res.json({
    success: true,
    data: addon,
    message: `Addon service ${addon.isActive ? 'activated' : 'deactivated'} successfully`
  });
}));

// @desc    Update addon services sort order (Admin)
// @route   PUT /api/admin/addons/sort-order
// @access  Private/Admin
router.put('/addons/sort-order', asyncHandler(async (req, res) => {
  const { addonIds } = req.body;

  if (!Array.isArray(addonIds) || addonIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Array of addon IDs is required'
    });
  }

  // Update sort order for each addon
  const updatePromises = addonIds.map((addonId, index) => 
    AddonService.findByIdAndUpdate(addonId, { sortOrder: index })
  );

  await Promise.all(updatePromises);

  res.json({
    success: true,
    message: 'Addon sort order updated successfully'
  });
}));

// @desc    Get addon service statistics (Admin)
// @route   GET /api/admin/addons/stats
// @access  Private/Admin
router.get('/addons/stats', asyncHandler(async (req, res) => {
  const [
    totalAddons,
    activeAddons,
    inactiveAddons,
    categoryStats,
    billingTypeStats,
    addonUsageStats
  ] = await Promise.all([
    AddonService.countDocuments(),
    AddonService.countDocuments({ isActive: true }),
    AddonService.countDocuments({ isActive: false }),
    
    // Category distribution
    AddonService.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          totalRevenue: { $sum: '$price' }
        }
      },
      { $sort: { count: -1 } }
    ]),
    
    // Billing type distribution
    AddonService.aggregate([
      {
        $group: {
          _id: '$billingType',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      },
      { $sort: { count: -1 } }
    ]),
    
    // Usage in subscriptions
    Subscription.aggregate([
      { $unwind: '$addons' },
      {
        $lookup: {
          from: 'addonservices',
          localField: 'addons',
          foreignField: '_id',
          as: 'addonDetails'
        }
      },
      { $unwind: '$addonDetails' },
      {
        $group: {
          _id: '$addons',
          name: { $first: '$addonDetails.name' },
          usage: { $sum: 1 },
          revenue: { $sum: '$addonDetails.price' }
        }
      },
      { $sort: { usage: -1 } },
      { $limit: 10 }
    ])
  ]);

  // Calculate average price
  const allAddons = await AddonService.find({}, 'price');
  const avgPrice = allAddons.length > 0 
    ? allAddons.reduce((sum, addon) => sum + addon.price, 0) / allAddons.length 
    : 0;

  res.json({
    success: true,
    data: {
      overview: {
        totalAddons,
        activeAddons,
        inactiveAddons,
        avgPrice: Math.round(avgPrice)
      },
      categoryStats,
      billingTypeStats,
      addonUsageStats,
      generatedAt: new Date()
    }
  });
}));

// @desc    Get all messages for admin management
// @route   GET /api/admin/messages
// @access  Private/Admin
router.get('/messages', asyncHandler(async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      type, 
      priority,
      search 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query - only show messages where current admin is the recipient
    let filter = {
      recipient: req.user.id  // Only show messages intended for this admin
    };
    if (status && status !== 'all') filter.status = status;
    if (type && type !== 'all') filter.type = type;
    if (priority && priority !== 'all') filter.priority = priority;

    // Add search functionality
    if (search && search.trim()) {
      filter.$or = [
        { content: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    const [messages, totalCount] = await Promise.all([
      Message.find(filter)
        .populate('sender', 'email role profile.firstName profile.lastName profile.avatar')
        .populate('recipient', 'email role profile.firstName profile.lastName profile.avatar')
        .populate('property', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Message.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalMessages: totalCount,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
}));

// @desc    Get message statistics for admin dashboard
// @route   GET /api/admin/messages/stats
// @access  Private/Admin
router.get('/messages/stats', asyncHandler(async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalMessages,
      unreadMessages,
      repliedMessages,
      flaggedMessages,
      todayMessages,
      weeklyMessages,
      monthlyMessages,
      messagesByType,
      messagesByPriority,
      responseTimeData
    ] = await Promise.all([
      Message.countDocuments({ recipient: req.user.id }),
      Message.countDocuments({ recipient: req.user.id, status: 'unread' }),
      Message.countDocuments({ recipient: req.user.id, status: 'replied' }),
      Message.countDocuments({ recipient: req.user.id, status: 'flagged' }),
      Message.countDocuments({ recipient: req.user.id, createdAt: { $gte: today } }),
      Message.countDocuments({ recipient: req.user.id, createdAt: { $gte: last7Days } }),
      Message.countDocuments({ recipient: req.user.id, createdAt: { $gte: last30Days } }),
      
      // Messages by type
      Message.aggregate([
        { $match: { recipient: req.user.id } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // Messages by priority
      Message.aggregate([
        { $match: { recipient: req.user.id } },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Average response time calculation
      Message.aggregate([
        {
          $match: {
            recipient: req.user.id,
            status: 'replied',
            repliedAt: { $exists: true },
            createdAt: { $exists: true }
          }
        },
        {
          $project: {
            responseTime: {
              $divide: [
                { $subtract: ['$repliedAt', '$createdAt'] },
                1000 * 60 * 60 // Convert to hours
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$responseTime' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Calculate response rate
    const responseRate = totalMessages > 0 
      ? Math.round((repliedMessages / totalMessages) * 100) 
      : 0;

    // Format average response time
    const avgResponseTime = responseTimeData.length > 0 
      ? `${Math.round(responseTimeData[0].avgResponseTime * 10) / 10} hours`
      : 'N/A';

    res.json({
      success: true,
      data: {
        totalMessages,
        unreadMessages,
        repliedMessages,
        flaggedMessages,
        todayMessages,
        weeklyMessages,
        monthlyMessages,
        responseRate,
        avgResponseTime,
        messagesByType,
        messagesByPriority
      }
    });
  } catch (error) {
    console.error('Get message stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message statistics'
    });
  }
}));

// @desc    Update message status
// @route   PATCH /api/admin/messages/:messageId/status
// @access  Private/Admin
router.patch('/messages/:messageId/status', asyncHandler(async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;

    const validStatuses = ['unread', 'read', 'replied', 'archived', 'flagged'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updateData = { status };
    if (status === 'read') {
      updateData.readAt = new Date();
    } else if (status === 'replied') {
      updateData.repliedAt = new Date();
    }

    const message = await Message.findByIdAndUpdate(
      messageId,
      updateData,
      { new: true }
    ).populate('sender', 'email profile.firstName profile.lastName')
     .populate('recipient', 'email profile.firstName profile.lastName');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      data: { message },
      message: `Message marked as ${status}`
    });
  } catch (error) {
    console.error('Update message status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update message status'
    });
  }
}));

// @desc    Delete message
// @route   DELETE /api/admin/messages/:messageId
// @access  Private/Admin
router.delete('/messages/:messageId', asyncHandler(async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndDelete(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message'
    });
  }
}));

// @desc    Send reply to message
// @route   POST /api/admin/messages/:messageId/reply
// @access  Private/Admin
router.post('/messages/:messageId/reply', asyncHandler(async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, subject } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply content is required'
      });
    }

    const originalMessage = await Message.findById(messageId)
      .populate('sender', 'email profile.firstName profile.lastName');

    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Original message not found'
      });
    }

    // Create reply message
    const replyMessage = new Message({
      sender: req.user.id, // Admin user
      recipient: originalMessage.sender._id,
      subject: subject || `Re: ${originalMessage.subject || originalMessage.message || 'Your Inquiry'}`,
      content: content.trim(),
      type: 'general',
      status: 'read', // Admin messages are automatically read
      priority: originalMessage.priority || 'medium',
      parentMessage: messageId,
      // Don't set conversationId for admin messages
    });

    await replyMessage.save();

    // Update original message status
    await Message.findByIdAndUpdate(messageId, {
      status: 'replied',
      repliedAt: new Date()
    });

    // Populate the reply with sender info
    await replyMessage.populate('sender', 'email profile.firstName profile.lastName');
    await replyMessage.populate('recipient', 'email profile.firstName profile.lastName');

    res.json({
      success: true,
      data: { reply: replyMessage },
      message: 'Reply sent successfully'
    });
  } catch (error) {
    console.error('Send reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reply'
    });
  }
}));

module.exports = router;
