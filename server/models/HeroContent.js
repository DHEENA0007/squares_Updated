const mongoose = require('mongoose');

// Hero Section Slide Schema
const heroSlideSchema = new mongoose.Schema({
    tabKey: {
        type: String,
        required: true,
        enum: ['buy', 'rent', 'lease', 'commercial'],
        unique: true,
    },
    title: {
        type: String,
        required: true,
        default: 'Find Your Dream Home',
    },
    description: {
        type: String,
        required: true,
        default: 'Discover the perfect property',
    },
    imageUrl: {
        type: String,
        required: true,
    },
    badge: {
        text: {
            type: String,
            default: "India's Leading Property Platform",
        },
        isVisible: {
            type: Boolean,
            default: true,
        },
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    displayOrder: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

// Hero Content Settings Schema - for general settings
const heroSettingsSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: 'hero_settings',
    },
    autoSlide: {
        type: Boolean,
        default: false,
    },
    autoSlideInterval: {
        type: Number,
        default: 5000, // milliseconds
    },
    showSearchBox: {
        type: Boolean,
        default: true,
    },
    showSellDropdown: {
        type: Boolean,
        default: true,
    },
    showFilters: {
        type: Boolean,
        default: true,
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});

// Selling Option Schema for the dropdown
const sellingOptionSchema = new mongoose.Schema({
    optionId: {
        type: String,
        required: true,
        unique: true,
    },
    label: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    icon: {
        type: String,
        required: true,
        enum: ['Plus', 'Calculator', 'List', 'Settings', 'Home', 'Building', 'MapPin'],
    },
    action: {
        type: String,
        required: true,
        enum: ['post-property', 'property-valuation', 'quick-listing', 'manage-properties', 'contact'],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    displayOrder: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

// Static method to get or create hero settings
heroSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findById('hero_settings');

    if (!settings) {
        settings = await this.create({
            _id: 'hero_settings',
        });
    }

    return settings;
};

// Static method to get default hero slides
heroSlideSchema.statics.getDefaultSlides = function () {
    return [
        {
            tabKey: 'buy',
            title: 'Find Your Dream Home',
            description: 'Discover the perfect property to purchase across India with our comprehensive platform',
            imageUrl: '/assets/Buy.jpg',
            badge: { text: "India's Leading Property Platform", isVisible: true },
            isActive: true,
            displayOrder: 0,
        },
        {
            tabKey: 'rent',
            title: 'Discover Rental Properties',
            description: "Find comfortable and affordable rental homes across India's prime locations",
            imageUrl: '/assets/Rent.jpg',
            badge: { text: "India's Leading Property Platform", isVisible: true },
            isActive: true,
            displayOrder: 1,
        },
        {
            tabKey: 'lease',
            title: 'Lease Properties with Ease',
            description: 'Explore premium lease options for residential and commercial properties',
            imageUrl: '/assets/Lease.jpg',
            badge: { text: "India's Leading Property Platform", isVisible: true },
            isActive: true,
            displayOrder: 2,
        },
        {
            tabKey: 'commercial',
            title: 'Commercial Real Estate Hub',
            description: "Find the ideal commercial space for your business across India's business districts",
            imageUrl: '/assets/commercial.jpg',
            badge: { text: "India's Leading Property Platform", isVisible: true },
            isActive: true,
            displayOrder: 3,
        },
    ];
};

// Static method to get default selling options
sellingOptionSchema.statics.getDefaultOptions = function () {
    return [
        {
            optionId: 'post-property',
            label: 'Post Property',
            description: 'List your property for sale or rent',
            icon: 'Plus',
            action: 'post-property',
            isActive: true,
            displayOrder: 0,
        },
        {
            optionId: 'property-valuation',
            label: 'Property Valuation',
            description: 'Get your property valued by experts',
            icon: 'Calculator',
            action: 'property-valuation',
            isActive: true,
            displayOrder: 1,
        },
        {
            optionId: 'quick-listing',
            label: 'Quick Listing',
            description: 'Fast-track your property listing',
            icon: 'List',
            action: 'quick-listing',
            isActive: true,
            displayOrder: 2,
        },
        {
            optionId: 'manage-properties',
            label: 'Manage Properties',
            description: 'View and manage your listings',
            icon: 'Settings',
            action: 'manage-properties',
            isActive: true,
            displayOrder: 3,
        },
    ];
};

// Create indexes
heroSlideSchema.index({ tabKey: 1, isActive: 1 });
sellingOptionSchema.index({ optionId: 1, isActive: 1 });

const HeroSlide = mongoose.model('HeroSlide', heroSlideSchema);
const HeroSettings = mongoose.model('HeroSettings', heroSettingsSchema);
const SellingOption = mongoose.model('SellingOption', sellingOptionSchema);

module.exports = {
    HeroSlide,
    HeroSettings,
    SellingOption,
};
