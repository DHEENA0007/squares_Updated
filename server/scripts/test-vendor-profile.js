const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function testVendorProfile() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const vendor = await User.findOne({ email: 'vendor1@ninetyneacres.com' }).select('-password -verificationToken');
    
    if (!vendor) {
      console.log('❌ Vendor not found');
      return;
    }
    
    console.log('✅ Vendor found. Profile structure:');
    console.log('Email:', vendor.email);
    console.log('Role:', vendor.role);
    console.log('Status:', vendor.status);
    console.log('VendorInfo exists:', !!vendor.profile?.vendorInfo);
    console.log('Rating structure:', vendor.profile?.vendorInfo?.rating);
    console.log('MemberSince:', vendor.profile?.vendorInfo?.memberSince);
    console.log('VendorPreferences exists:', !!vendor.profile?.vendorInfo?.vendorPreferences);
    
    // Test the full object structure as it would be returned by API
    console.log('\n📋 Full vendor object (as API would return):');
    const apiResponse = {
      success: true,
      data: {
        user: {
          ...vendor.toObject(),
          statistics: {
            totalProperties: 0,
            totalFavorites: 0,
            totalMessages: 0
          }
        }
      }
    };
    
    console.log('API Response structure valid:', !!apiResponse.data.user.profile.vendorInfo);
    
    await mongoose.disconnect();
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testVendorProfile();