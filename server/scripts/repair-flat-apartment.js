const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const {
    FilterConfiguration,
    ConfigurationMetadata,
    PropertyType,
    PropertyTypeField,
    PropertyTypeAmenity
} = require('../models/Configuration');

async function repairFlatApartment() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const TARGET_VALUE = 'flat/apartment';
        const BAD_VALUES = ['apartment', 'Flat / Apartment'];

        console.log(`\n--- Consolidating Flat/Apartment to "${TARGET_VALUE}" ---`);

        // 1. Identify the Target Property Type (flat/apartment)
        let targetPT = await PropertyType.findOne({ value: TARGET_VALUE });
        if (!targetPT) {
            console.log(`Target Property Type "${TARGET_VALUE}" not found. Creating it...`);
            // If it doesn't exist, we might need to rename one of the others or create new
            // For now, assuming it exists based on previous analysis
            throw new Error(`Target Property Type "${TARGET_VALUE}" missing! Aborting.`);
        }
        console.log(`Found Target Property Type: ${targetPT.name} (${targetPT._id})`);

        // 2. Identify the Target Filter Configuration
        let targetFilter = await FilterConfiguration.findOne({ filterType: 'property_type', value: TARGET_VALUE });
        if (!targetFilter) {
            console.log(`Target Filter "${TARGET_VALUE}" not found. Creating it...`);
            // Logic to create if missing, but analysis showed it exists
            throw new Error(`Target Filter "${TARGET_VALUE}" missing! Aborting.`);
        }
        console.log(`Found Target Filter: ${targetFilter.name} (${targetFilter._id})`);

        // 3. Update Target Categories (Merge categories from bad ones)
        const badPTs = await PropertyType.find({ value: { $in: BAD_VALUES } });
        let allCategories = new Set(targetPT.categories || []);

        for (const badPT of badPTs) {
            console.log(`Processing Bad PT: ${badPT.name} (${badPT.value})`);
            if (badPT.categories) {
                badPT.categories.forEach(c => allCategories.add(c));
            }

            // Move Fields & Amenities to Target?
            // Since target 'flat/apartment' is newer, it might lack fields the old 'apartment' had.
            // Let's check fields count.
            const badFieldsCount = await PropertyTypeField.countDocuments({ propertyTypeId: badPT._id });
            const targetFieldsCount = await PropertyTypeField.countDocuments({ propertyTypeId: targetPT._id });
            console.log(`  - Fields: Bad=${badFieldsCount}, Target=${targetFieldsCount}`);

            if (badFieldsCount > targetFieldsCount) {
                console.log(`  -> Moving fields from ${badPT.value} to ${TARGET_VALUE}...`);
                await PropertyTypeField.updateMany(
                    { propertyTypeId: badPT._id },
                    { $set: { propertyTypeId: targetPT._id } }
                );
            } else {
                console.log(`  -> Deleting fields for ${badPT.value}...`);
                await PropertyTypeField.deleteMany({ propertyTypeId: badPT._id });
            }

            // Amenities
            await PropertyTypeAmenity.deleteMany({ propertyTypeId: badPT._id }); // Just delete bad mappings, assume target has or will have them
        }

        // Update Target PT with merged categories
        targetPT.categories = Array.from(allCategories);
        await targetPT.save();
        console.log(`Updated Target PT Categories: ${JSON.stringify(targetPT.categories)}`);

        // 4. Delete Bad Property Types & Filters
        const deletePTResult = await PropertyType.deleteMany({ value: { $in: BAD_VALUES } });
        console.log(`Deleted ${deletePTResult.deletedCount} Bad Property Types`);

        const deleteFilterResult = await FilterConfiguration.deleteMany({
            filterType: 'property_type',
            value: { $in: BAD_VALUES }
        });
        console.log(`Deleted ${deleteFilterResult.deletedCount} Bad Filter Configurations`);

        // 5. Update Visibility Rules
        console.log('\n--- Updating Visibility Rules ---');
        const visMetadata = await ConfigurationMetadata.findOne({ configKey: 'filter_option_visibility' });
        let rules = visMetadata?.configValue || [];

        // Remove old rules for bad values
        rules = rules.filter(r =>
            !(r.filterType === 'property_type' && BAD_VALUES.includes(r.optionValue))
        );

        // Ensure Target Value is visible for Rent, Sale, Lease
        const requiredModes = ['rent', 'sale', 'lease'];

        // Check if we already have a rule for flat/apartment
        let targetRule = rules.find(r =>
            r.filterType === 'property_type' && r.optionValue === TARGET_VALUE
        );

        if (targetRule) {
            // Update existing rule to include all modes
            console.log('Updating existing visibility rule for flat/apartment...');
            // Merge existing source values with required modes
            const currentSources = new Set(targetRule.sourceFilterValues || []);
            requiredModes.forEach(m => currentSources.add(m));
            targetRule.sourceFilterValues = Array.from(currentSources);
        } else {
            // Create new rule
            console.log('Creating new visibility rule for flat/apartment...');
            rules.push({
                filterType: 'property_type',
                optionValue: TARGET_VALUE,
                sourceFilterType: 'listing_type',
                sourceFilterValues: requiredModes
            });
        }

        // Save updated rules
        await ConfigurationMetadata.findOneAndUpdate(
            { configKey: 'filter_option_visibility' },
            { configValue: rules },
            { upsert: true }
        );
        console.log('Visibility Rules Updated.');

        // 6. Update Dependencies (Ensure flat/apartment triggers bedrooms/facing)
        console.log('\n--- Updating Dependencies ---');
        const depMetadata = await ConfigurationMetadata.findOne({ configKey: 'filter_dependencies' });
        let deps = depMetadata?.configValue || [];

        // We need to ensure 'flat/apartment' is in sourceFilterValues for 'bedrooms' and 'facing'
        const targetDepTypes = ['bedrooms', 'facing'];

        for (const type of targetDepTypes) {
            let dep = deps.find(d => d.targetFilterType === type && d.sourceFilterType === 'property_type');
            if (dep) {
                if (!dep.sourceFilterValues.includes(TARGET_VALUE)) {
                    dep.sourceFilterValues.push(TARGET_VALUE);
                    console.log(`Added ${TARGET_VALUE} to dependency for ${type}`);
                }
                // Remove bad values
                dep.sourceFilterValues = dep.sourceFilterValues.filter(v => !BAD_VALUES.includes(v));
            } else {
                console.log(`Creating new dependency for ${type}...`);
                deps.push({
                    targetFilterType: type,
                    sourceFilterType: 'property_type',
                    sourceFilterValues: [TARGET_VALUE]
                });
            }
        }

        // Save updated dependencies
        await ConfigurationMetadata.findOneAndUpdate(
            { configKey: 'filter_dependencies' },
            { configValue: deps },
            { upsert: true }
        );
        console.log('Dependencies Updated.');

        console.log('\n✓ Repair Completed Successfully!');

    } catch (error) {
        console.error('Repair failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
    }
}

repairFlatApartment();
