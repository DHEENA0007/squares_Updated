const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
const PropertyView = require('../models/PropertyView');
const PageVisit = require('../models/PageVisit');
const Vendor = require('../models/Vendor');
const Subscription = require('../models/Subscription');
const Message = require('../models/Message');
const Review = require('../models/Review');
const Payment = require('../models/Payment');
const { authenticateToken } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { PERMISSIONS, hasPermission } = require('../utils/permissions');
const analyticsCalculatorJob = require('../jobs/analyticsCalculator');

// Helper to classify referrer domain
const classifyReferrer = (referrer) => {
  if (!referrer) return 'Direct';
  try {
    const url = new URL(referrer);
    const hostname = url.hostname.replace('www.', '').toLowerCase();

    // Own domains - internal traffic (show actual domain)
    const ownDomains = ['localhost', '127.0.0.1', 'buildhomemartsquares.com', 'app.buildhomemartsquares.com'];
    if (ownDomains.some(domain => hostname.includes(domain))) return 'buildhomemartsquares.com/v3';

    // Common sources classification
    if (hostname.includes('google')) return 'Google';
    if (hostname.includes('facebook') || hostname.includes('fb.com')) return 'Facebook';
    if (hostname.includes('instagram')) return 'Instagram';
    if (hostname.includes('twitter') || hostname.includes('x.com')) return 'Twitter/X';
    if (hostname.includes('linkedin')) return 'LinkedIn';
    if (hostname.includes('youtube')) return 'YouTube';
    if (hostname.includes('whatsapp')) return 'WhatsApp';
    if (hostname.includes('bing')) return 'Bing';
    if (hostname.includes('yahoo')) return 'Yahoo';

    return hostname;
  } catch {
    return 'Direct';
  }
};

router.use(authenticateToken);

// Get analytics job status (for debugging)
router.get('/job-status', asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'superadmin';

  if (!isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Only superadmins can access job status'
    });
  }

  const lastRunStats = analyticsCalculatorJob.getLastRunStats();

  res.json({
    success: true,
    data: {
      lastRunStats,
      jobRunning: analyticsCalculatorJob.isRunning
    }
  });
}));

// Trigger manual analytics recalculation (for debugging)
router.post('/recalculate', asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'superadmin';

  if (!isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Only superadmins can trigger recalculation'
    });
  }

  // Run the job manually
  await analyticsCalculatorJob.run();

  res.json({
    success: true,
    message: 'Analytics recalculation triggered',
    data: analyticsCalculatorJob.getLastRunStats()
  });
}));

// Get cached snapshot stats (from cron job)
router.get('/snapshot', asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'superadmin';
  const hasAnalyticsPermission = hasPermission(req.user, PERMISSIONS.ANALYTICS_VIEW);

  if (!isSuperAdmin && !hasAnalyticsPermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view analytics'
    });
  }

  const { dateRange = '30' } = req.query;
  const lastRunStats = analyticsCalculatorJob.getLastRunStats();

  // If no cached stats, run the calculation
  if (!lastRunStats) {
    await analyticsCalculatorJob.run();
    const newStats = analyticsCalculatorJob.getLastRunStats();

    if (!newStats) {
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate analytics'
      });
    }

    const rangeKey = `${dateRange}days`;
    return res.json({
      success: true,
      data: newStats.metrics[rangeKey] || newStats.metrics['30days'],
      meta: {
        calculatedAt: newStats.runAt,
        duration: newStats.duration,
        cached: false
      }
    });
  }

  // Return cached stats for the requested date range
  const rangeKey = `${dateRange}days`;
  const metrics = lastRunStats.metrics[rangeKey] || lastRunStats.metrics['30days'];

  res.json({
    success: true,
    data: metrics,
    meta: {
      calculatedAt: lastRunStats.runAt,
      duration: lastRunStats.duration,
      cached: true
    }
  });
}));

