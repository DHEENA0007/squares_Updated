const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
const Message = require('../models/Message');
const Subscription = require('../models/Subscription');

class AdminRealtimeService {
  constructor() {
    this.clients = new Map();
    this.changeStreams = new Map();
    this.intervalIds = new Map();
  }

  // Add admin client for real-time updates
  addClient(clientId, socket, userId) {
    this.clients.set(clientId, {
      socket,
      userId,
      connectedAt: new Date(),
      lastPing: new Date()
    });

    console.log(`Admin client connected: ${clientId} (User: ${userId})`);
    this.startRealtimeUpdates(clientId);
    this.setupChangeStreams();
  }

  // Remove admin client
  removeClient(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      this.stopRealtimeUpdates(clientId);
      this.clients.delete(clientId);
      console.log(`Admin client disconnected: ${clientId}`);
      
      // If no more clients, stop change streams
      if (this.clients.size === 0) {
        this.stopChangeStreams();
      }
    }
  }

  // Start periodic real-time updates for a client
  startRealtimeUpdates(clientId) {
    const intervalId = setInterval(async () => {
      try {
        await this.sendLiveMetrics(clientId);
      } catch (error) {
        console.error('Real-time update error:', error);
      }
    }, 10000); // Update every 10 seconds

    this.intervalIds.set(clientId, intervalId);
  }

  // Stop real-time updates for a client
  stopRealtimeUpdates(clientId) {
    const intervalId = this.intervalIds.get(clientId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervalIds.delete(clientId);
    }
  }

  // Send live metrics to a specific client
  async sendLiveMetrics(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const metrics = await this.generateLiveMetrics();
      client.socket.emit('admin:live-metrics', metrics);
      client.lastPing = new Date();
    } catch (error) {
      console.error('Failed to send live metrics:', error);
    }
  }

  // Generate live metrics data
  async generateLiveMetrics() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      const [
        totalUsers,
        totalProperties,
        activeUsers,
        recentActivity,
        systemHealth
      ] = await Promise.all([
        User.countDocuments(),
        Property.countDocuments(),
        this.getActiveUsersCount(),
        this.getRecentActivity(),
        this.getSystemHealth()
      ]);

      return {
        timestamp: now,
        overview: {
          totalUsers,
          totalProperties,
          activeUsers,
          onlineUsers: this.clients.size
        },
        activity: recentActivity,
        system: systemHealth,
        alerts: await this.getSystemAlerts()
      };
    } catch (error) {
      console.error('Generate live metrics error:', error);
      return {
        timestamp: now,
        error: 'Failed to generate metrics'
      };
    }
  }

  // Get count of active users (those who logged in within last 24 hours)
  async getActiveUsersCount() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
      return await User.countDocuments({
        'profile.lastLogin': { $gte: last24Hours }
      });
    } catch (error) {
      return 0;
    }
  }

  // Get recent activity
  async getRecentActivity() {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    
    try {
      const [newUsers, newProperties, newMessages] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: lastHour } }),
        Property.countDocuments({ createdAt: { $gte: lastHour } }),
        Message.countDocuments({ createdAt: { $gte: lastHour } })
      ]);

      return {
        lastHour: {
          newUsers,
          newProperties,
          newMessages
        }
      };
    } catch (error) {
      return { lastHour: { newUsers: 0, newProperties: 0, newMessages: 0 } };
    }
  }

  // Get system health metrics
  getSystemHealth() {
    return {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cpu: process.cpuUsage(),
      connections: {
        database: mongoose.connection.readyState,
        adminClients: this.clients.size
      }
    };
  }

  // Get system alerts
  async getSystemAlerts() {
    const alerts = [];
    
    try {
      // Check for pending users
      const pendingUsers = await User.countDocuments({ status: 'pending' });
      if (pendingUsers > 0) {
        alerts.push({
          type: 'warning',
          message: `${pendingUsers} users pending approval`,
          action: 'review_users',
          priority: 'medium'
        });
      }

      // Check for pending properties
      const pendingProperties = await Property.countDocuments({ status: 'pending' });
      if (pendingProperties > 0) {
        alerts.push({
          type: 'info',
          message: `${pendingProperties} properties pending review`,
          action: 'review_properties',
          priority: 'low'
        });
      }

      // Check memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      if (memoryUsagePercent > 90) {
        alerts.push({
          type: 'error',
          message: `High memory usage: ${memoryUsagePercent.toFixed(1)}%`,
          action: 'check_system',
          priority: 'high'
        });
      }

      // Check database connection
      if (mongoose.connection.readyState !== 1) {
        alerts.push({
          type: 'error',
          message: 'Database connection lost',
          action: 'check_database',
          priority: 'critical'
        });
      }

    } catch (error) {
      alerts.push({
        type: 'error',
        message: 'Failed to check system alerts',
        action: 'check_logs',
        priority: 'medium'
      });
    }

    return alerts;
  }

  // Check if MongoDB supports change streams (requires replica set)
  async isReplicaSet() {
    try {
      const admin = mongoose.connection.db.admin();
      const result = await admin.command({ replSetGetStatus: 1 });
      return result.ok === 1;
    } catch (error) {
      // Error code 76 means not running as replica set
      return false;
    }
  }

  // Setup MongoDB change streams for real-time notifications
  async setupChangeStreams() {
    if (this.changeStreams.size > 0) return; // Already setup

    // Check if replica set is available
    const hasReplicaSet = await this.isReplicaSet();
    if (!hasReplicaSet) {
      console.log('MongoDB is not a replica set - change streams disabled. Using polling for real-time updates.');
      return;
    }

    try {
      // Watch user changes
      const userChangeStream = User.watch([
        { $match: { operationType: { $in: ['insert', 'update', 'delete'] } } }
      ]);

      userChangeStream.on('change', (change) => {
        this.broadcastChange('user', change);
      });

      userChangeStream.on('error', (error) => {
        console.error('User change stream error:', error.message);
        this.changeStreams.delete('users');
      });

      this.changeStreams.set('users', userChangeStream);

      // Watch property changes
      const propertyChangeStream = Property.watch([
        { $match: { operationType: { $in: ['insert', 'update', 'delete'] } } }
      ]);

      propertyChangeStream.on('change', (change) => {
        this.broadcastChange('property', change);
      });

      propertyChangeStream.on('error', (error) => {
        console.error('Property change stream error:', error.message);
        this.changeStreams.delete('properties');
      });

      this.changeStreams.set('properties', propertyChangeStream);

      // Watch subscription changes
      const subscriptionChangeStream = Subscription.watch([
        { $match: { operationType: { $in: ['insert', 'update', 'delete'] } } }
      ]);

      subscriptionChangeStream.on('change', (change) => {
        this.broadcastChange('subscription', change);
      });

      subscriptionChangeStream.on('error', (error) => {
        console.error('Subscription change stream error:', error.message);
        this.changeStreams.delete('subscriptions');
      });

      this.changeStreams.set('subscriptions', subscriptionChangeStream);

      console.log('MongoDB change streams setup for admin real-time updates');
    } catch (error) {
      console.error('Failed to setup change streams:', error.message);
    }
  }

  // Stop all change streams
  stopChangeStreams() {
    this.changeStreams.forEach((stream, name) => {
      try {
        stream.close();
        console.log(`Closed change stream: ${name}`);
      } catch (error) {
        console.error(`Error closing change stream ${name}:`, error);
      }
    });
    this.changeStreams.clear();
  }

  // Broadcast database changes to all admin clients
  broadcastChange(type, change) {
    const notification = {
      type: `database_${type}_${change.operationType}`,
      timestamp: new Date(),
      data: {
        collection: type,
        operation: change.operationType,
        documentId: change.documentKey?._id,
        fullDocument: change.fullDocument
      }
    };

    this.clients.forEach((client, clientId) => {
      try {
        client.socket.emit('admin:database-change', notification);
      } catch (error) {
        console.error(`Failed to send change notification to ${clientId}:`, error);
      }
    });
  }

  // Broadcast custom notification to all admin clients
  broadcastNotification(notification) {
    this.clients.forEach((client, clientId) => {
      try {
        client.socket.emit('admin:notification', {
          ...notification,
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Failed to send notification to ${clientId}:`, error);
      }
    });
  }

  // Send notification to specific admin client
  sendNotificationToClient(clientId, notification) {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.socket.emit('admin:notification', {
          ...notification,
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Failed to send notification to ${clientId}:`, error);
      }
    }
  }

  // Get all connected admin clients info
  getConnectedClients() {
    const clients = [];
    this.clients.forEach((client, clientId) => {
      clients.push({
        clientId,
        userId: client.userId,
        connectedAt: client.connectedAt,
        lastPing: client.lastPing
      });
    });
    return clients;
  }

  // Cleanup disconnected clients
  cleanup() {
    const now = new Date();
    this.clients.forEach((client, clientId) => {
      // Remove clients that haven't pinged in 2 minutes
      if (now - client.lastPing > 2 * 60 * 1000) {
        console.log(`Cleaning up stale admin client: ${clientId}`);
        this.removeClient(clientId);
      }
    });
  }
}

// Create singleton instance
const adminRealtimeService = new AdminRealtimeService();

// Cleanup stale connections every minute
setInterval(() => {
  adminRealtimeService.cleanup();
}, 60000);

module.exports = adminRealtimeService;