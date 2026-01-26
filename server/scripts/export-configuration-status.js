const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/squares-v3';

async function exportConfigurationStatus() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;

        // Collections to export
        const collections = ['propertytypes', 'amenities', 'filterconfigurations', 'navigationitems'];
        const exportData = {};

        console.log('\n📥 Downloading Configuration Data...');

        for (const colName of collections) {
            const data = await db.collection(colName).find({}).toArray();
            exportData[colName] = data;
            console.log(`   - ${colName}: ${data.length} records`);
        }

        // Analyze Property Usage
        console.log('\n📊 Analyzing Property Usage...');
        const propertiesCollection = db.collection('properties');
        const propertyCounts = await propertiesCollection.aggregate([
            { $group: { _id: "$type", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        exportData.propertyUsage = propertyCounts;

        // Create export directory
        const exportDir = path.join(__dirname, '../mongo_exports');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }

        // Save to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `configuration_export_${timestamp}.json`;
        const filePath = path.join(exportDir, fileName);

        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
        console.log(`\n💾 Configuration data exported to:\n   ${filePath}`);

        // Print Summary of Property Types vs Usage
        console.log('\n📋 Property Types Configuration vs Usage Summary:');
        const propertyTypes = exportData['propertytypes'];
        const propertyTypesMap = new Map(propertyTypes.map(pt => [pt.value, pt]));

        console.log('   Type Value       | Count | Configured Categories');
        console.log('   -----------------|-------|----------------------');

        for (const p of propertyCounts) {
            const typeValue = p._id || 'undefined';
            const count = p.count;
            const config = propertyTypesMap.get(typeValue);

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
        }

    } catch (error) {
        console.error('❌ Error during export:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

exportConfigurationStatus();
