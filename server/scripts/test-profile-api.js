const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

async function testProfileAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find vendor user
    const vendor = await User.findOne({ email: 'vendor1@ninetyneacres.com' });
    if (!vendor) {
      console.log('❌ Vendor not found');
      return;
    }
    
    // Generate token
    const token = jwt.sign(
      { 
        userId: vendor._id, 
        email: vendor.email, 
        role: vendor.role 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
    
    console.log('✅ Token generated for vendor');
    console.log('Token payload:', jwt.decode(token));
    
    // Test the API call (simulate what happens in the profile route)
    console.log('\n🧪 Testing profile route logic...');
    
    // Simulate req.user object as set by auth middleware
    const reqUser = {
      id: vendor._id,
      email: vendor.email,
      role: vendor.role,
      profile: vendor.profile
    };
    
    console.log('req.user object:', reqUser);
    
    // Test the exact query from the profile route
    const user = await User.findById(reqUser.id).select('-password -verificationToken');
    
    if (!user) {
      console.log('❌ Profile route would return 404 - User not found');
      return;
    }
    
    console.log('✅ Profile route would succeed!');
    console.log('User found:', user.email);
    console.log('Profile structure complete:', !!user.profile?.vendorInfo);
    
    // Simulate full API response
    const Property = require('../models/Property');
    const Favorite = require('../models/Favorite');
    const Message = require('../models/Message');
    
    const [totalProperties, totalFavorites, totalMessages] = await Promise.all([
      Property.countDocuments({ owner: reqUser.id }),
      Favorite.countDocuments({ user: reqUser.id }),
      Message.countDocuments({ $or: [{ sender: reqUser.id }, { recipient: reqUser.id }] })
    ]);
    
    const apiResponse = {
      success: true,
      data: {
        user: {
          ...user.toObject(),
          statistics: {
            totalProperties,
            totalFavorites,
            totalMessages
          }
        }
      }
    };
    
    console.log('\n📊 API Response Statistics:');
    console.log('Total Properties:', totalProperties);
    console.log('Total Favorites:', totalFavorites);
    console.log('Total Messages:', totalMessages);
    console.log('\n✅ Profile API would return complete data structure!');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testProfileAPI();