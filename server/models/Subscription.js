const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  // Snapshot of plan details at the time of subscription
  // This ensures existing subscriptions are not affected when superadmin updates plans
  planSnapshot: {
    name: String,
    description: String,
    price: Number,
    currency: String,
    billingPeriod: String,
    features: [{
      name: String,
      description: String,
      enabled: Boolean
    }],
    limits: {
      properties: Number,
      featuredListings: Number,
      photos: Number,
      videoTours: Number,
      videos: Number,
      leads: Number,
      posters: Number,
      topRated: Boolean,
      verifiedBadge: Boolean,
      messages: Number,
      marketingManager: Boolean,
      commissionBased: Boolean,
      support: String,
      leadManagement: String
    }
  },
  addons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AddonService'
  }],
  addonDetails: [{
    addonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AddonService',
      required: true
    },
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    expiryDate: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    },
    billingCycleMonths: {
      type: Number,
      default: 1
    }
  }],
  // Snapshot of addon details at subscription time
  addonsSnapshot: [{
    addonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AddonService'
    },
    name: String,
    description: String,
    price: Number,
    currency: String,
    category: String,
    billingType: String,
    billingPeriod: String,
    billingCycleMonths: Number,
    limits: mongoose.Schema.Types.Mixed
  }],
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending'],
    default: 'pending'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'razorpay'],
    required: true
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  paymentDetails: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    transactionId: String
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
  renewalAttempts: {
    type: Number,
    default: 0
  },
  lastPaymentDate: {
    type: Date
  },
  nextBillingDate: {
    type: Date
  },
  cancellationReason: {
    type: String
  },
  cancelledAt: {
    type: Date
  },
  paymentHistory: [{
    type: {
      type: String,
      enum: ['subscription_purchase', 'addon_purchase', 'renewal', 'upgrade'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    addons: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AddonService'
    }],
    paymentId: String,
    orderId: String,
    date: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ plan: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });

// Virtual to check if subscription is active
subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' && this.endDate > new Date();
});

// Virtual to check if subscription is expired
subscriptionSchema.virtual('isExpired').get(function() {
  return this.endDate <= new Date() || this.status === 'expired';
});

// Virtual to get effective plan details (snapshot if available, otherwise live plan)
subscriptionSchema.virtual('effectivePlan').get(function() {
  return this.planSnapshot || this.plan;
});

// Virtual to get effective addon details
subscriptionSchema.virtual('effectiveAddons').get(function() {
  return this.addonsSnapshot && this.addonsSnapshot.length > 0 
    ? this.addonsSnapshot 
    : this.addons;
});

// Method to calculate days remaining
subscriptionSchema.methods.getDaysRemaining = function() {
  if (this.isExpired) return 0;
  
  const now = new Date();
  const diffTime = this.endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Method to create plan snapshot at subscription time
subscriptionSchema.methods.createPlanSnapshot = async function() {
  if (!this.populated('plan')) {
    await this.populate('plan');
  }
  
  const plan = this.plan;
  if (plan && typeof plan === 'object') {
    this.planSnapshot = {
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      billingPeriod: plan.billingPeriod,
      features: plan.features ? JSON.parse(JSON.stringify(plan.features)) : [],
      limits: plan.limits ? JSON.parse(JSON.stringify(plan.limits)) : {}
    };
  }
};

// Method to create addons snapshot at subscription time
subscriptionSchema.methods.createAddonsSnapshot = async function() {
  if (this.addons && this.addons.length > 0) {
    if (!this.populated('addons')) {
      await this.populate('addons');
    }
    
    this.addonsSnapshot = this.addons.map(addon => {
      if (addon && typeof addon === 'object') {
        return {
          addonId: addon._id,
          name: addon.name,
          description: addon.description,
          price: addon.price,
          currency: addon.currency,
          category: addon.category,
          billingType: addon.billingType,
          billingPeriod: addon.billingPeriod,
          billingCycleMonths: addon.billingCycleMonths,
          limits: addon.limits ? JSON.parse(JSON.stringify(addon.limits)) : {}
        };
      }
      return null;
    }).filter(Boolean);
  }
};

// Method to renew subscription
subscriptionSchema.methods.renew = function(newEndDate, transactionId) {
  this.endDate = newEndDate;
  this.status = 'active';
  this.lastPaymentDate = new Date();
  this.transactionId = transactionId;
  this.renewalAttempts = 0;
  
  // Calculate next billing date based on plan period
  if (this.autoRenew) {
    // This would be populated with plan details to calculate next billing
    this.nextBillingDate = new Date(newEndDate);
  }
  
  return this.save();
};

// Method to cancel subscription
subscriptionSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.autoRenew = false;
  this.cancellationReason = reason;
  this.cancelledAt = new Date();
  return this.save();
};

subscriptionSchema.set('toJSON', { virtuals: true });
subscriptionSchema.set('toObject', { virtuals: true });

// Add pagination plugin
subscriptionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Subscription', subscriptionSchema);