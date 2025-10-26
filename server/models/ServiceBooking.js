const mongoose = require('mongoose');

const serviceBookingSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorService',
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  },
  bookingDate: {
    type: Date,
    required: true
  },
  serviceDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in hours
    default: 1
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: String
  },
  notes: {
    type: String
  },
  clientNotes: {
    type: String
  },
  vendorNotes: {
    type: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  contactInfo: {
    phone: String,
    email: String,
    preferredContactMethod: {
      type: String,
      enum: ['phone', 'email', 'whatsapp'],
      default: 'phone'
    }
  },
  timeline: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  documents: [{
    name: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: {
    type: String
  },
  reviewDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
serviceBookingSchema.index({ serviceId: 1 });
serviceBookingSchema.index({ vendorId: 1 });
serviceBookingSchema.index({ clientId: 1 });
serviceBookingSchema.index({ status: 1 });
serviceBookingSchema.index({ serviceDate: 1 });
serviceBookingSchema.index({ bookingDate: 1 });

// Middleware to update service statistics when booking status changes
serviceBookingSchema.post('save', async function() {
  try {
    const VendorService = require('./VendorService');
    const service = await VendorService.findById(this.serviceId);
    if (service) {
      await service.updateStatistics();
    }
  } catch (error) {
    console.error('Error updating service statistics after booking save:', error);
  }
});

module.exports = mongoose.model('ServiceBooking', serviceBookingSchema);