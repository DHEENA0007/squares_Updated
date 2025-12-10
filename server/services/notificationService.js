// Real-time Notification Service using Socket.IO
const EventEmitter = require('events');

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.io = null; // Socket.IO instance
    this.notificationQueue = new Map(); // Queue for offline users
  }

  /**
   * Initialize Socket.IO instance
   * @param {object} io - Socket.IO server instance
   */
  initialize(io) {
    this.io = io;
    console.log('NotificationService initialized with Socket.IO');
  }

  /**
   * Check if user is connected
   * @param {string} userId - User ID
   * @returns {boolean}
   */
  isUserConnected(userId) {
    if (!this.io) return false;
    return this.io.sockets.adapter.rooms.has(`user:${userId}`);
  }

  /**
   * Send queued notifications to a user via Socket.IO
   * @param {string} userId - User ID
   */
  sendQueuedNotifications(userId) {
    if (!this.io) return;
    
    if (this.notificationQueue.has(userId)) {
      const notifications = this.notificationQueue.get(userId);
      
      if (this.isUserConnected(userId)) {
        notifications.forEach(notification => {
          this.io.to(`user:${userId}`).emit('notification', notification);
        });
        
        // Clear queue after sending
        this.notificationQueue.delete(userId);
      }
    }
  }

  /**
   * Check if user has notifications enabled for a specific type
   * @param {string} userId - User ID
   * @param {string} notificationType - Type of notification
   * @returns {Promise<boolean>}
   */
  async checkUserNotificationPreferences(userId, notificationType) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId).select('profile.preferences.notifications');

      if (!user || !user.profile?.preferences?.notifications) {
        return true; // Default to enabled if preferences not found
      }

      const prefs = user.profile.preferences.notifications;

      // Check if push notifications are globally disabled
      if (prefs.push === false) {
        return false;
      }

      // Check specific notification type preferences
      const typeMapping = {
        'property_alert': 'propertyAlerts',
        'price_alert': 'priceDrops',
        'new_message': 'newMessages',
        'service_update': 'newsUpdates',
        'lead_alert': 'propertyAlerts',
        'inquiry_received': 'propertyAlerts',
        'weekly_report': 'newsUpdates',
        'business_update': 'newsUpdates',
        'property_update': 'propertyAlerts'
      };

      const prefKey = typeMapping[notificationType];
      if (prefKey && prefs[prefKey] === false) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return true; // Default to enabled on error
    }
  }

  /**
   * Send real-time notification to user(s) via Socket.IO
   * @param {string|Array} userIds - User ID(s) to send notification to
   * @param {object} notification - Notification data
   * @param {object} options - Additional options (persistToDb: boolean)
   */
  async sendNotification(userIds, notification, options = { persistToDb: true }) {
    if (!this.io) {
      console.warn('Socket.IO not initialized, cannot send notification');
      return;
    }

    const targetUsers = Array.isArray(userIds) ? userIds : [userIds];

    // Filter users based on their notification preferences
    const filteredUsers = [];
    for (const userId of targetUsers) {
      const hasPermission = await this.checkUserNotificationPreferences(userId, notification.type);
      if (hasPermission) {
        filteredUsers.push(userId);
      } else {
        console.log(`Skipping notification for user ${userId} - preferences disabled for type: ${notification.type}`);
      }
    }

    if (filteredUsers.length === 0) {
      console.log('No users to notify after filtering by preferences');
      return;
    }

    // Persist to database if requested (for offline delivery)
    if (options.persistToDb) {
      try {
        await this.persistNotification(filteredUsers, notification);
      } catch (error) {
        console.error('Failed to persist notification to database:', error);
      }
    }

    filteredUsers.forEach(userId => {
      const notificationData = {
        ...notification,
        timestamp: new Date().toISOString(),
        userId: userId
      };

      if (this.isUserConnected(userId)) {
        // User is online - send immediately via Socket.IO and mark as delivered
        this.io.to(`user:${userId}`).emit('notification', notificationData);

        // Mark as delivered in database
        if (options.persistToDb) {
          this.markAsDelivered(userId, notificationData).catch(err =>
            console.error('Failed to mark notification as delivered:', err)
          );
        }
      } else {
        // User is offline - queue notification in memory as backup
        if (!this.notificationQueue.has(userId)) {
          this.notificationQueue.set(userId, []);
        }

        this.notificationQueue.get(userId).push(notificationData);

        // Limit queue size (keep only last 50 notifications)
        const queue = this.notificationQueue.get(userId);
        if (queue.length > 50) {
          queue.splice(0, queue.length - 50);
        }
      }
    });

    // Emit event for other services to listen
    this.emit('notification_sent', { userIds: filteredUsers, notification });
  }

  /**
   * Persist notification to database for offline users
   * @param {Array} userIds - User IDs
   * @param {object} notification - Notification data
   */
  async persistNotification(userIds, notification) {
    const UserNotification = require('../models/UserNotification');

    console.log(`💾 Persisting ${userIds.length} UserNotifications with title: "${notification.title}"`);

    const notifications = userIds.map(userId => ({
      user: userId,
      type: notification.type || 'general',
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      delivered: false,
      read: false
    }));

    try {
      const result = await UserNotification.insertMany(notifications);
      console.log(`✅ Successfully persisted ${result.length} UserNotifications`);
    } catch (error) {
      console.error('❌ Failed to persist UserNotifications:', error.message);
      throw error;
    }
  }

  /**
   * Mark notification as delivered for a user
   * @param {string} userId - User ID
   * @param {object} notificationData - Notification data
   */
  async markAsDelivered(userId, notificationData) {
    const UserNotification = require('../models/UserNotification');

    await UserNotification.updateOne(
      {
        user: userId,
        title: notificationData.title,
        message: notificationData.message,
        delivered: false
      },
      {
        $set: {
          delivered: true,
          deliveredAt: new Date()
        }
      }
    );
  }

  /**
   * Broadcast notification to all connected users via Socket.IO
   * @param {object} notification - Notification data
   */
  broadcast(notification) {
    if (!this.io) {
      console.warn('Socket.IO not initialized, cannot broadcast');
      return;
    }

    const notificationData = {
      ...notification,
      type: notification.type || 'broadcast',
      timestamp: new Date().toISOString()
    };

    // Broadcast to all connected clients
    this.io.emit('notification', notificationData);
  }

  /**
   * Send property-related notifications
   * @param {string} userId - User ID
   * @param {object} propertyData - Property information
   * @param {string} action - Action type (new_match, price_drop, etc.)
   */
  sendPropertyNotification(userId, propertyData, action) {
    const notifications = {
      new_match: {
        type: 'property_alert',
        title: 'New Property Match!',
        message: `Found a new property matching your criteria: ${propertyData.title}`,
        data: {
          propertyId: propertyData.id,
          title: propertyData.title,
          price: propertyData.price,
          location: propertyData.location,
          action: 'view_property'
        }
      },
      price_drop: {
        type: 'price_alert',
        title: 'Price Drop Alert!',
        message: `Price reduced for ${propertyData.title}. New price: ₹${propertyData.newPrice}`,
        data: {
          propertyId: propertyData.id,
          oldPrice: propertyData.oldPrice,
          newPrice: propertyData.newPrice,
          savings: propertyData.oldPrice - propertyData.newPrice,
          action: 'view_property'
        }
      },
      status_change: {
        type: 'property_update',
        title: 'Property Status Update',
        message: `Your property "${propertyData.title}" status changed to ${propertyData.status}`,
        data: {
          propertyId: propertyData.id,
          status: propertyData.status,
          action: 'view_dashboard'
        }
      }
    };

    const notification = notifications[action];
    if (notification) {
      this.sendNotification(userId, notification);
    }
  }

  /**
   * Send message notifications
   * @param {string} userId - Recipient user ID
   * @param {object} messageData - Message information
   */
  sendMessageNotification(userId, messageData) {
    this.sendNotification(userId, {
      type: 'new_message',
      title: 'New Message',
      message: `New message from ${messageData.senderName}`,
      data: {
        conversationId: messageData.conversationId,
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        preview: messageData.message.substring(0, 50) + (messageData.message.length > 50 ? '...' : ''),
        action: 'view_messages'
      }
    });
  }

  /**
   * Send service request notifications
   * @param {string} userId - User ID
   * @param {object} serviceData - Service request information
   * @param {string} status - New status
   */
  sendServiceNotification(userId, serviceData, status) {
    const statusMessages = {
      assigned: `Your service request "${serviceData.title}" has been assigned to ${serviceData.providerName}`,
      in_progress: `Work has started on your service request "${serviceData.title}"`,
      completed: `Your service request "${serviceData.title}" has been completed`,
      cancelled: `Your service request "${serviceData.title}" has been cancelled`
    };

    this.sendNotification(userId, {
      type: 'service_update',
      title: 'Service Request Update',
      message: statusMessages[status] || `Status update for "${serviceData.title}"`,
      data: {
        serviceId: serviceData.id,
        status: status,
        providerName: serviceData.providerName,
        action: 'view_services'
      }
    });
  }

  /**
   * Send vendor business notifications
   * @param {string} vendorId - Vendor user ID
   * @param {object} data - Notification data
   * @param {string} type - Notification type (lead_alert, inquiry_received, weekly_report, business_update)
   */
  sendVendorNotification(vendorId, data, type) {
    const notifications = {
      lead_alert: {
        type: 'lead_alert',
        title: 'New Lead Alert!',
        message: `New inquiry for your property: ${data.propertyTitle}`,
        data: {
          leadId: data.leadId,
          propertyId: data.propertyId,
          propertyTitle: data.propertyTitle,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          action: 'view_leads'
        }
      },
      inquiry_received: {
        type: 'inquiry_received',
        title: 'Property Inquiry Received',
        message: `${data.customerName} is interested in "${data.propertyTitle}"`,
        data: {
          inquiryId: data.inquiryId,
          propertyId: data.propertyId,
          propertyTitle: data.propertyTitle,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          message: data.message,
          action: 'view_inquiries'
        }
      },
      weekly_report: {
        type: 'weekly_report',
        title: 'Weekly Performance Report',
        message: `Your weekly report is ready. ${data.totalViews} views, ${data.totalInquiries} inquiries this week.`,
        data: {
          reportId: data.reportId,
          period: data.period,
          totalViews: data.totalViews,
          totalInquiries: data.totalInquiries,
          totalProperties: data.totalProperties,
          action: 'view_dashboard'
        }
      },
      business_update: {
        type: 'business_update',
        title: 'Business Update',
        message: data.message || 'Important business update available',
        data: {
          updateId: data.updateId,
          category: data.category,
          priority: data.priority || 'normal',
          action: data.action || 'view_dashboard'
        }
      }
    };

    const notification = notifications[type];
    if (notification) {
      this.sendNotification(vendorId, notification);
    }
  }

  /**
   * Get connection statistics
   * @returns {object} Connection stats
   */
  getStats() {
    if (!this.io) {
      return {
        connectedUsers: 0,
        totalConnections: 0,
        queuedNotifications: 0
      };
    }

    const sockets = this.io.sockets.sockets;
    const connectedUsers = new Set();
    
    sockets.forEach(socket => {
      if (socket.userId) {
        connectedUsers.add(socket.userId);
      }
    });
    
    return {
      connectedUsers: connectedUsers.size,
      totalConnections: sockets.size,
      queuedNotifications: Array.from(this.notificationQueue.values())
        .reduce((sum, queue) => sum + queue.length, 0)
    };
  }

  /**
   * Clear old queued notifications
   * @param {number} maxAge - Maximum age in milliseconds (default: 24 hours)
   */
  cleanupQueue(maxAge = 24 * 60 * 60 * 1000) {
    const cutoffTime = Date.now() - maxAge;
    
    for (const [userId, notifications] of this.notificationQueue.entries()) {
      const filteredNotifications = notifications.filter(
        notification => new Date(notification.timestamp).getTime() > cutoffTime
      );
      
      if (filteredNotifications.length === 0) {
        this.notificationQueue.delete(userId);
      } else {
        this.notificationQueue.set(userId, filteredNotifications);
      }
    }
  }
}

// Singleton instance
const notificationService = new NotificationService();

// Setup periodic cleanup (every hour)
setInterval(() => {
  notificationService.cleanupQueue();
}, 60 * 60 * 1000);

module.exports = notificationService;
