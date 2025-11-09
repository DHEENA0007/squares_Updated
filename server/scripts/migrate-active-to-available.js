require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');

const migrateActiveToAvailable = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ninety-nine-acres';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all properties with 'active' status
    const activeProperties = await Property.find({ status: 'active' });
    
    console.log(`📊 Found ${activeProperties.length} properties with 'active' status\n`);

    if (activeProperties.length === 0) {
      console.log('✅ No properties to migrate. All properties are already using correct statuses.');
      return;
    }

    let migratedCount = 0;

    // Update all 'active' properties to 'available' and mark as verified
    for (const property of activeProperties) {
      console.log(`🔄 Migrating property: ${property.title} (${property._id})`);
      console.log(`   Old status: active`);
      
      property.status = 'available';
      property.verified = true; // Ensure verified flag is set
      
      await property.save();
      migratedCount++;
      
      console.log(`   New status: available`);
      console.log(`   Verified: ${property.verified}`);
      console.log('   ✅ Migrated successfully\n');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Total properties migrated: ${migratedCount}`);
    console.log(`✅ All 'active' properties are now 'available' and verified`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run migration
migrateActiveToAvailable()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
