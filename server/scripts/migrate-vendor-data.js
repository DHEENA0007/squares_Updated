const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const migrateVendorData = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Find all vendor users (role: 'agent')
    const vendors = await User.find({ role: 'agent' });
    console.log(`📊 Found ${vendors.length} vendor users to migrate`);

    for (const vendor of vendors) {
      console.log(`\n🔧 Migrating vendor: ${vendor.email}`);
      
      // Ensure vendor has proper profile structure
      if (!vendor.profile) {
        vendor.profile = {};
      }

      // Ensure vendorInfo exists with all required fields
      if (!vendor.profile.vendorInfo) {
        vendor.profile.vendorInfo = {};
      }

      const vendorInfo = vendor.profile.vendorInfo;

      // Set default vendorInfo fields if missing
      if (!vendorInfo.licenseNumber) vendorInfo.licenseNumber = null;
      if (!vendorInfo.gstNumber) vendorInfo.gstNumber = null;
      if (!vendorInfo.panNumber) vendorInfo.panNumber = null;
      if (!vendorInfo.companyName) vendorInfo.companyName = null;
      if (!vendorInfo.website) vendorInfo.website = null;
      if (!vendorInfo.experience) vendorInfo.experience = 0;
      
      // Ensure arrays exist
      if (!vendorInfo.specializations) vendorInfo.specializations = [];
      if (!vendorInfo.serviceAreas) vendorInfo.serviceAreas = [];
      if (!vendorInfo.certifications) vendorInfo.certifications = [];

      // Ensure rating object exists
      if (!vendorInfo.rating) {
        vendorInfo.rating = {
          average: 0,
          count: 0
        };
      }

      // Ensure vendorPreferences exist
      if (!vendorInfo.vendorPreferences) {
        vendorInfo.vendorPreferences = {
          emailNotifications: true,
          smsNotifications: true,
          leadAlerts: true,
          marketingEmails: false,
          weeklyReports: true
        };
      }

      // Set response time if missing
      if (!vendorInfo.responseTime) {
        vendorInfo.responseTime = "Not calculated";
      }

      // Set member since date if missing
      if (!vendorInfo.memberSince) {
        vendorInfo.memberSince = vendor.createdAt || new Date();
      }

      // Ensure profile fields exist
      if (!vendor.profile.firstName) vendor.profile.firstName = "Vendor";
      if (!vendor.profile.lastName) vendor.profile.lastName = "User";
      if (!vendor.profile.phone) vendor.profile.phone = "+91 0000000000";
      if (!vendor.profile.bio) vendor.profile.bio = "Professional Real Estate Vendor";
      if (!vendor.profile.emailVerified) vendor.profile.emailVerified = true;

      // Ensure address object exists
      if (!vendor.profile.address) {
        vendor.profile.address = {
          street: null,
          city: null,
          state: null,
          zipCode: null,
          country: "India"
        };
      }

      // Ensure preferences exist
      if (!vendor.profile.preferences) {
        vendor.profile.preferences = {
          notifications: {
            email: true,
            sms: true,
            push: true
          },
          privacy: {
            showEmail: false,
            showPhone: true
          }
        };
      }

      // Save the updated vendor
      await vendor.save();
      console.log(`✅ Migrated vendor: ${vendor.email}`);
    }

    console.log(`\n🎉 Successfully migrated ${vendors.length} vendor users!`);
    
    // Display final vendor data structure
    console.log('\n📋 Final vendor data structure:');
    const updatedVendors = await User.find({ role: 'agent' }).select('email profile.firstName profile.lastName profile.vendorInfo');
    updatedVendors.forEach(vendor => {
      console.log(`${vendor.email}:`);
      console.log(`  - Name: ${vendor.profile.firstName} ${vendor.profile.lastName}`);
      console.log(`  - Company: ${vendor.profile.vendorInfo?.companyName || 'Not set'}`);
      console.log(`  - Experience: ${vendor.profile.vendorInfo?.experience || 0} years`);
      console.log(`  - Rating: ${vendor.profile.vendorInfo?.rating?.average || 0}/5 (${vendor.profile.vendorInfo?.rating?.count || 0} reviews)`);
      console.log(`  - Specializations: ${vendor.profile.vendorInfo?.specializations?.length || 0} items`);
      console.log(`  - Service Areas: ${vendor.profile.vendorInfo?.serviceAreas?.length || 0} areas`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run migration
migrateVendorData();