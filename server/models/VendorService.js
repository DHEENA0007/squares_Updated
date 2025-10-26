const mongoose = require('mongoose');

const vendorServiceSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['property_management', 'consultation', 'legal_services', 'home_loans', 'interior_design', 'moving_services', 'insurance', 'other']
  },
  subcategory: {
    type: String,
    trim: true
  },
  pricing: {
    type: {
      type: String,
      required: true,
      enum: ['fixed', 'hourly', 'percentage', 'negotiable']
    },
    amount: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR']
    },
    details: {
      type: String
    }
  },
  features: [{
    type: String
  }],
  duration: {
    type: String
  },
  availability: {
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    hours: {
      start: {
        type: String,
        default: '09:00'
      },
      end: {
        type: String,
        default: '18:00'
      }
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  },
  serviceArea: {
    cities: [{
      type: String
    }],
    radius: {
      type: Number
    },
    onlineAvailable: {
      type: Boolean,
      default: true
    }
  },
  requirements: [{
    type: String
  }],
  tags: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isPromoted: {
    type: Boolean,
    default: false
  },
  statistics: {
    totalBookings: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    responseTime: {
      type: Number,
      default: 0
    }
  },
  images: [{
    type: String
  }]
}, {
  timestamps: true
});

// Indexes for better performance
vendorServiceSchema.index({ vendorId: 1 });
vendorServiceSchema.index({ category: 1 });
vendorServiceSchema.index({ isActive: 1 });
vendorServiceSchema.index({ 'serviceArea.cities': 1 });
vendorServiceSchema.index({ tags: 1 });

// Virtual for calculating total bookings
vendorServiceSchema.virtual('bookingCount', {
  ref: 'ServiceBooking',
  localField: '_id',
  foreignField: 'serviceId',
  count: true
});

// Method to update statistics
vendorServiceSchema.methods.updateStatistics = async function() {
  const ServiceBooking = require('./ServiceBooking');
  const Review = require('./Review');
  
  try {
    const [bookings, reviews] = await Promise.all([
      ServiceBooking.find({ serviceId: this._id }),
      Review.find({ serviceId: this._id, reviewType: 'service' })
    ]);
    
    this.statistics.totalBookings = bookings.length;
    this.statistics.totalRevenue = bookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
    
    if (reviews.length > 0) {
      this.statistics.averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    }
    
    const completedBookings = bookings.filter(b => b.status === 'completed');
    this.statistics.completionRate = bookings.length > 0 ? (completedBookings.length / bookings.length) * 100 : 0;
    
    await this.save();
  } catch (error) {
    console.error('Error updating service statistics:', error);
  }
};

module.exports = mongoose.model('VendorService', vendorServiceSchema);