const express = require('express');
const router = express.Router();
const PageVisit = require('../models/PageVisit');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');

// Helper to parse user agent
const parseUserAgent = (userAgentString) => {
    const parser = new UAParser(userAgentString);
    const result = parser.getResult();

    let deviceType = 'desktop';
    if (result.device.type === 'mobile') deviceType = 'mobile';
    else if (result.device.type === 'tablet') deviceType = 'tablet';

    return {
        deviceType,
        browser: {
            name: result.browser.name || 'Unknown',
            version: result.browser.version || ''
        },
        os: {
            name: result.os.name || 'Unknown',
            version: result.os.version || ''
        }
    };
};

// Helper to extract domain from referrer
const extractDomain = (referrer, currentHost) => {
    if (!referrer) return 'Direct';
    try {
        const url = new URL(referrer);
        const hostname = url.hostname.replace('www.', '');

        // Define your own domains (these count as Direct/Internal traffic)
        const ownDomains = [
            'localhost',
            '127.0.0.1',
            'buildhomemartsquares.com',
            'app.buildhomemartsquares.com'
        ];

        // If referrer is from own domain, classify as Direct/Internal
        if (ownDomains.some(domain => hostname.includes(domain))) {
            return 'Direct (Internal)';
        }

        // Classify common sources
        if (hostname.includes('google')) return 'Google';
        if (hostname.includes('facebook') || hostname.includes('fb.com')) return 'Facebook';
        if (hostname.includes('instagram')) return 'Instagram';
        if (hostname.includes('twitter') || hostname.includes('x.com')) return 'Twitter/X';
        if (hostname.includes('linkedin')) return 'LinkedIn';
        if (hostname.includes('youtube')) return 'YouTube';
        if (hostname.includes('whatsapp')) return 'WhatsApp';
        if (hostname.includes('telegram')) return 'Telegram';
        if (hostname.includes('bing')) return 'Bing';
        if (hostname.includes('yahoo')) return 'Yahoo';

        return hostname;
    } catch {
        return 'Direct';
    }
};

// Helper to get location from IP
const getLocationFromIP = (ip) => {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return { country: 'Local', region: 'Local', city: 'Local' };
    }

    const geo = geoip.lookup(ip);
    if (geo) {
        return {
            country: geo.country || 'Unknown',
            region: geo.region || 'Unknown',
            city: geo.city || 'Unknown'
        };
    }
    return { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
};

// Track page visit - Public endpoint (no auth required)
router.post('/track', asyncHandler(async (req, res) => {
    const {
        page,
        pageTitle,
        pageType,
        sessionId,
        visitorId,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        screenResolution,
        language,
        isEntryPage
    } = req.body;

    // Get client IP
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.connection?.remoteAddress ||
        req.ip ||
        'unknown';

    const userAgent = req.headers['user-agent'] || '';
    const uaData = parseUserAgent(userAgent);
    const location = getLocationFromIP(ipAddress);
    const referrerDomain = extractDomain(referrer);

    // Get user ID if authenticated
    let userId = null;
    if (req.headers.authorization) {
        try {
            const jwt = require('jsonwebtoken');
            const token = req.headers.authorization.replace('Bearer ', '');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.userId || decoded.id;
        } catch (e) {
            // Token invalid or expired - continue without user
        }
    }

    const pageVisit = new PageVisit({
        page,
        pageTitle,
        pageType: pageType || 'other',
        userId,
        sessionId,
        visitorId,
        referrer,
        referrerDomain,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        userAgent,
        deviceType: uaData.deviceType,
        browser: uaData.browser,
        os: uaData.os,
        screenResolution,
        language,
        ipAddress,
        country: location.country,
        region: location.region,
        city: location.city,
        isEntryPage: isEntryPage || false,
        visitedAt: new Date()
    });

    await pageVisit.save();

    res.json({
        success: true,
        message: 'Visit tracked',
        visitId: pageVisit._id
    });
}));

// Update visit duration and engagement
router.patch('/track/:visitId', asyncHandler(async (req, res) => {
    const { visitId } = req.params;
    const { duration, scrollDepth, interactions, isExitPage, bounced } = req.body;

    const updateData = {};
    if (duration !== undefined) updateData.duration = duration;
    if (scrollDepth !== undefined) updateData.scrollDepth = scrollDepth;
    if (interactions !== undefined) updateData.interactions = interactions;
    if (isExitPage !== undefined) updateData.isExitPage = isExitPage;
    if (bounced !== undefined) updateData.bounced = bounced;

    await PageVisit.findByIdAndUpdate(visitId, updateData);

    res.json({ success: true, message: 'Visit updated' });
}));

