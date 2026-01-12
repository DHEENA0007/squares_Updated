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

function getLatestExportDir() {
    const serverDir = path.join(__dirname, '..');
    const dirs = fs.readdirSync(serverDir).filter(file =>
        fs.statSync(path.join(serverDir, file)).isDirectory() &&
        file.startsWith('db_exports_')
    );

    if (dirs.length === 0) {
        return null;
    }

    // Sort descending to get the latest
    dirs.sort().reverse();
    return path.join(serverDir, dirs[0]);
}

async function importData() {
    try {
        const exportDir = getLatestExportDir();
        if (!exportDir) {
            throw new Error('No export directory found!');
        }
        console.log(`Using latest export directory: ${exportDir}`);

        console.log('Connecting to NEW MongoDB...');
        console.log(`URI: ${MONGODB_URI.replace(/:([^:@]+)@/, ':****@')}`); // Hide password in logs
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to New MongoDB');

        const files = fs.readdirSync(exportDir).filter(file => file.endsWith('.json'));

        for (const file of files) {
            const collectionName = file.replace('.json', '');
            const filePath = path.join(exportDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            if (data.length === 0) {
                console.log(`Skipping empty collection: ${collectionName}`);
                continue;
            }

            console.log(`Importing ${collectionName} (${data.length} documents)...`);

            const collection = mongoose.connection.db.collection(collectionName);

            // Optional: Clear existing data in the new DB to ensure a clean import
            // console.log(`  - Clearing existing data in ${collectionName}...`);
            // await collection.deleteMany({}); 

            // We use insertMany. If IDs exist, it might throw error if we don't clear first.
            // Given this is a migration, clearing first is usually desired to match the source.
            await collection.deleteMany({});

            // Restore Date objects if necessary? JSON.parse makes dates strings.
            // MongoDB driver usually handles strings for dates if schema is not involved, 
            // but here we are using raw driver. 
            // Ideally we should convert specific fields, but for a generic import, 
            // we might rely on Mongoose schema if we used models, or just import as is.
            // If the application expects Date objects, they might be strings now.
            // However, EJSON or special handling is needed for full fidelity.
            // For now, we import as is. Mongoose schemas usually cast strings to dates on read.

            // Fix: MongoDB _id is usually an ObjectId. JSON has it as string.
            // We need to convert _id to ObjectId if it looks like one.
            const processedData = data.map(doc => {
                if (doc._id && typeof doc._id === 'string' && /^[0-9a-fA-F]{24}$/.test(doc._id)) {
                    doc._id = new mongoose.Types.ObjectId(doc._id);
                }
                // Basic attempt to fix dates - checks for ISO strings
                for (const key in doc) {
                    if (typeof doc[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(doc[key])) {
                        doc[key] = new Date(doc[key]);
                    }
                }
                return doc;
            });

            await collection.insertMany(processedData);
            console.log(`  - Successfully imported ${processedData.length} documents.`);
        }

        console.log('------------------------------------------------');
        console.log('Import completed successfully!');
        console.log('------------------------------------------------');

    } catch (error) {
        console.error('Error importing data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

importData();
