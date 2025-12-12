const express = require('express');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Property = require('../models/Property');
const Favorite = require('../models/Favorite');
const Message = require('../models/Message');
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { PERMISSIONS, hasPermission, hasPermissionOrIsAdmin, isAdmin } = require('../utils/permissions');
const bcrypt = require('bcrypt');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// @desc    Get all users (Admin/Vendor - Vendors can only fetch customers)
// @route   GET /api/users
// @access  Private (requires users.view permission)
router.get('/', asyncHandler(async (req, res) => {
  // Check permission
  if (!hasPermission(req.user, PERMISSIONS.USERS_VIEW) && req.user.role !== 'agent') {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view users'
    });
  }

  const {
    page = 1,
    limit = 10,
    search,
    role,
    status,
    month
  } = req.query;

  console.log(`[Users API] User role: ${req.user.role}, Requested role filter: ${role}, Month filter: ${month}`);

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build filter object
  const filter = {};

  // Vendors (agents) can only fetch customers with allowMessages enabled
  if (req.user.role === 'agent') {
    filter.role = 'customer';
    filter.status = 'active'; // Only active customers
    filter['profile.preferences.privacy.allowMessages'] = { $ne: false }; // Only customers who allow messages
  } else if (role) {
    // If role filter is provided, use it directly
    filter.role = role;
  } else {
    // If no role filter, exclude superadmin users from the list by default
    filter.role = { $ne: 'superadmin' };
  }

  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { 'profile.firstName': { $regex: search, $options: 'i' } },
      { 'profile.lastName': { $regex: search, $options: 'i' } },
      { 'profile.phone': { $regex: search, $options: 'i' } }
    ];
  }

  if (status && req.user.role !== 'agent') {
    filter.status = status;
  }

  // Month filter - filter by creation month
  if (month && req.user.role !== 'agent') {
    const monthNum = parseInt(month);
    if (monthNum >= 1 && monthNum <= 12) {
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, monthNum - 1, 1);
      const endDate = new Date(currentYear, monthNum, 0, 23, 59, 59, 999);
      filter.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }
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

// @desc    Get all users (no pagination)
// @route   GET /api/users/all
// @access  Private (Admin only)
router.get('/all', authorizeRoles('admin', 'superadmin'), asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('-password -verificationToken')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: {
      users
    }
  });
}));

