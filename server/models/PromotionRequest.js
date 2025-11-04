const mongoose = require('mongoose');

const promotionRequestSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  promotionType: {
    type: String,
    required: true,
    enum: ['featured', 'premium', 'spotlight', 'top_listing', 'banner']
  },
  duration: {
    type: Number,
    required: true, // days
    min: 1,
    max: 365
  },
  requestedStartDate: {
    type: Date,
    required: true
  },
  requestedEndDate: {
    type: Date,
    required: true
  },
  actualStartDate: {
    type: Date,
    default: null
  },
  actualEndDate: {
    type: Date,
    default: null
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'expired', 'cancelled'],
    default: 'pending'
  },
  approvalNotes: {
    type: String,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  metrics: {
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    leads: {
      type: Number,
      default: 0
    }
  },
  settings: {
    targetCities: [String],
    targetAudience: String,
    displayPosition: String
  }
}, {
  timestamps: true
});

// Validate end date is after start date
promotionRequestSchema.pre('save', function(next) {
  if (this.requestedEndDate <= this.requestedStartDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

// Calculate duration automatically
promotionRequestSchema.pre('save', function(next) {
  if (this.requestedStartDate && this.requestedEndDate) {
    const diffTime = Math.abs(this.requestedEndDate - this.requestedStartDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    this.duration = diffDays;
  }
  next();
});

// Index for efficient queries
promotionRequestSchema.index({ status: 1, createdAt: -1 });
promotionRequestSchema.index({ vendor: 1 });
promotionRequestSchema.index({ property: 1 });
promotionRequestSchema.index({ promotionType: 1, status: 1 });

module.exports = mongoose.model('PromotionRequest', promotionRequestSchema);
