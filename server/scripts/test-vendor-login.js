const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testVendorLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Test vendor login with vendor1@ninetyneacres.com
    const email = 'vendor1@ninetyneacres.com';
    const password = 'vendor@123';
    
    console.log(`\n🔐 Testing login for: ${email}`);
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found in database');
    console.log('User ID:', user._id);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Status:', user.status);
    
    // Test password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return;
    }
    
    // Generate token (simulate login)
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
    
    console.log('✅ Token generated successfully');
    
    // Decode token to verify
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    console.log('Decoded token:', decoded);
    
    // Test finding user by token userId
    const userFromToken = await User.findById(decoded.userId).select('-password -verificationToken');
    if (userFromToken) {
      console.log('✅ User found by token ID - Login would succeed');
      console.log('Profile exists:', !!userFromToken.profile);
      console.log('VendorInfo exists:', !!userFromToken.profile?.vendorInfo);
    } else {
      console.log('❌ User NOT found by token ID - This would cause 404');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Test completed');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testVendorLogin();
