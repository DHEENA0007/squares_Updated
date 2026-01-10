const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');
const { sendTemplateEmail } = require('../utils/emailService');
const notificationService = require('../services/notificationService');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
  }
});

// @desc    Create a new support ticket (public endpoint)
// @route   POST /api/support/tickets
// @access  Public (with optional auth)
router.post('/tickets', optionalAuth, upload.array('attachments', 5), asyncHandler(async (req, res) => {
  const { name, email, phone, subject, category, priority, description } = req.body;

  // Validation
  if (!subject || !description || !email) {
    return res.status(400).json({
      success: false,
      message: 'Subject, description, and email are required'
    });
  }

  let userId = null;

  // If user is authenticated, use their ID
  if (req.user) {
    userId = req.user.id;
  } else {
    // For guest users, try to find or create a guest user record
    let guestUser = await User.findOne({ email: email.toLowerCase() });

    if (!guestUser) {
      // Create a guest user record for tracking
      const nameParts = (name || 'Guest User').split(' ');
      const firstName = nameParts[0] || 'Guest';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      guestUser = await User.create({
        email: email.toLowerCase(),
        phone: phone || '',
        role: 'customer',
        status: 'active',
        isGuest: true,
        password: Math.random().toString(36).slice(-8), // Random password for guest users
        profile: {
          firstName: firstName,
          lastName: lastName,
          phone: phone || ''
        }
      });
    }

    userId = guestUser._id;
  }

  // Handle file uploads to Cloudinary
  const attachmentObjects = [];
  if (req.files && req.files.length > 0) {
    try {
      console.log(`Processing ${req.files.length} file(s) for support ticket...`);

      for (const file of req.files) {
        try {
          // Set a timeout for each file upload (30 seconds)
          const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'ninety-nine-acres/support-tickets',
                resource_type: 'auto',
                allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
                timeout: 30000 // 30 second timeout
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            uploadStream.end(file.buffer);
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Upload timeout - file too large or slow connection')), 35000)
          );

          const result = await Promise.race([uploadPromise, timeoutPromise]);

          // Create attachment object matching the schema
          attachmentObjects.push({
            filename: file.originalname,
            url: result.secure_url,
            uploadedAt: new Date()
          });

          console.log(`File uploaded successfully: ${file.originalname}`);
        } catch (fileError) {
          console.error(`Failed to upload file ${file.originalname}:`, fileError.message);
          // Continue with other files instead of failing completely
        }
      }

      if (attachmentObjects.length === 0 && req.files.length > 0) {
        console.warn('All file uploads failed, creating ticket without attachments');
      }
    } catch (uploadError) {
      console.error('File upload error:', uploadError);
      // Don't fail the ticket creation, just log the error
      console.warn('Creating support ticket without attachments due to upload failure');
    }
  }

  // Create support ticket
  const ticket = await SupportTicket.create({
    subject,
    description,
    category: category || 'general',
    priority: priority || 'medium',
    user: userId,
    attachments: attachmentObjects,
    responses: [{
      message: description,
      author: name || req.user?.name || 'Guest User',
      isAdmin: false,
      createdAt: new Date()
    }]
  });

  // Populate user details
  await ticket.populate('user', 'name email phone');

  // Send confirmation email to user
  try {
    await sendTemplateEmail({
      to: email,
      subject: `Support Ticket Created - ${ticket.ticketNumber}`,
      template: 'support-ticket-created',
      context: {
        ticketNumber: ticket.ticketNumber,
        subject: subject,
        userName: name || req.user?.name || 'Valued Customer',
        category: category || 'general',
        priority: priority || 'medium'
      }
    });
  } catch (emailError) {
    console.error('Failed to send confirmation email:', emailError);
    // Don't fail the request if email fails
  }

  // Send notification to admin
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@buildhomemart.com';
    await sendTemplateEmail({
      to: adminEmail,
      subject: `New Support Ticket - ${ticket.ticketNumber}`,
      template: 'admin-new-ticket',
      context: {
        ticketNumber: ticket.ticketNumber,
        subject: subject,
        userName: name || req.user?.name || 'Guest User',
        userEmail: email,
        category: category || 'general',
        priority: priority || 'medium',
        description: description
      }
    });
  } catch (emailError) {
    console.error('Failed to send admin notification:', emailError);
  }

  // Send push notifications to all admins, subadmins, and custom roles with support permissions
  try {
    const adminIds = await notificationService.getAdminUserIds('support.view');

    if (adminIds.length > 0) {
      await notificationService.sendNewSupportTicketNotification(adminIds, {
        ticketId: ticket._id.toString(),
        ticketNumber: ticket.ticketNumber,
        subject: subject,
        category: category || 'general',
        priority: priority || 'medium',
        customerName: name || req.user?.profile?.firstName || 'Guest User',
        customerEmail: email
      });
    }
  } catch (notifError) {
    console.error('Failed to send support ticket push notifications:', notifError);
    // Don't fail the request if notifications fail
  }

  res.status(201).json({
    success: true,
    message: 'Support ticket created successfully',
    data: {
      ticket: {
        _id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        attachments: ticket.attachments,
        createdAt: ticket.createdAt
      }
    }
  });
}));

