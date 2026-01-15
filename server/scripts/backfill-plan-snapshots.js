/**
 * Backfill Plan Snapshots for Existing Subscriptions
 * 
 * This script adds planSnapshot to existing subscriptions that don't have one.
 * This is a one-time migration script to ensure grandfathering works for 
 * existing subscribers when the superadmin updates subscription plans.
 * 
 * Run this script with: node server/scripts/backfill-plan-snapshots.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function backfillPlanSnapshots() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/squares');
        console.log('📦 Connected to MongoDB');

        const Subscription = require('../models/Subscription');
        const Plan = require('../models/Plan');

        // Find all subscriptions without planSnapshot
        const subscriptionsWithoutSnapshot = await Subscription.find({
            planSnapshot: { $exists: false }
        }).populate('plan');

        console.log(`\n📊 Found ${subscriptionsWithoutSnapshot.length} subscriptions without planSnapshot`);

        if (subscriptionsWithoutSnapshot.length === 0) {
            console.log('✅ All subscriptions already have planSnapshot. Nothing to do.');
            await mongoose.connection.close();
            return;
        }

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        for (const subscription of subscriptionsWithoutSnapshot) {
            try {
                if (!subscription.plan) {
                    console.log(`⚠️ Skipping subscription ${subscription._id} - no plan linked`);
                    skipped++;
                    continue;
                }

                // Create plan snapshot
                subscription.planSnapshot = {
                    name: subscription.plan.name,
                    description: subscription.plan.description,
                    price: subscription.plan.price,
                    currency: subscription.plan.currency,
                    billingPeriod: subscription.plan.billingPeriod,
                    features: subscription.plan.features ? JSON.parse(JSON.stringify(subscription.plan.features)) : [],
                    limits: subscription.plan.limits ? JSON.parse(JSON.stringify(subscription.plan.limits)) : {}
                };

                await subscription.save();
                console.log(`✅ Updated subscription ${subscription._id} (Plan: ${subscription.plan.name})`);
                updated++;
            } catch (error) {
                console.error(`❌ Error updating subscription ${subscription._id}:`, error.message);
                errors++;
            }
        }

        console.log('\n========================================');
        console.log('📊 BACKFILL SUMMARY:');
        console.log('========================================');
        console.log(`✅ Updated: ${updated}`);
        console.log(`⏭️ Skipped: ${skipped}`);
        console.log(`❌ Errors: ${errors}`);
        console.log('========================================\n');

        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }
}

// Run the script
backfillPlanSnapshots();
