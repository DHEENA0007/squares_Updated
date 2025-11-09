const express = require('express');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const Property = require('../models/Property');
const Favorite = require('../models/Favorite');
const Message = require('../models/Message');
const router = express.Router();

// @desc    Get search suggestions (public endpoint)
// @route   GET /api/customer/search/suggestions
// @access  Public
router.get('/search/suggestions', asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.json({ suggestions: [] });
  }

  const searchRegex = new RegExp(q, 'i');
  
  // Get unique locations and property titles
  const [locationMatches, propertyMatches] = await Promise.all([
    Property.aggregate([
      {
        $match: {
          status: { $in: ['available', 'active'] },
          $or: [
            { 'address.city': searchRegex },
            { 'address.state': searchRegex },
            { 'address.locality': searchRegex },
            { 'address.pincode': searchRegex }
          ]
        }
      },
      {
        $group: {
          _id: {
            city: '$address.city',
            state: '$address.state',
            locality: '$address.locality'
          },
          count: { $sum: 1 }
        }
      },
      { $limit: 5 }
    ]),
    Property.find({
      status: { $in: ['available', 'active'] },
      $or: [
        { title: searchRegex },
        { description: searchRegex }
      ]
    })
    .select('title address type')
    .limit(5)
    .lean()
  ]);

  const suggestions = [];

  // Add location suggestions
  locationMatches.forEach(loc => {
    const locationParts = [];
    if (loc._id.locality) locationParts.push(loc._id.locality);
    if (loc._id.city) locationParts.push(loc._id.city);
    if (loc._id.state) locationParts.push(loc._id.state);
    
    suggestions.push({
      type: 'location',
      title: locationParts.join(', '),
      subtitle: `${loc.count} properties`,
      icon: 'MapPin',
      query: locationParts[0] || ''
    });
  });

  // Add property suggestions
  propertyMatches.forEach(prop => {
    const locationStr = [prop.address?.locality, prop.address?.city]
      .filter(Boolean)
      .join(', ');
    
    suggestions.push({
      type: 'property',
      title: prop.title,
      subtitle: locationStr,
      icon: 'Home',
      query: prop.title
    });
  });

  res.json({ suggestions: suggestions.slice(0, 8) });
}));

// Apply auth middleware to all routes below
router.use(authenticateToken);

