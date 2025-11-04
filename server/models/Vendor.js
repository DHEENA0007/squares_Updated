const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  // Reference to User account
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    sparse: true
  },
  
  // Business Information
  businessInfo: {
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    businessType: {
      type: String,
      enum: ['real_estate_agent', 'property_developer', 'construction_company', 'interior_designer', 'legal_services', 'home_loan_provider', 'packers_movers', 'property_management', 'other'],
      default: 'real_estate_agent'
    },
    licenseNumber: {
      type: String,
      sparse: true,
      trim: true
    },
    gstNumber: {
      type: String,
      sparse: true,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
        },
        message: 'Invalid GST number format'
      }
    },
    panNumber: {
      type: String,
      sparse: true,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
        },
        message: 'Invalid PAN number format'
      }
    },
    registrationNumber: {
      type: String,
      sparse: true,
      trim: true
    },
    website: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Invalid website URL'
      }
    }
  },

  // Professional Information
  professionalInfo: {
    experience: {
      type: Number,
      min: 0,
      max: 50,
      default: 0
    },
    specializations: [{
      type: String,
      enum: [
        'residential_sale',
        'residential_rent',
        'commercial_sale',
        'commercial_rent',
        'plots_land',
        'luxury_properties',
        'affordable_housing',
        'investment_properties',
        'property_management',
        'real_estate_consulting'
      ]
    }],
    serviceAreas: [{
      city: String,
      state: String,
      district: String,
      country: {
        type: String,
        default: 'India'
      },
      countryCode: {
        type: String,
        default: 'IN'
      },
      stateCode: String,
      districtCode: String,
      cityCode: String,
      pincode: String,
      locality: String
    }],
    languages: [{
      type: String,
      enum: ['english', 'hindi', 'marathi', 'gujarati', 'tamil', 'telugu', 'kannada', 'malayalam', 'bengali', 'punjabi', 'other']
    }],
    certifications: [{
      name: {
        type: String,
        required: true
      },
      issuedBy: {
        type: String,
        required: true
      },
      issueDate: Date,
      expiryDate: Date,
      certificateNumber: String,
      isVerified: {
        type: Boolean,
        default: false
      },
      verificationDate: Date,
      documentUrl: String
    }]
  },

  // Contact and Address
  contactInfo: {
    officeAddress: {
      street: String,
      area: String,
      city: String,
      state: String,
      district: String,
      country: {
        type: String,
        default: 'India'
      },
      countryCode: {
        type: String,
        default: 'IN'
      },
      stateCode: String,
      districtCode: String,
      cityCode: String,
      pincode: String,
      landmark: String
    },
    officePhone: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^[\+]?[0-9\s\-\(\)]{7,15}$/.test(v);
        },
        message: 'Invalid phone number'
      }
    },
    whatsappNumber: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^[\+]?[0-9\s\-\(\)]{7,15}$/.test(v);
        },
        message: 'Invalid WhatsApp number'
      }
    },
    socialMedia: {
      facebook: String,
      instagram: String,
      linkedin: String,
      twitter: String,
      youtube: String
    }
  },

  // Performance and Analytics
  performance: {
    rating: {
      average: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
      },
      count: {
        type: Number,
        default: 0
      },
      breakdown: {
        five: { type: Number, default: 0 },
        four: { type: Number, default: 0 },
        three: { type: Number, default: 0 },
        two: { type: Number, default: 0 },
        one: { type: Number, default: 0 }
      }
    },
    statistics: {
      totalProperties: {
        type: Number,
        default: 0
      },
      activeListing: {
        type: Number,
        default: 0
      },
      soldProperties: {
        type: Number,
        default: 0
      },
      rentedProperties: {
        type: Number,
        default: 0
      },
      totalViews: {
        type: Number,
        default: 0
      },
      totalLeads: {
        type: Number,
        default: 0
      },
      totalClients: {
        type: Number,
        default: 0
      },
      responseTime: {
        average: {
          type: Number, // in minutes
          default: 0
        },
        lastCalculated: Date
      }
    },
    achievements: [{
      title: String,
      description: String,
      earnedDate: Date,
      badgeUrl: String
    }]
  },

  // Business Settings and Preferences
  settings: {
    notifications: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      smsNotifications: {
        type: Boolean,
        default: true
      },
      leadAlerts: {
        type: Boolean,
        default: true
      },
      marketingEmails: {
        type: Boolean,
        default: false
      },
      weeklyReports: {
        type: Boolean,
        default: true
      },
      reviewAlerts: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      showContactInfo: {
        type: Boolean,
        default: true
      },
      showPerformanceStats: {
        type: Boolean,
        default: true
      },
      allowDirectContact: {
        type: Boolean,
        default: true
      }
    },
    businessHours: {
      monday: { open: String, close: String, isOpen: Boolean },
      tuesday: { open: String, close: String, isOpen: Boolean },
      wednesday: { open: String, close: String, isOpen: Boolean },
      thursday: { open: String, close: String, isOpen: Boolean },
      friday: { open: String, close: String, isOpen: Boolean },
      saturday: { open: String, close: String, isOpen: Boolean },
      sunday: { open: String, close: String, isOpen: Boolean }
    },
    autoResponder: {
      enabled: {
        type: Boolean,
        default: false
      },
      message: String,
      onlyAfterHours: {
        type: Boolean,
        default: true
      }
    }
  },

  // Verification and Status
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationDate: Date,
    verificationLevel: {
      type: String,
      enum: ['none', 'basic', 'premium', 'enterprise'],
      default: 'none'
    },
    documents: [{
      type: {
        type: String,
        enum: ['identity', 'address', 'business_license', 'gst_certificate', 'pan_card', 'other'],
        required: true
      },
      name: String,
      url: String,
      status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
      },
      uploadDate: {
        type: Date,
        default: Date.now
      },
      verificationDate: Date,
      rejectionReason: String
    }]
  },

  // Approval System
  approval: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'under_review'],
      default: 'pending'
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvalNotes: String,
    rejectionReason: String,
    requiredDocuments: [{
      type: String,
      enum: ['identity_proof', 'address_proof', 'business_license', 'gst_certificate', 'pan_card', 'bank_statement', 'other']
    }],
    submittedDocuments: [{
      documentType: {
        type: String,
        enum: ['identity_proof', 'address_proof', 'business_license', 'gst_certificate', 'pan_card', 'bank_statement', 'other'],
        required: true
      },
      documentName: String,
      documentUrl: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      },
      verified: {
        type: Boolean,
        default: false
      },
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rejectionReason: String
    }]
  },

  // Status and Membership
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_verification', 'banned', 'pending_approval', 'rejected'],
    default: 'pending_approval'
  },
  memberSince: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  suspensionReason: String,
  suspensionDate: Date,
  reactivationDate: Date,

  // Financial Information
  financial: {
    accountDetails: {
      bankName: String,
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
      branchName: String
    },
    billingAddress: {
      isSameAsOffice: {
        type: Boolean,
        default: true
      },
      street: String,
      area: String,
      city: String,
      state: String,
      district: String,
      country: String,
      countryCode: String,
      stateCode: String,
      districtCode: String,
      cityCode: String,
      pincode: String
    }
  },

  // SEO and Marketing
  seo: {
    slug: {
      type: String,
      sparse: true
    },
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },

  // Additional Data
  metadata: {
    source: {
      type: String,
      enum: ['website', 'mobile_app', 'admin', 'migration'],
      default: 'website'
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor'
    },
    notes: String, // Admin notes
    tags: [String] // For categorization and filtering
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive information from JSON output
      if (ret.financial) {
        delete ret.financial.accountDetails;
      }
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual for full business name
vendorSchema.virtual('fullBusinessName').get(function() {
  return this.businessInfo.companyName || 'Unknown Business';
});

// Virtual for location string
vendorSchema.virtual('locationString').get(function() {
  const addr = this.contactInfo.officeAddress;
  if (!addr.city && !addr.state) return 'Location not provided';
  return `${addr.city || ''}${addr.city && addr.state ? ', ' : ''}${addr.state || ''}`;
});

// Virtual for verification status
vendorSchema.virtual('isFullyVerified').get(function() {
  return this.verification.isVerified && 
         this.verification.verificationLevel !== 'none' &&
         this.status === 'active';
});

// Indexes for better query performance
vendorSchema.index({ user: 1 }, { unique: true });
vendorSchema.index({ status: 1 });
vendorSchema.index({ 'verification.isVerified': 1 });
vendorSchema.index({ 'businessInfo.licenseNumber': 1 }, { unique: true, sparse: true });
vendorSchema.index({ 'businessInfo.gstNumber': 1 }, { unique: true, sparse: true });
vendorSchema.index({ 'businessInfo.panNumber': 1 }, { unique: true, sparse: true });
vendorSchema.index({ 'professionalInfo.serviceAreas.city': 1 });
vendorSchema.index({ 'professionalInfo.specializations': 1 });
vendorSchema.index({ 'performance.rating.average': -1 });
vendorSchema.index({ createdAt: -1 });
vendorSchema.index({ 'seo.slug': 1 }, { unique: true, sparse: true });

// Pre-save middleware
vendorSchema.pre('save', async function(next) {
  try {
    // Generate slug if not exists
    if (!this.seo.slug && this.businessInfo.companyName) {
      const baseSlug = this.businessInfo.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      let slug = baseSlug;
      let counter = 1;
      
      // Ensure unique slug
      while (await this.constructor.findOne({ 'seo.slug': slug, _id: { $ne: this._id } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      this.seo.slug = slug;
    }

    // Update lastActive timestamp when relevant fields change
    if (this.isModified('status') || this.isModified('performance')) {
      this.lastActive = new Date();
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Methods
vendorSchema.methods.updateRating = function(newRating) {
  const rating = this.performance.rating;
  const oldAverage = rating.average;
  const oldCount = rating.count;
  
  // Update breakdown
  rating.breakdown[getRatingKey(newRating)]++;
  
  // Calculate new average
  const newCount = oldCount + 1;
  const newAverage = ((oldAverage * oldCount) + newRating) / newCount;
  
  rating.average = Math.round(newAverage * 10) / 10;
  rating.count = newCount;
  
  return this.save();
};

vendorSchema.methods.updateStatistics = function(updates) {
  Object.keys(updates).forEach(key => {
    if (this.performance.statistics[key] !== undefined) {
      this.performance.statistics[key] = updates[key];
    }
  });
  return this.save();
};

vendorSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    user: this.user,
    businessInfo: {
      companyName: this.businessInfo.companyName,
      businessType: this.businessInfo.businessType,
      website: this.businessInfo.website
    },
    professionalInfo: {
      experience: this.professionalInfo.experience,
      specializations: this.professionalInfo.specializations,
      serviceAreas: this.professionalInfo.serviceAreas,
      languages: this.professionalInfo.languages
    },
    contactInfo: this.settings.privacy.showContactInfo ? this.contactInfo : {},
    performance: this.settings.privacy.showPerformanceStats ? this.performance : {},
    verification: {
      isVerified: this.verification.isVerified,
      verificationLevel: this.verification.verificationLevel
    },
    status: this.status,
    memberSince: this.memberSince,
    seo: this.seo
  };
};

// Helper function for rating breakdown
function getRatingKey(rating) {
  const ratingMap = { 5: 'five', 4: 'four', 3: 'three', 2: 'two', 1: 'one' };
  return ratingMap[Math.floor(rating)] || 'one';
}

// Static methods
vendorSchema.statics.findByUserId = function(userId) {
  return this.findOne({ user: userId }).populate('user', '-password -verificationToken');
};

vendorSchema.statics.findActiveVendors = function(filters = {}) {
  return this.find({ 
    status: 'active', 
    'verification.isVerified': true,
    ...filters 
  }).populate('user', 'email profile.firstName profile.lastName profile.avatar');
};

vendorSchema.statics.searchVendors = function(searchParams) {
  const {
    location,
    specialization,
    rating,
    experience,
    verified,
    page = 1,
    limit = 10
  } = searchParams;

  const query = { status: 'active' };
  
  if (location) {
    query.$or = [
      { 'contactInfo.officeAddress.city': new RegExp(location, 'i') },
      { 'contactInfo.officeAddress.state': new RegExp(location, 'i') },
      { 'professionalInfo.serviceAreas.city': new RegExp(location, 'i') }
    ];
  }
  
  if (specialization) {
    query['professionalInfo.specializations'] = specialization;
  }
  
  if (rating) {
    query['performance.rating.average'] = { $gte: rating };
  }
  
  if (experience) {
    query['professionalInfo.experience'] = { $gte: experience };
  }
  
  if (verified) {
    query['verification.isVerified'] = true;
  }

  return this.find(query)
    .populate('user', 'email profile.firstName profile.lastName profile.avatar')
    .sort({ 'performance.rating.average': -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

module.exports = mongoose.model('Vendor', vendorSchema);