const mongoose = require('mongoose');

const userNotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'general',
      'property_alert',
      'price_alert',
      'property_update',
      'new_message',
      'service_update',
      'lead_alert',
      'inquiry_received',
      'weekly_report',
      'business_update',
      'system',
      'admin_broadcast',
      'promotional',
      'announcement'
    ],
    default: 'general'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  delivered: {
    type: Boolean,
    default: false,
    index: true
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
userNotificationSchema.index({ user: 1, delivered: 1, createdAt: -1 });
userNotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
userNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

module.exports = mongoose.model('UserNotification', userNotificationSchema);
