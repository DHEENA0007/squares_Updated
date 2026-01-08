const express = require('express');
const Property = require('../models/Property');
const PropertyView = require('../models/PropertyView');
const UserNotification = require('../models/UserNotification');
const { asyncHandler, validateRequest } = require('../middleware/errorMiddleware');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');
const { PERMISSIONS, hasPermission } = require('../utils/permissions');
const mongoose = require('mongoose');
const adminRealtimeService = require('../services/adminRealtimeService');
const router = express.Router();

// Handle OPTIONS preflight requests
router.options('*', (req, res) => {
  res.sendStatus(200);
});

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public (with optional auth for admin users)
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      location,
      search,
      minPrice,
      maxPrice,
      propertyType,
      bedrooms,
      bedroom,
      bathrooms,
      bathroom,
      listingType
    } = req.query;

    const skip = (page - 1) * limit;

    // Debug: Log user info
    console.log('Properties API - User:', req.user ? { id: req.user.id, role: req.user.role } : 'Not authenticated');
    console.log('Query params:', { page, limit, location, search, propertyType, bedrooms, bedroom, listingType });

    // Admin users can see all properties, customers only see available/active verified properties
    let queryFilter = {};

    if (!req.user || !hasPermission(req.user, PERMISSIONS.PROPERTIES_VIEW)) {
      // For customers: show only available and non-archived properties
      queryFilter = {
        status: 'available',
        $or: [
          { archived: { $exists: false } },
          { archived: false }
        ]
      };
      console.log('Applying customer filter - showing only available and non-archived properties');
    } else {
      console.log('Admin user detected - showing all properties');
    }
    // Admin users: show all properties (no status filter)

    // Apply search filter (searches in title, description, city, district, state, locality)
    if (search) {
      queryFilter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.district': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } },
        { 'address.locality': { $regex: search, $options: 'i' } },
        { 'address.locationName': { $regex: search, $options: 'i' } }
      ];
    }

    // Apply location filter (backward compatibility)
    if (location && !search) {
      queryFilter.$or = [
        { 'address.city': { $regex: location, $options: 'i' } },
        { 'address.locality': { $regex: location, $options: 'i' } }
      ];
    }

    if (minPrice) {
      queryFilter.price = { $gte: parseInt(minPrice) };
    }

    if (maxPrice) {
      queryFilter.price = { ...queryFilter.price, $lte: parseInt(maxPrice) };
    }

    if (propertyType) {
      // Handle comma-separated property types (e.g., "commercial,office")
      if (propertyType.includes(',')) {
        const propertyTypeArray = propertyType.split(',').map(type => new RegExp(`^${type.trim()}$`, 'i'));
        queryFilter.type = { $in: propertyTypeArray };
      } else {
        queryFilter.type = { $regex: new RegExp(`^${propertyType}$`, 'i') };
      }
    }

    // Handle bedrooms (accept both 'bedrooms' and 'bedroom')
    const targetBedrooms = bedrooms || bedroom;
    if (targetBedrooms) {
      const bedroomsNum = parseInt(targetBedrooms);
      if (!isNaN(bedroomsNum) && bedroomsNum > 0) {
        queryFilter.bedrooms = bedroomsNum;
      } else {
        console.warn(`Invalid bedrooms filter value: ${targetBedrooms}`);
      }
    }

    // Handle bathrooms (accept both 'bathrooms' and 'bathroom')
    const targetBathrooms = bathrooms || bathroom;
    if (targetBathrooms) {
      const bathroomsNum = parseInt(targetBathrooms);
      if (!isNaN(bathroomsNum) && bathroomsNum > 0) {
        queryFilter.bathrooms = bathroomsNum;
      } else {
        console.warn(`Invalid bathrooms filter value: ${targetBathrooms}`);
      }
    }

    if (listingType) {
      queryFilter.listingType = listingType;
    }

    // Apply amenities filter
    if (req.query.amenities) {
      const amenitiesList = Array.isArray(req.query.amenities)
        ? req.query.amenities
        : [req.query.amenities];

      // Properties must have all selected amenities
      if (amenitiesList.length > 0) {
        queryFilter.amenities = { $all: amenitiesList };
      }
    }

    console.log('Property query filter:', JSON.stringify(queryFilter, null, 2));

    const totalProperties = await Property.countDocuments(queryFilter);
    console.log(`Total properties matching filter: ${totalProperties}`);

    const properties = await Property.find(queryFilter)
      .populate('owner', 'profile.firstName profile.lastName profile.phone email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`Found ${properties.length} properties out of ${totalProperties} total`);

    res.json({
      success: true,
      data: {
        properties,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalProperties / limit),
          totalProperties
        }
      }
    });
  } catch (error) {
    console.error('Get properties error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties',
      error: error.message
    });
  }
}));

