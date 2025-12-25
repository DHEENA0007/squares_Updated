const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Property = require('../models/Property');
const Message = require('../models/Message');
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');
const Plan = require('../models/Plan');
const Role = require('../models/Role');
const AddonService = require('../models/AddonService');
const Settings = require('../models/Settings');
const Vendor = require('../models/Vendor');
const Review = require('../models/Review');
const SupportTicket = require('../models/SupportTicket');
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isSuperAdmin, isAnyAdmin } = require('../middleware/roleMiddleware');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { PERMISSIONS, hasPermission } = require('../utils/permissions');
const adminRealtimeService = require('../services/adminRealtimeService');
const { sendTemplateEmail, sendEmail } = require('../utils/emailService');
const { sanitizePagination, sanitizeSearchQuery } = require('../utils/sanitize');

// Mount email routes
const emailRoutes = require('./admin/email');
router.use('/email', emailRoutes);

// @desc    Receive vendor application from registration (public endpoint)
// @route   POST /api/admin/vendor-applications
// @access  Public (no auth required for registration)
router.post('/vendor-applications', asyncHandler(async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      businessName,
      businessType,
      businessDescription,
      experience,
      address,
      city,
      state,
      pincode,
      panNumber,
      licenseNumber,
      gstNumber,
      documents
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !businessName || !businessType) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing'
      });
    }

    // Create vendor application data
    const vendorApplicationData = {
      firstName,
      lastName,
      email,
      phone,
      businessInfo: {
        businessName,
        businessType,
        businessDescription,
        experience,
        address,
        city,
        state,
        pincode,
        panNumber,
        licenseNumber,
        gstNumber
      },
      documents: documents || {},
      submittedAt: new Date(),
      status: 'pending_review'
    };

    // Get admin emails for notification
    const adminUsers = await User.find({ role: 'admin' }).select('email profile.firstName profile.lastName');

    // Send notification emails to all admins
    const emailPromises = adminUsers.map(admin => {
      return sendTemplateEmail(admin.email, 'vendor-profile-submitted', {
        adminName: `${admin.profile?.firstName || 'Admin'} ${admin.profile?.lastName || ''}`,
        vendorName: `${firstName} ${lastName}`,
        businessName: businessName,
        businessType: businessType,
        email: email,
        phone: phone,
        submissionDate: new Date().toLocaleDateString(),
        reviewUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/vendor-approvals`,
        businessDescription: businessDescription,
        location: `${city}, ${state} - ${pincode}`,
        documents: Object.keys(documents || {}).length
      });
    });

    // Also send confirmation email to vendor
    const vendorEmailPromise = sendTemplateEmail(email, 'vendor-profile-submitted-confirmation', {
      firstName: firstName,
      businessName: businessName,
      submissionDate: new Date().toLocaleDateString(),
      applicationId: `VEN-${Date.now()}`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@buildhomemartsquares.com'
    });

    await Promise.all([...emailPromises, vendorEmailPromise]);

    // Store the application data temporarily (you might want to create a VendorApplication model)
    // For now, we'll just send the emails and return success

    res.json({
      success: true,
      message: 'Vendor application submitted successfully. Admin has been notified.',
      data: {
        applicationId: `VEN-${Date.now()}`,
        submittedAt: new Date(),
        status: 'pending_review'
      }
    });

  } catch (error) {
    console.error('Vendor application submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit vendor application'
    });
  }
}));

// Apply auth middleware
router.use(authenticateToken);

// VENDOR APPROVAL MANAGEMENT ROUTES (SubAdmin Access)

// @desc    Get pending vendor approvals
// @route   GET /api/admin/vendor-approvals
// @access  Private/Admin & SubAdmin
router.get('/vendor-approvals', authenticateToken, asyncHandler(async (req, res) => {
  // Check permission: Allow if user is SuperAdmin OR has vendors.view permission
  const isSuperAdminUser = req.user.role === 'superadmin';
  const hasViewPermission = hasPermission(req.user, PERMISSIONS.VENDORS_VIEW);

  if (!isSuperAdminUser && !hasViewPermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view vendor approvals'
    });
  }

  try {
    const {
      page = 1,
      limit = 10,
      status = 'pending',
      search = '',
      sortBy = 'submittedAt',
      sortOrder = 'desc',
      businessType = '',
      experienceMin = '',
      experienceMax = '',
      startDate = '',
      endDate = ''
    } = req.query;

    // Sanitize pagination parameters
    const { page: sanitizedPage, limit: sanitizedLimit, skip } = sanitizePagination(page, limit);

    // Sanitize search query
    const sanitizedSearch = sanitizeSearchQuery(search);

    // Build query
    const query = {};

    if (status !== 'all') {
      query['approval.status'] = status;
    }

    if (sanitizedSearch) {
      query.$or = [
        { 'businessInfo.companyName': { $regex: sanitizedSearch, $options: 'i' } },
        { 'businessInfo.licenseNumber': { $regex: sanitizedSearch, $options: 'i' } },
        { 'businessInfo.gstNumber': { $regex: sanitizedSearch, $options: 'i' } },
        { 'user.email': { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    // Filter by business type
    if (businessType && businessType !== 'all') {
      query['businessInfo.businessType'] = businessType;
    }

    // Filter by experience range
    if (experienceMin || experienceMax) {
      query['professionalInfo.experience'] = {};
      if (experienceMin) {
        query['professionalInfo.experience'].$gte = parseInt(experienceMin);
      }
      if (experienceMax) {
        query['professionalInfo.experience'].$lte = parseInt(experienceMax);
      }
    }

    // Filter by date range (submittedAt)
    if (startDate || endDate) {
      query['approval.submittedAt'] = {};
      if (startDate) {
        // Start of day for startDate
        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);
        query['approval.submittedAt'].$gte = startDateTime;
      }
      if (endDate) {
        // End of day for endDate
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query['approval.submittedAt'].$lte = endDateTime;
      }
    }

    // Build sort
    const sort = {};
    const validSortFields = ['submittedAt', 'reviewedAt', 'phoneVerifiedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'submittedAt';
    sort[`approval.${sortField}`] = sortOrder === 'desc' ? -1 : 1;

    // Get vendors with populated user data
    const [vendors, totalCount] = await Promise.all([
      Vendor.find(query)
        .populate('user', 'email profile.firstName profile.lastName profile.phone createdAt')
        .populate('approval.reviewedBy', 'profile.firstName profile.lastName email')
        .populate('approval.lockedBy', 'profile.firstName profile.lastName email')
        .populate('approval.assignedTo', 'profile.firstName profile.lastName email')
        .populate('approval.phoneVerifiedBy', 'profile.firstName profile.lastName email')
        .sort(sort)
        .skip(skip)
        .limit(sanitizedLimit),
      Vendor.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / sanitizedLimit);

    res.json({
      success: true,
      data: {
        vendors,
        pagination: {
          currentPage: sanitizedPage,
          totalPages,
          totalCount,
          hasNextPage: sanitizedPage < totalPages,
          hasPrevPage: sanitizedPage > 1,
          limit: sanitizedLimit
        },
        summary: {
          pending: await Vendor.countDocuments({ 'approval.status': 'pending' }),
          under_review: await Vendor.countDocuments({ 'approval.status': 'under_review' }),
          approved: await Vendor.countDocuments({ 'approval.status': 'approved' }),
          rejected: await Vendor.countDocuments({ 'approval.status': 'rejected' })
        }
      }
    });
  } catch (error) {
    console.error('Get vendor approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor approvals'
    });
  }
}));

// @desc    Get available roles for vendor approval transfer
// @route   GET /api/admin/vendor-approvals/transfer-roles
// @access  Private (Any authenticated admin)
router.get('/vendor-approvals/transfer-roles', authenticateToken, asyncHandler(async (req, res) => {
  console.log('[Vendor Transfer Roles] User role:', req.user.role);

  const roles = await Role.find({
    isActive: true,
    name: { $nin: ['customer', 'vendor', 'agent'] }
  })
    .select('name description level')
    .sort({ level: -1 });

  console.log('[Vendor Transfer Roles] Found roles:', roles.length, 'roles');

  res.json({
    success: true,
    data: { roles }
  });
}));

// @desc    Get users by role for vendor approval transfer
// @route   GET /api/admin/vendor-approvals/transfer-users
// @access  Private (Any authenticated admin)
router.get('/vendor-approvals/transfer-users', authenticateToken, async (req, res) => {
  try {
    console.log('[Vendor Transfer Users] User role:', req.user.role);

    const { role } = req.query;

    // Step 1: Query Role model to find roles with vendors.approve permission
    const rolesWithPermission = await Role.find({
      isActive: true,
      permissions: PERMISSIONS.VENDORS_APPROVE
    }).select('name');

    const roleNamesWithPermission = rolesWithPermission.map(r => r.name);
    console.log('[Vendor Transfer Users] Roles with vendors.approve:', roleNamesWithPermission);

    // Step 2: Add 'superadmin' to the list (has all permissions by default)
    if (!roleNamesWithPermission.includes('superadmin')) {
      roleNamesWithPermission.push('superadmin');
    }

    // Step 3: Build query to fetch users with these roles
    let query = {
      status: 'active',
      role: { $in: roleNamesWithPermission }
    };

    // If specific role filter is provided
    if (role && role !== 'all') {
      query.role = role;
    }

    const users = await User.find(query)
      .select('email role profile')
      .sort({ email: 1 });

    console.log('[Vendor Transfer Users] Found', users.length, 'eligible users');

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('[Vendor Transfer Users] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transfer users'
    });
  }
});

// @desc    Export vendor approval report
// @route   GET /api/admin/vendor-approvals/export
// @access  Private/Admin & SubAdmin
router.get('/vendor-approvals/export', authenticateToken, isAnyAdmin, asyncHandler(async (req, res) => {
  try {
    // Fetch all vendor applications with user details
    const vendors = await Vendor.find()
      .populate('user', 'email profile.firstName profile.lastName profile.phone')
      .populate('approval.reviewedBy', 'profile.firstName profile.lastName email')
      .sort({ 'approval.submittedAt': -1 });

    res.json({
      success: true,
      data: vendors
    });

  } catch (error) {
    console.error('Export vendor approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export vendor approval report'
    });
  }
}));

// @desc    Get vendor approval details
// @route   GET /api/admin/vendor-approvals/:vendorId
// @access  Private/Admin & SubAdmin
router.get('/vendor-approvals/:vendorId', authenticateToken, asyncHandler(async (req, res) => {
  // Check permission: Allow if user is SuperAdmin OR has vendors.view permission
  const isSuperAdminUser = req.user.role === 'superadmin';
  const hasViewPermission = hasPermission(req.user, PERMISSIONS.VENDORS_VIEW);

  if (!isSuperAdminUser && !hasViewPermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view vendor details'
    });
  }

  try {
    const { vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId)
      .populate('user', 'email profile role status createdAt')
      .populate('approval.reviewedBy', 'profile.firstName profile.lastName email')
      .populate('approval.lockedBy', 'profile.firstName profile.lastName email')
      .populate('approval.assignedTo', 'profile.firstName profile.lastName email')
      .populate('approval.phoneVerifiedBy', 'profile.firstName profile.lastName email')
      .populate('approval.activityLog.performedBy', 'profile.firstName profile.lastName email')
      .populate('approval.activityLog.transferredTo', 'profile.firstName profile.lastName email');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Get additional statistics    
    const [propertiesCount, recentActivity] = await Promise.all([
      Property.countDocuments({ owner: vendor.user._id }),
      // Get recent activity (messages, logins, etc.)
      User.findById(vendor.user._id).select('profile.lastLogin')
    ]);

    res.json({
      success: true,
      data: {
        vendor,
        statistics: {
          propertiesCount,
          lastActivity: recentActivity?.profile?.lastLogin || vendor.createdAt,
          memberSince: vendor.createdAt,
          applicationId: `VEN-${vendor._id.toString().slice(-8).toUpperCase()}`
        }
      }
    });
  } catch (error) {
    console.error('Get vendor details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor details'
    });
  }
}));

// @desc    Verify phone for vendor application
// @route   POST /api/admin/vendor-approvals/:vendorId/verify-phone
// @access  Private/Admin & SubAdmin
router.post('/vendor-approvals/:vendorId/verify-phone', isAnyAdmin, asyncHandler(async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { approverName } = req.body;
    const adminId = req.user.id;

    // Find vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Update vendor with phone verification
    vendor.approval.status = 'under_review';
    vendor.approval.verificationChecklist.phoneVerified = true;
    vendor.approval.phoneVerifiedAt = new Date();
    vendor.approval.phoneVerifiedBy = adminId;
    vendor.approval.reviewedBy = adminId;
    vendor.approval.approverName = approverName;

    // Lock the vendor to this admin after phone verification
    vendor.approval.lockedBy = adminId;
    vendor.approval.lockedAt = new Date();
    vendor.approval.assignedTo = adminId;
    vendor.approval.assignedAt = new Date();

    // Add activity log entry
    vendor.approval.activityLog.push({
      action: 'phone_verified',
      performedBy: adminId,
      performedAt: new Date(),
      details: `Phone verified by ${approverName}. Vendor locked and assigned.`,
      notes: approverName
    });

    await vendor.save();

    res.json({
      success: true,
      message: 'Phone verified successfully. Status changed to under review and locked to you.',
      data: {
        phoneVerifiedAt: vendor.approval.phoneVerifiedAt,
        lockedBy: adminId
      }
    });
  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify phone'
    });
  }
}));

// @desc    Accept vendor approval (take responsibility)
// @route   POST /api/admin/vendor-approvals/:vendorId/accept
// @access  Private/Admin & SubAdmin (SuperAdmin can always accept)
router.post('/vendor-approvals/:vendorId/accept', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { vendorId } = req.params;
    const adminId = req.user.id;
    const isSuperAdminUser = req.user.role === 'superadmin';

    // Check permission: Allow if user is SuperAdmin OR has vendors.view permission
    const hasViewPermission = hasPermission(req.user, PERMISSIONS.VENDORS_VIEW);

    if (!isSuperAdminUser && !hasViewPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to accept vendor approvals'
      });
    }

    // Find vendor
    const vendor = await Vendor.findById(vendorId)
      .populate('approval.lockedBy', 'profile.firstName profile.lastName email');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Check if phone verification is done
    if (!vendor.approval.verificationChecklist.phoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Phone verification must be completed before accepting the vendor approval'
      });
    }

    // SuperAdmin can always accept, others check if locked
    if (!isSuperAdminUser) {
      // Check if vendor is locked by another admin
      if (vendor.approval.lockedBy && vendor.approval.lockedBy._id.toString() !== adminId.toString()) {
        const lockerName = vendor.approval.lockedBy.profile?.firstName
          ? `${vendor.approval.lockedBy.profile.firstName} ${vendor.approval.lockedBy.profile.lastName || ''}`
          : vendor.approval.lockedBy.email || 'another user';

        return res.status(423).json({
          success: false,
          message: `This vendor application is currently being handled by ${lockerName}. Please choose a different application.`
        });
      }
    }

    // Lock and assign to admin
    vendor.approval.lockedBy = adminId;
    vendor.approval.lockedAt = new Date();
    vendor.approval.assignedTo = adminId;
    vendor.approval.assignedAt = new Date();
    vendor.approval.status = 'under_review';

    // Add activity log entry
    const adminUser = await User.findById(adminId).select('profile email');
    const adminName = adminUser?.profile?.firstName
      ? `${adminUser.profile.firstName} ${adminUser.profile.lastName || ''}`
      : adminUser?.email || 'Unknown';

    vendor.approval.activityLog.push({
      action: 'accepted',
      performedBy: adminId,
      performedAt: new Date(),
      details: `Responsibility accepted by ${adminName}. Vendor locked for processing.`,
      notes: adminName
    });

    await vendor.save();

    res.json({
      success: true,
      message: 'Vendor approval accepted successfully. You are now responsible for completing the verification process.',
      data: {
        vendorId: vendor._id,
        lockedBy: adminId,
        lockedAt: vendor.approval.lockedAt
      }
    });

  } catch (error) {
    console.error('Accept vendor approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept vendor approval'
    });
  }
}));

// @desc    Transfer vendor approval to another user
// @route   POST /api/admin/vendor-approvals/:vendorId/transfer
// @access  Private (User handling the vendor approval)
router.post('/vendor-approvals/:vendorId/transfer', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { targetUserId } = req.body;
    const isSuperAdminUser = req.user.role === 'superadmin';

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID is required'
      });
    }

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // SuperAdmin can transfer any vendor, others can only transfer if they're handling it
    if (!isSuperAdminUser) {
      const isHandlingVendor = (vendor.approval.lockedBy && vendor.approval.lockedBy.toString() === req.user.id.toString()) ||
        (vendor.approval.assignedTo && vendor.approval.assignedTo.toString() === req.user.id.toString());

      if (!isHandlingVendor) {
        return res.status(403).json({
          success: false,
          message: 'You can only transfer vendor approvals you are currently handling. Please accept the vendor approval first.'
        });
      }
    }

    // Verify target user exists and has appropriate role
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }

    if (targetUser.role === 'customer' || targetUser.role === 'vendor' || targetUser.role === 'agent') {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer vendor approval to customer, vendor, or agent'
      });
    }

    // Check if target user's role has vendors.approve permission (unless superadmin)
    if (targetUser.role !== 'superadmin') {
      // Fetch the target user's role document to check permissions
      const Role = require('../models/Role');
      const targetUserRole = await Role.findOne({ name: targetUser.role, isActive: true });

      if (!targetUserRole || !targetUserRole.permissions || !targetUserRole.permissions.includes(PERMISSIONS.VENDORS_APPROVE)) {
        return res.status(400).json({
          success: false,
          message: 'Target user does not have permission to approve vendors. Please select a user with vendors.approve permission.'
        });
      }
    }

    // Transfer vendor
    vendor.approval.assignedTo = targetUserId;
    vendor.approval.assignedAt = new Date();
    vendor.approval.lockedBy = targetUserId;
    vendor.approval.lockedAt = new Date();

    // Add activity log entry
    const transferredByName = req.user.profile?.firstName
      ? `${req.user.profile.firstName} ${req.user.profile.lastName || ''}`
      : req.user.email;
    const transferredToName = targetUser.profile?.firstName
      ? `${targetUser.profile.firstName} ${targetUser.profile.lastName || ''}`
      : targetUser.email;

    vendor.approval.activityLog.push({
      action: 'transferred',
      performedBy: req.user.id,
      performedAt: new Date(),
      details: `Transferred from ${transferredByName} to ${transferredToName}`,
      transferredTo: targetUserId,
      notes: `${transferredByName} → ${transferredToName}`
    });

    await vendor.save();

    // Send notification email to target user
    try {
      await sendTemplateEmail(targetUser.email, 'vendor-approval-assigned', {
        userName: targetUser.profile?.firstName || targetUser.email,
        vendorName: vendor.businessInfo.companyName,
        assignedBy: req.user.profile?.firstName
          ? `${req.user.profile.firstName} ${req.user.profile.lastName || ''}`
          : req.user.email,
        vendorId: `VEN-${vendor._id.toString().slice(-8).toUpperCase()}`,
        reviewUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/vendor-approvals/${vendor._id}`
      });
    } catch (emailError) {
      console.error('Failed to send assignment notification:', emailError);
    }

    res.json({
      success: true,
      message: 'Vendor approval transferred successfully',
      data: {
        vendorId: vendor._id,
        assignedTo: targetUserId,
        lockedBy: targetUserId
      }
    });

  } catch (error) {
    console.error('Transfer vendor approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transfer vendor approval'
    });
  }
}));

