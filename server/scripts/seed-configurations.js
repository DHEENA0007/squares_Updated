const mongoose = require('mongoose');
require('dotenv').config();

const {
  PropertyType,
  Amenity,
  FilterConfiguration,
  NavigationItem,
} = require('../models/Configuration');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/squares-v3';

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

const navigationItemsData = [
  // Residential properties
  { name: 'Flat / Apartment', value: 'apartment', displayLabel: 'Flat / Apartment', category: 'residential', queryParams: { propertyType: 'apartment' }, displayOrder: 1 },
  { name: 'Residential House', value: 'house', displayLabel: 'Residential House', category: 'residential', queryParams: { propertyType: 'house' }, displayOrder: 2 },
  { name: 'Villa', value: 'villa', displayLabel: 'Villa', category: 'residential', queryParams: { propertyType: 'villa' }, displayOrder: 3 },
  { name: 'Builder Floor Apartment', value: 'builder-floor-apartment', displayLabel: 'Builder Floor Apartment', category: 'residential', queryParams: { propertyType: 'apartment' }, displayOrder: 4 },
  { name: 'Residential Land / Plot', value: 'plot', displayLabel: 'Residential Land / Plot', category: 'residential', queryParams: { propertyType: 'plot' }, displayOrder: 5 },
  { name: 'Penthouse', value: 'penthouse', displayLabel: 'Penthouse', category: 'residential', queryParams: { propertyType: 'apartment' }, displayOrder: 6 },
  { name: 'Studio Apartment', value: 'studio-apartment', displayLabel: 'Studio Apartment', category: 'residential', queryParams: { propertyType: 'apartment' }, displayOrder: 7 },
  { name: 'PG (Paying Guest)', value: 'pg', displayLabel: 'PG (Paying Guest)', category: 'residential', queryParams: { propertyType: 'pg' }, displayOrder: 8 },

  // Commercial properties
  { name: 'Commercial Office Space', value: 'office', displayLabel: 'Commercial Office Space', category: 'commercial', queryParams: { propertyType: 'office' }, displayOrder: 1 },
  { name: 'Office in IT Park / SEZ', value: 'it-park-office', displayLabel: 'Office in IT Park / SEZ', category: 'commercial', queryParams: { propertyType: 'office' }, displayOrder: 2 },
  { name: 'Commercial Shop', value: 'commercial-shop', displayLabel: 'Commercial Shop', category: 'commercial', queryParams: { propertyType: 'commercial' }, displayOrder: 3 },
  { name: 'Commercial Showroom', value: 'commercial-showroom', displayLabel: 'Commercial Showroom', category: 'commercial', queryParams: { propertyType: 'commercial' }, displayOrder: 4 },
  { name: 'Commercial Land', value: 'commercial-land', displayLabel: 'Commercial Land', category: 'commercial', queryParams: { propertyType: 'land' }, displayOrder: 5 },
  { name: 'Warehouse / Godown', value: 'warehouse', displayLabel: 'Warehouse / Godown', category: 'commercial', queryParams: { propertyType: 'commercial' }, displayOrder: 6 },
  { name: 'Industrial Land', value: 'industrial-land', displayLabel: 'Industrial Land', category: 'commercial', queryParams: { propertyType: 'land' }, displayOrder: 7 },
  { name: 'Industrial Building', value: 'industrial-building', displayLabel: 'Industrial Building', category: 'commercial', queryParams: { propertyType: 'commercial' }, displayOrder: 8 },
  { name: 'Industrial Shed', value: 'industrial-shed', displayLabel: 'Industrial Shed', category: 'commercial', queryParams: { propertyType: 'commercial' }, displayOrder: 9 },

  // Agricultural properties
  { name: 'Agricultural Land', value: 'agricultural-land', displayLabel: 'Agricultural Land', category: 'agricultural', queryParams: { propertyType: 'land' }, displayOrder: 1 },
  { name: 'Farm House', value: 'farm-house', displayLabel: 'Farm House', category: 'agricultural', queryParams: { propertyType: 'house' }, displayOrder: 2 },
];

async function seedConfigurations() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Seed Property Types
    console.log('\nSeeding Property Types...');
    for (const propertyType of propertyTypesData) {
      await PropertyType.findOneAndUpdate(
        { value: propertyType.value },
        propertyType,
        { upsert: true, new: true }
      );
      console.log(`✓ ${propertyType.name}`);
    }

    // Seed Amenities
    console.log('\nSeeding Amenities...');
    for (const amenity of amenitiesData) {
      await Amenity.findOneAndUpdate(
        { name: amenity.name },
        amenity,
        { upsert: true, new: true }
      );
      console.log(`✓ ${amenity.name}`);
    }

    // Seed Filter Configurations
    console.log('\nSeeding Filter Configurations...');
    for (const filter of filterConfigurationsData) {
      await FilterConfiguration.findOneAndUpdate(
        { filterType: filter.filterType, value: filter.value },
        filter,
        { upsert: true, new: true }
      );
      console.log(`✓ ${filter.name}`);
    }

    // Seed Navigation Items
    console.log('\nSeeding Navigation Items...');
    for (const navItem of navigationItemsData) {
      await NavigationItem.findOneAndUpdate(
        { category: navItem.category, value: navItem.value },
        navItem,
        { upsert: true, new: true }
      );
      console.log(`✓ ${navItem.name}`);
    }

    console.log('\n✅ Configuration seeding completed successfully!');

    // Display counts
    const propertyTypesCount = await PropertyType.countDocuments();
    const amenitiesCount = await Amenity.countDocuments();
    const filtersCount = await FilterConfiguration.countDocuments();
    const navigationItemsCount = await NavigationItem.countDocuments();

    console.log(`\nDatabase Summary:`);
    console.log(`- Property Types: ${propertyTypesCount}`);
    console.log(`- Amenities: ${amenitiesCount}`);
    console.log(`- Filter Configurations: ${filtersCount}`);
    console.log(`- Navigation Items: ${navigationItemsCount}`);

  } catch (error) {
    console.error('Error seeding configurations:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

seedConfigurations();
