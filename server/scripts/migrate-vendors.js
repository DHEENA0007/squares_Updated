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

// Migration script to move vendor data from User to Vendor model
const migrateVendorData = async () => {
  console.log('Starting vendor data migration...');
  
  try {
    // Find all users with role 'agent' (vendors)
    const vendorUsers = await User.find({ role: 'agent' });
    console.log(`Found ${vendorUsers.length} vendor users to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of vendorUsers) {
      try {
        // Check if vendor record already exists
        const existingVendor = await Vendor.findOne({ user: user._id });
        if (existingVendor) {
          console.log(`Vendor record already exists for user ${user.email}, skipping...`);
          skippedCount++;
          continue;
        }

        // Extract vendor info from user profile
        const vendorInfo = user.profile?.vendorInfo || {};
        
        // Create vendor record
        const vendorData = {
          user: user._id,
          
          // Business Information
          businessInfo: {
            companyName: vendorInfo.companyName || `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'Unknown Business',
            businessType: 'individual', // Default value
            licenseNumber: vendorInfo.licenseNumber || undefined,
            gstNumber: vendorInfo.gstNumber || undefined,
            panNumber: vendorInfo.panNumber || undefined,
            website: vendorInfo.website || undefined
          },

          // Professional Information
          professionalInfo: {
            experience: vendorInfo.experience || 0,
            specializations: vendorInfo.specializations || [],
            serviceAreas: vendorInfo.serviceAreas ? vendorInfo.serviceAreas.map(area => ({
              city: area,
              state: '',
              pincode: '',
              locality: ''
            })) : [],
            languages: ['english'], // Default
            certifications: vendorInfo.certifications || []
          },

          // Contact Information
          contactInfo: {
            officeAddress: {
              street: user.profile?.address?.street || '',
              area: '',
              city: user.profile?.address?.city || '',
              state: user.profile?.address?.state || '',
              country: user.profile?.address?.country || 'India',
              pincode: user.profile?.address?.zipCode || '',
              landmark: ''
            },
            officePhone: user.profile?.phone || '',
            whatsappNumber: user.profile?.phone || '',
            socialMedia: {
              facebook: '',
              instagram: '',
              linkedin: '',
              twitter: '',
              youtube: ''
            }
          },

          // Performance and Analytics
          performance: {
            rating: {
              average: vendorInfo.rating?.average || 0,
              count: vendorInfo.rating?.count || 0,
              breakdown: {
                five: 0,
                four: 0,
                three: 0,
                two: 0,
                one: 0
              }
            },
            statistics: {
              totalProperties: 0,
              activeListing: 0,
              soldProperties: 0,
              rentedProperties: 0,
              totalViews: 0,
              totalLeads: 0,
              totalClients: 0,
              responseTime: {
                average: 0,
                lastCalculated: new Date()
              }
            },
            achievements: []
          },

          // Settings
          settings: {
            notifications: {
              emailNotifications: vendorInfo.vendorPreferences?.emailNotifications !== false,
              smsNotifications: vendorInfo.vendorPreferences?.smsNotifications !== false,
              leadAlerts: vendorInfo.vendorPreferences?.leadAlerts !== false,
              marketingEmails: vendorInfo.vendorPreferences?.marketingEmails === true,
              weeklyReports: vendorInfo.vendorPreferences?.weeklyReports !== false,
              reviewAlerts: true
            },
            privacy: {
              showContactInfo: user.profile?.preferences?.privacy?.showPhone !== false,
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
            },
            autoResponder: {
              enabled: false,
              message: '',
              onlyAfterHours: true
            }
          },

          // Verification
          verification: {
            isVerified: user.status === 'active',
            verificationDate: user.status === 'active' ? user.createdAt : undefined,
            verificationLevel: user.status === 'active' ? 'basic' : 'none',
            documents: []
          },

          // Status
          status: user.status === 'active' ? 'active' : 
                  user.status === 'suspended' ? 'suspended' :
                  user.status === 'pending' ? 'pending_verification' : 'inactive',
          memberSince: vendorInfo.memberSince || user.createdAt,
          lastActive: user.profile?.lastLogin || new Date(),

          // Financial Information
          financial: {
            accountDetails: {
              bankName: '',
              accountNumber: '',
              ifscCode: '',
              accountHolderName: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
              branchName: ''
            },
            billingAddress: {
              isSameAsOffice: true
            }
          },

          // SEO
          seo: {
            slug: '', // Will be auto-generated
            metaTitle: '',
            metaDescription: '',
            keywords: []
          },

          // Metadata
          metadata: {
            source: 'migration',
            notes: 'Migrated from User model',
            tags: ['migrated']
          }
        };

        // Create vendor record
        const vendor = new Vendor(vendorData);
        await vendor.save();

        // Update user to link to vendor profile
        user.vendorProfile = vendor._id;
        await user.save();

        console.log(`✓ Migrated vendor data for user: ${user.email}`);
        migratedCount++;

      } catch (error) {
        console.error(`✗ Error migrating vendor data for user ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total vendor users found: ${vendorUsers.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Skipped (already exists): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('=========================\n');

    if (errorCount > 0) {
      console.log('⚠️  Some vendors failed to migrate. Please check the errors above.');
    } else {
      console.log('✅ All vendor data migrated successfully!');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  }
};

// Rollback function to remove migrated vendor data
const rollbackMigration = async () => {
  console.log('Rolling back vendor migration...');
  
  try {
    const result = await Vendor.deleteMany({ 'metadata.source': 'migration' });
    console.log(`✓ Removed ${result.deletedCount} migrated vendor records`);
  } catch (error) {
    console.error('Rollback failed:', error);
  }
};

// Verify migration function
const verifyMigration = async () => {
  console.log('Verifying migration...');
  
  try {
    const vendorUsers = await User.countDocuments({ role: 'agent' });
    const migratedVendors = await Vendor.countDocuments({ 'metadata.source': 'migration' });
    const totalVendors = await Vendor.countDocuments();

    console.log('\n=== Migration Verification ===');
    console.log(`Users with role 'agent': ${vendorUsers}`);
    console.log(`Migrated vendor records: ${migratedVendors}`);
    console.log(`Total vendor records: ${totalVendors}`);
    
    if (vendorUsers === migratedVendors) {
      console.log('✅ Migration verification successful!');
    } else {
      console.log('⚠️  Migration verification failed. Counts do not match.');
    }
    console.log('==============================\n');

    // Sample verification - check a few records
    const sampleVendors = await Vendor.find({ 'metadata.source': 'migration' })
      .populate('user', 'email profile.firstName profile.lastName')
      .limit(3);

    console.log('Sample migrated vendors:');
    sampleVendors.forEach(vendor => {
      console.log(`- ${vendor.businessInfo.companyName} (${vendor.user.email})`);
    });

  } catch (error) {
    console.error('Verification failed:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  
  const operation = process.argv[2];
  
  switch (operation) {
    case 'migrate':
      await migrateVendorData();
      break;
    case 'rollback':
      await rollbackMigration();
      break;
    case 'verify':
      await verifyMigration();
      break;
    default:
      console.log('Usage:');
      console.log('  node migrate-vendors.js migrate   - Migrate vendor data');
      console.log('  node migrate-vendors.js rollback  - Rollback migration');
      console.log('  node migrate-vendors.js verify    - Verify migration');
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
  migrateVendorData,
  rollbackMigration,
  verifyMigration
};