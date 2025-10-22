require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createVendor = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Check if vendor already exists
    const existingVendor = await User.findOne({ email: 'vendor1@ninetyneacres.com' });

    if (existingVendor) {
      console.log('⚠️  Vendor already exists:', existingVendor.email);
      console.log('👤 Vendor Details:');
      console.log('   Email:', existingVendor.email);
      console.log('   Role:', existingVendor.role);
      console.log('   Status:', existingVendor.status);
      console.log('   Name:', `${existingVendor.profile.firstName} ${existingVendor.profile.lastName}`);
      
      await mongoose.disconnect();
      return;
    }

    // Create vendor user
    console.log('📝 Creating vendor user...');
    
    const vendorUserData = {
      email: 'vendor1@ninetyneacres.com',
      password: 'vendor@123', // This will be hashed by the pre-save middleware
      role: 'agent', // Vendors are agents in this system
      status: 'active',
      profile: {
        firstName: 'Vendor',
        lastName: 'One',
        phone: '+91 9876543210',
        emailVerified: true,
        bio: 'Professional Real Estate Vendor',
        address: {
          street: '123 Business Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
          country: 'India'
        },
        preferences: {
          notifications: {
            email: true,
            sms: true,
            push: true
          },
          privacy: {
            showEmail: false,
            showPhone: true
          }
        }
      },
      businessInfo: {
        businessName: 'Vendor One Properties',
        businessType: 'Real Estate Agency',
        experience: 5,
        specializations: ['Residential', 'Commercial'],
        licenseNumber: 'RERA123456789',
        isVerified: true
      }
    };

    const vendorUser = await User.create(vendorUserData);
    
    console.log('✅ Vendor user created successfully!');
    console.log('');
    console.log('📋 Vendor Details:');
    console.log('   Email:', vendorUser.email);
    console.log('   Password: vendor@123');
    console.log('   Role:', vendorUser.role);
    console.log('   Status:', vendorUser.status);
    console.log('   Name:', `${vendorUser.profile.firstName} ${vendorUser.profile.lastName}`);
    console.log('   Phone:', vendorUser.profile.phone);
    console.log('   Business:', vendorUser.businessInfo?.businessName || 'Vendor One Properties');
    console.log('');
    console.log('🔗 Login URLs:');
    console.log('   Vendor Portal: http://localhost:5173/vendor/login');
    console.log('   Admin Panel: http://localhost:5173/admin/login');
    console.log('');
    console.log('🎉 You can now log in with these credentials!');

  } catch (error) {
    console.error('❌ Error creating vendor user:', error.message);
    
    if (error.code === 11000) {
      console.log('⚠️  User with this email already exists');
    }
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
};

// Run if this file is executed directly
if (require.main === module) {
  createVendor();
}

module.exports = { createVendor };