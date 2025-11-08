const mongoose = require('mongoose');
require('dotenv').config();

const Role = require('./models/Role');

async function checkSubadminRole() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find subadmin role
    const subadminRole = await Role.findOne({ name: 'subadmin' });
    
    if (!subadminRole) {
      console.log('❌ Subadmin role not found');
      return;
    }

    console.log('\n📋 Current Subadmin Role Configuration:');
    console.log(`   Name: ${subadminRole.name}`);
    console.log(`   Description: ${subadminRole.description}`);
    console.log(`   Pages: ${subadminRole.pages ? subadminRole.pages.length : 0}`);
    
    if (subadminRole.pages) {
      console.log('\n📄 Current Pages:');
      subadminRole.pages.forEach((page, index) => {
        console.log(`   ${index + 1}. ${page}`);
      });
    }

    // Check for old page IDs
    const hasOldPrivacyPolicy = subadminRole.pages?.includes('privacy_policy');
    const hasOldRefundPolicy = subadminRole.pages?.includes('refund_policy');
    const hasNewPrivacyPolicy = subadminRole.pages?.includes('subadmin_privacy_policy');
    const hasNewRefundPolicy = subadminRole.pages?.includes('subadmin_refund_policy');

    console.log('\n🔍 Policy Page Analysis:');
    console.log(`   Old privacy_policy: ${hasOldPrivacyPolicy ? '✅ Found' : '❌ Not found'}`);
    console.log(`   Old refund_policy: ${hasOldRefundPolicy ? '✅ Found' : '❌ Not found'}`);
    console.log(`   New subadmin_privacy_policy: ${hasNewPrivacyPolicy ? '✅ Found' : '❌ Not found'}`);
    console.log(`   New subadmin_refund_policy: ${hasNewRefundPolicy ? '✅ Found' : '❌ Not found'}`);

    if (hasOldPrivacyPolicy || hasOldRefundPolicy) {
      console.log('\n⚠️  OLD PAGE IDs DETECTED - UPDATE NEEDED!');
    } else if (hasNewPrivacyPolicy && hasNewRefundPolicy) {
      console.log('\n✅ Correct page IDs already configured!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

checkSubadminRole();
