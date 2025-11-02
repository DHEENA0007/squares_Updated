const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
require('dotenv').config();

/**
 * Script to clean up subscriptions with null or invalid plan references
 * This helps prevent errors when displaying subscription data
 */
const cleanupInvalidSubscriptions = async () => {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ninety-nine-acres');
    console.log('✅ Connected to database\n');

    // Find all subscriptions
    console.log('📊 Checking all subscriptions...');
    const allSubscriptions = await Subscription.find({});
    console.log(`Found ${allSubscriptions.length} total subscriptions\n`);

    // Check for subscriptions with null or invalid plan references
    const invalidSubscriptions = [];
    
    for (const subscription of allSubscriptions) {
      if (!subscription.plan) {
        invalidSubscriptions.push({
          id: subscription._id,
          reason: 'Plan is null',
          subscription
        });
      } else {
        // Check if the plan actually exists
        const planExists = await Plan.findById(subscription.plan);
        if (!planExists) {
          invalidSubscriptions.push({
            id: subscription._id,
            reason: 'Plan reference is invalid (plan not found)',
            subscription
          });
        }
      }
    }

    console.log(`\n❌ Found ${invalidSubscriptions.length} invalid subscriptions:`);
    
    if (invalidSubscriptions.length > 0) {
      invalidSubscriptions.forEach((item, index) => {
        console.log(`\n${index + 1}. Subscription ID: ${item.id}`);
        console.log(`   Reason: ${item.reason}`);
        console.log(`   User: ${item.subscription.user}`);
        console.log(`   Status: ${item.subscription.status}`);
        console.log(`   Amount: ₹${item.subscription.amount}`);
        console.log(`   Created: ${item.subscription.createdAt}`);
      });

      console.log('\n\n📋 Cleanup Options:');
      console.log('1. Delete these invalid subscriptions');
      console.log('2. Assign them to a default "Free" plan');
      console.log('3. Mark them as cancelled');
      console.log('\n⚠️  This is a dry run. No changes have been made.');
      console.log('💡 To actually clean up, modify this script to execute your chosen action.\n');

      // Example: To delete invalid subscriptions (uncomment to use)
      // const idsToDelete = invalidSubscriptions.map(item => item.id);
      // await Subscription.deleteMany({ _id: { $in: idsToDelete } });
      // console.log(`✅ Deleted ${idsToDelete.length} invalid subscriptions`);

      // Example: To mark as cancelled (uncomment to use)
      // const idsToCancel = invalidSubscriptions.map(item => item.id);
      // await Subscription.updateMany(
      //   { _id: { $in: idsToCancel } },
      //   { $set: { status: 'cancelled' } }
      // );
      // console.log(`✅ Cancelled ${idsToCancel.length} invalid subscriptions`);

      // Example: To assign to a free plan (uncomment to use)
      // const freePlan = await Plan.findOne({ name: /free/i });
      // if (freePlan) {
      //   const idsToFix = invalidSubscriptions.map(item => item.id);
      //   await Subscription.updateMany(
      //     { _id: { $in: idsToFix } },
      //     { $set: { plan: freePlan._id } }
      //   );
      //   console.log(`✅ Assigned ${idsToFix.length} subscriptions to Free plan`);
      // } else {
      //   console.log('❌ No Free plan found. Please create one first.');
      // }
    } else {
      console.log('✅ All subscriptions have valid plan references!');
    }

    // Show statistics
    console.log('\n\n📈 Database Statistics:');
    const stats = await Subscription.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('Subscriptions by status:');
    stats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count}`);
    });

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    console.log('\n🔌 Disconnecting from database...');
    await mongoose.disconnect();
    console.log('✅ Disconnected');
    process.exit(0);
  }
};

// Run the cleanup
cleanupInvalidSubscriptions();
