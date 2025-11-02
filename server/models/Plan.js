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
    enum: ['monthly', 'yearly', 'lifetime', 'one-time']
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
      default: 0 // 0 means unlimited
    },
    featuredListings: {
      type: Number,
      default: 0
    },
    photos: {
      type: Number,
      default: 10
    },
    videoTours: {
      type: Number,
      default: 0
    },
    videos: {
      type: Number,
      default: 0 // Number of videos allowed
    },
    leads: {
      type: Number,
      default: 0 // Monthly lead limit
    },
    posters: {
      type: Number,
      default: 0 // Number of promotional posters
    },
    topRated: {
      type: Boolean,
      default: false // Show as top rated in website
    },
    verifiedBadge: {
      type: Boolean,
      default: false // Show verified owner badge
    },
    messages: {
      type: Number,
      default: 0 // Monthly message limit
    },
    marketingManager: {
      type: Boolean,
      default: false // Access to marketing manager consultation
    },
    commissionBased: {
      type: Boolean,
      default: false // Commission-based revenue model
    },
    support: {
      type: String,
      enum: ['none', 'email', 'priority', 'phone', 'dedicated'],
      default: 'email'
    },
    leadManagement: {
      type: String,
      enum: ['none', 'basic', 'advanced', 'premium', 'enterprise'],
      default: 'basic'
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

// Method to update price with tracking
planSchema.methods.updatePrice = function(newPrice, userId, reason) {
  const oldPrice = this.price;
  this.price = newPrice;
  this.priceHistory.push({
    price: newPrice,
    changedAt: new Date(),
    changedBy: userId,
    reason: reason || `Price changed from ${oldPrice} to ${newPrice}`
  });
  return this.save();
};

// Method to add/update feature with tracking
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
  
  return this.save();
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