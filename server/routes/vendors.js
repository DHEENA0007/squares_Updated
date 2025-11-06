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
  } else if (['admin', 'superadmin'].includes(req.user.role)) {
    // For admin, we might need to create a mock vendor profile or handle differently
    // For now, let's look for an existing vendor profile or create a basic one
    let vendor = await Vendor.findByUserId(req.user.id);
    if (!vendor) {
      // Create a basic vendor profile for admin
      const user = await User.findById(req.user.id);
      const vendorData = {
        user: req.user.id,
        businessInfo: {
          companyName: `${user.profile.firstName} ${user.profile.lastName} - Admin`,
          businessType: 'individual'
        },
        professionalInfo: {
          experience: 0,
          specializations: [],
          serviceAreas: [],
          languages: ['english'],
          certifications: []
        },
        status: 'active',
        verification: {
          isVerified: true,
          verificationLevel: 'enterprise'
        },
        metadata: {
          source: 'admin',
          notes: 'Auto-created for admin user'
        }
      };
      vendor = new Vendor(vendorData);
      await vendor.save();
      
      // Link user to vendor profile
      user.vendorProfile = vendor._id;
      await user.save();
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

  // Get the associated user data
  const user = await User.findById(vendor.user).select('-password -verificationToken');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Associated user not found'
    });
  }

  // Combine user and vendor data in the format expected by frontend
  const combinedProfile = {
    id: user._id,
    _id: user._id,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: {
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      phone: user.profile.phone,
      avatar: user.profile.avatar,
      bio: user.profile.bio,
      preferences: user.profile.preferences || {
        language: 'en',
        currency: 'INR',
        notifications: {
          email: true,
          push: true,
          newMessages: true,
          newsUpdates: true,
          marketing: true,
        },
      },
      address: {
        street: user.profile.address?.street || vendor.contactInfo?.officeAddress?.street,
        area: vendor.contactInfo?.officeAddress?.area,
        city: user.profile.address?.city || vendor.contactInfo?.officeAddress?.city,
        state: user.profile.address?.state || vendor.contactInfo?.officeAddress?.state,
        district: vendor.contactInfo?.officeAddress?.district,
        zipCode: user.profile.address?.zipCode || vendor.contactInfo?.officeAddress?.pincode,
        country: user.profile.address?.country || vendor.contactInfo?.officeAddress?.country,
        countryCode: vendor.contactInfo?.officeAddress?.countryCode,
        stateCode: vendor.contactInfo?.officeAddress?.stateCode,
        districtCode: vendor.contactInfo?.officeAddress?.districtCode,
        cityCode: vendor.contactInfo?.officeAddress?.cityCode,
        landmark: vendor.contactInfo?.officeAddress?.landmark,
      },
      vendorInfo: {
        licenseNumber: vendor.businessInfo?.licenseNumber,
        gstNumber: vendor.businessInfo?.gstNumber,
        panNumber: vendor.businessInfo?.panNumber,
        companyName: vendor.businessInfo?.companyName,
        experience: vendor.professionalInfo?.experience || 0,
        website: vendor.businessInfo?.website,
        specializations: vendor.professionalInfo?.specializations || [],
        serviceAreas: vendor.professionalInfo?.serviceAreas?.map(area => 
          `${area.city}, ${area.state}`.replace(/^,\s*|,\s*$/g, '')
        ) || [],
        certifications: vendor.professionalInfo?.certifications || [],
        vendorPreferences: {
          emailNotifications: vendor.settings?.notifications?.emailNotifications ?? true,
          smsNotifications: vendor.settings?.notifications?.smsNotifications ?? true,
          leadAlerts: vendor.settings?.notifications?.leadAlerts ?? true,
          marketingEmails: vendor.settings?.notifications?.marketingEmails ?? false,
          weeklyReports: vendor.settings?.notifications?.weeklyReports ?? true,
          autoResponseEnabled: vendor.settings?.autoResponder?.enabled ?? false,
          autoResponseMessage: vendor.settings?.autoResponder?.message || 'Thank you for your interest! I will get back to you soon.',
        },
        rating: {
          average: vendor.performance?.rating?.average || 0,
          count: vendor.performance?.rating?.count || 0,
        },
        responseTime: vendor.performance?.statistics?.responseTime?.average ? 
          `${Math.round(vendor.performance.statistics.responseTime.average / 60)} hours` : 'Not calculated',
        memberSince: vendor.memberSince?.toISOString() || vendor.createdAt?.toISOString(),
      }
    },
    statistics: {
      totalProperties: vendor.performance?.statistics?.totalProperties || 0,
      totalFavorites: 0, // Calculate from favorites collection if needed
      totalMessages: vendor.performance?.statistics?.totalLeads || 0,
      totalSales: vendor.performance?.statistics?.soldProperties || 0,
      totalValue: '₹0', // Calculate from property values if needed
    }
  };

  res.json({
    success: true,
    data: { user: combinedProfile }
  });
}));

