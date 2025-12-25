const express = require('express');
const Message = require('../models/Message');
const Property = require('../models/Property');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const { PERMISSIONS, hasPermission } = require('../utils/permissions');
const vendorNotificationService = require('../services/vendorNotificationService');
const notificationService = require('../services/notificationService');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// @desc    Get all messages (admin view)
// @route   GET /api/messages/admin/all
// @access  Private (Requires messages.view permission)
router.get('/admin/all', asyncHandler(async (req, res) => {
  // Check permission for viewing all messages
  if (!hasPermission(req.user, PERMISSIONS.MESSAGES_VIEW)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view all messages'
    });
  }

  const { page = 1, limit = 50, search, conversationId } = req.query;
  const skip = (page - 1) * limit;

  // Build query
  const query = {};
  if (conversationId) {
    query.conversationId = conversationId;
  }
  if (search) {
    query.message = { $regex: search, $options: 'i' };
  }

  const totalMessages = await Message.countDocuments(query);
  const messages = await Message.find(query)
    .populate('sender', 'profile.firstName profile.lastName email role')
    .populate('recipient', 'profile.firstName profile.lastName email role')
    .populate('property', 'title location')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: {
      messages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages
      }
    }
  });
}));

// @desc    Get conversations for user
// @route   GET /api/messages/conversations
// @access  Private
router.get('/conversations', asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');

  // Get query parameters
  const { status, search, limit = 50, page = 1 } = req.query;

  // Get all unique conversation IDs for this user
  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [
          { sender: new mongoose.Types.ObjectId(req.user.id) },
          { recipient: new mongoose.Types.ObjectId(req.user.id) }
        ]
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$$ROOT' },
        status: { $first: '$status' },
        unreadCount: {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $eq: ['$recipient', new mongoose.Types.ObjectId(req.user.id)] },
                  { $eq: ['$read', false] }
                ]
              },
              then: 1,
              else: 0
            }
          }
        },
        // Get the other user ID (whoever is not the current user)
        otherUserId: {
          $first: {
            $cond: {
              if: { $eq: ['$sender', new mongoose.Types.ObjectId(req.user.id)] },
              then: '$recipient',
              else: '$sender'
            }
          }
        },
        propertyId: { $first: '$property' }
      }
    },
    {
      $lookup: {
        from: 'properties',
        localField: 'propertyId',
        foreignField: '_id',
        as: 'property'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'otherUserId',
        foreignField: '_id',
        as: 'otherUser'
      }
    },
    {
      $project: {
        _id: 1,
        property: { $arrayElemAt: ['$property', 0] },
        otherUser: { $arrayElemAt: ['$otherUser', 0] },
        lastMessage: 1,
        unreadCount: 1
      }
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    }
  ]);

  // Update status based on archivedBy (per-user archiving)
  conversations.forEach(conv => {
    if (conv.lastMessage.archivedBy &&
      conv.lastMessage.archivedBy.map(id => id.toString()).includes(req.user.id.toString())) {
      conv.status = 'archived';
    }
  });

  // Apply filters after aggregation
  let filteredConversations = conversations;

  // Filter by status (read/unread/archived)
  if (status === 'unread') {
    filteredConversations = filteredConversations.filter(conv => conv.unreadCount > 0 && conv.status !== 'archived');
  } else if (status === 'read') {
    filteredConversations = filteredConversations.filter(conv => conv.unreadCount === 0 && conv.status !== 'archived');
  } else if (status === 'archived') {
    filteredConversations = filteredConversations.filter(conv => conv.status === 'archived');
  } else if (!status || status === 'all') {
    // When showing "all", exclude archived conversations by default
    filteredConversations = filteredConversations.filter(conv => conv.status !== 'archived');
  }

  // Filter by search query
  if (search) {
    const searchLower = search.toLowerCase();
    filteredConversations = filteredConversations.filter(conv => {
      const otherUserName = `${conv.otherUser?.profile?.firstName || ''} ${conv.otherUser?.profile?.lastName || ''}`.trim().toLowerCase();
      const propertyTitle = conv.property?.title?.toLowerCase() || '';
      const lastMessage = conv.lastMessage?.message?.toLowerCase() || '';

      return otherUserName.includes(searchLower) ||
        propertyTitle.includes(searchLower) ||
        lastMessage.includes(searchLower);
    });
  }

  // Apply pagination
  const total = filteredConversations.length;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const paginatedConversations = filteredConversations.slice(skip, skip + parseInt(limit));

  res.json({
    success: true,
    data: {
      conversations: paginatedConversations.map(conv => ({
        id: conv._id, // This is the conversationId
        status: conv.status || 'unread',
        property: conv.property ? {
          _id: conv.property._id,
          title: conv.property.title,
          price: conv.property.price,
          address: conv.property.address,
          city: conv.property.city,
          state: conv.property.state,
          images: conv.property.images
        } : null,
        otherUser: conv.otherUser ? {
          _id: conv.otherUser._id,
          name: `${conv.otherUser.profile?.firstName || ''} ${conv.otherUser.profile?.lastName || ''}`.trim() || 'Unknown User',
          email: conv.otherUser.email,
          phone: conv.otherUser.profile?.phone
        } : null,
        lastMessage: {
          _id: conv.lastMessage._id,
          message: conv.lastMessage.message,
          createdAt: conv.lastMessage.createdAt,
          isFromMe: conv.lastMessage.sender.toString() === req.user.id.toString()
        },
        unreadCount: conv.unreadCount
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalConversations: total,
        hasNextPage: skip + parseInt(limit) < total,
        hasPrevPage: parseInt(page) > 1
      }
    }
  });
}));

