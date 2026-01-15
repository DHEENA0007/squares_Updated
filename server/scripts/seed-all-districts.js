const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: 'server/.env' });

const {
    FilterConfiguration,
} = require('../models/Configuration');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/squares-v3';
const LOCA_JSON_PATH = path.join(__dirname, '../../public/loca.json');

async function seedDistrictFilters() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('Reading loca.json...');
        const rawData = fs.readFileSync(LOCA_JSON_PATH, 'utf8');
        const data = JSON.parse(rawData);

        console.log(`Total records in loca.json: ${data.records.length}`);

        // Extract unique districts
        const districts = new Set();
        data.records.forEach(record => {
            if (record.district) {
                districts.add(record.district);
            }
        });

        const uniqueDistricts = Array.from(districts).sort();
        console.log(`Found ${uniqueDistricts.length} unique districts.`);

        console.log('\nSeeding District Filters...');
        let count = 0;
        let skipped = 0;

        // Batch process to avoid memory issues or timeouts
        const BATCH_SIZE = 100;
        for (let i = 0; i < uniqueDistricts.length; i += BATCH_SIZE) {
            const batch = uniqueDistricts.slice(i, i + BATCH_SIZE);
            const operations = batch.map(district => {
                const value = district.toLowerCase().replace(/\s+/g, '-');
                return {
                    updateOne: {
                        filter: { filterType: 'location', value: value },
                        update: {
                            $setOnInsert: {
                                filterType: 'location',
                                name: district,
                                value: value,
                                displayLabel: district,
                                displayOrder: 100 + i, // Order after the top cities
                                isActive: true
                            }
                        },
                        upsert: true
                    }
                };
            });

            const result = await FilterConfiguration.bulkWrite(operations);
            count += result.upsertedCount;
            skipped += result.matchedCount;

            process.stdout.write(`\rProcessed ${Math.min(i + BATCH_SIZE, uniqueDistricts.length)}/${uniqueDistricts.length} districts...`);
        }

        console.log(`\n\n✅ Seeding complete.`);
        console.log(`Added: ${count}`);
        console.log(`Skipped (already existed): ${skipped}`);

    } catch (error) {
        console.error('Error seeding district filters:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

seedDistrictFilters();
