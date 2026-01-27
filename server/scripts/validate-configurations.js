const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const {
    FilterConfiguration,
    ConfigurationMetadata,
    PropertyType
} = require('../models/Configuration');

async function validateConfigurations() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Fetch all data
        const filters = await FilterConfiguration.find({});
        const propertyTypes = await PropertyType.find({});

        const depMetadata = await ConfigurationMetadata.findOne({ configKey: 'filter_dependencies' });
        const dependencies = depMetadata?.configValue || [];

        const visMetadata = await ConfigurationMetadata.findOne({ configKey: 'filter_option_visibility' });
        const visibilityRules = visMetadata?.configValue || [];

        console.log(`\n--- Configuration Summary ---`);
        console.log(`Filters: ${filters.length}`);
        console.log(`Property Types: ${propertyTypes.length}`);
        console.log(`Dependencies: ${dependencies.length}`);
        console.log(`Visibility Rules: ${visibilityRules.length}`);

        // Helper to find filter
        const findFilter = (type, value) => filters.find(f => f.filterType === type && f.value === value);
        const findFilterByType = (type) => filters.filter(f => f.filterType === type);

        // 2. Check for Extra/Dangling Filters
        console.log(`\n--- Checking for Extra/Dangling Filters ---`);
        const propertyTypeFilters = filters.filter(f => f.filterType === 'property_type');
        const extraPropertyTypeFilters = [];

        for (const filter of propertyTypeFilters) {
            const matchingPT = propertyTypes.find(pt => pt.value === filter.value);
            if (!matchingPT) {
                extraPropertyTypeFilters.push(filter);
            }
        }

        if (extraPropertyTypeFilters.length > 0) {
            console.log(`Found ${extraPropertyTypeFilters.length} 'property_type' filters without matching PropertyType:`);
            extraPropertyTypeFilters.forEach(f => console.log(` - ${f.name} (value: ${f.value})`));
        } else {
            console.log("✓ All 'property_type' filters have matching PropertyTypes.");
        }

        // 3. Check Dependencies
        console.log(`\n--- Checking Filter Dependencies ---`);
        dependencies.forEach((dep, index) => {
            const sourceFilters = findFilterByType(dep.sourceFilterType);
            const targetFilters = findFilterByType(dep.targetFilterType);

            if (sourceFilters.length === 0) {
                console.log(`[Dependency #${index + 1}] Source Filter Type '${dep.sourceFilterType}' not found in filters.`);
            }
            if (targetFilters.length === 0) {
                console.log(`[Dependency #${index + 1}] Target Filter Type '${dep.targetFilterType}' not found in filters.`);
            }

            // Check source values
            if (dep.sourceFilterValues) {
                dep.sourceFilterValues.forEach(val => {
                    const exists = sourceFilters.some(f => f.value === val);
                    if (!exists) {
                        console.log(`[Dependency #${index + 1}] Source Value '${val}' for filter '${dep.sourceFilterType}' does not exist.`);
                    }
                });
            }
        });

        // 4. Check Visibility Rules
        console.log(`\n--- Checking Visibility Rules ---`);
        visibilityRules.forEach((rule, index) => {
            // Check if target option exists
            const targetOption = findFilter(rule.filterType, rule.optionValue);
            if (!targetOption) {
                console.log(`[Rule #${index + 1}] Target Option '${rule.optionValue}' (type: ${rule.filterType}) does not exist.`);
            }

            // Check source filter type
            const sourceFilters = findFilterByType(rule.sourceFilterType);
            if (sourceFilters.length === 0) {
                console.log(`[Rule #${index + 1}] Source Filter Type '${rule.sourceFilterType}' not found.`);
            }

            // Check source values
            if (rule.sourceFilterValues) {
                rule.sourceFilterValues.forEach(val => {
                    const exists = sourceFilters.some(f => f.value === val);
                    if (!exists) {
                        console.log(`[Rule #${index + 1}] Source Value '${val}' for filter '${rule.sourceFilterType}' does not exist.`);
                    }
                });
            }
        });

        // 5. Check for Duplicate Filters
        console.log(`\n--- Checking for Duplicate Filters ---`);
        const filterMap = new Map();
        const duplicates = [];

        filters.forEach(f => {
            const key = `${f.filterType}:${f.value}`;
            if (filterMap.has(key)) {
                duplicates.push(f);
            } else {
                filterMap.set(key, f);
            }
        });

        if (duplicates.length > 0) {
            console.log(`Found ${duplicates.length} duplicate filters:`);
            duplicates.forEach(f => console.log(` - ${f.name} (type: ${f.filterType}, value: ${f.value})`));
        } else {
            console.log("✓ No duplicate filters found.");
        }

    } catch (error) {
        console.error('Validation failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDisconnected from MongoDB');
    }
}

validateConfigurations();