// @desc    Get customer dashboard data
// @route   GET /api/dashboard/customer
// @access  Private
router.get('/dashboard', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // Get current date and first day of current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get customer statistics
  const [
    // Properties the user has viewed (we'll track this via favorites for now)
    savedFavorites,
    savedFavoritesLastMonth,
    // Properties owned by user OR assigned to user
    myProperties,
    myPropertiesLastMonth,
    // Inquiries sent by user
    activeInquiries,
    activeInquiriesLastMonth,
    // Unread messages
    unreadMessages,
    totalMessages
  ] = await Promise.all([
    // Current month favorites
    Favorite.countDocuments({ 
      user: userId,
      createdAt: { $gte: firstDayOfMonth }
    }),
    // Last month favorites
    Favorite.countDocuments({ 
      user: userId,
      createdAt: { 
        $gte: firstDayOfLastMonth,
        $lte: lastDayOfLastMonth
      }
    }),
    // Current month properties (owned OR assigned)
    Property.countDocuments({ 
      $or: [{ owner: userId }, { assignedTo: userId }],
      createdAt: { $gte: firstDayOfMonth }
    }),
    // Last month properties (owned OR assigned)
    Property.countDocuments({ 
      $or: [{ owner: userId }, { assignedTo: userId }],
      createdAt: { 
        $gte: firstDayOfLastMonth,
        $lte: lastDayOfLastMonth
      }
    }),
    // Current month inquiries
    Message.countDocuments({ 
      sender: userId,
      createdAt: { $gte: firstDayOfMonth }
    }),
    // Last month inquiries
    Message.countDocuments({ 
      sender: userId,
      createdAt: { 
        $gte: firstDayOfLastMonth,
        $lte: lastDayOfLastMonth
      }
    }),
    // Unread messages
    Message.countDocuments({ 
      recipient: userId,
      isRead: false
    }),
    // Total messages
    Message.countDocuments({ 
      $or: [{ sender: userId }, { recipient: userId }]
    })
  ]);

  // Calculate change percentages
  const calculateChange = (current, previous) => {
    if (previous === 0) {
      return current > 0 ? '+100%' : 'No change';
    }
    const change = ((current - previous) / previous * 100).toFixed(1);
    return change > 0 ? `+${change}%` : `${change}%`;
  };

  // Get total counts for additional stats (owned OR assigned properties)
  const [totalFavorites, totalProperties] = await Promise.all([
    Favorite.countDocuments({ user: userId }),
    Property.countDocuments({ $or: [{ owner: userId }, { assignedTo: userId }] })
  ]);

  // Build stats object
  const stats = {
    propertiesViewed: totalFavorites,
    propertiesViewedChange: calculateChange(savedFavorites, savedFavoritesLastMonth),
    savedFavorites: totalFavorites,
    savedFavoritesChange: calculateChange(savedFavorites, savedFavoritesLastMonth),
    activeInquiries: activeInquiries,
    activeInquiriesChange: calculateChange(activeInquiries, activeInquiriesLastMonth),
    myProperties: totalProperties,
    myPropertiesChange: calculateChange(myProperties, myPropertiesLastMonth)
  };

  // Get recent activities
  const recentActivities = [];

  // Recent favorites
  const recentFavorites = await Favorite.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('property', 'title address.city');

  recentActivities.push(...recentFavorites
    .filter(fav => fav.property) // Filter out null properties
    .map(favorite => ({
      _id: favorite._id,
      type: 'favorite',
      message: `Saved ${favorite.property.title}`,
      property: favorite.property.title,
      time: favorite.createdAt,
      icon: 'Heart',
      propertyId: favorite.property._id,
      metadata: {
        location: favorite.property.address?.city || 'Unknown'
      }
    }))
  );

  // Recent inquiries
  const recentInquiries = await Message.find({ sender: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('property', 'title');

  recentActivities.push(...recentInquiries
    .filter(inquiry => inquiry.property) // Filter out null properties
    .map(inquiry => ({
      _id: inquiry._id,
      type: 'inquiry',
      message: `Sent inquiry for ${inquiry.property.title}`,
      property: inquiry.property.title,
      time: inquiry.createdAt,
      icon: 'MessageSquare',
      propertyId: inquiry.property._id,
      metadata: {
        subject: inquiry.subject
      }
    }))
  );

  // Recent property posts
  const recentPropertyPosts = await Property.find({ owner: userId })
    .sort({ createdAt: -1 })
    .limit(3)
    .select('title createdAt status');

  recentActivities.push(...recentPropertyPosts.map(property => ({
    _id: property._id,
    type: 'property_posted',
    message: `Posted property: ${property.title}`,
    property: property.title,
    time: property.createdAt,
    icon: 'Home',
    propertyId: property._id,
    metadata: {
      status: property.status
    }
  })));

  // Sort activities by time
  recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time));

  // Get recommended properties (simple recommendation based on user's favorites)
  const favoriteProperties = await Favorite.find({ user: userId })
    .populate('property')
    .limit(10);

  // Extract property types and cities from favorites
  const favoritePropertyTypes = [...new Set(
    favoriteProperties
      .filter(fav => fav.property)
      .map(fav => fav.property.propertyType)
  )];

  const favoriteCities = [...new Set(
    favoriteProperties
      .filter(fav => fav.property && fav.property.address)
      .map(fav => fav.property.address.city)
  )];

  // Find recommended properties
  const recommendedProperties = await Property.find({
    $and: [
      { owner: { $ne: userId } }, // Not user's own properties
      { status: { $in: ['available', 'active'] } },
      { verified: true },
      {
        $or: [
          favoritePropertyTypes.length > 0 ? { propertyType: { $in: favoritePropertyTypes } } : {},
          favoriteCities.length > 0 ? { 'address.city': { $in: favoriteCities } } : {}
        ]
      }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(6)
    .select('title propertyType listingType price bedrooms bathrooms area address images');

  const formattedRecommendations = recommendedProperties.map(property => ({
    _id: property._id,
    title: property.title,
    location: `${property.address?.locality || ''}, ${property.address?.city || ''}`.trim(),
    price: property.price ? `₹${(property.price / 100000).toFixed(2)}L` : 'Price on request',
    rating: 4.5, // Default rating
    image: property.images && property.images.length > 0 ? property.images[0].url : null,
    propertyType: property.propertyType,
    listingType: property.listingType,
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    area: property.area?.builtUp || property.area?.carpet || property.area?.plot || 0
  }));

  // Quick stats for dashboard
  const quickStats = {
    favoritesCount: totalFavorites,
    messagesCount: totalMessages,
    propertiesCount: totalProperties,
    unreadMessages: unreadMessages
  };

  res.json({
    success: true,
    data: {
      stats,
      recentActivities: recentActivities.slice(0, 10),
      recommendedProperties: formattedRecommendations,
      quickStats
    }
  });
}));

// @desc    Get customer quick stats
// @route   GET /api/customer/quick-stats
// @access  Private
router.get('/quick-stats', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [totalFavorites, totalMessages, totalProperties, unreadMessages] = await Promise.all([
    Favorite.countDocuments({ user: userId }),
    Message.countDocuments({ $or: [{ sender: userId }, { recipient: userId }] }),
    Property.countDocuments({ owner: userId }),
    Message.countDocuments({ recipient: userId, isRead: false })
  ]);

  res.json({
    success: true,
    data: {
      favoritesCount: totalFavorites,
      messagesCount: totalMessages,
      propertiesCount: totalProperties,
      unreadMessages: unreadMessages
    }
  });
}));

