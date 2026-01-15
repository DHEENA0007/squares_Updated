const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env file');
    process.exit(1);
}

const EXPORT_DIR = path.join(__dirname, '../db_exports_' + new Date().toISOString().replace(/[:.]/g, '-'));

if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

async function exportCollections() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`Found ${collections.length} collections`);

        for (const collection of collections) {
            const collectionName = collection.name;
            console.log(`Exporting collection: ${collectionName}`);

            const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
            const filePath = path.join(EXPORT_DIR, `${collectionName}.json`);

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`Saved ${data.length} documents to ${filePath}`);
        }

        console.log('------------------------------------------------');
        console.log('Export completed successfully!');
        console.log(`All collections have been exported to: ${EXPORT_DIR}`);
        console.log('------------------------------------------------');

    } catch (error) {
        console.error('Error exporting collections:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

exportCollections();