// Get real-time traffic stats (requires auth)
router.get('/realtime', authenticateToken, asyncHandler(async (req, res) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [activeNow, lastHour, topPages, devices] = await Promise.all([
        // Active visitors in last 5 minutes
        PageVisit.distinct('sessionId', { visitedAt: { $gte: fiveMinutesAgo } }),

        // Visits in last hour
        PageVisit.countDocuments({ visitedAt: { $gte: oneHourAgo } }),

        // Top pages in last hour
        PageVisit.aggregate([
            { $match: { visitedAt: { $gte: oneHourAgo } } },
            { $group: { _id: '$page', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]),

        // Device breakdown in last hour
        PageVisit.aggregate([
            { $match: { visitedAt: { $gte: oneHourAgo } } },
            { $group: { _id: '$deviceType', count: { $sum: 1 } } }
        ])
    ]);

    res.json({
        success: true,
        data: {
            activeVisitors: activeNow.length,
            visitsLastHour: lastHour,
            topPages,
            devices
        }
    });
}));

// Get comprehensive traffic analytics (requires auth)
router.get('/analytics', authenticateToken, asyncHandler(async (req, res) => {
    const { dateRange = '30' } = req.query;
    const days = parseInt(dateRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
        totalVisits,
        uniqueVisitors,
        trafficBySource,
        trafficByDevice,
        trafficByCountry,
        trafficByBrowser,
        visitsByDate,
        visitsByHour,
        topPages,
        entryPages,
        exitPages,
        avgMetrics
    ] = await Promise.all([
        // Total page visits
        PageVisit.countDocuments({ visitedAt: { $gte: startDate } }),

        // Unique visitors
        PageVisit.distinct('visitorId', { visitedAt: { $gte: startDate } }),

        // Traffic by source
        PageVisit.aggregate([
            { $match: { visitedAt: { $gte: startDate } } },
            {
                $group: {
                    _id: '$referrerDomain',
                    count: { $sum: 1 },
                    uniqueVisitors: { $addToSet: '$visitorId' }
                }
            },
            {
                $project: {
                    _id: 1,
                    count: 1,
                    uniqueVisitors: { $size: '$uniqueVisitors' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]),

        // Traffic by device
        PageVisit.aggregate([
            { $match: { visitedAt: { $gte: startDate } } },
            {
                $group: {
                    _id: '$deviceType',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]),

        // Traffic by country
        PageVisit.aggregate([
            { $match: { visitedAt: { $gte: startDate } } },
            {
                $group: {
                    _id: '$country',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]),

        // Traffic by browser
        PageVisit.aggregate([
            { $match: { visitedAt: { $gte: startDate } } },
            {
                $group: {
                    _id: '$browser.name',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]),

        // Visits by date
        PageVisit.aggregate([
            { $match: { visitedAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitedAt' } },
                    visits: { $sum: 1 },
                    uniqueVisitors: { $addToSet: '$visitorId' }
                }
            },
            {
                $project: {
                    _id: 1,
                    visits: 1,
                    uniqueVisitors: { $size: '$uniqueVisitors' }
                }
            },
            { $sort: { _id: 1 } }
        ]),

        // Visits by hour (peak hours)
        PageVisit.aggregate([
            { $match: { visitedAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $hour: '$visitedAt' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),

        // Top pages
        PageVisit.aggregate([
            { $match: { visitedAt: { $gte: startDate } } },
            {
                $group: {
                    _id: '$page',
                    pageTitle: { $first: '$pageTitle' },
                    views: { $sum: 1 },
                    avgDuration: { $avg: '$duration' },
                    bounceRate: {
                        $avg: { $cond: ['$bounced', 1, 0] }
                    }
                }
            },
            { $sort: { views: -1 } },
            { $limit: 10 }
        ]),

        // Entry pages
        PageVisit.aggregate([
            { $match: { visitedAt: { $gte: startDate }, isEntryPage: true } },
            {
                $group: {
                    _id: '$page',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]),

        // Exit pages
        PageVisit.aggregate([
            { $match: { visitedAt: { $gte: startDate }, isExitPage: true } },
            {
                $group: {
                    _id: '$page',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]),

        // Average metrics
        PageVisit.aggregate([
            { $match: { visitedAt: { $gte: startDate } } },
            {
                $group: {
                    _id: null,
                    avgDuration: { $avg: '$duration' },
                    avgScrollDepth: { $avg: '$scrollDepth' },
                    bounceRate: { $avg: { $cond: ['$bounced', 1, 0] } }
                }
            }
        ])
    ]);

    // Calculate sessions
    const sessions = await PageVisit.distinct('sessionId', { visitedAt: { $gte: startDate } });

    res.json({
        success: true,
        data: {
            overview: {
                totalVisits,
                uniqueVisitors: uniqueVisitors.length,
                totalSessions: sessions.length,
                pagesPerSession: sessions.length > 0 ? (totalVisits / sessions.length).toFixed(2) : 0,
                avgDuration: avgMetrics[0]?.avgDuration?.toFixed(0) || 0,
                avgScrollDepth: avgMetrics[0]?.avgScrollDepth?.toFixed(0) || 0,
                bounceRate: ((avgMetrics[0]?.bounceRate || 0) * 100).toFixed(1)
            },
            trafficBySource,
            trafficByDevice,
            trafficByCountry,
            trafficByBrowser,
            visitsByDate,
            peakHours: visitsByHour,
            topPages,
            entryPages,
            exitPages
        }
    });
}));

module.exports = router;