// @desc    Send message
// @route   POST /api/messages
// @access  Private
router.post('/', asyncHandler(async (req, res) => {
  let { conversationId } = req.body;
  const { recipientId, content, attachments } = req.body;

  if (!conversationId || !recipientId || !content) {
    return res.status(400).json({
      success: false,
      message: 'Conversation ID, recipient ID, and message content are required'
    });
  }

  // Verify user is part of this conversation
  // All authenticated users can send messages in conversations they're part of
  const userIds = conversationId.split('_');
  if (userIds.length !== 2 || !userIds.includes(req.user.id.toString())) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to send messages in this conversation'
    });
  }

  // Check if user has permission to reply to messages
  // Allow standard roles: superadmin, admin, subadmin, agent, vendor, customer
  const allowedRoles = ['superadmin', 'admin', 'subadmin', 'agent', 'vendor', 'customer'];
  const isAllowedRole = allowedRoles.includes(req.user.role);

  if (!isAllowedRole) {
    // For custom roles, check MESSAGES_REPLY permission
    if (!hasPermission(req.user, PERMISSIONS.MESSAGES_REPLY)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to reply to messages'
      });
    }
  }

  // Check if recipient exists
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    return res.status(404).json({
      success: false,
      message: 'Recipient not found'
    });
  }

  // Check if recipient can receive messages
  // Standard roles can always receive messages
  let finalRecipientId = recipientId;
  const allowedRecipientRoles = ['superadmin', 'admin', 'subadmin', 'agent', 'vendor', 'customer'];
  const isStandardRole = allowedRecipientRoles.includes(recipient.role);

  const canReceiveMessages = isStandardRole ||
    (hasPermission(recipient, PERMISSIONS.MESSAGES_VIEW) &&
      hasPermission(recipient, PERMISSIONS.MESSAGES_REPLY));

  if (!canReceiveMessages) {
    console.log(`Recipient ${recipientId} doesn't have message permissions, routing to superadmin`);

    // Find superadmin
    const superadmin = await User.findOne({ role: 'superadmin' }).sort({ createdAt: 1 });

    if (superadmin) {
      finalRecipientId = superadmin._id.toString();

      // Update conversation ID to include superadmin instead
      const newUserIds = [req.user.id.toString(), finalRecipientId].sort();
      conversationId = newUserIds.join('_');
    }
  }

  // Find an existing message to get property reference (if any)
  const existingMessage = await Message.findOne({ conversationId }).select('property');

  // Create message
  const messageData = {
    conversationId,
    sender: req.user.id,
    recipient: finalRecipientId,
    message: content.trim(),
    read: false
  };

  // Add property reference if found in conversation
  if (existingMessage?.property) {
    messageData.property = existingMessage.property;
  }

  // Add attachments if provided
  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    messageData.attachments = attachments;
  }

  const newMessage = await Message.create(messageData);

  await newMessage.populate([
    { path: 'sender', select: 'profile.firstName profile.lastName email profile.phone role' },
    { path: 'recipient', select: 'profile.firstName profile.lastName email profile.phone role' },
    { path: 'property', select: 'title price address city state' }
  ]);

  // Send email notification to recipient if they are a vendor with email notifications enabled
  if (newMessage.recipient.role === 'agent' || newMessage.recipient.role === 'vendor') {
    try {
      const vendor = await Vendor.findOne({ user: newMessage.recipient._id });
      if (vendor) {
        const senderName = `${newMessage.sender.profile?.firstName || ''} ${newMessage.sender.profile?.lastName || ''}`.trim() || 'A customer';

        vendorNotificationService.sendNewMessageEmail(vendor._id, {
          senderName: senderName,
          content: newMessage.message
        }).catch(err => console.error('Failed to send email notification:', err));
      }
    } catch (emailError) {
      console.error('Error checking vendor for email notification:', emailError);
    }
  }

  // Send real-time notification to recipient
  try {
    const senderName = `${newMessage.sender.profile?.firstName || ''} ${newMessage.sender.profile?.lastName || ''}`.trim() || 'Someone';

    notificationService.sendMessageNotification(finalRecipientId, {
      conversationId: conversationId,
      senderId: req.user.id,
      senderName: senderName,
      message: content.trim()
    });
  } catch (notificationError) {
    console.error('Error sending real-time notification:', notificationError);
  }

  // Check if recipient has auto-response enabled (for vendors)
  try {
    const finalRecipient = await User.findById(finalRecipientId);
    if (finalRecipient &&
      finalRecipient.role === 'agent' &&
      finalRecipient.profile?.vendorInfo?.vendorPreferences?.autoResponseEnabled &&
      finalRecipient.profile?.vendorInfo?.vendorPreferences?.autoResponseMessage) {

      // Check if this is the first message in the conversation from this sender
      const existingMessages = await Message.countDocuments({
        conversationId,
        sender: req.user.id
      });

      // Only send auto-response for the first message from this sender
      if (existingMessages === 1) {
        const autoResponseData = {
          conversationId,
          sender: finalRecipientId,
          recipient: req.user.id,
          message: finalRecipient.profile.vendorInfo.vendorPreferences.autoResponseMessage,
          read: false
        };

        // Add property reference if exists
        if (existingMessage?.property) {
          autoResponseData.property = existingMessage.property;
        }

        // Send auto-response after a short delay
        setTimeout(async () => {
          try {
            const autoResponse = await Message.create(autoResponseData);
            console.log('Auto-response sent:', autoResponse._id);
          } catch (error) {
            console.error('Failed to send auto-response:', error);
          }
        }, 3000); // 3 second delay
      }
    }
  } catch (error) {
    console.error('Error checking auto-response settings:', error);
    // Don't fail the original message if auto-response fails
  }

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: {
      message: {
        _id: newMessage._id,
        message: newMessage.message,
        createdAt: newMessage.createdAt,
        read: newMessage.read,
        sender: newMessage.sender,
        recipient: newMessage.recipient,
        property: newMessage.property,
        attachments: newMessage.attachments || [],
        isFromMe: true
      }
    }
  });
}));

