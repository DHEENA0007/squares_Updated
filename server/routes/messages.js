const express = require('express');
const Message = require('../models/Message');
const Property = require('../models/Property');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// @desc    Get conversations for user
// @route   GET /api/messages/conversations
// @access  Private
router.get('/conversations', asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  
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

  res.json({
    success: true,
    data: {
      conversations: conversations.map(conv => ({
        id: conv._id, // This is the conversationId
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
      }))
    }
  });
}));

// @desc    Send message
// @route   POST /api/messages
// @access  Private
router.post('/', asyncHandler(async (req, res) => {
  const { conversationId, recipientId, content, attachments } = req.body;

  if (!conversationId || !recipientId || !content) {
    return res.status(400).json({
      success: false,
      message: 'Conversation ID, recipient ID, and message content are required'
    });
  }

  // Verify user is part of this conversation
  const userIds = conversationId.split('_');
  if (userIds.length !== 2 || !userIds.includes(req.user.id.toString())) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to send messages in this conversation'
    });
  }

  // Check if recipient exists
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    return res.status(404).json({
      success: false,
      message: 'Recipient not found'
    });
  }

  // Find an existing message to get property reference (if any)
  const existingMessage = await Message.findOne({ conversationId }).select('property');

  // Create message
  const messageData = {
    conversationId,
    sender: req.user.id,
    recipient: recipientId,
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
    { path: 'sender', select: 'profile.firstName profile.lastName email profile.phone' },
    { path: 'recipient', select: 'profile.firstName profile.lastName email profile.phone' },
    { path: 'property', select: 'title price address city state' }
  ]);

  // Check if recipient has auto-response enabled (for vendors)
  try {
    const recipient = await User.findById(recipientId);
    if (recipient && 
        recipient.role === 'vendor' && 
        recipient.profile?.vendorInfo?.vendorPreferences?.autoResponseEnabled &&
        recipient.profile?.vendorInfo?.vendorPreferences?.autoResponseMessage) {
      
      // Check if this is the first message in the conversation from this sender
      const existingMessages = await Message.countDocuments({
        conversationId,
        sender: req.user.id
      });

      // Only send auto-response for the first message from this sender
      if (existingMessages === 1) {
        const autoResponseData = {
          conversationId,
          sender: recipientId,
          recipient: req.user.id,
          message: recipient.profile.vendorInfo.vendorPreferences.autoResponseMessage,
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

  // Check if recipient has auto-response enabled (for vendors)
  let autoResponseMessage = null;
  try {
    const recipient = await User.findById(recipientId);
    if (recipient && 
        recipient.role === 'vendor' && 
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

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: { 
      message: newMessage,
      conversationId 
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
  
  // Check if user is authorized to delete this message (only sender can delete)
  if (message.sender.toString() !== req.user.id) {
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

module.exports = router;