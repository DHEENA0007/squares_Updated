const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function inspectProperty() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('properties');

        // 1. Try to find the specific property the user mentioned
        console.log('\n--- Searching for "Apartment for Sale! | Saligramam" ---');
        const specificProp = await collection.findOne({
            $or: [
                { title: /Saligramam/i },
                { name: /Saligramam/i },
                { description: /Saligramam/i }
            ]
        });

        if (specificProp) {
            console.log('Found Property:');
            console.log(JSON.stringify(specificProp, null, 2));
        } else {
            console.log('Could not find that specific property.');

            // 2. Just get ANY property to see the schema
            console.log('\n--- Fetching ONE random property to check schema ---');
            const randomProp = await collection.findOne({});
            if (randomProp) {
                console.log(JSON.stringify(randomProp, null, 2));
            } else {
                console.log('No properties found in the database at all.');
            }
        }

    } catch (error) {
        console.error('Inspection failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDisconnected from MongoDB');
    }
}

inspectProperty();
