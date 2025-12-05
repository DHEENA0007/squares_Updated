require('dotenv').config();
const mongoose = require('mongoose');
const {
  PropertyType,
  PropertyTypeField,
  Amenity,
  PropertyTypeAmenity,
  FilterConfiguration,
  ConfigurationMetadata,
} = require('../models/Configuration');

// Hardcoded configuration data from the codebase
const configurationData = {
  propertyTypes: [
    { name: 'Apartment', value: 'apartment', category: 'residential', displayOrder: 1 },
    { name: 'Villa', value: 'villa', category: 'residential', displayOrder: 2 },
    { name: 'House', value: 'house', category: 'residential', displayOrder: 3 },
    { name: 'Commercial', value: 'commercial', category: 'commercial', displayOrder: 4 },
    { name: 'Office Space', value: 'office', category: 'commercial', displayOrder: 5 },
    { name: 'Plot', value: 'plot', category: 'land', displayOrder: 6 },
    { name: 'Land', value: 'land', category: 'land', displayOrder: 7 },
    { name: 'PG (Paying Guest)', value: 'pg', category: 'special', displayOrder: 8 },
  ],

  amenities: [
    // Basic Amenities
    { name: 'Parking', category: 'basic', displayOrder: 1 },
    { name: 'Power Backup', category: 'basic', displayOrder: 2 },
    { name: 'Water Supply', category: 'basic', displayOrder: 3 },
    { name: 'Elevator', category: 'basic', displayOrder: 4 },
    { name: 'WiFi', category: 'basic', displayOrder: 5 },

    // Security Amenities
    { name: 'Security', category: 'security', displayOrder: 10 },
    { name: 'CCTV Surveillance', category: 'security', displayOrder: 11 },
    { name: 'Intercom', category: 'security', displayOrder: 12 },
    { name: 'Fire Safety', category: 'security', displayOrder: 13 },
    { name: '24/7 Security', category: 'security', displayOrder: 14 },

    // Recreational Amenities
    { name: 'Swimming Pool', category: 'recreational', displayOrder: 20 },
    { name: 'Gym/Fitness Center', category: 'recreational', displayOrder: 21 },
    { name: 'Garden/Park', category: 'recreational', displayOrder: 22 },
    { name: 'Playground', category: 'recreational', displayOrder: 23 },
    { name: 'Clubhouse', category: 'recreational', displayOrder: 24 },
    { name: 'Jogging Track', category: 'recreational', displayOrder: 25 },
    { name: 'Spa', category: 'recreational', displayOrder: 26 },

    // Other Amenities
    { name: 'Visitor Parking', category: 'basic', displayOrder: 30 },
    { name: 'Waste Management', category: 'basic', displayOrder: 31 },
    { name: 'Shopping Complex', category: 'recreational', displayOrder: 32 },
    { name: 'Restaurant', category: 'recreational', displayOrder: 33 },
    { name: 'Bore Well', category: 'basic', displayOrder: 34 },
    { name: 'Central AC', category: 'luxury', displayOrder: 35 },
    { name: 'Cafeteria', category: 'recreational', displayOrder: 36 },

    // Land/Plot specific
    { name: 'Road Access', category: 'basic', displayOrder: 40 },
    { name: 'Electricity', category: 'basic', displayOrder: 41 },
    { name: 'Water Connection', category: 'basic', displayOrder: 42 },
    { name: 'Sewerage', category: 'basic', displayOrder: 43 },
    { name: 'Clear Title', category: 'basic', displayOrder: 44 },

    // PG specific
    { name: 'Meals Included', category: 'basic', displayOrder: 50 },
    { name: 'Laundry Service', category: 'basic', displayOrder: 51 },
    { name: 'Room Cleaning', category: 'basic', displayOrder: 52 },
    { name: 'Common Kitchen', category: 'basic', displayOrder: 53 },
    { name: 'Common Area', category: 'basic', displayOrder: 54 },
    { name: 'Study Room', category: 'recreational', displayOrder: 55 },
    { name: 'Single Occupancy', category: 'basic', displayOrder: 56 },
    { name: 'Double Occupancy', category: 'basic', displayOrder: 57 },
    { name: 'Triple Occupancy', category: 'basic', displayOrder: 58 },
    { name: 'AC Rooms', category: 'luxury', displayOrder: 59 },
    { name: 'Non-AC Rooms', category: 'basic', displayOrder: 60 },
    { name: 'Attached Bathroom', category: 'basic', displayOrder: 61 },
    { name: 'Common Bathroom', category: 'basic', displayOrder: 62 },
    { name: 'Wi-Fi in Rooms', category: 'basic', displayOrder: 63 },
    { name: 'TV in Rooms', category: 'luxury', displayOrder: 64 },
  ],

  filterConfigurations: [
    // Bedroom filters
    { filterType: 'bedroom', name: 'Any BHK', value: 'any', displayLabel: 'Any BHK', displayOrder: 0 },
    { filterType: 'bedroom', name: '1 BHK', value: '1', displayLabel: '1 BHK', displayOrder: 1 },
    { filterType: 'bedroom', name: '2 BHK', value: '2', displayLabel: '2 BHK', displayOrder: 2 },
    { filterType: 'bedroom', name: '3 BHK', value: '3', displayLabel: '3 BHK', displayOrder: 3 },
    { filterType: 'bedroom', name: '4 BHK', value: '4', displayLabel: '4 BHK', displayOrder: 4 },
    { filterType: 'bedroom', name: '5+ BHK', value: '5', displayLabel: '5+ BHK', displayOrder: 5 },

    // Budget filters
    { filterType: 'budget', name: 'Any Budget', value: 'any-budget', displayLabel: 'Any Budget', displayOrder: 0 },
    { filterType: 'budget', name: '₹20L - ₹40L', value: '20-40', minValue: 2000000, maxValue: 4000000, displayLabel: '₹20L - ₹40L', displayOrder: 1 },
    { filterType: 'budget', name: '₹40L - ₹60L', value: '40-60', minValue: 4000000, maxValue: 6000000, displayLabel: '₹40L - ₹60L', displayOrder: 2 },
    { filterType: 'budget', name: '₹60L - ₹80L', value: '60-80', minValue: 6000000, maxValue: 8000000, displayLabel: '₹60L - ₹80L', displayOrder: 3 },
    { filterType: 'budget', name: '₹80L - ₹1Cr', value: '80-1cr', minValue: 8000000, maxValue: 10000000, displayLabel: '₹80L - ₹1Cr', displayOrder: 4 },
    { filterType: 'budget', name: '₹1Cr+', value: '1cr+', minValue: 10000000, displayLabel: '₹1Cr+', displayOrder: 5 },

    // Listing type filters
    { filterType: 'listing_type', name: 'All Types', value: 'all', displayLabel: 'All Types', displayOrder: 0 },
    { filterType: 'listing_type', name: 'For Sale', value: 'sale', displayLabel: 'For Sale', displayOrder: 1 },
    { filterType: 'listing_type', name: 'For Rent', value: 'rent', displayLabel: 'For Rent', displayOrder: 2 },
    { filterType: 'listing_type', name: 'For Lease', value: 'lease', displayLabel: 'For Lease', displayOrder: 3 },

    // Furnishing type filters
    { filterType: 'furnishing', name: 'Fully Furnished', value: 'furnished', displayLabel: 'Fully Furnished', displayOrder: 1 },
    { filterType: 'furnishing', name: 'Semi Furnished', value: 'semi_furnished', displayLabel: 'Semi Furnished', displayOrder: 2 },
    { filterType: 'furnishing', name: 'Unfurnished', value: 'unfurnished', displayLabel: 'Unfurnished', displayOrder: 3 },
  ],

  // Property type fields definitions
  propertyTypeFields: {
    apartment: [
      { fieldName: 'bedrooms', fieldLabel: 'Bedrooms', fieldType: 'select', fieldOptions: ['1', '2', '3', '4', '5+'], isRequired: true, displayOrder: 1 },
      { fieldName: 'bathrooms', fieldLabel: 'Bathrooms', fieldType: 'select', fieldOptions: ['1', '2', '3', '4+'], isRequired: true, displayOrder: 2 },
      { fieldName: 'builtUpArea', fieldLabel: 'Built-up Area (sq.ft)', fieldType: 'number', isRequired: true, displayOrder: 3 },
      { fieldName: 'floor', fieldLabel: 'Floor', fieldType: 'number', isRequired: true, displayOrder: 4 },
      { fieldName: 'totalFloors', fieldLabel: 'Total Floors', fieldType: 'number', isRequired: true, displayOrder: 5 },
      { fieldName: 'furnishing', fieldLabel: 'Furnishing', fieldType: 'select', fieldOptions: ['Fully Furnished', 'Semi Furnished', 'Unfurnished'], isRequired: false, displayOrder: 6 },
    ],
    villa: [
      { fieldName: 'bedrooms', fieldLabel: 'Bedrooms', fieldType: 'select', fieldOptions: ['2', '3', '4', '5+'], isRequired: true, displayOrder: 1 },
      { fieldName: 'bathrooms', fieldLabel: 'Bathrooms', fieldType: 'select', fieldOptions: ['2', '3', '4', '5+'], isRequired: true, displayOrder: 2 },
      { fieldName: 'builtUpArea', fieldLabel: 'Built-up Area (sq.ft)', fieldType: 'number', isRequired: true, displayOrder: 3 },
      { fieldName: 'plotArea', fieldLabel: 'Plot Area (sq.ft)', fieldType: 'number', isRequired: true, displayOrder: 4 },
      { fieldName: 'furnishing', fieldLabel: 'Furnishing', fieldType: 'select', fieldOptions: ['Fully Furnished', 'Semi Furnished', 'Unfurnished'], isRequired: false, displayOrder: 5 },
    ],
    house: [
      { fieldName: 'bedrooms', fieldLabel: 'Bedrooms', fieldType: 'select', fieldOptions: ['1', '2', '3', '4', '5+'], isRequired: true, displayOrder: 1 },
      { fieldName: 'bathrooms', fieldLabel: 'Bathrooms', fieldType: 'select', fieldOptions: ['1', '2', '3', '4+'], isRequired: true, displayOrder: 2 },
      { fieldName: 'builtUpArea', fieldLabel: 'Built-up Area (sq.ft)', fieldType: 'number', isRequired: true, displayOrder: 3 },
      { fieldName: 'furnishing', fieldLabel: 'Furnishing', fieldType: 'select', fieldOptions: ['Fully Furnished', 'Semi Furnished', 'Unfurnished'], isRequired: false, displayOrder: 4 },
    ],
    commercial: [
      { fieldName: 'commercialType', fieldLabel: 'Commercial Type', fieldType: 'select', fieldOptions: ['Office Space', 'Retail Shop', 'Showroom', 'Warehouse', 'Restaurant Space'], isRequired: true, displayOrder: 1 },
      { fieldName: 'builtUpArea', fieldLabel: 'Built-up Area (sq.ft)', fieldType: 'number', isRequired: true, displayOrder: 2 },
      { fieldName: 'floor', fieldLabel: 'Floor', fieldType: 'number', isRequired: false, displayOrder: 3 },
    ],
    office: [
      { fieldName: 'builtUpArea', fieldLabel: 'Built-up Area (sq.ft)', fieldType: 'number', isRequired: true, displayOrder: 1 },
      { fieldName: 'floor', fieldLabel: 'Floor', fieldType: 'number', isRequired: false, displayOrder: 2 },
      { fieldName: 'cabins', fieldLabel: 'Number of Cabins', fieldType: 'number', isRequired: false, displayOrder: 3 },
      { fieldName: 'workstations', fieldLabel: 'Workstations', fieldType: 'number', isRequired: false, displayOrder: 4 },
    ],
    plot: [
      { fieldName: 'plotArea', fieldLabel: 'Plot Area (sq.ft)', fieldType: 'number', isRequired: true, displayOrder: 1 },
      { fieldName: 'plotType', fieldLabel: 'Plot Type', fieldType: 'select', fieldOptions: ['Residential', 'Commercial', 'Industrial'], isRequired: true, displayOrder: 2 },
      { fieldName: 'boundaryWall', fieldLabel: 'Boundary Wall', fieldType: 'boolean', isRequired: false, displayOrder: 3 },
      { fieldName: 'roadWidth', fieldLabel: 'Road Width (ft)', fieldType: 'number', isRequired: false, displayOrder: 4 },
      { fieldName: 'cornerPlot', fieldLabel: 'Corner Plot', fieldType: 'boolean', isRequired: false, displayOrder: 5 },
    ],
    land: [
      { fieldName: 'landArea', fieldLabel: 'Land Area', fieldType: 'number', isRequired: true, displayOrder: 1 },
      { fieldName: 'areaUnit', fieldLabel: 'Area Unit', fieldType: 'select', fieldOptions: ['Square Feet', 'Acre', 'Square Meter'], isRequired: true, displayOrder: 2 },
      { fieldName: 'landType', fieldLabel: 'Land Type', fieldType: 'select', fieldOptions: ['Residential', 'Commercial', 'Agricultural', 'Industrial'], isRequired: true, displayOrder: 3 },
    ],
    pg: [
      { fieldName: 'roomSharing', fieldLabel: 'Room Sharing', fieldType: 'select', fieldOptions: ['Single', 'Double', 'Triple', '4+ Sharing'], isRequired: true, displayOrder: 1 },
      { fieldName: 'foodAvailability', fieldLabel: 'Food Availability', fieldType: 'select', fieldOptions: ['Meals Included', 'Kitchen Available', 'No Meals'], isRequired: false, displayOrder: 2 },
      { fieldName: 'genderPreference', fieldLabel: 'Gender Preference', fieldType: 'select', fieldOptions: ['Boys Only', 'Girls Only', 'Co-ed'], isRequired: false, displayOrder: 3 },
      { fieldName: 'numberOfRooms', fieldLabel: 'Number of Rooms', fieldType: 'number', isRequired: false, displayOrder: 4 },
    ],
  },

  // Property type amenity mappings
  propertyTypeAmenities: {
    apartment: ['Elevator', 'Parking', 'Security', 'Power Backup', 'Water Supply', 'Gym/Fitness Center', 'Swimming Pool', 'Garden/Park'],
    villa: ['Swimming Pool', 'Garden/Park', 'Parking', 'Security', 'Power Backup', 'Clubhouse', 'Spa'],
    house: ['Parking', 'Security', 'Garden/Park', 'Power Backup', 'Water Supply', 'Bore Well'],
    commercial: ['Parking', 'Security', 'Power Backup', 'Elevator', 'CCTV Surveillance', 'Fire Safety', 'Central AC'],
    office: ['Parking', 'Security', 'Power Backup', 'Elevator', 'CCTV Surveillance', 'Central AC', 'Cafeteria'],
    plot: ['Road Access', 'Electricity', 'Water Connection', 'Sewerage'],
    land: ['Road Access', 'Electricity', 'Water Connection', 'Clear Title'],
    pg: ['Meals Included', 'Laundry Service', 'Room Cleaning', '24/7 Security', 'WiFi', 'AC Rooms', 'Attached Bathroom'],
  },
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Import configuration data
const importConfigurationData = async () => {
  try {
    console.log('\n🚀 Starting configuration data import...\n');

    // Clear existing data (optional - comment out if you want to preserve existing data)
    console.log('🗑️  Clearing existing configuration data...');
    await PropertyType.deleteMany({});
    await PropertyTypeField.deleteMany({});
    await Amenity.deleteMany({});
    await PropertyTypeAmenity.deleteMany({});
    await FilterConfiguration.deleteMany({});
    await ConfigurationMetadata.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // 1. Import Property Types
    console.log('📦 Importing Property Types...');
    const propertyTypes = await PropertyType.insertMany(configurationData.propertyTypes);
    console.log(`✅ Imported ${propertyTypes.length} property types\n`);

    // Create a map of property type values to IDs
    const propertyTypeMap = {};
    propertyTypes.forEach(pt => {
      propertyTypeMap[pt.value] = pt._id;
    });

    // 2. Import Amenities
    console.log('🏊 Importing Amenities...');
    const amenities = await Amenity.insertMany(configurationData.amenities);
    console.log(`✅ Imported ${amenities.length} amenities\n`);

    // Create a map of amenity names to IDs
    const amenityMap = {};
    amenities.forEach(am => {
      amenityMap[am.name] = am._id;
    });

    // 3. Import Property Type Fields
    console.log('📝 Importing Property Type Fields...');
    let totalFields = 0;
    for (const [propertyTypeValue, fields] of Object.entries(configurationData.propertyTypeFields)) {
      if (propertyTypeMap[propertyTypeValue]) {
        const fieldsWithPropertyType = fields.map(field => ({
          ...field,
          propertyTypeId: propertyTypeMap[propertyTypeValue],
        }));
        await PropertyTypeField.insertMany(fieldsWithPropertyType);
        totalFields += fieldsWithPropertyType.length;
        console.log(`  ✅ Imported ${fieldsWithPropertyType.length} fields for ${propertyTypeValue}`);
      }
    }
    console.log(`✅ Imported ${totalFields} total property type fields\n`);

    // 4. Import Property Type Amenity Mappings
    console.log('🔗 Importing Property Type Amenity Mappings...');
    let totalMappings = 0;
    for (const [propertyTypeValue, amenityNames] of Object.entries(configurationData.propertyTypeAmenities)) {
      if (propertyTypeMap[propertyTypeValue]) {
        const mappings = amenityNames
          .filter(name => amenityMap[name])
          .map(name => ({
            propertyTypeId: propertyTypeMap[propertyTypeValue],
            amenityId: amenityMap[name],
            isDefault: true,
          }));

        if (mappings.length > 0) {
          await PropertyTypeAmenity.insertMany(mappings);
          totalMappings += mappings.length;
          console.log(`  ✅ Mapped ${mappings.length} amenities to ${propertyTypeValue}`);
        }
      }
    }
    console.log(`✅ Created ${totalMappings} property type amenity mappings\n`);

    // 5. Import Filter Configurations
    console.log('🔍 Importing Filter Configurations...');
    const filters = await FilterConfiguration.insertMany(configurationData.filterConfigurations);
    console.log(`✅ Imported ${filters.length} filter configurations\n`);

    // 6. Import Configuration Metadata
    console.log('⚙️  Importing Configuration Metadata...');
    await ConfigurationMetadata.insertMany([
      { configKey: 'app_version', configValue: '1.0.0', description: 'Application configuration version' },
      { configKey: 'last_config_update', configValue: new Date().toISOString(), description: 'Last configuration update timestamp' },
      { configKey: 'default_currency', configValue: 'INR', description: 'Default currency for the application' },
    ]);
    console.log('✅ Imported configuration metadata\n');

    // Summary
    console.log('✨ Import Summary:');
    console.log(`   - Property Types: ${propertyTypes.length}`);
    console.log(`   - Amenities: ${amenities.length}`);
    console.log(`   - Property Type Fields: ${totalFields}`);
    console.log(`   - Property Type Amenity Mappings: ${totalMappings}`);
    console.log(`   - Filter Configurations: ${filters.length}`);
    console.log(`   - Configuration Metadata: 3`);
    console.log('\n🎉 Configuration data import completed successfully!\n');

  } catch (error) {
    console.error('❌ Import Error:', error.message);
    console.error(error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await importConfigurationData();
    console.log('✅ All operations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    process.exit(1);
  }
};

// Run the script
main();
