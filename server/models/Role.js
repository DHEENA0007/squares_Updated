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
  permissions: [{
    type: String,
    required: true,
    enum: [
      'create_property',
      'read_property', 
      'update_property',
      'delete_property',
      'manage_users',
      'manage_roles',
      'manage_plans',
      'view_dashboard',
      'manage_settings',
      'manage_content',
      'send_messages',
      'moderate_content',
      'access_analytics',
      // Sub Admin specific permissions
      'review_properties',
      'approve_properties',
      'reject_properties',
      'moderate_user_content',
      'handle_support_tickets',
      'track_vendor_performance',
      'approve_promotions',
      'send_notifications',
      'generate_reports'
    ]
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
  }
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

// Static method to get default roles
roleSchema.statics.getDefaultRoles = function() {
  return [
    {
      name: 'customer',
      description: 'Regular customer with basic property viewing and inquiry capabilities',
      permissions: ['read_property', 'send_messages'],
      isSystemRole: true,
      level: 1
    },
    {
      name: 'agent',
      description: 'Property agent who can manage their own listings and interact with customers',
      permissions: ['create_property', 'read_property', 'update_property', 'send_messages', 'access_analytics'],
      isSystemRole: true,
      level: 5
    },
    {
      name: 'admin',
      description: 'Administrator with full system access',
      permissions: [
        'create_property', 'read_property', 'update_property', 'delete_property',
        'manage_users', 'manage_roles', 'manage_plans', 'view_dashboard',
        'manage_settings', 'manage_content', 'send_messages', 'moderate_content',
        'access_analytics'
      ],
      isSystemRole: true,
      level: 10
    }
  ];
};

module.exports = mongoose.model('Role', roleSchema);