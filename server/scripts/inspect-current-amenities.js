const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });

const {
    PropertyType,
    Amenity,
    PropertyTypeAmenity,
} = require('../models/Configuration');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/squares-v3';

async function checkCurrentConfiguration() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB\n');

        // 1. Check Property Types
        const propertyTypes = await PropertyType.find({}).sort({ displayOrder: 1 });
        console.log(`=== Property Types (${propertyTypes.length}) ===`);
        if (propertyTypes.length > 0) {
            console.table(propertyTypes.map(pt => ({
                Name: pt.name,
                Value: pt.value,
                Category: pt.category,
                ID: pt._id.toString()
            })));
        } else {
            console.log('No Property Types found.');
        }
        console.log('\n');

        // 2. Check Amenities
        const amenities = await Amenity.find({}).sort({ category: 1, displayOrder: 1 });
        console.log(`=== Amenities (${amenities.length}) ===`);
        if (amenities.length > 0) {
            // Group by category for better readability
            const amenitiesByCategory = {};
            amenities.forEach(a => {
                if (!amenitiesByCategory[a.category]) {
                    amenitiesByCategory[a.category] = [];
                }
                amenitiesByCategory[a.category].push(a.name);
            });

            for (const [category, names] of Object.entries(amenitiesByCategory)) {
                console.log(`Category: ${category}`);
                console.log(`  - ${names.join(', ')}`);
            }
        } else {
            console.log('No Amenities found.');
        }
        console.log('\n');

        // 3. Check Mappings
        const mappings = await PropertyTypeAmenity.find({})
            .populate('propertyTypeId', 'name')
            .populate('amenityId', 'name');

        console.log(`=== Property Type <-> Amenity Mappings (${mappings.length}) ===`);

        if (mappings.length > 0) {
            const mappingsByPropertyType = {};

            mappings.forEach(m => {
                if (m.propertyTypeId && m.amenityId) {
                    const ptName = m.propertyTypeId.name;
                    if (!mappingsByPropertyType[ptName]) {
                        mappingsByPropertyType[ptName] = [];
                    }
                    mappingsByPropertyType[ptName].push(m.amenityId.name);
                }
            });

            for (const [ptName, amenityNames] of Object.entries(mappingsByPropertyType)) {
                console.log(`Property Type: ${ptName} (${amenityNames.length} amenities)`);
                // Print first 5 and last 5 if too many
                if (amenityNames.length > 10) {
                    console.log(`  - ${amenityNames.slice(0, 5).join(', ')} ... ${amenityNames.slice(-5).join(', ')}`);
                } else {
                    console.log(`  - ${amenityNames.join(', ')}`);
                }
            }
        } else {
            console.log('No mappings found. All amenities might be available for all property types, or none.');
        }

    } catch (error) {
        console.error('Error checking configuration:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    }
}

checkCurrentConfiguration();