// @desc    Check if email/phone/businessName is available
// @route   POST /api/users/check-availability
// @access  Private/Admin
router.post('/check-availability', authorizeRoles('admin', 'subadmin', 'superadmin'), asyncHandler(async (req, res) => {
  const { email, phone, businessName, userId } = req.body;

  const result = {
    email: { available: true, message: '' },
    phone: { available: true, message: '' },
    businessName: { available: true, message: '' }
  };

  if (email) {
    const query = { email: email.toLowerCase() };
    if (userId) {
      query._id = { $ne: userId };
    }
    const existingEmail = await User.findOne(query);
    if (existingEmail) {
      result.email.available = false;
      result.email.message = 'Email is already registered';
    }
  }

  if (phone) {
    const query = { 'profile.phone': phone };
    if (userId) {
      query._id = { $ne: userId };
    }
    const existingPhone = await User.findOne(query);
    if (existingPhone) {
      result.phone.available = false;
      result.phone.message = 'Phone number is already registered';
    }
  }

  if (businessName) {
    const Vendor = require('../models/Vendor');
    const trimmedName = businessName.trim();
    const query = {
      'businessInfo.companyName': new RegExp(`^${trimmedName}$`, 'i')
    };
    const existingBusiness = await Vendor.findOne(query);
    if (existingBusiness) {
      result.businessName.available = false;
      result.businessName.message = 'Business name is already registered';
    }
  }

  res.json({
    success: true,
    data: result
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

// @desc    Create new user (Admin only)
// @route   POST /api/users
// @access  Private (requires users.create permission)
router.post('/', asyncHandler(async (req, res) => {
  // Check permission
  if (!hasPermission(req.user, PERMISSIONS.USERS_CREATE)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to create users'
    });
  }

  const {
    email,
    password,
    profile,
    role = 'user',
    status = 'active',
    businessInfo
  } = req.body;

  // Validate required fields
  if (!email || !password || !profile) {
    return res.status(400).json({
      success: false,
      message: 'Email, password, and profile are required'
    });
  }

  if (!profile.firstName || !profile.phone) {
    return res.status(400).json({
      success: false,
      message: 'First name and phone number are required'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  // Validate phone format (10 digits)
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(profile.phone)) {
    return res.status(400).json({
      success: false,
      message: 'Phone number must be exactly 10 digits'
    });
  }

  // Validate password strength
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long'
    });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must contain uppercase, lowercase, number, and special character (!@#$%^&*)'
    });
  }

  // Check if user with email already exists
  const existingUserEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingUserEmail) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Check if user with phone already exists
  const existingUserPhone = await User.findOne({ 'profile.phone': profile.phone });
  if (existingUserPhone) {
    return res.status(400).json({
      success: false,
      message: 'User with this phone number already exists'
    });
  }

  // Validate role if agent, require business info
  if (role === 'agent') {
    if (!businessInfo || !businessInfo.businessName || !businessInfo.businessType) {
      return res.status(400).json({
        success: false,
        message: 'Business name and business type are required for agent/vendor accounts'
      });
    }

    // Validate GST number format if provided
    if (businessInfo.gstNumber) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(businessInfo.gstNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid GST number format'
        });
      }
    }

    // Validate PAN number format if provided
    if (businessInfo.panNumber) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(businessInfo.panNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid PAN number format (should be like: ABCDE1234F)'
        });
      }
    }
  }

  // Create user - password will be hashed by pre-save middleware
  const user = await User.create({
    email,
    password, // Don't hash here, let the model's pre-save middleware handle it
    profile,
    role,
    status,
    emailVerified: true // Admin created users are auto-verified
  });

  // If role is agent/vendor, create vendor profile
  if (role === 'agent') {
    try {
      console.log(`[User Creation] Creating vendor profile for ${email}`);
      console.log(`[User Creation] businessInfo provided:`, !!businessInfo);

      // Check if vendor profile already exists
      const existingVendor = await Vendor.findOne({ user: user._id });
      if (existingVendor) {
        console.log(`[User Creation] Vendor profile already exists for user ${email}`);
        user.vendorProfile = existingVendor._id;
        await user.save();
      } else {
        // Ensure businessInfo has required fields
        const companyName = businessInfo?.businessName || `${profile.firstName} ${profile.lastName} Properties`;

        console.log(`[User Creation] Creating vendor with company name: ${companyName}`);
        console.log(`[User Creation] businessInfo data:`, JSON.stringify(businessInfo, null, 2));

        // Parse service areas properly
        let serviceAreas = [];
        if (businessInfo?.serviceAreas && Array.isArray(businessInfo.serviceAreas)) {
          serviceAreas = businessInfo.serviceAreas.map(area => {
            if (typeof area === 'string') {
              // If it's a string like "Mumbai, Maharashtra", parse it
              const parts = area.split(',').map(p => p.trim());
              return {
                city: parts[0] || '',
                state: parts[1] || '',
                district: ''
              };
            }
            // If it's already an object, return it
            return area;
          });
        }

        const vendorData = {
          user: user._id,
          businessInfo: {
            companyName: companyName,
            businessType: businessInfo?.businessType || 'real_estate_agent',
            licenseNumber: businessInfo?.licenseNumber || undefined,
            gstNumber: businessInfo?.gstNumber || undefined,
            panNumber: businessInfo?.panNumber || undefined,
            website: businessInfo?.website || undefined,
          },
          professionalInfo: {
            experience: businessInfo?.experience ? parseInt(businessInfo.experience) : 0,
            specializations: Array.isArray(businessInfo?.specializations) ? businessInfo.specializations : [],
            serviceAreas: serviceAreas,
            languages: ['english'],
            certifications: []
          },
          contactInfo: {
            officeAddress: {
              street: profile.address?.street || '',
              area: '',
              city: profile.address?.city || '',
              state: profile.address?.state || '',
              district: profile.address?.district || '',
              country: profile.address?.country || 'India',
              countryCode: profile.address?.countryCode || 'IN',
              stateCode: profile.address?.stateCode || '',
              districtCode: profile.address?.districtCode || '',
              cityCode: profile.address?.cityCode || '',
              pincode: profile.address?.zipCode || '',
              landmark: ''
            },
            officePhone: profile.phone || '',
            whatsappNumber: profile.phone || '',
            socialMedia: {
              facebook: '',
              instagram: '',
              linkedin: '',
              twitter: '',
              youtube: ''
            }
          },
          performance: {
            rating: {
              average: 0,
              count: 0,
              breakdown: { five: 0, four: 0, three: 0, two: 0, one: 0 }
            },
            statistics: {
              totalProperties: 0,
              activeListing: 0,
              soldProperties: 0,
              rentedProperties: 0,
              totalViews: 0,
              totalLeads: 0,
              totalClients: 0,
              responseTime: { average: 0, lastCalculated: new Date() }
            }
          },
          status: 'active',
          verification: {
            isVerified: true,
            verificationLevel: 'basic',
            verificationDate: new Date()
          },
          approval: {
            status: 'approved',
            submittedAt: new Date(),
            reviewedAt: new Date(),
            reviewedBy: req.user?.id,
            approvalNotes: 'Created by admin - auto-approved',
            submittedDocuments: []
          },
          settings: {
            notifications: {
              emailNotifications: true,
              smsNotifications: true,
              leadAlerts: true,
              marketingEmails: false,
              weeklyReports: true
            },
            privacy: {
              showContactInfo: true,
              showPerformanceStats: true,
              allowDirectContact: true
            }
          },
          metadata: {
            source: 'admin',
            notes: 'Created by admin user'
          }
        };

        const vendor = await Vendor.create(vendorData);

        // Link vendor profile to user
        user.vendorProfile = vendor._id;
        await user.save();

        // Verify vendor can be found
        const verifyVendor = await Vendor.findByUserId(user._id);
        if (!verifyVendor) {
          console.error(`[User Creation] WARNING: Vendor profile created but not accessible via findByUserId`);
        } else {
          console.log(`[User Creation] ✓ Vendor profile created and verified: ${vendor._id}`);
        }
      }
    } catch (vendorError) {
      console.error('[User Creation] Error creating vendor profile:', vendorError);
      console.error('[User Creation] Vendor error details:', {
        message: vendorError.message,
        code: vendorError.code,
        keyPattern: vendorError.keyPattern,
        keyValue: vendorError.keyValue,
        userId: user._id.toString()
      });

      // Check if it's a duplicate key error
      if (vendorError.code === 11000) {
        console.error('[User Creation] Duplicate key error - attempting to clean up and retry');

        // Try to find if vendor exists
        const existingVendorAfterError = await Vendor.findOne({ user: user._id });
        if (existingVendorAfterError) {
          console.log('[User Creation] Vendor exists after duplicate error - linking to user');
          user.vendorProfile = existingVendorAfterError._id;
          await user.save();
        } else {
          // Delete the user if we can't fix the vendor profile issue
          await User.findByIdAndDelete(user._id);

          return res.status(500).json({
            success: false,
            message: `Failed to create vendor profile: ${vendorError.message}`,
            error: 'Duplicate business name or license number'
          });
        }
      } else {
        // For other errors, log but don't delete the user
        // Admin can fix the vendor profile later using the fix endpoint
        console.error('[User Creation] Non-duplicate error - user created but vendor profile failed');
        console.error('[User Creation] Admin can fix this using POST /api/users/:id/fix-vendor-profile');

        // Return warning instead of error
        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.verificationToken;

        return res.status(201).json({
          success: true,
          warning: 'User created but vendor profile creation failed. Please contact support.',
          data: { user: userResponse },
          fixEndpoint: `/api/users/${user._id}/fix-vendor-profile`
        });
      }
    }
  }

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

  // Only allow users to update their own profile or users with edit permission
  if (req.user.id.toString() !== req.params.id && !hasPermission(req.user, PERMISSIONS.USERS_EDIT)) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized to update this user'
    });
  }

  const {
    profile,
    preferences,
    role,
    status
  } = req.body;

  // Helper function to deeply merge objects, filtering out undefined values
  const deepMerge = (target, source) => {
    const result = { ...target };

    for (const key in source) {
      if (source[key] === undefined) {
        continue; // Skip undefined values
      }

      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        // Check if source object has any defined values recursively
        const hasDefinedValues = (obj) => {
          return Object.values(obj).some(v => {
            if (v === undefined) return false;
            if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
              return hasDefinedValues(v);
            }
            return true;
          });
        };

        if (!hasDefinedValues(source[key])) {
          continue; // Skip objects with only undefined values
        }

        // If both target and source have object values, merge them recursively
        if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
          result[key] = deepMerge(result[key], source[key]);
        } else {
          result[key] = source[key];
        }
      } else {
        result[key] = source[key];
      }
    }

    return result;
  };

  // Helper function to clean object from undefined values
  const cleanObject = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

    const cleaned = {};
    for (const key in obj) {
      if (obj[key] === undefined) continue;

      if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        const cleanedNested = cleanObject(obj[key]);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = obj[key];
      }
    }
    return cleaned;
  };

  // Update fields
  if (profile) {
    const cleanedProfile = cleanObject(profile);
    if (Object.keys(cleanedProfile).length > 0) {
      user.profile = deepMerge(user.profile || {}, cleanedProfile);
    }
  }

  // Handle preferences if sent separately (for backward compatibility)
  if (preferences !== undefined && typeof preferences === 'object' && preferences !== null) {
    const cleanedPreferences = cleanObject(preferences);
    if (Object.keys(cleanedPreferences).length > 0) {
      if (!user.profile.preferences) {
        user.profile.preferences = {};
      }
      user.profile.preferences = deepMerge(user.profile.preferences, cleanedPreferences);
    }
  }

  // Only admin can update role and status
  if (['admin', 'superadmin'].includes(req.user.role)) {
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

// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const {
    email,
    profile,
    preferences,
  } = req.body;

  // Check if email or phone is being changed - these require OTP verification
  const isEmailChanging = email && email !== user.email;
  const isPhoneChanging = profile?.phone && profile.phone !== user.profile.phone;

  if (isEmailChanging || isPhoneChanging) {
    return res.status(403).json({
      success: false,
      requiresOTP: true,
      message: 'Email and phone changes require verification. Please use the OTP verification flow.',
      endpoint: '/api/auth/request-profile-update-otp'
    });
  }

  // Helper function to deeply merge objects, filtering out undefined values
  const deepMerge = (target, source) => {
    const result = { ...target };

    for (const key in source) {
      if (source[key] === undefined) {
        continue; // Skip undefined values
      }

      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        // Check if source object has any defined values recursively
        const hasDefinedValues = (obj) => {
          return Object.values(obj).some(v => {
            if (v === undefined) return false;
            if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
              return hasDefinedValues(v);
            }
            return true;
          });
        };

        if (!hasDefinedValues(source[key])) {
          continue; // Skip objects with only undefined values
        }

        // If both target and source have object values, merge them recursively
        if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
          result[key] = deepMerge(result[key], source[key]);
        } else {
          result[key] = source[key];
        }
      } else {
        result[key] = source[key];
      }
    }

    return result;
  };

  // Helper function to clean object from undefined values
  const cleanObject = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

    const cleaned = {};
    for (const key in obj) {
      if (obj[key] === undefined) continue;

      if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        const cleanedNested = cleanObject(obj[key]);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = obj[key];
      }
    }
    return cleaned;
  };

  // Update fields
  if (profile) {
    const cleanedProfile = cleanObject(profile);
    if (Object.keys(cleanedProfile).length > 0) {
      user.profile = deepMerge(user.profile || {}, cleanedProfile);
    }
  }

  // Handle preferences if sent separately (for backward compatibility)
  if (preferences !== undefined && typeof preferences === 'object' && preferences !== null) {
    const cleanedPreferences = cleanObject(preferences);
    if (Object.keys(cleanedPreferences).length > 0) {
      if (!user.profile.preferences) {
        user.profile.preferences = {};
      }
      user.profile.preferences = deepMerge(user.profile.preferences, cleanedPreferences);
    }
  }

  await user.save();

  // Get updated statistics
  const [totalProperties, totalFavorites, totalMessages] = await Promise.all([
    Property.countDocuments({ owner: req.user.id }),
    Favorite.countDocuments({ user: req.user.id }),
    Message.countDocuments({ $or: [{ sender: req.user.id }, { recipient: req.user.id }] })
  ]);

  // Remove password from response
  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.verificationToken;

  res.json({
    success: true,
    data: {
      user: {
        ...userResponse,
        statistics: {
          totalProperties,
          totalFavorites,
          totalMessages
        }
      }
    }
  });
}));

