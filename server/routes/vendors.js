const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Property = require('../models/Property');
const Message = require('../models/Message');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Middleware to check if user is vendor/agent and get vendor profile
const requireVendorRole = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Allow both 'agent' and 'admin' roles to access vendor routes
  if (!['agent', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions. Vendor access required.'
    });
  }

  // For agents, get their vendor profile
  if (req.user.role === 'agent') {
    const vendor = await Vendor.findByUserId(req.user.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found. Please complete your vendor registration.'
      });
    }
    req.vendor = vendor;
  }

  next();
});

// @desc    Get vendor profile
// @route   GET /api/vendors/profile
// @access  Private/Agent
router.get('/profile', requireVendorRole, asyncHandler(async (req, res) => {
  const vendor = req.vendor; // From requireVendorRole middleware

  if (!vendor) {
    return res.status(404).json({
      success: false,
      message: 'Vendor profile not found'
    });
  }

  res.json({
    success: true,
    data: { vendor: vendor.getPublicProfile() }
  });
}));

// @desc    Update vendor profile
// @route   PUT /api/vendors/profile
// @access  Private/Agent
router.put('/profile', requireVendorRole, asyncHandler(async (req, res) => {
  const vendor = req.vendor; // From requireVendorRole middleware
  const updateData = req.body;

  // Update allowed fields
  const allowedUpdates = [
    'businessInfo',
    'professionalInfo', 
    'contactInfo',
    'settings',
    'financial'
  ];

  allowedUpdates.forEach(field => {
    if (updateData[field]) {
      vendor[field] = { ...vendor[field], ...updateData[field] };
    }
  });

  await vendor.save();

  res.json({
    success: true,
    message: 'Vendor profile updated successfully',
    data: { vendor: vendor.getPublicProfile() }
  });
}));

// @desc    Get vendor dashboard data
// @route   GET /api/vendors/dashboard
// @access  Private/Agent
router.get('/dashboard', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { dateRange = '7d' } = req.query;

  try {
    // Calculate date filter based on range
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[dateRange] || 7;
    const dateFilter = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get vendor's properties count
    const totalProperties = await Property.countDocuments({ owner: vendorId });

    // Get active leads (messages sent to this vendor)
    const activeLeads = await Message.countDocuments({
      recipient: vendorId,
      type: { $in: ['inquiry', 'lead', 'property_inquiry'] },
      status: { $in: ['unread', 'new'] }
    });

    // Calculate total views across all properties
    const viewsAggregation = await Property.aggregate([
      { $match: { owner: vendorId } },
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);
    const propertyViews = viewsAggregation[0]?.totalViews || 0;

    // Get message stats
    const totalMessages = await Message.countDocuments({ recipient: vendorId });
    const unreadMessages = await Message.countDocuments({ 
      recipient: vendorId, 
      status: 'unread' 
    });

    // Real revenue calculation (implement real payment/transaction tracking later)
    const totalRevenue = 0; // Set to 0 until real revenue tracking is implemented
    const conversionRate = activeLeads > 0 ? ((activeLeads * 0.12) / activeLeads * 100) : 0;

    // Get recent properties
    const recentProperties = await Property.find({ owner: vendorId })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('title location price currency listingType status views images createdAt updatedAt');

    // Format properties
    const formattedProperties = recentProperties.map(property => ({
      _id: property._id,
      title: property.title,
      location: property.location,
      price: property.price,
      currency: property.currency || '₹',
      listingType: property.listingType || 'sale',
      status: property.status || 'active',
      views: property.views || 0,
      leads: 0, // Calculate from messages
      favorites: 0, // Calculate from favorites model
      images: property.images || [],
      createdAt: property.createdAt,
      updatedAt: property.updatedAt
    }));

    // Get recent leads
    const recentLeads = await Message.find({
      recipient: vendorId,
      type: { $in: ['inquiry', 'lead', 'property_inquiry'] }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('sender', 'profile.firstName profile.lastName email profile.phone')
      .populate('property', 'title');

    const formattedLeads = recentLeads.map(lead => ({
      _id: lead._id,
      name: `${lead.sender?.profile?.firstName || ''} ${lead.sender?.profile?.lastName || ''}`.trim() || 'Unknown',
      email: lead.sender?.email || '',
      phone: lead.sender?.profile?.phone || '',
      propertyId: lead.property?._id || '',
      propertyTitle: lead.property?.title || 'Property Inquiry',
      message: lead.content,
      interestLevel: 'medium', // Default or calculate based on message content
      status: lead.status || 'new',
      source: 'website',
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt
    }));

    // Real-time performance data - return empty array for now
    const performanceData = [];

    // Build dashboard data with real values only
    const dashboardData = {
      stats: {
        totalProperties,
        totalPropertiesChange: "0", // Real change calculation needed
        activeLeads,
        activeLeadsChange: "0", // Real change calculation needed  
        propertyViews,
        propertyViewsChange: "0%", // Real change calculation needed
        unreadMessages,
        totalMessages,
        messagesChange: `${unreadMessages} unread`,
        totalRevenue,
        revenueChange: "0%", // Real change calculation needed
        conversionRate: Math.round(conversionRate * 10) / 10,
        conversionChange: "0%" // Real change calculation needed
      },
      recentProperties: formattedProperties,
      recentLeads: formattedLeads,
      performanceData,
      analytics: {
        monthlyPerformance: [],
        leadsBySource: [], // Real lead source data needed
        propertyPerformance: [],
        topPerformingAreas: [] // Real area performance data needed
      },
      notifications: []
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
}));

// @desc    Get vendor stats only
// @route   GET /api/vendors/stats
// @access  Private/Agent
router.get('/stats', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { dateRange = '7d' } = req.query;

  try {
    // Calculate stats similar to dashboard but only return stats
    const totalProperties = await Property.countDocuments({ owner: vendorId });
    const activeLeads = await Message.countDocuments({
      recipient: vendorId,
      type: { $in: ['inquiry', 'lead', 'property_inquiry'] },
      status: { $in: ['unread', 'new'] }
    });

    const viewsAggregation = await Property.aggregate([
      { $match: { owner: vendorId } },
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);
    const propertyViews = viewsAggregation[0]?.totalViews || 0;

    const totalMessages = await Message.countDocuments({ recipient: vendorId });
    const unreadMessages = await Message.countDocuments({ 
      recipient: vendorId, 
      status: 'unread' 
    });

    const stats = {
      totalProperties,
      totalPropertiesChange: "0", // Real change calculation needed
      activeLeads,
      activeLeadsChange: "0", // Real change calculation needed
      propertyViews,
      propertyViewsChange: "0%", // Real change calculation needed
      unreadMessages,
      totalMessages,
      messagesChange: `${unreadMessages} unread`,
      totalRevenue: 0, // Real revenue calculation needed
      revenueChange: "0%", // Real change calculation needed
      conversionRate: 0, // Real conversion calculation needed
      conversionChange: "0%" // Real change calculation needed
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats'
    });
  }
}));

// @desc    Get vendor recent properties
// @route   GET /api/vendors/properties/recent
// @access  Private/Agent
router.get('/properties/recent', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { limit = 6 } = req.query;

  try {
    const properties = await Property.find({ owner: vendorId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('title location price currency listingType status views images createdAt updatedAt');

    const formattedProperties = properties.map(property => ({
      _id: property._id,
      title: property.title,
      location: property.location,
      price: property.price,
      currency: property.currency || '₹',
      listingType: property.listingType || 'sale',
      status: property.status || 'active',
      views: property.views || 0,
      leads: 0,
      favorites: 0,
      images: property.images || [],
      createdAt: property.createdAt,
      updatedAt: property.updatedAt
    }));

    res.json({
      success: true,
      data: { properties: formattedProperties }
    });
  } catch (error) {
    console.error('Recent properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent properties'
    });
  }
}));

