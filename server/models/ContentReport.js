const mongoose = require('mongoose');

const contentReportSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['image', 'review', 'property_description', 'user_profile', 'comment'],
  },
  contentId: {
    type: String,
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'inappropriate_content',
      'spam',
      'harassment',
      'fake_information',
      'copyright_violation',
      'adult_content',
      'violence',
      'hate_speech',
      'other'
    ]
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'under_review'],
    default: 'pending'
  },
  content: {
    text: String,
    images: [String],
    title: String,
    url: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  moderatorNotes: {
    type: String,
    default: null
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  moderatedAt: {
    type: Date,
    default: null
  },
  actionTaken: {
    type: String,
    enum: ['no_action', 'content_removed', 'user_warned', 'user_suspended', 'content_edited'],
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Index for efficient queries
contentReportSchema.index({ status: 1, createdAt: -1 });
contentReportSchema.index({ reportedBy: 1 });
contentReportSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('ContentReport', contentReportSchema);
