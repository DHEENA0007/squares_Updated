const mongoose = require('mongoose');

const pageVisitSchema = new mongoose.Schema({
    // Page information
    page: {
        type: String,
        required: true,
        index: true
    },
    pageTitle: String,
    pageType: {
        type: String,
        enum: ['home', 'property', 'search', 'profile', 'auth', 'dashboard', 'admin', 'other'],
        default: 'other'
    },

    // User identification
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    visitorId: {
        type: String,
        index: true
    },

    // Traffic source
    referrer: {
        type: String,
        default: ''
    },
    referrerDomain: {
        type: String,
        default: 'Direct'
    },
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String,

    // Device & Browser info
    userAgent: String,
    deviceType: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'unknown'],
        default: 'unknown'
    },
    browser: {
        name: String,
        version: String
    },
    os: {
        name: String,
        version: String
    },
    screenResolution: String,
    language: String,

    // Location (derived from IP)
    ipAddress: String,
    country: String,
    region: String,
    city: String,

    // Timing
    visitedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    duration: {
        type: Number,
        default: 0
    },

    // Engagement
    scrollDepth: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    interactions: {
        clicks: { type: Number, default: 0 },
        formSubmissions: { type: Number, default: 0 },
        downloads: { type: Number, default: 0 }
    },
    bounced: {
        type: Boolean,
        default: true
    },

    // Entry/Exit tracking
    isEntryPage: {
        type: Boolean,
        default: false
    },
    isExitPage: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Compound indexes for analytics queries
pageVisitSchema.index({ visitedAt: -1, pageType: 1 });
pageVisitSchema.index({ sessionId: 1, visitedAt: 1 });
pageVisitSchema.index({ referrerDomain: 1, visitedAt: -1 });
pageVisitSchema.index({ deviceType: 1, visitedAt: -1 });
pageVisitSchema.index({ country: 1, visitedAt: -1 });

module.exports = mongoose.model('PageVisit', pageVisitSchema);
