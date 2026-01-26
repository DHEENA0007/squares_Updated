const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/squares-v3';

async function applyMigrationAndFixes() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const propertyTypesCollection = db.collection('propertytypes');

        // 1. MIGRATE EXISTING TYPES
        console.log('\n🔄 1. Migrating existing types to support multiple categories...');
        const propertyTypes = await propertyTypesCollection.find({}).toArray();
        let migratedCount = 0;

        for (const pt of propertyTypes) {
            const hasOldCategory = !!pt.category;
            const hasNewCategories = Array.isArray(pt.categories) && pt.categories.length > 0;

            if (hasOldCategory && !hasNewCategories) {
                await propertyTypesCollection.updateOne(
                    { _id: pt._id },
                    { $set: { categories: [pt.category] } }
                );
                console.log(`   ✓ Migrated "${pt.name}"`);
                migratedCount++;
            }
        }
        console.log(`   ✨ Migrated ${migratedCount} types.`);

        // 2. FIX MISSING CONFIGURATION (Villa)
        console.log('\n🔧 2. Fixing missing configurations...');

        // Check if 'villa' exists
        const villaExists = await propertyTypesCollection.findOne({ value: 'villa' });

        if (!villaExists) {
            console.log('   ⚠️ Missing config for "villa" detected.');
            console.log('   ➕ Creating new Property Type: "Villa"');

            const newVillaType = {
                name: 'Villa',
                value: 'villa',
                categories: ['residential'], // Defaulting to residential
                icon: 'home',
                isActive: true,
                displayOrder: 10,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await propertyTypesCollection.insertOne(newVillaType);
            console.log('   ✅ Created "Villa" configuration.');
        } else {
            console.log('   ✓ "Villa" configuration already exists.');
        }

        console.log('\n✅ All operations completed successfully.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

applyMigrationAndFixes();
