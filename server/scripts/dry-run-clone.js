const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SOURCE_URI = process.env.MONGODB_URI;
const TARGET_URI = 'mongodb+srv://squares:HbpqwfWiJvR00bG7@cluster0.loonmqw.mongodb.net/db1?retryWrites=true&w=majority';

async function dryRunClone() {
    let sourceConn = null;
    let targetConn = null;

    try {
        console.log('🛡️  DRY RUN: SAFE DATABASE CLONE SIMULATION');
        console.log('==================================================');

        // SAFETY CHECK 1: Ensure Source and Target are different
        if (SOURCE_URI === TARGET_URI) {
            throw new Error('❌ CRITICAL ERROR: Source and Target URIs are the same! Aborting.');
        }

        console.log(`📤 SOURCE (READ-ONLY): ${SOURCE_URI.split('@')[1] || 'Localhost'}`);
        console.log(`📥 TARGET (OVERWRITE): ${TARGET_URI.split('@')[1]}`);
        console.log('==================================================');

        // 1. Connect to Target
        console.log('\n🔌 Connecting to TARGET Database...');
        targetConn = await mongoose.createConnection(TARGET_URI).asPromise();
        console.log('✅ Connected to TARGET');

        // 2. Simulate Cleaning Target
        console.log('\n🧹 [SIMULATION] Cleaning TARGET Database:');
        const targetCollections = await targetConn.db.listCollections().toArray();

        if (targetCollections.length > 0) {
            console.log(`   Found ${targetCollections.length} collections that WOULD be dropped:`);
            for (const col of targetCollections) {
                if (col.name.startsWith('system.')) continue;
                const count = await targetConn.db.collection(col.name).countDocuments();
                console.log(`   - 🗑️  WOULD DROP: ${col.name.padEnd(30)} (Contains ${count} documents)`);
            }
        } else {
            console.log('   - TARGET database is already empty.');
        }

        // 3. Connect to Source
        console.log('\n🔌 Connecting to SOURCE Database...');
        sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
        console.log('✅ Connected to SOURCE');

        // 4. Simulate Cloning
        console.log('\n📦 [SIMULATION] Cloning from SOURCE to TARGET:');
        const sourceCollections = await sourceConn.db.listCollections().toArray();

        let totalDocs = 0;
        for (const colInfo of sourceCollections) {
            const colName = colInfo.name;
            if (colName.startsWith('system.')) continue;

            const count = await sourceConn.db.collection(colName).countDocuments();
            totalDocs += count;
            console.log(`   - 📋 WOULD COPY: ${colName.padEnd(30)} (${count} documents)`);
        }

        console.log('\n==================================================');
        console.log('DRY RUN SUMMARY');
        console.log('==================================================');
        console.log(`Target Collections to Drop: ${targetCollections.length}`);
        console.log(`Source Collections to Copy: ${sourceCollections.length}`);
        console.log(`Total Documents to Copy:    ${totalDocs}`);
        console.log('==================================================');
        console.log('No changes were made to any database.');

    } catch (error) {
        console.error('\n❌ Error during dry run:', error);
    } finally {
        if (sourceConn) await sourceConn.close();
        if (targetConn) await targetConn.close();
        console.log('\n🔌 Connections closed');
    }
}

dryRunClone();
