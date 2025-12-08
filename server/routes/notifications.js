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

module.exports = router;
