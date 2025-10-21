const express = require('express');
const { supabase } = require('../config/database');
const { asyncHandler } = require('../middleware/errorMiddleware');
const router = express.Router();

// @desc    Get user's service requests
// @route   GET /api/services/requests
// @access  Private
router.get('/requests', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    serviceType,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;

  const offset = (page - 1) * limit;

  let query = supabase
    .from('service_requests')
    .select(`
      *,
      properties (id, title, city, state, price),
      service_providers (id, name, rating, phone, avatar),
      service_request_documents (id, document_type, document_url, status)
    `, { count: 'exact' })
    .eq('user_id', req.user.id);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (serviceType && serviceType !== 'all') {
    query = query.eq('service_type', serviceType);
  }

  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data: requests, error, count } = await query;

  if (error) {
    throw error;
  }

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    data: {
      requests: requests.map(request => ({
        id: request.id,
        serviceType: request.service_type,
        title: request.title,
        description: request.description,
        amount: request.amount,
        status: request.status,
        priority: request.priority,
        progress: request.progress,
        estimatedCompletion: request.estimated_completion,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        completedAt: request.completed_at,
        property: request.properties,
        provider: request.service_providers,
        documents: request.service_request_documents || [],
        metadata: request.metadata
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount: count,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: parseInt(limit)
      }
    }
  });
}));

// @desc    Create service request
// @route   POST /api/services/requests
// @access  Private
router.post('/requests', asyncHandler(async (req, res) => {
  const {
    serviceType,
    title,
    description,
    propertyId,
    providerId,
    amount,
    priority = 'medium',
    metadata = {}
  } = req.body;

  if (!serviceType || !title || !description) {
    return res.status(400).json({
      success: false,
      message: 'Service type, title, and description are required'
    });
  }

  // Validate property if provided
  if (propertyId) {
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
  }

  // Validate provider if provided
  if (providerId) {
    const { data: provider, error: providerError } = await supabase
      .from('service_providers')
      .select('id')
      .eq('id', providerId)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found'
      });
    }
  }

  // Create service request
  const { data: request, error } = await supabase
    .from('service_requests')
    .insert({
      user_id: req.user.id,
      service_type: serviceType,
      title,
      description,
      property_id: propertyId,
      provider_id: providerId,
      amount,
      priority,
      status: 'pending',
      metadata,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  res.status(201).json({
    success: true,
    message: 'Service request created successfully',
    data: {
      request: {
        id: request.id,
        serviceType: request.service_type,
        title: request.title,
        status: request.status,
        createdAt: request.created_at
      }
    }
  });
}));

// @desc    Update service request
// @route   PUT /api/services/requests/:id
// @access  Private
router.put('/requests/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    amount,
    priority,
    status,
    progress,
    estimatedCompletion,
    metadata
  } = req.body;

  // Check if request exists and user owns it
  const { data: existingRequest, error: fetchError } = await supabase
    .from('service_requests')
    .select('user_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !existingRequest) {
    return res.status(404).json({
      success: false,
      message: 'Service request not found'
    });
  }

  if (existingRequest.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this service request'
    });
  }

  // Prevent status changes by regular users
  const updateData = {
    title,
    description,
    amount,
    priority,
    metadata,
    updated_at: new Date().toISOString()
  };

  // Only admin or service providers can update these fields
  if (req.user.role === 'admin' || req.user.role === 'service_provider') {
    updateData.status = status;
    updateData.progress = progress;
    updateData.estimated_completion = estimatedCompletion;
  }

  const { data: request, error } = await supabase
    .from('service_requests')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  res.json({
    success: true,
    message: 'Service request updated successfully',
    data: { request }
  });
}));

// @desc    Cancel service request
// @route   POST /api/services/requests/:id/cancel
// @access  Private
router.post('/requests/:id/cancel', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  // Check if request exists and user owns it
  const { data: existingRequest, error: fetchError } = await supabase
    .from('service_requests')
    .select('user_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !existingRequest) {
    return res.status(404).json({
      success: false,
      message: 'Service request not found'
    });
  }

  if (existingRequest.user_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to cancel this service request'
    });
  }

  if (existingRequest.status === 'completed' || existingRequest.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      message: 'Cannot cancel a completed or already cancelled request'
    });
  }

  // Update request status
  const { error } = await supabase
    .from('service_requests')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    throw error;
  }

  res.json({
    success: true,
    message: 'Service request cancelled successfully'
  });
}));