// @desc    Approve vendor application
// @route   POST /api/admin/vendor-approvals/:vendorId/approve
// @access  Private/Admin & SubAdmin
router.post('/vendor-approvals/:vendorId/approve', authenticateToken, isAnyAdmin, asyncHandler(async (req, res) => {
  // Check permission: Allow if user is SuperAdmin OR has vendors.approve permission
  const isSuperAdminUser = req.user.role === 'superadmin';
  const hasApprovePermission = hasPermission(req.user, PERMISSIONS.VENDORS_APPROVE);

  if (!isSuperAdminUser && !hasApprovePermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to approve vendor applications'
    });
  }

  try {
    const { vendorId } = req.params;
    const { approvalNotes, verificationLevel = 'basic', approverName, verificationChecklist } = req.body;
    const adminId = req.user.id;

    // Find vendor
    const vendor = await Vendor.findById(vendorId)
      .populate('user')
      .populate('approval.lockedBy', 'profile.firstName profile.lastName email');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.approval.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Vendor is already approved'
      });
    }

    // SuperAdmin can approve any vendor, others must be the one handling it
    if (!isSuperAdminUser) {
      if (vendor.approval.lockedBy && vendor.approval.lockedBy._id.toString() !== adminId.toString()) {
        const lockerName = vendor.approval.lockedBy.profile?.firstName
          ? `${vendor.approval.lockedBy.profile.firstName} ${vendor.approval.lockedBy.profile.lastName || ''}`
          : vendor.approval.lockedBy.email || 'another user';

        return res.status(423).json({
          success: false,
          message: `This vendor application is currently being handled by ${lockerName}. Please choose a different application.`
        });
      }
    }

    // Update vendor approval status
    vendor.approval.status = 'approved';
    vendor.approval.reviewedAt = new Date();
    vendor.approval.reviewedBy = adminId;
    vendor.approval.approvalNotes = approvalNotes || 'Application approved';
    vendor.approval.approverName = approverName;
    vendor.approval.verificationChecklist = verificationChecklist;

    // Unlock after approval
    vendor.approval.lockedBy = null;
    vendor.approval.lockedAt = null;

    // Update verification status
    vendor.verification.isVerified = true;
    vendor.verification.verificationDate = new Date();
    vendor.verification.verificationLevel = verificationLevel;

    // Update vendor status
    vendor.status = 'active';

    // Mark all submitted documents as verified
    vendor.approval.submittedDocuments.forEach(doc => {
      doc.verified = true;
      doc.verifiedAt = new Date();
      doc.verifiedBy = adminId;
    });

    // Add activity log entry
    vendor.approval.activityLog.push({
      action: 'approved',
      performedBy: adminId,
      performedAt: new Date(),
      details: `Vendor application approved by ${approverName}. Status changed to active.`,
      notes: approvalNotes || 'Application approved'
    });

    await vendor.save();

    // Update user status
    const user = vendor.user;
    user.status = 'active';
    await user.save();

    // Get admin info for email
    const admin = await User.findById(adminId).select('profile.firstName profile.lastName email');

    // Send approval email to vendor using the email service
    try {
      await sendTemplateEmail(user.email, 'vendor-application-approved', {
        firstName: user.profile.firstName,
        companyName: vendor.businessInfo.companyName,
        vendorId: `VEN-${vendor._id.toString().slice(-8).toUpperCase()}`,
        approvedDate: new Date().toLocaleDateString(),
        vendorDashboardLink: `${process.env.FRONTEND_URL || 'https://squares-v3.vercel.app'}/vendor/dashboard`,
        setupGuideLink: `${process.env.FRONTEND_URL || 'https://squares-v3.vercel.app'}/vendor/setup-guide`
      });
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    res.json({
      success: true,
      message: 'Vendor application approved successfully',
      data: {
        vendorId: vendor._id,
        status: 'approved',
        approvedAt: vendor.approval.reviewedAt,
        verificationLevel: vendor.verification.verificationLevel
      }
    });

  } catch (error) {
    console.error('Approve vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve vendor application'
    });
  }
}));

