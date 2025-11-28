/**
 * Free Listing Expiry Job
 *
 * This job runs daily to:
 * 1. Check for free listings that have expired (30 days after approval)
 * 2. Archive them from customer view
 * 3. Send notifications to vendors to purchase a subscription
 *
 * Free listings are properties created by vendors without an active subscription.
 * When approved by admin, they are given 30 days of visibility before being archived.
 */

const Property = require('../models/Property');
const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/emailService');

class FreeListingExpiryJob {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Start the periodic expiry check job
   * @param {number} intervalHours - How often to run (default: 24 hours)
   */
  start(intervalHours = 24) {
    if (this.intervalId) {
      console.log('[Free Listing Expiry Job] Already running');
      return;
    }

    console.log(`[Free Listing Expiry Job] Starting - will run every ${intervalHours} hours`);

    // Run immediately on startup
    this.run();

    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.run();
    }, intervalHours * 60 * 60 * 1000);
  }

  /**
   * Run the expiry check and archive expired properties
   */
  async run() {
    if (this.isRunning) {
      console.log('[Free Listing Expiry Job] Skipping - previous job still running');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('[Free Listing Expiry Job] Starting expiry check at', new Date().toISOString());

      const now = new Date();

      // Find all free listings that have expired and are not yet archived
      const expiredProperties = await Property.find({
        isFreeListing: true,
        archived: { $ne: true },
        freeListingExpiresAt: { $lte: now },
        status: 'available'
      }).populate('owner', 'email profile.firstName profile.lastName');

      console.log(`[Free Listing Expiry Job] Found ${expiredProperties.length} expired properties`);

      const results = [];

      for (const property of expiredProperties) {
        try {
          // Archive the property
          property.archived = true;
          property.archivedAt = now;
          property.archivedReason = 'Free listing expired after 30 days';
          await property.save();

          // Create notification for the vendor
          await this.createVendorNotification(property);

          // Send email notification to the vendor
          await this.sendVendorEmail(property);

          results.push({
            propertyId: property._id,
            title: property.title,
            ownerId: property.owner._id,
            expiredAt: property.freeListingExpiresAt,
            status: 'archived'
          });

          console.log(`[Free Listing Expiry Job] Archived property: ${property.title} (ID: ${property._id})`);
        } catch (error) {
          console.error(`[Free Listing Expiry Job] Error processing property ${property._id}:`, error);
          results.push({
            propertyId: property._id,
            title: property.title,
            status: 'error',
            error: error.message
          });
        }
      }

      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r.status === 'archived').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      console.log('[Free Listing Expiry Job] Completed:', {
        duration: `${duration}ms`,
        total: expiredProperties.length,
        archived: successCount,
        errors: errorCount,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        totalExpired: expiredProperties.length,
        archivedCount: successCount,
        errorCount: errorCount,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Free Listing Expiry Job] Unexpected error:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Create in-app notification for vendor
   */
  async createVendorNotification(property) {
    try {
      await Notification.create({
        user: property.owner._id,
        type: 'subscription',
        title: 'Free Listing Expired',
        message: `Your free listing "${property.title}" has expired after 30 days. Purchase a subscription to make it visible to customers again.`,
        data: {
          propertyId: property._id,
          propertyTitle: property.title,
          reason: 'free_listing_expired'
        },
        priority: 'high'
      });
    } catch (error) {
      console.error('[Free Listing Expiry Job] Error creating notification:', error);
    }
  }

  /**
   * Send email notification to vendor
   */
  async sendVendorEmail(property) {
    const owner = property.owner;
    if (!owner || !owner.email) {
      return;
    }

    const firstName = owner.profile?.firstName || 'Vendor';
    const propertyTitle = property.title;

    const emailSubject = 'Your Free Listing Has Expired - Upgrade to Continue';
    const emailBody = `
Dear ${firstName},

Your free property listing "${propertyTitle}" has expired after 30 days and is no longer visible to customers.

To make your property visible again and access more features, please purchase one of our subscription plans:

✓ Basic Plan - Extended listing duration with more photos
✓ Standard Plan - Featured listings and lead management
✓ Premium Plan - Top placement and verified badge
✓ Enterprise Plan - Unlimited listings and priority support

Visit your dashboard to view available subscription plans and reactivate your property listing.

Best regards,
BuildHomeMartSquares Team
    `.trim();

    try {
      await sendEmail(owner.email, emailSubject, emailBody);
    } catch (error) {
      console.error('[Free Listing Expiry Job] Error sending email:', error);
    }
  }

  /**
   * Stop the expiry check job
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Free Listing Expiry Job] Stopped');
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      isScheduled: !!this.intervalId,
      isRunning: this.isRunning
    };
  }

  /**
   * Manually trigger the job (useful for testing or admin actions)
   */
  async trigger() {
    return await this.run();
  }
}

// Export singleton instance
module.exports = new FreeListingExpiryJob();
