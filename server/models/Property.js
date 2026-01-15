const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'rented', 'leased', 'pending', 'rejected'],
    default: 'pending'
  },
  listingType: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  area: {
    builtUp: Number,
    carpet: Number,
    plot: Number,
    unit: {
      type: String,
      enum: ['sqft', 'sqm', 'acre'],
      default: 'sqft'
    }
  },
  bedrooms: {
    type: Number,
    default: 0
  },
  bathrooms: {
    type: Number,
    default: 0
  },
  furnishing: {
    type: String
  },
  age: {
    type: String
  },
  floor: String,
  totalFloors: String,
  facing: {
    type: String
  },
  parkingSpaces: String,
  priceNegotiable: {
    type: Boolean,
    default: false
  },
  maintenanceCharges: Number,
  securityDeposit: Number,
  availability: String,
  possession: String,
  // Land/Plot specific fields
  roadWidth: String,
  cornerPlot: String,
  plotType: String,
  landType: String,
  boundaryWall: String,
  areaUnit: String,
  commercialType: String,
  cabins: Number,
  workstations: Number,
  foodAvailability: String,
  gender: String,
  address: {
    street: {
      type: String,
      required: true
    },
    district: {
      type: String
    },
    city: {
      type: String,
      required: true
    },
    taluk: {
      type: String
    },
    locationName: {
      type: String
    },
    state: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  amenities: [{
    type: String
  }],
  images: [{
    url: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  videos: [{
    url: String,
    caption: String,
    thumbnail: String
  }],
  virtualTour: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Reference to vendor if property is listed by an agent/vendor
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  views: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  // Approval tracking
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  // Property assignment tracking (when sold/rented/leased)
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignmentNotes: {
    type: String
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  modifiedAt: {
    type: Date
  },
  // Admin property owner information
  ownerType: {
    type: String,
    enum: ['admin', 'client'],
    default: 'admin'
  },
  clientName: {
    type: String,
    trim: true
  },
  // Free listing expiration tracking
  isFreeListing: {
    type: Boolean,
    default: false
  },
  freeListingExpiresAt: {
    type: Date
  },
  // Archive tracking
  archived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  },
  archivedReason: {
    type: String
  },
  // Dynamic custom fields from property type configuration
  customFields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
propertySchema.index({ 'address.city': 1, type: 1, listingType: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ owner: 1 });
propertySchema.index({ vendor: 1 });
propertySchema.index({ agent: 1 });
propertySchema.index({ featured: 1 });
propertySchema.index({ archived: 1 });
propertySchema.index({ isFreeListing: 1, freeListingExpiresAt: 1 });

// Pre-save middleware to set vendor reference
propertySchema.pre('save', async function(next) {
  try {
    // If owner is changed and no vendor is set, check if owner is an agent
    if (this.isModified('owner') && !this.vendor) {
      const User = require('./User');
      const Vendor = require('./Vendor');
      
      const user = await User.findById(this.owner);
      if (user && user.role === 'agent') {
        const vendor = await Vendor.findByUserId(this.owner);
        if (vendor) {
          this.vendor = vendor._id;
          this.agent = this.owner; // Set agent field as well for backward compatibility
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual for primary image
propertySchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images.length > 0 ? this.images[0].url : null);
});

module.exports = mongoose.model('Property', propertySchema);