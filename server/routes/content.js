const express = require('express');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const { PERMISSIONS, hasPermission } = require('../utils/permissions');
const Property = require('../models/Property');
const Review = require('../models/Review');
const Message = require('../models/Message');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// @desc    Get content for moderation
// @route   GET /api/content/moderate
// @access  Private (Requires content.moderate permission)
router.get('/moderate', asyncHandler(async (req, res) => {
  // Check permission for content moderation
  if (!hasPermission(req.user, PERMISSIONS.CONTENT_MODERATE)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to moderate content'
    });
  }

  const { page = 1, limit = 20, type = 'all', status = 'pending' } = req.query;
  const skip = (page - 1) * limit;

  let contentItems = [];

  // Get properties pending moderation
  if (type === 'all' || type === 'properties') {
    const properties = await Property.find({ 
      status: status === 'pending' ? 'pending' : { $in: ['pending', 'flagged'] }
    })
      .populate('owner', 'profile.firstName profile.lastName email')
      .select('title description images status createdAt owner')
      .limit(parseInt(limit))
      .skip(skip);

    contentItems = contentItems.concat(
      properties.map(p => ({
        _id: p._id,
        type: 'property',
        title: p.title,
        description: p.description,
        images: p.images,
        status: p.status,
        createdAt: p.createdAt,
        author: p.owner
      }))
    );
  }

  // Get reviews pending moderation
  if (type === 'all' || type === 'reviews') {
    const reviews = await Review.find({ 
      status: status === 'pending' ? 'pending' : { $in: ['pending', 'flagged'] }
    })
      .populate('client', 'profile.firstName profile.lastName email')
      .select('title comment rating status createdAt client')
      .limit(parseInt(limit))
      .skip(skip);

    contentItems = contentItems.concat(
      reviews.map(r => ({
        _id: r._id,
        type: 'review',
        title: r.title || 'Review',
        description: r.comment,
        rating: r.rating,
        status: r.status,
        createdAt: r.createdAt,
        author: r.client
      }))
    );
  }

  // Sort by date
  contentItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    data: {
      items: contentItems.slice(0, limit),
      pagination: {
        currentPage: parseInt(page),
        totalItems: contentItems.length
      }
    }
  });
}));

// @desc    Approve content
// @route   POST /api/content/:id/approve
// @access  Private (Requires content.moderate permission)
router.post('/:id/approve', asyncHandler(async (req, res) => {
  // Check permission for content moderation
  if (!hasPermission(req.user, PERMISSIONS.CONTENT_MODERATE)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to approve content'
    });
  }

  const { id } = req.params;
  const { type } = req.body;

  if (type === 'property') {
    const property = await Property.findByIdAndUpdate(
      id,
      { status: 'available', verified: true },
      { new: true }
    );
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
  } else if (type === 'review') {
    const review = await Review.findByIdAndUpdate(
      id,
      { status: 'approved', isPublic: true },
      { new: true }
    );
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
  }

  res.json({
    success: true,
    message: 'Content approved successfully'
  });
}));

// @desc    Reject content
// @route   POST /api/content/:id/reject
// @access  Private (Requires content.moderate permission)
router.post('/:id/reject', asyncHandler(async (req, res) => {
  // Check permission for content moderation
  if (!hasPermission(req.user, PERMISSIONS.CONTENT_MODERATE)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to reject content'
    });
  }

  const { id } = req.params;
  const { type, reason } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: 'Rejection reason is required'
    });
  }

  if (type === 'property') {
    const property = await Property.findByIdAndUpdate(
      id,
      { status: 'rejected', rejectionReason: reason },
      { new: true }
    );
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
  } else if (type === 'review') {
    const review = await Review.findByIdAndUpdate(
      id,
      { status: 'rejected', moderationReason: reason },
      { new: true }
    );
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
  }

  res.json({
    success: true,
    message: 'Content rejected successfully'
  });
}));

module.exports = router;
