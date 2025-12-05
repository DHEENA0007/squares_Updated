const mongoose = require('mongoose');
require('dotenv').config();

const {
  PropertyType,
  Amenity,
  FilterConfiguration,
} = require('../models/Configuration');

// Use production MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set!');
  console.error('Please check your .env file in the server directory.');
  process.exit(1);
}

console.log('📍 Target Database:', MONGODB_URI.includes('mongodb+srv') ? 'MongoDB Atlas (Production)' : 'Local MongoDB');

const propertyTypesData = [
  { name: 'Apartment', value: 'apartment', category: 'residential', displayOrder: 1 },
  { name: 'Villa', value: 'villa', category: 'residential', displayOrder: 2 },
  { name: 'House', value: 'house', category: 'residential', displayOrder: 3 },
  { name: 'Plot', value: 'plot', category: 'land', displayOrder: 4 },
  { name: 'Land', value: 'land', category: 'land', displayOrder: 5 },
  { name: 'Commercial', value: 'commercial', category: 'commercial', displayOrder: 6 },
  { name: 'Office', value: 'office', category: 'commercial', displayOrder: 7 },
  { name: 'PG (Paying Guest)', value: 'pg', category: 'special', displayOrder: 8 },
];

const amenitiesData = [
  // Basic
  { name: 'Parking', category: 'basic', displayOrder: 1 },
  { name: 'Power Backup', category: 'basic', displayOrder: 2 },
  { name: 'Water Supply', category: 'basic', displayOrder: 3 },
  { name: 'Lift', category: 'basic', displayOrder: 4 },
  { name: 'WiFi', category: 'basic', displayOrder: 5 },
  { name: 'Air Conditioning', category: 'basic', displayOrder: 6 },
  { name: 'Attached Bathroom', category: 'basic', displayOrder: 7 },
  { name: 'Common Kitchen', category: 'basic', displayOrder: 8 },
  { name: 'Laundry', category: 'basic', displayOrder: 9 },
  
  // Security
  { name: 'Security', category: 'security', displayOrder: 10 },
  { name: 'CCTV', category: 'security', displayOrder: 11 },
  { name: 'Gated Community', category: 'security', displayOrder: 12 },
  { name: 'Fire Safety', category: 'security', displayOrder: 13 },
  { name: '24/7 Security', category: 'security', displayOrder: 14 },
  { name: 'Intercom', category: 'security', displayOrder: 15 },
  
  // Recreational
  { name: 'Swimming Pool', category: 'recreational', displayOrder: 20 },
  { name: 'Gym', category: 'recreational', displayOrder: 21 },
  { name: 'Garden', category: 'recreational', displayOrder: 22 },
  { name: 'Children Play Area', category: 'recreational', displayOrder: 23 },
  { name: 'Club House', category: 'recreational', displayOrder: 24 },
  { name: 'Sports Facilities', category: 'recreational', displayOrder: 25 },
  { name: 'Jogging Track', category: 'recreational', displayOrder: 26 },
  
  // Luxury
  { name: 'Modular Kitchen', category: 'luxury', displayOrder: 30 },
  { name: 'Home Theatre', category: 'luxury', displayOrder: 31 },
  { name: 'Jacuzzi', category: 'luxury', displayOrder: 32 },
  { name: 'Private Terrace', category: 'luxury', displayOrder: 33 },
  { name: 'Servant Room', category: 'luxury', displayOrder: 34 },
  { name: 'Study Room', category: 'luxury', displayOrder: 35 },
  { name: 'Pooja Room', category: 'luxury', displayOrder: 36 },
  { name: 'False Ceiling', category: 'luxury', displayOrder: 37 },
  { name: 'Balcony', category: 'luxury', displayOrder: 38 },
];

