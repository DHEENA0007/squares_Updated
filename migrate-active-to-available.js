#!/usr/bin/env node

/**
 * Migration Script: Convert 'active' property status to 'available'
 * 
 * This script ensures all properties with 'active' status are converted to 'available'
 * and sets verified flag to true for consistency.
 * 
 * Run: node migrate-active-to-available.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Property = require('./server/models/Property');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/property-portal';

async function migrateActiveToAvailable() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all properties with 'active' status
    const activeProperties = await Property.find({ status: 'active' });

    console.log(`📊 Found ${activeProperties.length} properties with 'active' status\n`);

    if (activeProperties.length === 0) {
      console.log('✨ No properties to migrate. All properties are already using correct status values.');
      await mongoose.disconnect();
      return;
    }

    // Migrate each property
    let successCount = 0;
    let errorCount = 0;

    for (const property of activeProperties) {
      try {
        console.log(`📝 Migrating property: ${property._id}`);
        console.log(`   Title: ${property.title}`);
        console.log(`   Old status: active`);
        
        property.status = 'available';
        property.verified = true; // Mark as verified since it was active
        
        await property.save();
        
        console.log(`   ✅ New status: available (verified: true)\n`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error migrating property ${property._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📊 Total processed: ${activeProperties.length}`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('✨ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
console.log('🚀 Starting property status migration...\n');
migrateActiveToAvailable();
