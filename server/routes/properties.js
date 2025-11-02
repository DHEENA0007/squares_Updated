const express = require('express');
const Property = require('../models/Property');
const { asyncHandler, validateRequest } = require('../middleware/errorMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');
const router = express.Router();

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      location,
      minPrice,
      maxPrice,
      propertyType,
      bedrooms,
      listingType
    } = req.query;

    const skip = (page - 1) * limit;
    // Show properties that are available or active (both are valid for customer viewing)
    // Exclude pending, rejected, sold, and rented properties
    let queryFilter = { 
      status: { $in: ['available', 'active'] },
      verified: true  // Only show verified properties to customers
    };

    // Apply filters
    if (location) {
      queryFilter.$or = [
        { 'address.city': { $regex: location, $options: 'i' } },
        { 'address.locality': { $regex: location, $options: 'i' } }
      ];
    }

    if (minPrice) {
      queryFilter.price = { $gte: parseInt(minPrice) };
    }

    if (maxPrice) {
      queryFilter.price = { ...queryFilter.price, $lte: parseInt(maxPrice) };
    }

    if (propertyType) {
      queryFilter.type = propertyType;
    }

    if (bedrooms) {
      const bedroomsNum = parseInt(bedrooms);
      if (!isNaN(bedroomsNum) && bedroomsNum > 0) {
        queryFilter.bedrooms = bedroomsNum;
      } else {
        console.warn(`Invalid bedrooms filter value: ${bedrooms}`);
      }
    }

    if (listingType) {
      queryFilter.listingType = listingType;
    }

    console.log('Property query filter:', JSON.stringify(queryFilter, null, 2));

    const totalProperties = await Property.countDocuments(queryFilter);
    const properties = await Property.find(queryFilter)
      .populate('owner', 'profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`Found ${properties.length} properties out of ${totalProperties} total`);

    res.json({
      success: true,
      data: {
        properties,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalProperties / limit),
          totalProperties
        }
      }
    });
  } catch (error) {
    console.error('Get properties error:', error);
    throw error;
  }
}));

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format'
      });
    }

    const property = await Property.findById(id)
      .populate('owner', 'profile.firstName profile.lastName email');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    res.json({
      success: true,
      data: { property }
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property'
    });
  }
}));

// @desc    Create property
// @route   POST /api/properties
// @access  Private
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const User = require('../models/User');
    const Vendor = require('../models/Vendor');
    const Subscription = require('../models/Subscription');
    
    // Check user's subscription limits
    if (req.user.role === 'agent') {
      const activeSubscription = await Subscription.findOne({
        user: req.user.id,
        status: 'active',
        endDate: { $gt: new Date() }
      }).populate('plan').sort({ createdAt: -1 });

      // Count current properties
      const vendorObjectId = new mongoose.Types.ObjectId(req.user.id);
      const currentProperties = await Property.countDocuments({
        $or: [
          { owner: req.user.id },
          { agent: req.user.id },
          { vendor: vendorObjectId }
        ]
      });

      // Check limits
      let maxProperties = 5; // Free tier default
      if (activeSubscription && activeSubscription.plan) {
        const planLimit = activeSubscription.plan.limits?.properties || 0;
        maxProperties = planLimit === 0 ? 999999 : planLimit; // 0 means unlimited
      }

      if (currentProperties >= maxProperties && maxProperties !== 999999) {
        return res.status(403).json({
          success: false,
          message: `Property limit reached. Your current plan allows ${maxProperties} properties.`,
          code: 'PROPERTY_LIMIT_EXCEEDED'
        });
      }
    }

    const propertyData = {
      ...req.body,
      owner: req.user.id,
      status: 'pending', // All vendor properties start as pending approval
      verified: false, // Requires admin verification to be published
      createdAt: new Date()
    };

    // Set vendor reference if user is an agent
    if (req.user.role === 'agent') {
      const vendor = await Vendor.findByUserId(req.user.id);
      if (vendor) {
        propertyData.vendor = vendor._id;
        propertyData.agent = req.user.id;
      }
    }

    const property = await Property.create(propertyData);
    await property.populate('owner', 'profile.firstName profile.lastName email');

    res.status(201).json({
      success: true,
      data: { property },
      message: 'Property submitted successfully! It will be published after admin verification.'
    });
  } catch (error) {
    console.error('Create property error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create property'
    });
  }
}));

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format'
      });
    }

    // Find property and check ownership
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if user owns this property or is admin
    if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }

    // Update property
    const updatedProperty = await Property.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('owner', 'profile.firstName profile.lastName email');

    res.json({
      success: true,
      data: { property: updatedProperty },
      message: 'Property updated successfully'
    });
  } catch (error) {
    console.error('Update property error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update property'
    });
  }
}));

// @desc    Update property status
// @route   PATCH /api/properties/:id/status
// @access  Private
router.patch('/:id/status', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format'
      });
    }

    // Find property and check ownership
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if user owns this property or is admin
    if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }

    // Validate status for vendors/customers (they can't set to pending)
    const validStatusesForOwner = ['available', 'sold', 'rented'];
    if (req.user.role !== 'admin' && !validStatusesForOwner.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Available options: available, sold, rented'
      });
    }

    // Update property status
    const updatedProperty = await Property.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('owner', 'profile.firstName profile.lastName email');

    res.json({
      success: true,
      data: { property: updatedProperty },
      message: 'Property status updated successfully'
    });
  } catch (error) {
    console.error('Update property status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update property status'
    });
  }
}));

// @desc    Toggle property featured status  
// @route   PATCH /api/properties/:id/featured
// @access  Private
router.patch('/:id/featured', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format'
      });
    }

    // Find property and check ownership
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if user owns this property or is admin
    if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }

    // Update property featured status
    const updatedProperty = await Property.findByIdAndUpdate(
      id,
      { featured, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('owner', 'profile.firstName profile.lastName email');

    res.json({
      success: true,
      data: { property: updatedProperty },
      message: `Property ${featured ? 'promoted' : 'unpromoted'} successfully`
    });
  } catch (error) {
    console.error('Update property featured status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update property featured status'
    });
  }
}));

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format'
      });
    }

    // Find property and check ownership
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if user owns this property or is admin
    if (property.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this property'
      });
    }

    // Delete property
    await Property.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete property'
    });
  }
}));

module.exports = router;