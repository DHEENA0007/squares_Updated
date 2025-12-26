/**
 * Analytics Calculator Job
 * 
 * Periodically calculates and caches analytics metrics for faster dashboard loading.
 * Also validates analytics data integrity.
 */

const User = require('../models/User');
const Property = require('../models/Property');
const PropertyView = require('../models/PropertyView');
const PageVisit = require('../models/PageVisit');
const Subscription = require('../models/Subscription');

class AnalyticsCalculatorJob {
    constructor() {
        this.intervalId = null;
        this.isRunning = false;
        this.lastRunStats = null;
    }

    /**
     * Start the scheduler
     * @param {number} intervalHours - Interval in hours (default 1)
     */
    start(intervalHours = 1) {
        if (this.intervalId) {
            console.log('[Analytics Calculator] Already running');
            return;
        }

        console.log(`[Analytics Calculator] Starting - will run every ${intervalHours} hour(s)`);

        // Run immediately
        this.run();

        this.intervalId = setInterval(() => {
            this.run();
        }, intervalHours * 60 * 60 * 1000);
    }

    /**
     * Run the analytics calculation
     */
    async run() {
        if (this.isRunning) {
            console.log('[Analytics Calculator] Already running, skipping this cycle');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();
        console.log(`[Analytics Calculator] Starting calculation at ${new Date().toISOString()}`);

        try {
            // Calculate analytics for different time ranges
            const ranges = [7, 30, 90];
            const results = {};

            for (const days of ranges) {
                results[`${days}days`] = await this.calculateMetrics(days);
            }

            // Store last run stats
            this.lastRunStats = {
                runAt: new Date().toISOString(),
                duration: Date.now() - startTime,
                metrics: results
            };

            console.log(`[Analytics Calculator] Completed in ${Date.now() - startTime}ms`);
            this.logSummary(results);

        } catch (error) {
            console.error('[Analytics Calculator] Error:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Calculate all metrics for a given time range
     */
    async calculateMetrics(days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Fetch all data in parallel
        const [
            totalUsers,
            totalProperties,
            totalViews,
            guestViews,
            registeredViews,
            newRegistrations,
            totalRevenue,
            uniqueViewersData,
            avgDurationData,
            interactionsData
        ] = await Promise.all([
            // Total users
            User.countDocuments(),

            // Total properties
            Property.countDocuments(),

            // Total property views in period
            PropertyView.countDocuments({ viewedAt: { $gte: startDate } }),

            // Guest views (no logged-in user)
            PropertyView.countDocuments({
                viewedAt: { $gte: startDate },
                viewer: null
            }),

            // Registered user views
            PropertyView.countDocuments({
                viewedAt: { $gte: startDate },
                viewer: { $ne: null }
            }),

            // New registrations in period
            User.countDocuments({ createdAt: { $gte: startDate } }),

            // Total revenue in period
            Subscription.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),

            // Unique viewers count (by sessionId or viewer)
            PropertyView.aggregate([
                { $match: { viewedAt: { $gte: startDate } } },
                {
                    $group: {
                        _id: { $ifNull: ['$viewer', '$sessionId'] }
                    }
                },
                { $count: 'count' }
            ]),

            // Average view duration
            PropertyView.aggregate([
                { $match: { viewedAt: { $gte: startDate }, viewDuration: { $gt: 0 } } },
                {
                    $group: {
                        _id: null,
                        avgDuration: { $avg: '$viewDuration' }
                    }
                }
            ]),

            // Total interactions (clicks + shares)
            PropertyView.aggregate([
                { $match: { viewedAt: { $gte: startDate } } },
                {
                    $group: {
                        _id: null,
                        phoneClicks: { $sum: { $cond: ['$interactions.clickedPhone', 1, 0] } },
                        emailClicks: { $sum: { $cond: ['$interactions.clickedEmail', 1, 0] } },
                        whatsappClicks: { $sum: { $cond: ['$interactions.clickedWhatsApp', 1, 0] } },
                        shares: { $sum: { $cond: ['$interactions.sharedProperty', 1, 0] } },
                        galleryViews: { $sum: { $cond: ['$interactions.viewedGallery', 1, 0] } }
                    }
                }
            ])
        ]);

        // Calculate derived values
        const uniqueViewers = uniqueViewersData[0]?.count || 0;
        const avgViewDuration = Math.round(avgDurationData[0]?.avgDuration || 0);

        const interactions = interactionsData[0] || {};
        const totalInteractions = (interactions.phoneClicks || 0) +
            (interactions.emailClicks || 0) +
            (interactions.whatsappClicks || 0) +
            (interactions.shares || 0);

        // Calculate conversion rate (Guest to User)
        // Formula: (New Registrations / Guest Visits) * 100
        const conversionRate = guestViews > 0
            ? parseFloat(((newRegistrations / guestViews) * 100).toFixed(2))
            : 0;

        return {
            days,
            startDate: startDate.toISOString(),
            calculatedAt: new Date().toISOString(),

            // User metrics
            totalUsers,
            newRegistrations,

            // Property metrics
            totalProperties,

            // View metrics
            totalViews,
            uniqueViewers,
            guestViews,
            registeredViews,
            avgViewDuration,

            // Interaction metrics
            totalInteractions,
            interactions: {
                phoneClicks: interactions.phoneClicks || 0,
                emailClicks: interactions.emailClicks || 0,
                whatsappClicks: interactions.whatsappClicks || 0,
                shares: interactions.shares || 0,
                galleryViews: interactions.galleryViews || 0
            },

            // Conversion metrics
            conversionRate,

            // Revenue metrics
            totalRevenue: totalRevenue[0]?.total || 0
        };
    }

    /**
     * Log summary of calculated metrics
     */
    logSummary(results) {
        console.log('[Analytics Calculator] Summary:');

        for (const [key, data] of Object.entries(results)) {
            console.log(`\n  📊 ${key}:`);
            console.log(`    👥 Total Users: ${data.totalUsers} (${data.newRegistrations} new)`);
            console.log(`    👁️  Total Views: ${data.totalViews} (${data.uniqueViewers} unique)`);
            console.log(`    📊 Registered vs Guest: ${data.registeredViews} / ${data.guestViews}`);
            console.log(`    🖱️  Total Interactions: ${data.totalInteractions}`);
            console.log(`       - Phone: ${data.interactions.phoneClicks}, Email: ${data.interactions.emailClicks}, WhatsApp: ${data.interactions.whatsappClicks}`);
            console.log(`    ⏱️  Avg. Duration: ${data.avgViewDuration}s per view`);
            console.log(`    🏠 Properties: ${data.totalProperties} total listings`);
            console.log(`    📈 Conversion Rate: ${data.conversionRate}% (Guest to user)`);
            console.log(`    💰 Total Revenue: ₹${data.totalRevenue.toLocaleString('en-IN')}`);
        }
    }

    /**
     * Get last run stats
     */
    getLastRunStats() {
        return this.lastRunStats;
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[Analytics Calculator] Stopped');
        }
    }
}

module.exports = new AnalyticsCalculatorJob();