// @desc    Get customer recent activities
// @route   GET /api/customer/activities
// @access  Private
router.get('/activities', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const recentActivities = [];

  // Recent favorites
  const recentFavorites = await Favorite.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('property', 'title address.city');

  recentActivities.push(...recentFavorites
    .filter(fav => fav.property)
    .map(favorite => ({
      _id: favorite._id,
      type: 'favorite',
      message: `Saved ${favorite.property.title}`,
      property: favorite.property.title,
      time: favorite.createdAt,
      icon: 'Heart',
      propertyId: favorite.property._id,
      metadata: {
        location: favorite.property.address?.city || 'Unknown'
      }
    }))
  );

  // Recent inquiries
  const recentInquiries = await Message.find({ sender: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('property', 'title');

  recentActivities.push(...recentInquiries
    .filter(inquiry => inquiry.property)
    .map(inquiry => ({
      _id: inquiry._id,
      type: 'inquiry',
      message: `Sent inquiry for ${inquiry.property.title}`,
      property: inquiry.property.title,
      time: inquiry.createdAt,
      icon: 'MessageSquare',
      propertyId: inquiry.property._id,
      metadata: {
        subject: inquiry.subject
      }
    }))
  );

  // Recent property posts
  const recentPropertyPosts = await Property.find({ owner: userId })
    .sort({ createdAt: -1 })
    .limit(3)
    .select('title createdAt status');

  recentActivities.push(...recentPropertyPosts.map(property => ({
    _id: property._id,
    type: 'property_posted',
    message: `Posted property: ${property.title}`,
    property: property.title,
    time: property.createdAt,
    icon: 'Home',
    propertyId: property._id,
    metadata: {
      status: property.status
    }
  })));

  // Sort activities by time
  recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time));

  res.json({
    success: true,
    data: recentActivities.slice(0, 10)
  });
}));

