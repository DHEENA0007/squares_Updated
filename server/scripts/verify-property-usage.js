const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const {
    PropertyType
} = require('../models/Configuration');

async function checkPropertyUsageById() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const propertiesCollection = db.collection('properties');

        // 1. Get all Property Types matching "Flat/Apartment"
        const propertyTypes = await PropertyType.find({ name: /flat.*apartment/i });

        console.log(`Found ${propertyTypes.length} Property Types for "Flat/Apartment":`);

        for (const pt of propertyTypes) {
            console.log(`\nChecking Property Type:`);
            console.log(`- Name: ${pt.name}`);
            console.log(`- Value: ${pt.value}`);
            console.log(`- ID: ${pt._id}`);

            // Count properties using this ID
            const count = await propertiesCollection.countDocuments({ propertyType: pt._id });
            console.log(`- USAGE COUNT: ${count} properties`);

            // Also check if stored as string (legacy data?)
            const stringCount = await propertiesCollection.countDocuments({ propertyType: pt.value });
            if (stringCount > 0) {
                console.log(`- WARNING: Found ${stringCount} properties storing it as STRING value!`);
            }
        }

    } catch (error) {
        console.error('Check failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDisconnected from MongoDB');
    }
}

checkPropertyUsageById();