const filterConfigurationsData = [
  // Bedroom filters
  { filterType: 'bedroom', name: '1 BHK', value: '1', displayLabel: '1 BHK', displayOrder: 1 },
  { filterType: 'bedroom', name: '2 BHK', value: '2', displayLabel: '2 BHK', displayOrder: 2 },
  { filterType: 'bedroom', name: '3 BHK', value: '3', displayLabel: '3 BHK', displayOrder: 3 },
  { filterType: 'bedroom', name: '4 BHK', value: '4', displayLabel: '4 BHK', displayOrder: 4 },
  { filterType: 'bedroom', name: '5+ BHK', value: '5', displayLabel: '5+ BHK', displayOrder: 5 },
  
  // Budget filters
  { filterType: 'budget', name: 'Under 10L', value: '0-1000000', minValue: 0, maxValue: 1000000, displayLabel: 'Under ₹10L', displayOrder: 1 },
  { filterType: 'budget', name: '10L - 25L', value: '1000000-2500000', minValue: 1000000, maxValue: 2500000, displayLabel: '₹10L - ₹25L', displayOrder: 2 },
  { filterType: 'budget', name: '25L - 50L', value: '2500000-5000000', minValue: 2500000, maxValue: 5000000, displayLabel: '₹25L - ₹50L', displayOrder: 3 },
  { filterType: 'budget', name: '50L - 1Cr', value: '5000000-10000000', minValue: 5000000, maxValue: 10000000, displayLabel: '₹50L - ₹1Cr', displayOrder: 4 },
  { filterType: 'budget', name: 'Above 1Cr', value: '10000000-999999999', minValue: 10000000, maxValue: 999999999, displayLabel: 'Above ₹1Cr', displayOrder: 5 },
  
  // Listing type filters
  { filterType: 'listing_type', name: 'Sale', value: 'sale', displayLabel: 'For Sale', displayOrder: 1 },
  { filterType: 'listing_type', name: 'Rent', value: 'rent', displayLabel: 'For Rent', displayOrder: 2 },
  { filterType: 'listing_type', name: 'Lease', value: 'lease', displayLabel: 'For Lease', displayOrder: 3 },
  
  // Furnishing filters
  { filterType: 'furnishing', name: 'Fully Furnished', value: 'fully-furnished', displayLabel: 'Fully Furnished', displayOrder: 1 },
  { filterType: 'furnishing', name: 'Semi Furnished', value: 'semi-furnished', displayLabel: 'Semi Furnished', displayOrder: 2 },
  { filterType: 'furnishing', name: 'Unfurnished', value: 'unfurnished', displayLabel: 'Unfurnished', displayOrder: 3 },
];

async function seedConfigurations() {
  try {
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Seed Property Types
    console.log('📋 Seeding Property Types...');
    for (const propertyType of propertyTypesData) {
      await PropertyType.findOneAndUpdate(
        { value: propertyType.value },
        propertyType,
        { upsert: true, new: true }
      );
      console.log(`  ✓ ${propertyType.name}`);
    }

    // Seed Amenities
    console.log('\n🏠 Seeding Amenities...');
    for (const amenity of amenitiesData) {
      await Amenity.findOneAndUpdate(
        { name: amenity.name },
        amenity,
        { upsert: true, new: true }
      );
      console.log(`  ✓ ${amenity.name}`);
    }

    // Seed Filter Configurations
    console.log('\n🔍 Seeding Filter Configurations...');
    for (const filter of filterConfigurationsData) {
      await FilterConfiguration.findOneAndUpdate(
        { filterType: filter.filterType, value: filter.value },
        filter,
        { upsert: true, new: true }
      );
      console.log(`  ✓ ${filter.name}`);
    }

    console.log('\n✅ Configuration seeding completed successfully!\n');
    
    // Display counts
    const propertyTypesCount = await PropertyType.countDocuments();
    const amenitiesCount = await Amenity.countDocuments();
    const filtersCount = await FilterConfiguration.countDocuments();
    
    console.log('📊 Database Summary:');
    console.log(`   - Property Types: ${propertyTypesCount}`);
    console.log(`   - Amenities: ${amenitiesCount}`);
    console.log(`   - Filter Configurations: ${filtersCount}\n`);

  } catch (error) {
    console.error('\n❌ Error seeding configurations:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

seedConfigurations();
