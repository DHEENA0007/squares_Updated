const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const {
    FilterConfiguration,
    ConfigurationMetadata,
    PropertyType,
    Property // Assuming Property model exists and is exported or I can define a lightweight schema
} = require('../models/Configuration');

// We need to define Property schema/model if it's not in Configuration.js (it usually isn't)
const propertySchema = new mongoose.Schema({
    propertyType: String,
    // other fields...
}, { strict: false });

let PropertyModel;
try {
    PropertyModel = mongoose.model('Property');
} catch (e) {
    PropertyModel = mongoose.model('Property', propertySchema);
}

async function analyzeFlatApartment() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const regex = /flat.*apartment/i;

        // 1. Find Property Types
        console.log('\n=== 1. Property Types ===');
        const propertyTypes = await PropertyType.find({ name: regex });
        const ptValues = propertyTypes.map(pt => pt.value);

        if (propertyTypes.length === 0) {
            console.log('No Property Types found matching "Flat / Apartment"');
        } else {
            propertyTypes.forEach(pt => {
                console.log(`- ID: ${pt._id}`);
                console.log(`  Name: "${pt.name}"`);
                console.log(`  Value: "${pt.value}"`);
                console.log(`  Categories: ${JSON.stringify(pt.categories)}`);
                console.log(`  Active: ${pt.isActive}`);
                console.log('---');
            });
        }

        // 2. Find Filter Configurations
        console.log('\n=== 2. Filter Configurations ===');
        const filters = await FilterConfiguration.find({
            $or: [
                { name: regex },
                { displayLabel: regex },
                { value: { $in: ptValues } } // Also check by value in case name is different
            ],
            filterType: 'property_type'
        });
        const filterValues = filters.map(f => f.value);

        if (filters.length === 0) {
            console.log('No Filter Configurations found matching "Flat / Apartment"');
        } else {
            filters.forEach(f => {
                console.log(`- ID: ${f._id}`);
                console.log(`  Name: "${f.name}"`);
                console.log(`  Value: "${f.value}"`);
                console.log(`  Display Label: "${f.displayLabel}"`);
                console.log(`  Active: ${f.isActive}`);
                console.log('---');
            });
        }

        // Combine all unique values found
        const allValues = [...new Set([...ptValues, ...filterValues])];
        console.log(`\nUnique Values Found: ${JSON.stringify(allValues)}`);

        // 3. Check Dependencies & Visibility Rules
        console.log('\n=== 3. Rules & Dependencies ===');

        const depMetadata = await ConfigurationMetadata.findOne({ configKey: 'filter_dependencies' });
        const dependencies = depMetadata?.configValue || [];

        const visMetadata = await ConfigurationMetadata.findOne({ configKey: 'filter_option_visibility' });
        const visibilityRules = visMetadata?.configValue || [];

        allValues.forEach(val => {
            console.log(`\nAnalyzing Value: "${val}"`);

            // Check Dependencies (as source)
            const asSourceDep = dependencies.filter(d =>
                d.sourceFilterType === 'property_type' && d.sourceFilterValues?.includes(val)
            );
            if (asSourceDep.length > 0) {
                console.log(`  [Dependency Source] Triggers: ${asSourceDep.map(d => d.targetFilterType).join(', ')}`);
            } else {
                console.log(`  [Dependency Source] Triggers NOTHING`);
            }

            // Check Visibility (as target option)
            const asTargetVis = visibilityRules.filter(r =>
                r.filterType === 'property_type' && r.optionValue === val
            );
            if (asTargetVis.length > 0) {
                asTargetVis.forEach(r => {
                    console.log(`  [Visibility Rule] Shown when ${r.sourceFilterType} is in [${r.sourceFilterValues.join(', ')}]`);
                });
            } else {
                console.log(`  [Visibility Rule] No specific visibility rules (Always shown?)`);
            }
        });

        // 4. Check Property Usage (Real Data)
        console.log('\n=== 4. Real Property Data Usage ===');
        for (const val of allValues) {
            const count = await PropertyModel.countDocuments({ propertyType: val });
            console.log(`- Value "${val}": Used in ${count} properties`);
        }

        // Check for properties using values NOT in our list (orphans?)
        // This is a bit broader, checking all property types used in Property collection
        const distinctPTs = await PropertyModel.distinct('propertyType');
        const unknownPTs = distinctPTs.filter(pt => !allValues.includes(pt) && /flat|apartment/i.test(pt));

        if (unknownPTs.length > 0) {
            console.log('\nWARNING: Found other "Flat/Apartment" like values in Property collection not in Configs:');
            unknownPTs.forEach(pt => console.log(`- "${pt}"`));
        }

    } catch (error) {
        console.error('Analysis failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDisconnected from MongoDB');
    }
}

analyzeFlatApartment();
