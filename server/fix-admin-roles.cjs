require('dotenv').config();
const mongoose = require('mongoose');

// User schema (simplified for this fix)
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

const fixAdminRoles = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB using the environment variable
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ninety-nine-acres');
    console.log('✅ Connected to MongoDB successfully');

    console.log('\n📋 Fixing Admin Role Assignment');
    console.log('=====================================');

    // Update admin@ninetyneacres.com from 'admin' to 'superadmin'
    console.log('\n🔧 Updating admin@ninetyneacres.com role from admin to superadmin...');
    
    const updateResult = await User.findOneAndUpdate(
      { email: 'admin@ninetyneacres.com' },
      { role: 'superadmin' },
      { new: true }
    );

    if (updateResult) {
      console.log('✅ Successfully updated admin@ninetyneacres.com:');
      console.log(`   📧 Email: ${updateResult.email}`);
      console.log(`   👤 New Role: ${updateResult.role}`);
      console.log(`   📊 Status: ${updateResult.status}`);
      console.log(`   👥 Name: ${updateResult.profile.firstName} ${updateResult.profile.lastName}`);
    } else {
      console.log('❌ User admin@ninetyneacres.com not found');
    }

    // Verify the changes
    console.log('\n📊 Final Admin Users Summary:');
    console.log('==============================');
    
    const adminUsers = await User.find({ 
      role: { $in: ['admin', 'superadmin', 'subadmin'] } 
    }).select('email role status profile.firstName profile.lastName');
    
    console.log(`Total admin-type users: ${adminUsers.length}`);
    
    if (adminUsers.length > 0) {
      adminUsers.forEach(user => {
        console.log(`   ${user.role.padEnd(10)} | ${user.email.padEnd(30)} | ${user.profile.firstName} ${user.profile.lastName} | ${user.status}`);
      });
    }

    console.log('\n🎉 Admin role fix completed!');
    console.log('\n📝 Expected Login Behavior:');
    console.log('   admin@ninetyneacres.com   → Super Admin Dashboard (Full Access)');
    console.log('   admin@buildhomemart.com   → Sub Admin Dashboard (Limited Access)');

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

// Run the fix
fixAdminRoles();
