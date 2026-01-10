const express = require('express');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const Review = require('../models/Review');
const Property = require('../models/Property');
const ServiceBooking = require('../models/ServiceBooking');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const router = express.Router();

// @desc    Get reviews written by the current customer
// @route   GET /api/customer/reviews/given
// @access  Private
router.get('/given', authenticateToken, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    rating,
    reviewType,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const userId = req.user.id;
  const query = { client: userId, status: { $ne: 'deleted' } };

  // Apply filters
  if (rating) query.rating = parseInt(rating);
  if (reviewType && reviewType !== 'all') query.reviewType = reviewType;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { comment: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [reviews, totalCount] = await Promise.all([
    Review.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('vendor', 'email profile')
      .populate('property', 'title city state price images status type listingType address')
      .populate('service', 'name category')
      .lean(),
    Review.countDocuments(query)
  ]);

  // Format reviews for response
  const formattedReviews = reviews.map(review => ({
    _id: review._id,
    vendorId: review.vendor?._id,
    propertyId: review.property?._id,
    serviceId: review.service?._id,
    clientId: review.client,
    clientName: req.user.name || req.user.email,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    reviewType: review.reviewType,
    isVerified: review.isVerified,
    isPublic: review.isPublic,
    helpfulCount: review.helpfulVotes,
    unhelpfulCount: review.unhelpfulVotes,
    vendorResponse: review.vendorResponse,
    tags: review.tags,
    images: review.images?.map(img => img.url) || [],
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    vendor: review.vendor ? {
      _id: review.vendor._id,
      name: review.vendor.profile?.firstName
        ? `${review.vendor.profile.firstName} ${review.vendor.profile.lastName || ''}`
        : review.vendor.email,
      businessName: review.vendor.profile?.vendorInfo?.businessName,
      avatar: review.vendor.profile?.avatar
    } : undefined,
    property: review.property ? {
      _id: review.property._id,
      title: review.property.title,
      location: `${review.property.city}, ${review.property.state}`,
      image: review.property.images?.[0],
      status: review.property.status,
      type: review.property.type,
      listingType: review.property.listingType,
      price: review.property.price,
      address: review.property.address || {
        city: review.property.city,
        state: review.property.state
      },
      images: review.property.images
    } : undefined,
    service: review.service ? {
      _id: review.service._id,
      name: review.service.name,
      category: review.service.category
    } : undefined
  }));

  res.json({
    success: true,
    data: {
      reviews: formattedReviews,
      totalCount,
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      currentPage: parseInt(page)
    }
  });
}));

// @desc    Get reviews received by the current customer (as vendor/property owner)
// @route   GET /api/customer/reviews/received
// @access  Private
router.get('/received', authenticateToken, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    rating,
    reviewType,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const userId = req.user.id;
  const query = { vendor: userId, status: { $ne: 'deleted' } };

  // Apply filters
  if (rating) query.rating = parseInt(rating);
  if (reviewType && reviewType !== 'all') query.reviewType = reviewType;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { comment: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [reviews, totalCount] = await Promise.all([
    Review.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('client', 'email profile')
      .populate('property', 'title city state price images')
      .populate('service', 'name category')
      .lean(),
    Review.countDocuments(query)
  ]);

  // Format reviews for response
  const formattedReviews = reviews.map(review => ({
    _id: review._id,
    vendorId: review.vendor,
    propertyId: review.property?._id,
    serviceId: review.service?._id,
    clientId: review.client?._id,
    clientName: review.client?.profile?.firstName
      ? `${review.client.profile.firstName} ${review.client.profile.lastName || ''}`
      : review.client?.email,
    clientAvatar: review.client?.profile?.avatar,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    reviewType: review.reviewType,
    isVerified: review.isVerified,
    isPublic: review.isPublic,
    helpfulCount: review.helpfulVotes,
    unhelpfulCount: review.unhelpfulVotes,
    vendorResponse: review.vendorResponse,
    tags: review.tags,
    images: review.images?.map(img => img.url) || [],
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    property: review.property ? {
      _id: review.property._id,
      title: review.property.title,
      location: `${review.property.city}, ${review.property.state}`,
      image: review.property.images?.[0]
    } : undefined,
    service: review.service ? {
      _id: review.service._id,
      name: review.service.name,
      category: review.service.category
    } : undefined
  }));

  res.json({
    success: true,
    data: {
      reviews: formattedReviews,
      totalCount,
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      currentPage: parseInt(page)
    }
  });
}));

