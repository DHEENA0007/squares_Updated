/**
 * Notification Scheduler Job
 * 
 * Checks for scheduled notifications every minute and triggers sending
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { sendTemplateEmail } = require('../utils/emailService');
const notificationService = require('../services/notificationService');

class NotificationSchedulerJob {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduler
   * @param {number} intervalMinutes - Interval in minutes (default 1)
   */
  start(intervalMinutes = 1) {
    if (this.intervalId) {
      console.log('[Notification Scheduler] Already running');
      return;
    }

    console.log(`[Notification Scheduler] Starting - will run every ${intervalMinutes} minute(s)`);
    
    // Run immediately
    this.run();

    this.intervalId = setInterval(() => {
      this.run();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Run the check for scheduled notifications
   */
  async run() {
    if (this.isRunning) return;

    this.isRunning = true;
    const now = new Date();

    try {
      // Find pending scheduled notifications
      const scheduledNotifications = await Notification.find({
        isScheduled: true,
        status: { $in: ['sending', 'draft'] }, // In case a "sending" one got stuck or "draft" that was scheduled
        scheduledDate: { $lte: now },
        sentAt: null // Ensure it hasn't been sent
      });

      if (scheduledNotifications.length > 0) {
        console.log(`[Notification Scheduler] Found ${scheduledNotifications.length} notifications to send`);
      }

      for (const notification of scheduledNotifications) {
        await this.processNotification(notification);
      }

    } catch (error) {
      console.error('[Notification Scheduler] Error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process a single notification
   */
  async processNotification(notification) {
    console.log(`[Notification Scheduler] Processing notification: ${notification._id} - ${notification.subject}`);
    
    try {
      notification.status = 'sending';
      await notification.save();

      // Recalculate target audience user IDs (fresh list)
      // This duplicates logic in admin.js, simplified here for reliability
      // In a refactor, this audience resolution logic should be extracted to a helper
      
      let query = {};
      const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

      switch (notification.targetAudience) {
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

      // If recipients users were already stored in the notification document, we could use those.
      // But typically for broad audiences we might not store all IDs in the notification doc 
      // depending on implementation. 
      // The current admin.js save creates 'recipients' array. Let's try to use that if populated, otherwise fetch.
      
      let users = [];
      if (notification.recipients && notification.recipients.length > 0) {
          // If explicitly stored, use them (assumes they are just IDs or objects with user ID)
          // To be safe and get emails, we might need to fetch user details
          const validUserIds = notification.recipients.map(r => r.user).filter(id => id);
          if (validUserIds.length > 0) {
             users = await User.find({ _id: { $in: validUserIds } }).select('_id email profile');
          }
      } 
      
      // Fallback: if recipients list is empty (maybe 'all_users' without expansion), fetch by query
      if (users.length === 0) {
          users = await User.find(query).select('_id email role profile');
      }

      if (users.length === 0) {
          console.warn(`[Notification Scheduler] No users found for notification ${notification._id}`);
          notification.status = 'failed';
          notification.failureReason = 'No recipients found';
          await notification.save();
          return;
      }

      const results = {
        total: users.length,
        email: { sent: 0, failed: 0 },
        push: { sent: 0, failed: 0 }
      };

      // 1. Email (if channel selected)
      if (notification.channels.includes('email')) {
        const emailPromises = users.map(user => {
            if (!user.email) return Promise.resolve();
            return sendTemplateEmail(user.email, 'general-notification', {
                subject: notification.subject,
                message: notification.message,
                firstName: user.profile?.firstName || 'User',
                actionLink: process.env.CLIENT_URL,
                actionText: 'Go to Dashboard'
            }).then(res => {
                if(res.success) results.email.sent++;
                else results.email.failed++;
            });
        });
        await Promise.all(emailPromises);
      }

      // 2. Push (if channel selected)
      if (notification.channels.includes('push')) {
        const userIds = users.map(u => u._id.toString());
        const notificationData = {
            type: 'admin_broadcast',
            title: notification.subject,
            message: notification.message,
            data: {
              timestamp: new Date().toISOString(),
              notificationId: notification._id 
            }
        };
        
        notificationService.sendNotification(userIds, notificationData);
        results.push.sent = userIds.length;
      }

      // Update success status
      notification.status = 'sent';
      notification.sentAt = new Date();
      
      // Mark all recipients as delivered (since we processed the list)
      // This is important because the pre-save hook recalculates stats based on this array
      if (notification.recipients && notification.recipients.length > 0) {
          notification.recipients.forEach(r => {
              r.delivered = true;
              r.deliveredAt = new Date();
          });
      }

      notification.statistics = {
          totalRecipients: users.length,
          delivered: results.push.sent + results.email.sent
      };
      
      await notification.save();
      console.log(`[Notification Scheduler] Sent notification ${notification._id} to ${users.length} users`);

    } catch (error) {
      console.error(`[Notification Scheduler] Failed to process notification ${notification._id}:`, error);
      notification.status = 'failed';
      notification.failureReason = error.message;
      await notification.save();
    }
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Notification Scheduler] Stopped');
    }
  }
}

module.exports = new NotificationSchedulerJob();
