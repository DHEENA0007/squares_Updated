require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./server/models/User');

const upgradeUserToSuperAdmin = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully\n');

    console.log('📋 Current Admin Users:');
    const adminUsers = await User.find({ 
      role: { $in: ['admin', 'superadmin', 'subadmin'] } 
    }).select('email role status profile.firstName profile.lastName updatedAt');

    adminUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Status: ${user.status}`);
      console.log(`      Name: ${user.profile?.firstName} ${user.profile?.lastName}`);
      console.log(`      Last Updated: ${user.updatedAt}`);
      console.log(`      ID: ${user._id}`);
      console.log('');
    });

    // Get user email from command line argument
    const targetEmail = process.argv[2];
    
    if (!targetEmail) {
      console.log('❌ No email provided');
      console.log('');
      console.log('Usage:');
      console.log('  node upgrade-user-role.js <email>');
      console.log('');
      console.log('Example:');
      console.log('  node upgrade-user-role.js user@example.com');
      return;
    }

    // Find and upgrade the user
    const user = await User.findOne({ email: targetEmail });
    
    if (!user) {
      console.log(`❌ User with email ${targetEmail} not found`);
      return;
    }

    console.log(`👤 Found user: ${user.email}`);
    console.log(`   Current Role: ${user.role}`);
    console.log(`   Status: ${user.status}`);

    if (user.role === 'superadmin') {
      console.log('✅ User already has superadmin role');
      return;
    }

    if (user.status !== 'active') {
      console.log('⚠️  User account is not active. Activating...');
      user.status = 'active';
    }

    console.log(`🔧 Upgrading user role from '${user.role}' to 'superadmin'...`);
    user.role = 'superadmin';
    await user.save();

    console.log('✅ User role upgraded successfully!');
    console.log('');
    console.log('🔐 Access Level Summary:');
    console.log('   superadmin: Full access (can delete users, properties, etc.)');
    console.log('   admin: Full access (legacy role, equivalent to superadmin)');
    console.log('   subadmin: Limited access (cannot delete users)');
    console.log('');
    console.log('💡 The user will need to log out and log back in for the changes to take effect.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
};

// Run if this file is executed directly
if (require.main === module) {
  upgradeUserToSuperAdmin();
}

module.exports = { upgradeUserToSuperAdmin };