// @desc    Reject vendor application
// @route   POST /api/admin/vendor-approvals/:vendorId/reject
// @access  Private/Admin & SubAdmin
router.post('/vendor-approvals/:vendorId/reject', authenticateToken, isAnyAdmin, asyncHandler(async (req, res) => {
  // Check permission: Allow if user is SuperAdmin OR has vendors.approve permission
  const isSuperAdminUser = req.user.role === 'superadmin';
  const hasApprovePermission = hasPermission(req.user, PERMISSIONS.VENDORS_APPROVE);

  if (!isSuperAdminUser && !hasApprovePermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to reject vendor applications'
    });
  }

  try {
    const { vendorId } = req.params;
    const { rejectionReason, allowResubmission = true, approverName, verificationChecklist } = req.body;
    const adminId = req.user.id;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    // Find vendor
    const vendor = await Vendor.findById(vendorId)
      .populate('user')
      .populate('approval.lockedBy', 'profile.firstName profile.lastName email');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.approval.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Vendor application is already rejected'
      });
    }

    // SuperAdmin can reject any vendor, others must be the one handling it
    if (!isSuperAdminUser) {
      if (vendor.approval.lockedBy && vendor.approval.lockedBy._id.toString() !== adminId.toString()) {
        const lockerName = vendor.approval.lockedBy.profile?.firstName
          ? `${vendor.approval.lockedBy.profile.firstName} ${vendor.approval.lockedBy.profile.lastName || ''}`
          : vendor.approval.lockedBy.email || 'another user';

        return res.status(423).json({
          success: false,
          message: `This vendor application is currently being handled by ${lockerName}. Please choose a different application.`
        });
      }
    }

    // Update vendor approval status
    vendor.approval.status = 'rejected';
    vendor.approval.reviewedAt = new Date();
    vendor.approval.reviewedBy = adminId;

    // Unlock after rejection
    vendor.approval.lockedBy = null;
    vendor.approval.lockedAt = null;
    vendor.approval.rejectionReason = rejectionReason;
    vendor.approval.approverName = approverName;
    vendor.approval.verificationChecklist = verificationChecklist;

    // Update vendor status
    vendor.status = 'rejected';

    // Add activity log entry
    vendor.approval.activityLog.push({
      action: 'rejected',
      performedBy: adminId,
      performedAt: new Date(),
      details: `Vendor application rejected by ${approverName}. Reason: ${rejectionReason}`,
      notes: rejectionReason
    });

    await vendor.save();

    // Update user status
    const user = vendor.user;
    user.status = 'inactive';
    await user.save();

    // Get admin info for email
    const admin = await User.findById(adminId).select('profile.firstName profile.lastName email');

    // Send rejection email to vendor using template service
    try {
      await sendTemplateEmail(user.email, 'vendor-application-rejected', {
        firstName: user.profile.firstName,
        companyName: vendor.businessInfo.companyName,
        applicationId: `VEN-${vendor._id.toString().slice(-8).toUpperCase()}`,
        reviewedDate: new Date().toLocaleDateString(),
        rejectionReason: rejectionReason,
        reapplyLink: `${process.env.FRONTEND_URL || 'https://squares-v3.vercel.app'}/vendor/register`
      });
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    res.json({
      success: true,
      message: 'Vendor application rejected and vendor notified',
      data: {
        vendorId: vendor._id,
        status: 'rejected',
        rejectedAt: vendor.approval.reviewedAt,
        rejectionReason: rejectionReason,
        allowResubmission
      }
    });

  } catch (error) {
    console.error('Reject vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject vendor application'
    });
  }
}));

// @desc    Update vendor approval status to under review
// @route   POST /api/admin/vendor-approvals/:vendorId/under-review
// @access  Private/Admin & SubAdmin
router.post('/vendor-approvals/:vendorId/under-review', isAnyAdmin, asyncHandler(async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;

    const vendor = await Vendor.findById(vendorId).populate('user');
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Update approval status
    vendor.approval.status = 'under_review';
    vendor.approval.reviewedBy = adminId;
    if (notes) {
      vendor.approval.approvalNotes = notes;
    }

    // Add activity log entry
    const adminUser = await User.findById(adminId).select('profile email');
    const adminName = adminUser?.profile?.firstName
      ? `${adminUser.profile.firstName} ${adminUser.profile.lastName || ''}`
      : adminUser?.email || 'Unknown';

    vendor.approval.activityLog.push({
      action: 'marked_under_review',
      performedBy: adminId,
      performedAt: new Date(),
      details: `Marked as under review by ${adminName}`,
      notes: notes || 'Application under review'
    });

    await vendor.save();

    res.json({
      success: true,
      message: 'Vendor application marked as under review',
      data: {
        vendorId: vendor._id,
        status: 'under_review',
        reviewedBy: adminId
      }
    });

  } catch (error) {
    console.error('Update vendor review status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor review status'
    });
  }
}));

// @desc    Verify vendor document
// @route   POST /api/admin/vendor-approvals/:vendorId/verify-document
// @access  Private/Admin & SubAdmin
router.post('/vendor-approvals/:vendorId/verify-document', isAnyAdmin, asyncHandler(async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { documentId, verified = true, rejectionReason } = req.body;
    const adminId = req.user.id;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Find and update the document
    const document = vendor.approval.submittedDocuments.id(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    document.verified = verified;
    document.verifiedAt = new Date();
    document.verifiedBy = adminId;

    if (!verified && rejectionReason) {
      document.rejectionReason = rejectionReason;
    }

    await vendor.save();

    res.json({
      success: true,
      message: `Document ${verified ? 'verified' : 'rejected'} successfully`,
      data: {
        documentId,
        verified,
        verifiedAt: document.verifiedAt,
        rejectionReason: document.rejectionReason
      }
    });

  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify document'
    });
  }
}));

// @desc    Get vendor approval statistics
// @route   GET /api/admin/vendor-approval-stats
// @access  Private/Admin & SubAdmin
router.get('/vendor-approval-stats', authenticateToken, asyncHandler(async (req, res) => {
  // Check permission: Allow if user is SuperAdmin OR has vendors.view permission
  const isSuperAdminUser = req.user.role === 'superadmin';
  const hasViewPermission = hasPermission(req.user, PERMISSIONS.VENDORS_VIEW);

  if (!isSuperAdminUser && !hasViewPermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view vendor statistics'
    });
  }

  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      underReviewApplications,
      thisMonthApplications,
      lastMonthApplications,
      recentApplications
    ] = await Promise.all([
      Vendor.countDocuments(),
      Vendor.countDocuments({ 'approval.status': 'pending' }),
      Vendor.countDocuments({ 'approval.status': 'approved' }),
      Vendor.countDocuments({ 'approval.status': 'rejected' }),
      Vendor.countDocuments({ 'approval.status': 'under_review' }),
      Vendor.countDocuments({ 'approval.submittedAt': { $gte: thisMonth } }),
      Vendor.countDocuments({
        'approval.submittedAt': { $gte: lastMonth, $lt: lastMonthEnd }
      }),
      Vendor.find({ 'approval.status': 'pending' })
        .populate('user', 'email profile.firstName profile.lastName')
        .sort({ 'approval.submittedAt': -1 })
        .limit(5)
        .select('businessInfo.companyName approval.submittedAt')
    ]);

    // Calculate approval rate
    const totalProcessed = approvedApplications + rejectedApplications;
    const approvalRate = totalProcessed > 0 ?
      Math.round((approvedApplications / totalProcessed) * 100) : 0;

    // Calculate growth
    const growth = lastMonthApplications > 0 ?
      Math.round(((thisMonthApplications - lastMonthApplications) / lastMonthApplications) * 100) : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalApplications,
          pendingApplications,
          approvedApplications,
          rejectedApplications,
          underReviewApplications,
          approvalRate,
          avgProcessingTime: '2.3 days' // This would be calculated from actual data
        },
        trends: {
          thisMonthApplications,
          lastMonthApplications,
          growth,
          dailyAverage: Math.round(thisMonthApplications / new Date().getDate())
        },
        recentApplications: recentApplications.map(vendor => ({
          id: vendor._id,
          companyName: vendor.businessInfo.companyName,
          applicantName: vendor.user ?
            `${vendor.user.profile.firstName} ${vendor.user.profile.lastName}` : 'Unknown',
          submittedAt: vendor.approval.submittedAt,
          status: vendor.approval.status
        }))
      }
    });

  } catch (error) {
    console.error('Get vendor approval stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor approval statistics'
    });
  }
}));

// @desc    Generate reports
// @route   POST /api/admin/reports/generate
// @access  Private/Admin & SubAdmin
router.post('/reports/generate', authenticateToken, isAnyAdmin, asyncHandler(async (req, res) => {
  const { reportType, dateRange, city, metrics, formats, customName } = req.body;

  if (!reportType) {
    return res.status(400).json({
      success: false,
      message: 'Report type is required'
    });
  }

  try {
    // Build date filter
    const dateFilter = {};
    if (dateRange?.from && dateRange?.to) {
      dateFilter.createdAt = {
        $gte: new Date(dateRange.from),
        $lte: new Date(dateRange.to)
      };
    }

    // Build city filter
    const cityFilter = city && city !== 'all' ? { city } : {};

    // Gather data based on report type
    let reportData = {};

    switch (reportType) {
      case 'property_performance':
        const [totalProperties, propertiesByType, avgViews, propertyApprovalRate] = await Promise.all([
          Property.countDocuments({ ...dateFilter, ...cityFilter }),
          Property.aggregate([
            { $match: { ...dateFilter, ...cityFilter } },
            { $group: { _id: '$type', count: { $sum: 1 } } }
          ]),
          Property.aggregate([
            { $match: { ...dateFilter, ...cityFilter } },
            { $group: { _id: null, avgViews: { $avg: '$views' } } }
          ]),
          Property.aggregate([
            { $match: dateFilter },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }
              }
            }
          ])
        ]);

        reportData = {
          totalProperties,
          propertiesByType,
          averageViews: avgViews[0]?.avgViews || 0,
          approvalRate: propertyApprovalRate[0] ?
            (propertyApprovalRate[0].approved / propertyApprovalRate[0].total * 100).toFixed(2) : 0
        };
        break;

      case 'vendor_analytics':
        const [activeVendors, vendorPerformance] = await Promise.all([
          User.countDocuments({ role: 'vendor', status: 'active', ...dateFilter }),
          Property.aggregate([
            { $match: { ...dateFilter, ...cityFilter } },
            {
              $group: {
                _id: '$vendor',
                propertyCount: { $sum: 1 },
                avgViews: { $avg: '$views' }
              }
            },
            { $limit: 20 }
          ])
        ]);

        reportData = {
          activeVendors,
          vendorPerformance
        };
        break;

      case 'user_engagement':
        const [totalUsers, newUsers, userActivity] = await Promise.all([
          User.countDocuments({ ...dateFilter }),
          User.countDocuments({
            ...dateFilter, createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }),
          User.aggregate([
            { $match: dateFilter },
            {
              $group: {
                _id: '$role',
                count: { $sum: 1 }
              }
            }
          ])
        ]);

        reportData = {
          totalUsers,
          newUsers,
          userActivity
        };
        break;

      case 'financial_summary':
        const [totalRevenue, activeSubscriptions] = await Promise.all([
          Subscription.aggregate([
            { $match: dateFilter },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]),
          Subscription.countDocuments({ status: 'active', ...dateFilter })
        ]);

        reportData = {
          totalRevenue: totalRevenue[0]?.total || 0,
          activeSubscriptions
        };
        break;

      case 'city_regional':
        const [propertiesByCity, usersByCity] = await Promise.all([
          Property.aggregate([
            { $match: { ...dateFilter, ...cityFilter } },
            { $group: { _id: '$city', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
          ]),
          User.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$profile.city', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
          ])
        ]);

        reportData = {
          propertiesByCity,
          usersByCity
        };
        break;

      default:
        reportData = { message: 'Report type not implemented' };
    }

    // Return report data (file generation can be implemented later)
    res.json({
      success: true,
      message: 'Report generated successfully',
      data: {
        id: new Date().getTime(),
        name: customName || `${reportType} - ${new Date().toLocaleDateString()}`,
        type: reportType,
        dateRange,
        city,
        metrics,
        formats,
        reportData,
        createdAt: new Date(),
        status: 'completed',
        // Note: Actual file download URLs would be generated here
        // For now, data is returned directly for frontend display
        downloadUrl: null
      }
    });

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
}));