// @desc    Get review statistics for current customer
// @route   GET /api/customer/reviews/my-stats
// @access  Private
router.get('/my-stats', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get stats for reviews received by this user as a vendor
  const stats = await Review.aggregate([
    { $match: { vendor: userId, status: 'active' } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        verifiedReviews: { $sum: { $cond: ['$isVerified', 1, 0] } },
        publicReviews: { $sum: { $cond: ['$isPublic', 1, 0] } },
        helpfulVotes: { $sum: '$helpfulVotes' },
        rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
      }
    }
  ]);

  // Get recent reviews count (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentReviewsCount = await Review.countDocuments({
    vendor: userId,
    status: 'active',
    createdAt: { $gte: thirtyDaysAgo }
  });

  // Calculate response rate
  const [totalReviewsCount, respondedReviewsCount] = await Promise.all([
    Review.countDocuments({ vendor: userId, status: 'active' }),
    Review.countDocuments({
      vendor: userId,
      status: 'active',
      'vendorResponse.message': { $exists: true, $ne: '' }
    })
  ]);

  const responseRate = totalReviewsCount > 0
    ? Math.round((respondedReviewsCount / totalReviewsCount) * 100)
    : 0;

  const reviewStats = stats[0] || {
    totalReviews: 0,
    averageRating: 0,
    verifiedReviews: 0,
    publicReviews: 0,
    helpfulVotes: 0,
    rating5: 0,
    rating4: 0,
    rating3: 0,
    rating2: 0,
    rating1: 0
  };

  res.json({
    success: true,
    data: {
      totalReviews: reviewStats.totalReviews,
      averageRating: Math.round(reviewStats.averageRating * 10) / 10 || 0,
      ratingDistribution: {
        5: reviewStats.rating5,
        4: reviewStats.rating4,
        3: reviewStats.rating3,
        2: reviewStats.rating2,
        1: reviewStats.rating1
      },
      recentReviews: recentReviewsCount,
      responseRate,
      averageResponseTime: 0, // TODO: Implement based on timestamps
      verifiedReviews: reviewStats.verifiedReviews,
      publicReviews: reviewStats.publicReviews,
      helpfulVotes: reviewStats.helpfulVotes
    }
  });
}));