// @desc    Get recommended properties for customer
// @route   GET /api/customer/recommended-properties
// @access  Private
router.get('/recommended-properties', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 6 } = req.query;

  // Get user's favorites to base recommendations on
  const favoriteProperties = await Favorite.find({ user: userId })
    .populate('property')
    .limit(10);

  // Extract property types and cities from favorites
  const favoritePropertyTypes = [...new Set(
    favoriteProperties
      .filter(fav => fav.property)
      .map(fav => fav.property.propertyType)
  )];

  const favoriteCities = [...new Set(
    favoriteProperties
      .filter(fav => fav.property && fav.property.address)
      .map(fav => fav.property.address.city)
  )];

  // Find recommended properties
  const recommendedProperties = await Property.find({
    $and: [
      { owner: { $ne: userId } },
      { status: { $in: ['available', 'active'] } },
      { verified: true },
      {
        $or: [
          favoritePropertyTypes.length > 0 ? { propertyType: { $in: favoritePropertyTypes } } : {},
          favoriteCities.length > 0 ? { 'address.city': { $in: favoriteCities } } : {}
        ]
      }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .select('title propertyType listingType price bedrooms bathrooms area address images');

  const formattedRecommendations = recommendedProperties.map(property => ({
    _id: property._id,
    title: property.title,
    location: `${property.address?.locality || ''}, ${property.address?.city || ''}`.trim(),
    price: property.price ? `₹${(property.price / 100000).toFixed(2)}L` : 'Price on request',
    rating: 4.5,
    image: property.images && property.images.length > 0 ? property.images[0].url : null,
    propertyType: property.propertyType,
    listingType: property.listingType,
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    area: property.area?.builtUp || property.area?.carpet || property.area?.plot || 0
  }));

  res.json({
    success: true,
    data: formattedRecommendations
  });
}));

// @desc    Get customer properties stats
// @route   GET /api/customer/properties/stats
// @access  Private
router.get('/properties/stats', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Build filter for both owned and assigned properties
  const propertyFilter = { 
    $or: [
      { owner: userId },
      { assignedTo: userId }
    ]
  };

  // Get property IDs for this user
  const userProperties = await Property.find(propertyFilter).select('_id');
  const propertyIds = userProperties.map(p => p._id);

  // Get property statistics
  const [
    totalProperties,
    activeProperties,
    rentedProperties,
    soldProperties,
    draftProperties,
    pendingProperties,
    // Aggregated views
    propertiesData,
    // Count favorites from Favorite model
    totalFavorites
  ] = await Promise.all([
    Property.countDocuments(propertyFilter),
    Property.countDocuments({ ...propertyFilter, status: 'available' }),
    Property.countDocuments({ ...propertyFilter, status: 'rented' }),
    Property.countDocuments({ ...propertyFilter, status: 'sold' }),
    Property.countDocuments({ ...propertyFilter, status: 'draft' }),
    Property.countDocuments({ ...propertyFilter, status: 'pending' }),
    Property.aggregate([
      { $match: propertyFilter },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          totalInquiries: { $sum: '$inquiries' }
        }
      }
    ]),
    Favorite.countDocuments({ property: { $in: propertyIds } })
  ]);

  const aggregatedData = propertiesData.length > 0 ? propertiesData[0] : {
    totalViews: 0,
    totalInquiries: 0
  };

  // Calculate averages
  const averageViews = totalProperties > 0 ? Math.round(aggregatedData.totalViews / totalProperties) : 0;
  const averageInquiries = totalProperties > 0 ? Math.round(aggregatedData.totalInquiries / totalProperties) : 0;
  const conversionRate = aggregatedData.totalViews > 0 
    ? ((aggregatedData.totalInquiries / aggregatedData.totalViews) * 100).toFixed(2) 
    : 0;

  const stats = {
    totalProperties,
    activeProperties,
    rentedProperties,
    soldProperties,
    draftProperties,
    pendingProperties,
    totalViews: aggregatedData.totalViews,
    totalInquiries: aggregatedData.totalInquiries,
    totalFavorites: totalFavorites,
    totalRevenue: 0, // TODO: Implement revenue tracking
    monthlyRevenue: 0, // TODO: Implement monthly revenue
    averageViews,
    averageInquiries,
    conversionRate: parseFloat(conversionRate)
  };

  res.json({
    success: true,
    data: stats
  });
}));

