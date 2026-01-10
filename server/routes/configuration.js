const express = require('express');
const router = express.Router();
const {
  PropertyType,
  PropertyTypeField,
  Amenity,
  PropertyTypeAmenity,
  FilterConfiguration,
  NavigationItem,
  ConfigurationMetadata,
} = require('../models/Configuration');
const { authenticateToken } = require('../middleware/authMiddleware');

// Middleware to check if user is superadmin
const isSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied. Superadmin only.' });
};

// ============= Property Type Categories =============

// Get all property type categories
router.get('/property-type-categories', async (req, res) => {
  try {
    const propertyTypes = await PropertyType.find({}).select('category').distinct('category');

    const categories = propertyTypes.sort();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Error fetching property type categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property type categories',
      error: error.message,
    });
  }
});

// Get property types by category with count
router.get('/property-type-categories/details', async (req, res) => {
  try {
    const categories = await PropertyType.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
        },
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const categoryDetails = categories.map(cat => ({
      category: cat._id,
      totalCount: cat.count,
      activeCount: cat.activeCount,
    }));

    res.json({
      success: true,
      data: categoryDetails,
    });
  } catch (error) {
    console.error('Error fetching property type category details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property type category details',
      error: error.message,
    });
  }
});

// ============= Property Types =============

// Get all property types
router.get('/property-types', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const query = includeInactive ? {} : { isActive: true };

    const propertyTypes = await PropertyType.find(query).sort({ displayOrder: 1 });

    res.json({
      success: true,
      data: propertyTypes,
    });
  } catch (error) {
    console.error('Error fetching property types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property types',
      error: error.message,
    });
  }
});

// Get property type by ID with details
router.get('/property-types/:id', async (req, res) => {
  try {
    const propertyType = await PropertyType.findById(req.params.id);

    if (!propertyType) {
      return res.status(404).json({
        success: false,
        message: 'Property type not found',
      });
    }

    const fields = await PropertyTypeField.find({ propertyTypeId: propertyType._id, isActive: true })
      .sort({ displayOrder: 1 });

    const amenityMappings = await PropertyTypeAmenity.find({ propertyTypeId: propertyType._id })
      .populate('amenityId');
    const amenities = amenityMappings.map(m => m.amenityId);

    res.json({
      success: true,
      data: {
        ...propertyType.toObject(),
        fields,
        amenities,
      },
    });
  } catch (error) {
    console.error('Error fetching property type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property type',
      error: error.message,
    });
  }
});

// Create property type (superadmin only)
router.post('/property-types', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const propertyType = new PropertyType(req.body);
    await propertyType.save();

    // Auto-create Filter Configuration for Property Type
    try {
      const existingFilter = await FilterConfiguration.findOne({
        filterType: 'property_type',
        value: propertyType.value
      });

      if (!existingFilter) {
        await new FilterConfiguration({
          filterType: 'property_type',
          name: propertyType.name,
          value: propertyType.value,
          displayLabel: propertyType.name,
          displayOrder: propertyType.displayOrder,
          isActive: propertyType.isActive
        }).save();
        console.log(`Auto-created filter configuration for property type: ${propertyType.name}`);
      }
    } catch (filterError) {
      console.error('Error auto-creating filter for property type:', filterError);
      // Don't fail the request if filter creation fails
    }

    res.status(201).json({
      success: true,
      data: propertyType,
      message: 'Property type created successfully',
    });
  } catch (error) {
    console.error('Error creating property type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create property type',
      error: error.message,
    });
  }
});

// Update property type (superadmin only)
router.put('/property-types/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const propertyType = await PropertyType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!propertyType) {
      return res.status(404).json({
        success: false,
        message: 'Property type not found',
      });
    }

    // Auto-update Filter Configuration
    try {
      await FilterConfiguration.findOneAndUpdate(
        { filterType: 'property_type', value: propertyType.value },
        {
          name: propertyType.name,
          displayLabel: propertyType.name,
          isActive: propertyType.isActive,
          displayOrder: propertyType.displayOrder
        }
      );
      console.log(`Auto-updated filter configuration for property type: ${propertyType.name}`);
    } catch (filterError) {
      console.error('Error auto-updating filter for property type:', filterError);
    }

    res.json({
      success: true,
      data: propertyType,
      message: 'Property type updated successfully',
    });
  } catch (error) {
    console.error('Error updating property type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update property type',
      error: error.message,
    });
  }
});

