const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const {
    FilterConfiguration,
    PropertyType
} = require('../models/Configuration');

async function analyzeLinkage() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const propertiesCollection = db.collection('properties');

        // 1. Find the specific property
        console.log('\n--- 1. Inspecting Property "Apartment for Sale! | Saligramam" ---');
        const property = await propertiesCollection.findOne({
            title: /Saligramam/i
        });

        if (!property) {
            console.log('❌ Could not find the property. Please check the title.');
            return;
        }

        // DEBUG: Print all keys to see what field holds the type
        console.log('Property Keys:', Object.keys(property));

        // Check common field names
        let propTypeId = property.propertyType || property.type || property.category;

        if (propTypeId === undefined) {
            console.log('⚠️  Field "propertyType" is UNDEFINED on this document!');
            // Look for anything that looks like an ID or type
            console.log('Full Document Dump:', JSON.stringify(property, null, 2));
            return;
        }

        console.log(`Property Title: "${property.title}"`);
        console.log(`Stored propertyType Value:`, propTypeId);
        console.log(`Type of stored value: ${typeof propTypeId}`);
        if (propTypeId && propTypeId.constructor) {
            console.log(`Constructor: ${propTypeId.constructor.name}`);
        }

        // 2. Fetch all Candidate IDs (Property Types & Filters)
        console.log('\n--- 2. Comparing against Known IDs ---');

        // Property Types
        const pts = await PropertyType.find({ name: /flat.*apartment/i });
        console.log(`\n[Property Types]`);
        let matchFound = false;

        pts.forEach(pt => {
            let isMatch = false;
            if (propTypeId) {
                isMatch = propTypeId.toString() === pt._id.toString();
            }
            if (isMatch) matchFound = true;
            console.log(`- ID: ${pt._id} | Name: "${pt.name}" | Value: "${pt.value}" ${isMatch ? '✅ MATCH!' : ''}`);
        });

        // Filter Configurations
        const filters = await FilterConfiguration.find({
            $or: [{ name: /flat.*apartment/i }, { displayLabel: /flat.*apartment/i }]
        });
        console.log(`\n[Filter Configurations]`);

        filters.forEach(f => {
            let isMatch = false;
            if (propTypeId) {
                isMatch = propTypeId.toString() === f._id.toString();
            }
            if (isMatch) matchFound = true;
            console.log(`- ID: ${f._id} | Name: "${f.name}" | Value: "${f.value}" ${isMatch ? '⚠️ MATCH! (Linked to Filter)' : ''}`);
        });

        // Check if it matches a string value directly
        if (!matchFound && typeof propTypeId === 'string') {
            const stringMatchPT = pts.find(pt => pt.value === propTypeId);
            const stringMatchFilter = filters.find(f => f.value === propTypeId);

            if (stringMatchPT) {
                console.log(`\n⚠️ MATCH! Property uses STRING value "${propTypeId}" which matches Property Type "${stringMatchPT.name}"`);
                matchFound = true;
            } else if (stringMatchFilter) {
                console.log(`\n⚠️ MATCH! Property uses STRING value "${propTypeId}" which matches Filter Value "${stringMatchFilter.value}"`);
                matchFound = true;
            }
        }

        if (!matchFound) {
            console.log('\n❌ NO MATCH FOUND! The property is linked to an ID that does not exist in PropertyTypes or Filters.');
        }

    } catch (error) {
        console.error('Analysis failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDisconnected from MongoDB');
    }
}

analyzeLinkage();
