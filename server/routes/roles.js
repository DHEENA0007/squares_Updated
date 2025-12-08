const express = require('express');
const Role = require('../models/Role');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const { PERMISSIONS, hasPermission } = require('../utils/permissions');
const router = express.Router();

// Apply auth middleware
router.use(authenticateToken);

// @desc    Get available pages
// @route   GET /api/roles/pages
// @access  Private/Admin
router.get('/pages', asyncHandler(async (req, res) => {
  // Allow admin, subadmin, and custom roles
  const defaultRoles = ['customer', 'agent', 'admin', 'subadmin', 'superadmin'];
  const isCustomRole = !defaultRoles.includes(req.user.role);

  if (!['superadmin', 'subadmin', 'admin'].includes(req.user.role) && !isCustomRole) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  const pages = {
    admin: [
      'dashboard',
      'users',
      'vendor_approvals',
      'messages',
      'roles',
      'clients',
      'properties',
      'plans',
      'addons',
      'privacy_policy',
      'refund_policy'
    ],
    subadmin: [
      'subadmin_dashboard',
      'property_reviews',
      'property_rejections',
      'content_moderation',
      'support_tickets',
      'vendor_performance',
      'addon_services',
      'notifications',
      'reports',
      'privacy_policy',
      'refund_policy'
    ],
    vendor: [
      'vendor_dashboard',
      'vendor_properties',
      'vendor_add_property',
      'vendor_leads',
      'vendor_messages',
      'vendor_analytics',
      'vendor_services',
      'vendor_subscription',
      'vendor_billing',
      'vendor_reviews',
      'vendor_profile'
    ],
    customer: [
      'customer_dashboard',
      'customer_search',
      'customer_favorites',
      'customer_compare',
      'customer_owned_properties',
      'customer_messages',
      'customer_services',
      'customer_reviews',
      'customer_profile',
      'customer_settings'
    ]
  };

  res.json({
    success: true,
    data: { pages }
  });
}));

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private/Admin
router.get('/', asyncHandler(async (req, res) => {
  // Check permission
  if (!hasPermission(req.user, PERMISSIONS.ROLES_VIEW)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view roles'
    });
  }

  const {
    page = 1,
    limit = 10,
    isActive,
    search
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build filter object
  const filter = {};

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
  const totalRoles = await Role.countDocuments(filter);

  // Get roles with pagination
  const roles = await Role.find(filter)
    .sort({ level: -1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Manually count users for each role
  const rolesWithUserCount = await Promise.all(
    roles.map(async (role) => {
      const userCount = await User.countDocuments({ role: role.name });
      return {
        ...role,
        userCount
      };
    })
  );

  const totalPages = Math.ceil(totalRoles / parseInt(limit));

  res.json({
    success: true,
    data: {
      roles: rolesWithUserCount,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRoles,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
}));

// @desc    Get single role
// @route   GET /api/roles/:id
// @access  Private/Admin
router.get('/:id', asyncHandler(async (req, res) => {
  // Allow admin, subadmin, and custom roles
  const defaultRoles = ['customer', 'agent', 'admin', 'subadmin', 'superadmin'];
  const isCustomRole = !defaultRoles.includes(req.user.role);

  if (!['superadmin', 'subadmin', 'admin'].includes(req.user.role) && !isCustomRole) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  const role = await Role.findById(req.params.id).lean();

  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }

  // Manually count users for this role
  const userCount = await User.countDocuments({ role: role.name });

  res.json({
    success: true,
    data: {
      role: {
        ...role,
        userCount
      }
    }
  });
}));

// @desc    Create new role (Admin only)
// @route   POST /api/roles
// @access  Private/Admin
router.post('/', asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, PERMISSIONS.ROLES_CREATE)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to create roles'
    });
  }

  const role = await Role.create(req.body);

  res.status(201).json({
    success: true,
    data: { role }
  });
}));

// @desc    Update role (Admin only)
// @route   PUT /api/roles/:id
// @access  Private/Admin
router.put('/:id', asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, PERMISSIONS.ROLES_EDIT)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to edit roles'
    });
  }

  const role = await Role.findById(req.params.id);

  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }

  // Only superadmin can modify system roles
  if (role.isSystemRole && req.user.role !== 'superadmin') {
    return res.status(400).json({
      success: false,
      message: 'Only superadmin can modify system roles'
    });
  }

  const updatedRole = await Role.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: { role: updatedRole }
  });
}));

// @desc    Toggle role status (Admin only)
// @route   PATCH /api/roles/:id/toggle-status
// @access  Private/Admin
router.patch('/:id/toggle-status', asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, PERMISSIONS.ROLES_EDIT)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to edit roles'
    });
  }

  const role = await Role.findById(req.params.id);

  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }

  // Only superadmin can deactivate system roles
  if (role.isSystemRole && role.isActive && req.user.role !== 'superadmin') {
    return res.status(400).json({
      success: false,
      message: 'Only superadmin can deactivate system roles'
    });
  }

  role.isActive = !role.isActive;
  await role.save();

  res.json({
    success: true,
    data: { role }
  });
}));

// @desc    Delete role (Admin only)
// @route   DELETE /api/roles/:id
// @access  Private/Admin
router.delete('/:id', asyncHandler(async (req, res) => {
  if (!['superadmin', 'subadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  const role = await Role.findById(req.params.id);

  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }

  // Only superadmin can delete system roles
  if (role.isSystemRole && req.user.role !== 'superadmin') {
    return res.status(400).json({
      success: false,
      message: 'Only superadmin can delete system roles'
    });
  }

  // Delete all users with this role
  const deletedUsers = await User.deleteMany({ role: role.name });
  console.log(`Deleted ${deletedUsers.deletedCount} users with role ${role.name}`);

  await Role.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Role deleted successfully'
  });
}));

module.exports = router;