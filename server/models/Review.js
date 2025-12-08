const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    default: null
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AddonService',
    default: null
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  reviewType: {
    type: String,
    enum: ['property', 'service', 'general'],
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  helpfulVotes: {
    type: Number,
    default: 0
  },
  unhelpfulVotes: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  images: [{
    url: String,
    caption: String
  }],
  vendorResponse: {
    message: {
      type: String,
      trim: true,
      maxlength: 500
    },
    respondedAt: {
      type: Date
    },
    respondedBy: {
      type: String,
      trim: true
    },
    respondedByRole: {
      type: String,
      trim: true
    }
  },
  // Track who found this review helpful/unhelpful
  helpfulBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  unhelpfulBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['active', 'hidden', 'reported', 'deleted'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes for better performance
reviewSchema.index({ vendor: 1, createdAt: -1 });
reviewSchema.index({ client: 1, createdAt: -1 });
reviewSchema.index({ property: 1 });
reviewSchema.index({ service: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ reviewType: 1 });
reviewSchema.index({ isPublic: 1, status: 1 });

// Ensure a client can only review a vendor once per property/service
reviewSchema.index({ vendor: 1, client: 1, property: 1 }, { unique: true, sparse: true });
reviewSchema.index({ vendor: 1, client: 1, service: 1 }, { unique: true, sparse: true });

// Virtual for getting vendor info
reviewSchema.virtual('vendorInfo', {
  ref: 'User',
  localField: 'vendor',
  foreignField: '_id',
  justOne: true
});

// Virtual for getting client info
reviewSchema.virtual('clientInfo', {
  ref: 'User',
  localField: 'client',
  foreignField: '_id',
  justOne: true
});

// Virtual for getting property info
reviewSchema.virtual('propertyInfo', {
  ref: 'Property',
  localField: 'property',
  foreignField: '_id',
  justOne: true
});

// Virtual for getting service info
reviewSchema.virtual('serviceInfo', {
  ref: 'AddonService',
  localField: 'service',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to update vendor rating
reviewSchema.post('save', async function() {
  try {
    const Review = this.constructor;
    const User = mongoose.model('User');
    
    // Calculate new average rating for the vendor
    const stats = await Review.aggregate([
      { $match: { vendor: this.vendor, status: 'active' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0) {
      const { averageRating, totalReviews } = stats[0];
      
      // Update vendor's rating info
      await User.findByIdAndUpdate(this.vendor, {
        $set: {
          'profile.vendorInfo.rating.average': Math.round(averageRating * 10) / 10,
          'profile.vendorInfo.rating.count': totalReviews
        }
      });
    }
  } catch (error) {
    console.error('Error updating vendor rating:', error);
  }
});

// Static method to get vendor review stats
reviewSchema.statics.getVendorStats = function(vendorId) {
  return this.aggregate([
    { $match: { vendor: new mongoose.Types.ObjectId(vendorId), status: 'active' } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        verifiedReviews: {
          $sum: { $cond: ['$isVerified', 1, 0] }
        },
        publicReviews: {
          $sum: { $cond: ['$isPublic', 1, 0] }
        },
        helpfulVotes: { $sum: '$helpfulVotes' },
        rating5: {
          $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] }
        },
        rating4: {
          $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] }
        },
        rating3: {
          $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] }
        },
        rating2: {
          $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] }
        },
        rating1: {
          $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Review', reviewSchema);