require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const fixAdminAccess = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully\n');

    // List all users with admin-like roles
    console.log('📋 Current Admin Users:');
    const adminUsers = await User.find({ 
      role: { $in: ['admin', 'superadmin', 'subadmin'] } 
    }).select('email role status profile.firstName profile.lastName');

    adminUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Status: ${user.status}`);
      console.log(`      Name: ${user.profile.firstName} ${user.profile.lastName}`);
      console.log(`      ID: ${user._id}`);
      console.log('');
    });

    // Check which user you're likely logged in as (most recent superadmin/admin)
    const potentialCurrentUser = await User.findOne({ 
      role: { $in: ['superadmin', 'admin'] },
      status: 'active' 
    }).sort({ updatedAt: -1 });

    if (potentialCurrentUser) {
      console.log('👤 Most likely current admin user:');
      console.log(`   Email: ${potentialCurrentUser.email}`);
      console.log(`   Current Role: ${potentialCurrentUser.role}`);
      console.log(`   Status: ${potentialCurrentUser.status}`);
      
      // Ensure this user has superadmin role for delete access
      if (potentialCurrentUser.role !== 'superadmin') {
        console.log('\n🔧 Updating user role to superadmin...');
        potentialCurrentUser.role = 'superadmin';
        await potentialCurrentUser.save();
        console.log('✅ User role updated to superadmin');
      } else {
        console.log('✅ User already has superadmin role');
      }
    }

    // Also check for any user that might be logged in with subadmin role
    const subadminUsers = await User.find({ role: 'subadmin', status: 'active' });
    if (subadminUsers.length > 0) {
      console.log('\n📝 Subadmin users found (they cannot delete users):');
      subadminUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.profile.firstName} ${user.profile.lastName})`);
      });
      
      console.log('\nTo give delete access, update to superadmin role.');
    }

    console.log('\n🔐 Access Level Summary:');
    console.log('   superadmin: Full access (can delete users, properties, etc.)');
    console.log('   admin: Full access (legacy role, equivalent to superadmin)');
    console.log('   subadmin: Limited access (cannot delete users)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
};

// Run if this file is executed directly
if (require.main === module) {
  fixAdminAccess();
}

module.exports = { fixAdminAccess };
