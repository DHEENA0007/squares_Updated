const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const {
    FilterConfiguration,
    ConfigurationMetadata,
    PropertyType
} = require('../models/Configuration');

async function verifyRepair() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('\n--- 1. Verifying Property Types ---');
        const pts = await PropertyType.find({ name: /flat.*apartment/i });
        if (pts.length === 1 && pts[0].value === 'flat/apartment') {
            console.log('✅ SUCCESS: Only one "Flat / Apartment" Property Type exists.');
            console.log(`   Categories: ${JSON.stringify(pts[0].categories)}`);
        } else {
            console.log('❌ FAILURE: Unexpected Property Types found:');
            pts.forEach(pt => console.log(`   - ${pt.name} (${pt.value})`));
        }

        console.log('\n--- 2. Verifying Filter Configurations ---');
        const filters = await FilterConfiguration.find({ name: /flat.*apartment/i });
        if (filters.length === 1 && filters[0].value === 'flat/apartment') {
            console.log('✅ SUCCESS: Only one "Flat / Apartment" Filter exists.');
        } else {
            console.log('❌ FAILURE: Unexpected Filters found:');
            filters.forEach(f => console.log(`   - ${f.name} (${f.value})`));
        }

        console.log('\n--- 3. Verifying Visibility Rules ---');
        const visMetadata = await ConfigurationMetadata.findOne({ configKey: 'filter_option_visibility' });
        const rules = visMetadata?.configValue || [];

        const targetRule = rules.find(r =>
            r.filterType === 'property_type' && r.optionValue === 'flat/apartment'
        );

        if (targetRule) {
            const sources = targetRule.sourceFilterValues.sort();
            const expected = ['lease', 'rent', 'sale'].sort(); // 'sale' was already there, 'rent'/'lease' added

            // Check if all expected are present
            const allPresent = expected.every(val => sources.includes(val));

            if (allPresent) {
                console.log(`✅ SUCCESS: Visibility Rule covers: ${sources.join(', ')}`);
            } else {
                console.log(`❌ FAILURE: Visibility Rule missing modes. Found: ${sources.join(', ')}`);
            }
        } else {
            console.log('❌ FAILURE: No visibility rule found for "flat/apartment"');
        }

        console.log('\n--- 4. Verifying Dependencies ---');
        const depMetadata = await ConfigurationMetadata.findOne({ configKey: 'filter_dependencies' });
        const deps = depMetadata?.configValue || [];

        ['bedrooms', 'facing'].forEach(type => {
            const dep = deps.find(d => d.targetFilterType === type && d.sourceFilterType === 'property_type');
            if (dep && dep.sourceFilterValues.includes('flat/apartment')) {
                console.log(`✅ SUCCESS: "flat/apartment" triggers "${type}"`);
            } else {
                console.log(`❌ FAILURE: "flat/apartment" does NOT trigger "${type}"`);
            }
        });

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDisconnected from MongoDB');
    }
}

verifyRepair();
