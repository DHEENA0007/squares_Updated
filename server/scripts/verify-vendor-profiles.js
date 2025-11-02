const mongoose = require('mongoose');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Verify and fix vendor profiles
const verifyVendorProfiles = async () => {
  console.log('Verifying vendor profiles...\n');
  
  try {
    // Find all users with role 'agent'
    const agentUsers = await User.find({ role: 'agent' });
    console.log(`Found ${agentUsers.length} agent users`);

    let foundVendors = 0;
    let missingVendors = 0;
    let linkedUsers = 0;
    let createdVendors = 0;

    for (const user of agentUsers) {
      console.log(`\nChecking user: ${user.email}`);
      
      // Check if vendor profile exists
      const vendor = await Vendor.findOne({ user: user._id });
      
      if (vendor) {
        console.log(`  ✓ Vendor profile exists: ${vendor.businessInfo.companyName}`);
        foundVendors++;
        
        // Check if user has vendor profile linked
        if (!user.vendorProfile) {
          console.log(`  → Linking vendor profile to user`);
          user.vendorProfile = vendor._id;
          await user.save();
          linkedUsers++;
        } else {
          console.log(`  ✓ User already linked to vendor profile`);
        }
      } else {
        console.log(`  ✗ Missing vendor profile`);
        missingVendors++;
        
        // Create minimal vendor profile
        const vendorData = {
          user: user._id,
          businessInfo: {
            companyName: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || user.email.split('@')[0],
            businessType: 'individual'
          },
          professionalInfo: {
            experience: 0,
            specializations: [],
            serviceAreas: [],
            languages: ['english'],
            certifications: []
          },
          contactInfo: {
            officeAddress: {
              street: '',
              area: '',
              city: '',
              state: '',
              country: 'India',
              pincode: ''
            },
            officePhone: user.profile?.phone || '',
            whatsappNumber: user.profile?.phone || ''
          },
          performance: {
            rating: {
              average: 0,
              count: 0,
              breakdown: { five: 0, four: 0, three: 0, two: 0, one: 0 }
            },
            statistics: {
              totalProperties: 0,
              activeListing: 0,
              soldProperties: 0,
              rentedProperties: 0,
              totalViews: 0,
              totalLeads: 0,
              totalClients: 0,
              responseTime: { average: 0, lastCalculated: new Date() }
            }
          },
          settings: {
            notifications: {
              emailNotifications: true,
              smsNotifications: true,
              leadAlerts: true,
              marketingEmails: false,
              weeklyReports: true,
              reviewAlerts: true
            },
            privacy: {
              showContactInfo: true,
              showPerformanceStats: true,
              allowDirectContact: true
            },
            businessHours: {
              monday: { open: '09:00', close: '18:00', isOpen: true },
              tuesday: { open: '09:00', close: '18:00', isOpen: true },
              wednesday: { open: '09:00', close: '18:00', isOpen: true },
              thursday: { open: '09:00', close: '18:00', isOpen: true },
              friday: { open: '09:00', close: '18:00', isOpen: true },
              saturday: { open: '09:00', close: '18:00', isOpen: true },
              sunday: { open: '10:00', close: '17:00', isOpen: false }
            }
          },
          verification: {
            isVerified: user.status === 'active',
            verificationLevel: user.status === 'active' ? 'basic' : 'none'
          },
          status: user.status === 'active' ? 'active' : 'pending_verification',
          memberSince: user.createdAt,
          metadata: {
            source: 'verification_script',
            notes: 'Created during verification process'
          }
        };

        const newVendor = new Vendor(vendorData);
        await newVendor.save();
        
        // Link to user
        user.vendorProfile = newVendor._id;
        await user.save();
        
        console.log(`  ✓ Created vendor profile: ${newVendor.businessInfo.companyName}`);
        createdVendors++;
        linkedUsers++;
      }
    }

    console.log('\n=== Verification Summary ===');
    console.log(`Total agent users: ${agentUsers.length}`);
    console.log(`Found existing vendors: ${foundVendors}`);
    console.log(`Missing vendors: ${missingVendors}`);
    console.log(`Created new vendors: ${createdVendors}`);
    console.log(`Linked user profiles: ${linkedUsers}`);
    console.log('============================\n');

    // Test vendor access
    console.log('Testing vendor access...');
    const testUser = agentUsers[0];
    if (testUser) {
      const testVendor = await Vendor.findByUserId(testUser._id);
      if (testVendor) {
        console.log(`✓ Test vendor access successful for ${testUser.email}`);
        console.log(`  Company: ${testVendor.businessInfo.companyName}`);
        console.log(`  Status: ${testVendor.status}`);
      } else {
        console.log(`✗ Test vendor access failed for ${testUser.email}`);
      }
    }

  } catch (error) {
    console.error('Verification failed:', error);
  }
};

// List all vendor profiles
const listVendorProfiles = async () => {
  console.log('Listing all vendor profiles...\n');
  
  try {
    const vendors = await Vendor.find().populate('user', 'email role status');
    
    console.log(`Found ${vendors.length} vendor profiles:\n`);
    
    vendors.forEach((vendor, index) => {
      console.log(`${index + 1}. ${vendor.businessInfo.companyName}`);
      console.log(`   User: ${vendor.user.email} (${vendor.user.role})`);
      console.log(`   Status: ${vendor.status}`);
      console.log(`   Verified: ${vendor.verification.isVerified}`);
      console.log(`   Created: ${vendor.createdAt.toDateString()}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Listing failed:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  
  const operation = process.argv[2];
  
  switch (operation) {
    case 'verify':
      await verifyVendorProfiles();
      break;
    case 'list':
      await listVendorProfiles();
      break;
    default:
      console.log('Usage:');
      console.log('  node scripts/verify-vendor-profiles.js verify  - Verify and fix vendor profiles');
      console.log('  node scripts/verify-vendor-profiles.js list    - List all vendor profiles');
  }
  
  process.exit(0);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  verifyVendorProfiles,
  listVendorProfiles
};