// @desc    Get user's support tickets
// @route   GET /api/support/tickets/my
// @access  Private
router.get('/tickets/my', authenticateToken, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const query = { user: req.user.id };

  if (status) {
    if (status === 'in-progress') query.status = 'in_progress';
    else query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [tickets, total] = await Promise.all([
    SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('assignedTo', 'name email profile')
      .populate('lockedBy', 'name email profile')
      .populate('resolvedBy', 'name email'),
    SupportTicket.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      tickets,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalTickets: total,
        hasNextPage: skip + tickets.length < total,
        hasPrevPage: parseInt(page) > 1
      }
    }
  });
}));

// @desc    Get a single support ticket by ticket number
// @route   GET /api/support/tickets/:ticketNumber
// @access  Private
router.get('/tickets/:ticketNumber', authenticateToken, asyncHandler(async (req, res) => {
  const { ticketNumber } = req.params;

  const ticket = await SupportTicket.findOne({ ticketNumber })
    .populate('user', 'name email phone')
    .populate('assignedTo', 'name email profile')
    .populate('lockedBy', 'name email profile')
    .populate('resolvedBy', 'name email');

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Support ticket not found'
    });
  }

  // Check if user owns this ticket or is admin
  const isAdmin = req.user.role === 'superadmin' || req.user.role === 'subadmin' || req.user.role === 'admin';
  if (ticket.user._id.toString() !== req.user.id.toString() && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.json({
    success: true,
    data: { ticket }
  });
}));

