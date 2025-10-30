const mongoose = require('mongoose');
require('dotenv').config();

const { connectDB } = require('../config/database');
const Vendor = require('../models/Vendor');
const fs = require('fs');
const path = require('path');

// Load location data
const locationDataPath = path.join(__dirname, '../../src/services/location.json');
let locationData = {};

try {
  const rawData = fs.readFileSync(locationDataPath, 'utf8');
  locationData = JSON.parse(rawData);
  console.log('Location data loaded successfully');
} catch (error) {
  console.error('Error loading location data:', error);
  process.exit(1);
}

// Helper function to generate ID from name
const generateId = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

// Helper function to find location codes
const findLocationCodes = (cityName, stateName) => {
  let stateCode = '';
  let districtCode = '';
  let cityCode = '';

  // Find state
  for (const [stateNameKey, stateData] of Object.entries(locationData.India)) {
    if (stateNameKey.toLowerCase() === stateName?.toLowerCase()) {
      stateCode = generateId(stateNameKey);
      
      // Find district and city
      for (const [districtName, districtData] of Object.entries(stateData.districts)) {
        if (districtData.cities && districtData.cities.some(city => 
          city.toLowerCase() === cityName?.toLowerCase()
        )) {
          districtCode = generateId(districtName);
          cityCode = generateId(cityName);
          return {
            state: stateNameKey,
            stateCode,
            district: districtName,
            districtCode,
            city: cityName,
            cityCode
          };
        }
      }
      break;
    }
  }

  return {
    state: stateName || '',
    stateCode,
    district: '',
    districtCode,
    city: cityName || '',
    cityCode
  };
};

async function migrateVendorLocationData() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Find all vendors
    const vendors = await Vendor.find({});
    console.log(`Found ${vendors.length} vendors to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const vendor of vendors) {
      let needsUpdate = false;
      const updates = {};

      // Migrate office address
      if (vendor.contactInfo?.officeAddress) {
        const office = vendor.contactInfo.officeAddress;
        
        if (office.city && office.state && (!office.stateCode || !office.districtCode || !office.cityCode)) {
          const locationCodes = findLocationCodes(office.city, office.state);
          
          updates['contactInfo.officeAddress.country'] = 'India';
          updates['contactInfo.officeAddress.countryCode'] = 'IN';
          updates['contactInfo.officeAddress.state'] = locationCodes.state;
          updates['contactInfo.officeAddress.stateCode'] = locationCodes.stateCode;
          updates['contactInfo.officeAddress.district'] = locationCodes.district;
          updates['contactInfo.officeAddress.districtCode'] = locationCodes.districtCode;
          updates['contactInfo.officeAddress.city'] = locationCodes.city;
          updates['contactInfo.officeAddress.cityCode'] = locationCodes.cityCode;
          
          needsUpdate = true;
        }
      }

      // Migrate billing address
      if (vendor.financial?.billingAddress) {
        const billing = vendor.financial.billingAddress;
        
        if (billing.city && billing.state && (!billing.stateCode || !billing.districtCode || !billing.cityCode)) {
          const locationCodes = findLocationCodes(billing.city, billing.state);
          
          updates['financial.billingAddress.country'] = 'India';
          updates['financial.billingAddress.countryCode'] = 'IN';
          updates['financial.billingAddress.state'] = locationCodes.state;
          updates['financial.billingAddress.stateCode'] = locationCodes.stateCode;
          updates['financial.billingAddress.district'] = locationCodes.district;
          updates['financial.billingAddress.districtCode'] = locationCodes.districtCode;
          updates['financial.billingAddress.city'] = locationCodes.city;
          updates['financial.billingAddress.cityCode'] = locationCodes.cityCode;
          
          needsUpdate = true;
        }
      }

      // Migrate service areas
      if (vendor.professionalInfo?.serviceAreas?.length > 0) {
        const updatedServiceAreas = vendor.professionalInfo.serviceAreas.map(area => {
          if (area.city && area.state && (!area.stateCode || !area.districtCode || !area.cityCode)) {
            const locationCodes = findLocationCodes(area.city, area.state);
            return {
              ...area,
              country: 'India',
              countryCode: 'IN',
              state: locationCodes.state,
              stateCode: locationCodes.stateCode,
              district: locationCodes.district,
              districtCode: locationCodes.districtCode,
              city: locationCodes.city,
              cityCode: locationCodes.cityCode
            };
          }
          return area;
        });

        updates['professionalInfo.serviceAreas'] = updatedServiceAreas;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Vendor.findByIdAndUpdate(vendor._id, updates, { new: true });
        migrated++;
        console.log(`✓ Migrated vendor ${vendor._id} (${vendor.businessInfo?.companyName || 'Unknown'})`);
        
        if (migrated % 10 === 0) {
          console.log(`Progress: ${migrated}/${vendors.length} vendors migrated`);
        }
      } else {
        skipped++;
      }
    }

    console.log('\n🎉 Migration completed!');
    console.log(`✓ Migrated: ${migrated} vendors`);
    console.log(`→ Skipped: ${skipped} vendors (already up to date)`);
    console.log(`📊 Total: ${vendors.length} vendors processed`);

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verificationCount = await Vendor.countDocuments({
      'contactInfo.officeAddress.countryCode': 'IN',
      'contactInfo.officeAddress.stateCode': { $exists: true, $ne: '' }
    });
    console.log(`✓ ${verificationCount} vendors now have enhanced location data`);

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Export for use as a module or run directly
if (require.main === module) {
  console.log('🚀 Starting Vendor Location Data Migration...\n');
  migrateVendorLocationData();
}

module.exports = { migrateVendorLocationData };
