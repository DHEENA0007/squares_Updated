const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SOURCE_URI = process.env.MONGODB_URI;
const TARGET_URI = 'mongodb+srv://squares:HbpqwfWiJvR00bG7@cluster0.loonmqw.mongodb.net/db1?retryWrites=true&w=majority';

async function cloneDatabase() {
    let sourceConn = null;
    let targetConn = null;

    try {
        console.log('�️  SAFE DATABASE CLONE PROCESS');
        console.log('==================================================');

        // SAFETY CHECK 1: Ensure Source and Target are different
        if (SOURCE_URI === TARGET_URI) {
            throw new Error('❌ CRITICAL ERROR: Source and Target URIs are the same! Aborting to prevent data loss.');
        }

        console.log(`📤 SOURCE (READ-ONLY): ${SOURCE_URI.split('@')[1] || 'Localhost'}`);
        console.log(`📥 TARGET (OVERWRITE): ${TARGET_URI.split('@')[1]}`);
        console.log('==================================================');

        // 1. Connect to Target FIRST (The one we will modify)
        console.log('\n🔌 Connecting to TARGET Database...');
        targetConn = await mongoose.createConnection(TARGET_URI).asPromise();
        console.log('✅ Connected to TARGET');

        // 2. Clean Target Database
        console.log('\n🧹 Cleaning TARGET Database (Dropping all collections)...');
        const targetCollections = await targetConn.db.listCollections().toArray();

        if (targetCollections.length > 0) {
            for (const col of targetCollections) {
                if (col.name.startsWith('system.')) continue;
                console.log(`   - 🗑️  Dropping TARGET collection: ${col.name}`);
                await targetConn.db.dropCollection(col.name);
            }
            console.log('✨ TARGET Database Cleaned.');
        } else {
            console.log('   - TARGET database is already empty.');
        }

        // 3. Connect to Source (READ ONLY INTENT)
        console.log('\n🔌 Connecting to SOURCE Database...');
        sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
        console.log('✅ Connected to SOURCE');

        // 4. Get list of collections from Source
        const sourceCollections = await sourceConn.db.listCollections().toArray();
        console.log(`\n📋 Found ${sourceCollections.length} collections in SOURCE.`);

        // 5. Clone each collection
        for (const colInfo of sourceCollections) {
            const colName = colInfo.name;

            // Skip system collections
            if (colName.startsWith('system.')) continue;

            console.log(`\n📦 Processing collection: ${colName}`);

            // READ from Source
            const sourceCol = sourceConn.db.collection(colName);
            const documents = await sourceCol.find({}).toArray();

            if (documents.length > 0) {
                console.log(`   - 📖 READ ${documents.length} docs from SOURCE`);

                // WRITE to Target
                const targetCol = targetConn.db.collection(colName);

                // Insert in batches
                const batchSize = 100;
                let insertedCount = 0;
                for (let i = 0; i < documents.length; i += batchSize) {
                    const batch = documents.slice(i, i + batchSize);
                    await targetCol.insertMany(batch);
                    insertedCount += batch.length;
                    process.stdout.write('.');
                }
                console.log(`\n   - ✍️  WROTE ${insertedCount} docs to TARGET`);
            } else {
                console.log('   - Collection is empty, skipping.');
            }
        }

        console.log('\n==================================================');
        console.log('🎉 CLONE COMPLETED SUCCESSFULLY');
        console.log('==================================================');

    } catch (error) {
        console.error('\n❌ Error during cloning:', error);
    } finally {
        if (sourceConn) await sourceConn.close();
        if (targetConn) await targetConn.close();
        console.log('\n🔌 All connections closed');
    }
}

cloneDatabase();
