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
  addons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AddonService'
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

// Method to calculate days remaining
subscriptionSchema.methods.getDaysRemaining = function() {
  if (this.isExpired) return 0;
  
  const now = new Date();
  const diffTime = this.endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
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