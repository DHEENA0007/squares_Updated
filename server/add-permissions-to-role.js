#!/usr/bin/env node

/**
 * Utility script to add permissions to an existing role
 * Usage: node add-permissions-to-role.js "Role Name" permission1 permission2 ...
 * Example: node add-permissions-to-role.js "Business Development Manager" roles.view roles.create
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Role = require('./models/Role');

const ROLE_NAME = process.argv[2];
const PERMISSIONS_TO_ADD = process.argv.slice(3);

// Available permissions reference
const AVAILABLE_PERMISSIONS = {
  // User Management
  'users.view': 'View Users',
  'users.create': 'Create Users',
  'users.edit': 'Edit Users',
  'users.delete': 'Delete Users',
  'users.promote': 'Promote Users',
  'users.status': 'Change User Status',

  // Role Management
  'roles.view': 'View Roles',
  'roles.create': 'Create Roles',
  'roles.edit': 'Edit Roles',
  'roles.delete': 'Delete Roles',

  // Property Management
  'properties.view': 'View Properties',
  'properties.create': 'Create Properties',
  'properties.edit': 'Edit Properties',
  'properties.delete': 'Delete Properties',
  'properties.approve': 'Approve Properties',

  // Vendor Management
  'vendors.view': 'View Vendors',
  'vendors.approve': 'Approve Vendors',
  'vendors.manage': 'Manage Vendors',

  // Review Management
  'reviews.view': 'View Reviews',
  'reviews.respond': 'Respond to Reviews',
  'reviews.report': 'Report Inappropriate Reviews',
  'reviews.delete': 'Delete Reviews',

  // Clients Management
  'clients.read': 'View Clients',
  'clients.accessActions': 'Access Client Actions',
  'clients.accessDetails': 'View Client Details',
  'clients.detailsEdit': 'Edit Client Details (Cancel Subscription)',

  // Plans Management
  'plans.read': 'View Plans',
  'plans.create': 'Create Plan',
  'plans.edit': 'Edit Plan',

  // Addons Management
  'addons.read': 'View Addons',
  'addons.create': 'Create Addon',
  'addons.edit': 'Edit Addon',
  'addons.deactivate': 'Deactivate Addon',
  'addons.delete': 'Delete Addon',

  // Property Management (Extended)
  'propertyManagement.read': 'View Property Management',
  'propertyManagement.tCreate': 'Create Property Type & Category',
  'propertyManagement.tEdit': 'Edit Property Type',
  'propertyManagement.tDelete': 'Delete Property Type',
  'propertyManagement.tStatus': 'Toggle Property Type Status',
  'propertyManagement.tManageFields': 'Manage Property Fields',
  'propertyManagement.tOrder': 'Manage Property Type Order',
  'propertyManagement.aCreate': 'Create Amenity',
  'propertyManagement.aEdit': 'Edit Amenity',
  'propertyManagement.aDelete': 'Delete Amenity',
  'propertyManagement.aStatus': 'Toggle Amenity Status',
  'propertyManagement.aOrder': 'Manage Amenity Order',

  // Filter Management
  'filterManagement.read': 'View Filters (Read Only)',
  'filterManagement.createNtp': 'Create Filter Type',
  'filterManagement.createFto': 'Create Filter Type Option',
  'filterManagement.order': 'Manage Filter Order',
  'filterManagement.status': 'Toggle Filter Status',
  'filterManagement.edit': 'Edit Filter',
  'filterManagement.delete': 'Delete Filter',

  // Support Tickets
  'supportTickets.read': 'View Support Tickets',
  'supportTickets.view': 'View Full Conversation',
  'supportTickets.reply': 'Reply to Tickets',
  'supportTickets.status': 'Update Ticket Status',

  // Addon Services
  'addonServices.read': 'View Vendor Addon Services',
  'addonServices.schedule': 'Schedule Addon Services',
  'addonServices.manage': 'Manage Service Schedules',
  'addonServices.status': 'Update Schedule Status',
  'addonServices.notes': 'Add Notes to Schedules',

  // Policies
  'policies.read': 'View Policies',
  'policies.editPrivacy': 'Edit Privacy Policy',
  'policies.editRefund': 'Edit Refund Policy',

  // Notifications
  'notifications.view': 'View Notifications',
  'notifications.send': 'Send Notifications',
  'notifications.delete': 'Delete Notifications',

  // Dashboard
  'dashboard.view': 'View Dashboard',
  'analytics.view': 'View Analytics',
};

async function addPermissions() {
  if (!ROLE_NAME) {
    console.log('Usage: node add-permissions-to-role.js "Role Name" permission1 permission2 ...\n');
    console.log('Example: node add-permissions-to-role.js "Business Development Manager" roles.view roles.create\n');
    console.log('Available permissions:');
    Object.keys(AVAILABLE_PERMISSIONS).forEach(perm => {
      console.log(`  ${perm.padEnd(35)} - ${AVAILABLE_PERMISSIONS[perm]}`);
    });
    process.exit(1);
  }

  if (PERMISSIONS_TO_ADD.length === 0) {
    console.log('❌ No permissions specified to add\n');
    console.log('Available permissions:');
    Object.keys(AVAILABLE_PERMISSIONS).forEach(perm => {
      console.log(`  ${perm.padEnd(35)} - ${AVAILABLE_PERMISSIONS[perm]}`);
    });
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    const role = await Role.findOne({ name: ROLE_NAME });

    if (!role) {
      console.log(`❌ Role "${ROLE_NAME}" not found\n`);
      console.log('Available roles:');
      const allRoles = await Role.find({}, 'name');
      allRoles.forEach(r => console.log(`  - ${r.name}`));
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`Role: ${ROLE_NAME}\n`);

    // Validate permissions
    const invalidPermissions = PERMISSIONS_TO_ADD.filter(p => !AVAILABLE_PERMISSIONS[p]);
    if (invalidPermissions.length > 0) {
      console.log('❌ Invalid permissions:');
      invalidPermissions.forEach(p => console.log(`  - ${p}`));
      console.log('\nAvailable permissions:');
      Object.keys(AVAILABLE_PERMISSIONS).forEach(perm => {
        console.log(`  ${perm.padEnd(35)} - ${AVAILABLE_PERMISSIONS[perm]}`);
      });
      await mongoose.disconnect();
      process.exit(1);
    }

    // Add permissions
    const beforeCount = role.permissions.length;
    const newPermissions = [];
    const alreadyExists = [];

    PERMISSIONS_TO_ADD.forEach(perm => {
      if (!role.permissions.includes(perm)) {
        role.permissions.push(perm);
        newPermissions.push(perm);
      } else {
        alreadyExists.push(perm);
      }
    });

    if (newPermissions.length > 0) {
      await role.save();
      console.log('✓ Successfully added permissions:\n');
      newPermissions.forEach(perm => {
        console.log(`  ✓ ${perm.padEnd(35)} - ${AVAILABLE_PERMISSIONS[perm]}`);
      });
      console.log('');
    }

    if (alreadyExists.length > 0) {
      console.log('ℹ  Already had these permissions:\n');
      alreadyExists.forEach(perm => {
        console.log(`  • ${perm.padEnd(35)} - ${AVAILABLE_PERMISSIONS[perm]}`);
      });
      console.log('');
    }

    console.log(`Total permissions: ${beforeCount} → ${role.permissions.length}\n`);
    console.log('✓ Role updated successfully!');
    console.log('\nNote: Users with this role do not need to re-login.');
    console.log('      Permissions are checked fresh on every API request.\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

addPermissions();
