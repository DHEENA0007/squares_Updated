const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
const PropertyView = require('../models/PropertyView');
const Vendor = require('../models/Vendor');
const Subscription = require('../models/Subscription');
const Message = require('../models/Message');
const Review = require('../models/Review');
const { authenticateToken } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { PERMISSIONS, hasPermission } = require('../utils/permissions');

router.use(authenticateToken);

// Analytics Overview
router.get('/overview', asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'superadmin';
  const hasAnalyticsPermission = hasPermission(req.user, PERMISSIONS.ANALYTICS_VIEW);
  
  if (!isSuperAdmin && !hasAnalyticsPermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view analytics'
    });
  }

  const { dateRange = '30' } = req.query;
  const days = parseInt(dateRange);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [
    totalUsers,
    totalProperties,
    totalViews,
    totalRegistrations,
    totalRevenue,
    usersByRole,
    recentActivity
  ] = await Promise.all([
    User.countDocuments(),
    Property.countDocuments(),
    PropertyView.countDocuments({ viewedAt: { $gte: startDate } }),
    User.countDocuments({ createdAt: { $gte: startDate } }),
    Subscription.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]),
    User.find().sort({ createdAt: -1 }).limit(10)
      .select('email profile.firstName profile.lastName role createdAt')
  ]);

  res.json({
    success: true,
    data: {
      overview: {
        totalUsers,
        totalProperties,
        totalViews,
        totalRegistrations,
        totalRevenue: totalRevenue[0]?.total || 0
      },
      usersByRole,
      recentActivity
    }
  });
}));

// Property Views Analytics
router.get('/property-views', asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'superadmin';
  const hasAnalyticsPermission = hasPermission(req.user, PERMISSIONS.ANALYTICS_VIEW);
  
  if (!isSuperAdmin && !hasAnalyticsPermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view analytics'
    });
  }

  const { dateRange = '30', propertyId } = req.query;
  const days = parseInt(dateRange);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const matchCondition = { viewedAt: { $gte: startDate } };
  if (propertyId) matchCondition.property = propertyId;

  const [viewsByProperty, viewsByDate, viewerTypes, interactions] = await Promise.all([
    PropertyView.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$property',
          totalViews: { $sum: 1 },
          uniqueViewers: { $addToSet: '$viewer' }
        }
      },
      {
        $lookup: {
          from: 'properties',
          localField: '_id',
          foreignField: '_id',
          as: 'propertyData'
        }
      },
      { $unwind: '$propertyData' },
      {
        $project: {
          propertyId: '$_id',
          propertyTitle: '$propertyData.title',
          totalViews: 1,
          uniqueViewers: { $size: '$uniqueViewers' }
        }
      },
      { $sort: { totalViews: -1 } },
      { $limit: 20 }
    ]),
    PropertyView.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$viewedAt' } },
          views: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]),
    PropertyView.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            isRegistered: { $cond: [{ $ne: ['$viewer', null] }, 'registered', 'guest'] }
          },
          count: { $sum: 1 }
        }
      }
    ]),
    PropertyView.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalClicks: {
            $sum: {
              $add: [
                { $cond: ['$interactions.clickedPhone', 1, 0] },
                { $cond: ['$interactions.clickedEmail', 1, 0] },
                { $cond: ['$interactions.clickedWhatsApp', 1, 0] }
              ]
            }
          },
          phoneClicks: { $sum: { $cond: ['$interactions.clickedPhone', 1, 0] } },
          emailClicks: { $sum: { $cond: ['$interactions.clickedEmail', 1, 0] } },
          whatsappClicks: { $sum: { $cond: ['$interactions.clickedWhatsApp', 1, 0] } },
          galleryViews: { $sum: { $cond: ['$interactions.viewedGallery', 1, 0] } },
          shares: { $sum: { $cond: ['$interactions.sharedProperty', 1, 0] } }
        }
      }
    ])
  ]);

  res.json({
    success: true,
    data: {
      viewsByProperty,
      viewsByDate,
      viewerTypes,
      interactions: interactions[0] || {}
    }
  });
}));

// User Conversion Analytics
router.get('/user-conversion', asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'superadmin';
  const hasAnalyticsPermission = hasPermission(req.user, PERMISSIONS.ANALYTICS_VIEW);
  
  if (!isSuperAdmin && !hasAnalyticsPermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view analytics'
    });
  }

  const { dateRange = '30' } = req.query;
  const days = parseInt(dateRange);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [guestViews, registeredViews, newRegistrations, conversionFunnel] = await Promise.all([
    PropertyView.countDocuments({
      viewedAt: { $gte: startDate },
      viewer: null
    }),
    PropertyView.countDocuments({
      viewedAt: { $gte: startDate },
      viewer: { $ne: null }
    }),
    User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]),
    PropertyView.aggregate([
      { $match: { viewedAt: { $gte: startDate } } },
      {
        $facet: {
          totalViews: [{ $count: 'count' }],
          viewersWithInteraction: [
            {
              $match: {
                $or: [
                  { 'interactions.clickedPhone': true },
                  { 'interactions.clickedEmail': true },
                  { 'interactions.clickedWhatsApp': true }
                ]
              }
            },
            { $count: 'count' }
          ],
          registeredAfterView: [
            {
              $lookup: {
                from: 'users',
                let: { sessionId: '$sessionId' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $ne: ['$$sessionId', null] },
                          { $gte: ['$createdAt', startDate] }
                        ]
                      }
                    }
                  }
                ],
                as: 'userData'
              }
            },
            { $match: { userData: { $ne: [] } } },
            { $count: 'count' }
          ]
        }
      }
    ])
  ]);

  const totalViews = guestViews + registeredViews;
  const conversionRate = totalViews > 0 
    ? ((newRegistrations.reduce((sum, day) => sum + day.count, 0) / totalViews) * 100).toFixed(2)
    : 0;

  res.json({
    success: true,
    data: {
      totalViews,
      guestViews,
      registeredViews,
      newRegistrations: newRegistrations.reduce((sum, day) => sum + day.count, 0),
      conversionRate: parseFloat(conversionRate),
      registrationsByDate: newRegistrations,
      conversionFunnel: conversionFunnel[0]
    }
  });
}));