// @desc    Get featured vendors with badges (public endpoint)
// @route   GET /api/properties/featured-vendors
// @access  Public
// NOTE: This route MUST be defined BEFORE the /:id route to avoid route matching conflict
router.get('/featured-vendors', asyncHandler(async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    // Validate limit parameter
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit parameter. Must be a number between 1 and 50.'
      });
    }

    // Import models
    const User = require('../models/User');
    const Vendor = require('../models/Vendor');
    const Subscription = require('../models/Subscription');

    // Get active subscriptions count
    const subscriptionCount = await Subscription.countDocuments({
      status: 'active',
      endDate: { $gt: new Date() }
    });

    if (subscriptionCount === 0) {
      return res.json({
        success: true,
        data: {
          vendors: [],
          totalCount: 0
        }
      });
    }

    // Get all active subscriptions first, then filter in code
    const activeSubscriptions = await Subscription.find({
      status: 'active',
      endDate: { $gt: new Date() }
    })
      .populate('plan')
      .populate({
        path: 'user',
        select: 'email profile role status',
        match: {
          role: 'agent',
          status: 'active'
        }
      })
      .sort({ updatedAt: -1 });

    // Filter subscriptions where plan and user exist, and plan has any enabled badges
    const validSubscriptions = activeSubscriptions.filter(sub => {
      if (!sub.plan || !sub.user) return false;

      const plan = sub.plan;

      // Check if plan has any enabled badges
      if (Array.isArray(plan.benefits)) {
        return plan.benefits.some(benefit => benefit.enabled);
      } else if (plan.benefits && typeof plan.benefits === 'object') {
        return Object.values(plan.benefits).some(value => value === true);
      }

      return false;
    });

    // Get vendor profiles for these users
    const vendorProfiles = await Promise.all(
      validSubscriptions.slice(0, parsedLimit).map(async (subscription) => {
        const vendor = await Vendor.findOne({ user: subscription.user._id })
          .populate('user', 'email profile');

        if (!vendor || !vendor.user) return null;

        const fullName = `${vendor.user.profile?.firstName || ''} ${vendor.user.profile?.lastName || ''}`.trim();

        return {
          _id: vendor._id,
          name: fullName || 'Professional Vendor',
          email: vendor.user.email,
          avatar: vendor.user.profile?.avatar || null,
          phone: vendor.user.profile?.phone || null,
          bio: vendor.user.profile?.bio || null,
          companyName: vendor.businessInfo?.companyName || null,
          specialization: vendor.businessInfo?.specialization || [],
          location: {
            city: vendor.user.profile?.address?.city || null,
            state: vendor.user.profile?.address?.state || null
          },
          badges: (() => {
            if (Array.isArray(subscription.plan.benefits)) {
              return subscription.plan.benefits
                .filter(benefit => benefit.enabled)
                .map(benefit => ({
                  key: benefit.key,
                  name: benefit.name,
                  description: benefit.description || '',
                  enabled: true,
                  icon: benefit.icon || 'star'
                }));
            } else if (subscription.plan.benefits && typeof subscription.plan.benefits === 'object') {
              const legacyBadgeMap = {
                topRated: { name: 'Top Rated', icon: 'star', description: 'Highly rated professional' },
                verifiedBadge: { name: 'Verified', icon: 'shield-check', description: 'Identity verified' },
                marketingManager: { name: 'Marketing Pro', icon: 'trending-up', description: 'Advanced marketing tools' },
                commissionBased: { name: 'Commission Based', icon: 'dollar-sign', description: 'Performance-based pricing' }
              };

              return Object.entries(subscription.plan.benefits)
                .filter(([_, isActive]) => isActive === true)
                .map(([badgeKey, _]) => ({
                  key: badgeKey,
                  name: legacyBadgeMap[badgeKey]?.name || badgeKey,
                  description: legacyBadgeMap[badgeKey]?.description || '',
                  enabled: true,
                  icon: legacyBadgeMap[badgeKey]?.icon || 'star'
                }));
            }
            return [];
          })(),
          rating: {
            average: vendor.user.profile?.vendorInfo?.rating?.average || 0,
            count: vendor.user.profile?.vendorInfo?.rating?.count || 0
          },
          responseTime: vendor.user.profile?.vendorInfo?.responseTime || null,
          planName: subscription.plan.name
        };
      })
    );

    // Filter out null results and sort by badge count, then rating
    const featuredVendors = vendorProfiles
      .filter(vendor => vendor !== null)
      .sort((a, b) => {
        const aBadgeCount = Array.isArray(a.badges) ? a.badges.length : 0;
        const bBadgeCount = Array.isArray(b.badges) ? b.badges.length : 0;

        if (aBadgeCount !== bBadgeCount) {
          return bBadgeCount - aBadgeCount;
        }
        return b.rating.average - a.rating.average;
      });

    res.json({
      success: true,
      data: {
        vendors: featuredVendors,
        totalCount: featuredVendors.length,
        message: featuredVendors.length > 0
          ? `Showing ${featuredVendors.length} premium vendors with active subscriptions and badges`
          : 'No premium vendors with badges available yet'
      }
    });
  } catch (error) {
    console.error('Get featured vendors error:', error);

    const isValidationError = error.name === 'ValidationError' ||
      error.name === 'CastError' ||
      error.message?.includes('Cast to ObjectId failed');

    res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: isValidationError ? 'Invalid request parameters' : 'Failed to fetch featured vendors',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public (with optional auth to track logged-in viewers)
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Fetching property with ID:', id);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid property ID format:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format'
      });
    }

    const property = await Property.findById(id)
      .populate('owner', 'profile.firstName profile.lastName profile.phone email role')
      .populate('agent', 'profile.firstName profile.lastName profile.phone email role')
      .populate('assignedTo', 'profile.firstName profile.lastName profile.phone email role')
      .populate('approvedBy', 'profile.firstName profile.lastName email')
      .populate('rejectedBy', 'profile.firstName profile.lastName email')
      .populate('assignedBy', 'profile.firstName profile.lastName email')
      .lean();

    if (!property) {
      console.log('Property not found with ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    console.log('Property found:', {
      id: property._id,
      title: property.title,
      status: property.status,
      listingType: property.listingType,
      ownerData: property.owner ? {
        id: property.owner._id,
        email: property.owner.email,
        role: property.owner.role,
        phone: property.owner.profile?.phone,
        firstName: property.owner.profile?.firstName,
        lastName: property.owner.profile?.lastName
      } : null
    });

    // Track property view using PropertyView model
    // Only count views from customers and guests (non-logged in users)
    // Don't count views from admin, superadmin, subadmin, or vendor/agent roles
    try {
      const userRole = req.user?.role || 'guest';
      const isPropertyOwner = req.user && property.owner._id.toString() === req.user.id;
      const isPropertyAgent = req.user && property.agent && property.agent._id?.toString() === req.user.id;

      // Only track views from registered customers (not guests, admins, or vendors)
      const shouldTrackView = userRole === 'customer';

      // Never count views from admin roles
      const isAdminRole = ['admin', 'superadmin', 'subadmin'].includes(userRole);

      if (shouldTrackView && !isAdminRole) {
        // Use device ID from header if available, otherwise fallback to IP
        // Remove timestamp from fallback to allow grouping of guest views by IP
        const sessionId = req.headers['x-device-id'] || req.sessionID || req.ip;
        const viewerId = req.user?.id || req.user?._id || null;

        const viewData = {
          property: property._id,
          viewer: viewerId,
          sessionId,
          ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress,
          userAgent: req.get('user-agent'),
          referrer: req.get('referer'),
          viewedAt: new Date()
        };

        console.log('📊 Tracking property view:', {
          propertyId: property._id,
          propertyTitle: property.title,
          viewerId: viewerId,
          userRole: userRole,
          sessionId: sessionId.toString().substring(0, 20) + '...'
        });

        // Create view record
        const createdView = await PropertyView.create(viewData);
        console.log('✅ Property view tracked successfully:', createdView._id);

        // Increment view count in property
        await Property.findByIdAndUpdate(id, { $inc: { views: 1 } });

        // Return viewId in response header for duration tracking
        res.set('X-View-Id', createdView._id.toString());
      } else {
        console.log('⏭️ Skipping view tracking for:', {
          propertyId: property._id,
          userRole: userRole,
          isPropertyOwner: isPropertyOwner,
          isAdminRole: isAdminRole
        });
      }
    } catch (viewError) {
      // Log the error but don't fail the main request
      console.error('❌ Error tracking property view:', viewError.message);
    }

    // Emit real-time notification to property owner about new view (if viewer is logged in)
    if (req.user && property.owner._id.toString() !== req.user.id) {
      const socketService = require('../services/socketService');
      const ownerId = property.owner._id.toString();

      if (socketService.isUserOnline(ownerId)) {
        socketService.sendToUser(ownerId, 'vendor:property_viewed', {
          propertyId: property._id,
          propertyTitle: property.title,
          viewerName: req.user.profile?.firstName ?
            `${req.user.profile.firstName} ${req.user.profile.lastName || ''}`.trim() :
            'Anonymous',
          timestamp: new Date()
        });
      }
    }

    res.json({
      success: true,
      data: { property }
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property',
      error: error.message
    });
  }
}));

