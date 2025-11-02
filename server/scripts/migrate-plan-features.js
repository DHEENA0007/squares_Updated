const mongoose = require('mongoose');
require('dotenv').config();
const Plan = require('../models/Plan');

/**
 * Migration script to convert old plan features (string array) to new format (object array)
 * Run this if you have existing plans with old feature structure
 */

const migratePlanFeatures = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const plans = await Plan.find({});
    console.log(`📋 Found ${plans.length} plans to check`);

    let migratedCount = 0;

    for (const plan of plans) {
      let needsUpdate = false;
      
      // Check if features need migration (string array → object array)
      if (plan.features && plan.features.length > 0) {
        const firstFeature = plan.features[0];
        
        // If features are still strings, migrate them
        if (typeof firstFeature === 'string') {
          console.log(`🔄 Migrating features for plan: ${plan.name}`);
          
          plan.features = plan.features.map(feature => ({
            name: feature,
            description: '',
            enabled: true
          }));
          
          needsUpdate = true;
        }
      }

      // Ensure all new limit fields exist
      if (!plan.limits.videos) {
        plan.limits.videos = 0;
        needsUpdate = true;
      }
      
      if (!plan.limits.marketingManager) {
        plan.limits.marketingManager = false;
        needsUpdate = true;
      }
      
      if (!plan.limits.commissionBased) {
        plan.limits.commissionBased = false;
        needsUpdate = true;
      }
      
      if (!plan.limits.support) {
        plan.limits.support = 'email';
        needsUpdate = true;
      }
      
      if (!plan.limits.leadManagement) {
        plan.limits.leadManagement = 'basic';
        needsUpdate = true;
      }

      // Save if updates were made
      if (needsUpdate) {
        await plan.save();
        migratedCount++;
        console.log(`✅ Updated: ${plan.name}`);
      } else {
        console.log(`✓ Already up-to-date: ${plan.name}`);
      }
    }

    console.log(`\n✨ Migration complete!`);
    console.log(`   • Total plans checked: ${plans.length}`);
    console.log(`   • Plans updated: ${migratedCount}`);
    console.log(`   • Plans already current: ${plans.length - migratedCount}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

migratePlanFeatures();