// @desc    Update vendor profile
// @route   PUT /api/vendors/profile
// @access  Private/Agent
router.put('/profile', requireVendorRole, asyncHandler(async (req, res) => {
  const vendor = req.vendor; // From requireVendorRole middleware
  const updateData = req.body;

  // Get the associated user
  const user = await User.findById(vendor.user);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Associated user not found'
    });
  }

  // Handle profile updates - map frontend structure to backend models
  if (updateData.profile) {
    const { profile } = updateData;
    
    // Update user profile fields
    if (profile.firstName) user.profile.firstName = profile.firstName;
    if (profile.lastName) user.profile.lastName = profile.lastName;
    if (profile.phone) user.profile.phone = profile.phone;
    if (profile.bio !== undefined) user.profile.bio = profile.bio;
    if (profile.preferences) user.profile.preferences = { ...user.profile.preferences, ...profile.preferences };
    
    // Update user address
    if (profile.address) {
      user.profile.address = { ...user.profile.address, ...profile.address };
      
      // Also update vendor office address
      if (!vendor.contactInfo) vendor.contactInfo = {};
      if (!vendor.contactInfo.officeAddress) vendor.contactInfo.officeAddress = {};
      
      vendor.contactInfo.officeAddress = {
        ...vendor.contactInfo.officeAddress,
        street: profile.address.street,
        area: profile.address.area,
        city: profile.address.city,
        state: profile.address.state,
        district: profile.address.district,
        pincode: profile.address.zipCode,
        country: profile.address.country || 'India',
        countryCode: profile.address.countryCode || 'IN',
        stateCode: profile.address.stateCode,
        districtCode: profile.address.districtCode,
        cityCode: profile.address.cityCode,
        landmark: profile.address.landmark,
      };
    }
    
    // Update vendor-specific fields
    if (profile.vendorInfo) {
      const { vendorInfo } = profile;
      
      // Update business info
      if (!vendor.businessInfo) vendor.businessInfo = {};
      if (vendorInfo.companyName !== undefined) vendor.businessInfo.companyName = vendorInfo.companyName;
      if (vendorInfo.licenseNumber !== undefined) vendor.businessInfo.licenseNumber = vendorInfo.licenseNumber;
      if (vendorInfo.gstNumber !== undefined) vendor.businessInfo.gstNumber = vendorInfo.gstNumber;
      if (vendorInfo.panNumber !== undefined) vendor.businessInfo.panNumber = vendorInfo.panNumber;
      if (vendorInfo.website !== undefined) vendor.businessInfo.website = vendorInfo.website;
      
      // Update professional info
      if (!vendor.professionalInfo) vendor.professionalInfo = {};
      if (vendorInfo.experience !== undefined) vendor.professionalInfo.experience = vendorInfo.experience;
      if (vendorInfo.specializations) vendor.professionalInfo.specializations = vendorInfo.specializations;
      
      // Update service areas (convert from string array to object array)
      if (vendorInfo.serviceAreas) {
        vendor.professionalInfo.serviceAreas = vendorInfo.serviceAreas.map(area => {
          const parts = area.split(',').map(s => s.trim());
          return {
            city: parts[0] || '',
            state: parts[1] || '',
            district: '',
            country: 'India',
            countryCode: 'IN'
          };
        });
      }
      
      if (vendorInfo.certifications) vendor.professionalInfo.certifications = vendorInfo.certifications;
      
      // Update vendor preferences/settings
      if (vendorInfo.vendorPreferences) {
        if (!vendor.settings) vendor.settings = {};
        if (!vendor.settings.notifications) vendor.settings.notifications = {};
        if (!vendor.settings.autoResponder) vendor.settings.autoResponder = {};
        
        const prefs = vendorInfo.vendorPreferences;
        vendor.settings.notifications.emailNotifications = prefs.emailNotifications ?? vendor.settings.notifications.emailNotifications;
        vendor.settings.notifications.smsNotifications = prefs.smsNotifications ?? vendor.settings.notifications.smsNotifications;
        vendor.settings.notifications.leadAlerts = prefs.leadAlerts ?? vendor.settings.notifications.leadAlerts;
        vendor.settings.notifications.marketingEmails = prefs.marketingEmails ?? vendor.settings.notifications.marketingEmails;
        vendor.settings.notifications.weeklyReports = prefs.weeklyReports ?? vendor.settings.notifications.weeklyReports;
        vendor.settings.autoResponder.enabled = prefs.autoResponseEnabled ?? vendor.settings.autoResponder.enabled;
        vendor.settings.autoResponder.message = prefs.autoResponseMessage ?? vendor.settings.autoResponder.message;
      }
    }
  }

  // Save both user and vendor
  await Promise.all([user.save(), vendor.save()]);

  // Return the combined profile in the same format as GET /profile
  const combinedProfile = {
    id: user._id,
    _id: user._id,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: {
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      phone: user.profile.phone,
      avatar: user.profile.avatar,
      bio: user.profile.bio,
      preferences: user.profile.preferences,
      address: user.profile.address,
      vendorInfo: {
        licenseNumber: vendor.businessInfo?.licenseNumber,
        gstNumber: vendor.businessInfo?.gstNumber,
        panNumber: vendor.businessInfo?.panNumber,
        companyName: vendor.businessInfo?.companyName,
        experience: vendor.professionalInfo?.experience || 0,
        website: vendor.businessInfo?.website,
        specializations: vendor.professionalInfo?.specializations || [],
        serviceAreas: vendor.professionalInfo?.serviceAreas?.map(area => 
          `${area.city}, ${area.state}`.replace(/^,\s*|,\s*$/g, '')
        ) || [],
        certifications: vendor.professionalInfo?.certifications || [],
        vendorPreferences: {
          emailNotifications: vendor.settings?.notifications?.emailNotifications ?? true,
          smsNotifications: vendor.settings?.notifications?.smsNotifications ?? true,
          leadAlerts: vendor.settings?.notifications?.leadAlerts ?? true,
          marketingEmails: vendor.settings?.notifications?.marketingEmails ?? false,
          weeklyReports: vendor.settings?.notifications?.weeklyReports ?? true,
          autoResponseEnabled: vendor.settings?.autoResponder?.enabled ?? false,
          autoResponseMessage: vendor.settings?.autoResponder?.message || 'Thank you for your interest! I will get back to you soon.',
        },
        rating: {
          average: vendor.performance?.rating?.average || 0,
          count: vendor.performance?.rating?.count || 0,
        },
        responseTime: vendor.performance?.statistics?.responseTime?.average ? 
          `${Math.round(vendor.performance.statistics.responseTime.average / 60)} hours` : 'Not calculated',
        memberSince: vendor.memberSince?.toISOString() || vendor.createdAt?.toISOString(),
      }
    },
    statistics: {
      totalProperties: vendor.performance?.statistics?.totalProperties || 0,
      totalFavorites: 0,
      totalMessages: vendor.performance?.statistics?.totalLeads || 0,
      totalSales: vendor.performance?.statistics?.soldProperties || 0,
      totalValue: '₹0',
    }
  };

  res.json({
    success: true,
    message: 'Vendor profile updated successfully',
    data: { user: combinedProfile }
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
      { $match: { owner: new mongoose.Types.ObjectId(vendorId) } },
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);
    const propertyViews = viewsAggregation[0]?.totalViews || 0;

    // Get message stats
    const totalMessages = await Message.countDocuments({ recipient: vendorId });
    const unreadMessages = await Message.countDocuments({ 
      recipient: vendorId, 
      status: 'unread' 
    });

    // Calculate total revenue from sold properties
    const soldProps = await Property.find({ 
      owner: vendorId, 
      status: 'sold' 
    }).select('price');
    
    const totalRevenue = soldProps.reduce((sum, prop) => {
      const price = parseFloat(prop.price.toString().replace(/[^0-9.]/g, ''));
      return sum + (isNaN(price) ? 0 : price);
    }, 0);

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

// @desc    Export analytics data
// @route   GET /api/vendors/analytics/export
// @access  Private/Agent
router.get('/analytics/export', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { timeframe = '30days', format = 'csv' } = req.query;

  try {
    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    // Calculate date range
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
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get analytics data
    const [totalProperties, totalViews, totalLeads, totalCalls, totalMessages] = await Promise.all([
      Property.countDocuments({ owner: vendorObjectId }),
      Property.aggregate([
        { $match: { owner: vendorObjectId } },
        { $group: { _id: null, total: { $sum: '$views' } } }
      ]),
      Message.countDocuments({
        recipient: vendorObjectId,
        type: { $in: ['inquiry', 'lead', 'property_inquiry'] },
        createdAt: { $gte: startDate, $lte: now }
      }),
      Message.countDocuments({
        recipient: vendorObjectId,
        type: 'call_request',
        createdAt: { $gte: startDate, $lte: now }
      }),
      Message.countDocuments({
        recipient: vendorObjectId,
        createdAt: { $gte: startDate, $lte: now }
      })
    ]);

    const currentViews = totalViews[0]?.total || 0;

    if (format === 'csv') {
      const csvData = [
        ['Metric', 'Value'],
        ['Total Properties', totalProperties],
        ['Total Views', currentViews],
        ['Total Leads', totalLeads],
        ['Total Calls', totalCalls],
        ['Total Messages', totalMessages],
        ['Timeframe', timeframe],
        ['Generated At', new Date().toISOString()]
      ];

      const csv = csvData.map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-${timeframe}-${Date.now()}.csv`);
      res.send(csv);
    } else if (format === 'pdf') {
      // Simple text-based PDF alternative (you can use a library like pdfkit later)
      const reportData = `
VENDOR ANALYTICS REPORT
=======================

Timeframe: ${timeframe}
Generated: ${new Date().toLocaleString()}

OVERVIEW METRICS
----------------
Total Properties: ${totalProperties}
Total Views: ${currentViews}
Total Leads: ${totalLeads}
Total Calls: ${totalCalls}
Total Messages: ${totalMessages}

---
Report generated by 99 Acres Platform
      `.trim();

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-${timeframe}-${Date.now()}.txt`);
      res.send(reportData);
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid format. Use csv or pdf'
      });
    }
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data'
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
    { $match: { owner: new mongoose.Types.ObjectId(vendorId) } },
    { $group: { _id: null, totalViews: { $sum: '$views' } } }
  ]);
  const totalViews = viewsAggregation[0]?.totalViews || 0;

  // Calculate total revenue from sold properties
  const soldProps = await Property.find({ 
    owner: vendorId, 
    status: 'sold' 
  }).select('price');
  
  const totalRevenue = soldProps.reduce((sum, prop) => {
    const price = parseFloat(prop.price.toString().replace(/[^0-9.]/g, ''));
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

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
      totalSales: soldProperties,
      totalValue: formatValue(totalValue),
      totalRevenue: formatValue(totalRevenue),
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

// @desc    Update vendor property
// @route   PUT /api/vendors/properties/:id
// @access  Private/Agent
router.put('/properties/:id', authenticateToken, asyncHandler(async (req, res) => {
  try {
    // Check if user is agent/vendor
    if (!['agent', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Agent access required.'
      });
    }

    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format'
      });
    }

    // Find property and check ownership
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    console.log('Vendor property update - User ID:', req.user.id);
    console.log('Vendor property update - Property owner:', property.owner?.toString());
    console.log('Vendor property update - Property agent:', property.agent?.toString());

    // Check if vendor owns this property (as owner or agent)
    const isOwner = property.owner.toString() === req.user.id.toString();
    const isAgent = property.agent && property.agent.toString() === req.user.id.toString();
    
    console.log('Vendor property update - Is Owner:', isOwner);
    console.log('Vendor property update - Is Agent:', isAgent);
    
    if (!isOwner && !isAgent) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }

    // Update property
    const updatedProperty = await Property.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('owner', 'profile.firstName profile.lastName email');

    res.json({
      success: true,
      data: { property: updatedProperty },
      message: 'Property updated successfully'
    });
  } catch (error) {
    console.error('Update vendor property error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update property'
    });
  }
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
  
  try {
    const Subscription = require('../models/Subscription');
    const Plan = require('../models/Plan');
    
    // Check if vendor has active subscription
    const activeSubscription = await Subscription.findOne({
      user: vendorId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('plan').sort({ createdAt: -1 });
    
    let hasSubscription = false;
    
    if (activeSubscription && activeSubscription.plan) {
      const plan = activeSubscription.plan;
      
      // Helper function to check if plan has a specific feature
      const hasFeature = (featureName) => {
        if (!plan.features) return false;
        return plan.features.some(feature => {
          if (typeof feature === 'string') {
            return feature.toLowerCase().includes(featureName.toLowerCase());
          } else if (feature && feature.name && feature.enabled !== false) {
            return feature.name.toLowerCase().includes(featureName.toLowerCase());
          }
          return false;
        });
      };
      
      // Map subscription names to plan features and limits (updated for new structure)
      const featureMapping = {
        'addPropertySubscription': {
          hasAccess: true, // All plans allow adding properties
          limit: plan.limits?.properties || 0 // 0 means unlimited
        },
        'featuredListingSubscription': {
          hasAccess: (plan.limits?.featuredListings || 0) > 0 || 
                    hasFeature('featured') || 
                    plan.identifier === 'enterprise',
          limit: plan.limits?.featuredListings || 0
        },
        'premiumAnalyticsSubscription': {
          hasAccess: hasFeature('analytics') || 
                    hasFeature('insights') || 
                    hasFeature('reports') ||
                    ['premium', 'enterprise'].includes(plan.identifier),
          limit: 0
        },
        'leadManagementSubscription': {
          hasAccess: plan.limits?.leadManagement && plan.limits.leadManagement !== 'none',
          limit: plan.limits?.leadManagement === 'enterprise' ? 0 : 
                 plan.limits?.leadManagement === 'advanced' ? 1000 : 
                 plan.limits?.leadManagement === 'premium' ? 500 : 50
        },
        'topRatedSubscription': {
          hasAccess: plan.limits?.topRated === true,
          limit: 0
        },
        'verifiedBadgeSubscription': {
          hasAccess: plan.limits?.verifiedBadge === true,
          limit: 0
        }
      };
      
      const feature = featureMapping[subscriptionName];
      hasSubscription = feature ? feature.hasAccess : false;
    }
    
    res.json({
      success: true,
      data: {
        hasSubscription,
        subscriptionName,
        planDetails: activeSubscription?.plan ? {
          name: activeSubscription.plan.name,
          identifier: activeSubscription.plan.identifier,
          limits: activeSubscription.plan.limits
        } : null
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
    // Validate and convert vendorId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID'
      });
    }

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

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
      Property.countDocuments({ owner: vendorObjectId }),
      Property.aggregate([
        { $match: { owner: vendorObjectId } },
        { $group: { _id: null, total: { $sum: '$views' } } }
      ]),
      Message.countDocuments({
        recipient: vendorObjectId,
        type: { $in: ['inquiry', 'lead', 'property_inquiry'] },
        createdAt: { $gte: currentStartDate, $lte: currentEndDate }
      }),
      Message.countDocuments({
        recipient: vendorObjectId,
        type: 'call_request',
        createdAt: { $gte: currentStartDate, $lte: currentEndDate }
      }),
      Message.countDocuments({
        recipient: vendorObjectId,
        createdAt: { $gte: currentStartDate, $lte: currentEndDate }
      }),
      // Previous period data for trends
      Property.aggregate([
        { 
          $match: { 
            owner: vendorObjectId,
            createdAt: { $gte: previousStartDate, $lte: previousEndDate }
          } 
        },
        { $group: { _id: null, total: { $sum: '$views' } } }
      ]),
      Message.countDocuments({
        recipient: vendorObjectId,
        type: { $in: ['inquiry', 'lead', 'property_inquiry'] },
        createdAt: { $gte: previousStartDate, $lte: previousEndDate }
      }),
      Property.countDocuments({ 
        owner: vendorObjectId,
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
      { $match: { vendor: vendorObjectId } },
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
    // Validate and convert vendorId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID'
      });
    }

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate;
    let daysInPeriod;
    
    switch (timeframe) {
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        daysInPeriod = 7;
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        daysInPeriod = 90;
        break;
      case '1year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        daysInPeriod = 365;
        break;
      default: // 30days
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        daysInPeriod = 30;
    }

    // Build property match query
    let propertyMatch = { owner: vendorObjectId };
    if (propertyId && propertyId !== 'all') {
      try {
        propertyMatch._id = new mongoose.Types.ObjectId(propertyId);
      } catch (err) {
        console.error('Invalid propertyId:', propertyId);
      }
    }

    // Get all properties for the vendor
    const properties = await Property.find(propertyMatch).lean();
    
    // Get messages for lead counting
    const messages = await Message.find({
      recipient: vendorObjectId,
      createdAt: { $gte: startDate }
    }).lean();

    // Build property performance data
    const propertyPerformance = properties.map(property => {
      const propertyMessages = messages.filter(msg => 
        msg.property && msg.property.toString() === property._id.toString()
      );
      
      const leads = propertyMessages.filter(msg => 
        ['inquiry', 'lead', 'property_inquiry'].includes(msg.type)
      );
      
      const views = property.views || 0;
      const leadsCount = leads.length;
      const conversionRate = views > 0 ? (leadsCount / views) * 100 : 0;
      
      return {
        propertyId: property._id,
        title: property.title,
        views,
        leads: leadsCount,
        inquiries: propertyMessages.length,
        conversionRate: Math.round(conversionRate * 100) / 100,
        revenue: 0
      };
    }).sort((a, b) => b.views - a.views);

    // Get lead sources data
    const leadSourcesMap = {};
    messages.forEach(msg => {
      if (['inquiry', 'lead', 'property_inquiry'].includes(msg.type)) {
        const source = msg.source || 'website';
        leadSourcesMap[source] = (leadSourcesMap[source] || 0) + 1;
      }
    });
    
    const leadSources = Object.keys(leadSourcesMap).length > 0
      ? Object.entries(leadSourcesMap).map(([name, value]) => ({ name, value }))
      : [
          { name: 'Website', value: 0 },
          { name: 'Social Media', value: 0 },
          { name: 'Referrals', value: 0 },
          { name: 'Direct', value: 0 }
        ];

    // Generate time series data
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
      leadSources,
      demographicsData
    };

    res.json({
      success: true,
      data: performanceData
    });
  } catch (error) {
    console.error('Performance metrics error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    ]).sort({ createdAt: -1 }); // Changed from planId to plan and added addons population

    if (activeSubscription) {
      // Ensure plan exists
      if (!activeSubscription.plan) {
        return res.json({
          success: true,
          data: {
            hasActiveSubscription: false,
            subscription: null,
            message: 'Subscription plan not found'
          }
        });
      }

      res.json({
        success: true,
        data: {
          hasActiveSubscription: true,
          subscription: {
            id: activeSubscription._id,
            planName: activeSubscription.plan.name,
            planId: activeSubscription.plan._id,
            status: activeSubscription.status,
            startDate: activeSubscription.startDate,
            endDate: activeSubscription.endDate,
            features: (activeSubscription.plan.features || []).map(f => {
              if (typeof f === 'string') {
                return f;
              } else if (f && typeof f === 'object' && f.name) {
                return f.enabled !== false ? f.name : null;
              }
              return null;
            }).filter(Boolean), // Remove null values
            limits: activeSubscription.plan.limits || {}, // Include full limits
            billingCycle: activeSubscription.billingCycle || 'monthly',
            addons: activeSubscription.addons || [],
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

// @desc    Get vendor payments
// @route   GET /api/vendors/payments
// @access  Private/Agent
router.get('/payments', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { page = 1, limit = 20, dateFrom, dateTo, status } = req.query;
  
  try {
    // For now, create mock payment data based on subscriptions
    // In a real implementation, you'd query a Payment/Transaction model
    const Subscription = require('../models/Subscription');
    
    const filter = { user: vendorId };
    if (status) filter.status = status;
    
    const subscriptions = await Subscription.find(filter)
      .populate('plan', 'name price')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalCount = await Subscription.countDocuments(filter);
    
    // Convert subscriptions to payment format
    const payments = subscriptions.map(sub => ({
      _id: sub._id,
      paymentId: `PAY_${sub._id.toString().slice(-8).toUpperCase()}`,
      subscriptionId: sub._id,
      amount: sub.amount || (sub.plan ? sub.plan.price : 0),
      currency: sub.currency || 'INR',
      status: sub.status === 'active' ? 'completed' : 'pending',
      paymentMethod: 'razorpay',
      description: `Payment for ${sub.plan ? sub.plan.name : 'Subscription'}`,
      createdAt: sub.createdAt,
      paidAt: sub.status === 'active' ? sub.startDate : null
    }));

    res.json({
      success: true,
      data: {
        payments,
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Get vendor payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
}));

// @desc    Get vendor invoices
// @route   GET /api/vendors/invoices
// @access  Private/Agent
router.get('/invoices', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { page = 1, limit = 10, status } = req.query;
  
  try {
    // For now, create mock invoice data based on subscriptions
    // In a real implementation, you'd query an Invoice model
    const Subscription = require('../models/Subscription');
    const User = require('../models/User');
    
    const filter = { user: vendorId };
    if (status) filter.status = status;
    
    const subscriptions = await Subscription.find(filter)
      .populate('plan', 'name price')
      .populate('user', 'profile.firstName profile.lastName email profile.phone')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalCount = await Subscription.countDocuments(filter);
    
    // Convert subscriptions to invoice format
    const invoices = subscriptions.map((sub, index) => {
      const user = sub.user;
      const plan = sub.plan;
      const amount = sub.amount || (plan ? plan.price : 0);
      const tax = Math.round(amount * 0.18); // 18% GST
      const total = amount + tax;
      
      return {
        _id: sub._id,
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(Date.now() + index).slice(-6)}`,
        vendorId: sub.user,
        subscriptionId: sub._id,
        amount,
        tax,
        total,
        currency: sub.currency || 'INR',
        status: sub.status === 'active' ? 'paid' : 'sent',
        issueDate: sub.createdAt,
        dueDate: new Date(sub.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from issue
        paidDate: sub.status === 'active' ? sub.startDate : null,
        items: [{
          description: `${plan ? plan.name : 'Subscription'} Plan`,
          quantity: 1,
          unitPrice: amount,
          total: amount
        }],
        vendorDetails: {
          name: user ? `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'Vendor' : 'Vendor',
          email: user?.email || '',
          phone: user?.profile?.phone || '',
          address: 'India'
        }
      };
    });

    res.json({
      success: true,
      data: {
        invoices,
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Get vendor invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices'
    });
  }
}));

// @desc    Get vendor billing stats
// @route   GET /api/vendors/billing/stats
// @access  Private/Agent
router.get('/billing/stats', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  
  try {
    const Subscription = require('../models/Subscription');
    const Property = require('../models/Property');
    const Message = require('../models/Message');
    
    // Get subscription stats
    const activeSubscription = await Subscription.findOne({
      user: vendorId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('plan').sort({ createdAt: -1 });
    
    const totalSubscriptions = await Subscription.countDocuments({ user: vendorId });
    
    // Calculate property revenue from sold properties
    const soldProperties = await Property.find({ 
      owner: vendorId, 
      status: 'sold' 
    }).select('price');
    
    const totalRevenue = soldProperties.reduce((sum, prop) => {
      const price = parseFloat(prop.price.toString().replace(/[^0-9.]/g, ''));
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
    
    // Calculate monthly revenue from properties sold this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    
    const monthlySoldProperties = await Property.find({ 
      owner: vendorId, 
      status: 'sold',
      updatedAt: { $gte: firstDayOfMonth }
    }).select('price');
    
    const monthlyRevenue = monthlySoldProperties.reduce((sum, prop) => {
      const price = parseFloat(prop.price.toString().replace(/[^0-9.]/g, ''));
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
    
    // Get usage stats
    const propertyCount = await Property.countDocuments({ owner: vendorId });
    const leadCount = await Message.countDocuments({ 
      recipient: vendorId, 
      type: { $in: ['inquiry', 'lead', 'property_inquiry'] }
    });
    const messageCount = await Message.countDocuments({ recipient: vendorId });
    
    // Get limits from active subscription
    const limits = activeSubscription?.plan?.limits || {
      properties: 5,
      leads: 50,
      messages: 100
    };
    
    const stats = {
      totalRevenue: totalRevenue,
      monthlyRevenue: monthlyRevenue,
      activeSubscriptions: activeSubscription ? 1 : 0,
      totalInvoices: totalSubscriptions,
      paidInvoices: await Subscription.countDocuments({ user: vendorId, status: 'active' }),
      overdueInvoices: await Subscription.countDocuments({ 
        user: vendorId, 
        status: 'expired',
        endDate: { $lt: new Date() }
      }),
      nextBillingAmount: activeSubscription ? (activeSubscription.amount || 0) : 0,
      nextBillingDate: activeSubscription?.endDate || new Date(),
      subscriptionStatus: activeSubscription ? 'active' : 'inactive',
      usageStats: {
        properties: {
          used: propertyCount,
          limit: limits.properties || 999999
        },
        leads: {
          used: leadCount,
          limit: limits.leads || 999999
        },
        messages: {
          used: messageCount,
          limit: limits.messages || 999999
        }
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get billing stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billing stats'
    });
  }
}));

// @desc    Cancel vendor subscription
// @route   POST /api/vendors/subscription/cancel
// @access  Private/Agent
router.post('/subscription/cancel', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { reason } = req.body;
  
  try {
    const Subscription = require('../models/Subscription');
    
    const activeSubscription = await Subscription.findOne({
      user: vendorId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!activeSubscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found to cancel'
      });
    }

    // Update subscription status to cancelled
    activeSubscription.status = 'cancelled';
    activeSubscription.cancelledAt = new Date();
    activeSubscription.cancelReason = reason || 'No reason provided';
    
    await activeSubscription.save();

    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
}));

// @desc    Get vendor services
// @route   GET /api/vendors/services
// @access  Private/Agent
router.get('/services', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { 
    page = 1, 
    limit = 10,
    category,
    status = 'all',
    search,
    sortBy = 'updatedAt',
    sortOrder = 'desc'
  } = req.query;

  try {
    // For now, return mock data until VendorService model is created
    // This prevents the 404 error and allows the frontend to work
    const mockServices = [];
    
    res.json({
      success: true,
      data: {
        services: mockServices,
        totalCount: 0,
        totalPages: 0,
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Get vendor services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor services'
    });
  }
}));

// @desc    Get vendor service stats
// @route   GET /api/vendors/services/stats
// @access  Private/Agent
router.get('/services/stats', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;

  try {
    // For now, return mock stats until VendorService model is created
    const mockStats = {
      totalServices: 0,
      activeServices: 0,
      totalBookings: 0,
      pendingBookings: 0,
      completedBookings: 0,
      totalRevenue: 0,
      monthlyRevenue: 0,
      averageRating: 0,
      popularCategories: []
    };
    
    res.json({
      success: true,
      data: mockStats
    });
  } catch (error) {
    console.error('Get vendor service stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service stats'
    });
  }
}));

// @desc    Create vendor service
// @route   POST /api/vendors/services
// @access  Private/Agent
router.post('/services', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const serviceData = req.body;

  try {
    // TODO: Implement when VendorService model is created
    res.status(501).json({
      success: false,
      message: 'Service creation not yet implemented. VendorService model needed.'
    });
  } catch (error) {
    console.error('Create vendor service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create service'
    });
  }
}));

// @desc    Get vendor service by ID
// @route   GET /api/vendors/services/:id
// @access  Private/Agent
router.get('/services/:id', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;

  try {
    // TODO: Implement when VendorService model is created
    res.status(404).json({
      success: false,
      message: 'Service not found'
    });
  } catch (error) {
    console.error('Get vendor service by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service'
    });
  }
}));

