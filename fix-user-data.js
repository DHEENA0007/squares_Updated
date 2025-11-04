require('dotenv').config();
const mongoose = require('mongoose');

// User schema
const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  status: String,
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    emailVerified: Boolean,
    phoneVerified: Boolean,
    preferences: Object
  }
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

const fixUserData = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB using the environment variable
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ninety-nine-acres');
    console.log('✅ Connected to MongoDB successfully');

    console.log('\n🔧 Fixing user data issues...');
    console.log('=====================================');

    // 1. Fix users with invalid status 'inactive' -> change to 'suspended'
    const invalidStatusUsers = await User.find({ status: 'inactive' });
    console.log(`\n📋 Found ${invalidStatusUsers.length} users with invalid 'inactive' status`);
    
    for (const user of invalidStatusUsers) {
      console.log(`   Fixing user: ${user.email} (status: ${user.status} -> suspended)`);
      user.status = 'suspended';
      await user.save();
    }

    // 2. Fix users with role 'customer' -> change to 'customer' (ensure consistency)
    const customerUsers = await User.find({ role: 'customer' });
    console.log(`\n📋 Found ${customerUsers.length} customer users`);

    // 3. Ensure emailVerified is properly set for active users
    const activeUsers = await User.find({ status: 'active' });
    console.log(`\n📋 Found ${activeUsers.length} active users`);
    
    let updatedCount = 0;
    for (const user of activeUsers) {
      let needsUpdate = false;
      
      // If user is active but emailVerified is false, set it to true
      if (!user.profile.emailVerified) {
        console.log(`   Setting emailVerified=true for active user: ${user.email}`);
        user.profile.emailVerified = true;
        needsUpdate = true;
      }

      // Ensure phoneVerified field exists (default to false if not set)
      if (user.profile.phoneVerified === undefined) {
        user.profile.phoneVerified = false;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await user.save();
        updatedCount++;
      }
    }

    console.log(`   Updated ${updatedCount} users with verification status`);

    // 4. Display summary of all users
    console.log('\n📊 Final User Summary:');
    console.log('=====================');
    
    const userStats = await User.aggregate([
      {
        $group: {
          _id: { role: '$role', status: '$status' },
          count: { $sum: 1 },
          users: { $push: { email: '$email', emailVerified: '$profile.emailVerified' } }
        }
      },
      { $sort: { '_id.role': 1, '_id.status': 1 } }
    ]);

    userStats.forEach(stat => {
      console.log(`\n📂 Role: ${stat._id.role} | Status: ${stat._id.status} | Count: ${stat.count}`);
      stat.users.forEach(user => {
        console.log(`   - ${user.email} (Email Verified: ${user.emailVerified})`);
      });
    });

    console.log('\n✅ User data fixes completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing user data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run the fix
fixUserData();