// @desc    Mark conversation messages as read
// @route   PATCH /api/messages/conversation/:conversationId/read
// @access  Private
router.patch('/conversation/:conversationId/read', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Verify user is part of this conversation
  const userIds = conversationId.split('_');
  if (userIds.length !== 2 || !userIds.includes(req.user.id.toString())) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this conversation'
    });
  }

  // Mark all messages in conversation as read
  const result = await Message.updateMany({
    conversationId,
    recipient: req.user.id,
    read: false
  }, {
    read: true,
    readAt: new Date()
  });

  res.json({
    success: true,
    message: 'Messages marked as read',
    data: {
      modifiedCount: result.modifiedCount
    }
  });
}));

// @desc    Send property inquiry (create conversation and send message to property owner)
// @route   POST /api/messages/property-inquiry
// @access  Private
router.post('/property-inquiry', asyncHandler(async (req, res) => {
  const { propertyId, subject, content, attachments } = req.body;

  if (!propertyId || !content) {
    return res.status(400).json({
      success: false,
      message: 'Property ID and message content are required'
    });
  }

  // Get property with owner and vendor information
  const property = await Property.findById(propertyId)
    .populate('owner', 'profile.firstName profile.lastName profile.phone email role')
    .populate({
      path: 'vendor',
      populate: {
        path: 'user',
        select: 'profile.firstName profile.lastName profile.phone email role'
      }
    });

  if (!property) {
    return res.status(404).json({
      success: false,
      message: 'Property not found'
    });
  }

  // Determine recipient based on who posted the property:
  // 1. If property was posted by admin or superadmin → send to admin (who posted it)
  // 2. If property has vendor and was not posted by admin → send to vendor
  // 3. Otherwise → send to property owner
  let recipientId;
  const wasPostedByAdmin = property.owner?.role === 'admin' || property.owner?.role === 'superadmin';

  if (wasPostedByAdmin) {
    // Properties posted by admin route to the admin who posted them
    recipientId = property.owner._id;
  } else if (property.vendor?.user?._id) {
    // Properties posted by vendors route to vendor
    recipientId = property.vendor.user._id;
  } else {
    // Fallback to property owner (for direct property owners)
    recipientId = property.owner._id;
  }

  if (!recipientId) {
    return res.status(400).json({
      success: false,
      message: 'Unable to determine property owner'
    });
  }

  // Check if the recipient has permission to receive messages
  const recipient = await User.findById(recipientId);

  if (!recipient) {
    return res.status(404).json({
      success: false,
      message: 'Property owner not found'
    });
  }

  // Standard roles can always receive messages
  const allowedRecipientRoles = ['superadmin', 'admin', 'subadmin', 'agent', 'vendor', 'customer'];
  const isStandardRole = allowedRecipientRoles.includes(recipient.role);

  // Check if recipient has message view and reply permissions
  const canReceiveMessages = isStandardRole ||
    (hasPermission(recipient, PERMISSIONS.MESSAGES_VIEW) &&
      hasPermission(recipient, PERMISSIONS.MESSAGES_REPLY));

  // If recipient doesn't have message permissions, route to superadmin
  if (!canReceiveMessages) {
    console.log(`User ${recipientId} (${recipient.role}) doesn't have message permissions, routing to superadmin`);

    // Find superadmin
    const superadmin = await User.findOne({ role: 'superadmin' }).sort({ createdAt: 1 });

    if (!superadmin) {
      return res.status(500).json({
        success: false,
        message: 'Unable to route message: No superadmin found'
      });
    }

    recipientId = superadmin._id;
    console.log(`Message routed to superadmin: ${superadmin._id}`);
  }

  // Don't allow users to message themselves
  if (recipientId.toString() === req.user.id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot send a message to yourself'
    });
  }

  // Create conversation ID (sorted user IDs for consistency)
  const conversationId = [req.user.id.toString(), recipientId.toString()]
    .sort()
    .join('_');

  // Create message
  const messageData = {
    conversationId,
    sender: req.user.id,
    recipient: recipientId,
    message: `${subject ? subject.trim() + '\n\n' : ''}${content.trim()}`,
    property: propertyId,
    read: false,
    // Also set admin-compatible fields for admin interface
    subject: subject || 'Property Inquiry',
    content: content.trim(),
    type: 'property_inquiry',
    status: 'unread',
    priority: 'medium'
  };

  // Add attachments if provided
  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    messageData.attachments = attachments;
  }

  const newMessage = await Message.create(messageData);

  await newMessage.populate([
    { path: 'sender', select: 'profile.firstName profile.lastName email profile.phone' },
    { path: 'recipient', select: 'profile.firstName profile.lastName email profile.phone' },
    { path: 'property', select: 'title price address city state' }
  ]);

  // Emit real-time notification to vendor about new inquiry
  const socketService = require('../services/socketService');
  if (socketService.isUserOnline(recipientId)) {
    socketService.sendToUser(recipientId, 'vendor:new_inquiry', {
      inquiryId: newMessage._id,
      customerName: `${newMessage.sender.profile?.firstName || ''} ${newMessage.sender.profile?.lastName || ''}`.trim(),
      customerEmail: newMessage.sender.email,
      propertyTitle: newMessage.property?.title,
      message: content.trim(),
      timestamp: new Date()
    });
  }

  // Check if recipient has auto-response enabled (for vendors)
  let autoResponseMessage = null;
  try {
    const recipient = await User.findById(recipientId);
    if (recipient &&
      recipient.role === 'agent' &&
      recipient.profile?.vendorInfo?.vendorPreferences?.autoResponseEnabled &&
      recipient.profile?.vendorInfo?.vendorPreferences?.autoResponseMessage) {

      // Create auto-response message
      const autoResponseData = {
        conversationId,
        sender: recipientId,
        recipient: req.user.id,
        message: recipient.profile.vendorInfo.vendorPreferences.autoResponseMessage,
        property: propertyId,
        read: false,
        subject: 'Auto-Response',
        content: recipient.profile.vendorInfo.vendorPreferences.autoResponseMessage,
        type: 'auto_response',
        status: 'unread',
        priority: 'low'
      };

      // Send auto-response after a short delay to make it feel natural
      setTimeout(async () => {
        try {
          const autoResponse = await Message.create(autoResponseData);
          console.log('Auto-response sent:', autoResponse._id);
        } catch (error) {
          console.error('Failed to send auto-response:', error);
        }
      }, 2000); // 2 second delay
    }
  } catch (error) {
    console.error('Error checking auto-response settings:', error);
    // Don't fail the original message if auto-response fails
  }

  // Send real-time notification to recipient
  try {
    const senderName = `${newMessage.sender.profile?.firstName || ''} ${newMessage.sender.profile?.lastName || ''}`.trim() || 'Someone';

    notificationService.sendMessageNotification(recipientId.toString(), {
      conversationId: conversationId,
      senderId: req.user.id,
      senderName: senderName,
      message: content.trim()
    });

    // Send vendor-specific inquiry notification if recipient is a vendor
    const recipientUser = await User.findById(recipientId);
    if (recipientUser && (recipientUser.role === 'agent' || recipientUser.role === 'vendor')) {
      const vendor = await Vendor.findOne({ user: recipientId });
      if (vendor) {
        notificationService.sendVendorNotification(recipientId.toString(), {
          inquiryId: newMessage._id,
          propertyId: propertyId,
          propertyTitle: property.title,
          customerName: senderName,
          customerEmail: newMessage.sender.email,
          customerPhone: newMessage.sender.profile?.phone,
          message: content.trim()
        }, 'inquiry_received');
      }
    }
  } catch (notificationError) {
    console.error('Error sending real-time notification:', notificationError);
  }

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: {
      message: newMessage,
      conversationId
    }
  });
}
  });
}));