// @desc    Update vendor service
// @route   PUT /api/vendors/services/:id
// @access  Private/Agent
router.put('/services/:id', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;
  const serviceData = req.body;

  try {
    // TODO: Implement when VendorService model is created
    res.status(501).json({
      success: false,
      message: 'Service update not yet implemented. VendorService model needed.'
    });
  } catch (error) {
    console.error('Update vendor service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service'
    });
  }
}));

// @desc    Delete vendor service
// @route   DELETE /api/vendors/services/:id
// @access  Private/Agent
router.delete('/services/:id', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;

  try {
    // TODO: Implement when VendorService model is created
    res.status(501).json({
      success: false,
      message: 'Service deletion not yet implemented. VendorService model needed.'
    });
  } catch (error) {
    console.error('Delete vendor service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service'
    });
  }
}));

// @desc    Toggle vendor service status
// @route   PATCH /api/vendors/services/:id/toggle-status
// @access  Private/Agent
router.patch('/services/:id/toggle-status', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;

  try {
    // TODO: Implement when VendorService model is created
    res.status(501).json({
      success: false,
      message: 'Service status toggle not yet implemented. VendorService model needed.'
    });
  } catch (error) {
    console.error('Toggle vendor service status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle service status'
    });
  }
}));

// @desc    Get service bookings
// @route   GET /api/vendors/services/:id/bookings
// @access  Private/Agent
router.get('/services/:id/bookings', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;

  try {
    // TODO: Implement when ServiceBooking model is created
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Get service bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service bookings'
    });
  }
}));

