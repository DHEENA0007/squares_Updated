const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const populateVendorData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ninety-nine-acres');
    console.log('Connected to MongoDB');

    // Find the vendor user
    const vendor = await User.findOne({ email: 'vendor1@ninetyneacres.com' });
    
    if (!vendor) {
      console.log('Vendor user not found');
      return;
    }

    console.log('Found vendor:', vendor.email);

    // Update vendor with sample data
    const updatedProfile = {
      firstName: vendor.profile.firstName,
      lastName: vendor.profile.lastName,
      phone: vendor.profile.phone,
      avatar: vendor.profile.avatar,
      bio: "Experienced real estate professional with over 8 years in Mumbai's premium property market. Specialized in luxury residential and commercial properties.",
      address: {
        street: "Office 304, Tower A, Business Hub",
        city: "Mumbai",
        state: "Maharashtra",
        zipCode: "400001",
        country: "India"
      },
      emailVerified: vendor.profile.emailVerified,
      lastLogin: vendor.profile.lastLogin,
      preferences: vendor.profile.preferences || {
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        privacy: {
          showEmail: false,
          showPhone: false
        }
      },
      vendorInfo: {
        licenseNumber: "MP/RE/2024/001234",
        gstNumber: "27ABCDE1234F1Z5",
        panNumber: "ABCDE1234F",
        companyName: "Kumar Properties & Associates",
        experience: 8,
        website: "www.kumarproperties.com",
        specializations: [
          "Luxury Residential",
          "Commercial Properties", 
          "Investment Properties",
          "New Developments"
        ],
        serviceAreas: [
          "Mumbai Central",
          "Powai",
          "Bandra",
          "Andheri",
          "Worli"
        ],
        certifications: [
          {
            name: "RERA Certified Agent",
            issuedBy: "Maharashtra RERA",
            date: "2020",
            verified: true
          },
          {
            name: "Real Estate Excellence Award",
            issuedBy: "Mumbai Realty Awards", 
            date: "2023",
            verified: true
          }
        ],
        vendorPreferences: {
          emailNotifications: true,
          smsNotifications: true,
          leadAlerts: true,
          marketingEmails: false,
          weeklyReports: true
        },
        rating: {
          average: 4.7,
          count: 234
        },
        responseTime: "2.3 hours",
        memberSince: new Date('2020-01-15')
      }
    };

    vendor.profile = updatedProfile;

    await vendor.save();

    console.log('Vendor data updated successfully!');
    console.log('Updated vendor profile:', JSON.stringify(vendor.profile, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

populateVendorData();