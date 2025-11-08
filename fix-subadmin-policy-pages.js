#!/usr/bin/env node

require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const Role = require('./server/models/Role');

async function fixSubAdminPolicyPages() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully\n');

    // Find SubAdmin role
    const subAdminRole = await Role.findOne({ name: { $regex: /^subadmin$/i } });
    
    if (!subAdminRole) {
      console.log('❌ SubAdmin role not found');
      return;
    }

    console.log('📋 Current SubAdmin role:');
    console.log('  Name:', subAdminRole.name);
    console.log('  Pages:', subAdminRole.pages);
    console.log('  Level:', subAdminRole.level);
    console.log('  Active:', subAdminRole.isActive);

    // Check if it has the correct policy pages
    const hasCorrectPrivacyPolicy = subAdminRole.pages.includes('subadmin_privacy_policy');
    const hasCorrectRefundPolicy = subAdminRole.pages.includes('subadmin_refund_policy');
    const hasOldPrivacyPolicy = subAdminRole.pages.includes('privacy_policy');
    const hasOldRefundPolicy = subAdminRole.pages.includes('refund_policy');

    console.log('\n🔍 Policy pages status:');
    console.log('  Has subadmin_privacy_policy:', hasCorrectPrivacyPolicy);
    console.log('  Has subadmin_refund_policy:', hasCorrectRefundPolicy);
    console.log('  Has old privacy_policy:', hasOldPrivacyPolicy);
    console.log('  Has old refund_policy:', hasOldRefundPolicy);

    let needsUpdate = false;

    // Remove old policy pages if they exist
    if (hasOldPrivacyPolicy) {
      subAdminRole.pages = subAdminRole.pages.filter(page => page !== 'privacy_policy');
      needsUpdate = true;
      console.log('  ✓ Removed old privacy_policy page');
    }

    if (hasOldRefundPolicy) {
      subAdminRole.pages = subAdminRole.pages.filter(page => page !== 'refund_policy');
      needsUpdate = true;
      console.log('  ✓ Removed old refund_policy page');
    }

    // Add correct policy pages if they don't exist
    if (!hasCorrectPrivacyPolicy) {
      subAdminRole.pages.push('subadmin_privacy_policy');
      needsUpdate = true;
      console.log('  ✓ Added subadmin_privacy_policy page');
    }

    if (!hasCorrectRefundPolicy) {
      subAdminRole.pages.push('subadmin_refund_policy');
      needsUpdate = true;
      console.log('  ✓ Added subadmin_refund_policy page');
    }

    if (needsUpdate) {
      await subAdminRole.save();
      console.log('\n✅ SubAdmin role updated successfully!');
      console.log('📋 Updated pages:', subAdminRole.pages);
    } else {
      console.log('\n✅ SubAdmin role already has correct policy pages configured');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

fixSubAdminPolicyPages();
