require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const updateVendorEmail = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Find user "Vendor One" by multiple criteria
    let user = await User.findOne({
      'profile.firstName': 'Vendor',
      'profile.lastName': 'One'
    });

    // Also try by known email
    if (!user) {
      user = await User.findOne({ email: 'vendor1@ninetyneacres.com' });
    }

    // Also try by known ID
    if (!user) {
      user = await User.findById('68f8b1214f4741e752f0e18b');
    }

    // List all agents/vendors if still not found
    if (!user) {
      console.log('\n📋 Listing all agents/vendors:');
      const agents = await User.find({ role: 'agent' }).select('email profile.firstName profile.lastName');
      agents.forEach(a => {
        console.log(`   - ${a.profile?.firstName} ${a.profile?.lastName}: ${a.email}`);
      });
    }

    if (!user) {
      console.log('❌ User "Vendor One" not found');
      await mongoose.disconnect();
      return;
    }

    console.log('👤 Found user:');
    console.log('   ID:', user._id);
    console.log('   Name:', `${user.profile.firstName} ${user.profile.lastName}`);
    console.log('   Current Email:', user.email);

    const newEmail = 'samplevendor@ninetyneacres.com';

    // Check if new email already exists
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      console.log(`❌ Email "${newEmail}" is already in use by another user`);
      await mongoose.disconnect();
      return;
    }

    // Update email
    user.email = newEmail;
    await user.save();

    console.log('✅ Email updated successfully!');
    console.log('   New Email:', user.email);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

updateVendorEmail();
