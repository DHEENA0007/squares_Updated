const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['promotional', 'informational', 'alert', 'system', 'reminder'],
    default: 'informational'
  },
  targetAudience: {
    type: String,
    required: true,
    enum: [
      'all_users',
      'customers',
      'vendors',
      'active_users',
      'premium_users',
      'city_specific',
      'custom'
    ]
  },
  channels: [{
    type: String,
    enum: ['push', 'email', 'sms', 'in_app'],
    required: true
  }],
  recipients: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    delivered: {
      type: Boolean,
      default: false
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    opened: {
      type: Boolean,
      default: false
    },
    openedAt: {
      type: Date,
      default: null
    },
    clicked: {
      type: Boolean,
      default: false
    },
    clickedAt: {
      type: Date,
      default: null
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'],
    default: 'draft'
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  scheduledDate: {
    type: Date,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  statistics: {
    totalRecipients: {
      type: Number,
      default: 0
    },
    delivered: {
      type: Number,
      default: 0
    },
    opened: {
      type: Number,
      default: 0
    },
    clicked: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    deliveryRate: {
      type: Number,
      default: 0
    },
    openRate: {
      type: Number,
      default: 0
    },
    clickRate: {
      type: Number,
      default: 0
    }
  },
  settings: {
    cityFilter: [String],
    userTypeFilter: [String],
    customFilters: mongoose.Schema.Types.Mixed
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  attachments: [{
    filename: String,
    url: String,
    type: String
  }],
  metadata: {
    campaignId: String,
    tags: [String],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  }
}, {
  timestamps: true
});

// Calculate statistics before saving
notificationSchema.pre('save', function(next) {
  if (this.recipients && this.recipients.length > 0) {
    this.statistics.totalRecipients = this.recipients.length;
    this.statistics.delivered = this.recipients.filter(r => r.delivered).length;
    this.statistics.opened = this.recipients.filter(r => r.opened).length;
    this.statistics.clicked = this.recipients.filter(r => r.clicked).length;
    
    if (this.statistics.totalRecipients > 0) {
      this.statistics.deliveryRate = (this.statistics.delivered / this.statistics.totalRecipients) * 100;
      this.statistics.openRate = (this.statistics.opened / this.statistics.delivered) * 100;
      this.statistics.clickRate = (this.statistics.clicked / this.statistics.opened) * 100;
    }
  }
  next();
});

// Index for efficient queries
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ sentBy: 1 });
notificationSchema.index({ targetAudience: 1 });
notificationSchema.index({ scheduledDate: 1, status: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
