const express = require('express');
const User = require('../models/User');
const Property = require('../models/Property');
const Favorite = require('../models/Favorite');
const Message = require('../models/Message');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const bcrypt = require('bcrypt');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
router.get('/', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    search, 
    role, 
    status 
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Build filter object
  const filter = {};
  
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { 'profile.firstName': { $regex: search, $options: 'i' } },
      { 'profile.lastName': { $regex: search, $options: 'i' } }
    ];
  }
  
  if (role) {
    filter.role = role;
  }
  
  if (status) {
    filter.status = status;
  }

  // Get total count for pagination
  const totalUsers = await User.countDocuments(filter);
  
  // Get users with pagination
  const users = await User.find(filter)
    .select('-password -verificationToken')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const totalPages = Math.ceil(totalUsers / parseInt(limit));

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
}));

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -verificationToken');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { user }
  });
}));

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password -verificationToken');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get user statistics
  const [totalProperties, totalFavorites, totalMessages] = await Promise.all([
    Property.countDocuments({ owner: req.user.id }),
    Favorite.countDocuments({ user: req.user.id }),
    Message.countDocuments({ $or: [{ sender: req.user.id }, { recipient: req.user.id }] })
  ]);

  res.json({
    success: true,
    data: {
      user: {
        ...user.toObject(),
        statistics: {
          totalProperties,
          totalFavorites,
          totalMessages
        }
      }
    }
  });
}));

// @desc    Create new user (Admin only)
// @route   POST /api/users
// @access  Private/Admin
router.post('/', asyncHandler(async (req, res) => {
  const {
    email,
    password,
    profile,
    role = 'user',
    status = 'active'
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = await User.create({
    email,
    password: hashedPassword,
    profile,
    role,
    status,
    emailVerified: true // Admin created users are auto-verified
  });

  // Remove password from response
  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.verificationToken;

  res.status(201).json({
    success: true,
    data: { user: userResponse }
  });
}));

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
router.put('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Only allow users to update their own profile or admin to update any
  if (req.user.id.toString() !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this user'
    });
  }

  const {
    profile,
    preferences,
    role,
    status
  } = req.body;

  // Update fields
  if (profile) {
    user.profile = { ...user.profile, ...profile };
  }
  
  if (preferences) {
    user.preferences = { ...user.preferences, ...preferences };
  }

  // Only admin can update role and status
  if (req.user.role === 'admin') {
    if (role) user.role = role;
    if (status) user.status = status;
  }

  await user.save();

  // Remove password from response
  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.verificationToken;

  res.json({
    success: true,
    data: { user: userResponse }
  });
}));

// @desc    Update user status
// @route   PATCH /api/users/:id/status
// @access  Private/Admin
router.patch('/:id/status', asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  const { status } = req.body;
  
  if (!['active', 'inactive', 'pending', 'suspended'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status value'
    });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).select('-password -verificationToken');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { user }
  });
}));

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Instead of deleting, deactivate the account
  user.status = 'inactive';
  user.deactivatedAt = new Date();
  await user.save();

  res.json({
    success: true,
    message: 'User account deactivated successfully'
  });
}));

// @desc    Get user activity
// @route   GET /api/users/activity
// @access  Private
router.get('/activity', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get user's recent activities
  const activities = [];

  // Recent properties created
  const recentProperties = await Property.find({ owner: req.user.id })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title createdAt');

  activities.push(...recentProperties.map(property => ({
    type: 'property_created',
    action: 'Created property',
    details: property.title,
    timestamp: property.createdAt,
    metadata: { propertyId: property._id }
  })));

  // Recent favorites
  const recentFavorites = await Favorite.find({ user: req.user.id })
    .populate('property', 'title')
    .sort({ createdAt: -1 })
    .limit(5);

  activities.push(...recentFavorites.map(favorite => ({
    type: 'favorite_added',
    action: 'Added to favorites',
    details: favorite.property.title,
    timestamp: favorite.createdAt,
    metadata: { propertyId: favorite.property._id }
  })));

  // Recent messages
  const recentMessages = await Message.find({
    $or: [{ sender: req.user.id }, { recipient: req.user.id }]
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('subject createdAt sender recipient');

  activities.push(...recentMessages.map(message => ({
    type: 'message',
    action: message.sender.toString() === req.user.id.toString() ? 'Sent message' : 'Received message',
    details: message.subject,
    timestamp: message.createdAt,
    metadata: { messageId: message._id }
  })));

  // Sort all activities by timestamp
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Apply pagination
  const paginatedActivities = activities.slice(skip, skip + parseInt(limit));
  const totalCount = activities.length;
  const totalPages = Math.ceil(totalCount / parseInt(limit));

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

module.exports = router;