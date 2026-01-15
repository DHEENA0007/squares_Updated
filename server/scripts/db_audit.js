const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');

const audit = async () => {
    try {
        await connectDB();
        console.log('Connected to database');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\n=== Database Audit ===');
        console.log(`Total Collections: ${collections.length}\n`);

        const results = [];

        for (const collection of collections) {
            const name = collection.name;
            const count = await mongoose.connection.db.collection(name).countDocuments();
            results.push({ name, count });
        }

        // Sort by count (descending)
        results.sort((a, b) => b.count - a.count);

        console.log('Collection Name'.padEnd(30) + ' | ' + 'Document Count');
        console.log('-'.repeat(30) + '-+-' + '-'.repeat(15));

        for (const result of results) {
            console.log(result.name.padEnd(30) + ' | ' + result.count.toString().padStart(10));
        }

        console.log('\n=== End Audit ===\n');
        process.exit(0);

    } catch (error) {
        console.error('Audit failed:', error);
        process.exit(1);
    }
};

audit();
