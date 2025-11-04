require('dotenv').config();
const mongoose = require('mongoose');

// User schema (simplified for this check)
const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  status: String,
  profile: {
    firstName: String,
    lastName: String,
    emailVerified: Boolean
  }
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

const checkUserRoles = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB using the environment variable
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ninety-nine-acres');
    console.log('✅ Connected to MongoDB successfully');

    // Check both users
    const usersToCheck = [
      'admin@ninetyneacres.com',
      'admin@buildhomemart.com'
    ];

    console.log('\n📋 User Role Check Results:');
    console.log('=====================================');

    for (const email of usersToCheck) {
      console.log(`\n🔍 Checking user: ${email}`);
      
      const user = await User.findOne({ email: email });
      
      if (user) {
        console.log(`✅ User found:`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   👤 Role: ${user.role}`);
        console.log(`   📊 Status: ${user.status}`);
        console.log(`   👥 Name: ${user.profile.firstName} ${user.profile.lastName}`);
        console.log(`   ✉️  Email Verified: ${user.profile.emailVerified}`);
        console.log(`   🆔 User ID: ${user._id}`);
      } else {
        console.log(`❌ User not found in database`);
      }
      
      console.log(`${'─'.repeat(50)}`);
    }

    // Also get a count of all admin-type users
    console.log('\n📊 Admin Users Summary:');
    console.log('========================');
    
    const adminUsers = await User.find({ 
      role: { $in: ['admin', 'superadmin', 'subadmin'] } 
    }).select('email role status profile.firstName profile.lastName');
    
    console.log(`Total admin-type users: ${adminUsers.length}`);
    
    if (adminUsers.length > 0) {
      adminUsers.forEach(user => {
        console.log(`   ${user.role}: ${user.email} (${user.profile.firstName} ${user.profile.lastName}) - ${user.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ENOTFOUND') || error.message.includes('connection')) {
      console.log('💡 Connection troubleshooting:');
      console.log('   - Check if MONGODB_URI is correctly set in .env file');
      console.log('   - Ensure internet connection is stable');
      console.log('   - Verify MongoDB Atlas cluster is running');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
};

// Run the check
checkUserRoles();