// @desc    Update conversation status (archive/unarchive)
// @route   PATCH /api/messages/conversations/:conversationId/status
// @access  Private
router.patch('/conversations/:conversationId/status', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { status } = req.body; // 'archived', 'read', 'unread'

  if (!['archived', 'read', 'unread'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status'
    });
  }

  // Verify user is part of this conversation
  const userIds = conversationId.split('_');
  if (userIds.length !== 2 || !userIds.includes(req.user.id.toString())) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this conversation'
    });
  }

  // Find the latest message in the conversation
  const latestMessage = await Message.findOne({ conversationId })
    .sort({ createdAt: -1 });

  if (!latestMessage) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found'
    });
  }

  // Update archivedBy field based on status
  if (status === 'archived') {
    // Add user to archivedBy
    if (!latestMessage.archivedBy) latestMessage.archivedBy = [];
    const exists = latestMessage.archivedBy.some(id => id.toString() === req.user.id.toString());
    if (!exists) {
      latestMessage.archivedBy.push(req.user.id);
    }
  } else {
    // Remove user from archivedBy (unarchive)
    if (latestMessage.archivedBy) {
      latestMessage.archivedBy = latestMessage.archivedBy.filter(
        id => id.toString() !== req.user.id.toString()
      );
    }
  }

  await latestMessage.save();

  res.json({
    success: true,
    message: `Conversation marked as ${status}`,
    data: {
      conversationId,
      status
    }
  });
}));

