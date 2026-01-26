const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Use environment variable or fallback to local
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/squares-v3';

async function migrateConfigurations() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        console.log(`   URI: ${MONGODB_URI.includes('@') ? '***' : MONGODB_URI}`);

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const propertyTypesCollection = db.collection('propertytypes');
        const propertiesCollection = db.collection('properties');

        // 1. Fetch all existing Property Types
        const propertyTypes = await propertyTypesCollection.find({}).toArray();
        console.log(`\n📋 Found ${propertyTypes.length} Property Types in configuration.`);

        // 2. Backup existing configuration
        const backupDir = path.join(__dirname, '../mongo_exports');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const backupFile = path.join(backupDir, `property_types_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(propertyTypes, null, 2));
        console.log(`💾 Backup saved to: ${backupFile}`);

        // 3. Analyze and Migrate
        console.log('\n🔄 Starting Migration (category -> categories)...');
        let migratedCount = 0;
        let skippedCount = 0;

        for (const pt of propertyTypes) {
            // Check if migration is needed
            const hasOldCategory = !!pt.category;
            const hasNewCategories = Array.isArray(pt.categories) && pt.categories.length > 0;

            if (hasOldCategory && !hasNewCategories) {
                console.log(`   Migrating "${pt.name}" (${pt.value}): "${pt.category}" -> ["${pt.category}"]`);

                await propertyTypesCollection.updateOne(
                    { _id: pt._id },
                    {
                        $set: { categories: [pt.category] },
                        // We keep the old 'category' field for now just in case, or we could $unset it
                        // $unset: { category: "" } 
                    }
                );
                migratedCount++;
            } else if (hasNewCategories) {
                console.log(`   Skipping "${pt.name}" (${pt.value}): Already has categories [${pt.categories.join(', ')}]`);
                skippedCount++;
            } else {
                console.log(`   ⚠️ Warning "${pt.name}" (${pt.value}): No category found to migrate.`);
                // Fallback: try to guess or set default?
                // For now, we just log.
            }
        }

        console.log(`\n✅ Migration Complete: ${migratedCount} migrated, ${skippedCount} skipped.`);

        // 4. Analyze Property Usage
        console.log('\n📊 Analyzing existing Properties usage...');

        // Get counts of properties by type
        const propertyCounts = await propertiesCollection.aggregate([
            { $group: { _id: "$type", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        console.log('   Properties count by Type:');
        const propertyTypesMap = new Map(propertyTypes.map(pt => [pt.value, pt]));

        for (const p of propertyCounts) {
            const typeValue = p._id;
            const count = p.count;
            const config = propertyTypesMap.get(typeValue);

            if (config) {
                // Re-fetch config to get updated categories if needed, but we can just use what we have + logic
                // Actually, we should use the updated info.
                // Let's just use the logic: if we migrated, it has categories.
                const categories = config.categories && config.categories.length > 0
                    ? config.categories
                    : (config.category ? [config.category] : []);

                console.log(`   - ${typeValue.padEnd(15)}: ${count.toString().padEnd(5)} properties (Config: ${config.name} -> [${categories.join(', ')}])`);
            } else {
                console.log(`   - ${typeValue.padEnd(15)}: ${count.toString().padEnd(5)} properties ⚠️ NO CONFIGURATION FOUND`);
            }
        }

    } catch (error) {
        console.error('❌ Error during migration:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

migrateConfigurations();
