const express = require('express');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const { PERMISSIONS, hasPermission } = require('../utils/permissions');
const Review = require('../models/Review');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// @desc    Get all reviews (admin view)
// @route   GET /api/reviews/admin/all
// @access  Private (Requires reviews.manage permission)
router.get('/admin/all', asyncHandler(async (req, res) => {
  // Check permission for managing reviews
  if (!hasPermission(req.user, PERMISSIONS.REVIEWS_MANAGE)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view all reviews'
    });
  }

  const { page = 1, limit = 20, status, rating, search } = req.query;
  const skip = (page - 1) * limit;

  const query = {};
  if (status && status !== 'all') {
    query.status = status;
  }
  if (rating) {
    query.rating = parseInt(rating);
  }
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { comment: { $regex: search, $options: 'i' } }
    ];
  }

  const [reviews, totalCount] = await Promise.all([
    Review.find(query)
      .populate('client', 'profile.firstName profile.lastName email')
      .populate('vendor', 'businessInfo.companyName')
      .populate('property', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Review.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount
      }
    }
  });
}));

// @desc    Approve review
// @route   POST /api/reviews/:id/approve
// @access  Private (Requires reviews.manage permission)
router.post('/:id/approve', asyncHandler(async (req, res) => {
  // Check permission for managing reviews
  if (!hasPermission(req.user, PERMISSIONS.REVIEWS_MANAGE)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to approve reviews'
    });
  }

  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { 
      status: 'approved',
      isPublic: true,
      moderatedAt: new Date(),
      moderatedBy: req.user.id
    },
    { new: true }
  );

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  res.json({
    success: true,
    message: 'Review approved successfully',
    data: { review }
  });
}));

// @desc    Reject review
// @route   POST /api/reviews/:id/reject
// @access  Private (Requires reviews.manage permission)
router.post('/:id/reject', asyncHandler(async (req, res) => {
  // Check permission for managing reviews
  if (!hasPermission(req.user, PERMISSIONS.REVIEWS_MANAGE)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to reject reviews'
    });
  }

  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: 'Rejection reason is required'
    });
  }

  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { 
      status: 'rejected',
      isPublic: false,
      moderationReason: reason,
      moderatedAt: new Date(),
      moderatedBy: req.user.id
    },
    { new: true }
  );

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  res.json({
    success: true,
    message: 'Review rejected successfully',
    data: { review }
  });
}));

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private (Requires reviews.manage permission)
router.delete('/:id', asyncHandler(async (req, res) => {
  // Check permission for managing reviews
  if (!hasPermission(req.user, PERMISSIONS.REVIEWS_MANAGE)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to delete reviews'
    });
  }

  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { status: 'deleted' },
    { new: true }
  );

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  res.json({
    success: true,
    message: 'Review deleted successfully'
  });
}));

// @desc    Flag review
// @route   POST /api/reviews/:id/flag
// @access  Private (Requires reviews.manage permission)
router.post('/:id/flag', asyncHandler(async (req, res) => {
  // Check permission for managing reviews
  if (!hasPermission(req.user, PERMISSIONS.REVIEWS_MANAGE)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to flag reviews'
    });
  }

  const { reason } = req.body;

  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { 
      status: 'flagged',
      flagReason: reason,
      flaggedAt: new Date(),
      flaggedBy: req.user.id
    },
    { new: true }
  );

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  res.json({
    success: true,
    message: 'Review flagged for moderation',
    data: { review }
  });
}));

module.exports = router;