// @desc    Get reviewable items (properties and services customer has used)
// @route   GET /api/customer/reviews/reviewable-items
// @access  Private
router.get('/reviewable-items', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get only properties that were assigned to (sold/rented to) the customer
  // Customers can only review properties they purchased or rented, not properties they are selling
  const properties = await Property.find({
    assignedTo: userId,
    status: { $in: ['sold', 'rented'] }
  })
    .select('title city state price status createdAt assignedTo assignedAt')
    .lean();

  // Check which properties have been reviewed
  const propertyReviews = await Review.find({
    client: userId,
    property: { $in: properties.map(p => p._id) }
  }).select('property').lean();

  const reviewedPropertyIds = new Set(
    propertyReviews.map(r => r.property?.toString())
  );

  const reviewableProperties = properties.map(property => ({
    _id: property._id,
    title: property.title,
    location: `${property.city}, ${property.state}`,
    purchaseDate: property.assignedAt || property.createdAt,
    status: property.status === 'sold' ? 'purchased' :
      property.status === 'rented' ? 'rented' : 'leased',
    canReview: true,
    hasReviewed: reviewedPropertyIds.has(property._id.toString()),
    isAssigned: !!property.assignedTo
  }));

  // Get completed service bookings
  const serviceBookings = await ServiceBooking.find({
    clientId: userId,
    status: 'completed'
  })
    .populate('serviceId', 'name category')
    .populate('vendorId', 'email profile')
    .select('serviceId vendorId bookingDate serviceDate status')
    .lean();

  // Check which services have been reviewed
  const serviceReviews = await Review.find({
    client: userId,
    service: { $in: serviceBookings.map(s => s.serviceId?._id).filter(Boolean) }
  }).select('service').lean();

  const reviewedServiceIds = new Set(
    serviceReviews.map(r => r.service?.toString())
  );

  const reviewableServices = serviceBookings
    .filter(booking => booking.serviceId && booking.vendorId)
    .map(booking => ({
      _id: booking.serviceId._id,
      name: booking.serviceId.name,
      category: booking.serviceId.category,
      vendorName: booking.vendorId.profile?.firstName
        ? `${booking.vendorId.profile.firstName} ${booking.vendorId.profile.lastName || ''}`
        : booking.vendorId.email,
      vendorId: booking.vendorId._id,
      bookingDate: booking.bookingDate,
      completionDate: booking.serviceDate,
      status: 'completed',
      canReview: true,
      hasReviewed: reviewedServiceIds.has(booking.serviceId._id.toString())
    }));

  // Get vendors user has interacted with
  const vendorInteractions = await ServiceBooking.find({
    clientId: userId,
    status: { $in: ['completed', 'in_progress'] }
  })
    .populate('vendorId', 'email profile')
    .select('vendorId serviceDate')
    .lean();

  // Check which vendors have been reviewed
  const vendorReviews = await Review.find({
    client: userId,
    reviewType: 'general'
  }).select('vendor').lean();

  const reviewedVendorIds = new Set(
    vendorReviews.map(r => r.vendor?.toString())
  );

  const uniqueVendors = [...new Map(
    vendorInteractions
      .filter(int => int.vendorId)
      .map(int => [
        int.vendorId._id.toString(),
        {
          _id: int.vendorId._id,
          name: int.vendorId.profile?.firstName
            ? `${int.vendorId.profile.firstName} ${int.vendorId.profile.lastName || ''}`
            : int.vendorId.email,
          businessName: int.vendorId.profile?.vendorInfo?.businessName || '',
          interactionDate: int.serviceDate,
          interactionType: 'service_booking',
          canReview: true,
          hasReviewed: reviewedVendorIds.has(int.vendorId._id.toString())
        }
      ])
  ).values()];

  res.json({
    success: true,
    data: {
      properties: reviewableProperties,
      services: reviewableServices,
      vendors: uniqueVendors
    }
  });
}));

// @desc    Create a new review
// @route   POST /api/customer/reviews
// @access  Private
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const {
    vendorId,
    propertyId,
    serviceId,
    rating,
    title,
    comment,
    reviewType,
    isPublic = true,
    tags = [],
    images = []
  } = req.body;

  const userId = req.user.id;

  // Validate required fields
  if (!rating || !title || !comment || !reviewType) {
    return res.status(400).json({
      success: false,
      message: 'Rating, title, comment, and review type are required'
    });
  }

  // Create review
  const review = await Review.create({
    vendor: vendorId,
    client: userId,
    property: propertyId || null,
    service: serviceId || null,
    rating,
    title,
    comment,
    reviewType,
    isPublic,
    tags,
    images: images.map(url => ({ url }))
  });

  const populatedReview = await Review.findById(review._id)
    .populate('vendor', 'email profile')
    .populate('property', 'title city state')
    .populate('service', 'name category')
    .lean();

  // Send push notification to vendor about new review
  if (vendorId) {
    try {
      const customerName = req.user.profile?.firstName
        ? `${req.user.profile.firstName} ${req.user.profile.lastName || ''}`.trim()
        : req.user.email;

      await notificationService.sendNewReviewNotification(vendorId, {
        reviewId: review._id.toString(),
        rating: rating,
        title: title,
        customerName: customerName,
        propertyId: propertyId,
        propertyTitle: populatedReview.property?.title || null,
        commentPreview: comment.substring(0, 100)
      });
    } catch (notifError) {
      console.error('Failed to send new review notification:', notifError);
      // Don't fail the request if notification fails
    }
  }

  res.status(201).json({
    success: true,
    message: 'Review created successfully',
    data: {
      review: populatedReview
    }
  });
}));

