const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Current active DB in .env is the SOURCE
const SOURCE_URI = process.env.MONGODB_URI;
// The URI provided by the user is the TARGET
const TARGET_URI = 'mongodb+srv://squares:squares%40123@cluster0.yitfbs9.mongodb.net/ninety-nine-acres?retryWrites=true&w=majority';

async function cloneDatabase() {
    let sourceConn = null;
    let targetConn = null;

    try {
        console.log('🚀 DATABASE MIGRATION (SMART CLONE)');
        console.log('==================================================');
        console.log(`📤 SOURCE: ${SOURCE_URI.split('@')[1] || 'Localhost'}`);
        console.log(`📥 TARGET: ${TARGET_URI.split('@')[1]}`);
        console.log('==================================================');

        // SAFETY CHECK: Ensure Source and Target are different
        if (SOURCE_URI === TARGET_URI) {
            throw new Error('❌ CRITICAL ERROR: Source and Target URIs are the same! Aborting.');
        }

        console.log('\n🔌 Connecting to Databases...');
        sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
        targetConn = await mongoose.createConnection(TARGET_URI).asPromise();
        console.log('✅ Connected to both databases');

        const sourceCollections = await sourceConn.db.listCollections().toArray();

        console.log(`\n📋 Found ${sourceCollections.length} collections in SOURCE.`);

        for (const colInfo of sourceCollections) {
            const colName = colInfo.name;
            if (colName.startsWith('system.')) continue;

            const sourceCol = sourceConn.db.collection(colName);
            const targetCol = targetConn.db.collection(colName);

            // 1. Check counts for equality
            const sourceCount = await sourceCol.countDocuments();
            let targetCount = 0;
            try {
                targetCount = await targetCol.countDocuments();
            } catch (e) {
                // Collection might not exist in target
                targetCount = -1;
            }

            if (sourceCount === targetCount) {
                console.log(`\n⏩ Skipping ${colName.padEnd(30)} | Data matches (Count: ${sourceCount})`);
                continue;
            }

            console.log(`\n📦 Processing collection: ${colName}`);
            console.log(`   - 📊 Count Mismatch: Source(${sourceCount}) vs Target(${targetCount})`);

            // 2. Drop Target Collection
            try {
                await targetCol.drop();
                console.log(`   - 🗑️  Dropped TARGET collection: ${colName}`);
            } catch (e) {
                console.log(`   - ℹ️  TARGET collection ${colName} did not exist or could not be dropped.`);
            }

            // 3. Read from Source
            const documents = await sourceCol.find({}).toArray();

            if (documents.length > 0) {
                console.log(`   - 📖 READ ${documents.length} docs from SOURCE`);

                // 4. Write to Target in batches
                const batchSize = 100;
                let insertedCount = 0;
                for (let i = 0; i < documents.length; i += batchSize) {
                    const batch = documents.slice(i, i + batchSize);
                    await targetCol.insertMany(batch);
                    insertedCount += batch.length;
                }
                console.log(`   - ✍️  WROTE ${insertedCount} docs to TARGET`);
            } else {
                console.log('   - Collection is empty, skipping copy.');
            }
        }

        console.log('\n==================================================');
        console.log('🎉 SMART MIGRATION COMPLETED');
        console.log('==================================================');

    } catch (error) {
        console.error('\n❌ Error during migration:', error);
    } finally {
        if (sourceConn) await sourceConn.close();
        if (targetConn) await targetConn.close();
        console.log('\n🔌 Connections closed');
    }
}

cloneDatabase();
