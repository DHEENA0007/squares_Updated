const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: false // Not required for admin messages
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: false // Will use 'content' for admin messages
  },
  // Admin message fields
  subject: {
    type: String
  },
  content: {
    type: String
  },
  type: {
    type: String,
    enum: ['inquiry', 'lead', 'property_inquiry', 'general', 'support', 'complaint'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'replied', 'archived', 'flagged'],
    default: 'unread'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  parentMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'document'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    size: {
      type: Number
    }
  }],
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  repliedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Validation: Either message or content must be provided
messageSchema.pre('save', function() {
  if (!this.message && !this.content) {
    throw new Error('Either message or content must be provided');
  }
});

// Indexes
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ recipient: 1 });

module.exports = mongoose.model('Message', messageSchema);