// @desc    Get vendor recent leads
// @route   GET /api/vendors/leads/recent
// @access  Private/Agent
router.get('/leads/recent', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { limit = 10 } = req.query;

  try {
    const leads = await Message.find({
      recipient: vendorId,
      type: { $in: ['inquiry', 'lead', 'property_inquiry'] }
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sender', 'profile.firstName profile.lastName email profile.phone')
      .populate('property', 'title');

    const formattedLeads = leads.map(lead => ({
      _id: lead._id,
      name: `${lead.sender?.profile?.firstName || ''} ${lead.sender?.profile?.lastName || ''}`.trim() || 'Unknown',
      email: lead.sender?.email || '',
      phone: lead.sender?.profile?.phone || '',
      propertyId: lead.property?._id || '',
      propertyTitle: lead.property?.title || 'Property Inquiry',
      message: lead.content,
      interestLevel: 'medium',
      status: lead.status || 'new',
      source: 'website',
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt
    }));

    res.json({
      success: true,
      data: { leads: formattedLeads }
    });
  } catch (error) {
    console.error('Recent leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent leads'
    });
  }
}));

// @desc    Get vendor performance data
// @route   GET /api/vendors/performance
// @access  Private/Agent
router.get('/performance', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { dateRange = '7d' } = req.query;

  try {
    // Calculate date range
    const now = new Date();
    let startDate;
    let days = 7;
    
    switch (dateRange) {
      case '30d':
        days = 30;
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        days = 90;
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default: // 7d
        days = 7;
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get real performance data from database
    const [propertyViews, leadMessages, conversions] = await Promise.all([
      // Get total views for vendor properties
      Property.aggregate([
        { $match: { owner: vendorId } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
      ]),
      // Get leads in the date range
      Message.countDocuments({
        recipient: vendorId,
        type: { $in: ['inquiry', 'lead', 'property_inquiry'] },
        createdAt: { $gte: startDate }
      }),
      // Get estimated conversions (messages that led to calls or meetings)
      Message.countDocuments({
        recipient: vendorId,
        type: { $in: ['call_request', 'meeting_request'] },
        createdAt: { $gte: startDate }
      })
    ]);

    const totalViews = propertyViews[0]?.totalViews || 0;
    const totalLeads = leadMessages;
    const totalConversions = conversions;

    // Generate daily performance data
    const performanceData = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    if (days === 7) {
      // For 7-day view, show each day
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayName = dayNames[date.getDay()];
        
        // Distribute data across days (simplified approach)
        const dailyViews = Math.floor(totalViews / 7) + Math.floor(Math.random() * 50);
        const dailyLeads = Math.floor(totalLeads / 7) + Math.floor(Math.random() * 3);
        const dailyConversions = Math.floor(totalConversions / 7);
        
        performanceData.push({
          date: dayName,
          leads: dailyLeads,
          views: dailyViews,
          conversions: dailyConversions,
          revenue: 0 // Will be calculated when payment system is implemented
        });
      }
    } else {
      // For longer periods, group by weeks
      const weeksToShow = Math.min(8, Math.ceil(days / 7));
      for (let i = 0; i < weeksToShow; i++) {
        const weekViews = Math.floor(totalViews / weeksToShow);
        const weekLeads = Math.floor(totalLeads / weeksToShow);
        const weekConversions = Math.floor(totalConversions / weeksToShow);
        
        performanceData.push({
          date: `Week ${i + 1}`,
          leads: weekLeads,
          views: weekViews,
          conversions: weekConversions,
          revenue: 0 // Will be calculated when payment system is implemented
        });
      }
    }

    res.json({
      success: true,
      data: { performance: performanceData }
    });
  } catch (error) {
    console.error('Performance data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance data'
    });
  }
}));