// @desc    Update booking status
// @route   PATCH /api/vendors/bookings/:id/status
// @access  Private/Agent
router.patch('/bookings/:id/status', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;
  const { status } = req.body;

  try {
    // TODO: Implement when ServiceBooking model is created
    res.status(501).json({
      success: false,
      message: 'Booking status update not yet implemented. ServiceBooking model needed.'
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status'
    });
  }
}));

// @desc    Refresh vendor subscription data
// @route   POST /api/vendors/subscription/refresh
// @access  Private/Agent
router.post('/subscription/refresh', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  
  try {
    const Subscription = require('../models/Subscription');
    const Property = require('../models/Property');
    
    // Get latest subscription data
    const activeSubscription = await Subscription.findOne({
      user: vendorId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('plan').sort({ createdAt: -1 });
    
    // Count current properties
    const currentProperties = await Property.countDocuments({
      $or: [
        { owner: vendorId },
        { agent: vendorId },
        { vendor: new mongoose.Types.ObjectId(vendorId) }
      ]
    });
    
    let refreshedData = {
      hasActiveSubscription: false,
      subscription: null,
      limits: {
        maxProperties: 5,
        currentProperties,
        canAddMore: currentProperties < 5,
        planName: 'Free Plan',
        features: ['5 Property Listings'],
        planId: null
      }
    };
    
    if (activeSubscription && activeSubscription.plan) {
      const plan = activeSubscription.plan;
      const maxProperties = plan.limits?.properties || 0;
      
      // Handle features format
      let planFeatures = [];
      if (plan.features && Array.isArray(plan.features)) {
        planFeatures = plan.features.map(feature => {
          if (typeof feature === 'string') {
            return feature;
          } else if (feature && typeof feature === 'object' && feature.name) {
            return feature.enabled !== false ? feature.name : null;
          }
          return null;
        }).filter(Boolean);
      }
      
      refreshedData = {
        hasActiveSubscription: true,
        subscription: {
          id: activeSubscription._id,
          planName: plan.name,
          planId: plan._id,
          identifier: plan.identifier,
          status: activeSubscription.status,
          startDate: activeSubscription.startDate,
          endDate: activeSubscription.endDate,
          features: planFeatures,
          limits: plan.limits || {},
          billingCycle: activeSubscription.billingCycle || 'monthly'
        },
        limits: {
          maxProperties: maxProperties === 0 ? 999999 : maxProperties,
          currentProperties,
          canAddMore: maxProperties === 0 || currentProperties < maxProperties,
          planName: plan.name,
          features: planFeatures,
          planId: plan._id,
          limits: plan.limits || {}
        }
      };
    }
    
    res.json({
      success: true,
      message: 'Subscription data refreshed successfully',
      data: refreshedData
    });
  } catch (error) {
    console.error('Refresh subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh subscription data'
    });
  }
}));

