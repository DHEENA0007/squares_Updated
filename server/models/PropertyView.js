const mongoose = require('mongoose');

const propertyViewSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
    index: true
  },
  viewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sessionId: {
    type: String,
    index: true
  },
  ipAddress: String,
  userAgent: String,
  referrer: String,
  viewedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  viewDuration: {
    type: Number,
    default: 0
  },
  interactions: {
    clickedPhone: { type: Boolean, default: false },
    clickedMessage: { type: Boolean, default: false },
    sharedProperty: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

propertyViewSchema.index({ property: 1, viewedAt: -1 });
propertyViewSchema.index({ property: 1, viewer: 1 });

module.exports = mongoose.model('PropertyView', propertyViewSchema);