// Delete property type (superadmin only)
router.delete('/property-types/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const propertyType = await PropertyType.findByIdAndDelete(req.params.id);

    if (!propertyType) {
      return res.status(404).json({
        success: false,
        message: 'Property type not found',
      });
    }

    // Also delete related fields and mappings
    await PropertyTypeField.deleteMany({ propertyTypeId: req.params.id });
    await PropertyTypeAmenity.deleteMany({ propertyTypeId: req.params.id });

    // Auto-delete Filter Configuration
    try {
      await FilterConfiguration.findOneAndDelete({
        filterType: 'property_type',
        value: propertyType.value
      });
      console.log(`Auto-deleted filter configuration for property type: ${propertyType.name}`);
    } catch (filterError) {
      console.error('Error auto-deleting filter for property type:', filterError);
    }

    res.json({
      success: true,
      message: 'Property type deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting property type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete property type',
      error: error.message,
    });
  }
});

// ============= Property Type Fields =============

// Get fields for a property type
router.get('/property-types/:id/fields', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const query = {
      propertyTypeId: req.params.id,
      ...(includeInactive ? {} : { isActive: true })
    };

    const fields = await PropertyTypeField.find(query).sort({ displayOrder: 1 });

    res.json({
      success: true,
      data: fields,
    });
  } catch (error) {
    console.error('Error fetching property type fields:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property type fields',
      error: error.message,
    });
  }
});

// Create property type field (superadmin only)
router.post('/property-type-fields', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const field = new PropertyTypeField(req.body);
    await field.save();

    res.status(201).json({
      success: true,
      data: field,
      message: 'Property type field created successfully',
    });
  } catch (error) {
    console.error('Error creating property type field:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create property type field',
      error: error.message,
    });
  }
});

// Update property type field (superadmin only)
router.put('/property-type-fields/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const field = await PropertyTypeField.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Property type field not found',
      });
    }

    res.json({
      success: true,
      data: field,
      message: 'Property type field updated successfully',
    });
  } catch (error) {
    console.error('Error updating property type field:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update property type field',
      error: error.message,
    });
  }
});

// Delete property type field (superadmin only)
router.delete('/property-type-fields/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const field = await PropertyTypeField.findByIdAndDelete(req.params.id);

    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Property type field not found',
      });
    }

    res.json({
      success: true,
      message: 'Property type field deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting property type field:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete property type field',
      error: error.message,
    });
  }
});

// ============= Amenities =============

// Get all amenities
router.get('/amenities', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const category = req.query.category;

    const query = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(category ? { category } : {})
    };

    const amenities = await Amenity.find(query).sort({ displayOrder: 1 });

    res.json({
      success: true,
      data: amenities,
    });
  } catch (error) {
    console.error('Error fetching amenities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch amenities',
      error: error.message,
    });
  }
});

// Get all property type amenity mappings
router.get('/property-type-amenities', async (req, res) => {
  try {
    const mappings = await PropertyTypeAmenity.find({});

    res.json({
      success: true,
      data: mappings,
    });
  } catch (error) {
    console.error('Error fetching all property type amenities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property type amenities',
      error: error.message,
    });
  }
});

// Get amenities for a property type
router.get('/property-types/:id/amenities', async (req, res) => {
  try {
    const mappings = await PropertyTypeAmenity.find({ propertyTypeId: req.params.id })
      .populate('amenityId');

    const amenities = mappings
      .map(m => m.amenityId)
      .filter(a => a && a.isActive);

    res.json({
      success: true,
      data: amenities,
    });
  } catch (error) {
    console.error('Error fetching property type amenities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property type amenities',
      error: error.message,
    });
  }
});

// Create amenity (superadmin only)
router.post('/amenities', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const amenity = new Amenity(req.body);
    await amenity.save();

    res.status(201).json({
      success: true,
      data: amenity,
      message: 'Amenity created successfully',
    });
  } catch (error) {
    console.error('Error creating amenity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create amenity',
      error: error.message,
    });
  }
});

// Update amenity (superadmin only)
router.put('/amenities/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const amenity = await Amenity.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!amenity) {
      return res.status(404).json({
        success: false,
        message: 'Amenity not found',
      });
    }

    res.json({
      success: true,
      data: amenity,
      message: 'Amenity updated successfully',
    });
  } catch (error) {
    console.error('Error updating amenity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update amenity',
      error: error.message,
    });
  }
});

