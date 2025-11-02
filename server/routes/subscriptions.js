const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Plan = require('../models/Plan');
const { authenticateToken } = require('../middleware/authMiddleware');

// @desc    Get all subscriptions with filtering and pagination
// @route   GET /api/subscriptions
// @access  Private (Admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      planId = '', 
      userId = '',
      startDate = '',
      endDate = ''
    } = req.query;

    // Build filter object
    let filter = {};

    // Search in user name/email or plan name
    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const plans = await Plan.find({
        name: { $regex: search, $options: 'i' }
      }).select('_id');

      filter.$or = [
        { user: { $in: users.map(u => u._id) } },
        { plan: { $in: plans.map(p => p._id) } }
      ];
    }

    if (status) filter.status = status;
    if (planId) filter.plan = planId;
    if (userId) filter.user = userId;
    
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'user', select: 'name email phone' },
        { path: 'plan', select: 'name description price billingPeriod' },
        { path: 'addons', select: 'name description price currency category billingType' },
        { path: 'paymentHistory.addons', select: 'name description price currency category billingType' }
      ],
      sort: { createdAt: -1 }
    };

    const result = await Subscription.paginate(filter, options);

    // Filter out subscriptions with null plans or users (safety check)
    const validSubscriptions = result.docs.filter(sub => sub.user && sub.plan);

    res.json({
      success: true,
      data: {
        subscriptions: validSubscriptions,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          totalSubscriptions: result.totalDocs,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage
        }
      }
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get subscription statistics
// @route   GET /api/subscriptions/stats
// @access  Private (Admin only)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const [
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      revenueStats
    ] = await Promise.all([
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'expired' }),
      Subscription.countDocuments({ status: 'cancelled' }),
      Subscription.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            monthlyRevenue: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    ]
                  },
                  '$amount',
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    const revenue = revenueStats[0] || { totalRevenue: 0, monthlyRevenue: 0 };

    res.json({
      success: true,
      data: {
        totalSubscriptions,
        activeSubscriptions,
        expiredSubscriptions,
        cancelledSubscriptions,
        totalRevenue: revenue.totalRevenue,
        monthlyRevenue: revenue.monthlyRevenue
      }
    });
  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get user's subscriptions
// @route   GET /api/subscriptions/my-subscriptions
// @access  Private
router.get('/my-subscriptions', authenticateToken, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ user: req.user.userId })
      .populate('plan', 'name description price billingPeriod features')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { subscriptions }
    });
  } catch (error) {
    console.error('Get user subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user subscriptions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get subscription by ID
// @route   GET /api/subscriptions/:id
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('plan', 'name description price billingPeriod')
      .populate('addons', 'name description price currency category billingType')
      .populate('paymentHistory.addons', 'name description price currency category billingType');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check if user can access this subscription
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && 
        subscription.user._id.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { subscription }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Create new subscription
// @route   POST /api/subscriptions
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { planId, paymentMethod, isAutoRenew = true } = req.body;

    // Validate plan exists
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    if (!plan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Plan is not active'
      });
    }

    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findOne({
      user: req.user.userId,
      status: 'active'
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'User already has an active subscription'
      });
    }

    // Calculate end date based on plan billing period
    const startDate = new Date();
    const endDate = new Date(startDate);
    
    if (plan.billingPeriod === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan.billingPeriod === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      // Default to monthly if not specified
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const subscription = new Subscription({
      user: req.user.userId,
      plan: planId,
      status: 'active',
      startDate,
      endDate,
      amount: plan.price,
      currency: plan.currency || 'INR',
      paymentMethod,
      autoRenew: isAutoRenew
    });

    await subscription.save();

    // Update plan subscriber count
    await Plan.findByIdAndUpdate(planId, {
      $inc: { subscriberCount: 1 }
    });

    // Populate the response
    await subscription.populate([
      { path: 'user', select: 'name email phone' },
      { path: 'plan', select: 'name description price billingPeriod' }
    ]);

    res.status(201).json({
      success: true,
      data: { subscription },
      message: 'Subscription created successfully'
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update subscription
// @route   PUT /api/subscriptions/:id
// @access  Private (Admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Only admin can update subscriptions
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    const { status, endDate, isAutoRenew, paymentMethod } = req.body;

    if (status) subscription.status = status;
    if (endDate) subscription.endDate = new Date(endDate);
    if (isAutoRenew !== undefined) subscription.autoRenew = isAutoRenew;
    if (paymentMethod) subscription.paymentMethod = paymentMethod;

    await subscription.save();

    await subscription.populate([
      { path: 'user', select: 'name email phone' },
      { path: 'plan', select: 'name description price billingPeriod' }
    ]);

    res.json({
      success: true,
      data: { subscription },
      message: 'Subscription updated successfully'
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Cancel subscription
// @route   PATCH /api/subscriptions/:id/cancel
// @access  Private
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check if user can cancel this subscription
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && 
        subscription.user.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already cancelled'
      });
    }

    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    await subscription.save();

    // Update plan subscriber count
    await Plan.findByIdAndUpdate(subscription.plan, {
      $inc: { subscriberCount: -1 }
    });

    await subscription.populate([
      { path: 'user', select: 'name email phone' },
      { path: 'plan', select: 'name description price billingPeriod' }
    ]);

    res.json({
      success: true,
      data: { subscription },
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Renew subscription
// @route   PATCH /api/subscriptions/:id/renew
// @access  Private
router.patch('/:id/renew', authenticateToken, async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('plan');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check if user can renew this subscription
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && 
        subscription.user.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (subscription.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already active'
      });
    }

    // Calculate new end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    
    // Check if plan exists
    if (!subscription.plan) {
      return res.status(400).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    if (subscription.plan.billingPeriod === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (subscription.plan.billingPeriod === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    subscription.status = 'active';
    subscription.startDate = startDate;
    subscription.endDate = endDate;
    subscription.amount = subscription.plan.price;
    await subscription.save();

    await subscription.populate([
      { path: 'user', select: 'name email phone' },
      { path: 'plan', select: 'name description price billingPeriod' }
    ]);

    res.json({
      success: true,
      data: { subscription },
      message: 'Subscription renewed successfully'
    });
  } catch (error) {
    console.error('Renew subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to renew subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;