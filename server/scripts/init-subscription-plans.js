const mongoose = require('mongoose');
require('dotenv').config();
const Plan = require('../models/Plan');

const initializeSubscriptionPlans = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Delete existing plans to start fresh
    await Plan.deleteMany({});
    console.log('🗑️  Cleared existing plans');

    // Define the new subscription plans according to your requirements
    const plansData = [
      {
        identifier: 'free',
        name: 'FREE LISTING',
        description: '5 Properties/Products - Perfect for getting started',
        price: 0,
        currency: 'INR',
        billingPeriod: 'monthly',
        features: [
          { name: '5 Property listings', enabled: true },
          { name: 'Basic property details', enabled: true },
          { name: 'Standard visibility', enabled: true },
          { name: 'Email support', enabled: true }
        ],
        limits: {
          properties: 5,
          featuredListings: 0,
          photos: 10,
          videoTours: 0,
          videos: 0,
          leadManagement: 'basic',
          support: 'email',
          topRated: false,
          verifiedBadge: false,
          posters: 0,
          leads: 0,
          messages: 50,
          marketingManager: false,
          commissionBased: false
        },
        isActive: true,
        isPopular: false,
        sortOrder: 1
      },
      {
        identifier: 'basic',
        name: 'BASIC PLAN - ₹199',
        description: '10 Properties + Top Rated + Verified Owner Badge',
        price: 199,
        currency: 'INR',
        billingPeriod: 'monthly',
        features: [
          { name: '10 Property listings', enabled: true },
          { name: 'Top Rated in Website', enabled: true },
          { name: 'Verified Owner Badge', enabled: true },
          { name: 'Priority email support', enabled: true },
          { name: 'Enhanced visibility', enabled: true }
        ],
        limits: {
          properties: 10,
          featuredListings: 2,
          photos: 15,
          videoTours: 0,
          videos: 0,
          leadManagement: 'basic',
          support: 'email',
          topRated: true,
          verifiedBadge: true,
          posters: 0,
          leads: 5,
          messages: 100,
          marketingManager: false,
          commissionBased: false
        },
        isActive: true,
        isPopular: true,
        sortOrder: 2
      },
      {
        identifier: 'standard',
        name: 'STANDARD PLAN - ₹499',
        description: '15 Properties + Benefits + 1 Poster with 6 leads',
        price: 499,
        currency: 'INR',
        billingPeriod: 'monthly',
        features: [
          { name: '15 Property listings', enabled: true },
          { name: 'Top Rated in Website', enabled: true },
          { name: 'Verified Owner Badge', enabled: true },
          { name: '1 Poster with 6 leads', enabled: true },
          { name: 'Priority support', enabled: true },
          { name: 'Enhanced marketing', enabled: true }
        ],
        limits: {
          properties: 15,
          featuredListings: 3,
          photos: 20,
          videoTours: 1,
          videos: 0,
          leadManagement: 'advanced',
          support: 'priority',
          topRated: true,
          verifiedBadge: true,
          posters: 1,
          leads: 6,
          messages: 200,
          marketingManager: false,
          commissionBased: false
        },
        isActive: true,
        isPopular: false,
        sortOrder: 3
      },
      {
        identifier: 'premium',
        name: 'PREMIUM PLAN - ₹1999',
        description: 'Unlimited Properties + 4 Posters with 20 leads',
        price: 1999,
        currency: 'INR',
        billingPeriod: 'monthly',
        features: [
          { name: 'Unlimited Property listings', enabled: true },
          { name: 'Top Rated in Website', enabled: true },
          { name: 'Verified Owner Badge', enabled: true },
          { name: '4 Posters with 20 leads', enabled: true },
          { name: 'Priority phone & email support', enabled: true },
          { name: 'Advanced analytics', enabled: true },
          { name: 'Featured listings', enabled: true }
        ],
        limits: {
          properties: 0, // unlimited
          featuredListings: 10,
          photos: 30,
          videoTours: 3,
          videos: 0,
          leadManagement: 'premium',
          support: 'phone',
          topRated: true,
          verifiedBadge: true,
          posters: 4,
          leads: 20,
          messages: 500,
          marketingManager: false,
          commissionBased: false
        },
        isActive: true,
        isPopular: false,
        sortOrder: 4
      },
      {
        identifier: 'enterprise',
        name: 'ENTERPRISE PLAN - ₹4999',
        description: 'Unlimited + Videos + 30+ leads + Marketing Manager',
        price: 4999,
        currency: 'INR',
        billingPeriod: 'monthly',
        features: [
          { name: 'Unlimited Property listings', enabled: true },
          { name: 'Top Rated in Website', enabled: true },
          { name: 'Verified Owner Badge', enabled: true },
          { name: '4 Posters & 1 Video with 30+ leads', enabled: true },
          { name: 'Consultation with Marketing Manager', enabled: true },
          { name: 'Commission based revenue', enabled: true },
          { name: '24/7 dedicated support', enabled: true },
          { name: 'Custom branding', enabled: true },
          { name: 'API access', enabled: true }
        ],
        limits: {
          properties: 0, // unlimited
          featuredListings: 0, // unlimited
          photos: 0, // unlimited
          videoTours: 0, // unlimited
          videos: 1,
          leadManagement: 'enterprise',
          support: 'dedicated',
          topRated: true,
          verifiedBadge: true,
          posters: 4,
          leads: 30,
          messages: 0, // unlimited
          marketingManager: true,
          commissionBased: true
        },
        isActive: true,
        isPopular: false,
        sortOrder: 5
      }
    ];

    // Create new plans
    for (const planData of plansData) {
      const plan = await Plan.create(planData);
      console.log(`✅ Created plan: ${plan.name} (₹${plan.price}/${plan.billingPeriod})`);
    }

    console.log('\n✨ All subscription plans initialized successfully!');
    console.log('\n📊 Summary:');
    console.log('   • FREE LISTING - ₹0 (5 properties)');
    console.log('   • BASIC PLAN - ₹199 (10 properties + verified badge)');
    console.log('   • STANDARD PLAN - ₹499 (15 properties + 1 poster)');
    console.log('   • PREMIUM PLAN - ₹1999 (Unlimited + 4 posters)');
    console.log('   • ENTERPRISE PLAN - ₹4999 (Unlimited + video + marketing manager)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing plans:', error);
    process.exit(1);
  }
};

initializeSubscriptionPlans();
