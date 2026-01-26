const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/squares-v3';

async function exportFullData() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;

        // 1. Export Configuration
        console.log('\n📥 Downloading Configuration Data...');
        const propertyTypes = await db.collection('propertytypes').find({}).toArray();
        console.log(`   - propertytypes: ${propertyTypes.length} records`);

        // 2. Export Properties (Selected fields to keep file size reasonable but useful)
        console.log('\n📥 Downloading Property Data...');
        const properties = await db.collection('properties').find({}, {
            projection: {
                _id: 1,
                title: 1,
                type: 1,        // This links to propertytypes.value
                listingType: 1,
                status: 1,
                owner: 1,
                createdAt: 1
            }
        }).toArray();
        console.log(`   - properties: ${properties.length} records`);

        // 3. Prepare Export Object
        const exportData = {
            timestamp: new Date().toISOString(),
            configurations: {
                propertyTypes: propertyTypes
            },
            properties: properties,
            summary: {
                totalPropertyTypes: propertyTypes.length,
                totalProperties: properties.length
            }
        };

        // 4. Save to file
        const exportDir = path.join(__dirname, '../mongo_exports');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `full_data_export_${timestamp}.json`;
        const filePath = path.join(exportDir, fileName);

        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
        console.log(`\n💾 Data exported to:\n   ${filePath}`);

        // 5. Print Analysis
        console.log('\n🔍 Data Analysis:');

        // Map Property Types for easy lookup
        const typeMap = new Map(propertyTypes.map(pt => [pt.value, pt]));

        // Group properties by type
        const usageByType = {};
        properties.forEach(p => {
            const type = p.type || 'undefined';
            if (!usageByType[type]) usageByType[type] = 0;
            usageByType[type]++;
        });

        console.log('\n   Property Type Usage vs Configuration:');
        console.log('   Type Value       | Count | Configured Categories');
        console.log('   -----------------|-------|----------------------');

        // Check all used types
        Object.keys(usageByType).sort().forEach(typeValue => {
            const count = usageByType[typeValue];
            const config = typeMap.get(typeValue);

            let categoriesStr = '⚠️ NOT CONFIGURED';
            if (config) {
                if (config.categories && config.categories.length > 0) {
                    categoriesStr = `[${config.categories.join(', ')}]`;
                } else if (config.category) {
                    categoriesStr = `"${config.category}" (Legacy)`;
                } else {
                    categoriesStr = 'None';
                }
            }

            console.log(`   ${typeValue.padEnd(16)} | ${count.toString().padEnd(5)} | ${categoriesStr}`);
        });

        // Check for configured types with NO usage
        propertyTypes.forEach(pt => {
            if (!usageByType[pt.value]) {
                let categoriesStr = pt.categories ? `[${pt.categories.join(', ')}]` : `"${pt.category}"`;
                console.log(`   ${pt.value.padEnd(16)} | 0     | ${categoriesStr} (Unused)`);
            }
        });

    } catch (error) {
        console.error('❌ Error during export:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

exportFullData();
