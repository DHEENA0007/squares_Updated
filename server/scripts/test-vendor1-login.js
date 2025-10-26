require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const testLogin = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Find the vendor1 user
    const vendor = await User.findOne({ email: 'vendor1@ninetyneacres.com' });

    if (!vendor) {
      console.log('❌ User vendor1@ninetyneacres.com not found');
      await mongoose.disconnect();
      return;
    }

    console.log('👤 User found:');
    console.log('   Email:', vendor.email);
    console.log('   Role:', vendor.role);
    console.log('   Status:', vendor.status);
    console.log('   Name:', `${vendor.profile.firstName} ${vendor.profile.lastName}`);
    console.log('   Email Verified:', vendor.profile.emailVerified);
    console.log('   Last Login:', vendor.profile.lastLogin);
    console.log('');

    // Test different password combinations
    const passwordsToTest = [
      'Vendor@123',
      'vendor@123',
      'Vendor123',
      'vendor123',
      'vendor@1234',
      'password',
      'admin123'
    ];

    console.log('🔓 Testing passwords...');
    console.log('');

    for (const password of passwordsToTest) {
      try {
        const isMatch = await vendor.comparePassword(password);
        console.log(`   ${password.padEnd(15)} : ${isMatch ? '✅ MATCH' : '❌ No match'}`);
        
        if (isMatch) {
          console.log('');
          console.log('🎉 CORRECT PASSWORD FOUND!');
          console.log('   Email: vendor1@ninetyneacres.com');
          console.log('   Password:', password);
          break;
        }
      } catch (error) {
        console.log(`   ${password.padEnd(15)} : ❌ Error: ${error.message}`);
      }
    }

    console.log('');
    console.log('💡 If none of the above work, the user might need a password reset.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
};

// Also test if we can manually set a known password
const resetVendor1Password = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    const vendor = await User.findOne({ email: 'vendor1@ninetyneacres.com' });

    if (!vendor) {
      console.log('❌ User vendor1@ninetyneacres.com not found');
      await mongoose.disconnect();
      return;
    }

    // Set password to Vendor@123
    vendor.password = 'Vendor@123';
    vendor.status = 'active';
    vendor.profile.emailVerified = true;
    
    await vendor.save();

    console.log('✅ Password reset successfully!');
    console.log('   Email: vendor1@ninetyneacres.com');
    console.log('   New Password: Vendor@123');
    console.log('   Status:', vendor.status);
    console.log('   Email Verified:', vendor.profile.emailVerified);

  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
};

// Run the test
if (process.argv[2] === 'reset') {
  resetVendor1Password();
} else {
  testLogin();
}