// Delete amenity (superadmin only)
router.delete('/amenities/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const amenity = await Amenity.findByIdAndDelete(req.params.id);

    if (!amenity) {
      return res.status(404).json({
        success: false,
        message: 'Amenity not found',
      });
    }

    // Also delete related mappings
    await PropertyTypeAmenity.deleteMany({ amenityId: req.params.id });

    res.json({
      success: true,
      message: 'Amenity deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting amenity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete amenity',
      error: error.message,
    });
  }
});

// Update property type amenities (superadmin only)
router.put('/property-types/:id/amenities', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { amenityIds } = req.body;

    // Delete existing mappings
    await PropertyTypeAmenity.deleteMany({ propertyTypeId: req.params.id });

    // Create new mappings
    if (amenityIds && amenityIds.length > 0) {
      const mappings = amenityIds.map(amenityId => ({
        propertyTypeId: req.params.id,
        amenityId,
        isDefault: true,
      }));
      await PropertyTypeAmenity.insertMany(mappings);
    }

    res.json({
      success: true,
      message: 'Property type amenities updated successfully',
    });
  } catch (error) {
    console.error('Error updating property type amenities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update property type amenities',
      error: error.message,
    });
  }
});

// ============= Filter Configurations =============

// Get all filter configurations
router.get('/filters', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const filterType = req.query.filterType;

    const query = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(filterType ? { filterType } : {})
    };

    const filters = await FilterConfiguration.find(query)
      .sort({ filterType: 1, displayOrder: 1 });

    res.json({
      success: true,
      data: filters,
    });
  } catch (error) {
    console.error('Error fetching filter configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch filter configurations',
      error: error.message,
    });
  }
});

// Create filter configuration (superadmin only)
router.post('/filters', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    console.log('Creating filter configuration with data:', req.body);

    // Validate required fields
    if (!req.body.filterType || !req.body.name || !req.body.value) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: filterType, name, and value are required',
        receivedData: req.body,
      });
    }

    const filter = new FilterConfiguration(req.body);
    await filter.save();

    res.status(201).json({
      success: true,
      data: filter,
      message: 'Filter configuration created successfully',
    });
  } catch (error) {
    console.error('Error creating filter configuration:', error);
    console.error('Request body:', req.body);
    console.error('Error details:', error.errors || error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to create filter configuration',
      error: error.message,
      details: error.errors || {},
      receivedData: req.body,
    });
  }
});

// Update filter configuration (superadmin only)
router.put('/filters/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const filter = await FilterConfiguration.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!filter) {
      return res.status(404).json({
        success: false,
        message: 'Filter configuration not found',
      });
    }

    res.json({
      success: true,
      data: filter,
      message: 'Filter configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating filter configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update filter configuration',
      error: error.message,
    });
  }
});

// Delete filter configuration (superadmin only)
router.delete('/filters/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const filter = await FilterConfiguration.findByIdAndDelete(req.params.id);

    if (!filter) {
      return res.status(404).json({
        success: false,
        message: 'Filter configuration not found',
      });
    }

    res.json({
      success: true,
      message: 'Filter configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting filter configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete filter configuration',
      error: error.message,
    });
  }
});

// ============= Filter Dependencies =============

// Get filter dependencies
router.get('/filter-dependencies', async (req, res) => {
  try {
    const metadata = await ConfigurationMetadata.findOne({ configKey: 'filter_dependencies' });
    res.json({
      success: true,
      data: metadata?.configValue || [],
    });
  } catch (error) {
    console.error('Error fetching filter dependencies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch filter dependencies',
      error: error.message,
    });
  }
});

// Update filter dependencies (superadmin only)
router.post('/filter-dependencies', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const dependencies = req.body;

    if (!Array.isArray(dependencies)) {
      return res.status(400).json({
        success: false,
        message: 'Dependencies must be an array',
      });
    }

    const metadata = await ConfigurationMetadata.findOneAndUpdate(
      { configKey: 'filter_dependencies' },
      {
        configKey: 'filter_dependencies',
        configValue: dependencies,
        description: 'Configuration for filter visibility dependencies'
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: metadata.configValue,
      message: 'Filter dependencies updated successfully',
    });
  } catch (error) {
    console.error('Error updating filter dependencies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update filter dependencies',
      error: error.message,
    });
  }
});

// ============= Navigation Items =============

