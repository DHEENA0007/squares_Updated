const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  pages: [{
    type: String,
    required: true
  }],
  isSystemRole: {
    type: Boolean,
    default: false // System roles cannot be deleted
  },
  isActive: {
    type: Boolean,
    default: true
  },
  level: {
    type: Number,
    default: 1, // 1 = lowest, 10 = highest
    min: 1,
    max: 10
  },
  permissions: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Virtual for user count
roleSchema.virtual('userCount', {
  ref: 'User',
  localField: 'name',
  foreignField: 'role',
  count: true
});

roleSchema.set('toJSON', { virtuals: true });
roleSchema.set('toObject', { virtuals: true });

// Static method to get default roles with page-based access
roleSchema.statics.getDefaultRoles = function () {
  return [
    {
      name: 'customer',
      description: 'Regular customer with basic property viewing and inquiry capabilities',
      pages: [
        'customer_dashboard',
        'customer_search',
        'customer_favorites',
        'customer_compare',
        'customer_owned_properties',
        'customer_messages',
        'customer_services',
        'customer_reviews',
        'customer_profile',
        'customer_settings'
      ],
      isSystemRole: true,
      level: 1
    },
    {
      name: 'agent',
      description: 'Property vendor who can manage their own listings and interact with customers',
      pages: [
        'vendor_dashboard',
        'vendor_properties',
        'vendor_add_property',
        'vendor_leads',
        'vendor_messages',
        'vendor_analytics',
        'vendor_services',
        'vendor_subscription',
        'vendor_billing',
        'vendor_reviews',
        'vendor_profile'
      ],
      isSystemRole: true,
      level: 5
    },
    {
      name: 'subadmin',
      description: 'Sub Administrator with limited administrative access',
      pages: [
        'subadmin_dashboard',
        'property_reviews',
        'property_rejections',
        'content_moderation',
        'support_tickets',
        'vendor_performance',
        'addon_services',
        'notifications',
        'reports',
        'subadmin_privacy_policy',
        'subadmin_refund_policy'
      ],
      isSystemRole: true,
      level: 7
    },
    {
      name: 'superadmin',
      description: 'Super Administrator with full system access and control',
      pages: [
        'dashboard',
        'users',
        'vendor_approvals',
        'messages',
        'roles',
        'clients',
        'properties',
        'plans',
        'addons',
        'privacy_policy',
        'refund_policy',
        'hero_management'
      ],
      isSystemRole: true,
      level: 10
    }
  ];
};

module.exports = mongoose.model('Role', roleSchema);