// @desc    Get conversation by ID (for navigating to a specific conversation)
// @route   GET /api/messages/conversation/:conversationId
// @access  Private
router.get('/conversation/:conversationId', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 50, markAsRead = 'true' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Extract user IDs from conversation ID
  const userIds = conversationId.split('_');

  if (userIds.length !== 2 || !userIds.includes(req.user.id.toString())) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this conversation'
    });
  }

  const otherUserId = userIds.find(id => id !== req.user.id.toString());

  // Get total count for pagination
  const totalCount = await Message.countDocuments({
    conversationId
  });

  // Get messages
  const messages = await Message.find({ conversationId })
    .populate('sender', 'profile.firstName profile.lastName email profile.phone')
    .populate('recipient', 'profile.firstName profile.lastName email profile.phone')
    .populate('property', 'title price address city state images')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Auto-mark messages as read when conversation is opened (unless explicitly disabled)
  if (markAsRead === 'true') {
    const updateResult = await Message.updateMany({
      conversationId,
      recipient: req.user.id,
      read: false
    }, {
      read: true,
      readAt: new Date()
    });

    // If messages were marked as read, you could emit a real-time event here
    if (updateResult.modifiedCount > 0) {
      // TODO: Emit real-time event for message read status updates
      console.log(`Marked ${updateResult.modifiedCount} messages as read in conversation ${conversationId}`);
    }
  }

  const totalPages = Math.ceil(totalCount / parseInt(limit));

  res.json({
    success: true,
    data: {
      conversationId,
      messages: messages.reverse().map(msg => ({
        _id: msg._id,
        message: msg.message,
        createdAt: msg.createdAt,
        read: msg.read,
        readAt: msg.readAt,
        sender: msg.sender,
        recipient: msg.recipient,
        property: msg.property,
        attachments: msg.attachments || [],
        isFromMe: msg.sender._id.toString() === req.user.id.toString()
      })),
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

// @desc    Mark specific message as read (for real-time read status)
// @route   PATCH /api/messages/:messageId/read
// @access  Private
router.patch('/:messageId/read', asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  // Find the message and verify user is the recipient
  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  if (message.recipient.toString() !== req.user.id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to mark this message as read'
    });
  }

  // Update message if not already read
  if (!message.read) {
    message.read = true;
    message.readAt = new Date();
    await message.save();

    // TODO: Emit real-time event for message read status update
    console.log(`Message ${messageId} marked as read by user ${req.user.id}`);
  }

  res.json({
    success: true,
    message: 'Message marked as read',
    data: {
      messageId: message._id,
      read: message.read,
      readAt: message.readAt
    }
  });
}));