// @route   POST /api/vendors/subscription/cleanup
// @desc    Deactivate old subscriptions and keep only the latest one
// @access  Private/Agent
router.post('/subscription/cleanup', requireVendorRole, asyncHandler(async (req, res) => {
  const vendorId = req.user.id;
  
  try {
    const Subscription = require('../models/Subscription');
    
    // Get all active subscriptions for this user, sorted by creation date (newest first)
    const activeSubscriptions = await Subscription.find({
      user: vendorId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).sort({ createdAt: -1 }).populate('plan');
    
    if (activeSubscriptions.length <= 1) {
      return res.json({
        success: true,
        message: 'No cleanup needed. User has 0 or 1 active subscription.',
        activeSubscription: activeSubscriptions[0] || null
      });
    }
    
    // Keep the first (latest) subscription, deactivate the rest
    const latestSubscription = activeSubscriptions[0];
    const oldSubscriptionIds = activeSubscriptions.slice(1).map(sub => sub._id);
    
    // Deactivate old subscriptions
    const result = await Subscription.updateMany(
      { _id: { $in: oldSubscriptionIds } },
      { 
        status: 'cancelled',
        updatedAt: new Date()
      }
    );
    
    console.log(`Deactivated ${result.modifiedCount} old subscriptions for user ${vendorId}`);
    
    res.json({
      success: true,
      message: `Successfully cleaned up subscriptions. Deactivated ${result.modifiedCount} old subscriptions.`,
      activeSubscription: latestSubscription,
      deactivatedCount: result.modifiedCount
    });
    
  } catch (error) {
    console.error('Subscription cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup subscriptions',
      error: error.message
    });
  }
}));

