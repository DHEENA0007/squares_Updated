const express = require('express');
const User = require('../models/User');
const Property = require('../models/Property');
const Message = require('../models/Message');
const Favorite = require('../models/Favorite');
const Subscription = require('../models/Subscription');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// @desc    Get customer dashboard data
// @route   GET /api/dashboard/customer
// @access  Private
router.get('/customer', asyncHandler(async (req, res) => {
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
    // Properties owned by user
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
    // Current month properties
    Property.countDocuments({
      owner: userId,
      createdAt: { $gte: firstDayOfMonth }
    }),
    // Last month properties
    Property.countDocuments({
      owner: userId,
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

  // Get total counts for additional stats
  const [totalFavorites, totalProperties] = await Promise.all([
    Favorite.countDocuments({ user: userId }),
    Property.countDocuments({ owner: userId })
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
  const recommendedQuery = {
    owner: { $ne: userId },
    status: { $in: ['available', 'active'] },
    verified: true
  };

  // Add OR condition only if we have favorites data
  if (favoritePropertyTypes.length > 0 || favoriteCities.length > 0) {
    const orConditions = [];
    if (favoritePropertyTypes.length > 0) {
      orConditions.push({ propertyType: { $in: favoritePropertyTypes } });
    }
    if (favoriteCities.length > 0) {
      orConditions.push({ 'address.city': { $in: favoriteCities } });
    }
    if (orConditions.length > 0) {
      recommendedQuery.$or = orConditions;
    }
  }

  const recommendedProperties = await Property.find(recommendedQuery)
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

// @desc    Get dashboard statistics and recent activities
// @route   GET /api/dashboard
// @access  Private/Admin
router.get('/', asyncHandler(async (req, res) => {
  // Only admin can access dashboard
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  // Get current date and first day of current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get total counts
  const [
    totalUsers,
    totalProperties,
    totalMessages,
    totalFavorites,
    activeProperties,
    pendingProperties,
    soldProperties,
    newUsersThisMonth,
    newPropertiesThisMonth,
    newUsersLastMonth,
    newPropertiesLastMonth,
    // Revenue calculations from subscriptions
    totalRevenue,
    revenueThisMonth,
    revenueLastMonth,
    dailyRevenue
  ] = await Promise.all([
    // Exclude admin users from total count
    User.countDocuments({ role: { $nin: ['admin', 'superadmin', 'subadmin'] } }),
    Property.countDocuments(),
    Message.countDocuments(),
    Favorite.countDocuments(),
    Property.countDocuments({ status: 'available' }),
    Property.countDocuments({ status: 'pending' }),
    Property.countDocuments({ status: { $in: ['sold', 'rented', 'leased'] } }),
    // Exclude admin users from this month count
    User.countDocuments({
      createdAt: { $gte: firstDayOfMonth },
      role: { $nin: ['admin', 'superadmin', 'subadmin'] }
    }),
    Property.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
    // Exclude admin users from last month count
    User.countDocuments({
      createdAt: {
        $gte: firstDayOfLastMonth,
        $lte: lastDayOfLastMonth
      },
      role: { $nin: ['admin', 'superadmin', 'subadmin'] }
    }),
    Property.countDocuments({
      createdAt: {
        $gte: firstDayOfLastMonth,
        $lte: lastDayOfLastMonth
      }
    }),
    // Calculate total revenue - sum subscription amounts + addon payments
    Subscription.aggregate([
      {
        $match: {
          status: { $in: ['active', 'expired'] }
        }
      },
      {
        $project: {
          subscriptionAmount: '$amount',
          addonRevenue: {
            $sum: {
              $map: {
                input: { $ifNull: ['$paymentHistory', []] },
                as: 'payment',
                in: {
                  $cond: [
                    { $eq: ['$$payment.type', 'addon_purchase'] },
                    { $ifNull: ['$$payment.amount', 0] },
                    0
                  ]
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalSubscriptionRevenue: { $sum: '$subscriptionAmount' },
          totalAddonRevenue: { $sum: '$addonRevenue' }
        }
      },
      {
        $project: {
          totalAmount: { $add: ['$totalSubscriptionRevenue', '$totalAddonRevenue'] }
        }
      }
    ]).then(result => result.length > 0 ? result[0].totalAmount : 0),
    // Calculate revenue this month - subscriptions + addons paid this month
    Subscription.aggregate([
      {
        $match: {
          status: { $in: ['active', 'expired'] }
        }
      },
      {
        $project: {
          subscriptionAmount: {
            $cond: [
              {
                $or: [
                  { $gte: ['$lastPaymentDate', firstDayOfMonth] },
                  {
                    $and: [
                      { $not: ['$lastPaymentDate'] },
                      { $gte: ['$createdAt', firstDayOfMonth] }
                    ]
                  }
                ]
              },
              '$amount',
              0
            ]
          },
          addonRevenue: {
            $sum: {
              $map: {
                input: { $ifNull: ['$paymentHistory', []] },
                as: 'payment',
                in: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$$payment.type', 'addon_purchase'] },
                        { $gte: ['$$payment.date', firstDayOfMonth] }
                      ]
                    },
                    { $ifNull: ['$$payment.amount', 0] },
                    0
                  ]
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalSubscriptionRevenue: { $sum: '$subscriptionAmount' },
          totalAddonRevenue: { $sum: '$addonRevenue' }
        }
      },
      {
        $project: {
          totalAmount: { $add: ['$totalSubscriptionRevenue', '$totalAddonRevenue'] }
        }
      }
    ]).then(result => result.length > 0 ? result[0].totalAmount : 0),
    // Calculate revenue last month - subscriptions + addons paid last month
    Subscription.aggregate([
      {
        $match: {
          status: { $in: ['active', 'expired'] }
        }
      },
      {
        $project: {
          subscriptionAmount: {
            $cond: [
              {
                $or: [
                  {
                    $and: [
                      { $gte: ['$lastPaymentDate', firstDayOfLastMonth] },
                      { $lt: ['$lastPaymentDate', firstDayOfMonth] }
                    ]
                  },
                  {
                    $and: [
                      { $not: ['$lastPaymentDate'] },
                      { $gte: ['$createdAt', firstDayOfLastMonth] },
                      { $lt: ['$createdAt', firstDayOfMonth] }
                    ]
                  }
                ]
              },
              '$amount',
              0
            ]
          },
          addonRevenue: {
            $sum: {
              $map: {
                input: { $ifNull: ['$paymentHistory', []] },
                as: 'payment',
                in: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$$payment.type', 'addon_purchase'] },
                        { $gte: ['$$payment.date', firstDayOfLastMonth] },
                        { $lt: ['$$payment.date', firstDayOfMonth] }
                      ]
                    },
                    { $ifNull: ['$$payment.amount', 0] },
                    0
                  ]
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalSubscriptionRevenue: { $sum: '$subscriptionAmount' },
          totalAddonRevenue: { $sum: '$addonRevenue' }
        }
      },
      {
        $project: {
          totalAmount: { $add: ['$totalSubscriptionRevenue', '$totalAddonRevenue'] }
        }
      }
    ]).then(result => result.length > 0 ? result[0].totalAmount : 0),
    // Calculate daily revenue for the last 30 days
    Subscription.aggregate([
      {
        $match: {
          status: { $in: ['active', 'expired'] }
        }
      },
      {
        $project: {
          payments: {
            $concatArrays: [
              // Subscription payments
              [{
                amount: '$amount',
                date: { $ifNull: ['$lastPaymentDate', '$createdAt'] },
                type: 'subscription'
              }],
              // Addon payments
              {
                $map: {
                  input: { $ifNull: ['$paymentHistory', []] },
                  as: 'payment',
                  in: {
                    amount: { $ifNull: ['$$payment.amount', 0] },
                    date: '$$payment.date',
                    type: 'addon'
                  }
                }
              }
            ]
          }
        }
      },
      { $unwind: '$payments' },
      {
        $match: {
          'payments.date': { $gte: firstDayOfLastMonth } // Fetch enough data
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$payments.date' } },
          amount: { $sum: '$payments.amount' }
        }
      },
      { $sort: { '_id': 1 } }
    ])
  ]);

  // Calculate engagement rate (favorites per property)
  const engagementRate = totalProperties > 0 ? (totalFavorites / totalProperties) * 100 : 0;

  // Get recent subscription activities
  const recentSubscriptions = await Subscription.find({
    status: { $in: ['active', 'expired'] },
    lastPaymentDate: { $exists: true }
  })
    .sort({ lastPaymentDate: -1 })
    .limit(3)
    .populate('user', 'email profile.firstName profile.lastName')
    .populate('plan', 'name price');

  // Get recent activities
  const recentActivities = [];

  // Recent user registrations
  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('email createdAt profile.firstName profile.lastName');

  recentActivities.push(...recentUsers.map(user => ({
    _id: user._id,
    type: 'user_registered',
    description: `New user registered: ${user.profile?.firstName || 'Unknown'} ${user.profile?.lastName || 'User'}`,
    timestamp: user.createdAt,
    metadata: {
      email: user.email,
      name: `${user.profile?.firstName || 'Unknown'} ${user.profile?.lastName || 'User'}`
    }
  })));

  // Recent property listings
  const recentProperties = await Property.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title createdAt status listingType')
    .populate('owner', 'email profile.firstName profile.lastName');

  recentActivities.push(...recentProperties.map(property => ({
    _id: property._id,
    type: 'property_listed',
    description: `New property listed: ${property.title}`,
    timestamp: property.createdAt,
    metadata: {
      title: property.title,
      listingType: property.listingType,
      ownerName: property.owner ? `${property.owner.profile?.firstName || 'Unknown'} ${property.owner.profile?.lastName || 'User'}` : 'Unknown User'
    }
  })));

  // Recent subscription purchases
  recentActivities.push(...recentSubscriptions
    .filter(subscription => subscription.plan && subscription.user) // Filter out subscriptions with null plans or users
    .map(subscription => ({
      _id: subscription._id,
      type: 'subscription_purchased',
      description: `Subscription purchased: ${subscription.plan.name}`,
      timestamp: subscription.lastPaymentDate || subscription.createdAt,
      metadata: {
        planName: subscription.plan.name,
        amount: subscription.amount,
        userName: `${subscription.user.profile?.firstName || 'Unknown'} ${subscription.user.profile?.lastName || 'User'}`,
        email: subscription.user.email
      }
    })));

  // Recent messages
  const recentMessages = await Message.find()
    .sort({ createdAt: -1 })
    .limit(3)
    .select('subject createdAt')
    .populate('sender', 'profile.firstName profile.lastName')
    .populate('recipient', 'profile.firstName profile.lastName');

  recentActivities.push(...recentMessages.map(message => ({
    _id: message._id,
    type: 'inquiry_received',
    description: `New inquiry: ${message.subject}`,
    timestamp: message.createdAt,
    metadata: {
      subject: message.subject,
      senderName: message.sender ? `${message.sender.profile?.firstName || 'Unknown'} ${message.sender.profile?.lastName || 'User'}` : 'Unknown User',
      recipientName: message.recipient ? `${message.recipient.profile?.firstName || 'Unknown'} ${message.recipient.profile?.lastName || 'User'}` : 'Unknown User'
    }
  })));

  // Sort activities by timestamp
  recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Prepare response
  const stats = {
    totalUsers,
    totalProperties,
    totalRevenue: totalRevenue || 0,
    activeListings: activeProperties,
    pendingProperties,
    soldProperties,
    newUsersThisMonth,
    newPropertiesThisMonth,
    revenueThisMonth: revenueThisMonth || 0,
    engagementRate: Math.round(engagementRate * 10) / 10, // Round to 1 decimal
    // Growth percentages
    userGrowth: newUsersLastMonth > 0 ?
      Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100 * 10) / 10 :
      (newUsersThisMonth > 0 ? 100 : 0),
    propertyGrowth: newPropertiesLastMonth > 0 ?
      Math.round(((newPropertiesThisMonth - newPropertiesLastMonth) / newPropertiesLastMonth) * 100 * 10) / 10 :
      (newPropertiesThisMonth > 0 ? 100 : 0),
    revenueGrowth: revenueLastMonth > 0 ?
      Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 * 10) / 10 :
      (revenueThisMonth > 0 ? 100 : 0),
    dailyRevenue: dailyRevenue.map(item => ({
      date: item._id,
      amount: item.amount
    }))
  };

  res.json({
    success: true,
    data: {
      stats,
      recentActivities: recentActivities.slice(0, 10) // Return top 10 activities
    }
  });
}));

module.exports = router;