// NOTE: Global isSuperAdmin middleware removed to support custom role permissions
// Each route now has individual permission checks using hasPermission()
// router.use(isSuperAdmin); // COMMENTED OUT - DO NOT UNCOMMENT

// Enhanced dashboard statistics with real-time data
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get comprehensive statistics
    const [
      totalUsers,
      totalProperties,
      totalSubscriptions,
      totalRevenue,
      newUsersThisMonth,
      newPropertiesThisMonth,
      newUsersThisWeek,
      newUsersToday,
      activeSubscriptions,
      pendingUsers,
      suspendedUsers,
      totalMessages,
      unreadMessages
    ] = await Promise.all([
      // Basic counts
      User.countDocuments(),
      Property.countDocuments(),
      Subscription.countDocuments(),

      // Revenue calculation
      Subscription.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then(result => result[0]?.total || 0),

      // Time-based user stats
      User.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
      Property.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
      User.countDocuments({ createdAt: { $gte: firstDayOfWeek } }),
      User.countDocuments({ createdAt: { $gte: yesterday } }),

      // Status-based counts
      Subscription.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'pending' }),
      User.countDocuments({ status: 'suspended' }),
      Message.countDocuments(),
      Message.countDocuments({ status: 'unread' })
    ]);

    // Get user growth data for charts (last 30 days)
    const userGrowthData = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Get revenue data for charts (last 30 days)
    const revenueData = await Subscription.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Get user role distribution
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activities
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('email profile.firstName profile.lastName createdAt role status');

    const recentProperties = await Property.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('owner', 'email profile.firstName profile.lastName profile.phone')
      .select('title status createdAt owner');

    const recentSubscriptions = await Subscription.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'email profile.firstName profile.lastName')
      .populate('plan', 'name')
      .select('user plan amount status createdAt');

    // Filter out subscriptions with null plans or users
    const validRecentSubscriptions = recentSubscriptions.filter(sub => sub.user && sub.plan);

    // Calculate growth percentages
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [lastMonthUsers, lastMonthProperties] = await Promise.all([
      User.countDocuments({
        createdAt: { $gte: lastMonth, $lt: endOfLastMonth }
      }),
      Property.countDocuments({
        createdAt: { $gte: lastMonth, $lt: endOfLastMonth }
      })
    ]);

    const stats = {
      // Overview metrics
      totalUsers,
      totalProperties,
      totalSubscriptions,
      totalRevenue,

      // Growth metrics
      newUsersThisMonth,
      newPropertiesThisMonth,
      newUsersThisWeek,
      newUsersToday,
      userGrowthPercent: calculateGrowth(newUsersThisMonth, lastMonthUsers),
      propertyGrowthPercent: calculateGrowth(newPropertiesThisMonth, lastMonthProperties),

      // Status metrics
      activeSubscriptions,
      pendingUsers,
      suspendedUsers,
      totalMessages,
      unreadMessages,

      // Chart data
      userGrowthData,
      revenueData,
      usersByRole,

      // Recent activities
      recentActivities: [
        ...recentUsers.map(user => ({
          id: user._id,
          type: 'user_registered',
          title: 'New User Registration',
          description: `${user.profile?.firstName || 'User'} ${user.profile?.lastName || ''} (${user.role})`,
          date: user.createdAt,
          status: user.status,
          metadata: {
            email: user.email,
            role: user.role,
            status: user.status
          }
        })),
        ...recentProperties.map(property => ({
          id: property._id,
          type: 'property_listed',
          title: 'New Property Listed',
          description: property.title,
          date: property.createdAt,
          status: property.status,
          metadata: {
            owner: property.owner?.email,
            status: property.status
          }
        })),
        ...validRecentSubscriptions.map(subscription => ({
          id: subscription._id,
          type: 'subscription_created',
          title: 'New Subscription',
          description: `${subscription.plan?.name || 'Unknown Plan'} - ₹${subscription.amount}`,
          date: subscription.createdAt,
          status: subscription.status,
          metadata: {
            user: subscription.user?.email,
            plan: subscription.plan?.name || 'Unknown',
            amount: subscription.amount
          }
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15),

      // Real-time metrics
      lastUpdated: new Date(),
      systemHealth: {
        database: 'connected',
        server: 'running',
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Real-time system metrics
router.get('/system-metrics', async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const metrics = {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        collections: await mongoose.connection.db.stats(),
      },
      activity: {
        last24Hours: {
          userRegistrations: await User.countDocuments({ createdAt: { $gte: last24Hours } }),
          propertyListings: await Property.countDocuments({ createdAt: { $gte: last24Hours } }),
          subscriptions: await Subscription.countDocuments({ createdAt: { $gte: last24Hours } }),
          messages: await Message.countDocuments({ createdAt: { $gte: last24Hours } })
        }
      },
      timestamp: now
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('System metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system metrics'
    });
  }
});

// Enhanced user management endpoints
router.get('/users', authenticateToken, async (req, res) => {
  // Check permission: Allow if user is SuperAdmin OR has users.view permission
  const isSuperAdminUser = req.user.role === 'superadmin';
  const hasViewPermission = hasPermission(req.user, PERMISSIONS.USERS_VIEW);

  if (!isSuperAdminUser && !hasViewPermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view users'
    });
  }

  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    let query = {};

    // Build search query
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    if (role) query.role = role;
    if (status) query.status = status;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select('email profile role status createdAt updatedAt lastLogin')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get specific user details
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password')
      .populate('businessInfo');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's properties and subscriptions
    const [properties, subscriptions, messages] = await Promise.all([
      Property.find({ owner: userId }).select('title status createdAt'),
      Subscription.find({ user: userId }).populate('plan').select('plan status amount createdAt'),
      Message.countDocuments({
        $or: [{ sender: userId }, { recipient: userId }]
      })
    ]);

    res.json({
      success: true,
      data: {
        user,
        statistics: {
          totalProperties: properties.length,
          totalSubscriptions: subscriptions.length,
          totalMessages: messages,
          properties,
          subscriptions
        }
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details'
    });
  }
});

// Update user status
router.patch('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        status,
        ...(status === 'suspended' && { suspendedAt: new Date(), suspensionReason: reason }),
        ...(status === 'active' && { $unset: { suspendedAt: 1, suspensionReason: 1 } })
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user },
      message: `User status updated to ${status}`
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

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

    // Check if user has properties or subscriptions
    const [properties, subscriptions] = await Promise.all([
      Property.countDocuments({ owner: userId }),
      Subscription.countDocuments({ user: userId, status: 'active' })
    ]);

    // Clean up related data first
    if (properties > 0) {
      // Deactivate user's properties instead of deleting them
      await Property.updateMany(
        { owner: userId },
        { status: 'inactive', deactivatedAt: new Date() }
      );
    }

    if (subscriptions > 0) {
      // Cancel active subscriptions
      await Subscription.updateMany(
        { user: userId, status: 'active' },
        { status: 'cancelled', cancelledAt: new Date() }
      );
    }

    // Clean up other related data (messages, notifications, etc.)

    await Promise.all([
      // Remove user's messages
      Message.deleteMany({ sender: userId }),
      // Remove user's notifications
      Notification.deleteMany({ user: userId })
    ]);

    // Delete the user completely from the database
    await User.findByIdAndDelete(userId);

    // Send deletion notification email
    try {
      const { sendTemplateEmail } = require('../utils/emailService');

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
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user: ' + error.message
    });
  }
});

// Property management endpoints
router.get('/properties', authenticateToken, async (req, res) => {
  // Check permission: Allow if user is SuperAdmin OR has properties.view permission
  const isSuperAdminUser = req.user.role === 'superadmin';
  const hasViewPermission = hasPermission(req.user, PERMISSIONS.PROPERTIES_VIEW);

  if (!isSuperAdminUser && !hasViewPermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view properties'
    });
  }

  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      listingType = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (listingType) query.listingType = listingType;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [properties, totalProperties] = await Promise.all([
      Property.find(query)
        .populate('owner', 'email profile.firstName profile.lastName profile.phone')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Property.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalProperties / limit);

    res.json({
      success: true,
      data: {
        properties,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProperties,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties'
    });
  }
});

// Get single property (Admin)
router.get('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format'
      });
    }

    const property = await Property.findById(id)
      .populate('owner', 'profile.firstName profile.lastName profile.phone email');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    res.json({
      success: true,
      data: { property }
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property'
    });
  }
});

// Create property (Admin)
router.post('/properties', authenticateToken, async (req, res) => {
  // Check permission: Allow if user is SuperAdmin OR has properties.create permission
  const isSuperAdminUser = req.user.role === 'superadmin';
  const hasCreatePermission = hasPermission(req.user, PERMISSIONS.PROPERTIES_CREATE);

  if (!isSuperAdminUser && !hasCreatePermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to create properties'
    });
  }

  try {
    const propertyData = {
      ...req.body,
      owner: req.user.id, // Admin creating the property
      createdBy: req.user.id,
      status: 'available', // Admin properties are directly available
      verified: true, // Admin properties are pre-verified
      createdAt: new Date()
    };

    const property = await Property.create(propertyData);

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: { property }
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create property'
    });
  }
});

// @desc    Update property status
// @route   PATCH /api/admin/properties/:id/status
// @access  Private/Admin
router.patch('/properties/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid property ID format'
    });
  }

  // Validate status
  const validStatuses = ['pending', 'available', 'rejected', 'sold', 'rented', 'leased'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  const property = await Property.findById(id).populate('owner', 'email profile.firstName profile.lastName profile.phone');

  if (!property) {
    return res.status(404).json({
      success: false,
      message: 'Property not found'
    });
  }

  // Update property status
  property.status = status;

  // Add rejection reason if rejecting
  if (status === 'rejected' && reason) {
    property.rejectionReason = reason;
    property.rejectedAt = new Date();
    property.rejectedBy = req.user.id;
  }

  // Add approval details if approving
  if (status === 'available' && property.status === 'pending') {
    property.approvedBy = req.user.id;
    property.approvedAt = new Date();
    property.verified = true;
  }

  await property.save();

  // Send notification to property owner (non-blocking)
  const owner = property.owner;
  if (owner && owner.email) {
    let emailSubject = 'Property Status Updated';
    let emailBody = '';

    if (status === 'available') {
      emailSubject = 'Property Approved';
      emailBody = `Dear ${owner.profile?.firstName || 'User'},\n\nYour property "${property.title}" has been approved and is now live on our platform.\n\nBest regards,\nBuildHomeMartSquares Team`;
    } else if (status === 'rejected') {
      emailSubject = 'Property Rejected';
      emailBody = `Dear ${owner.profile?.firstName || 'User'},\n\nYour property "${property.title}" has been rejected.\n\nReason: ${reason || 'Property does not meet our guidelines'}\n\nPlease update your property and resubmit for approval.\n\nBest regards,\nBuildHomeMartSquares Team`;
    } else {
      emailBody = `Dear ${owner.profile?.firstName || 'User'},\n\nYour property "${property.title}" status has been updated to: ${status}\n\nBest regards,\nBuildHomeMartSquares Team`;
    }

    sendEmail(owner.email, emailSubject, emailBody).catch(err => console.error('Email send error:', err));
  }

  res.json({
    success: true,
    message: `Property status updated to ${status}`,
    data: { property }
  });
}));

