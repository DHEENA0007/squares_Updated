const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function exportConfigurations() {
    try {
        // Connect to MongoDB
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const exportDir = path.join(__dirname, '../mongo_exports');

        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir);
        }

        // List all collections to be sure
        const collections = await db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name).join(', '));

        const collectionsToExport = [
            'filterconfigurations',
            'configurationmetadatas',
            'propertytypes',
            'propertytypefields',
            'amenities',
            'propertytypeamenities'
        ];

        const fullExport = {};

        for (const collectionName of collectionsToExport) {
            console.log(`Exporting ${collectionName}...`);
            try {
                const data = await db.collection(collectionName).find({}).toArray();
                fullExport[collectionName] = data;
                console.log(`✓ Exported ${data.length} documents from ${collectionName}`);
            } catch (err) {
                console.warn(`⚠ Could not export ${collectionName}: ${err.message}`);
                fullExport[collectionName] = { error: err.message };
            }
        }

        const filename = `config_export_${timestamp}.json`;
        const filePath = path.join(exportDir, filename);

        fs.writeFileSync(filePath, JSON.stringify(fullExport, null, 2));
        console.log(`\n✓ Export completed successfully!`);
        console.log(`File saved to: ${filePath}`);

    } catch (error) {
        console.error('Error exporting configurations:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
    }
}

exportConfigurations();