// @desc    Update user active status in conversation
// @route   POST /api/messages/active-status
// @access  Private
router.post('/active-status', asyncHandler(async (req, res) => {
  const { conversationId, status } = req.body; // status: 'typing', 'online', 'offline'

  if (!conversationId || !status) {
    return res.status(400).json({
      success: false,
      message: 'Conversation ID and status are required'
    });
  }

  // Verify user is part of this conversation
  const userIds = conversationId.split('_');
  if (userIds.length !== 2 || !userIds.includes(req.user.id.toString())) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update status for this conversation'
    });
  }

  // Store active status in memory (in production, use Redis)
  if (!global.activeStatuses) {
    global.activeStatuses = new Map();
  }

  const statusKey = `${conversationId}:${req.user.id}`;
  global.activeStatuses.set(statusKey, {
    status,
    timestamp: new Date(),
    userId: req.user.id
  });

  // Clean up old statuses (older than 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  for (const [key, statusData] of global.activeStatuses.entries()) {
    if (statusData.timestamp < fiveMinutesAgo) {
      global.activeStatuses.delete(key);
    }
  }

  console.log(`User ${req.user.id} status in conversation ${conversationId}: ${status}`);

  res.json({
    success: true,
    message: 'Status updated successfully',
    data: {
      userId: req.user.id,
      conversationId,
      status,
      timestamp: new Date()
    }
  });
}));

// @desc    Get active status for conversation participants
// @route   GET /api/messages/active-status/:conversationId
// @access  Private
router.get('/active-status/:conversationId', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Verify user is part of this conversation
  const userIds = conversationId.split('_');
  if (userIds.length !== 2 || !userIds.includes(req.user.id.toString())) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this conversation'
    });
  }

  // Get active statuses for this conversation
  const statuses = {};
  if (global.activeStatuses) {
    for (const userId of userIds) {
      const statusKey = `${conversationId}:${userId}`;
      const statusData = global.activeStatuses.get(statusKey);
      if (statusData) {
        // Only include recent statuses (within last 2 minutes)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        if (statusData.timestamp > twoMinutesAgo) {
          statuses[userId] = {
            status: statusData.status,
            lastSeen: statusData.timestamp
          };
        }
      }
    }
  }

  res.json({
    success: true,
    data: { statuses }
  });
}));