// @desc    Update view duration
// @route   POST /api/properties/:id/view-duration
// @access  Public
router.post('/:id/view-duration', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { duration, viewId } = req.body;

    if (!duration || isNaN(duration)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid duration'
      });
    }

    // If viewId is provided, update that specific view
    if (viewId) {
      await PropertyView.findByIdAndUpdate(viewId, {
        $set: { viewDuration: duration }
      });
    } else {
      // Fallback: update the most recent view for this session/IP
      const sessionId = req.headers['x-device-id'] || req.sessionID || req.ip;
      const viewerId = req.user?.id || null;

      const query = {
        property: id,
        sessionId: sessionId,
        viewedAt: { $gte: new Date(Date.now() - 3600000) } // Within last hour
      };

      if (viewerId) {
        query.viewer = viewerId;
      }

      await PropertyView.findOneAndUpdate(
        query,
        { $set: { viewDuration: duration } },
        { sort: { viewedAt: -1 } }
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update view duration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update view duration'
    });
  }
}));

// @desc    Register interest in property
// @route   POST /api/properties/:id/interest
// @access  Private
router.post('/:id/interest', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format'
      });
    }

    const property = await Property.findById(id).populate('owner');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Track interest interaction
    const sessionId = req.sessionID || req.ip + '-' + Date.now();
    const viewerId = req.user.id;

    // Find existing view for today or create new
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let view = await PropertyView.findOne({
      property: id,
      viewer: viewerId,
      viewedAt: { $gte: today }
    });

    if (view) {
      view.interactions.clickedInterest = true;
      await view.save();
    } else {
      view = await PropertyView.create({
        property: id,
        viewer: viewerId,
        sessionId,
        ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
        referrer: req.get('referer'),
        viewedAt: new Date(),
        interactions: { clickedInterest: true }
      });
    }

    // Send socket notification to owner
    const ownerId = property.owner._id.toString();

    // Create persistent notification
    const notification = await UserNotification.create({
      user: ownerId,
      type: 'lead_alert',
      title: 'New Interest Registered',
      message: `${req.user.profile?.firstName || 'User'} ${req.user.profile?.lastName || ''} is interested in ${property.title}`,
      data: {
        propertyId: property._id,
        propertyTitle: property.title,
        customerId: req.user.id,
        customerName: `${req.user.profile?.firstName || ''} ${req.user.profile?.lastName || ''}`.trim() || req.user.email,
        customerPhone: req.user.profile?.phone || 'N/A',
        timestamp: new Date()
      },
      priority: 'high'
    });

    // Send socket notification to owner
    const socketService = require('../services/socketService');

    if (socketService.isUserOnline(ownerId)) {
      const sent = socketService.sendToUser(ownerId, 'vendor:property_interest', {
        notificationId: notification._id,
        propertyId: property._id,
        propertyTitle: property.title,
        customerName: `${req.user.profile.firstName} ${req.user.profile.lastName}`.trim(),
        customerPhone: req.user.profile.phone,
        timestamp: new Date()
      });

      if (sent) {
        notification.delivered = true;
        notification.deliveredAt = new Date();
        await notification.save();
      }
    }

    res.json({
      success: true,
      message: 'Interest registered successfully'
    });
  } catch (error) {
    console.error('Interest registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register interest'
    });
  }
}));

