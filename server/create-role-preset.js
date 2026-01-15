#!/usr/bin/env node

/**
 * Utility script to create new roles with predefined permission presets
 * Usage: node create-role-preset.js <preset-name> "Custom Role Name" [description]
 * Example: node create-role-preset.js sales "Sales Manager" "Handles sales and vendor approvals"
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Role = require('./models/Role');

const PRESET_NAME = process.argv[2];
const ROLE_NAME = process.argv[3];
const DESCRIPTION = process.argv[4] || '';

// Predefined permission presets for common roles
const PERMISSION_PRESETS = {
  // Sales/Business Development roles
  sales: {
    description: 'Sales and business development team member',
    level: 5,
    permissions: [
      'users.view',
      'users.create',
      'vendors.view',
      'vendors.approve',
      'vendors.manage',
      'properties.view',
      'properties.approve',
      'clients.read',
      'clients.accessDetails',
      'analytics.view',
      'dashboard.view'
    ]
  },

  // Content/Marketing roles
  marketing: {
    description: 'Marketing and content management team member',
    level: 4,
    permissions: [
      'properties.view',
      'reviews.view',
      'reviews.respond',
      'notifications.view',
      'notifications.send',
      'policies.read',
      'analytics.view',
      'dashboard.view'
    ]
  },

  // Support roles
  support: {
    description: 'Customer support team member',
    level: 3,
    permissions: [
      'supportTickets.read',
      'supportTickets.view',
      'supportTickets.reply',
      'supportTickets.status',
      'users.view',
      'properties.view',
      'reviews.view',
      'reviews.respond',
      'clients.read',
      'clients.accessDetails'
    ]
  },

  // Content moderator roles
  moderator: {
    description: 'Content moderation team member',
    level: 6,
    permissions: [
      'properties.view',
      'properties.approve',
      'reviews.view',
      'reviews.respond',
      'reviews.report',
      'reviews.delete',
      'vendors.view',
      'supportTickets.read',
      'supportTickets.view',
      'supportTickets.reply',
      'dashboard.view'
    ]
  },

  // Manager roles (full access except role/user management)
  manager: {
    description: 'Manager with extensive permissions',
    level: 7,
    permissions: [
      'users.view',
      'users.edit',
      'users.status',
      'properties.view',
      'properties.create',
      'properties.edit',
      'properties.delete',
      'properties.approve',
      'vendors.view',
      'vendors.approve',
      'vendors.manage',
      'reviews.view',
      'reviews.respond',
      'reviews.report',
      'reviews.delete',
      'clients.read',
      'clients.accessActions',
      'clients.accessDetails',
      'clients.detailsEdit',
      'plans.read',
      'plans.edit',
      'addons.read',
      'addons.edit',
      'supportTickets.read',
      'supportTickets.view',
      'supportTickets.reply',
      'supportTickets.status',
      'notifications.view',
      'notifications.send',
      'policies.read',
      'policies.editPrivacy',
      'policies.editRefund',
      'dashboard.view',
      'analytics.view'
    ]
  },

  // Read-only analyst role
  analyst: {
    description: 'Read-only access for analytics and reporting',
    level: 3,
    permissions: [
      'users.view',
      'properties.view',
      'vendors.view',
      'reviews.view',
      'clients.read',
      'plans.read',
      'addons.read',
      'supportTickets.read',
      'analytics.view',
      'dashboard.view'
    ]
  },

  // Property management specialist
  propertyManager: {
    description: 'Property and listing management specialist',
    level: 5,
    permissions: [
      'properties.view',
      'properties.create',
      'properties.edit',
      'properties.delete',
      'properties.approve',
      'propertyManagement.read',
      'propertyManagement.tCreate',
      'propertyManagement.tEdit',
      'propertyManagement.tStatus',
      'propertyManagement.aCreate',
      'propertyManagement.aEdit',
      'propertyManagement.aStatus',
      'filterManagement.read',
      'filterManagement.createNtp',
      'filterManagement.createFto',
      'filterManagement.status',
      'filterManagement.edit',
      'vendors.view',
      'dashboard.view'
    ]
  },

  // Custom role builder (allows role management)
  roleAdmin: {
    description: 'Role and permission administrator',
    level: 8,
    permissions: [
      'roles.view',
      'roles.create',
      'roles.edit',
      'roles.delete',
      'users.view',
      'users.create',
      'users.edit',
      'users.promote',
      'users.status',
      'dashboard.view'
    ]
  }
};

async function createRoleFromPreset() {
  if (!PRESET_NAME || !ROLE_NAME) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('CREATE ROLE FROM PRESET');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('Usage: node create-role-preset.js <preset> "Role Name" [description]\n');
    console.log('Example:\n  node create-role-preset.js sales "Regional Sales Manager"\n');
    console.log('Available Presets:');
    console.log('─────────────────────────────────────────────────────────────\n');

    Object.keys(PERMISSION_PRESETS).forEach(preset => {
      const config = PERMISSION_PRESETS[preset];
      console.log(`  ${preset.toUpperCase()}`);
      console.log(`    Description: ${config.description}`);
      console.log(`    Level: ${config.level}/10`);
      console.log(`    Permissions: ${config.permissions.length}`);
      console.log('');
    });

    process.exit(1);
  }

  if (!PERMISSION_PRESETS[PRESET_NAME]) {
    console.log(`❌ Unknown preset: "${PRESET_NAME}"\n`);
    console.log('Available presets:', Object.keys(PERMISSION_PRESETS).join(', '));
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Check if role already exists
    const existingRole = await Role.findOne({ name: ROLE_NAME });
    if (existingRole) {
      console.log(`❌ Role "${ROLE_NAME}" already exists\n`);
      await mongoose.disconnect();
      process.exit(1);
    }

    const preset = PERMISSION_PRESETS[PRESET_NAME];

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Creating Role: ${ROLE_NAME}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Preset: ${PRESET_NAME}`);
    console.log(`Description: ${DESCRIPTION || preset.description}`);
    console.log(`Level: ${preset.level}/10`);
    console.log(`Permissions: ${preset.permissions.length}\n`);

    const newRole = await Role.create({
      name: ROLE_NAME,
      description: DESCRIPTION || preset.description,
      level: preset.level,
      permissions: preset.permissions,
      pages: [],
      isActive: true,
      isSystemRole: false
    });

    console.log('✓ Role created successfully!\n');
    console.log('Granted Permissions:');
    console.log('─────────────────────────────────────────────────────────────\n');

    // Group permissions by category
    const groups = {};
    preset.permissions.forEach(perm => {
      const category = perm.split('.')[0];
      if (!groups[category]) groups[category] = [];
      groups[category].push(perm);
    });

    Object.keys(groups).sort().forEach(category => {
      console.log(`  ${category}:`);
      groups[category].forEach(perm => {
        console.log(`    ✓ ${perm}`);
      });
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nNext Steps:');
    console.log('  1. Assign users to this role via Admin Portal > Users');
    console.log('  2. Or create new users with this role');
    console.log('  3. Use check-role.js to verify permissions anytime\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

createRoleFromPreset();
