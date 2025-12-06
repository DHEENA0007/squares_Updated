const mongoose = require('mongoose');

// Property Type Schema
const propertyTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: String,
    required: true,
    // Remove enum to allow custom property type categories
  },
  icon: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Property Type Field Schema
const propertyTypeFieldSchema = new mongoose.Schema({
  propertyTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PropertyType',
    required: true,
  },
  fieldName: {
    type: String,
    required: true,
  },
  fieldLabel: {
    type: String,
    required: true,
  },
  fieldType: {
    type: String,
    enum: ['text', 'number', 'select', 'multiselect', 'boolean'],
    required: true,
  },
  fieldOptions: [String],
  isRequired: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Amenity Schema
const amenitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: String,
    // Remove enum to allow custom amenity categories
  },
  icon: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Property Type Amenity Mapping Schema
const propertyTypeAmenitySchema = new mongoose.Schema({
  propertyTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PropertyType',
    required: true,
  },
  amenityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Amenity',
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Ensure unique combination of propertyTypeId and amenityId
propertyTypeAmenitySchema.index({ propertyTypeId: 1, amenityId: 1 }, { unique: true });

// Filter Configuration Schema
const filterConfigurationSchema = new mongoose.Schema({
  filterType: {
    type: String,
    required: true,
    // Remove enum to allow custom filter types
  },
  name: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  minValue: {
    type: Number,
    default: null,
  },
  maxValue: {
    type: Number,
    default: null,
  },
  displayLabel: {
    type: String,
    required: function() {
      return !this.name; // Only required if name is not set
    },
    default: function() {
      return this.name; // Default to name if not provided
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Ensure unique combination of filterType and value
filterConfigurationSchema.index({ filterType: 1, value: 1 }, { unique: true });

// Navigation Item Schema
const navigationItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  displayLabel: {
    type: String,
    default: function() {
      return this.name;
    },
  },
  category: {
    type: String,
    enum: ['main', 'residential', 'commercial', 'agricultural'],
    required: true,
  },
  parentId: {
    type: String,
    default: null,
  },
  queryParams: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Configuration Metadata Schema
const configurationMetadataSchema = new mongoose.Schema({
  configKey: {
    type: String,
    required: true,
    unique: true,
  },
  configValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  description: String,
}, {
  timestamps: true,
});

// Create indexes for better performance
propertyTypeSchema.index({ category: 1, isActive: 1 });
propertyTypeFieldSchema.index({ propertyTypeId: 1, isActive: 1 });
amenitySchema.index({ category: 1, isActive: 1 });
filterConfigurationSchema.index({ filterType: 1, isActive: 1 });
navigationItemSchema.index({ category: 1, isActive: 1 });
navigationItemSchema.index({ category: 1, value: 1 }, { unique: true });

// Export models
const PropertyType = mongoose.model('PropertyType', propertyTypeSchema);
const PropertyTypeField = mongoose.model('PropertyTypeField', propertyTypeFieldSchema);
const Amenity = mongoose.model('Amenity', amenitySchema);
const PropertyTypeAmenity = mongoose.model('PropertyTypeAmenity', propertyTypeAmenitySchema);
const FilterConfiguration = mongoose.model('FilterConfiguration', filterConfigurationSchema);
const NavigationItem = mongoose.model('NavigationItem', navigationItemSchema);
const ConfigurationMetadata = mongoose.model('ConfigurationMetadata', configurationMetadataSchema);

module.exports = {
  PropertyType,
  PropertyTypeField,
  Amenity,
  PropertyTypeAmenity,
  FilterConfiguration,
  NavigationItem,
  ConfigurationMetadata,
};
