const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  billingPeriod: {
    type: String,
    required: true,
    enum: ['custom', 'monthly', 'yearly', 'lifetime', 'one-time']
  },
  billingCycleMonths: {
    type: Number,
    min: 1,
    max: 120,
    default: 1
  },
  features: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  limits: {
    properties: {
      type: Number,
      default: null // null means unlimited (infinity), -1 and 0 supported for legacy
    },
    featuredListings: {
      type: Number,
      default: 0
    },
    photos: {
      type: Number,
      default: 10
    },
    propertyImages: {
      type: Number,
      default: 10
    },
    videoTours: {
      type: Number,
      default: 0
    },
    videos: {
      type: Number,
      default: 0
    },
    leads: {
      type: Number,
      default: 0
    },
    messages: {
      type: Number,
      default: 0
    },
    leadManagement: {
      type: String,
      enum: ['none', 'basic', 'advanced', 'premium', 'enterprise'],
      default: 'basic'
    }
  },
  benefits: {
    type: mongoose.Schema.Types.Mixed,
    default: function() {
      // Default to new array format, but support legacy object format
      return [];
    },
    validate: {
      validator: function(value) {
        // Allow both array format and legacy object format
        if (Array.isArray(value)) {
          return value.every(benefit => 
            benefit.key && benefit.name && typeof benefit.enabled === 'boolean'
          );
        }
        // Legacy object format validation
        if (typeof value === 'object' && value !== null) {
          const allowedKeys = ['topRated', 'verifiedBadge', 'marketingManager', 'commissionBased'];
          return Object.keys(value).every(key => 
            allowedKeys.includes(key) && typeof value[key] === 'boolean'
          );
        }
        return false;
      },
      message: 'Benefits must be either an array of benefit objects or legacy object format'
    }
  },
  support: {
    type: String,
    enum: ['none', 'email', 'priority', 'phone', 'dedicated'],
    default: 'email'
  },
  whatsappSupport: {
    enabled: {
      type: Boolean,
      default: false
    },
    number: {
      type: String,
      trim: true,
      default: null
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  // Price history for tracking changes
  priceHistory: [{
    price: {
      type: Number,
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  }],
  // Feature history for tracking feature changes
  featureHistory: [{
    action: {
      type: String,
      enum: ['added', 'removed', 'modified'],
      required: true
    },
    featureName: String,
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

// Middleware to track price changes
planSchema.pre('save', function(next) {
  if (this.isModified('price') && !this.isNew) {
    if (!this.priceHistory) {
      this.priceHistory = [];
    }
    this.priceHistory.push({
      price: this.price,
      changedAt: new Date()
    });
  }
  next();
});

// Method to update price with tracking (does not save - caller must save)
planSchema.methods.updatePrice = function(newPrice, userId, reason) {
  const oldPrice = this.price;
  this.price = newPrice;
  this.priceHistory.push({
    price: newPrice,
    changedAt: new Date(),
    changedBy: userId,
    reason: reason || `Price changed from ${oldPrice} to ${newPrice}`
  });
  return this;
};

// Method to add/update feature with tracking (does not save - caller must save)
planSchema.methods.updateFeature = function(featureName, action, value, userId) {
  if (!this.featureHistory) {
    this.featureHistory = [];
  }
  
  this.featureHistory.push({
    action,
    featureName,
    newValue: value,
    changedAt: new Date(),
    changedBy: userId
  });
  
  return this;
};

// Virtual for subscriber count
planSchema.virtual('subscriberCount', {
  ref: 'Subscription',
  localField: '_id',
  foreignField: 'plan',
  count: true
});

planSchema.set('toJSON', { virtuals: true });
planSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Plan', planSchema);