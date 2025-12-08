const express = require('express');
const router = express.Router();
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');
const { sendTemplateEmail } = require('../utils/emailService');

// @desc    Create a new support ticket (public endpoint)
// @route   POST /api/support/tickets
// @access  Public (with optional auth)
router.post('/tickets', optionalAuth, asyncHandler(async (req, res) => {
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

  // Create support ticket
  const ticket = await SupportTicket.create({
    subject,
    description,
    category: category || 'general',
    priority: priority || 'medium',
    user: userId,
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
      .populate('assignedTo', 'name email')
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
    .populate('assignedTo', 'name email')
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

  // Add response
  ticket.responses.push({
    message: message.trim(),
    author: req.user.name || req.user.email,
    isAdmin: isAdmin,
    createdAt: new Date()
  });

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
    .populate('assignedTo', 'name email')
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

module.exports = router;
