const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/squares-v3';

async function dryRunMigration() {
    try {
        console.log('🔌 Connecting to MongoDB for DRY RUN...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const propertyTypes = await db.collection('propertytypes').find({}).toArray();
        const properties = await db.collection('properties').find({}, { projection: { type: 1 } }).toArray();

        console.log('\n🔍 DRY RUN ANALYSIS START');
        console.log('==================================================');

        let migrationCount = 0;
        let noChangeCount = 0;
        const typeMap = new Map();

        // 1. Analyze Property Types Migration
        console.log('\n1. Property Type Configuration Migration Plan:');
        for (const pt of propertyTypes) {
            typeMap.set(pt.value, pt);

            const hasOldCategory = !!pt.category;
            const hasNewCategories = Array.isArray(pt.categories) && pt.categories.length > 0;

            if (hasOldCategory && !hasNewCategories) {
                console.log(`   [MIGRATE] "${pt.name}" (${pt.value})`);
                console.log(`             Current: category="${pt.category}"`);
                console.log(`             Proposed: categories=["${pt.category}"]`);
                migrationCount++;
            } else if (hasNewCategories) {
                console.log(`   [SKIP]    "${pt.name}" (${pt.value}) - Already has categories: [${pt.categories.join(', ')}]`);
                noChangeCount++;
            } else {
                console.log(`   [WARNING] "${pt.name}" (${pt.value}) - No category found to migrate.`);
            }
        }

        // 2. Analyze Missing Configurations & Propose Fixes
        console.log('\n2. Missing Configurations Analysis & Fixes:');
        const usageByType = {};
        properties.forEach(p => {
            const type = p.type || 'undefined';
            usageByType[type] = (usageByType[type] || 0) + 1;
        });

        const usedTypes = Object.keys(usageByType);
        let missingConfigCount = 0;
        let fixableCount = 0;

        for (const type of usedTypes) {
            if (!typeMap.has(type)) {
                console.log(`   [MISSING] Property Type "${type}" is used by ${usageByType[type]} properties but has NO configuration.`);

                // Propose fix for known missing types
                if (type === 'villa') {
                    console.log(`   [PROPOSED FIX] Would create new Property Type: "Villa"`);
                    console.log(`                  Value: "villa", Categories: ["residential"]`);
                    fixableCount++;
                } else {
                    console.log(`   [ACTION REQUIRED] No automatic fix defined for "${type}". Please create manually.`);
                }

                missingConfigCount++;
            }
        }

        // 3. Summary
        console.log('\n==================================================');
        console.log('DRY RUN SUMMARY');
        console.log('==================================================');
        console.log(`Total Property Types: ${propertyTypes.length}`);
        console.log(`Would Migrate:        ${migrationCount}`);
        console.log(`No Change Needed:     ${noChangeCount}`);
        console.log(`Missing Configs:      ${missingConfigCount}`);
        console.log(`Proposed Fixes:       ${fixableCount}`);
        console.log('==================================================');
        console.log('No changes were made to the database.');

    } catch (error) {
        console.error('❌ Error during dry run:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

dryRunMigration();