// @desc    Update typing status for conversation
// @route   POST /api/messages/typing-status
// @access  Private
router.post('/typing-status', asyncHandler(async (req, res) => {
  const { conversationId, isTyping } = req.body;

  if (!conversationId) {
    return res.status(400).json({
      success: false,
      message: 'Conversation ID is required'
    });
  }

  // Verify user is part of this conversation
  const userIds = conversationId.split('_');
  if (userIds.length !== 2 || !userIds.includes(req.user.id.toString())) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update typing status for this conversation'
    });
  }

  // Store typing status in memory (in production, use Redis)
  if (!global.typingStatuses) {
    global.typingStatuses = new Map();
  }

  const statusKey = `${conversationId}:${req.user.id}`;

  if (isTyping) {
    global.typingStatuses.set(statusKey, {
      userId: req.user.id,
      conversationId,
      timestamp: new Date()
    });
  } else {
    global.typingStatuses.delete(statusKey);
  }

  // Clean up old typing statuses (older than 10 seconds)
  const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
  for (const [key, statusData] of global.typingStatuses.entries()) {
    if (statusData.timestamp < tenSecondsAgo) {
      global.typingStatuses.delete(key);
    }
  }

  res.json({
    success: true,
    message: 'Typing status updated',
    data: {
      userId: req.user.id,
      conversationId,
      isTyping
    }
  });
}));

// @desc    Get typing status for conversation
// @route   GET /api/messages/typing-status/:conversationId
// @access  Private
router.get('/typing-status/:conversationId', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Verify user is part of this conversation
  const userIds = conversationId.split('_');
  if (userIds.length !== 2 || !userIds.includes(req.user.id.toString())) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this conversation'
    });
  }

  const otherUserId = userIds.find(id => id !== req.user.id.toString());
  const statusKey = `${conversationId}:${otherUserId}`;

  let isTyping = false;
  if (global.typingStatuses && global.typingStatuses.has(statusKey)) {
    const statusData = global.typingStatuses.get(statusKey);
    // Only show typing if within last 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5 * 1000);
    if (statusData.timestamp > fiveSecondsAgo) {
      isTyping = true;
    } else {
      global.typingStatuses.delete(statusKey);
    }
  }

  res.json({
    success: true,
    data: {
      isTyping,
      userId: otherUserId
    }
  });
}));

// @desc    Update user online status
// @route   POST /api/messages/online-status
// @access  Private
router.post('/online-status', asyncHandler(async (req, res) => {
  const { status } = req.body; // 'online' or 'offline'

  if (!status || !['online', 'offline'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Valid status required (online or offline)'
    });
  }

  const User = require('../models/User');

  const now = new Date();
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      isOnline: status === 'online',
      lastSeen: now
    },
    { new: true }
  ).select('isOnline lastSeen');

  res.json({
    success: true,
    message: 'Online status updated',
    data: {
      userId: req.user.id,
      isOnline: status === 'online',
      lastSeen: now.toISOString()
    }
  });
}));

// @desc    Get user online status
// @route   GET /api/messages/online-status/:userId
// @access  Private
router.get('/online-status/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const User = require('../models/User');

  const user = await User.findById(userId).select('isOnline lastSeen');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Consider user online if lastSeen within 2 minutes
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const actualLastSeen = user.lastSeen || user.createdAt || new Date();
  const isOnline = user.isOnline && actualLastSeen > twoMinutesAgo;

  res.json({
    success: true,
    data: {
      userId: user._id,
      isOnline,
      lastSeen: actualLastSeen.toISOString()
    }
  });
}));

// @desc    Get notification preferences
// @route   GET /api/messages/notification-preferences
// @access  Private
router.get('/notification-preferences', asyncHandler(async (req, res) => {
  const User = require('../models/User');

  const user = await User.findById(req.user.id).select('profile.preferences.notifications');

  res.json({
    success: true,
    data: {
      notifications: user?.profile?.preferences?.notifications || {
        email: true,
        sms: false,
        push: true,
        desktop: true,
        sound: true,
        typing: true
      }
    }
  });
}));