// @desc    Get customer properties with filters
// @route   GET /api/customer/properties
// @access  Private
router.get('/properties', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    page = 1,
    limit = 10,
    status,
    search,
    propertyType,
    listingType,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build filter - Include both owned properties AND properties assigned to customer
  const filter = { 
    $or: [
      { owner: userId },
      { assignedTo: userId }
    ]
  };

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { 'address.city': { $regex: search, $options: 'i' } }
    ];
  }

  if (propertyType && propertyType !== 'all') {
    filter.propertyType = propertyType;
  }

  if (listingType && listingType !== 'all') {
    filter.listingType = listingType;
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Get properties and total count
  const [properties, totalCount] = await Promise.all([
    Property.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('title description propertyType status listingType price bedrooms bathrooms area address images views inquiries favorites featured verified createdAt updatedAt'),
    Property.countDocuments(filter)
  ]);

  // Format properties for response
  const formattedProperties = properties.map(property => ({
    _id: property._id,
    title: property.title,
    description: property.description,
    type: property.propertyType,
    status: property.status,
    listingType: property.listingType,
    price: property.price,
    area: property.area,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    address: property.address,
    amenities: property.amenities || [],
    images: property.images || [],
    views: property.views || 0,
    inquiries: property.inquiries || 0,
    favorites: property.favorites || 0,
    featured: property.featured || false,
    verified: property.verified || false,
    availability: property.availability || 'immediate',
    postedDate: property.createdAt,
    lastUpdated: property.updatedAt,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    analytics: {
      weeklyViews: property.views || 0, // TODO: Implement weekly tracking
      weeklyInquiries: property.inquiries || 0,
      avgResponseTime: 'N/A',
      lastActivityDate: property.updatedAt,
      conversionRate: property.views > 0 ? ((property.inquiries / property.views) * 100).toFixed(2) : 0,
      totalLeads: property.inquiries || 0
    }
  }));

  const totalPages = Math.ceil(totalCount / parseInt(limit));

  res.json({
    success: true,
    data: {
      properties: formattedProperties,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProperties: totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
        limit: parseInt(limit)
      }
    }
  });
}));

// @desc    Get customer owned properties (purchased/rented)
// @route   GET /api/customer/owned-properties
// @access  Private
router.get('/owned-properties', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    page = 1,
    limit = 10,
    status,
    search,
    sortBy = 'assignedAt',
    sortOrder = 'desc'
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build filter - Only properties assigned to the customer (purchased/rented)
  const filter = { 
    assignedTo: userId,
    status: { $in: ['sold', 'rented'] } // Only show sold or rented properties
  };

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { 'address.city': { $regex: search, $options: 'i' } }
    ];
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Get properties and total count
  const [properties, totalCount] = await Promise.all([
    Property.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('owner', 'email profile')
      .populate('assignedBy', 'email profile')
      .select('title description type status listingType price bedrooms bathrooms area address images assignedAt assignedBy owner')
      .lean(),
    Property.countDocuments(filter)
  ]);

  // Get review information for each property
  const Review = require('../models/Review');
  const propertyIds = properties.map(p => p._id);
  
  const reviews = await Review.find({
    client: userId,
    property: { $in: propertyIds },
    reviewType: 'property'
  }).select('property rating title comment createdAt').lean();

  const reviewMap = new Map();
  reviews.forEach(review => {
    reviewMap.set(review.property.toString(), review);
  });

  // Format properties for response
  const formattedProperties = properties.map(property => {
    const review = reviewMap.get(property._id.toString());
    
    return {
      _id: property._id,
      title: property.title,
      description: property.description,
      type: property.type,
      status: property.status,
      listingType: property.listingType,
      price: property.price,
      area: property.area,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      address: property.address,
      images: property.images || [],
      assignedAt: property.assignedAt,
      assignedBy: property.assignedBy ? {
        _id: property.assignedBy._id,
        name: property.assignedBy.profile?.firstName 
          ? `${property.assignedBy.profile.firstName} ${property.assignedBy.profile.lastName || ''}`
          : property.assignedBy.email,
        email: property.assignedBy.email
      } : null,
      owner: property.owner ? {
        _id: property.owner._id,
        name: property.owner.profile?.firstName 
          ? `${property.owner.profile.firstName} ${property.owner.profile.lastName || ''}`
          : property.owner.email,
        email: property.owner.email,
        phone: property.owner.profile?.phone
      } : null,
      hasReviewed: !!review,
      reviewId: review?._id,
      review: review ? {
        _id: review._id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        createdAt: review.createdAt
      } : null
    };
  });

  const totalPages = Math.ceil(totalCount / parseInt(limit));

  res.json({
    success: true,
    data: {
      properties: formattedProperties,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProperties: totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
        limit: parseInt(limit)
      }
    }
  });
}));

module.exports = router;