// @desc    Update user status
// @route   PATCH /api/users/:id/status
// @access  Private (requires users.status permission)
router.patch('/:id/status', asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, PERMISSIONS.USERS_STATUS)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to change user status'
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

// @desc    Promote user to different role
// @route   PATCH /api/users/:id/promote
// @access  Private/Admin (with users.promote permission)
router.patch('/:id/promote', asyncHandler(async (req, res) => {
  // Allow superadmin, admin, subadmin, and custom roles with users.promote permission
  const defaultRoles = ['customer', 'agent', 'admin', 'subadmin', 'superadmin'];
  const isCustomRole = !defaultRoles.includes(req.user.role);
  const hasPromotePermission = req.user.rolePermissions && req.user.rolePermissions.includes('users.promote');

  if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'subadmin' && !hasPromotePermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to promote users'
    });
  }

  const { role } = req.body;

  // Check if role exists in Role collection
  const Role = require('../models/Role');
  const roleDoc = await Role.findOne({ name: role });

  if (!roleDoc && !['customer', 'agent', 'admin', 'subadmin', 'superadmin'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role value. Role does not exist.'
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const oldRole = user.role;
  user.role = role;

  // Get role pages from Role collection
  try {
    const Role = require('../models/Role');
    const roleDoc = await Role.findOne({ name: role });

    if (roleDoc && roleDoc.pages) {
      user.rolePages = roleDoc.pages;
    } else {
      user.rolePages = [];
    }
  } catch (error) {
    console.error('Error fetching role pages:', error);
    user.rolePages = [];
  }

  await user.save();

  // Send notification email
  try {
    const { sendTemplateEmail } = require('../utils/emailService');
    await sendTemplateEmail(
      user.email,
      'role-promotion',
      {
        firstName: user.profile?.firstName || 'User',
        oldRole,
        newRole: role,
        websiteUrl: process.env.FRONTEND_URL || 'https://buildhomemartsquares.com'
      }
    );
    console.log(`✅ Role promotion notification sent to ${user.email}`);
  } catch (emailError) {
    console.error('❌ Failed to send promotion notification email:', emailError);
  }

  // Remove password from response
  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.verificationToken;

  res.json({
    success: true,
    message: `User promoted from ${oldRole} to ${role}`,
    data: { user: userResponse }
  });
}));

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (requires users.delete permission)
router.delete('/:id', asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, PERMISSIONS.USERS_DELETE)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to delete users'
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Store user data for email notification before deletion
  const userData = {
    email: user.email,
    firstName: user.profile?.firstName || 'User',
    lastName: user.profile?.lastName || '',
    role: user.role
  };

  try {
    // Import email service
    const { sendTemplateEmail } = require('../utils/emailService');

    // Check for active properties or subscriptions before deletion

    const [properties, subscriptions] = await Promise.all([
      Property.countDocuments({ owner: req.params.id }),
      Subscription.countDocuments({ user: req.params.id, status: 'active' })
    ]);

    // Clean up related data first
    if (properties > 0) {
      // Deactivate user's properties instead of deleting them
      await Property.updateMany(
        { owner: req.params.id },
        { status: 'inactive', deactivatedAt: new Date() }
      );
    }

    if (subscriptions > 0) {
      // Cancel active subscriptions
      await Subscription.updateMany(
        { user: req.params.id, status: 'active' },
        { status: 'cancelled', cancelledAt: new Date() }
      );
    }

    // Clean up other related data (messages, notifications, etc.)

    await Promise.all([
      // Remove user's messages
      Message.deleteMany({ sender: req.params.id }),
      // Remove user's notifications
      Notification.deleteMany({ user: req.params.id })
    ]);

    // Delete the user completely from the database
    await User.findByIdAndDelete(req.params.id);

    // Send deletion notification email
    try {
      await sendTemplateEmail(
        userData.email,
        'account-deleted',
        {
          firstName: userData.firstName,
          email: userData.email,
          role: userData.role,
          deletionDate: new Date().toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          reason: req.body.reason || 'Account deleted by administrator',
          websiteUrl: process.env.FRONTEND_URL || 'https://buildhomemartsquares.com'
        }
      );
      console.log(`✅ Account deletion notification sent to ${userData.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send deletion notification email:', emailError);
      // Continue with deletion even if email fails
    }

    res.json({
      success: true,
      message: `User account permanently deleted and notification sent to ${userData.email}`,
      deletedUser: {
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`.trim(),
        role: userData.role
      }
    });

  } catch (error) {
    console.error('Error during user deletion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user account: ' + error.message
    });
  }
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

