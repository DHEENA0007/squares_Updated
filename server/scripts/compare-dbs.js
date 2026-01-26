const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Current active DB in .env is the SOURCE
const SOURCE_URI = process.env.MONGODB_URI;
// The URI provided by the user is the TARGET
const TARGET_URI = 'mongodb+srv://squares:squares%40123@cluster0.yitfbs9.mongodb.net/ninety-nine-acres?retryWrites=true&w=majority';

async function compareDatabases() {
    let sourceConn = null;
    let targetConn = null;

    try {
        console.log('🔍 DATABASE COMPARISON');
        console.log('==================================================');
        console.log(`📤 SOURCE: ${SOURCE_URI.split('@')[1] || 'Localhost'}`);
        console.log(`📥 TARGET: ${TARGET_URI.split('@')[1]}`);
        console.log('==================================================');

        console.log('\n🔌 Connecting to Databases...');
        sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
        targetConn = await mongoose.createConnection(TARGET_URI).asPromise();
        console.log('✅ Connected to both databases');

        const sourceCollections = await sourceConn.db.listCollections().toArray();
        const targetCollections = await targetConn.db.listCollections().toArray();

        const sourceMap = new Map();
        const targetMap = new Map();

        console.log('\n📊 Collection Statistics:');
        console.log('--------------------------------------------------');
        console.log(`${'Collection Name'.padEnd(30)} | ${'Source Count'.padStart(12)} | ${'Target Count'.padStart(12)} | ${'Diff'.padStart(8)}`);
        console.log('--------------------------------------------------');

        for (const col of sourceCollections) {
            if (col.name.startsWith('system.')) continue;
            const count = await sourceConn.db.collection(col.name).countDocuments();
            sourceMap.set(col.name, count);
        }

        for (const col of targetCollections) {
            if (col.name.startsWith('system.')) continue;
            const count = await targetConn.db.collection(col.name).countDocuments();
            targetMap.set(col.name, count);
        }

        const allCollectionNames = new Set([...sourceMap.keys(), ...targetMap.keys()]);
        const sortedNames = Array.from(allCollectionNames).sort();

        let totalSourceDocs = 0;
        let totalTargetDocs = 0;

        for (const name of sortedNames) {
            const sCount = sourceMap.get(name) || 0;
            const tCount = targetMap.get(name) || 0;
            const diff = tCount - sCount;

            totalSourceDocs += sCount;
            totalTargetDocs += tCount;

            const diffStr = diff === 0 ? 'MATCH' : (diff > 0 ? `+${diff}` : `${diff}`);
            console.log(`${name.padEnd(30)} | ${sCount.toString().padStart(12)} | ${tCount.toString().padStart(12)} | ${diffStr.padStart(8)}`);
        }

        console.log('--------------------------------------------------');
        const totalDiff = totalTargetDocs - totalSourceDocs;
        const totalDiffStr = totalDiff === 0 ? 'MATCH' : (totalDiff > 0 ? `+${totalDiff}` : `${totalDiff}`);
        console.log(`${'TOTAL'.padEnd(30)} | ${totalSourceDocs.toString().padStart(12)} | ${totalTargetDocs.toString().padStart(12)} | ${totalDiffStr.padStart(8)}`);
        console.log('==================================================');

    } catch (error) {
        console.error('\n❌ Error during comparison:', error);
    } finally {
        if (sourceConn) await sourceConn.close();
        if (targetConn) await targetConn.close();
        console.log('\n🔌 Connections closed');
    }
}

compareDatabases();