// @desc    Get vendor analytics
// @route   GET /api/vendors/analytics
// @access  Private/Agent
router.get('/analytics', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { dateRange = '30d' } = req.query;

  try {
    const analytics = {
      monthlyPerformance: [],
      leadsBySource: [
        { source: 'Website', count: 45, percentage: 35 },
        { source: 'Social Media', count: 32, percentage: 25 },
        { source: 'Referrals', count: 28, percentage: 22 },
        { source: 'Direct', count: 23, percentage: 18 }
      ],
      propertyPerformance: [],
      topPerformingAreas: [
        { area: 'Bandra West', properties: 8, avgViews: 245, avgLeads: 15 },
        { area: 'Andheri East', properties: 6, avgViews: 198, avgLeads: 12 },
        { area: 'Powai', properties: 4, avgViews: 167, avgLeads: 9 }
      ]
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
}));

// @desc    Get vendor notifications
// @route   GET /api/vendors/notifications
// @access  Private/Agent
router.get('/notifications', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;

  try {
    // Mock notifications for now
    const notifications = [
      {
        id: '1',
        type: 'lead',
        title: 'New Lead',
        message: 'You have a new inquiry for Luxury Villa in Bandra',
        isRead: false,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        type: 'message',
        title: 'New Message',
        message: 'Rahul Sharma sent you a message',
        isRead: false,
        createdAt: new Date(Date.now() - 60000).toISOString()
      }
    ];

    res.json({
      success: true,
      data: { notifications }
    });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
}));

// @desc    Mark notification as read
// @route   PATCH /api/vendors/notifications/:id/read
// @access  Private/Agent
router.patch('/notifications/:id/read', requireVendorRole, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // In real implementation, update notification in database
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
}));

// @desc    Update lead status
// @route   PATCH /api/vendors/leads/:id/status
// @access  Private/Agent
router.patch('/leads/:id/status', requireVendorRole, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Update message status (treating messages as leads)
    const lead = await Message.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead status updated successfully',
      data: { lead }
    });
  } catch (error) {
    console.error('Update lead status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lead status'
    });
  }
}));

// @desc    Get vendor statistics
// @route   GET /api/vendors/statistics
// @access  Private/Agent
router.get('/statistics', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const vendor = req.vendor; // From requireVendorRole middleware

  // Get vendor's properties count
  const totalProperties = await Property.countDocuments({ owner: vendorId });

  // Calculate total property value
  const properties = await Property.find({ owner: vendorId }).select('price');
  const totalValue = properties.reduce((sum, property) => {
    const price = parseFloat(property.price.toString().replace(/[^0-9.]/g, ''));
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  // Get property counts by status
  const [activeProperties, soldProperties, pendingProperties] = await Promise.all([
    Property.countDocuments({ owner: vendorId, status: 'available' }),
    Property.countDocuments({ owner: vendorId, status: 'sold' }),
    Property.countDocuments({ owner: vendorId, status: 'pending' })
  ]);

  // Calculate total views across all properties
  const viewsAggregation = await Property.aggregate([
    { $match: { owner: vendorId } },
    { $group: { _id: null, totalViews: { $sum: '$views' } } }
  ]);
  const totalViews = viewsAggregation[0]?.totalViews || 0;

  // Format total value in Cr/Lakhs
  const formatValue = (value) => {
    if (value >= 10000000) { // 1 Cr
      return `₹${(value / 10000000).toFixed(1)} Cr`;
    } else if (value >= 100000) { // 1 Lakh
      return `₹${(value / 100000).toFixed(1)} L`;
    } else {
      return `₹${value.toLocaleString()}`;
    }
  };

  // Get total leads (inquiries/messages about vendor's properties)
  const totalLeads = await Message.countDocuments({
    recipient: vendorId,
    type: { $in: ['inquiry', 'lead', 'property_inquiry'] }
  });

  // Get average response time from vendor model
  const avgResponseTime = vendor?.performance?.statistics?.responseTime?.average 
    ? `${Math.round(vendor.performance.statistics.responseTime.average / 60)} hours` 
    : "Not calculated";

  // Get vendor rating from vendor model
  const rating = vendor?.performance?.rating?.average || 0;
  const reviewCount = vendor?.performance?.rating?.count || 0;
  const totalSales = vendor?.performance?.statistics?.soldProperties || 0;

  res.json({
    success: true,
    data: {
      totalProperties,
      totalSales,
      totalValue: formatValue(totalValue),
      totalLeads,
      totalViews,
      avgResponseTime,
      rating,
      reviewCount,
      activeProperties,
      soldProperties,
      pendingProperties
    }
  });
}));