// Get all navigation items
router.get('/navigation-items', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const category = req.query.category;

    const query = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(category ? { category } : {})
    };

    const navigationItems = await NavigationItem.find(query)
      .sort({ category: 1, displayOrder: 1 });

    res.json({
      success: true,
      data: navigationItems,
    });
  } catch (error) {
    console.error('Error fetching navigation items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch navigation items',
      error: error.message,
    });
  }
});

// Get navigation item by ID
router.get('/navigation-items/:id', async (req, res) => {
  try {
    const navigationItem = await NavigationItem.findById(req.params.id);

    if (!navigationItem) {
      return res.status(404).json({
        success: false,
        message: 'Navigation item not found',
      });
    }

    res.json({
      success: true,
      data: navigationItem,
    });
  } catch (error) {
    console.error('Error fetching navigation item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch navigation item',
      error: error.message,
    });
  }
});

// Create navigation item (superadmin only)
router.post('/navigation-items', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    console.log('Creating navigation item with data:', req.body);

    // Validate required fields
    if (!req.body.name || !req.body.value || !req.body.category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, value, and category are required',
        receivedData: req.body,
      });
    }

    const navigationItem = new NavigationItem(req.body);
    await navigationItem.save();

    res.status(201).json({
      success: true,
      data: navigationItem,
      message: 'Navigation item created successfully',
    });
  } catch (error) {
    console.error('Error creating navigation item:', error);
    console.error('Request body:', req.body);
    console.error('Error details:', error.errors || error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to create navigation item',
      error: error.message,
      details: error.errors || {},
      receivedData: req.body,
    });
  }
});

// Update navigation item (superadmin only)
router.put('/navigation-items/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const navigationItem = await NavigationItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!navigationItem) {
      return res.status(404).json({
        success: false,
        message: 'Navigation item not found',
      });
    }

    res.json({
      success: true,
      data: navigationItem,
      message: 'Navigation item updated successfully',
    });
  } catch (error) {
    console.error('Error updating navigation item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update navigation item',
      error: error.message,
    });
  }
});

// Delete navigation item (superadmin only)
router.delete('/navigation-items/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const navigationItem = await NavigationItem.findByIdAndDelete(req.params.id);

    if (!navigationItem) {
      return res.status(404).json({
        success: false,
        message: 'Navigation item not found',
      });
    }

    res.json({
      success: true,
      message: 'Navigation item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting navigation item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete navigation item',
      error: error.message,
    });
  }
});

// ============= Navigation Categories =============

// Get all navigation categories
router.get('/navigation-categories', async (req, res) => {
  try {
    const categories = await ConfigurationMetadata.findOne({ configKey: 'navigation_categories' });

    const defaultCategories = [
      { value: 'residential', label: 'Residential', isActive: true, displayOrder: 1 },
      { value: 'commercial', label: 'Commercial', isActive: true, displayOrder: 2 },
      { value: 'agricultural', label: 'Agricultural', isActive: true, displayOrder: 3 },
    ];

    res.json({
      success: true,
      data: categories?.configValue || defaultCategories,
    });
  } catch (error) {
    console.error('Error fetching navigation categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch navigation categories',
      error: error.message,
    });
  }
});

// Update navigation categories (superadmin only)
router.post('/navigation-categories', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Categories must be an array',
      });
    }

    const metadata = await ConfigurationMetadata.findOneAndUpdate(
      { configKey: 'navigation_categories' },
      {
        configKey: 'navigation_categories',
        configValue: categories,
        description: 'Navigation item categories for property types'
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: metadata.configValue,
      message: 'Navigation categories updated successfully',
    });
  } catch (error) {
    console.error('Error updating navigation categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update navigation categories',
      error: error.message,
    });
  }
});

// ============= Configuration Metadata =============

// Get configuration metadata
router.get('/metadata/:key', async (req, res) => {
  try {
    const metadata = await ConfigurationMetadata.findOne({ configKey: req.params.key });

    if (!metadata) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found',
      });
    }

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    console.error('Error fetching configuration metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch configuration metadata',
      error: error.message,
    });
  }
});

// Set configuration metadata (superadmin only)
router.post('/metadata', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { configKey, configValue, description } = req.body;

    const metadata = await ConfigurationMetadata.findOneAndUpdate(
      { configKey },
      { configKey, configValue, description },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: metadata,
      message: 'Configuration metadata updated successfully',
    });
  } catch (error) {
    console.error('Error setting configuration metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set configuration metadata',
      error: error.message,
    });
  }
});

module.exports = router;
