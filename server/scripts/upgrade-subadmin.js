require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const upgradeSubadminToSuperadmin = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully\n');

    const subadminEmail = 'admin@buildhomemart.com';
    
    // Find the subadmin user
    const subadminUser = await User.findOne({ email: subadminEmail });
    
    if (!subadminUser) {
      console.log(`❌ User ${subadminEmail} not found`);
      return;
    }

    console.log('👤 Current User Details:');
    console.log(`   Email: ${subadminUser.email}`);
    console.log(`   Role: ${subadminUser.role}`);
    console.log(`   Status: ${subadminUser.status}`);
    console.log(`   Name: ${subadminUser.profile.firstName} ${subadminUser.profile.lastName}`);

    if (subadminUser.role === 'superadmin') {
      console.log('✅ User is already a superadmin');
      return;
    }

    console.log('\n🔧 Upgrading user to superadmin...');
    
    // Update the user role
    subadminUser.role = 'superadmin';
    await subadminUser.save();
    
    console.log('✅ User successfully upgraded to superadmin!');
    console.log('\n🎉 User can now:');
    console.log('   ✅ Delete users');
    console.log('   ✅ Delete properties');
    console.log('   ✅ Access all admin functions');
    console.log('   ✅ Manage system settings');
    
    console.log('\n💡 Please refresh your browser and try the delete operation again.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
};

// Run if this file is executed directly
if (require.main === module) {
  upgradeSubadminToSuperadmin();
}

module.exports = { upgradeSubadminToSuperadmin };