// @desc    Create property
// @route   POST /api/properties
// @access  Private
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  // Check permission for property creation
  if (!hasPermission(req.user, PERMISSIONS.PROPERTIES_CREATE)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to create properties'
    });
  }

  try {
    const User = require('../models/User');
    const Vendor = require('../models/Vendor');
    const Subscription = require('../models/Subscription');

    // Declare activeSubscription outside the if block
    let activeSubscription = null;

    // Check user's subscription limits
    if (req.user.role === 'agent') {
      activeSubscription = await Subscription.findOne({
        user: req.user.id,
        status: 'active',
        endDate: { $gt: new Date() }
      }).populate('plan').sort({ createdAt: -1 });

      // Count current properties
      const vendorObjectId = new mongoose.Types.ObjectId(req.user.id);
      const currentProperties = await Property.countDocuments({
        $or: [
          { owner: req.user.id },
          { agent: req.user.id },
          { vendor: vendorObjectId }
        ]
      });

      // Check limits using planSnapshot for existing subscriptions or fetch FREE plan from database
      let maxProperties;
      if (activeSubscription) {
        // Use snapshot if available (preserves plan at subscription time)
        const planData = activeSubscription.planSnapshot || activeSubscription.plan;
        if (planData && planData.limits && planData.limits.properties !== undefined) {
          const planLimit = planData.limits.properties;
          maxProperties = planLimit === 0 ? 999999 : planLimit; // 0 means unlimited
        } else {
          return res.status(500).json({
            success: false,
            message: 'Invalid subscription data. Please contact support.'
          });
        }
      } else {
        // No subscription - fetch FREE plan from database to use admin-set limits
        const Plan = require('../models/Plan');
        const freePlan = await Plan.findOne({ identifier: 'free', isActive: true });
        if (!freePlan || freePlan.limits?.properties === undefined) {
          return res.status(500).json({
            success: false,
            message: 'Free plan not configured. Please contact administrator.'
          });
        }
        const freePlanLimit = freePlan.limits.properties;
        maxProperties = freePlanLimit === 0 ? 999999 : freePlanLimit;
      }

      if (currentProperties >= maxProperties && maxProperties !== 999999) {
        return res.status(403).json({
          success: false,
          message: `Property limit reached. Your current plan allows ${maxProperties} properties.`,
          code: 'PROPERTY_LIMIT_EXCEEDED'
        });
      }
    }

    const propertyData = {
      ...req.body,
      owner: req.user.id,
      status: 'pending', // All vendor properties start as pending approval
      verified: false, // Requires admin verification to be published
      createdAt: new Date()
    };

    // Set vendor reference if user is an agent
    if (req.user.role === 'agent') {
      const vendor = await Vendor.findByUserId(req.user.id);
      if (vendor) {
        propertyData.vendor = vendor._id;
        propertyData.agent = req.user.id;
      }

      // Mark as free listing if no active subscription
      if (!activeSubscription) {
        propertyData.isFreeListing = true;
      }
    }

    const property = await Property.create(propertyData);
    await property.populate('owner', 'profile.firstName profile.lastName profile.phone email role');

    // Notify admins about new property
    adminRealtimeService.broadcastNotification({
      type: 'property_created',
      title: 'New Property Submitted',
      message: `New property "${property.title}" submitted by ${req.user.profile.firstName} ${req.user.profile.lastName}`,
      data: {
        propertyId: property._id,
        ownerId: req.user.id,
        ownerName: `${req.user.profile.firstName} ${req.user.profile.lastName}`
      }
    });

    res.status(201).json({
      success: true,
      data: { property },
      message: 'Property submitted successfully! It will be published after admin verification.'
    });
  } catch (error) {
    console.error('Create property error:', error);

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
      message: 'Failed to create property'
    });
  }
}));

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  try {
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

    // Check if user owns this property, is the agent for this property, or has edit permission
    const isOwner = property.owner.toString() === req.user.id.toString();
    const isAgent = property.agent && property.agent.toString() === req.user.id.toString();
    const canEdit = hasPermission(req.user, PERMISSIONS.PROPERTIES_EDIT);

    console.log('Property update - User ID:', req.user.id, 'Role:', req.user.role);
    console.log('Property update - Property owner:', property.owner?.toString());
    console.log('Property update - Property agent:', property.agent?.toString());
    console.log('Property update - Is Owner:', isOwner, 'Is Agent:', isAgent, 'Can Edit:', canEdit);

    if (!isOwner && !isAgent && !canEdit) {
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
    ).populate('owner', 'profile.firstName profile.lastName profile.phone email role');

    res.json({
      success: true,
      data: { property: updatedProperty },
      message: 'Property updated successfully'
    });
  } catch (error) {
    console.error('Update property error:', error);

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

// @desc    Update property status
// @route   PATCH /api/properties/:id/status
// @access  Private
router.patch('/:id/status', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

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

    // Check if user owns this property, is the agent for this property, or is admin
    const isOwner = property.owner.toString() === req.user.id.toString();
    const isAgent = property.agent && property.agent.toString() === req.user.id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (!isOwner && !isAgent && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }

    // Validate status for vendors/customers (they can't set to pending/rejected)
    const validStatusesForOwner = ['available', 'sold', 'rented', 'leased'];
    if (!hasPermission(req.user, PERMISSIONS.PROPERTIES_EDIT) && !validStatusesForOwner.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Available options: available, sold, rented, leased'
      });
    }

    // Update property status
    const updatedProperty = await Property.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('owner', 'profile.firstName profile.lastName profile.phone email role');

    res.json({
      success: true,
      data: { property: updatedProperty },
      message: 'Property status updated successfully'
    });
  } catch (error) {
    console.error('Update property status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update property status'
    });
  }
}));