// Traffic Analytics
router.get('/traffic', asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'superadmin';
  const hasAnalyticsPermission = hasPermission(req.user, PERMISSIONS.ANALYTICS_VIEW);
  
  if (!isSuperAdmin && !hasAnalyticsPermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view analytics'
    });
  }

  const { dateRange = '30' } = req.query;
  const days = parseInt(dateRange);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [trafficBySource, trafficByDevice, trafficByLocation, peakHours] = await Promise.all([
    PropertyView.aggregate([
      { $match: { viewedAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$referrer',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    PropertyView.aggregate([
      { $match: { viewedAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $cond: [
              { $regexMatch: { input: '$userAgent', regex: 'Mobile|Android|iPhone' } },
              'Mobile',
              'Desktop'
            ]
          },
          count: { $sum: 1 }
        }
      }
    ]),
    PropertyView.aggregate([
      { $match: { viewedAt: { $gte: startDate }, ipAddress: { $ne: null } } },
      {
        $group: {
          _id: '$ipAddress',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    PropertyView.aggregate([
      { $match: { viewedAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $hour: '$viewedAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ])
  ]);

  res.json({
    success: true,
    data: {
      trafficBySource,
      trafficByDevice,
      trafficByLocation,
      peakHours
    }
  });
}));

// User Engagement Analytics
router.get('/engagement', asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'superadmin';
  const hasAnalyticsPermission = hasPermission(req.user, PERMISSIONS.ANALYTICS_VIEW);
  
  if (!isSuperAdmin && !hasAnalyticsPermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view analytics'
    });
  }

  const { dateRange = '30' } = req.query;
  const days = parseInt(dateRange);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [activeUsers, messageActivity, reviewActivity, topContributors] = await Promise.all([
    User.aggregate([
      {
        $match: {
          lastLogin: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastLogin' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]),
    Message.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]),
    Review.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      },
      { $sort: { '_id': 1 } }
    ]),
    User.aggregate([
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
          localField: '_id',
          foreignField: 'user',
          as: 'reviews'
        }
      },
      {
        $project: {
          email: 1,
          'profile.firstName': 1,
          'profile.lastName': 1,
          role: 1,
          activityScore: {
            $add: [
              { $size: '$properties' },
              { $multiply: [{ $size: '$reviews' }, 2] }
            ]
          }
        }
      },
      { $sort: { activityScore: -1 } },
      { $limit: 10 }
    ])
  ]);

  res.json({
    success: true,
    data: {
      activeUsers,
      messageActivity,
      reviewActivity,
      topContributors
    }
  });
}));

// Detailed Property View Tracking
router.get('/property-views/:propertyId', asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'superadmin';
  const hasAnalyticsPermission = hasPermission(req.user, PERMISSIONS.ANALYTICS_VIEW);
  
  if (!isSuperAdmin && !hasAnalyticsPermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view analytics'
    });
  }

  const { propertyId } = req.params;
  const { dateRange = '30' } = req.query;
  const days = parseInt(dateRange);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const views = await PropertyView.find({
    property: propertyId,
    viewedAt: { $gte: startDate }
  })
    .populate('viewer', 'email profile.firstName profile.lastName role')
    .sort({ viewedAt: -1 })
    .limit(100);

  const aggregateData = await PropertyView.aggregate([
    {
      $match: {
        property: new mongoose.Types.ObjectId(propertyId),
        viewedAt: { $gte: startDate }
      }
    },
    {
      $facet: {
        totalViews: [{ $count: 'count' }],
        uniqueViewers: [
          { $group: { _id: '$viewer' } },
          { $count: 'count' }
        ],
        avgDuration: [
          { $group: { _id: null, avg: { $avg: '$viewDuration' } } }
        ],
        interactions: [
          {
            $group: {
              _id: null,
              phoneClicks: { $sum: { $cond: ['$interactions.clickedPhone', 1, 0] } },
              emailClicks: { $sum: { $cond: ['$interactions.clickedEmail', 1, 0] } },
              whatsappClicks: { $sum: { $cond: ['$interactions.clickedWhatsApp', 1, 0] } },
              galleryViews: { $sum: { $cond: ['$interactions.viewedGallery', 1, 0] } },
              shares: { $sum: { $cond: ['$interactions.sharedProperty', 1, 0] } }
            }
          }
        ]
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      views,
      aggregateData: aggregateData[0]
    }
  });
}));

module.exports = router;
