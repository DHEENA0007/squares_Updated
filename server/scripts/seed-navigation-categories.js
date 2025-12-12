const path = require('path');
const mongoose = require('mongoose');
const { ConfigurationMetadata } = require('../models/Configuration');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const navigationCategories = [
  { value: 'residential', label: 'Residential', isActive: true, displayOrder: 1 },
  { value: 'commercial', label: 'Commercial', isActive: true, displayOrder: 2 },
  { value: 'agricultural', label: 'Agricultural', isActive: true, displayOrder: 3 },
];

async function seedNavigationCategories() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if categories already exist
    const existingCategories = await ConfigurationMetadata.findOne({ 
      configKey: 'navigation_categories' 
    });

    if (existingCategories) {
      console.log('\n⚠️  Navigation categories already exist in database:');
      console.log(JSON.stringify(existingCategories.configValue, null, 2));
      console.log('\nDo you want to overwrite? (This will replace existing categories)');
      console.log('To proceed, run: node server/scripts/seed-navigation-categories.js --force');
      
      if (!process.argv.includes('--force')) {
        console.log('\n✅ Skipping seed to prevent overwriting existing data');
        await mongoose.connection.close();
        return;
      }
    }

    // Insert or update categories
    const result = await ConfigurationMetadata.findOneAndUpdate(
      { configKey: 'navigation_categories' },
      {
        configKey: 'navigation_categories',
        configValue: navigationCategories,
        description: 'Navigation item categories for property types'
      },
      { upsert: true, new: true }
    );

    console.log('\n✅ Navigation categories seeded successfully!');
    console.log('\nSeeded categories:');
    result.configValue.forEach(cat => {
      console.log(`  - ${cat.label} (${cat.value}) - ${cat.isActive ? '✓ Active' : '✗ Inactive'}`);
    });

    console.log('\n📊 Summary:');
    console.log(`   Total categories: ${result.configValue.length}`);
    console.log(`   Active categories: ${result.configValue.filter(c => c.isActive).length}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding navigation categories:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedNavigationCategories();
