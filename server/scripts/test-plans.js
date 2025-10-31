const mongoose = require('mongoose');
require('dotenv').config();
const Plan = require('../models/Plan');

const testPlans = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all plans from database
    const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 });
    
    console.log('\n📋 Current Subscription Plans in Database:');
    console.log('============================================');
    
    plans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name}`);
      console.log(`   Price: ₹${plan.price}`);
      console.log(`   Description: ${plan.description}`);
      console.log(`   Features: ${plan.features.join(', ')}`);
      console.log(`   Limits: Properties - ${plan.limits?.properties || 0} ${plan.limits?.properties === 0 ? '(Unlimited)' : ''}`);
      console.log('   ---');
    });
    
    if (plans.length === 0) {
      console.log('❌ No plans found in database!');
    } else {
      console.log(`✅ Found ${plans.length} active plans`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

testPlans();