// @desc    Add a response to a support ticket
// @route   POST /api/support/tickets/:ticketNumber/responses
// @access  Private
router.post('/tickets/:ticketNumber/responses', authenticateToken, asyncHandler(async (req, res) => {
  const { ticketNumber } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Message is required'
    });
  }

  const ticket = await SupportTicket.findOne({ ticketNumber })
    .populate('user', 'name email');

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Support ticket not found'
    });
  }

  // Check if user owns this ticket or is admin
  const isAdmin = req.user.role === 'superadmin' || req.user.role === 'subadmin' || req.user.role === 'admin';
  const ticketUserId = ticket.user._id.toString();
  const currentUserId = req.user.id.toString();

  console.log(`[Support Response] Ticket User ID: ${ticketUserId}, Current User ID: ${currentUserId}, Is Admin: ${isAdmin}`);

  if (ticketUserId !== currentUserId && !isAdmin) {
    console.log(`[Support Response] Access denied - User ${currentUserId} trying to access ticket owned by ${ticketUserId}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Check if ticket is locked by another admin
  if (isAdmin && ticket.lockedBy && ticket.lockedBy.toString() !== currentUserId) {
    const lockedByUser = await User.findById(ticket.lockedBy).select('name email profile');
    const lockerName = lockedByUser?.profile?.firstName
      ? `${lockedByUser.profile.firstName} ${lockedByUser.profile.lastName || ''}`
      : lockedByUser?.email || 'another user';

    return res.status(423).json({
      success: false,
      message: `This ticket is currently being handled by ${lockerName}. Please choose a different ticket.`
    });
  }

  // Add response
  ticket.responses.push({
    message: message.trim(),
    author: req.user.name || req.user.email,
    authorId: req.user.id,
    isAdmin: isAdmin,
    createdAt: new Date()
  });

  // Lock and assign ticket to admin if admin is responding
  if (isAdmin) {
    if (!ticket.assignedTo) {
      ticket.assignedTo = req.user.id;
      ticket.assignedAt = new Date();
    }
    // Lock the ticket to this admin
    if (!ticket.lockedBy) {
      ticket.lockedBy = req.user.id;
      ticket.lockedAt = new Date();
    }
  }

  // Update status if it's the first user response after being assigned
  if (!isAdmin && ticket.status === 'open') {
    ticket.status = 'in_progress';
  }

  await ticket.save();

  // Send email notification
  try {
    const recipientEmail = isAdmin ? ticket.user.email : process.env.ADMIN_EMAIL || 'admin@buildhomemart.com';
    await sendTemplateEmail({
      to: recipientEmail,
      subject: `New Response on Ticket ${ticketNumber}`,
      template: 'ticket-response',
      context: {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        message: message.trim(),
        author: req.user.name || req.user.email,
        isAdmin: isAdmin
      }
    });
  } catch (emailError) {
    console.error('Failed to send email notification:', emailError);
  }

  // Send push notification to recipient
  try {
    const senderName = req.user.profile?.firstName
      ? `${req.user.profile.firstName} ${req.user.profile.lastName || ''}`.trim()
      : req.user.email;

    if (isAdmin) {
      // Admin is responding - notify the ticket owner
      const ticketOwnerId = ticket.user._id.toString();
      await notificationService.sendSupportTicketNotification(
        ticketOwnerId,
        {
          ticketId: ticket._id.toString(),
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          senderName: senderName,
          messagePreview: message.trim().substring(0, 100),
          status: ticket.status,
          priority: ticket.priority
        },
        true // isAdminResponse
      );
    } else {
      // Customer is responding - notify assigned admin or all admins
      const adminIds = [];
      if (ticket.assignedTo) {
        adminIds.push(ticket.assignedTo.toString());
      } else {
        // Notify all admins if no one is assigned
        const adminUsers = await User.find({
          role: { $in: ['admin', 'superadmin', 'subadmin'] },
          status: 'active'
        }).select('_id');
        adminIds.push(...adminUsers.map(u => u._id.toString()));
      }

      for (const adminId of adminIds) {
        await notificationService.sendSupportTicketNotification(
          adminId,
          {
            ticketId: ticket._id.toString(),
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            senderName: senderName,
            messagePreview: message.trim().substring(0, 100),
            status: ticket.status,
            priority: ticket.priority
          },
          false // isAdminResponse
        );
      }
    }
  } catch (notifError) {
    console.error('Failed to send support ticket response notification:', notifError);
    // Don't fail the request if notification fails
  }

  res.json({
    success: true,
    message: 'Response added successfully',
    data: { ticket }
  });
}));

// @desc    Track ticket by ticket number and email (for guests)
// @route   POST /api/support/tickets/track
// @access  Public
router.post('/tickets/track', asyncHandler(async (req, res) => {
  const { ticketNumber, email } = req.body;

  if (!ticketNumber || !email) {
    return res.status(400).json({
      success: false,
      message: 'Ticket number and email are required'
    });
  }

  const ticket = await SupportTicket.findOne({ ticketNumber })
    .populate('user', 'name email phone')
    .populate('assignedTo', 'name email profile')
    .populate('lockedBy', 'name email profile')
    .populate('resolvedBy', 'name email');

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Support ticket not found'
    });
  }

  // Verify email matches
  if (ticket.user.email.toLowerCase() !== email.toLowerCase()) {
    return res.status(403).json({
      success: false,
      message: 'Email does not match ticket records'
    });
  }

  res.json({
    success: true,
    data: { ticket }
  });
}));

// @desc    Get support ticket statistics
// @route   GET /api/support/stats
// @access  Private
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [total, open, inProgress, resolved, closed] = await Promise.all([
    SupportTicket.countDocuments({ user: userId }),
    SupportTicket.countDocuments({ user: userId, status: 'open' }),
    SupportTicket.countDocuments({ user: userId, status: 'in_progress' }),
    SupportTicket.countDocuments({ user: userId, status: 'resolved' }),
    SupportTicket.countDocuments({ user: userId, status: 'closed' })
  ]);

  res.json({
    success: true,
    data: {
      total,
      open,
      inProgress,
      resolved,
      closed
    }
  });
}));

// @desc    Transfer ticket to another user
// @route   POST /api/support/tickets/:ticketNumber/transfer
// @access  Private (User handling the ticket)
router.post('/tickets/:ticketNumber/transfer', authenticateToken, asyncHandler(async (req, res) => {
  const { ticketNumber } = req.params;
  const { targetUserId } = req.body;

  if (!targetUserId) {
    return res.status(400).json({
      success: false,
      message: 'Target user ID is required'
    });
  }

  const ticket = await SupportTicket.findOne({ ticketNumber })
    .populate('user', 'name email');

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Support ticket not found'
    });
  }

  // Check if current user is handling this ticket (either assigned to them or locked by them)
  const isHandlingTicket = (ticket.lockedBy && ticket.lockedBy.toString() === req.user.id.toString()) ||
    (ticket.assignedTo && ticket.assignedTo.toString() === req.user.id.toString());

  if (!isHandlingTicket) {
    return res.status(403).json({
      success: false,
      message: 'You can only transfer tickets you are currently handling. Please accept or lock the ticket first.'
    });
  }

  // Verify target user exists and has appropriate role/permissions
  const targetUser = await User.findById(targetUserId);

  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'Target user not found'
    });
  }

  if (targetUser.role === 'customer' || targetUser.role === 'superadmin' || targetUser.role === 'vendor' || targetUser.role === 'agent') {
    return res.status(400).json({
      success: false,
      message: 'Cannot transfer ticket to customer, vendor, agent, or superadmin'
    });
  }

  // Check if target user's role has supportTickets.reply permission
  // Admins and Subadmins have implicit permission
  if (targetUser.role !== 'admin' && targetUser.role !== 'subadmin') {
    const Role = require('../models/Role');
    const { PERMISSIONS } = require('../utils/permissions');
    const targetUserRole = await Role.findOne({ name: targetUser.role, isActive: true });

    if (!targetUserRole || !targetUserRole.permissions || !targetUserRole.permissions.includes(PERMISSIONS.SUPPORT_TICKETS_REPLY)) {
      return res.status(400).json({
        success: false,
        message: 'Target user does not have permission to handle support tickets. Please select a user with supportTickets.reply permission.'
      });
    }
  }

  // Transfer ticket
  ticket.assignedTo = targetUserId;
  ticket.assignedAt = new Date();
  ticket.lockedBy = targetUserId;
  ticket.lockedAt = new Date();

  // Add a system message to responses
  ticket.responses.push({
    message: `Ticket transferred from ${req.user.name || req.user.email} to ${targetUser.profile?.firstName ? `${targetUser.profile.firstName} ${targetUser.profile.lastName || ''}` : targetUser.email}`,
    author: 'System',
    authorId: null,
    isAdmin: true,
    createdAt: new Date()
  });

  await ticket.save();

  // Send notification email to target user
  try {
    await sendTemplateEmail({
      to: targetUser.email,
      subject: `New Support Ticket Assigned - ${ticketNumber}`,
      template: 'ticket-assigned',
      context: {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        assignedBy: req.user.name || req.user.email,
        userName: targetUser.profile?.firstName || targetUser.email
      }
    });
  } catch (emailError) {
    console.error('Failed to send assignment notification:', emailError);
  }

  res.json({
    success: true,
    message: 'Ticket transferred successfully',
    data: { ticket }
  });
}));

// @desc    Get available roles for ticket transfer
// @route   GET /api/support/transfer-roles
// @access  Private (Any authenticated user)
router.get('/transfer-roles', authenticateToken, asyncHandler(async (req, res) => {
  console.log('[Transfer Roles] User role:', req.user.role);

  const Role = require('../models/Role');

  console.log('[Transfer Roles] Fetching available roles...');

  const roles = await Role.find({
    isActive: true,
    name: { $nin: ['customer', 'vendor', 'superadmin', 'agent'] }
  })
    .select('name description level')
    .sort({ level: -1 });

  console.log('[Transfer Roles] Found roles:', roles.length, 'roles');
  console.log('[Transfer Roles] Roles:', roles.map(r => r.name));

  res.json({
    success: true,
    data: { roles }
  });
}));

// @desc    Get users by role for ticket transfer
// @route   GET /api/support/transfer-users
// @access  Private (Any authenticated user)
router.get('/transfer-users', authenticateToken, asyncHandler(async (req, res) => {
  console.log('[Transfer Users] User role:', req.user.role);

  const { role } = req.query;
  const Role = require('../models/Role');
  const { PERMISSIONS } = require('../utils/permissions');

  // Step 1: Query Role model to find roles with supportTickets.reply permission
  const rolesWithPermission = await Role.find({
    isActive: true,
    permissions: PERMISSIONS.SUPPORT_TICKETS_REPLY
  }).select('name');

  const roleNamesWithPermission = rolesWithPermission.map(r => r.name);

  // Explicitly add admin and subadmin as they have implicit permissions
  if (!roleNamesWithPermission.includes('admin')) roleNamesWithPermission.push('admin');
  if (!roleNamesWithPermission.includes('subadmin')) roleNamesWithPermission.push('subadmin');

  console.log('[Transfer Users] Roles with supportTickets.reply (including implicit):', roleNamesWithPermission);

  // Step 2: Build query to fetch users with these roles (excluding superadmin)
  let query = {
    status: 'active',
    role: {
      $in: roleNamesWithPermission,
      $nin: ['customer', 'vendor', 'superadmin', 'agent']
    }
  };

  // If specific role filter is provided
  if (role && role !== 'all') {
    query.role = role;
  }

  const users = await User.find(query)
    .select('email role profile')
    .sort({ email: 1 });

  console.log('[Transfer Users] Found', users.length, 'users');

  res.json({
    success: true,
    data: { users }
  });
}));

module.exports = router;