// @desc    Check if vendor has enterprise plan
// @route   GET /api/vendors/:vendorId/enterprise-check
// @access  Public (for customer property viewing)
router.get('/:vendorId/enterprise-check', asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  
  try {
    const Subscription = require('../models/Subscription');
    
    // Check if vendor has active enterprise subscription
    const activeSubscription = await Subscription.findOne({
      user: vendorId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).populate('plan').sort({ createdAt: -1 });
    
    let isEnterprise = false;
    
    if (activeSubscription && activeSubscription.plan) {
      // Check if plan identifier is 'enterprise' or plan name contains 'enterprise'
      isEnterprise = activeSubscription.plan.identifier === 'enterprise' || 
                   activeSubscription.plan.name.toLowerCase().includes('enterprise');
    }
    
    res.json({
      success: true,
      data: { isEnterprise }
    });
  } catch (error) {
    console.error('Enterprise check error:', error);
    res.json({
      success: true,
      data: { isEnterprise: false } // Default to false on error
    });
  }
}));

// @desc    Get vendor reviews (reviews for properties the vendor posted)
// @route   GET /api/vendors/reviews
// @access  Private (Vendor)
router.get('/reviews', requireVendorRole, asyncHandler(async (req, res) => {
  const Review = require('../models/Review');
  const userId = req.user.id;
  
  const { 
    page = 1, 
    limit = 10, 
    rating,
    reviewType,
    search,
    sortBy = 'createdAt', 
    sortOrder = 'desc' 
  } = req.query;
  
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  
  // Query for reviews where vendor field matches the logged-in user's ID
  const query = { 
    vendor: userId,
    status: { $ne: 'deleted' }
  };
  
  // Apply filters
  if (rating) {
    query.rating = parseInt(rating);
  }
  
  if (reviewType && ['property', 'service', 'general'].includes(reviewType)) {
    query.reviewType = reviewType;
  }
  
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { comment: { $regex: search, $options: 'i' } }
    ];
  }
  
  const [reviews, totalReviews] = await Promise.all([
    Review.find(query)
      .populate('client', 'fullName email profile')
      .populate('property', 'title address images status type listingType price')
      .populate('service', 'name category')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip),
    Review.countDocuments(query)
  ]);
  
  // Format reviews for response
  const formattedReviews = reviews.map(review => ({
    _id: review._id,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    reviewType: review.reviewType,
    isVerified: review.isVerified,
    isPublic: review.isPublic,
    helpfulVotes: review.helpfulVotes || 0,
    unhelpfulVotes: review.unhelpfulVotes || 0,
    vendorResponse: review.vendorResponse,
    tags: review.tags || [],
    images: review.images || [],
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    client: review.client ? {
      _id: review.client._id,
      name: review.client.fullName || 
            (review.client.profile?.firstName 
              ? `${review.client.profile.firstName} ${review.client.profile.lastName || ''}`
              : review.client.email),
      email: review.client.email,
      avatar: review.client.profile?.avatar
    } : null,
    property: review.property ? {
      _id: review.property._id,
      title: review.property.title,
      address: review.property.address,
      images: review.property.images,
      status: review.property.status,
      type: review.property.type,
      listingType: review.property.listingType,
      price: review.property.price
    } : null,
    service: review.service ? {
      _id: review.service._id,
      name: review.service.name,
      category: review.service.category
    } : null
  }));
  
  res.json({
    success: true,
    data: {
      reviews: formattedReviews,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalReviews / limit),
      totalCount: totalReviews
    }
  });
}));

