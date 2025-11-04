// Real-time Notification Service using Server-Sent Events (SSE)
const EventEmitter = require('events');

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.clients = new Map(); // Map of userId -> Set of response objects
    this.notificationQueue = new Map(); // Queue for offline users
  }

  /**
   * Add a client connection for real-time notifications
   * @param {string} userId - User ID
   * @param {object} res - Express response object
   */
  addClient(userId, res) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    
    this.clients.get(userId).add(res);
    
    // Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection confirmation
    this.sendToClient(res, {
      type: 'connection',
      data: {
        message: 'Connected to real-time notifications',
        timestamp: new Date().toISOString()
      }
    });

    // Send any queued notifications
    this.sendQueuedNotifications(userId);

    // Handle client disconnect
    res.on('close', () => {
      this.removeClient(userId, res);
    });

    console.log(`User ${userId} connected for real-time notifications`);
  }

  /**
   * Remove a client connection
   * @param {string} userId - User ID
   * @param {object} res - Express response object
   */
  removeClient(userId, res) {
    if (this.clients.has(userId)) {
      this.clients.get(userId).delete(res);
      if (this.clients.get(userId).size === 0) {
        this.clients.delete(userId);
      }
    }
    console.log(`User ${userId} disconnected from real-time notifications`);
  }

  /**
   * Send notification to a specific client
   * @param {object} res - Express response object
   * @param {object} notification - Notification data
   */
  sendToClient(res, notification) {
    try {
      const data = `data: ${JSON.stringify(notification)}\n\n`;
      res.write(data);
    } catch (error) {
      console.error('Error sending notification to client:', error);
    }
  }

  /**
   * Send queued notifications to a user
   * @param {string} userId - User ID
   */
  sendQueuedNotifications(userId) {
    if (this.notificationQueue.has(userId)) {
      const notifications = this.notificationQueue.get(userId);
      const clients = this.clients.get(userId);
      
      if (clients && clients.size > 0) {
        notifications.forEach(notification => {
          clients.forEach(client => {
            this.sendToClient(client, notification);
          });
        });
        
        // Clear queue after sending
        this.notificationQueue.delete(userId);
      }
    }
  }

  /**
   * Send real-time notification to user(s)
   * @param {string|Array} userIds - User ID(s) to send notification to
   * @param {object} notification - Notification data
   */
  sendNotification(userIds, notification) {
    const targetUsers = Array.isArray(userIds) ? userIds : [userIds];
    
    targetUsers.forEach(userId => {
      const clients = this.clients.get(userId);
      
      if (clients && clients.size > 0) {
        // User is online - send immediately
        clients.forEach(client => {
          this.sendToClient(client, {
            ...notification,
            timestamp: new Date().toISOString(),
            userId: userId
          });
        });
      } else {
        // User is offline - queue notification
        if (!this.notificationQueue.has(userId)) {
          this.notificationQueue.set(userId, []);
        }
        
        this.notificationQueue.get(userId).push({
          ...notification,
          timestamp: new Date().toISOString(),
          userId: userId
        });
        
        // Limit queue size (keep only last 50 notifications)
        const queue = this.notificationQueue.get(userId);
        if (queue.length > 50) {
          queue.splice(0, queue.length - 50);
        }
      }
    });

    // Emit event for other services to listen
    this.emit('notification_sent', { userIds: targetUsers, notification });
  }

  /**
   * Broadcast notification to all connected users
   * @param {object} notification - Notification data
   */
  broadcast(notification) {
    const allUserIds = Array.from(this.clients.keys());
    this.sendNotification(allUserIds, {
      ...notification,
      type: 'broadcast'
    });
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
    const totalConnections = Array.from(this.clients.values())
      .reduce((sum, clientSet) => sum + clientSet.size, 0);
    
    return {
      connectedUsers: this.clients.size,
      totalConnections: totalConnections,
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
