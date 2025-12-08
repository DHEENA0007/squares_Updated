const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    required: true,
    default: 'customer'
  },
  rolePages: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'inactive'],
    default: 'pending'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: null
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  profile: {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      sparse: true
    },
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      default: null
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    phoneVerified: {
      type: Boolean,
      default: false
    },
    lastLogin: {
      type: Date,
      default: null
    },
    preferences: {
      currency: {
        type: String,
        enum: ['INR', 'USD', 'EUR', 'GBP'],
        default: 'INR'
      },
      language: {
        type: String,
        enum: ['en', 'hi', 'mr', 'ta', 'te', 'kn', 'ml', 'bn', 'pa'],
        default: 'en'
      },
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
        desktop: { type: Boolean, default: true },
        sound: { type: Boolean, default: true },
        typing: { type: Boolean, default: true }
      },
      privacy: {
        showEmail: { type: Boolean, default: false },
        showPhone: { type: Boolean, default: false }
      }
    }
  },

  // Reference to vendor profile if user is an agent
  vendorProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Virtual for full name
userSchema.virtual('profile.fullName').get(function () {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile
userSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    email: this.email,
    role: this.role,
    status: this.status,
    profile: {
      firstName: this.profile.firstName,
      lastName: this.profile.lastName,
      avatar: this.profile.avatar,
      bio: this.profile.bio
    },
    createdAt: this.createdAt
  };
};

// Method to get vendor profile if user is an agent
userSchema.methods.getVendorProfile = async function () {
  if (this.role !== 'agent' || !this.vendorProfile) {
    return null;
  }

  const Vendor = require('./Vendor');
  return await Vendor.findById(this.vendorProfile);
};

// Method to check if user is a vendor
userSchema.methods.isVendor = function () {
  return this.role === 'agent' && this.vendorProfile;
};

module.exports = mongoose.model('User', userSchema);