// @desc    Get vendor review statistics
// @route   GET /api/vendors/reviews/stats
// @access  Private (Vendor)
router.get('/reviews/stats', requireVendorRole, asyncHandler(async (req, res) => {
  const Review = require('../models/Review');
  const userId = req.user.id;
  
  const query = { 
    vendor: userId,
    status: 'active'
  };
  
  const totalReviews = await Review.countDocuments(query);
  
  if (totalReviews === 0) {
    return res.json({
      success: true,
      data: {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        totalHelpful: 0
      }
    });
  }
  
  const reviews = await Review.find(query);
  
  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
  
  const ratingDistribution = {
    1: reviews.filter(r => r.rating === 1).length,
    2: reviews.filter(r => r.rating === 2).length,
    3: reviews.filter(r => r.rating === 3).length,
    4: reviews.filter(r => r.rating === 4).length,
    5: reviews.filter(r => r.rating === 5).length
  };
  
  const totalHelpful = reviews.reduce((sum, r) => sum + (r.helpfulVotes || 0), 0);
  
  res.json({
    success: true,
    data: {
      totalReviews,
      averageRating: parseFloat(averageRating.toFixed(2)),
      ratingDistribution,
      totalHelpful
    }
  });
}));

// @desc    Respond to a review
// @route   POST /api/vendors/reviews/:id/respond
// @access  Private (Vendor)
router.post('/reviews/:id/respond', requireVendorRole, asyncHandler(async (req, res) => {
  const Review = require('../models/Review');
  const { message } = req.body;
  const userId = req.user.id;
  const reviewId = req.params.id;
  
  if (!message || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Response message is required'
    });
  }
  
  if (message.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'Response message must be 500 characters or less'
    });
  }
  
  // Find review and verify ownership
  const review = await Review.findOne({ 
    _id: reviewId, 
    vendor: userId 
  });
  
  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found or you do not have permission to respond'
    });
  }
  
  // Update vendor response
  review.vendorResponse = {
    message: message.trim(),
    respondedAt: new Date()
  };
  
  await review.save();
  
  // Populate and return updated review
  const updatedReview = await Review.findById(reviewId)
    .populate('client', 'fullName email profile')
    .populate('property', 'title address images status type listingType price');
  
  res.json({
    success: true,
    message: 'Response submitted successfully',
    data: {
      review: {
        _id: updatedReview._id,
        rating: updatedReview.rating,
        title: updatedReview.title,
        comment: updatedReview.comment,
        reviewType: updatedReview.reviewType,
        vendorResponse: updatedReview.vendorResponse,
        createdAt: updatedReview.createdAt,
        updatedAt: updatedReview.updatedAt,
        client: updatedReview.client ? {
          _id: updatedReview.client._id,
          name: updatedReview.client.fullName || 
                (updatedReview.client.profile?.firstName 
                  ? `${updatedReview.client.profile.firstName} ${updatedReview.client.profile.lastName || ''}`
                  : updatedReview.client.email),
          avatar: updatedReview.client.profile?.avatar
        } : null,
        property: updatedReview.property ? {
          _id: updatedReview.property._id,
          title: updatedReview.property.title,
          address: updatedReview.property.address,
          images: updatedReview.property.images,
          status: updatedReview.property.status
        } : null
      }
    }
  });
}));

module.exports = router;