// @desc    Rate service provider
// @route   POST /api/services/requests/:id/rate
// @access  Private
router.post('/requests/:id/rate', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, review } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5'
    });
  }

  // Check if request exists, is completed, and user owns it
  const { data: request, error: fetchError } = await supabase
    .from('service_requests')
    .select('user_id, status, provider_id')
    .eq('id', id)
    .single();

  if (fetchError || !request) {
    return res.status(404).json({
      success: false,
      message: 'Service request not found'
    });
  }

  if (request.user_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to rate this service request'
    });
  }

  if (request.status !== 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Can only rate completed service requests'
    });
  }

  if (!request.provider_id) {
    return res.status(400).json({
      success: false,
      message: 'No service provider assigned to rate'
    });
  }

  // Check if already rated
  const { data: existingRating } = await supabase
    .from('service_ratings')
    .select('id')
    .eq('service_request_id', id)
    .single();

  if (existingRating) {
    return res.status(400).json({
      success: false,
      message: 'Service request already rated'
    });
  }

  // Create rating
  const { data: newRating, error: ratingError } = await supabase
    .from('service_ratings')
    .insert({
      service_request_id: id,
      user_id: req.user.id,
      provider_id: request.provider_id,
      rating,
      review,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (ratingError) {
    throw ratingError;
  }

  // Update provider average rating
  const { data: ratings } = await supabase
    .from('service_ratings')
    .select('rating')
    .eq('provider_id', request.provider_id);

  if (ratings && ratings.length > 0) {
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    
    await supabase
      .from('service_providers')
      .update({ 
        rating: Math.round(averageRating * 10) / 10,
        total_ratings: ratings.length
      })
      .eq('id', request.provider_id);
  }

  res.status(201).json({
    success: true,
    message: 'Rating submitted successfully',
    data: {
      rating: {
        id: newRating.id,
        rating: newRating.rating,
        review: newRating.review,
        createdAt: newRating.created_at
      }
    }
  });
}));

// @desc    Get service providers
// @route   GET /api/services/providers
// @access  Public
router.get('/providers', asyncHandler(async (req, res) => {
  const { 
    serviceType, 
    city, 
    minRating = 0,
    sortBy = 'rating',
    sortOrder = 'desc',
    page = 1,
    limit = 12
  } = req.query;

  const offset = (page - 1) * limit;

  let query = supabase
    .from('service_providers')
    .select(`
      *,
      service_provider_services (service_type),
      service_ratings (rating, review, created_at, users(user_profiles(first_name, last_name)))
    `, { count: 'exact' })
    .eq('status', 'active')
    .gte('rating', minRating);

  if (serviceType && serviceType !== 'all') {
    // This would need a proper join in production
    query = query.contains('services', [serviceType]);
  }

  if (city) {
    query = query.or(`city.ilike.%${city}%, service_areas.cs.{${city}}`);
  }

  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data: providers, error, count } = await query;

  if (error) {
    throw error;
  }

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    data: {
      providers: providers.map(provider => ({
        id: provider.id,
        name: provider.name,
        description: provider.description,
        services: provider.services,
        rating: provider.rating,
        totalRatings: provider.total_ratings,
        phone: provider.phone,
        email: provider.email,
        avatar: provider.avatar,
        city: provider.city,
        state: provider.state,
        serviceAreas: provider.service_areas,
        experience: provider.experience,
        verified: provider.verified,
        recentReviews: provider.service_ratings?.slice(0, 3) || []
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount: count,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: parseInt(limit)
      }
    }
  });
}));

// @desc    Get service categories
// @route   GET /api/services/categories
// @access  Public
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = [
    {
      id: 'home_loan',
      name: 'Home Loans',
      description: 'Get competitive home loan rates from top banks and NBFCs',
      icon: 'CreditCard',
      color: 'blue'
    },
    {
      id: 'movers',
      name: 'Packers & Movers',
      description: 'Professional moving services for your relocation needs',
      icon: 'Truck',
      color: 'green'
    },
    {
      id: 'legal',
      name: 'Legal Services',
      description: 'Property legal assistance and documentation',
      icon: 'FileText',
      color: 'purple'
    },
    {
      id: 'interior',
      name: 'Interior Design',
      description: 'Transform your space with professional interior designers',
      icon: 'Home',
      color: 'orange'
    },
    {
      id: 'cleaning',
      name: 'Cleaning Services',
      description: 'Professional cleaning services for homes and offices',
      icon: 'Sparkles',
      color: 'pink'
    },
    {
      id: 'security',
      name: 'Security Services',
      description: 'Home security systems and services',
      icon: 'Shield',
      color: 'red'
    }
  ];

  // Get provider counts for each category
  const categoriesWithCounts = await Promise.all(
    categories.map(async (category) => {
      const { count } = await supabase
        .from('service_providers')
        .select('*', { count: 'exact', head: true })
        .contains('services', [category.id])
        .eq('status', 'active');

      return {
        ...category,
        providerCount: count || 0
      };
    })
  );

  res.json({
    success: true,
    data: {
      categories: categoriesWithCounts
    }
  });
}));

module.exports = router;