// @desc    Toggle property featured status  
// @route   PATCH /api/properties/:id/featured
// @access  Private
router.patch('/:id/featured', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;

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

    // Check if user owns this property, is the agent for this property, or is admin
    const isOwner = property.owner.toString() === req.user.id.toString();
    const isAgent = property.agent && property.agent.toString() === req.user.id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (!isOwner && !isAgent && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }

    // For non-admin users, check subscription limits when featuring a property
    if (!isAdmin && featured === true && !property.featured) {
      const Subscription = require('../models/Subscription');

      // Check if user has active subscription with featured listing limits
      const activeSubscription = await Subscription.findOne({
        user: property.owner,
        status: 'active',
        endDate: { $gt: new Date() }
      }).populate('plan');

      if (!activeSubscription || !activeSubscription.plan) {
        return res.status(403).json({
          success: false,
          message: 'No active subscription found. Please subscribe to a plan to feature properties.'
        });
      }

      const plan = activeSubscription.plan;
      const featuredLimit = plan.limits?.featuredListings || 0;

      // Check if plan allows featured listings
      if (featuredLimit === 0 && plan.identifier !== 'enterprise' && plan.identifier !== 'premium') {
        return res.status(403).json({
          success: false,
          message: `Your current plan (${plan.name}) does not include featured listings. Please upgrade to feature properties.`,
          upgradeRequired: true
        });
      }

      // For plans with limited featured listings, check current count
      if (featuredLimit > 0) {
        const currentFeaturedCount = await Property.countDocuments({
          owner: property.owner,
          featured: true,
          _id: { $ne: id } // Exclude current property
        });

        if (currentFeaturedCount >= featuredLimit) {
          return res.status(403).json({
            success: false,
            message: `Featured listing limit reached (${featuredLimit}). Please upgrade your plan or unfeature other properties.`,
            limitReached: true,
            currentCount: currentFeaturedCount,
            maxLimit: featuredLimit
          });
        }
      }
    }

    // Update property featured status
    const updatedProperty = await Property.findByIdAndUpdate(
      id,
      { featured, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('owner', 'profile.firstName profile.lastName profile.phone email role');

    res.json({
      success: true,
      data: { property: updatedProperty },
      message: `Property ${featured ? 'promoted' : 'unpromoted'} successfully`
    });
  } catch (error) {
    console.error('Update property featured status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update property featured status'
    });
  }
}));

