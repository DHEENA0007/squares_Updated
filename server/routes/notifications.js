const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { PERMISSIONS, hasPermission } = require('../utils/permissions');
const notificationService = require('../services/notificationService');

const router = express.Router();

// @desc    Send test notification (for development)
// @route   POST /api/notifications/test
// @access  Private
router.post('/test', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { type = 'test', message = 'This is a test notification' } = req.body;
  
  notificationService.sendNotification(userId, {
    type,
    title: 'Test Notification',
    message,
    data: {
      action: 'test',
      timestamp: new Date().toISOString()
    }
  });
  
  res.json({
    success: true,
    message: 'Test notification sent'
  });
});

// @desc    Get notification service statistics
// @route   GET /api/notifications/stats
// @access  Private (Admin only)
router.get('/stats', authenticateToken, (req, res) => {
  // Check permission for viewing notifications
  if (!hasPermission(req.user, PERMISSIONS.NOTIFICATIONS_VIEW)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view notification statistics'
    });
  }

  const stats = notificationService.getStats();
  
  res.json({
    success: true,
    data: stats
  });
});

// @desc    Send property notification
// @route   POST /api/notifications/property
// @access  Private
router.post('/property', authenticateToken, (req, res) => {
  // Check permission for sending notifications
  if (!hasPermission(req.user, PERMISSIONS.NOTIFICATIONS_SEND)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to send notifications'
    });
  }

  const { userId, propertyData, action } = req.body;
  
  if (!userId || !propertyData || !action) {
    return res.status(400).json({
      success: false,
      message: 'userId, propertyData, and action are required'
    });
  }
  
  notificationService.sendPropertyNotification(userId, propertyData, action);
  
  res.json({
    success: true,
    message: 'Property notification sent'
  });
});

// @desc    Send message notification
// @route   POST /api/notifications/message
// @access  Private
router.post('/message', authenticateToken, (req, res) => {
  // Check permission for sending notifications
  if (!hasPermission(req.user, PERMISSIONS.NOTIFICATIONS_SEND)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to send notifications'
    });
  }

  const { userId, messageData } = req.body;
  
  if (!userId || !messageData) {
    return res.status(400).json({
      success: false,
      message: 'userId and messageData are required'
    });
  }
  
  notificationService.sendMessageNotification(userId, messageData);
  
  res.json({
    success: true,
    message: 'Message notification sent'
  });
});

// @desc    Broadcast notification to all users
// @route   POST /api/notifications/broadcast
// @access  Private (Admin only)
router.post('/broadcast', authenticateToken, (req, res) => {
  // Check permission for managing notifications (broadcast is a management function)
  if (!hasPermission(req.user, PERMISSIONS.NOTIFICATIONS_SEND)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to broadcast notifications'
    });
  }

  const { notification } = req.body;
  
  if (!notification) {
    return res.status(400).json({
      success: false,
      message: 'Notification data is required'
    });
  }
  
  notificationService.broadcast({
    type: 'announcement',
    title: notification.title || 'System Announcement',
    message: notification.message,
    data: notification.data || {}
  });
  
  res.json({
    success: true,
    message: 'Broadcast notification sent'
  });
});

// @desc    Get pending notifications for current user
// @route   GET /api/notifications/pending
// @access  Private
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const UserNotification = require('../models/UserNotification');

    // Get undelivered notifications for this user
    const notifications = await UserNotification.find({
      user: userId,
      delivered: false
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching pending notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending notifications'
    });
  }
});

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const UserNotification = require('../models/UserNotification');

    const query = { user: userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await UserNotification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await UserNotification.countDocuments(query);
    const unreadCount = await UserNotification.countDocuments({
      user: userId,
      read: false
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// @desc    Mark notifications as delivered
// @route   POST /api/notifications/mark-delivered
// @access  Private
router.post('/mark-delivered', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body;
    const UserNotification = require('../models/UserNotification');

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: 'notificationIds array is required'
      });
    }

    await UserNotification.updateMany(
      {
        _id: { $in: notificationIds },
        user: userId,
        delivered: false
      },
      {
        $set: {
          delivered: true,
          deliveredAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'Notifications marked as delivered'
    });
  } catch (error) {
    console.error('Error marking notifications as delivered:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as delivered'
    });
  }
});

// @desc    Mark notifications as read
// @route   POST /api/notifications/mark-read
// @access  Private
router.post('/mark-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body;
    const UserNotification = require('../models/UserNotification');

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: 'notificationIds array is required'
      });
    }

    await UserNotification.updateMany(
      {
        _id: { $in: notificationIds },
        user: userId,
        read: false
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read'
    });
  }
});

// @desc    Mark all notifications as read
// @route   POST /api/notifications/mark-all-read
// @access  Private
router.post('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const UserNotification = require('../models/UserNotification');

    await UserNotification.updateMany(
      {
        user: userId,
        read: false
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const UserNotification = require('../models/UserNotification');

    const result = await UserNotification.deleteOne({
      _id: id,
      user: userId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

module.exports = router;
