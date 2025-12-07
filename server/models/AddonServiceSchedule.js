const mongoose = require('mongoose');

const addonServiceScheduleSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  addon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AddonService',
    required: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  scheduledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  scheduledDate: {
    type: Date,
    default: null
  },
  completedDate: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  inProgressAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    default: null
  },
  emailSubject: {
    type: String,
    required: true
  },
  emailMessage: {
    type: String,
    required: true
  },
  vendorResponse: {
    type: String,
    default: null
  },
  notes: [{
    message: {
      type: String,
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Indexes
addonServiceScheduleSchema.index({ vendor: 1, addon: 1 });
addonServiceScheduleSchema.index({ status: 1 });
addonServiceScheduleSchema.index({ scheduledBy: 1 });
addonServiceScheduleSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AddonServiceSchedule', addonServiceScheduleSchema);