// @desc    Approve/Reject property
// @route   PATCH /api/properties/:id/approve
// @access  Private (Requires properties.approve permission)
router.patch('/:id/approve', authenticateToken, asyncHandler(async (req, res) => {
  // Check permission for property approval
  if (!hasPermission(req.user, PERMISSIONS.PROPERTIES_APPROVE)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to approve properties'
    });
  }

  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body; // action: 'approve' or 'reject'

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format'
      });
    }

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    // Find property
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Update property based on action
    const updateData = {
      updatedAt: new Date()
    };

    if (action === 'approve') {
      updateData.status = 'available';
      updateData.verified = true;
      updateData.approvedBy = req.user.id;
      updateData.approvedAt = new Date();
      updateData.rejectedBy = undefined;
      updateData.rejectionReason = undefined;
    } else {
      updateData.status = 'rejected';
      updateData.verified = false;
      updateData.rejectedBy = req.user.id;
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = rejectionReason || 'No reason provided';
      updateData.approvedBy = undefined;
    }

    const updatedProperty = await Property.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('owner', 'profile.firstName profile.lastName profile.phone email role')
      .populate('approvedBy', 'profile.firstName profile.lastName email')
      .populate('rejectedBy', 'profile.firstName profile.lastName email');

    res.json({
      success: true,
      data: { property: updatedProperty },
      message: `Property ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    console.error('Approve/reject property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process property approval'
    });
  }
}));

// @desc    Assign property to customer
// @route   POST /api/properties/:id/assign-customer
// @access  Private (Vendor/Agent/Admin)
router.post('/:id/assign-customer', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId, status, notes } = req.body;

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID format'
      });
    }

    // Find property first to check listing type
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Determine correct status based on listing type
    let correctStatus;
    if (property.listingType === 'sale') {
      correctStatus = 'sold';
    } else if (property.listingType === 'rent') {
      correctStatus = 'rented';
    } else if (property.listingType === 'lease') {
      correctStatus = 'leased';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid property listing type'
      });
    }

    // Validate that provided status matches listing type
    if (status && status !== correctStatus) {
      return res.status(400).json({
        success: false,
        message: `Property listed for ${property.listingType} should be marked as '${correctStatus}', not '${status}'`
      });
    }

    // Use the correct status
    const finalStatus = correctStatus;

    // Check if user owns this property or is admin/agent
    if (property.owner.toString() !== req.user.id.toString() &&
      !['admin', 'superadmin', 'agent'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to assign this property'
      });
    }

    // Verify customer exists and is a customer
    const User = require('../models/User');
    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    if (customer.role !== 'customer') {
      return res.status(400).json({
        success: false,
        message: 'Selected user is not a customer'
      });
    }

    // Update property status and assign to customer
    const updatedProperty = await Property.findByIdAndUpdate(
      id,
      {
        status: finalStatus,
        assignedTo: customerId,
        assignedAt: new Date(),
        assignedBy: req.user.id,
        assignmentNotes: notes || '',
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('owner', 'profile.firstName profile.lastName email')
      .populate('assignedTo', 'profile.firstName profile.lastName email');

    // Update vendor statistics if property is sold
    if (finalStatus === 'sold') {
      const Vendor = require('../models/Vendor');
      const vendor = await Vendor.findByUserId(property.owner);

      if (vendor) {
        // Initialize statistics if not exists
        if (!vendor.performance) {
          vendor.performance = {
            statistics: {},
            rating: { average: 0, count: 0 }
          };
        }
        if (!vendor.performance.statistics) {
          vendor.performance.statistics = {};
        }

        // Increment sold properties count
        vendor.performance.statistics.soldProperties =
          (vendor.performance.statistics.soldProperties || 0) + 1;

        // Calculate total revenue (sum of all sold properties)
        const soldProps = await Property.find({
          owner: property.owner,
          status: 'sold'
        }).select('price');

        const totalRevenue = soldProps.reduce((sum, prop) => {
          const price = parseFloat(prop.price.toString().replace(/[^0-9.]/g, ''));
          return sum + (isNaN(price) ? 0 : price);
        }, 0);

        vendor.performance.statistics.totalRevenue = totalRevenue;

        await vendor.save();
      }
    }

    // Optionally: Create a notification for the customer
    // TODO: Implement notification service

    res.json({
      success: true,
      data: { property: updatedProperty },
      message: `Property ${status} and assigned to customer successfully`
    });
  } catch (error) {
    console.error('Assign property to customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign property to customer'
    });
  }
}));

// @desc    Track property interaction (phone click, share)
// @route   POST /api/properties/:id/track-interaction
// @access  Private (customers only)
router.post('/:id/track-interaction', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { interactionType } = req.body;

    // Only track interactions from customers
    if (req.user.role !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Only customer interactions are tracked'
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format'
      });
    }

    // Validate interaction type (phone clicks, message clicks, and shares)
    const validInteractionTypes = ['clickedPhone', 'clickedMessage', 'sharedProperty'];
    if (!validInteractionTypes.includes(interactionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interaction type'
      });
    }

    // Find property
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Get PropertyView model for tracking
    const PropertyView = require('../models/PropertyView');

    // Create property view with interaction (customer only)
    const interactionData = {
      property: id,
      viewer: req.user.id, // Always set viewer since it's authenticated
      viewerRole: 'customer',
      sessionId: req.sessionID || req.headers['x-session-id'] || `customer-${Date.now()}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer || req.headers.referrer,
      [`interactions.${interactionType}`]: true
    };

    await PropertyView.create(interactionData);

    res.json({
      success: true,
      message: 'Interaction tracked successfully'
    });
  } catch (error) {
    console.error('Track interaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track interaction'
    });
  }
}));