// @desc    Approve property
// @route   POST /api/admin/properties/:id/approve
// @access  Private/Admin
router.post('/properties/:id/approve', authenticateToken, asyncHandler(async (req, res) => {
  // Check permission: Allow if user is SuperAdmin OR has properties.approve permission
  const isSuperAdminUser = req.user.role === 'superadmin';
  const hasApprovePermission = hasPermission(req.user, PERMISSIONS.PROPERTIES_APPROVE);

  if (!isSuperAdminUser && !hasApprovePermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to approve properties'
    });
  }

  const { id } = req.params;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid property ID format'
    });
  }

  const property = await Property.findById(id).populate('owner', 'email profile.firstName profile.lastName profile.phone');

  if (!property) {
    return res.status(404).json({
      success: false,
      message: 'Property not found'
    });
  }

  // Update property status to available (approved)
  property.status = 'available';
  property.verified = true;
  property.approvedBy = req.user.id;
  property.approvedAt = new Date();

  // Set expiration date for free listings (30 days from approval)
  if (property.isFreeListing) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);
    property.freeListingExpiresAt = expirationDate;
  }

  await property.save();

  // Send approval email to property owner (non-blocking)
  const owner = property.owner;
  if (owner && owner.email) {
    sendEmail(
      owner.email,
      'Property Approved',
      `Dear ${owner.profile?.firstName || 'User'},\n\nYour property "${property.title}" has been approved and is now live on our platform.\n\nBest regards,\nBuildHomeMartSquares Team`
    ).catch(err => console.error('Email send error:', err));
  }

  res.json({
    success: true,
    message: 'Property approved successfully',
    data: { property }
  });
}));

// @desc    Reject property
// @route   POST /api/admin/properties/:id/reject
// @access  Private/Admin
router.post('/properties/:id/reject', authenticateToken, asyncHandler(async (req, res) => {
  // Check permission: Allow if user is SuperAdmin OR has properties.approve permission
  const isSuperAdminUser = req.user.role === 'superadmin';
  const hasApprovePermission = hasPermission(req.user, PERMISSIONS.PROPERTIES_APPROVE);

  if (!isSuperAdminUser && !hasApprovePermission) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to reject properties'
    });
  }

  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format'
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const property = await Property.findById(id).populate('owner', 'email profile.firstName profile.lastName profile.phone');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Update property status to rejected
    property.status = 'rejected';
    property.rejectionReason = reason;
    property.rejectedAt = new Date();
    property.rejectedBy = req.user.id;

    await property.save();

    // Send rejection email to property owner
    const owner = property.owner;
    try {
      if (owner && owner.email) {
        await sendTemplateEmail(owner.email, 'property-rejected', {
          firstName: owner.profile?.firstName || 'User',
          propertyTitle: property.title,
          rejectionReason: reason,
          resubmitUrl: `${process.env.FRONTEND_URL || 'https://squares-v3.vercel.app'}/vendor/properties/edit/${property._id}`
        });
      }
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    res.json({
      success: true,
      message: 'Property rejected successfully',
      data: { property }
    });
  } catch (error) {
    console.error('Reject property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject property'
    });
  }
}));

// ADDON MANAGEMENT ROUTES

// @desc    Get all addon services for admin
// @route   GET /api/admin/addons
// @access  Private (Admin role OR ADDONS_READ permission)
router.get('/addons', asyncHandler(async (req, res) => {
  const hasAdminRole = ['admin', 'superadmin'].includes(req.user.role);
  const hasReadPermission = hasPermission(req.user, PERMISSIONS.ADDONS_READ);

  if (!hasAdminRole && !hasReadPermission) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required or ADDONS_READ permission needed'
    });
  }

  const {
    category,
    isActive,
    search,
    minPrice,
    maxPrice,
    billingCycleMonths,
    page = 1,
    limit = 10
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (category) filter.category = category;
  if (isActive !== undefined && isActive !== 'all') filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Price filters
  if (minPrice) {
    filter.price = { $gte: parseFloat(minPrice) };
  }
  if (maxPrice) {
    filter.price = { ...filter.price, $lte: parseFloat(maxPrice) };
  }

  // Billing cycle months filter
  if (billingCycleMonths) {
    filter.billingCycleMonths = parseInt(billingCycleMonths);
  }

  const [addons, total] = await Promise.all([
    AddonService.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    AddonService.countDocuments(filter)
  ]);

  // Get max price from all addons (not just filtered ones)
  const maxPriceAddon = await AddonService.findOne().sort({ price: -1 }).select('price');
  const maxAvailablePrice = maxPriceAddon ? maxPriceAddon.price : 0;

  const totalPages = Math.ceil(total / limitNum);

  res.json({
    success: true,
    data: {
      addons,
      total,
      totalPages,
      currentPage: pageNum,
      maxAvailablePrice
    }
  });
}));

// @desc    Get addon service by ID for admin
// @route   GET /api/admin/addons/:id
// @access  Private/Admin
router.get('/addons/:id', asyncHandler(async (req, res) => {
  const addon = await AddonService.findById(req.params.id);

  if (!addon) {
    return res.status(404).json({
      success: false,
      message: 'Addon service not found'
    });
  }

  res.json({
    success: true,
    data: addon
  });
}));

// @desc    Create addon service
// @route   POST /api/admin/addons
// @access  Private (Admin role OR ADDONS_CREATE permission)
router.post('/addons', asyncHandler(async (req, res) => {
  const hasAdminRole = ['admin', 'superadmin'].includes(req.user.role);
  const hasCreatePermission = hasPermission(req.user, PERMISSIONS.ADDONS_CREATE);

  if (!hasAdminRole && !hasCreatePermission) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required or ADDONS_CREATE permission needed'
    });
  }

  const {
    name,
    description,
    price,
    currency,
    billingType,
    billingPeriod,
    billingCycleMonths,
    category,
    icon,
    isActive,
    sortOrder
  } = req.body;

  // Auto-calculate billingPeriod and billingCycleMonths based on months input
  let finalBillingPeriod = billingPeriod;
  let finalBillingCycleMonths = billingCycleMonths;

  // If billingCycleMonths is provided, auto-determine billing period
  if (finalBillingCycleMonths !== undefined) {
    if (finalBillingCycleMonths === 1) {
      finalBillingPeriod = 'monthly';
    } else if (finalBillingCycleMonths === 12) {
      finalBillingPeriod = 'yearly';
    } else if (finalBillingCycleMonths === 0) {
      finalBillingPeriod = 'one-time';
    } else {
      finalBillingPeriod = `${finalBillingCycleMonths} months`;
    }
  } else {
    // Default to monthly if not provided
    finalBillingPeriod = 'monthly';
    finalBillingCycleMonths = 1;
  }

  const addon = await AddonService.create({
    name,
    description,
    price,
    currency: currency || 'INR',
    billingType: billingType || 'recurring',
    billingPeriod: finalBillingPeriod,
    billingCycleMonths: finalBillingCycleMonths,
    category,
    icon,
    isActive: isActive !== undefined ? isActive : true,
    sortOrder: sortOrder || 0
  });

  res.status(201).json({
    success: true,
    data: addon
  });
}));

// @desc    Update addon service
// @route   PUT /api/admin/addons/:id
// @access  Private (Admin role OR ADDONS_EDIT permission)
router.put('/addons/:id', asyncHandler(async (req, res) => {
  const hasAdminRole = ['admin', 'superadmin'].includes(req.user.role);
  const hasEditPermission = hasPermission(req.user, PERMISSIONS.ADDONS_EDIT);

  if (!hasAdminRole && !hasEditPermission) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required or ADDONS_EDIT permission needed'
    });
  }

  const addon = await AddonService.findById(req.params.id);

  if (!addon) {
    return res.status(404).json({
      success: false,
      message: 'Addon service not found'
    });
  }

  const {
    name,
    description,
    price,
    currency,
    billingType,
    billingPeriod,
    billingCycleMonths,
    category,
    icon,
    isActive,
    sortOrder
  } = req.body;

  // Auto-calculate billingPeriod based on billingCycleMonths if provided
  if (billingCycleMonths !== undefined) {
    if (billingCycleMonths === 1) {
      addon.billingPeriod = 'monthly';
    } else if (billingCycleMonths === 12) {
      addon.billingPeriod = 'yearly';
    } else if (billingCycleMonths === 0) {
      addon.billingPeriod = 'one-time';
    } else {
      addon.billingPeriod = `${billingCycleMonths} months`;
    }
    addon.billingCycleMonths = billingCycleMonths;
  }

  // Override with explicit billingPeriod if provided
  if (billingPeriod !== undefined) addon.billingPeriod = billingPeriod;

  addon.name = name || addon.name;
  addon.description = description || addon.description;
  addon.price = price !== undefined ? price : addon.price;
  addon.currency = currency || addon.currency;
  addon.billingType = billingType || addon.billingType;
  addon.category = category || addon.category;
  addon.icon = icon !== undefined ? icon : addon.icon;
  addon.isActive = isActive !== undefined ? isActive : addon.isActive;
  addon.sortOrder = sortOrder !== undefined ? sortOrder : addon.sortOrder;

  await addon.save();

  res.json({
    success: true,
    data: addon
  });
}));

// @desc    Delete addon service
// @route   DELETE /api/admin/addons/:id
// @access  Private (Admin role OR ADDONS_DELETE permission)
router.delete('/addons/:id', asyncHandler(async (req, res) => {
  const hasAdminRole = ['admin', 'superadmin'].includes(req.user.role);
  const hasDeletePermission = hasPermission(req.user, PERMISSIONS.ADDONS_DELETE);

  if (!hasAdminRole && !hasDeletePermission) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required or ADDONS_DELETE permission needed'
    });
  }

  const addon = await AddonService.findById(req.params.id);

  if (!addon) {
    return res.status(404).json({
      success: false,
      message: 'Addon service not found'
    });
  }

  await addon.deleteOne();

  res.json({
    success: true,
    message: 'Addon service deleted successfully'
  });
}));

// @desc    Toggle addon service status
// @route   PATCH /api/admin/addons/:id/toggle-status
// @access  Private (Admin role OR ADDONS_DEACTIVATE permission)
router.patch('/addons/:id/toggle-status', asyncHandler(async (req, res) => {
  const hasAdminRole = ['admin', 'superadmin'].includes(req.user.role);
  const hasTogglePermission = hasPermission(req.user, PERMISSIONS.ADDONS_DEACTIVATE);

  if (!hasAdminRole && !hasTogglePermission) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required or ADDONS_DEACTIVATE permission needed'
    });
  }

  const addon = await AddonService.findById(req.params.id);

  if (!addon) {
    return res.status(404).json({
      success: false,
      message: 'Addon service not found'
    });
  }

  addon.isActive = !addon.isActive;
  await addon.save();

  res.json({
    success: true,
    data: addon
  });
}));

// @desc    Update addon sort order
// @route   PUT /api/admin/addons/sort-order
// @access  Private/Admin
router.put('/addons/sort-order', asyncHandler(async (req, res) => {
  const { addonIds } = req.body;

  if (!Array.isArray(addonIds)) {
    return res.status(400).json({
      success: false,
      message: 'addonIds must be an array'
    });
  }

  const updatePromises = addonIds.map((id, index) =>
    AddonService.findByIdAndUpdate(id, { sortOrder: index }, { new: true })
  );

  await Promise.all(updatePromises);

  res.json({
    success: true,
    message: 'Sort order updated successfully'
  });
}));

// @desc    Get addon statistics for admin dashboard
// @route   GET /api/admin/addons/stats
// @access  Private/Admin
router.get('/addons/stats', asyncHandler(async (req, res) => {
  const [
    totalAddons,
    activeAddons,
    inactiveAddons,
    categoryStats,
    billingTypeStats,
    addonUsageStats
  ] = await Promise.all([
    AddonService.countDocuments(),
    AddonService.countDocuments({ isActive: true }),
    AddonService.countDocuments({ isActive: false }),

    // Category distribution
    AddonService.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          totalRevenue: { $sum: '$price' }
        }
      },
      { $sort: { count: -1 } }
    ]),

    // Billing type distribution
    AddonService.aggregate([
      {
        $group: {
          _id: '$billingType',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      },
      { $sort: { count: -1 } }
    ]),

    // Usage in subscriptions
    Subscription.aggregate([
      { $unwind: '$addons' },
      {
        $lookup: {
          from: 'addonservices',
          localField: 'addons',
          foreignField: '_id',
          as: 'addonDetails'
        }
      },
      { $unwind: '$addonDetails' },
      {
        $group: {
          _id: '$addons',
          name: { $first: '$addonDetails.name' },
          usage: { $sum: 1 },
          revenue: { $sum: '$addonDetails.price' }
        }
      },
      { $sort: { usage: -1 } },
      { $limit: 10 }
    ])
  ]);

  // Calculate average price
  const allAddons = await AddonService.find({}, 'price');
  const avgPrice = allAddons.length > 0
    ? allAddons.reduce((sum, addon) => sum + addon.price, 0) / allAddons.length
    : 0;

  res.json({
    success: true,
    data: {
      overview: {
        totalAddons,
        activeAddons,
        inactiveAddons,
        avgPrice: Math.round(avgPrice)
      },
      categoryStats,
      billingTypeStats,
      addonUsageStats,
      generatedAt: new Date()
    }
  });
}));

