const mongoose = require('mongoose');

// Configuration
const SOURCE_URI = 'mongodb+srv://bhmsq:HtFfR4y3kHxL3iQV@cluster0.eijqs0z.mongodb.net/ninety-nine-acres?retryWrites=true&w=majority';
// Encoding the password 'squares@123' to 'squares%40123'
const TARGET_URI = 'mongodb+srv://squares:squares%40123@cluster0.yitfbs9.mongodb.net/ninety-nine-acres?retryWrites=true&w=majority';

async function migrate() {
    console.log('Starting migration...');
    console.log('Source:', SOURCE_URI.replace(/:([^:@]+)@/, ':****@')); // Hide password in logs
    console.log('Target:', TARGET_URI.replace(/:([^:@]+)@/, ':****@'));

    let sourceConn, targetConn;

    try {
        // Connect to Source
        sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
        console.log('Connected to Source DB');

        // Connect to Target
        targetConn = await mongoose.createConnection(TARGET_URI).asPromise();
        console.log('Connected to Target DB');

        // Get all collections from source
        const collections = await sourceConn.db.listCollections().toArray();
        console.log(`Found ${collections.length} collections to migrate.`);

        for (const collectionInfo of collections) {
            const collName = collectionInfo.name;
            if (collName.startsWith('system.')) continue; // Skip system collections

            console.log(`Migrating collection: ${collName}`);

            const sourceColl = sourceConn.db.collection(collName);
            const targetColl = targetConn.db.collection(collName);

            // Get all documents
            const documents = await sourceColl.find({}).toArray();

            if (documents.length > 0) {
                // Optional: Clear target collection before inserting to avoid duplicates or mix
                // await targetColl.deleteMany({}); 
                // For now, let's use insertMany with ordered: false to continue on error (e.g. duplicates)
                // or just deleteMany to ensure a clean slate.
                // Given "move all data", a clean slate on target is usually expected or safe if target is new.
                // Let's check if target has data. If it's new, it's empty.
                // To be safe, let's drop the target collection if it exists.

                try {
                    await targetColl.drop();
                } catch (e) {
                    // Ignore if collection doesn't exist
                }

                await targetColl.insertMany(documents);
                console.log(`  -> Copied ${documents.length} documents to ${collName}`);
            } else {
                console.log(`  -> Collection ${collName} is empty, skipping.`);
            }
        }

        console.log('Migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (sourceConn) await sourceConn.close();
        if (targetConn) await targetConn.close();
    }
}

migrate();