// @desc    Get property interaction stats (phone clicks, message clicks, shares, favorites)
// @route   GET /api/properties/:id/interaction-stats
// @access  Private (property owner or admin)
router.get('/:id/interaction-stats', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format'
      });
    }

    // Find property
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if user owns this property or is admin
    const isOwner = property.owner.toString() === req.user.id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view interaction stats for this property'
      });
    }

    // Get interaction counts from PropertyView
    const [phoneClicks, messageClicks, shares, totalViews] = await Promise.all([
      PropertyView.countDocuments({
        property: id,
        'interactions.clickedPhone': true
      }),
      PropertyView.countDocuments({
        property: id,
        'interactions.clickedMessage': true
      }),
      PropertyView.countDocuments({
        property: id,
        'interactions.sharedProperty': true
      }),
      PropertyView.countDocuments({
        property: id
      })
    ]);

    // Get favorites count
    const Favorite = require('../models/Favorite');
    const favorites = await Favorite.countDocuments({ property: id });

    // Get unique viewers
    const uniqueViewers = await PropertyView.distinct('viewer', {
      property: id,
      viewer: { $ne: null }
    });

    res.json({
      success: true,
      data: {
        propertyId: id,
        stats: {
          views: totalViews,
          uniqueViewers: uniqueViewers.length,
          phoneClicks,
          messageClicks,
          shares,
          favorites
        }
      }
    });
  } catch (error) {
    console.error('Get property interaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get interaction stats'
    });
  }
}));

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  try {
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

    // Check if user owns this property, is the agent for this property, or is admin
    const isOwner = property.owner.toString() === req.user.id.toString();
    const isAgent = property.agent && property.agent.toString() === req.user.id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (!isOwner && !isAgent && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this property'
      });
    }

    // Delete property
    await Property.findByIdAndDelete(id);

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
}));

module.exports = router;