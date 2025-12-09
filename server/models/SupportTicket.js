const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  category: {
    type: String,
    required: true,
    enum: ['technical', 'billing', 'general', 'property', 'account', 'other'],
    default: 'general'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lockedAt: {
    type: Date,
    default: null
  },
  responses: [{
    message: {
      type: String,
      required: true
    },
    author: {
      type: String,
      required: true
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  resolution: {
    type: String,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Generate ticket number
supportTicketSchema.pre('save', async function(next) {
  if (!this.ticketNumber) {
    const count = await this.constructor.countDocuments();
    this.ticketNumber = `TKT-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Update status to resolved when resolution is provided
supportTicketSchema.pre('save', function(next) {
  if (this.isModified('resolution') && this.resolution && this.status !== 'resolved') {
    this.status = 'resolved';
    this.resolvedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