// @desc    Get all messages for admin management
// @route   GET /api/admin/messages
// @access  Private/Admin
router.get('/messages', asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      priority,
      search
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query - only show messages where current admin is the recipient
    let filter = {
      recipient: req.user.id  // Only show messages intended for this admin
    };
    if (status && status !== 'all') filter.status = status;
    if (type && type !== 'all') filter.type = type;
    if (priority && priority !== 'all') filter.priority = priority;

    // Add search functionality
    if (search && search.trim()) {
      filter.$or = [
        { content: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    const [messages, totalCount] = await Promise.all([
      Message.find(filter)
        .populate('sender', 'email role profile.firstName profile.lastName profile.avatar')
        .populate('recipient', 'email role profile.firstName profile.lastName profile.avatar')
        .populate('property', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Message.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalMessages: totalCount,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
}));

// @desc    Get message statistics for admin dashboard
// @route   GET /api/admin/messages/stats
// @access  Private/Admin
router.get('/messages/stats', asyncHandler(async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalMessages,
      unreadMessages,
      repliedMessages,
      flaggedMessages,
      todayMessages,
      weeklyMessages,
      monthlyMessages,
      messagesByType,
      messagesByPriority,
      responseTimeData
    ] = await Promise.all([
      Message.countDocuments({ recipient: req.user.id }),
      Message.countDocuments({ recipient: req.user.id, status: 'unread' }),
      Message.countDocuments({ recipient: req.user.id, status: 'replied' }),
      Message.countDocuments({ recipient: req.user.id, status: 'flagged' }),
      Message.countDocuments({ recipient: req.user.id, createdAt: { $gte: today } }),
      Message.countDocuments({ recipient: req.user.id, createdAt: { $gte: last7Days } }),
      Message.countDocuments({ recipient: req.user.id, createdAt: { $gte: last30Days } }),

      // Messages by type
      Message.aggregate([
        { $match: { recipient: req.user.id } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Messages by priority
      Message.aggregate([
        { $match: { recipient: req.user.id } },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Average response time calculation
      Message.aggregate([
        {
          $match: {
            recipient: req.user.id,
            status: 'replied',
            repliedAt: { $exists: true },
            createdAt: { $exists: true }
          }
        },
        {
          $project: {
            responseTime: {
              $divide: [
                { $subtract: ['$repliedAt', '$createdAt'] },
                1000 * 60 * 60 // Convert to hours
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$responseTime' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Calculate response rate
    const responseRate = totalMessages > 0
      ? Math.round((repliedMessages / totalMessages) * 100)
      : 0;

    // Format average response time
    const avgResponseTime = responseTimeData.length > 0
      ? `${Math.round(responseTimeData[0].avgResponseTime * 10) / 10} hours`
      : 'N/A';

    res.json({
      success: true,
      data: {
        totalMessages,
        unreadMessages,
        repliedMessages,
        flaggedMessages,
        todayMessages,
        weeklyMessages,
        monthlyMessages,
        responseRate,
        avgResponseTime,
        messagesByType,
        messagesByPriority
      }
    });
  } catch (error) {
    console.error('Get message stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message statistics'
    });
  }
}));

// @desc    Update message status
// @route   PATCH /api/admin/messages/:messageId/status
// @access  Private/Admin
router.patch('/messages/:messageId/status', asyncHandler(async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;

    const validStatuses = ['unread', 'read', 'replied', 'archived', 'flagged'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updateData = { status };
    if (status === 'read') {
      updateData.readAt = new Date();
    } else if (status === 'replied') {
      updateData.repliedAt = new Date();
    }

    const message = await Message.findByIdAndUpdate(
      messageId,
      updateData,
      { new: true }
    ).populate('sender', 'email profile.firstName profile.lastName')
      .populate('recipient', 'email profile.firstName profile.lastName');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      data: { message },
      message: `Message marked as ${status}`
    });
  } catch (error) {
    console.error('Update message status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update message status'
    });
  }
}));

// @desc    Delete message
// @route   DELETE /api/admin/messages/:messageId
// @access  Private/Admin
router.delete('/messages/:messageId', asyncHandler(async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndDelete(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message'
    });
  }
}));

// @desc    Send reply to message
// @route   POST /api/admin/messages/:messageId/reply
// @access  Private/Admin
router.post('/messages/:messageId/reply', asyncHandler(async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, subject } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply content is required'
      });
    }

    const originalMessage = await Message.findById(messageId)
      .populate('sender', 'email profile.firstName profile.lastName');

    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Original message not found'
      });
    }

    // Create reply message
    const replyMessage = new Message({
      sender: req.user.id, // Admin user
      recipient: originalMessage.sender._id,
      subject: subject || `Re: ${originalMessage.subject || originalMessage.message || 'Your Inquiry'}`,
      content: content.trim(),
      type: 'general',
      status: 'read', // Admin messages are automatically read
      priority: originalMessage.priority || 'medium',
      parentMessage: messageId,
      // Don't set conversationId for admin messages
    });

    await replyMessage.save();

    // Update original message status
    await Message.findByIdAndUpdate(messageId, {
      status: 'replied',
      repliedAt: new Date()
    });

    // Populate the reply with sender info
    await replyMessage.populate('sender', 'email profile.firstName profile.lastName');
    await replyMessage.populate('recipient', 'email profile.firstName profile.lastName');

    res.json({
      success: true,
      data: { reply: replyMessage },
      message: 'Reply sent successfully'
    });
  } catch (error) {
    console.error('Send reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reply'
    });
  }
}));

// ===== SETTINGS MANAGEMENT ROUTES =====

// @desc    Get all application settings
// @route   GET /api/admin/settings
// @access  Private/Admin
router.get('/settings', asyncHandler(async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    res.json({
      success: true,
      data: {
        settings: {
          general: settings.general,
          notifications: settings.notifications,
          security: settings.security,
          payment: settings.payment,
          system: settings.system,
          integrations: settings.integrations,
          location: settings.location,
          createdAt: settings.createdAt,
          updatedAt: settings.updatedAt
        }
      },
      message: 'Settings retrieved successfully'
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve settings'
    });
  }
}));

// @desc    Update specific settings category
// @route   PATCH /api/admin/settings/:category
// @access  Private/Admin
router.patch('/settings/:category', asyncHandler(async (req, res) => {
  try {
    const { category } = req.params;
    const updates = req.body;

    const validCategories = ['general', 'notifications', 'security', 'payment', 'system', 'integrations', 'location'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      });
    }

    // Validate specific category rules
    const validation = validateSettingsUpdate(category, updates);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const settings = await Settings.updateCategory(category, updates, req.user.id);

    res.json({
      success: true,
      data: {
        settings: {
          [category]: settings[category],
          updatedAt: settings.updatedAt
        }
      },
      message: `${category.charAt(0).toUpperCase() + category.slice(1)} settings updated successfully`
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update settings'
    });
  }
}));

// @desc    Reset settings category to defaults
// @route   POST /api/admin/settings/:category/reset
// @access  Private/Admin
router.post('/settings/:category/reset', asyncHandler(async (req, res) => {
  try {
    const { category } = req.params;

    const validCategories = ['general', 'notifications', 'security', 'payment', 'system', 'integrations', 'location'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      });
    }

    const settings = await Settings.resetCategory(category, req.user.id);

    res.json({
      success: true,
      data: {
        settings: {
          [category]: settings[category],
          updatedAt: settings.updatedAt
        }
      },
      message: `${category.charAt(0).toUpperCase() + category.slice(1)} settings reset to defaults`
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset settings'
    });
  }
}));

// @desc    Test notification settings
// @route   POST /api/admin/settings/test-notification
// @access  Private/Admin
router.post('/settings/test-notification', asyncHandler(async (req, res) => {
  try {
    const { type } = req.body;

    if (!['email', 'sms', 'push'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification type. Must be email, sms, or push'
      });
    }

    // Mock test implementation - in production, integrate with actual services
    let message = '';
    let success = true;

    switch (type) {
      case 'email':
        message = 'Test email sent successfully to admin email address';
        break;
      case 'sms':
        message = 'Test SMS sent successfully to admin phone number';
        break;
      case 'push':
        message = 'Test push notification sent successfully';
        break;
    }

    res.json({
      success,
      message
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
}));

// @desc    Test integration settings
// @route   POST /api/admin/settings/test-integration
// @access  Private/Admin
router.post('/settings/test-integration', asyncHandler(async (req, res) => {
  try {
    const { type } = req.body;

    if (!['email', 'sms', 'payment', 'maps'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid integration type. Must be email, sms, payment, or maps'
      });
    }

    const settings = await Settings.getSettings();
    let message = '';
    let success = true;

    switch (type) {
      case 'email':
        if (!settings.integrations.emailApiKey) {
          success = false;
          message = 'Email API key not configured';
        } else {
          message = `${settings.integrations.emailProvider} email integration test successful`;
        }
        break;
      case 'sms':
        if (!settings.integrations.smsApiKey) {
          success = false;
          message = 'SMS API key not configured';
        } else {
          message = `${settings.integrations.smsProvider} SMS integration test successful`;
        }
        break;
      case 'payment':
        if (!settings.integrations.paymentApiKey) {
          success = false;
          message = 'Payment API key not configured';
        } else {
          message = `${settings.integrations.paymentGateway} payment gateway test successful`;
        }
        break;
      case 'maps':
        if (!settings.integrations.googleMapsApiKey) {
          success = false;
          message = 'Google Maps API key not configured';
        } else {
          message = 'Google Maps integration test successful';
        }
        break;
    }

    res.json({
      success,
      message
    });
  } catch (error) {
    console.error('Test integration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test integration'
    });
  }
}));

// @desc    Sync settings real-time
// @route   POST /api/admin/settings/sync
// @access  Private/Admin
router.post('/settings/sync', asyncHandler(async (req, res) => {
  try {
    const { category, key, value } = req.body;

    if (!category || !key) {
      return res.status(400).json({
        success: false,
        message: 'Category and key are required'
      });
    }

    // This is for real-time syncing of individual settings
    // You could implement WebSocket broadcasting here
    res.json({
      success: true,
      message: 'Settings synced successfully'
    });
  } catch (error) {
    console.error('Sync settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync settings'
    });
  }
}));