// @desc    Fix vendor profile for a user
// @route   POST /api/users/:id/fix-vendor-profile
// @access  Private/Admin
router.post('/:id/fix-vendor-profile', authorizeRoles('admin', 'superadmin'), asyncHandler(async (req, res) => {
  const userId = req.params.id;

  console.log(`[Fix Vendor Profile] Attempting to fix vendor profile for user: ${userId}`);

  // Get the user
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if user is an agent
  if (user.role !== 'agent') {
    return res.status(400).json({
      success: false,
      message: 'User is not an agent/vendor'
    });
  }

  // Check if vendor profile already exists
  let vendor = await Vendor.findOne({ user: userId });

  if (vendor) {
    console.log(`[Fix Vendor Profile] Vendor profile already exists: ${vendor._id}`);

    // Update user reference if missing
    if (!user.vendorProfile || user.vendorProfile.toString() !== vendor._id.toString()) {
      user.vendorProfile = vendor._id;
      await user.save();
      console.log(`[Fix Vendor Profile] Updated user vendorProfile reference`);
    }

    return res.json({
      success: true,
      message: 'Vendor profile already exists and is linked',
      data: {
        vendorId: vendor._id,
        status: vendor.status,
        approvalStatus: vendor.approval.status
      }
    });
  }

  // Create vendor profile if it doesn't exist
  console.log(`[Fix Vendor Profile] Creating new vendor profile for user: ${userId}`);

  const vendorData = {
    user: user._id,
    businessInfo: {
      companyName: `${user.profile.firstName} ${user.profile.lastName} Business`,
      businessType: 'real_estate_agent'
    },
    professionalInfo: {
      experience: 0,
      specializations: [],
      serviceAreas: [],
      languages: ['english'],
      certifications: []
    },
    contactInfo: {
      officeAddress: {
        street: user.profile.address?.street || '',
        city: user.profile.address?.city || '',
        state: user.profile.address?.state || '',
        district: user.profile.address?.district || '',
        country: 'India',
        countryCode: 'IN',
        pincode: user.profile.address?.zipCode || ''
      },
      officePhone: user.profile.phone || '',
      whatsappNumber: user.profile.phone || ''
    },
    status: 'active',
    verification: {
      isVerified: true,
      verificationLevel: 'basic',
      verificationDate: new Date()
    },
    approval: {
      status: 'approved',
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy: req.user.id,
      approvalNotes: 'Auto-created by admin repair tool',
      submittedDocuments: []
    },
    metadata: {
      source: 'admin',
      notes: 'Created by admin repair tool'
    }
  };

  vendor = await Vendor.create(vendorData);

  // Link vendor profile to user
  user.vendorProfile = vendor._id;
  await user.save();

  console.log(`[Fix Vendor Profile] Successfully created vendor profile: ${vendor._id}`);

  res.json({
    success: true,
    message: 'Vendor profile created successfully',
    data: {
      vendorId: vendor._id,
      status: vendor.status,
      approvalStatus: vendor.approval.status
    }
  });
}));

module.exports = router;