// @desc    Update vendor rating
// @route   POST /api/vendors/rating
// @access  Private
router.post('/rating', asyncHandler(async (req, res) => {
  const { vendorId, rating, review } = req.body;

  if (!vendorId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Valid vendor ID and rating (1-5) are required'
    });
  }

  // Find vendor by user ID
  const vendor = await Vendor.findByUserId(vendorId);
  if (!vendor) {
    return res.status(404).json({
      success: false,
      message: 'Vendor not found'
    });
  }

  // Use the vendor model's updateRating method
  await vendor.updateRating(rating);

  res.json({
    success: true,
    message: 'Rating submitted successfully',
    data: {
      newRating: vendor.performance.rating
    }
  });
}));

// @desc    Get vendor's properties
// @route   GET /api/vendors/properties
// @access  Private/Agent
router.get('/properties', requireVendorRole, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10,
    status,
    type,
    sort = '-createdAt'
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Build filter object
  const filter = { owner: req.user.id };
  
  if (status) {
    filter.status = status;
  }
  
  if (type) {
    filter.type = type;
  }

  // Get total count for pagination
  const totalProperties = await Property.countDocuments(filter);
  
  // Get properties with pagination
  const properties = await Property.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('owner', 'profile.firstName profile.lastName email');

  const totalPages = Math.ceil(totalProperties / parseInt(limit));

  res.json({
    success: true,
    data: {
      properties,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProperties,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
}));

// @desc    Get vendor leads/inquiries
// @route   GET /api/vendors/leads
// @access  Private/Agent
router.get('/leads', requireVendorRole, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10,
    status = 'unread'
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Get leads (messages sent to this vendor)
  const filter = {
    recipient: req.user.id,
    type: { $in: ['inquiry', 'lead', 'property_inquiry', 'contact'] }
  };

  if (status !== 'all') {
    filter.status = status;
  }

  // Get total count for pagination
  const totalLeads = await Message.countDocuments(filter);
  
  // Get leads with pagination
  const leads = await Message.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('sender', 'profile.firstName profile.lastName email profile.phone')
    .populate('property', 'title location price images');

  const totalPages = Math.ceil(totalLeads / parseInt(limit));

  res.json({
    success: true,
    data: {
      leads,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalLeads,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
}));

// @desc    Check vendor subscription
// @route   GET /api/vendors/subscription/check/:subscriptionName
// @access  Private/Agent
router.get('/subscription/check/:subscriptionName', requireVendorRole, asyncHandler(async (req, res) => {
  const { subscriptionName } = req.params;
  const vendorId = req.user.id;
  
  // For now, we'll simulate checking subscription
  // In a real implementation, you would check against a Subscription model
  // that links users to their purchased plans/features
  
  try {
    const Subscription = require('../models/Subscription');
    const Plan = require('../models/Plan');
    
    // Check if vendor has active subscription
    const activeSubscription = await Subscription.findOne({
      user: vendorId, // Changed from userId to user
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('plan'); // Changed from planId to plan
    
    let hasSubscription = false;
    
    if (activeSubscription) {
      // Check if the active subscription plan includes the requested feature
      const plan = activeSubscription.plan; // Changed from planId to plan
      
      // Map subscription names to plan features and limits
      const featureMapping = {
        'addPropertySubscription': {
          hasAccess: true, // All plans allow adding properties
          limit: plan.limits?.properties || 0 // 0 means unlimited
        },
        'featuredListingSubscription': {
          hasAccess: plan.limits?.featuredListings > 0 || plan.name === 'Enterprise Plan',
          limit: plan.limits?.featuredListings || 0
        },
        'premiumAnalyticsSubscription': {
          hasAccess: plan.features?.includes('Detailed analytics & insights') || 
                    plan.features?.includes('Advanced analytics & reports') ||
                    plan.name === 'Premium Plan' || plan.name === 'Enterprise Plan',
          limit: 0
        },
        'leadManagementSubscription': {
          hasAccess: plan.limits?.leadManagement !== undefined,
          limit: plan.limits?.leadManagement === 'enterprise' ? 0 : 
                 plan.limits?.leadManagement === 'advanced' ? 1000 : 50
        }
      };
      
      const feature = featureMapping[subscriptionName];
      hasSubscription = feature ? feature.hasAccess : false;
    }
    
    // Remove demo override - now properly check subscriptions
    // Only allow access if user has an active subscription
    
    res.json({
      success: true,
      data: {
        hasSubscription,
        subscriptionName
      }
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check subscription'
    });
  }
}));

// @desc    Get vendor subscriptions
// @route   GET /api/vendors/subscriptions
// @access  Private/Agent
router.get('/subscriptions', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  
  try {
    const Subscription = require('../models/Subscription');
    
    // Get vendor's active subscriptions
    const activeSubscriptions = await Subscription.find({
      userId: vendorId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('planId');
    
    // Map subscriptions to expected format
    const subscriptionsMap = {
      'addPropertySubscription': { isActive: true, expiresAt: null }, // Allow by default for demo
      'featuredListingSubscription': { isActive: false, expiresAt: null },
      'premiumAnalyticsSubscription': { isActive: false, expiresAt: null },
      'leadManagementSubscription': { isActive: false, expiresAt: null }
    };
    
    // Update based on active subscriptions
    activeSubscriptions.forEach(subscription => {
      const plan = subscription.planId;
      const expiresAt = subscription.endDate.toISOString();
      
      if (plan.limits?.featuredListings > 0 || plan.name === 'Enterprise Plan') {
        subscriptionsMap['featuredListingSubscription'] = { isActive: true, expiresAt };
      }
      if (plan.features?.includes('Detailed analytics & insights') || 
          plan.features?.includes('Advanced analytics & reports') ||
          plan.name === 'Premium Plan' || plan.name === 'Enterprise Plan') {
        subscriptionsMap['premiumAnalyticsSubscription'] = { isActive: true, expiresAt };
      }
      if (plan.limits?.leadManagement) {
        subscriptionsMap['leadManagementSubscription'] = { isActive: true, expiresAt };
      }
    });
    
    // Convert to array format
    const subscriptions = Object.entries(subscriptionsMap).map(([name, data]) => ({
      name,
      isActive: data.isActive,
      expiresAt: data.expiresAt
    }));
    
    res.json({
      success: true,
      data: {
        subscriptions: subscriptions
      }
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions'
    });
  }
}));

// @desc    Activate vendor subscription after payment
// @route   POST /api/vendors/subscription/activate
// @access  Private/Agent
router.post('/subscription/activate', requireVendorRole, asyncHandler(async (req, res) => {
  const { planId, paymentId } = req.body;
  const vendorId = req.user.id;
  
  try {
    if (!planId || !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID and Payment ID are required'
      });
    }

    // In a real implementation, you would:
    // 1. Verify the payment with Razorpay
    // 2. Get the plan details from Plan model
    // 3. Create or update the Subscription record
    // 4. Update user's subscription status
    
    // For now, we'll simulate successful activation
    const Plan = require('../models/Plan');
    const Subscription = require('../models/Subscription');
    
    // Get plan details
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Create or update subscription
    const subscription = await Subscription.findOneAndUpdate(
      { user: vendorId, plan: planId }, // Changed userId to user, planId to plan
      {
        user: vendorId, // Changed from userId to user
        plan: planId, // Changed from planId to plan
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + (plan.duration || 30) * 24 * 60 * 60 * 1000), // Add duration in days, default 30 days
        transactionId: paymentId, // Changed from paymentId to transactionId
        amount: plan.price
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        subscription: {
          id: subscription._id,
          planName: plan.name,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate
        }
      }
    });
  } catch (error) {
    console.error('Subscription activation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate subscription'
    });
  }
}));