// @desc    Update notification preferences
// @route   PUT /api/messages/notification-preferences
// @access  Private
router.put('/notification-preferences', asyncHandler(async (req, res) => {
  const { email, sms, push, desktop, sound, typing } = req.body;
  const User = require('../models/User');

  const updateData = {};
  if (typeof email === 'boolean') updateData['profile.preferences.notifications.email'] = email;
  if (typeof sms === 'boolean') updateData['profile.preferences.notifications.sms'] = sms;
  if (typeof push === 'boolean') updateData['profile.preferences.notifications.push'] = push;
  if (typeof desktop === 'boolean') updateData['profile.preferences.notifications.desktop'] = desktop;
  if (typeof sound === 'boolean') updateData['profile.preferences.notifications.sound'] = sound;
  if (typeof typing === 'boolean') updateData['profile.preferences.notifications.typing'] = typing;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updateData },
    { new: true }
  ).select('profile.preferences.notifications');

  res.json({
    success: true,
    message: 'Notification preferences updated',
    data: {
      notifications: user.profile.preferences.notifications
    }
  });
}));

// @desc    Get unread message count
// @route   GET /api/messages/unread-count
// @access  Private
router.get('/unread-count', asyncHandler(async (req, res) => {
  const unreadCount = await Message.countDocuments({
    recipient: req.user.id,
    read: false
  });

  res.json({
    success: true,
    data: {
      unreadCount
    }
  });
}));

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
router.delete('/:messageId', asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  // Find the message
  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  // Check if user is authorized to delete this message (sender/recipient or has permission)
  const userId = req.user.id.toString();
  const isSender = message.sender.toString() === userId;
  const isRecipient = message.recipient.toString() === userId;
  const hasDeletePermission = hasPermission(req.user, PERMISSIONS.MESSAGES_DELETE);

  if (!isSender && !isRecipient && !hasDeletePermission) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this message'
    });
  }

  // Delete the message
  await Message.findByIdAndDelete(messageId);

  res.json({
    success: true,
    message: 'Message deleted successfully'
  });
}));

// @desc    Delete a conversation
// @route   DELETE /api/messages/conversations/:conversationId
// @access  Private
router.delete('/conversations/:conversationId', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Find all messages in this conversation where user is sender or recipient
  const messages = await Message.find({
    conversationId,
    $or: [
      { sender: req.user.id },
      { recipient: req.user.id }
    ]
  });

  if (messages.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found or you are not part of this conversation'
    });
  }

  // Delete all messages in the conversation where user is involved
  await Message.deleteMany({
    conversationId,
    $or: [
      { sender: req.user.id },
      { recipient: req.user.id }
    ]
  });

  // Clean up active status for this conversation
  if (global.activeStatuses) {
    Object.keys(global.activeStatuses).forEach(key => {
      if (key.includes(conversationId)) {
        delete global.activeStatuses[key];
      }
    });
  }

  res.json({
    success: true,
    message: 'Conversation deleted successfully'
  });
}));

// @desc    Update conversation status (archive/unarchive)
// @route   PATCH /api/messages/conversations/:conversationId/status
// @access  Private
router.patch('/conversations/:conversationId/status', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { status } = req.body;

  // Validate status
  const validStatuses = ['unread', 'read', 'replied', 'archived', 'flagged'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  // Update all messages in this conversation where user is sender or recipient
  const result = await Message.updateMany(
    {
      conversationId,
      $or: [
        { sender: req.user.id },
        { recipient: req.user.id }
      ]
    },
    { status }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found or you are not part of this conversation'
    });
  }

  res.json({
    success: true,
    message: `Conversation ${status === 'archived' ? 'archived' : 'unarchived'} successfully`,
    data: {
      conversationId,
      status,
      updatedCount: result.modifiedCount
    }
  });
}));

// @desc    Get user status (alias for online-status for backward compatibility)
// @route   GET /api/messages/user-status/:userId
// @access  Private
router.get('/user-status/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const User = require('../models/User');

  const user = await User.findById(userId).select('isOnline lastSeen');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Consider user online if lastSeen within 2 minutes
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const isOnline = user.isOnline && user.lastSeen && user.lastSeen > twoMinutesAgo;

  res.json({
    success: true,
    data: {
      userId: user._id,
      isOnline,
      lastSeen: user.lastSeen || new Date()
    }
  });
}));

module.exports = router;