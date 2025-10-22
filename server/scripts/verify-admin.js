require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');

const verifyAdminUser = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully\n');

    // Check admin user
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (adminUser) {
      console.log('👤 Admin User Found:');
      console.log('   ID:', adminUser._id);
      console.log('   Email:', adminUser.email);
      console.log('   Role:', adminUser.role);
      console.log('   Status:', adminUser.status);
      console.log('   Name:', `${adminUser.profile.firstName} ${adminUser.profile.lastName}`);
      console.log('   Email Verified:', adminUser.profile.emailVerified);
      console.log('   Created:', adminUser.createdAt);
      console.log('   Last Updated:', adminUser.updatedAt);
    } else {
      console.log('❌ No admin user found');
    }

    // Check roles
    console.log('\n📋 Available Roles:');
    const roles = await Role.find({}).sort({ level: -1 });
    roles.forEach(role => {
      console.log(`   - ${role.name} (Level: ${role.level}, Active: ${role.isActive})`);
      console.log(`     Description: ${role.description}`);
      console.log(`     Permissions: ${role.permissions.length} permissions`);
      console.log('');
    });

    // Count users by role
    console.log('👥 User Statistics:');
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    userStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} total (${stat.active} active)`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
};

// Run if this file is executed directly
if (require.main === module) {
  verifyAdminUser();
}

module.exports = { verifyAdminUser };
