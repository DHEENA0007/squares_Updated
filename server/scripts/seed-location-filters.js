const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });

const {
    FilterConfiguration,
} = require('../models/Configuration');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/squares-v3';

// Define the locations to add
const locationsToAdd = [
    { name: 'Bangalore', value: 'bangalore', displayLabel: 'Bangalore' },
    { name: 'Chennai', value: 'chennai', displayLabel: 'Chennai' },
    { name: 'Hyderabad', value: 'hyderabad', displayLabel: 'Hyderabad' },
    { name: 'Mumbai', value: 'mumbai', displayLabel: 'Mumbai' },
    { name: 'Delhi', value: 'delhi', displayLabel: 'Delhi' },
    { name: 'Pune', value: 'pune', displayLabel: 'Pune' },
    { name: 'Kolkata', value: 'kolkata', displayLabel: 'Kolkata' },
    { name: 'Ahmedabad', value: 'ahmedabad', displayLabel: 'Ahmedabad' },
    { name: 'Coimbatore', value: 'coimbatore', displayLabel: 'Coimbatore' },
    { name: 'Kochi', value: 'kochi', displayLabel: 'Kochi' }
];

async function seedLocationFilters() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('\nSeeding Location Filters...');
        let count = 0;

        for (const location of locationsToAdd) {
            // Check if it already exists to avoid duplicates or overwriting custom changes
            const existing = await FilterConfiguration.findOne({
                filterType: 'location',
                value: location.value
            });

            if (!existing) {
                await new FilterConfiguration({
                    filterType: 'location',
                    name: location.name,
                    value: location.value,
                    displayLabel: location.displayLabel,
                    displayOrder: count + 1, // Simple ordering
                    isActive: true
                }).save();
                console.log(`✓ Added location: ${location.name}`);
                count++;
            } else {
                console.log(`ℹ️ Location already exists: ${location.name}`);
            }
        }

        console.log(`\n✅ Successfully added ${count} new location filters.`);

    } catch (error) {
        console.error('Error seeding location filters:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

seedLocationFilters();
