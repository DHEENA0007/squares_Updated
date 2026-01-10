const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });

const {
    PropertyType,
    Amenity,
    PropertyTypeAmenity,
} = require('../models/Configuration');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/squares-v3';

const amenitiesData = [
    // Basic
    { name: 'Parking', category: 'basic', displayOrder: 1, icon: 'parking' },
    { name: 'Power Backup', category: 'basic', displayOrder: 2, icon: 'battery_charging_full' },
    { name: 'Water Supply', category: 'basic', displayOrder: 3, icon: 'water_drop' },
    { name: 'Lift', category: 'basic', displayOrder: 4, icon: 'elevator' },
    { name: 'WiFi', category: 'basic', displayOrder: 5, icon: 'wifi' },
    { name: 'Air Conditioning', category: 'basic', displayOrder: 6, icon: 'ac_unit' },
    { name: 'Attached Bathroom', category: 'basic', displayOrder: 7, icon: 'bathtub' },
    { name: 'Common Kitchen', category: 'basic', displayOrder: 8, icon: 'kitchen' },
    { name: 'Laundry', category: 'basic', displayOrder: 9, icon: 'local_laundry_service' },

    // Security
    { name: 'Security', category: 'security', displayOrder: 10, icon: 'security' },
    { name: 'CCTV', category: 'security', displayOrder: 11, icon: 'videocam' },
    { name: 'Gated Community', category: 'security', displayOrder: 12, icon: 'gate' },
    { name: 'Fire Safety', category: 'security', displayOrder: 13, icon: 'fire_extinguisher' },
    { name: '24/7 Security', category: 'security', displayOrder: 14, icon: 'local_police' },
    { name: 'Intercom', category: 'security', displayOrder: 15, icon: 'phone_in_talk' },

    // Recreational
    { name: 'Swimming Pool', category: 'recreational', displayOrder: 20, icon: 'pool' },
    { name: 'Gym', category: 'recreational', displayOrder: 21, icon: 'fitness_center' },
    { name: 'Garden', category: 'recreational', displayOrder: 22, icon: 'park' },
    { name: 'Children Play Area', category: 'recreational', displayOrder: 23, icon: 'child_care' },
    { name: 'Club House', category: 'recreational', displayOrder: 24, icon: 'meeting_room' },
    { name: 'Sports Facilities', category: 'recreational', displayOrder: 25, icon: 'sports_tennis' },
    { name: 'Jogging Track', category: 'recreational', displayOrder: 26, icon: 'directions_run' },

    // Luxury
    { name: 'Modular Kitchen', category: 'luxury', displayOrder: 30, icon: 'countertops' },
    { name: 'Home Theatre', category: 'luxury', displayOrder: 31, icon: 'theaters' },
    { name: 'Jacuzzi', category: 'luxury', displayOrder: 32, icon: 'hot_tub' },
    { name: 'Private Terrace', category: 'luxury', displayOrder: 33, icon: 'deck' },
    { name: 'Servant Room', category: 'luxury', displayOrder: 34, icon: 'room_service' },
    { name: 'Study Room', category: 'luxury', displayOrder: 35, icon: 'menu_book' },
    { name: 'Pooja Room', category: 'luxury', displayOrder: 36, icon: 'self_improvement' },
    { name: 'False Ceiling', category: 'luxury', displayOrder: 37, icon: 'roofing' },
    { name: 'Balcony', category: 'luxury', displayOrder: 38, icon: 'balcony' },
];

// Mapping configuration
// Keys correspond to PropertyType 'value' fields
const propertyTypeMappings = {
    // Residential
    'apartment': 'all',
    'villa': 'all',
    'builder_floor': 'all',
    'farm_house': 'all',
    'Home': 'all', // Handling the 'House' type with value 'Home'

    // Commercial
    'office_space': [
        'Parking', 'Power Backup', 'Water Supply', 'Lift', 'WiFi', 'Air Conditioning',
        'Security', 'CCTV', 'Fire Safety', '24/7 Security', 'Intercom', 'Cafeteria'
    ],
    'shop': [
        'Parking', 'Power Backup', 'Water Supply', 'Lift', 'WiFi', 'Air Conditioning',
        'Security', 'CCTV', 'Fire Safety', '24/7 Security'
    ],
    'warehouse': [
        'Parking', 'Power Backup', 'Water Supply', 'WiFi',
        'Security', 'CCTV', 'Fire Safety', '24/7 Security'
    ],

    // Land
    'residential_plot': [
        'Water Supply', 'Power Backup', 'Security', 'Gated Community', '24/7 Security',
        'Garden', 'Children Play Area', 'Jogging Track', 'Club House', 'Sports Facilities'
    ],
    'agricultural_land': [
        'Water Supply', 'Power Backup', 'Security'
    ]
};

async function seedAmenitiesAndMappings() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Seed Amenities
        console.log('\nSeeding Amenities...');
        const createdAmenities = [];

        // First, let's clean up the typo "swiing pool" if it exists
        await Amenity.deleteOne({ name: 'swiing pool' });
        console.log('Removed invalid amenity "swiing pool" if it existed.');

        for (const amenityData of amenitiesData) {
            const amenity = await Amenity.findOneAndUpdate(
                { name: amenityData.name },
                amenityData,
                { upsert: true, new: true }
            );
            createdAmenities.push(amenity);
            // console.log(`✓ ${amenity.name}`);
        }
        console.log(`✓ Upserted ${createdAmenities.length} amenities.`);

        // 2. Fetch Property Types
        const propertyTypes = await PropertyType.find({});
        console.log(`\nFound ${propertyTypes.length} property types.`);

        // 3. Create Mappings
        console.log('\nUpdating Property Type <-> Amenity Mappings...');

        // Clear existing mappings
        await PropertyTypeAmenity.deleteMany({});
        console.log('Cleared existing mappings.');

        let totalMappings = 0;

        for (const pt of propertyTypes) {
            const mappingRule = propertyTypeMappings[pt.value];

            if (!mappingRule) {
                console.log(`⚠️ No mapping rule found for property type: ${pt.name} (value: ${pt.value})`);
                continue;
            }

            let amenitiesToMap = [];

            if (mappingRule === 'all') {
                amenitiesToMap = createdAmenities;
            } else if (Array.isArray(mappingRule)) {
                amenitiesToMap = createdAmenities.filter(a => mappingRule.includes(a.name));
            }

            if (amenitiesToMap.length > 0) {
                const mappings = amenitiesToMap.map(amenity => ({
                    propertyTypeId: pt._id,
                    amenityId: amenity._id,
                    isDefault: false
                }));

                await PropertyTypeAmenity.insertMany(mappings);
                totalMappings += mappings.length;
                console.log(`✓ Mapped ${mappings.length} amenities to ${pt.name}`);
            } else {
                console.log(`ℹ️ No amenities mapped for ${pt.name}`);
            }
        }

        console.log(`\n✅ Successfully created ${totalMappings} mappings!`);

    } catch (error) {
        console.error('Error seeding amenities:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    }
}

seedAmenitiesAndMappings();