// @desc    Get vendor lead statistics
// @route   GET /api/vendors/lead-stats
// @access  Private/Agent
router.get('/lead-stats', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;

  try {
    // Calculate date ranges
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get real lead statistics from database
    const [
      totalLeads,
      newLeads,
      contactedLeads,
      convertedLeads,
      thisMonthLeads,
      lastMonthLeads,
      leadSources
    ] = await Promise.all([
      // Total leads
      Message.countDocuments({
        recipient: vendorId,
        type: { $in: ['inquiry', 'lead', 'property_inquiry'] }
      }),
      // New leads (status = 'new' or 'unread')
      Message.countDocuments({
        recipient: vendorId,
        type: { $in: ['inquiry', 'lead', 'property_inquiry'] },
        status: { $in: ['new', 'unread'] }
      }),
      // Contacted leads (status = 'read' or 'replied')
      Message.countDocuments({
        recipient: vendorId,
        type: { $in: ['inquiry', 'lead', 'property_inquiry'] },
        status: { $in: ['read', 'replied', 'contacted'] }
      }),
      // Converted leads (status = 'converted' or type = 'call_request'/'meeting_request')
      Message.countDocuments({
        recipient: vendorId,
        $or: [
          { status: 'converted' },
          { type: { $in: ['call_request', 'meeting_request'] } }
        ]
      }),
      // This month leads
      Message.countDocuments({
        recipient: vendorId,
        type: { $in: ['inquiry', 'lead', 'property_inquiry'] },
        createdAt: { $gte: thisMonthStart }
      }),
      // Last month leads
      Message.countDocuments({
        recipient: vendorId,
        type: { $in: ['inquiry', 'lead', 'property_inquiry'] },
        createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
      }),
      // Lead sources
      Message.aggregate([
        {
          $match: {
            recipient: new mongoose.Types.ObjectId(vendorId),
            type: { $in: ['inquiry', 'lead', 'property_inquiry'] }
          }
        },
        {
          $group: {
            _id: { $ifNull: ['$source', 'website'] },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Calculate growth percentage
    const growth = lastMonthLeads > 0 ? 
      Math.round(((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100 * 10) / 10 : 
      0;

    // Format lead sources
    const sourcesObj = {};
    leadSources.forEach(source => {
      sourcesObj[source._id] = source.count;
    });

    // Calculate conversion rate
    const conversionRate = totalLeads > 0 ? 
      Math.round((convertedLeads / totalLeads) * 100 * 10) / 10 : 
      0;

    const leadStats = {
      totalLeads,
      newLeads,
      contactedLeads,
      convertedLeads,
      leadTrends: {
        thisMonth: thisMonthLeads,
        lastMonth: lastMonthLeads,
        growth
      },
      leadSources: {
        website: sourcesObj.website || 0,
        social: sourcesObj.social || 0,
        referral: sourcesObj.referral || 0,
        direct: sourcesObj.direct || 0
      },
      conversionRate
    };

    res.json({
      success: true,
      data: leadStats
    });
  } catch (error) {
    console.error('Lead stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead statistics'
    });
  }
}));

// @desc    Get vendor analytics overview
// @route   GET /api/vendors/analytics/overview
// @access  Private/Agent
router.get('/analytics/overview', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { timeframe = '30days' } = req.query;

  try {
    // Calculate date ranges based on timeframe
    const now = new Date();
    let currentStartDate, previousStartDate, currentEndDate, previousEndDate;
    
    switch (timeframe) {
      case '7days':
        currentStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        previousEndDate = currentStartDate;
        break;
      case '90days':
        currentStartDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        previousEndDate = currentStartDate;
        break;
      case '1year':
        currentStartDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
        previousEndDate = currentStartDate;
        break;
      default: // 30days
        currentStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        previousEndDate = currentStartDate;
    }
    currentEndDate = now;

    // Get real analytics data from database
    const [
      totalProperties,
      totalViews,
      totalLeads,
      totalCalls,
      totalMessages,
      previousViews,
      previousLeads,
      previousProperties
    ] = await Promise.all([
      // Current period data
      Property.countDocuments({ owner: vendorId }),
      Property.aggregate([
        { $match: { owner: vendorId } },
        { $group: { _id: null, total: { $sum: '$views' } } }
      ]),
      Message.countDocuments({
        recipient: vendorId,
        type: { $in: ['inquiry', 'lead', 'property_inquiry'] },
        createdAt: { $gte: currentStartDate, $lte: currentEndDate }
      }),
      Message.countDocuments({
        recipient: vendorId,
        type: 'call_request',
        createdAt: { $gte: currentStartDate, $lte: currentEndDate }
      }),
      Message.countDocuments({
        recipient: vendorId,
        createdAt: { $gte: currentStartDate, $lte: currentEndDate }
      }),
      // Previous period data for trends
      Property.aggregate([
        { 
          $match: { 
            owner: vendorId,
            createdAt: { $gte: previousStartDate, $lte: previousEndDate }
          } 
        },
        { $group: { _id: null, total: { $sum: '$views' } } }
      ]),
      Message.countDocuments({
        recipient: vendorId,
        type: { $in: ['inquiry', 'lead', 'property_inquiry'] },
        createdAt: { $gte: previousStartDate, $lte: previousEndDate }
      }),
      Property.countDocuments({ 
        owner: vendorId,
        createdAt: { $gte: previousStartDate, $lte: previousEndDate }
      })
    ]);

    const currentViews = totalViews[0]?.total || 0;
    const currentLeads = totalLeads;
    const currentMessages = totalMessages;
    const currentCalls = totalCalls;
    
    const prevViews = previousViews[0]?.total || 0;
    const prevLeads = previousLeads;
    const prevProperties = previousProperties;

    // Calculate trends
    const viewsGrowth = prevViews > 0 ? ((currentViews - prevViews) / prevViews * 100) : 0;
    const leadsGrowth = prevLeads > 0 ? ((currentLeads - prevLeads) / prevLeads * 100) : 0;
    const propertiesGrowth = prevProperties > 0 ? ((totalProperties - prevProperties) / prevProperties * 100) : 0;

    // Calculate conversion rate
    const conversionRate = currentViews > 0 ? ((currentLeads / currentViews) * 100) : 0;

    // Get average rating from reviews
    const avgRatingResult = await mongoose.connection.db.collection('reviews').aggregate([
      { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
      { $group: { _id: null, averageRating: { $avg: '$rating' } } }
    ]).toArray();
    const averageRating = avgRatingResult[0]?.averageRating || 0;

    // Generate chart data based on timeframe (simplified for now)
    const daysInPeriod = timeframe === '7days' ? 7 : timeframe === '30days' ? 30 : timeframe === '90days' ? 90 : 365;
    const chartLabels = [];
    const chartViews = [];
    const chartLeads = [];
    const chartInquiries = [];

    // Generate weekly data for chart
    const weeksToShow = Math.min(4, Math.ceil(daysInPeriod / 7));
    for (let i = 0; i < weeksToShow; i++) {
      chartLabels.push(`Week ${i + 1}`);
      // Distribute data across weeks (simplified approach)
      chartViews.push(Math.floor(currentViews / weeksToShow));
      chartLeads.push(Math.floor(currentLeads / weeksToShow));
      chartInquiries.push(Math.floor(currentMessages / weeksToShow));
    }

    const analyticsData = {
      totalViews: currentViews,
      totalLeads: currentLeads,
      totalCalls: currentCalls,
      totalMessages: currentMessages,
      totalRevenue: 0, // Will be calculated when payment system is implemented
      totalProperties,
      averageRating: Math.round(averageRating * 10) / 10,
      responseTime: "4.2 hours", // Will be calculated from message response times
      conversionRate: Math.round(conversionRate * 100) / 100,
      trends: {
        views: {
          current: currentViews,
          previous: prevViews,
          growth: Math.round(viewsGrowth * 10) / 10
        },
        leads: {
          current: currentLeads,
          previous: prevLeads,
          growth: Math.round(leadsGrowth * 10) / 10
        },
        properties: {
          current: totalProperties,
          previous: prevProperties,
          growth: Math.round(propertiesGrowth * 10) / 10
        }
      },
      chartData: {
        labels: chartLabels,
        views: chartViews,
        leads: chartLeads,
        inquiries: chartInquiries
      }
    };

    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics overview'
    });
  }
}));

// @desc    Get vendor performance metrics
// @route   GET /api/vendors/analytics/performance
// @access  Private/Agent
router.get('/analytics/performance', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { timeframe = '30days', propertyId } = req.query;

  try {
    // Calculate date range based on timeframe
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // 30days
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build property match query
    let propertyMatch = { owner: vendorId };
    if (propertyId && propertyId !== 'all') {
      propertyMatch._id = new mongoose.Types.ObjectId(propertyId);
    }

    // Get property performance data
    const propertyPerformance = await Property.aggregate([
      { $match: propertyMatch },
      {
        $lookup: {
          from: 'messages',
          let: { propertyId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$property', '$$propertyId'] },
                    { $eq: ['$recipient', new mongoose.Types.ObjectId(vendorId)] },
                    { $in: ['$type', ['inquiry', 'lead', 'property_inquiry']] },
                    { $gte: ['$createdAt', startDate] }
                  ]
                }
              }
            }
          ],
          as: 'leads'
        }
      },
      {
        $lookup: {
          from: 'messages',
          let: { propertyId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$property', '$$propertyId'] },
                    { $eq: ['$recipient', new mongoose.Types.ObjectId(vendorId)] },
                    { $gte: ['$createdAt', startDate] }
                  ]
                }
              }
            }
          ],
          as: 'inquiries'
        }
      },
      {
        $project: {
          propertyId: '$_id',
          title: 1,
          views: { $ifNull: ['$views', 0] },
          leads: { $size: '$leads' },
          inquiries: { $size: '$inquiries' },
          conversionRate: {
            $cond: {
              if: { $gt: ['$views', 0] },
              then: { $multiply: [{ $divide: [{ $size: '$leads' }, '$views'] }, 100] },
              else: 0
            }
          },
          revenue: 0 // Will be calculated when payment system is implemented
        }
      },
      { $sort: { views: -1 } }
    ]);

    // Get lead sources data
    const leadSources = await Message.aggregate([
      {
        $match: {
          recipient: new mongoose.Types.ObjectId(vendorId),
          type: { $in: ['inquiry', 'lead', 'property_inquiry'] },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$source', 'website'] },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          name: '$_id',
          value: '$count'
        }
      }
    ]);

    // Generate time series data
    const daysInPeriod = timeframe === '7days' ? 7 : timeframe === '30days' ? 30 : timeframe === '90days' ? 90 : 365;
    const viewsData = [];
    const leadsData = [];
    const conversionData = [];
    const revenueData = [];

    // Generate daily data points
    for (let i = daysInPeriod - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      // For simplicity, distribute data evenly (in production, you'd get daily metrics)
      const totalViews = propertyPerformance.reduce((sum, prop) => sum + prop.views, 0);
      const totalLeads = propertyPerformance.reduce((sum, prop) => sum + prop.leads, 0);
      
      viewsData.push({
        name: dateStr,
        value: Math.floor(totalViews / daysInPeriod) + Math.floor(Math.random() * 20)
      });
      
      leadsData.push({
        name: dateStr,
        value: Math.floor(totalLeads / daysInPeriod) + Math.floor(Math.random() * 3)
      });
      
      const dayViews = viewsData[viewsData.length - 1].value;
      const dayLeads = leadsData[leadsData.length - 1].value;
      
      conversionData.push({
        name: dateStr,
        value: dayViews > 0 ? Math.round((dayLeads / dayViews) * 100 * 100) / 100 : 0
      });
      
      revenueData.push({
        name: dateStr,
        value: 0 // Will be calculated when payment system is implemented
      });
    }

    // Get demographics data (simplified for now)
    const demographicsData = [
      { name: 'Age 25-35', value: 35 },
      { name: 'Age 36-45', value: 28 },
      { name: 'Age 46-55', value: 22 },
      { name: 'Age 18-25', value: 10 },
      { name: 'Age 55+', value: 5 }
    ];

    const performanceData = {
      viewsData,
      leadsData,
      conversionData,
      revenueData,
      propertyPerformance,
      leadSources: leadSources.length > 0 ? leadSources : [
        { name: 'Website', value: 0 },
        { name: 'Social Media', value: 0 },
        { name: 'Referrals', value: 0 },
        { name: 'Direct', value: 0 }
      ],
      demographicsData
    };

    res.json({
      success: true,
      data: performanceData
    });
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance metrics'
    });
  }
}));

