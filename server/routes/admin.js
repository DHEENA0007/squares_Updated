const express = require('express');
const { supabase } = require('../config/database');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

// All admin routes require admin role
router.use(authorizeRoles('admin'));

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
router.get('/dashboard', asyncHandler(async (req, res) => {
  // Get counts for different entities
  const [
    { count: totalUsers },
    { count: totalProperties },
    { count: activeProperties },
    { count: pendingProperties },
    { count: totalInquiries },
    { count: serviceRequests },
    { count: completedServices }
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('property_inquiries').select('*', { count: 'exact', head: true }),
    supabase.from('service_requests').select('*', { count: 'exact', head: true }),
    supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed')
  ]);

  // Get recent activities
  const { data: recentUsers } = await supabase
    .from('users')
    .select('id, email, role, created_at, user_profiles(first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: recentProperties } = await supabase
    .from('properties')
    .select('id, title, city, state, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  // Calculate growth rates (mock data for now)
  const stats = {
    totalUsers: totalUsers || 0,
    totalProperties: totalProperties || 0,
    activeProperties: activeProperties || 0,
    pendingProperties: pendingProperties || 0,
    totalInquiries: totalInquiries || 0,
    serviceRequests: serviceRequests || 0,
    completedServices: completedServices || 0,
    userGrowth: 12.5, // Mock percentage
    propertyGrowth: 8.3, // Mock percentage
    inquiryGrowth: 15.7, // Mock percentage
    recentUsers: recentUsers || [],
    recentProperties: recentProperties || []
  };

  res.json({
    success: true,
    data: { stats }
  });
}));

// @desc    Get all users with pagination
// @route   GET /api/admin/users
// @access  Private (Admin only)
router.get('/users', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    role, 
    status, 
    search,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;

  const offset = (page - 1) * limit;

  let query = supabase
    .from('users')
    .select(`
      id, email, role, status, created_at,
      user_profiles (first_name, last_name, phone, avatar, last_login)
    `, { count: 'exact' });

  if (role && role !== 'all') {
    query = query.eq('role', role);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`email.ilike.%${search}%`);
  }

  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data: users, error, count } = await query;

  if (error) {
    throw error;
  }

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    data: {
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        profile: user.user_profiles[0] || null
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

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin only)
router.put('/users/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'suspended', 'pending'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be active, suspended, or pending'
    });
  }

  const { data: user, error } = await supabase
    .from('users')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('id, email, status')
    .single();

  if (error) {
    throw error;
  }

  res.json({
    success: true,
    message: 'User status updated successfully',
    data: { user }
  });
}));

// @desc    Get all properties with admin details
// @route   GET /api/admin/properties
// @access  Private (Admin only)
router.get('/properties', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    status, 
    propertyType,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;

  const offset = (page - 1) * limit;

  let query = supabase
    .from('properties')
    .select(`
      *,
      users!properties_owner_id_fkey (
        id, email,
        user_profiles (first_name, last_name, phone)
      ),
      property_images (id, url, is_primary)
    `, { count: 'exact' });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (propertyType && propertyType !== 'all') {
    query = query.eq('property_type', propertyType);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%, city.ilike.%${search}%, state.ilike.%${search}%`);
  }

  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data: properties, error, count } = await query;

  if (error) {
    throw error;
  }

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    data: {
      properties: properties.map(property => ({
        ...property,
        owner: property.users ? {
          id: property.users.id,
          email: property.users.email,
          name: property.users.user_profiles[0] ? 
            `${property.users.user_profiles[0].first_name} ${property.users.user_profiles[0].last_name}` : 
            'Unknown',
          phone: property.users.user_profiles[0]?.phone
        } : null,
        images: property.property_images || []
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

// @desc    Update property status
// @route   PUT /api/admin/properties/:id/status
// @access  Private (Admin only)  
router.put('/properties/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  if (!['active', 'pending', 'rejected', 'sold', 'rented'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status'
    });
  }

  const updateData = {
    status,
    updated_at: new Date().toISOString()
  };

  if (status === 'rejected' && rejectionReason) {
    updateData.rejection_reason = rejectionReason;
  }

  if (status === 'active') {
    updateData.approved_at = new Date().toISOString();
    updateData.approved_by = req.user.id;
  }

  const { data: property, error } = await supabase
    .from('properties')
    .update(updateData)
    .eq('id', id)
    .select('id, title, status')
    .single();

  if (error) {
    throw error;
  }

  res.json({
    success: true,
    message: 'Property status updated successfully',
    data: { property }
  });
}));

// @desc    Get service requests
// @route   GET /api/admin/service-requests
// @access  Private (Admin only)
router.get('/service-requests', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
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
      users!service_requests_user_id_fkey (
        id, email,
        user_profiles (first_name, last_name, phone)
      ),
      properties (id, title, city, state),
      service_providers (id, name, rating)
    `, { count: 'exact' });

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
        ...request,
        user: request.users ? {
          id: request.users.id,
          email: request.users.email,
          name: request.users.user_profiles[0] ? 
            `${request.users.user_profiles[0].first_name} ${request.users.user_profiles[0].last_name}` : 
            'Unknown',
          phone: request.users.user_profiles[0]?.phone
        } : null
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

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private (Admin only)
router.get('/settings', asyncHandler(async (req, res) => {
  const { data: settings, error } = await supabase
    .from('system_settings')
    .select('*')
    .order('category');

  if (error) {
    throw error;
  }

  // Group settings by category
  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {});

  res.json({
    success: true,
    data: { settings: groupedSettings }
  });
}));

// @desc    Update system setting
// @route   PUT /api/admin/settings/:key
// @access  Private (Admin only)
router.put('/settings/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  const { data: setting, error } = await supabase
    .from('system_settings')
    .update({ 
      value,
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    })
    .eq('key', key)
    .select()
    .single();

  if (error) {
    throw error;
  }

  res.json({
    success: true,
    message: 'Setting updated successfully',
    data: { setting }
  });
}));

module.exports = router;