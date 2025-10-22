require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const updateVendorRole = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Find and update the vendor user
    const vendorEmail = 'vendor1@ninetyneacres.com';
    
    const existingUser = await User.findOne({ email: vendorEmail });
    
    if (!existingUser) {
      console.log('❌ Vendor user not found');
      return;
    }

    console.log('📝 Current user details:');
    console.log('   Email:', existingUser.email);
    console.log('   Current Role:', existingUser.role);
    console.log('   Status:', existingUser.status);

    // Update the role to agent
    existingUser.role = 'agent';
    await existingUser.save();

    console.log('✅ Vendor role updated successfully!');
    console.log('');
    console.log('📋 Updated Vendor Details:');
    console.log('   Email:', existingUser.email);
    console.log('   New Role:', existingUser.role);
    console.log('   Status:', existingUser.status);
    console.log('   Name:', `${existingUser.profile.firstName} ${existingUser.profile.lastName}`);
    console.log('');
    console.log('🎉 You can now log in as a vendor!');

  } catch (error) {
    console.error('❌ Error updating vendor role:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
};

// Run the update
updateVendorRole();