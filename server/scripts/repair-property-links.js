const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const {
    FilterConfiguration,
    PropertyType
} = require('../models/Configuration');

async function fixPropertyLinkages() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const propertiesCollection = db.collection('properties');

        // 1. Get all FilterConfigurations for "property_type"
        const filters = await FilterConfiguration.find({ filterType: 'property_type' });
        console.log(`Found ${filters.length} Filter Configurations.`);

        for (const filter of filters) {
            // Check if any property is using this Filter's ID
            const count = await propertiesCollection.countDocuments({ propertyType: filter._id });

            if (count > 0) {
                console.log(`\n⚠️  Found ${count} properties linked to Filter "${filter.name}" (ID: ${filter._id})`);

                // Find the corresponding PropertyType
                const pt = await PropertyType.findOne({ value: filter.value });

                if (pt) {
                    console.log(`   -> Found matching PropertyType: "${pt.name}" (ID: ${pt._id})`);
                    console.log(`   -> FIXING linkage...`);

                    const result = await propertiesCollection.updateMany(
                        { propertyType: filter._id },
                        { $set: { propertyType: pt._id } }
                    );
                    console.log(`   -> Updated ${result.modifiedCount} properties.`);
                } else {
                    console.log(`   -> ❌ NO matching PropertyType found for value "${filter.value}". Cannot fix automatically.`);
                }
            }
        }

        console.log('\nLinkage check complete.');

    } catch (error) {
        console.error('Fix failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
    }
}

fixPropertyLinkages();