// @desc    Update a review
// @route   PUT /api/customer/reviews/:id
// @access  Private
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, title, comment, isPublic, tags, images } = req.body;
  const userId = req.user.id;

  const review = await Review.findOne({ _id: id, client: userId });

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found or unauthorized'
    });
  }

  // Update fields
  if (rating !== undefined) review.rating = rating;
  if (title) review.title = title;
  if (comment) review.comment = comment;
  if (isPublic !== undefined) review.isPublic = isPublic;
  if (tags) review.tags = tags;
  if (images) review.images = images.map(url => ({ url }));

  await review.save();

  const updatedReview = await Review.findById(review._id)
    .populate('vendor', 'email profile')
    .populate('property', 'title city state')
    .populate('service', 'name category')
    .lean();

  res.json({
    success: true,
    message: 'Review updated successfully',
    data: {
      review: updatedReview
    }
  });
}));

// @desc    Delete a review
// @route   DELETE /api/customer/reviews/:id
// @access  Private
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const review = await Review.findOne({ _id: id, client: userId });

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found or unauthorized'
    });
  }

  // Soft delete
  review.status = 'deleted';
  await review.save();

  res.json({
    success: true,
    message: 'Review deleted successfully'
  });
}));

// @desc    Mark review as helpful/unhelpful
// @route   POST /api/customer/reviews/:id/helpful
// @access  Private
router.post('/:id/helpful', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isHelpful } = req.body;
  const userId = req.user.id;

  const review = await Review.findById(id);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  // Remove from opposite array if exists
  if (isHelpful) {
    review.unhelpfulBy = review.unhelpfulBy.filter(
      id => id.toString() !== userId.toString()
    );
    if (!review.helpfulBy.includes(userId)) {
      review.helpfulBy.push(userId);
    }
  } else {
    review.helpfulBy = review.helpfulBy.filter(
      id => id.toString() !== userId.toString()
    );
    if (!review.unhelpfulBy.includes(userId)) {
      review.unhelpfulBy.push(userId);
    }
  }

  review.helpfulVotes = review.helpfulBy.length;
  review.unhelpfulVotes = review.unhelpfulBy.length;

  await review.save();

  res.json({
    success: true,
    message: 'Vote recorded successfully'
  });
}));

// @desc    Reply to a review (vendor response)
// @route   POST /api/customer/reviews/:id/reply
// @access  Private
router.post('/:id/reply', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const userId = req.user.id;

  const review = await Review.findOne({ _id: id, vendor: userId })
    .populate('client', 'email profile')
    .populate('property', 'title');

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found or unauthorized'
    });
  }

  review.vendorResponse = {
    message,
    respondedAt: new Date()
  };

  await review.save();

  // Send push notification to customer about vendor reply
  if (review.client) {
    try {
      const vendorName = req.user.profile?.firstName
        ? `${req.user.profile.firstName} ${req.user.profile.lastName || ''}`.trim()
        : req.user.email;

      await notificationService.sendReviewReplyNotification(review.client._id.toString(), {
        reviewId: review._id.toString(),
        vendorName: vendorName,
        propertyId: review.property?._id?.toString() || null,
        propertyTitle: review.property?.title || null,
        replyPreview: message.substring(0, 100)
      });
    } catch (notifError) {
      console.error('Failed to send review reply notification:', notifError);
      // Don't fail the request if notification fails
    }
  }

  res.json({
    success: true,
    message: 'Reply posted successfully'
  });
}));

// @desc    Report a review
// @route   POST /api/customer/reviews/:id/report
// @access  Private
router.post('/:id/report', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const review = await Review.findById(id);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  // Mark as reported
  review.status = 'reported';
  await review.save();

  // Send push notification to all admins and users with review moderation permissions
  try {
    const adminIds = await notificationService.getAdminUserIds('reviews.manage');

    if (adminIds.length > 0) {
      const reporterName = req.user.profile?.firstName
        ? `${req.user.profile.firstName} ${req.user.profile.lastName || ''}`.trim()
        : req.user.email;

      await notificationService.sendReviewReportNotification(adminIds, {
        reviewId: review._id.toString(),
        reviewTitle: review.title,
        reporterName: reporterName,
        reporterId: req.user.id,
        reason: reason,
        vendorId: review.vendor?.toString() || null
      });
    }
  } catch (notifError) {
    console.error('Failed to send review report notification:', notifError);
    // Don't fail the request if notification fails
  }

  res.json({
    success: true,
    message: 'Review reported successfully'
  });
}));

module.exports = router;
