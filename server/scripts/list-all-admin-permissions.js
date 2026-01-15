const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function listAllAdmins() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!\n');

    // Fetch all admin users (excluding customers, vendors, agents)
    const users = await User.find({
      status: 'active',
      role: { $nin: ['customer', 'vendor', 'agent'] }
    }).select('email role profile rolePermissions');

    console.log('='.repeat(80));
    console.log('ALL ADMIN USERS AND THEIR PERMISSIONS:');
    console.log('='.repeat(80));

    users.forEach((user, index) => {
      const name = user.profile?.firstName
        ? `${user.profile.firstName} ${user.profile.lastName || ''}`
        : 'N/A';

      console.log(`\n${index + 1}. Email: ${user.email}`);
      console.log(`   Name: ${name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Permissions (${user.rolePermissions?.length || 0}):`);

      if (user.rolePermissions && user.rolePermissions.length > 0) {
        user.rolePermissions.forEach(perm => {
          console.log(`     - ${perm}`);
        });
      } else {
        console.log(`     (No permissions - relies on role: ${user.role})`);
      }

      // Check specific vendor permissions
      const hasVendorView = user.rolePermissions?.includes('vendors.view');
      const hasVendorApprove = user.rolePermissions?.includes('vendors.approve');
      const hasVendorManage = user.rolePermissions?.includes('vendors.manage');

      console.log(`   Vendor Permissions:`);
      console.log(`     vendors.view: ${hasVendorView ? '✅' : '❌'}`);
      console.log(`     vendors.approve: ${hasVendorApprove ? '✅' : '❌'}`);
      console.log(`     vendors.manage: ${hasVendorManage ? '✅' : '❌'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`Total: ${users.length} admin users`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

listAllAdmins();
