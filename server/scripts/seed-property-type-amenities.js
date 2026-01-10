const mongoose = require('mongoose');
require('dotenv').config();

const {
    PropertyType,
    Amenity,
    PropertyTypeAmenity,
} = require('../models/Configuration');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/squares-v3';

// Define mappings based on property type values
const propertyTypeMappings = {
    // Residential - Full amenities
    'apartment': 'all',
    'villa': 'all',
    'house': 'all',

    // PG - Specific set
    'pg': [
        'Parking', 'Power Backup', 'Water Supply', 'Lift', 'WiFi', 'Air Conditioning',
        'Attached Bathroom', 'Common Kitchen', 'Laundry',
        'Security', 'CCTV', '24/7 Security', 'Intercom',
        'Gym', 'Garden'
    ],

    // Land/Plot - Limited set
    'plot': [
        'Water Supply', 'Power Backup',
        'Security', 'Gated Community', '24/7 Security',
        'Garden', 'Children Play Area', 'Jogging Track', 'Club House', 'Sports Facilities'
    ],
    'land': [
        'Water Supply',
        'Security', 'Gated Community'
    ],

    // Commercial - Business focused
    'commercial': [
        'Parking', 'Power Backup', 'Water Supply', 'Lift', 'WiFi', 'Air Conditioning',
        'Security', 'CCTV', 'Fire Safety', '24/7 Security', 'Intercom'
    ],
    'office': [
        'Parking', 'Power Backup', 'Water Supply', 'Lift', 'WiFi', 'Air Conditioning',
        'Security', 'CCTV', 'Fire Safety', '24/7 Security', 'Intercom',
        'Gym', 'Cafeteria' // Cafeteria not in seed, but if added later it will work
    ]
};

async function seedPropertyTypeAmenities() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Fetch all Property Types and Amenities
        const propertyTypes = await PropertyType.find({});
        const amenities = await Amenity.find({});

        if (propertyTypes.length === 0) {
            console.log('No property types found. Run seed-configurations.js first.');
            return;
        }

        if (amenities.length === 0) {
            console.log('No amenities found. Run seed-configurations.js first.');
            return;
        }

        console.log(`Found ${propertyTypes.length} property types and ${amenities.length} amenities.`);

        // 2. Clear existing mappings
        console.log('Clearing existing property type amenity mappings...');
        await PropertyTypeAmenity.deleteMany({});

        // 3. Create new mappings
        console.log('Creating new mappings...');
        let mappingCount = 0;

        for (const propertyType of propertyTypes) {
            const mappingRule = propertyTypeMappings[propertyType.value];

            if (!mappingRule) {
                console.log(`No mapping rule for property type: ${propertyType.name} (${propertyType.value}). Skipping.`);
                continue;
            }

            let amenitiesToMap = [];

            if (mappingRule === 'all') {
                amenitiesToMap = amenities;
            } else if (Array.isArray(mappingRule)) {
                amenitiesToMap = amenities.filter(a => mappingRule.includes(a.name));
            }

            if (amenitiesToMap.length > 0) {
                const mappings = amenitiesToMap.map(amenity => ({
                    propertyTypeId: propertyType._id,
                    amenityId: amenity._id,
                    isDefault: false // You can set this logic if needed
                }));

                await PropertyTypeAmenity.insertMany(mappings);
                mappingCount += mappings.length;
                console.log(`✓ Mapped ${mappings.length} amenities to ${propertyType.name}`);
            } else {
                console.log(`No matching amenities found for ${propertyType.name}`);
            }
        }

        console.log(`\n✅ Successfully created ${mappingCount} property type amenity mappings!`);

    } catch (error) {
        console.error('Error seeding property type amenities:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

seedPropertyTypeAmenities();