// V3 Consolidated Admin Analytics - Returns all analytics data in one call
router.get('/v3/admin', asyncHandler(async (req, res) => {
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

  try {
    // ========== OVERVIEW DATA ==========
    const [
      totalUsers,
      totalProperties,
      totalViews,
      totalRegistrations,
      totalRevenueStats,
      activeSubscriptions,
      usersByRole,
      recentActivity,
      uniqueViewers,
      avgViewDuration,
      totalInteractions
    ] = await Promise.all([
      User.countDocuments(),
      Property.countDocuments(),
      PropertyView.countDocuments({ viewedAt: { $gte: startDate } }),
      User.countDocuments({ createdAt: { $gte: startDate } }),
      Payment.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: startDate } } },
        {
          $lookup: {
            from: 'subscriptions',
            localField: 'subscription',
            foreignField: '_id',
            as: 'subscriptionDetails'
          }
        },
        {
          $unwind: {
            path: '$subscriptionDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {
            'subscriptionDetails.status': { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            subscription: {
              $sum: {
                $cond: [
                  { $in: ['$type', ['subscription_purchase', 'renewal', 'upgrade']] },
                  '$amount',
                  0
                ]
              }
            },
            addon: {
              $sum: {
                $cond: [
                  { $eq: ['$type', 'addon_purchase'] },
                  '$amount',
                  0
                ]
              }
            }
          }
        }
      ]),
      Subscription.countDocuments({ status: 'active', endDate: { $gt: new Date() } }),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      User.find().sort({ createdAt: -1 }).limit(10)
        .select('email profile.firstName profile.lastName role createdAt'),
      // Count unique viewers (by sessionId or viewer)
      PropertyView.aggregate([
        { $match: { viewedAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $ifNull: ['$viewer', '$sessionId'] }
          }
        },
        { $count: 'count' }
      ]),
      // Calculate average view duration
      PropertyView.aggregate([
        { $match: { viewedAt: { $gte: startDate }, viewDuration: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: '$viewDuration' }
          }
        }
      ]),
      // Count total interactions (clicks + shares)
      PropertyView.aggregate([
        { $match: { viewedAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalClicks: {
              $sum: {
                $add: [
                  { $cond: ['$interactions.clickedPhone', 1, 0] },
                  { $cond: ['$interactions.clickedMessage', 1, 0] },
                  { $cond: ['$interactions.clickedInterest', 1, 0] }
                ]
              }
            },
            totalShares: { $sum: { $cond: ['$interactions.sharedProperty', 1, 0] } }
          }
        }
      ])
    ]);

    // ========== PROPERTY VIEWS DATA ==========
    const matchCondition = { viewedAt: { $gte: startDate } };
    const [viewsByProperty, viewsByDate, viewerTypes, interactionsData] = await Promise.all([
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
                  { $cond: ['$interactions.clickedMessage', 1, 0] },
                  { $cond: ['$interactions.clickedInterest', 1, 0] }
                ]
              }
            },
            phoneClicks: { $sum: { $cond: ['$interactions.clickedPhone', 1, 0] } },
            messageClicks: { $sum: { $cond: ['$interactions.clickedMessage', 1, 0] } },
            interestClicks: { $sum: { $cond: ['$interactions.clickedInterest', 1, 0] } }
          }
        }
      ])
    ]);

    // ========== USER CONVERSION DATA ==========
    const [guestViews, registeredViews, newRegistrationsData] = await Promise.all([
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
      ])
    ]);

    const totalViewsConversion = guestViews + registeredViews;
    const newRegistrationsTotal = newRegistrationsData.reduce((sum, day) => sum + day.count, 0);
    const conversionRate = guestViews > 0
      ? ((newRegistrationsTotal / guestViews) * 100).toFixed(2)
      : 0;

    // ========== TRAFFIC DATA ==========
    let trafficBySource, trafficByDevice, peakHours, trafficByCountry, trafficByBrowser;

    const pageVisitCount = await PageVisit.countDocuments({ visitedAt: { $gte: startDate } });

    if (pageVisitCount > 0) {
      [trafficBySource, trafficByDevice, peakHours, trafficByCountry, trafficByBrowser] = await Promise.all([
        PageVisit.aggregate([
          { $match: { visitedAt: { $gte: startDate } } },
          {
            $group: {
              _id: '$referrerDomain',
              count: { $sum: 1 },
              uniqueVisitors: { $addToSet: '$visitorId' }
            }
          },
          {
            $project: {
              _id: 1,
              count: 1,
              uniqueVisitors: { $size: '$uniqueVisitors' }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        PageVisit.aggregate([
          { $match: { visitedAt: { $gte: startDate } } },
          {
            $group: {
              _id: '$deviceType',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } }
        ]),
        PageVisit.aggregate([
          { $match: { visitedAt: { $gte: startDate } } },
          {
            $group: {
              _id: { $hour: '$visitedAt' },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id': 1 } }
        ]),
        PageVisit.aggregate([
          { $match: { visitedAt: { $gte: startDate } } },
          {
            $group: {
              _id: '$country',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        PageVisit.aggregate([
          { $match: { visitedAt: { $gte: startDate } } },
          {
            $group: {
              _id: '$browser.name',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ])
      ]);
    } else {
      [trafficBySource, trafficByDevice, peakHours] = await Promise.all([
        PropertyView.aggregate([
          { $match: { viewedAt: { $gte: startDate } } },
          {
            $project: {
              referrerDomain: {
                $let: {
                  vars: {
                    parts: { $split: ['$referrer', '/'] }
                  },
                  in: {
                    $cond: [
                      { $gte: [{ $size: '$$parts' }, 3] },
                      { $arrayElemAt: ['$$parts', 2] },
                      { $ifNull: ['$referrer', 'Direct'] }
                    ]
                  }
                }
              }
            }
          },
          {
            $group: {
              _id: '$referrerDomain',
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
      trafficByCountry = [];
      trafficByBrowser = [];
    }

    if (trafficBySource && trafficBySource.length > 0) {
      const sourceMap = new Map();
      for (const source of trafficBySource) {
        const classified = source._id ? classifyReferrer('http://' + source._id) : 'Direct';
        const existing = sourceMap.get(classified) || { _id: classified, count: 0, uniqueVisitors: 0 };
        existing.count += source.count || 0;
        existing.uniqueVisitors += source.uniqueVisitors || 0;
        sourceMap.set(classified, existing);
      }
      trafficBySource = Array.from(sourceMap.values()).sort((a, b) => b.count - a.count);
    }

    // ========== ENGAGEMENT DATA ==========
    const [activeUsersData, activeUsersByRole, messageActivity, reviewActivity] = await Promise.all([
      User.aggregate([
        {
          $match: {
            'profile.lastLogin': { $gte: startDate },
            role: { $in: ['customer', 'vendor'] }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$profile.lastLogin' } },
            count: { $sum: 1 },
            customers: {
              $sum: { $cond: [{ $eq: ['$role', 'customer'] }, 1, 0] }
            },
            vendors: {
              $sum: { $cond: [{ $eq: ['$role', 'vendor'] }, 1, 0] }
            },
            userNames: {
              $push: {
                name: { $concat: ['$profile.firstName', ' ', '$profile.lastName'] },
                role: '$role'
              }
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      User.aggregate([
        {
          $match: {
            'profile.lastLogin': { $gte: startDate },
            role: { $in: ['customer', 'vendor'] }
          }
        },
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            users: {
              $push: {
                id: '$_id',
                name: { $concat: ['$profile.firstName', ' ', '$profile.lastName'] },
                email: '$email',
                lastLogin: '$profile.lastLogin'
              }
            }
          }
        }
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
      ])
    ]);

    const activeUsers = activeUsersData.map(day => ({
      _id: day._id,
      count: day.count,
      customers: day.customers,
      vendors: day.vendors,
      topUsers: day.userNames.slice(0, 5).map(u => u.name).filter(n => n && n.trim() !== ' ')
    }));

    const activeUsersSummary = {
      customers: activeUsersByRole.find(r => r._id === 'customer') || { count: 0, users: [] },
      vendors: activeUsersByRole.find(r => r._id === 'vendor') || { count: 0, users: [] }
    };

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalProperties,
          totalViews,
          totalRegistrations,
          totalRevenue: totalRevenueStats[0]?.total || 0,
          subscriptionRevenue: totalRevenueStats[0]?.subscription || 0,
          addonRevenue: totalRevenueStats[0]?.addon || 0,
          activeSubscriptions,
          usersByRole,
          recentActivity,
          uniqueViewers: uniqueViewers[0]?.count || 0,
          avgViewDuration: Math.round(avgViewDuration[0]?.avgDuration || 0),
          totalInteractions: (totalInteractions[0]?.totalClicks || 0) + (totalInteractions[0]?.totalShares || 0),
          guestViews,
          registeredViews
        },
        propertyViews: {
          viewsByProperty,
          viewsByDate,
          viewerTypes,
          interactions: interactionsData[0] || {}
        },
        conversion: {
          totalViews: totalViewsConversion,
          guestViews,
          registeredViews,
          newRegistrations: newRegistrationsTotal,
          conversionRate: parseFloat(conversionRate),
          registrationsByDate: newRegistrationsData
        },
        traffic: {
          trafficBySource,
          trafficByDevice,
          peakHours,
          trafficByCountry: trafficByCountry || [],
          trafficByBrowser: trafficByBrowser || []
        },
        engagement: {
          activeUsers,
          activeUsersSummary,
          messageActivity,
          reviewActivity
        }
      }
    });
  } catch (error) {
    console.error('Error fetching consolidated analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: error.message
    });
  }
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
                { $cond: ['$interactions.clickedMessage', 1, 0] },
                { $cond: ['$interactions.clickedInterest', 1, 0] }
              ]
            }
          },
          phoneClicks: { $sum: { $cond: ['$interactions.clickedPhone', 1, 0] } },
          messageClicks: { $sum: { $cond: ['$interactions.clickedMessage', 1, 0] } },
          interestClicks: { $sum: { $cond: ['$interactions.clickedInterest', 1, 0] } }
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
  // Calculate conversion rate based on guest views only (guest-to-user conversion)
  // Formula: (New Registrations / Guest Visits) * 100
  const conversionRate = guestViews > 0
    ? ((newRegistrations.reduce((sum, day) => sum + day.count, 0) / guestViews) * 100).toFixed(2)
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
        $project: {
          referrerDomain: {
            $let: {
              vars: {
                parts: { $split: ['$referrer', '/'] }
              },
              in: {
                $cond: [
                  { $gte: [{ $size: '$$parts' }, 3] },
                  { $arrayElemAt: ['$$parts', 2] },
                  { $ifNull: ['$referrer', 'Direct / Unknown'] }
                ]
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$referrerDomain',
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
    .populate('viewer', 'email profile.firstName profile.lastName profile.phone profile.location role status')
    .sort({ viewedAt: -1 })
    .limit(200);

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
              messageClicks: { $sum: { $cond: ['$interactions.clickedMessage', 1, 0] } }
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

// Get all property viewers with detailed information
router.get('/all-property-viewers', asyncHandler(async (req, res) => {
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

  const matchCondition = {
    viewedAt: { $gte: startDate }
  };

  if (propertyId) {
    matchCondition.property = new mongoose.Types.ObjectId(propertyId);
  }

  const viewers = await PropertyView.aggregate([
    { $match: matchCondition },
    {
      $lookup: {
        from: 'users',
        localField: 'viewer',
        foreignField: '_id',
        as: 'viewerDetails'
      }
    },
    {
      $lookup: {
        from: 'properties',
        localField: 'property',
        foreignField: '_id',
        as: 'propertyDetails'
      }
    },
    {
      $unwind: {
        path: '$propertyDetails',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: '$viewerDetails',
        preserveNullAndEmptyArrays: true
      }
    },
    // Filter out vendor/agent role users - only show customers and guests
    {
      $match: {
        $or: [
          { 'viewerDetails.role': 'customer' },
          { 'viewerDetails': { $exists: false } },
          { 'viewerDetails': null }
        ]
      }
    },
    {
      $project: {
        viewedAt: 1,
        viewDuration: 1,
        interactions: {
          clickedPhone: '$interactions.clickedPhone',
          clickedMessage: '$interactions.clickedMessage',
          sharedProperty: '$interactions.sharedProperty',
          clickedInterest: '$interactions.clickedInterest'
        },
        ipAddress: 1,
        userAgent: 1,
        referrer: 1,
        sessionId: 1,
        property: {
          _id: '$propertyDetails._id',
          title: '$propertyDetails.title',
          location: {
            $cond: {
              if: { $and: ['$propertyDetails.address.city', '$propertyDetails.address.state'] },
              then: {
                $concat: [
                  { $ifNull: ['$propertyDetails.address.locality', ''] },
                  { $cond: [{ $ne: ['$propertyDetails.address.locality', null] }, ', ', ''] },
                  { $ifNull: ['$propertyDetails.address.city', ''] },
                  ', ',
                  { $ifNull: ['$propertyDetails.address.state', ''] }
                ]
              },
              else: null
            }
          },
          price: '$propertyDetails.price'
        },
        viewer: {
          $cond: {
            if: { $ne: ['$viewerDetails', null] },
            then: {
              _id: '$viewerDetails._id',
              email: '$viewerDetails.email',
              firstName: '$viewerDetails.profile.firstName',
              lastName: '$viewerDetails.profile.lastName',
              phone: '$viewerDetails.profile.phone',
              registeredAt: '$viewerDetails.createdAt'
            },
            else: null
          }
        }
      }
    },
    // Group by viewer + property to merge duplicate entries
    {
      $group: {
        _id: {
          property: '$property._id',
          viewer: '$viewer._id',
          // For guests, group by sessionId or ipAddress
          sessionId: { $ifNull: ['$sessionId', '$ipAddress'] }
        },
        lastViewedAt: { $max: '$viewedAt' },
        firstViewedAt: { $min: '$viewedAt' },
        totalDuration: { $sum: { $ifNull: ['$viewDuration', 0] } },
        viewCount: { $sum: 1 },
        // Merge interactions - if any view has the interaction, it's true
        clickedPhone: { $max: { $cond: ['$interactions.clickedPhone', true, false] } },
        clickedMessage: { $max: { $cond: ['$interactions.clickedMessage', true, false] } },
        sharedProperty: { $max: { $cond: ['$interactions.sharedProperty', true, false] } },
        clickedInterest: { $max: { $cond: ['$interactions.clickedInterest', true, false] } },
        property: { $first: '$property' },
        viewer: { $first: '$viewer' },
        ipAddress: { $first: '$ipAddress' },
        referrer: { $first: '$referrer' }
      }
    },
    // Reshape the output
    {
      $project: {
        _id: 0,
        viewedAt: '$lastViewedAt',
        firstViewedAt: 1,
        viewDuration: '$totalDuration',
        viewCount: 1,
        interactions: {
          clickedPhone: '$clickedPhone',
          clickedMessage: '$clickedMessage',
          sharedProperty: '$sharedProperty',
          clickedInterest: '$clickedInterest'
        },
        property: 1,
        viewer: 1,
        ipAddress: 1,
        referrer: 1
      }
    },
    { $sort: { viewedAt: -1 } },
    { $limit: 500 }
  ]);

  // Summary - only count customers and guests
  const summary = await PropertyView.aggregate([
    { $match: matchCondition },
    {
      $lookup: {
        from: 'users',
        localField: 'viewer',
        foreignField: '_id',
        as: 'viewerDetails'
      }
    },
    {
      $unwind: {
        path: '$viewerDetails',
        preserveNullAndEmptyArrays: true
      }
    },
    // Filter out vendor/agent role
    {
      $match: {
        $or: [
          { 'viewerDetails.role': 'customer' },
          { 'viewerDetails': { $exists: false } },
          { 'viewerDetails': null }
        ]
      }
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: 1 },
        uniqueViewers: { $addToSet: '$viewer' },
        registeredViewers: {
          $sum: { $cond: [{ $ne: ['$viewer', null] }, 1, 0] }
        },
        guestViewers: {
          $sum: { $cond: [{ $eq: ['$viewer', null] }, 1, 0] }
        },
        totalInteractions: {
          $sum: {
            $add: [
              { $cond: ['$interactions.clickedPhone', 1, 0] },
              { $cond: ['$interactions.clickedMessage', 1, 0] },
              { $cond: ['$interactions.sharedProperty', 1, 0] },
              { $cond: ['$interactions.clickedInterest', 1, 0] }
            ]
          }
        },
        avgDuration: { $avg: '$viewDuration' }
      }
    },
    {
      $project: {
        totalViews: 1,
        uniqueViewers: { $size: '$uniqueViewers' },
        registeredViewers: 1,
        guestViewers: 1,
        totalInteractions: 1,
        avgDuration: { $round: ['$avgDuration', 0] }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      viewers,
      summary: summary[0] || {
        totalViews: 0,
        uniqueViewers: 0,
        registeredViewers: 0,
        guestViewers: 0,
        totalInteractions: 0,
        avgDuration: 0
      }
    }
  });
}));

module.exports = router;
