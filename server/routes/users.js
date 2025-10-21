const express = require('express');
const { supabase } = require('../config/database');
const { asyncHandler } = require('../middleware/errorMiddleware');
const router = express.Router();

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', asyncHandler(async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id, email, role, status, created_at,
      user_profiles (
        first_name, last_name, phone, avatar, bio, address,
        date_of_birth, gender, preferences, email_verified,
        last_login, created_at as profile_created_at
      )
    `)
    .eq('id', req.user.id)
    .single();

  if (error) {
    throw error;
  }

  // Get user statistics
  const [
    { count: totalProperties },
    { count: totalFavorites },
    { count: totalInquiries },
    { count: totalServiceRequests }
  ] = await Promise.all([
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('owner_id', req.user.id),
    supabase.from('user_favorites').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id),
    supabase.from('property_inquiries').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id),
    supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id)
  ]);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        profile: user.user_profiles[0],
        statistics: {
          totalProperties: totalProperties || 0,
          totalFavorites: totalFavorites || 0,
          totalInquiries: totalInquiries || 0,
          totalServiceRequests: totalServiceRequests || 0
        }
      }
    }
  });
}));

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    phone,
    bio,
    address,
    dateOfBirth,
    gender,
    preferences
  } = req.body;

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      phone,
      bio,
      address,
      date_of_birth: dateOfBirth,
      gender,
      preferences,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { profile }
  });
}));

// @desc    Update user avatar
// @route   PUT /api/users/avatar
// @access  Private
router.put('/avatar', asyncHandler(async (req, res) => {
  const { avatar } = req.body;

  if (!avatar) {
    return res.status(400).json({
      success: false,
      message: 'Avatar URL is required'
    });
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({ 
      avatar,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', req.user.id);

  if (error) {
    throw error;
  }

  res.json({
    success: true,
    message: 'Avatar updated successfully',
    data: { avatar }
  });
}));

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
router.put('/preferences', asyncHandler(async (req, res) => {
  const { preferences } = req.body;

  const { error } = await supabase
    .from('user_profiles')
    .update({ 
      preferences,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', req.user.id);

  if (error) {
    throw error;
  }

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: { preferences }
  });
}));

// @desc    Get user activity
// @route   GET /api/users/activity
// @access  Private
router.get('/activity', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  // Get recent activities (property views, favorites, inquiries, etc.)
  const activities = [];

  // Property views
  const { data: recentViews } = await supabase
    .from('property_views')
    .select(`
      viewed_at,
      properties (id, title, city, state, price)
    `)
    .eq('user_id', req.user.id)
    .order('viewed_at', { ascending: false })
    .limit(10);

  if (recentViews) {
    activities.push(...recentViews.map(view => ({
      type: 'property_view',
      action: 'Viewed property',
      details: view.properties.title,
      timestamp: view.viewed_at,
      metadata: view.properties
    })));
  }

  // Recent favorites
  const { data: recentFavorites } = await supabase
    .from('user_favorites')
    .select(`
      created_at,
      properties (id, title, city, state, price)
    `)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentFavorites) {
    activities.push(...recentFavorites.map(fav => ({
      type: 'favorite_added',
      action: 'Added to favorites',
      details: fav.properties.title,
      timestamp: fav.created_at,
      metadata: fav.properties
    })));
  }

  // Recent inquiries
  const { data: recentInquiries } = await supabase
    .from('property_inquiries')
    .select(`
      created_at, inquiry_type,
      properties (id, title, city, state, price)
    `)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentInquiries) {
    activities.push(...recentInquiries.map(inquiry => ({
      type: 'property_inquiry',
      action: `Made ${inquiry.inquiry_type} inquiry`,
      details: inquiry.properties.title,
      timestamp: inquiry.created_at,
      metadata: inquiry.properties
    })));
  }

  // Sort all activities by timestamp
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Apply pagination
  const paginatedActivities = activities.slice(offset, offset + limit);
  const totalCount = activities.length;
  const totalPages = Math.ceil(totalCount / limit);

  res.json({
    success: true,
    data: {
      activities: paginatedActivities,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: parseInt(limit)
      }
    }
  });
}));

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
router.delete('/account', asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password confirmation is required'
    });
  }

  // Verify password
  const bcrypt = require('bcrypt');
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('password')
    .eq('id', req.user.id)
    .single();

  if (userError || !user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid password'
    });
  }

  // Instead of deleting, deactivate the account
  const { error: deactivateError } = await supabase
    .from('users')
    .update({ 
      status: 'deactivated',
      deactivated_at: new Date().toISOString()
    })
    .eq('id', req.user.id);

  if (deactivateError) {
    throw deactivateError;
  }

  res.json({
    success: true,
    message: 'Account deactivated successfully'
  });
}));

module.exports = router;