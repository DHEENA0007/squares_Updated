const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  attempts: {
    type: Number,
    default: 1
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedUntil: {
    type: Date,
    default: null
  },
  lastAttempt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

loginAttemptSchema.index({ email: 1, ipAddress: 1 });
loginAttemptSchema.index({ lockedUntil: 1 });

loginAttemptSchema.methods.isCurrentlyLocked = function() {
  if (!this.isLocked) return false;
  if (!this.lockedUntil) return false;
  
  const now = new Date();
  if (now < this.lockedUntil) {
    return true;
  }
  
  // Lock has expired, reset
  this.isLocked = false;
  this.lockedUntil = null;
  this.attempts = 0;
  return false;
};

loginAttemptSchema.methods.getRemainingLockTime = function() {
  if (!this.isLocked || !this.lockedUntil) return 0;
  
  const now = new Date();
  const remaining = Math.max(0, this.lockedUntil - now);
  return Math.ceil(remaining / 1000 / 60); // Return minutes
};

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