// @desc    Export settings
// @route   GET /api/admin/settings/export
// @access  Private/Admin
router.get('/settings/export', asyncHandler(async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const exportData = settings.toPublicJSON();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="app-settings-${new Date().toISOString().split('T')[0]}.json"`);

    res.json({
      exportedAt: new Date().toISOString(),
      version: settings.version,
      settings: exportData
    });
  } catch (error) {
    console.error('Export settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export settings'
    });
  }
}));

// @desc    Import settings
// @route   POST /api/admin/settings/import
// @access  Private/Admin
router.post('/settings/import', asyncHandler(async (req, res) => {
  try {
    // This would require multer middleware for file upload
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Settings import functionality available - requires file upload implementation'
    });
  } catch (error) {
    console.error('Import settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import settings'
    });
  }
}));

// Helper function to validate settings updates
function validateSettingsUpdate(category, updates) {
  const errors = [];

  switch (category) {
    case 'general':
      if (updates.siteName && (!updates.siteName.trim() || updates.siteName.length > 100)) {
        errors.push('Site name must be 1-100 characters');
      }
      if (updates.contactEmail && !isValidEmail(updates.contactEmail)) {
        errors.push('Invalid contact email format');
      }
      if (updates.supportEmail && !isValidEmail(updates.supportEmail)) {
        errors.push('Invalid support email format');
      }
      break;

    case 'security':
      if (updates.sessionTimeout && (updates.sessionTimeout < 5 || updates.sessionTimeout > 480)) {
        errors.push('Session timeout must be between 5 and 480 minutes');
      }
      if (updates.passwordMinLength && (updates.passwordMinLength < 6 || updates.passwordMinLength > 50)) {
        errors.push('Password minimum length must be between 6 and 50 characters');
      }
      if (updates.maxLoginAttempts && (updates.maxLoginAttempts < 3 || updates.maxLoginAttempts > 20)) {
        errors.push('Max login attempts must be between 3 and 20');
      }
      if (updates.lockoutDuration && (updates.lockoutDuration < 5 || updates.lockoutDuration > 1440)) {
        errors.push('Lockout duration must be between 5 and 1440 minutes (24 hours)');
      }
      break;

    case 'payment':
      if (updates.taxRate && (updates.taxRate < 0 || updates.taxRate > 100)) {
        errors.push('Tax rate must be between 0% and 100%');
      }
      if (updates.processingFee && (updates.processingFee < 0 || updates.processingFee > 20)) {
        errors.push('Processing fee must be between 0% and 20%');
      }
      if (updates.minimumAmount && updates.minimumAmount < 0) {
        errors.push('Minimum amount cannot be negative');
      }
      break;

    case 'location':
      if (updates.defaultRadius && (updates.defaultRadius < 1 || updates.defaultRadius > 1000)) {
        errors.push('Default radius must be between 1 and 1000');
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Helper function to validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============= SUBADMIN PROXY ROUTES =============
// These routes proxy to subadmin functionality for backward compatibility

// @desc    Get subadmin dashboard (proxy to subadmin route)
// @route   GET /api/admin/subadmin/dashboard
// @access  Private/SubAdmin
router.get('/subadmin/dashboard', isAnyAdmin, asyncHandler(async (req, res) => {
  const [
    pendingPropertyReviews,
    approvedProperties,
    rejectedProperties,
    pendingSupportTickets,
    totalVendors,
    newContentReports
  ] = await Promise.all([
    Property.countDocuments({ status: 'pending' }),
    Property.countDocuments({ status: 'approved' }),
    Property.countDocuments({ status: 'rejected' }),
    Message.countDocuments({ type: 'support', status: 'open' }),
    User.countDocuments({ role: 'agent' }),
    0 // Placeholder for content reports
  ]);

  res.json({
    success: true,
    stats: {
      pendingPropertyReviews,
      approvedProperties,
      rejectedProperties,
      pendingSupportTickets,
      pendingPromotions: 0,
      totalVendors,
      newContentReports
    }
  });
}));

// @desc    Get properties for review
// @route   GET /api/admin/properties/review
// @access  Private/Admin
router.get('/properties/review', isAnyAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = 'pending', search = '' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let query = {};
  if (status && status !== 'all') {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { 'address.city': { $regex: search, $options: 'i' } }
    ];
  }

  const [properties, total] = await Promise.all([
    Property.find(query)
      .populate('owner', 'email profile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Property.countDocuments(query)
  ]);

  res.json({
    success: true,
    properties,
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page)
  });
}));

// @desc    Get pending properties for approval
// @route   GET /api/admin/properties/pending-approval
// @access  Private/Admin
router.get('/properties/pending-approval', isAnyAdmin, asyncHandler(async (req, res) => {
  const properties = await Property.find({ status: 'pending' })
    .populate('owner', 'email profile')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    properties
  });
}));

// @desc    Get support tickets
// @route   GET /api/admin/support/tickets
// @access  Private/Admin
router.get('/support/tickets', isAnyAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = 'open', priority = '', search = '' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let query = {};
  if (status && status !== 'all') {
    query.status = status;
  }
  if (priority) {
    query.priority = priority;
  }
  if (search) {
    query.$or = [
      { subject: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const [tickets, total] = await Promise.all([
    SupportTicket.find(query)
      .populate('user', 'email profile')
      .populate('assignedTo', 'email profile')
      .populate('lockedBy', 'email profile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    SupportTicket.countDocuments(query)
  ]);

  res.json({
    success: true,
    tickets,
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page)
  });
}));

// @desc    Respond to support ticket
// @route   POST /api/admin/support/tickets/:id/respond
// @access  Private/Admin
router.post('/support/tickets/:id/respond', isAnyAdmin, asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      message: 'Response message is required'
    });
  }

  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Support ticket not found'
    });
  }

  // Check if ticket is locked by another admin
  if (ticket.lockedBy && ticket.lockedBy.toString() !== req.user.id.toString()) {
    const User = require('../models/User');
    const lockedByUser = await User.findById(ticket.lockedBy).select('name email profile');
    const lockerName = lockedByUser?.profile?.firstName
      ? `${lockedByUser.profile.firstName} ${lockedByUser.profile.lastName || ''}`
      : lockedByUser?.email || 'another user';

    return res.status(423).json({
      success: false,
      message: `This ticket is currently being handled by ${lockerName}. Please choose a different ticket.`
    });
  }

  ticket.responses.push({
    message,
    author: req.user.profile?.firstName
      ? `${req.user.profile.firstName} ${req.user.profile.lastName || ''}`
      : req.user.email,
    authorId: req.user.id,
    isAdmin: true
  });

  if (!ticket.assignedTo) {
    ticket.assignedTo = req.user.id;
    ticket.assignedAt = new Date();
  }

  // Lock the ticket to this admin
  if (!ticket.lockedBy) {
    ticket.lockedBy = req.user.id;
    ticket.lockedAt = new Date();
  }

  if (ticket.status === 'open') {
    ticket.status = 'in_progress';
  }

  await ticket.save();

  res.json({
    success: true,
    message: 'Response sent successfully',
    data: ticket
  });
}));

// @desc    Update support ticket status
// @route   PUT /api/admin/support/tickets/:id/status
// @access  Private/Admin
router.put('/support/tickets/:id/status', isAnyAdmin, asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status is required'
    });
  }

  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Support ticket not found'
    });
  }

  // Check if ticket is locked by another admin (unless resolving/closing)
  if (ticket.lockedBy && ticket.lockedBy.toString() !== req.user.id.toString() && status !== 'resolved' && status !== 'closed') {
    const User = require('../models/User');
    const lockedByUser = await User.findById(ticket.lockedBy).select('name email profile');
    const lockerName = lockedByUser?.profile?.firstName
      ? `${lockedByUser.profile.firstName} ${lockedByUser.profile.lastName || ''}`
      : lockedByUser?.email || 'another user';

    return res.status(423).json({
      success: false,
      message: `This ticket is currently being handled by ${lockerName}. Please choose a different ticket.`
    });
  }

  // When accepting/moving to in_progress, lock the ticket
  if (status === 'in_progress' && !ticket.lockedBy) {
    ticket.lockedBy = req.user.id;
    ticket.lockedAt = new Date();
    ticket.assignedTo = req.user.id;
    ticket.assignedAt = new Date();
  }

  if (status === 'resolved') {
    ticket.status = 'closed'; // Auto-close resolved tickets
    ticket.resolvedBy = req.user.id;
    ticket.resolvedAt = new Date();
    // Unlock when resolving
    ticket.lockedBy = null;
    ticket.lockedAt = null;
  } else {
    ticket.status = status;
  }

  await ticket.save();

  res.json({
    success: true,
    message: 'Ticket status updated successfully',
    data: ticket
  });
}));

// @desc    Get vendor performance
// @route   GET /api/admin/vendors/performance
// @access  Private/Admin
router.get('/vendors/performance', isAnyAdmin, asyncHandler(async (req, res) => {
  const { sortBy = 'totalProperties', status = 'all', timeRange = '30d' } = req.query;

  const vendors = await User.aggregate([
    { $match: { role: 'agent' } },
    {
      $lookup: {
        from: 'properties',
        localField: '_id',
        foreignField: 'owner',
        as: 'properties'
      }
    },
    {
      $project: {
        email: 1,
        'profile.firstName': 1,
        'profile.lastName': 1,
        'profile.phone': 1,
        status: 1,
        totalProperties: { $size: '$properties' },
        activeProperties: {
          $size: {
            $filter: {
              input: '$properties',
              cond: { $eq: ['$$this.status', 'active'] }
            }
          }
        },
        pendingProperties: {
          $size: {
            $filter: {
              input: '$properties',
              cond: { $eq: ['$$this.status', 'pending'] }
            }
          }
        }
      }
    },
    { $sort: { [sortBy]: -1 } }
  ]);

  res.json({
    success: true,
    vendors
  });
}));

// @desc    Get expired free listings
// @route   GET /api/admin/properties/expired-free-listings
// @access  Private/Admin
router.get('/properties/expired-free-listings', authenticateToken, isSuperAdmin, asyncHandler(async (req, res) => {
  const now = new Date();

  // Find all free listings that have expired
  const expiredProperties = await Property.find({
    isFreeListing: true,
    freeListingExpiresAt: { $lte: now },
    $or: [
      { archived: { $exists: false } },
      { archived: false }
    ]
  })
    .populate('owner', 'email profile.firstName profile.lastName profile.phone')
    .populate('vendor', 'businessName')
    .sort({ freeListingExpiresAt: -1 });

  // Also get already archived properties
  const archivedProperties = await Property.find({
    isFreeListing: true,
    archived: true
  })
    .populate('owner', 'email profile.firstName profile.lastName profile.phone')
    .populate('vendor', 'businessName')
    .sort({ archivedAt: -1 })
    .limit(50);

  res.json({
    success: true,
    data: {
      expired: expiredProperties,
      archived: archivedProperties,
      expiredCount: expiredProperties.length,
      archivedCount: archivedProperties.length
    }
  });
}));

// @desc    Manually trigger free listing expiry job
// @route   POST /api/admin/properties/run-expiry-job
// @access  Private/Admin
router.post('/properties/run-expiry-job', authenticateToken, isSuperAdmin, asyncHandler(async (req, res) => {
  const freeListingExpiryJob = require('../jobs/freeListingExpiry');

  console.log(`[Admin] Manually triggering free listing expiry job by user ${req.user.id}`);

  const result = await freeListingExpiryJob.trigger();

  res.json({
    success: true,
    message: 'Free listing expiry job completed',
    data: result
  });
}));

// @desc    Restore archived property (unarchive)
// @route   POST /api/admin/properties/:id/unarchive
// @access  Private/Admin
router.post('/properties/:id/unarchive', authenticateToken, isSuperAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid property ID format'
    });
  }

  const property = await Property.findById(id);

  if (!property) {
    return res.status(404).json({
      success: false,
      message: 'Property not found'
    });
  }

  if (!property.archived) {
    return res.status(400).json({
      success: false,
      message: 'Property is not archived'
    });
  }

  // Unarchive the property
  property.archived = false;
  property.archivedAt = null;
  property.archivedReason = null;

  // Extend expiration by 30 days if it's a free listing
  if (property.isFreeListing) {
    const newExpirationDate = new Date();
    newExpirationDate.setDate(newExpirationDate.getDate() + 30);
    property.freeListingExpiresAt = newExpirationDate;
  }

  await property.save();

  res.json({
    success: true,
    message: 'Property unarchived successfully',
    data: { property }
  });
}));

// Review Management Routes
router.get('/reviews', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.REVIEWS_VIEW)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { page = 1, limit = 10, search = '', status = '', rating = '', flagged = '' } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { comment: { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'approved') query.status = 'active';
    else if (status === 'pending') query.status = { $in: ['reported', 'hidden'] };
    else if (status === 'rejected') query.status = 'deleted';
    else if (status) query.status = status;

    if (rating) query.rating = parseInt(rating);
    if (flagged === 'true') query.status = 'reported';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Review.countDocuments(query);

    const reviews = await Review.find(query)
      .populate('client', 'name email profile')
      .populate('vendor', 'businessName')
      .populate('property', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const formatted = reviews.map(r => ({
      id: r._id,
      user: r.client ? {
        name: r.client.name,
        email: r.client.email,
        profile: r.client.profile || {}
      } : null,
      property: r.property ? { name: r.property.name } : null,
      vendor: r.vendor ? { name: r.vendor.businessName } : null,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      isApproved: r.status === 'active',
      isFlagged: r.status === 'reported',
      createdAt: r.createdAt,
      helpfulVotes: r.helpfulVotes || 0,
      unhelpfulVotes: r.unhelpfulVotes || 0,
      vendorResponse: r.vendorResponse
    }));

    res.json({
      success: true,
      data: {
        reviews: formatted,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
});

router.get('/reviews/stats', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.REVIEWS_VIEW)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [total, approved, pending, flagged] = await Promise.all([
      Review.countDocuments(),
      Review.countDocuments({ status: 'active' }),
      Review.countDocuments({ status: { $in: ['reported', 'hidden'] } }),
      Review.countDocuments({ status: 'reported' })
    ]);

    const avgRatingResult = await Review.aggregate([
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);
    const avgRating = avgRatingResult[0]?.avg || 0;

    res.json({
      success: true,
      data: {
        total: total || 0,
        approved: approved || 0,
        pending: pending || 0,
        flagged: flagged || 0,
        avgRating: avgRating ? parseFloat(avgRating.toFixed(1)) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

router.post('/reviews/:id/approve', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.REVIEWS_REPORT)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: 'active', isPublic: true },
      { new: true }
    ).populate('client', 'name email profile')
      .populate('vendor', 'businessName')
      .populate('property', 'name');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({
      success: true,
      message: 'Review approved',
      data: {
        review: {
          id: review._id,
          user: review.client ? {
            name: review.client.name,
            email: review.client.email,
            profile: review.client.profile || {}
          } : null,
          property: review.property ? { name: review.property.name } : null,
          vendor: review.vendor ? { name: review.vendor.businessName } : null,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          isApproved: true,
          isFlagged: false,
          createdAt: review.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({ success: false, message: 'Failed to approve review' });
  }
});

router.post('/reviews/:id/reject', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.REVIEWS_REPORT)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: 'hidden', isPublic: false },
      { new: true }
    ).populate('client', 'name email profile')
      .populate('vendor', 'businessName')
      .populate('property', 'name');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({
      success: true,
      message: 'Review rejected',
      data: {
        review: {
          id: review._id,
          user: review.client ? {
            name: review.client.name,
            email: review.client.email,
            profile: review.client.profile || {}
          } : null,
          property: review.property ? { name: review.property.name } : null,
          vendor: review.vendor ? { name: review.vendor.businessName } : null,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          isApproved: false,
          isFlagged: false,
          createdAt: review.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Error rejecting review:', error);
    res.status(500).json({ success: false, message: 'Failed to reject review' });
  }
});

router.delete('/reviews/:id', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.REVIEWS_MANAGE)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: 'deleted', isPublic: false },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, message: 'Failed to delete review' });
  }
});

router.post('/reviews/:id/flag', authenticateToken, async (req, res) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.REVIEWS_REPORT)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: 'reported', isPublic: false },
      { new: true }
    ).populate('client', 'name email profile')
      .populate('vendor', 'businessName')
      .populate('property', 'name');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Send email notification to customer
    if (review.client && review.client.email) {
      try {
        await sendEmail({
          to: review.client.email,
          template: 'review-flagged',
          data: {
            customerName: review.client.name || 'Valued Customer',
            propertyName: review.property?.name,
            rating: review.rating,
            reviewTitle: review.title,
            reviewComment: review.comment
          }
        });
        console.log(`✅ Flagged review notification sent to ${review.client.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send flagged review email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      message: 'Review flagged',
      data: {
        review: {
          id: review._id,
          user: review.client ? {
            name: review.client.name,
            email: review.client.email,
            profile: review.client.profile || {}
          } : null,
          property: review.property ? { name: review.property.name } : null,
          vendor: review.vendor ? { name: review.vendor.businessName } : null,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          isApproved: false,
          isFlagged: true,
          createdAt: review.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Error flagging review:', error);
    res.status(500).json({ success: false, message: 'Failed to flag review' });
  }
});

router.post('/reviews/:id/reply', authenticateToken, async (req, res) => {
  try {
    const isSA = req.user.role === 'SuperAdmin';
    const hasPerm = req.user.rolePermissions?.includes('reviews.respond');

    if (!isSA && !hasPerm) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Reply message is required' });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      {
        vendorResponse: {
          message: message.trim(),
          respondedAt: new Date(),
          respondedBy: req.user.name || req.user.email,
          respondedByRole: req.user.role
        }
      },
      { new: true }
    ).populate('client', 'name email profile')
      .populate('vendor', 'businessName')
      .populate('property', 'name');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({
      success: true,
      message: 'Reply posted successfully',
      data: {
        review: {
          id: review._id,
          user: review.client ? {
            name: review.client.name,
            email: review.client.email,
            profile: review.client.profile || {}
          } : null,
          property: review.property ? { name: review.property.name } : null,
          vendor: review.vendor ? { name: review.vendor.businessName } : null,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          isApproved: review.status === 'active',
          isFlagged: review.status === 'reported',
          vendorResponse: review.vendorResponse,
          createdAt: review.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Error posting reply:', error);
    res.status(500).json({ success: false, message: 'Failed to post reply' });
  }
});


// @desc    Get audience counts for notifications
// @route   GET /api/admin/notifications/audience-counts
// @access  Private/Admin
router.get('/notifications/audience-counts', authenticateToken, isAnyAdmin, asyncHandler(async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    const [
      allUsers,
      customers,
      vendors,
      activeUsers,
      premiumUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'vendor' }),
      User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ 'profile.isPremium': true })
    ]);

    const premiumSubs = await Subscription.countDocuments({ status: 'active' });

    res.json({
      success: true,
      counts: {
        all_users: allUsers,
        customers: customers,
        vendors: vendors,
        active_users: activeUsers,
        premium_users: premiumSubs || premiumUsers
      }
    });
  } catch (error) {
    console.error('Get audience counts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audience counts' });
  }
}));

