const express = require('express');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();

// Apply auth middleware
router.use(authenticateToken);

// @desc    Get all plans
// @route   GET /api/plans
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    billingPeriod, 
    isActive,
    search 
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Build filter object
  const filter = {};
  
  if (billingPeriod && billingPeriod !== 'all') {
    filter.billingPeriod = billingPeriod;
  }
  
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Get total count for pagination
  const totalPlans = await Plan.countDocuments(filter);
  
  // Get plans with pagination and populate subscriber count
  const plans = await Plan.find(filter)
    .populate('subscriberCount')
    .sort({ sortOrder: 1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const totalPages = Math.ceil(totalPlans / parseInt(limit));

  res.json({
    success: true,
    data: {
      plans,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPlans,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
}));

// @desc    Get single plan
// @route   GET /api/plans/:id
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id).populate('subscriberCount');
  
  if (!plan) {
    return res.status(404).json({
      success: false,
      message: 'Plan not found'
    });
  }

  res.json({
    success: true,
    data: { plan }
  });
}));

// @desc    Create new plan (Admin only)
// @route   POST /api/plans
// @access  Private/Admin
router.post('/', asyncHandler(async (req, res) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  // Validate required fields
  const { name, description, price, billingPeriod, features } = req.body;
  
  if (!name || !description || price === undefined || !billingPeriod) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: name, description, price, billingPeriod'
    });
  }

  // Generate identifier from name if not provided
  if (!req.body.identifier) {
    req.body.identifier = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  // Initialize price history
  req.body.priceHistory = [{
    price: price,
    changedAt: new Date(),
    changedBy: req.user.id,
    reason: 'Initial price'
  }];

  const plan = await Plan.create(req.body);

  res.status(201).json({
    success: true,
    data: { plan },
    message: 'Plan created successfully'
  });
}));

// @desc    Update plan (Admin only)
// @route   PUT /api/plans/:id
// @access  Private/Admin
router.put('/:id', asyncHandler(async (req, res) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  const plan = await Plan.findById(req.params.id);
  
  if (!plan) {
    return res.status(404).json({
      success: false,
      message: 'Plan not found'
    });
  }

  // Track price changes
  if (req.body.price && req.body.price !== plan.price) {
    await plan.updatePrice(req.body.price, req.user.id, req.body.priceChangeReason);
    delete req.body.price; // Remove from update object since it's already updated
    delete req.body.priceChangeReason;
  }

  // Track feature changes
  if (req.body.features) {
    const oldFeatures = plan.features || [];
    const newFeatures = req.body.features || [];
    
    // Log feature additions/removals
    newFeatures.forEach(feature => {
      const featureName = typeof feature === 'string' ? feature : feature.name;
      const oldFeature = oldFeatures.find(f => 
        (typeof f === 'string' ? f : f.name) === featureName
      );
      
      if (!oldFeature) {
        plan.updateFeature(featureName, 'added', feature, req.user.id);
      }
    });
  }

  // Update other fields
  Object.keys(req.body).forEach(key => {
    if (key !== 'price' && key !== 'priceHistory' && key !== 'featureHistory') {
      plan[key] = req.body[key];
    }
  });

  await plan.save();

  res.json({
    success: true,
    data: { plan },
    message: 'Plan updated successfully'
  });
}));

// @desc    Get plan price history (Admin only)
// @route   GET /api/plans/:id/price-history
// @access  Private/Admin
router.get('/:id/price-history', asyncHandler(async (req, res) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  const plan = await Plan.findById(req.params.id)
    .populate('priceHistory.changedBy', 'name email')
    .select('name priceHistory');
  
  if (!plan) {
    return res.status(404).json({
      success: false,
      message: 'Plan not found'
    });
  }

  res.json({
    success: true,
    data: {
      planName: plan.name,
      priceHistory: plan.priceHistory || []
    }
  });
}));

// @desc    Toggle plan status (Admin only)
// @route   PATCH /api/plans/:id/toggle-status
// @access  Private/Admin
router.patch('/:id/toggle-status', asyncHandler(async (req, res) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  const plan = await Plan.findById(req.params.id);
  
  if (!plan) {
    return res.status(404).json({
      success: false,
      message: 'Plan not found'
    });
  }

  plan.isActive = !plan.isActive;
  await plan.save();

  res.json({
    success: true,
    data: { plan }
  });
}));

// @desc    Delete plan (Admin only)
// @route   DELETE /api/plans/:id
// @access  Private/Admin
router.delete('/:id', asyncHandler(async (req, res) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  const plan = await Plan.findById(req.params.id);
  
  if (!plan) {
    return res.status(404).json({
      success: false,
      message: 'Plan not found'
    });
  }

  // Check if plan has active subscriptions
  const activeSubscriptions = await Subscription.countDocuments({
    plan: req.params.id,
    status: 'active'
  });

  if (activeSubscriptions > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete plan with active subscriptions'
    });
  }

  await Plan.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Plan deleted successfully'
  });
}));

module.exports = router;