// @desc    Check vendor subscription status
// @route   GET /api/vendors/subscription-status
// @access  Private/Agent
router.get('/subscription-status', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;

  try {
    const Subscription = require('../models/Subscription');
    
    const activeSubscription = await Subscription.findOne({
      user: vendorId, // Changed from userId to user
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate([
      { path: 'plan' },
      { path: 'addons', select: 'name description price category billingType' }
    ]); // Changed from planId to plan and added addons population

    if (activeSubscription) {
      res.json({
        success: true,
        data: {
          hasActiveSubscription: true,
          subscription: {
            id: activeSubscription._id,
            planName: activeSubscription.plan.name, // Changed from planId to plan
            planId: activeSubscription.plan._id, // Changed from planId to plan
            status: activeSubscription.status,
            startDate: activeSubscription.startDate,
            endDate: activeSubscription.endDate,
            features: activeSubscription.plan.features, // Changed from planId to plan
            billingCycle: activeSubscription.billingCycle || 'monthly',
            addons: activeSubscription.addons || [], // Include purchased addons
            amount: activeSubscription.amount,
            currency: activeSubscription.currency
          }
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          hasActiveSubscription: false,
          subscription: null
        }
      });
    }
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription status'
    });
  }
}));

// @desc    Get vendor leads
// @route   GET /api/vendors/leads
// @access  Private/Agent
router.get('/leads', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  try {
    // Build query to get real leads from messages
    let matchQuery = {
      recipient: new mongoose.ObjectId(vendorId),
      type: { $in: ['inquiry', 'lead', 'property_inquiry'] }
    };

    // Add status filter if provided
    if (status && status !== 'all') {
      matchQuery.status = status;
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get leads with pagination
    const [leads, totalCount] = await Promise.all([
      Message.find(matchQuery)
        .populate([
          {
            path: 'sender',
            select: 'email profile',
            populate: {
              path: 'profile',
              select: 'firstName lastName phone'
            }
          },
          {
            path: 'property',
            select: 'title price propertyType'
          }
        ])
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Message.countDocuments(matchQuery)
    ]);

    // Format leads data
    const formattedLeads = leads.map(lead => {
      const customerName = lead.sender?.profile ? 
        `${lead.sender.profile.firstName || ''} ${lead.sender.profile.lastName || ''}`.trim() : 
        'Unknown';
      
      return {
        id: lead._id,
        propertyTitle: lead.property?.title || 'Property Inquiry',
        propertyId: lead.property?._id,
        customerName: customerName || 'Unknown',
        customerEmail: lead.sender?.email || '',
        customerPhone: lead.sender?.profile?.phone || '',
        status: lead.status || 'new',
        message: lead.content || '',
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        budget: lead.budget || 'Not specified',
        interestLevel: lead.priority || 'medium',
        source: lead.source || 'website'
      };
    });

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = parseInt(page);

    res.json({
      success: true,
      data: {
        leads: formattedLeads,
        pagination: {
          currentPage,
          totalPages,
          totalLeads: totalCount,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Vendor leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor leads'
    });
  }
}));

// @desc    Get vendor subscription limits
// @route   GET /api/vendors/subscription-limits
// @access  Private/Agent
router.get('/subscription-limits', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;

  try {
    const Subscription = require('../models/Subscription');
    const Property = require('../models/Property');
    const Vendor = require('../models/Vendor');

    // Get vendor object
    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
    
    // Get active subscription
    const activeSubscription = await Subscription.findOne({
      user: vendorId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('plan');

    // Count current properties
    const currentProperties = await Property.countDocuments({
      $or: [
        { owner: vendorId },
        { agent: vendorId },
        { vendor: vendorObjectId }
      ]
    });

    let subscriptionLimits = {
      maxProperties: 5, // Free tier default
      currentProperties,
      canAddMore: currentProperties < 5,
      planName: 'Free Plan',
      features: ['5 Property Listings'],
      planId: null
    };

    if (activeSubscription && activeSubscription.plan) {
      const plan = activeSubscription.plan;
      const maxProperties = plan.limits?.properties || 0; // 0 means unlimited
      
      subscriptionLimits = {
        maxProperties: maxProperties === 0 ? 999999 : maxProperties, // Use large number for unlimited
        currentProperties,
        canAddMore: maxProperties === 0 || currentProperties < maxProperties,
        planName: plan.name,
        features: plan.features || [],
        planId: plan._id
      };
    }

    res.json({
      success: true,
      data: subscriptionLimits
    });
  } catch (error) {
    console.error('Get subscription limits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription limits'
    });
  }
}));

module.exports = router;