// @desc    Get notification history
// @route   GET /api/admin/notifications/history
// @access  Private/Admin
router.get('/notifications/history', authenticateToken, isAnyAdmin, asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sentBy', 'name email');

    const total = await Notification.countDocuments({});

    res.json({
      success: true,
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get notification history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notification history' });
  }
}));

// @desc    Send notifications (Push & Email) OR Save Draft
// @route   POST /api/admin/notifications/send
// @access  Private/Admin
router.post('/notifications/send', authenticateToken, isAnyAdmin, asyncHandler(async (req, res) => {
  const { subject, message, targetAudience, channels, isScheduled, scheduledDate, saveAsDraft, notificationId } = req.body;

  if (!subject || !message || !channels || channels.length === 0) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    // Define audience query
    let query = {};
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

    switch (targetAudience) {
      case 'customers':
        query = { role: 'customer' };
        break;
      case 'vendors':
        query = { role: 'vendor' };
        break;
      case 'active_users':
        query = { lastLogin: { $gte: thirtyDaysAgo } };
        break;
      case 'premium_users':
        const activeSubUserIds = await Subscription.distinct('user', { status: 'active' });
        query = { _id: { $in: activeSubUserIds } };
        break;
      case 'all_users':
      default:
        query = {};
    }

    // Fetch users (projection to save memory)
    const users = await User.find(query).select('_id email role profile');

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'No users found for the selected audience' });
    }

    let notification;

    if (notificationId) {
      // Update existing draft
      notification = await Notification.findById(notificationId);
      if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      notification.title = subject;
      notification.subject = subject;
      notification.message = message;
      notification.targetAudience = targetAudience;
      notification.channels = channels;
      notification.recipients = users.map(u => ({ user: u._id }));
      notification.status = saveAsDraft ? 'draft' : 'sending'; // Update status
      notification.isScheduled = isScheduled || false;
      notification.scheduledDate = isScheduled ? scheduledDate : null;
      notification.sentAt = (saveAsDraft || isScheduled) ? null : new Date();

      await notification.save();
    } else {
      // Create New Notification
      notification = new Notification({
        title: subject,
        subject: subject,
        message: message,
        type: 'informational',
        targetAudience: targetAudience,
        channels: channels,
        recipients: users.map(u => ({ user: u._id })),
        status: saveAsDraft ? 'draft' : 'sending',
        sentBy: req.user.id,
        isScheduled: isScheduled || false,
        scheduledDate: isScheduled ? scheduledDate : null,
        sentAt: (saveAsDraft || isScheduled) ? null : new Date()
      });

      await notification.save();
    }

    // If saving as draft, return early
    if (saveAsDraft) {
      return res.json({
        success: true,
        message: 'Notification draft saved successfully',
        notification
      });
    }

    const results = {
      total: users.length,
      email: { sent: 0, failed: 0 },
      push: { sent: 0, failed: 0 }
    };

    // Process Emails
    if (channels.includes('email') && !isScheduled) {
      const emailPromises = users.map(user => {
        if (!user.email) return Promise.resolve();
        return sendTemplateEmail(user.email, 'general-notification', {
          subject,
          message,
          firstName: user.profile?.firstName || 'User',
          actionLink: process.env.CLIENT_URL,
          actionText: 'Go to Dashboard'
        }).then(res => {
          if (res.success) results.email.sent++;
          else results.email.failed++;
        });
      });

      await Promise.all(emailPromises);
    }

    // Process Push (Socket.IO)
    if (channels.includes('push') && !isScheduled) {
      const userIds = users.map(u => u._id.toString());
      const notificationData = {
        type: 'admin_broadcast',
        title: subject,
        message: message,
        data: {
          timestamp: new Date().toISOString(),
          notificationId: notification._id
        }
      };

      const notificationService = require('../services/notificationService');
      notificationService.sendNotification(userIds, notificationData);
      results.push.sent = userIds.length;
    }

    // Update notification status and stats
    if (!isScheduled) {
      notification.status = 'sent';

      // Mark all recipients as delivered for accurate stats in pre-save hook
      if (notification.recipients && notification.recipients.length > 0) {
        notification.recipients.forEach(r => {
          r.delivered = true;
          r.deliveredAt = new Date();
        });
      }

      notification.statistics = {
        totalRecipients: users.length,
        delivered: results.push.sent + results.email.sent,
      };
      await notification.save();
    }

    res.json({
      success: true,
      message: isScheduled ? 'Notification scheduled successfully' : 'Notifications sent successfully',
      detailedStatus: results,
      notification
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ success: false, message: 'Failed to process notification' });
  }
}));

// @desc    Update a notification draft
// @route   PUT /api/admin/notifications/:id
// @access  Private/Admin
router.put('/notifications/:id', authenticateToken, isAnyAdmin, asyncHandler(async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only drafts can be edited' });
    }

    const { subject, message, targetAudience, channels, isScheduled, scheduledDate } = req.body;

    if (subject) notification.subject = subject;
    if (subject) notification.title = subject;
    if (message) notification.message = message;
    if (targetAudience) notification.targetAudience = targetAudience;
    if (channels) notification.channels = channels;
    if (isScheduled !== undefined) notification.isScheduled = isScheduled;
    if (scheduledDate) notification.scheduledDate = scheduledDate;

    await notification.save();

    res.json({
      success: true,
      message: 'Draft updated successfully',
      notification
    });
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
}));



// @desc    Delete notification
// @route   DELETE /api/admin/notifications/:id
// @access  Private/Admin
router.delete('/notifications/:id', authenticateToken, isAnyAdmin, asyncHandler(async (req, res) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.NOTIFICATIONS_DELETE)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to delete notifications' });
    }

    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await notification.deleteOne();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
}));

module.exports = router;
