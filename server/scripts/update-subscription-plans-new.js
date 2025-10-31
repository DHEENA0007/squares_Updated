const mongoose = require('mongoose');
require('dotenv').config();
const Plan = require('../models/Plan');

const updateSubscriptionPlans = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete existing plans to start fresh
    await Plan.deleteMany({});
    console.log('Cleared existing plans');

    // Define the new subscription plans according to your requirements
    const plansData = [
      {
        identifier: 'free',
        name: 'FREE LISTING',
        description: '5 Properties/Products - Basic listing',
        price: 0,
        currency: 'INR',
        billingPeriod: 'monthly',
        features: [
          '5 Property listings',
          'Basic property details',
          'Standard visibility',
          'Email support'
        ],
        limits: {
          properties: 5,
          featuredListings: 0,
          photos: 10,
          videoTours: 0,
          leadManagement: 'basic',
          support: 'email',
          topRated: false,
          verifiedBadge: false,
          posters: 0,
          leads: 0
        },
        isActive: true,
        isPopular: false,
        sortOrder: 1
      },
      {
        identifier: 'basic',
        name: 'BASIC PLAN',
        description: '10 Properties + Top Rated + Verified Owner Badge',
        price: 199,
        currency: 'INR',
        billingPeriod: 'monthly',
        features: [
          '10 Property listings',
          'Top Rated in Website',
          'Verified Owner Badge',
          'Priority email support',
          'Enhanced visibility'
        ],
        limits: {
          properties: 10,
          featuredListings: 2,
          photos: 15,
          videoTours: 0,
          leadManagement: 'basic',
          support: 'email',
          topRated: true,
          verifiedBadge: true,
          posters: 0,
          leads: 5
        },
        isActive: true,
        isPopular: true,
        sortOrder: 2
      },
      {
        identifier: 'standard',
        name: 'STANDARD PLAN',
        description: '15 Properties + Benefits + 1 Poster with 6 leads',
        price: 499,
        currency: 'INR',
        billingPeriod: 'monthly',
        features: [
          '15 Property listings',
          'Top Rated in Website',
          'Verified Owner Badge',
          '1 Poster with 6 leads',
          'Priority support',
          'Enhanced marketing'
        ],
        limits: {
          properties: 15,
          featuredListings: 3,
          photos: 20,
          videoTours: 1,
          leadManagement: 'advanced',
          support: 'priority',
          topRated: true,
          verifiedBadge: true,
          posters: 1,
          leads: 6
        },
        isActive: true,
        isPopular: false,
        sortOrder: 3
      },
      {
        identifier: 'premium',
        name: 'PREMIUM PLAN',
        description: 'Unlimited Properties + 4 Posters with 20 leads',
        price: 1999,
        currency: 'INR',
        billingPeriod: 'monthly',
        features: [
          'Unlimited Property listings',
          'Top Rated in Website',
          'Verified Owner Badge',
          '4 Posters with 20 leads',
          'Priority phone & email support',
          'Advanced analytics',
          'Featured listings'
        ],
        limits: {
          properties: 0, // 0 means unlimited
          featuredListings: 10,
          photos: 30,
          videoTours: 3,
          leadManagement: 'premium',
          support: 'phone',
          topRated: true,
          verifiedBadge: true,
          posters: 4,
          leads: 20
        },
        isActive: true,
        isPopular: false,
        sortOrder: 4
      },
      {
        identifier: 'enterprise',
        name: 'ENTERPRISE PLAN',
        description: 'Unlimited + Videos + 30+ leads + Marketing Manager',
        price: 4999,
        currency: 'INR',
        billingPeriod: 'monthly',
        features: [
          'Unlimited Property listings',
          'Top Rated in Website',
          'Verified Owner Badge',
          '4 Posters & 1 Video with 30+ leads',
          'Consultation with Marketing Manager',
          'Commission based revenue',
          '24/7 dedicated support',
          'Custom branding',
          'API access'
        ],
        limits: {
          properties: 0, // unlimited
          featuredListings: 0, // unlimited
          photos: 0, // unlimited
          videoTours: 0, // unlimited
          leadManagement: 'enterprise',
          support: 'dedicated',
          topRated: true,
          verifiedBadge: true,
          posters: 4,
          videos: 1,
          leads: 30,
          marketingManager: true
        },
        isActive: true,
        isPopular: false,
        sortOrder: 5
      }
    ];

    // Create new plans
    for (const planData of plansData) {
      await Plan.create(planData);
      console.log(`✓ Created plan: ${planData.name} - ₹${planData.price}`);
    }

    console.log('\n🎉 Successfully updated all subscription plans!');
    
    // Display summary
    console.log('\n📋 Plan Summary:');
    console.log('1. FREE LISTING - ₹0 (5 properties)');
    console.log('2. BASIC PLAN - ₹199 (10 properties + top rated + verified badge)');
    console.log('3. STANDARD PLAN - ₹499 (15 properties + 1 poster + 6 leads)');
    console.log('4. PREMIUM PLAN - ₹1999 (unlimited + 4 posters + 20 leads)');
    console.log('5. ENTERPRISE PLAN - ₹4999 (unlimited + videos + marketing manager + 30+ leads)');
    
  } catch (error) {
    console.error('Error updating plans:', error);
  } finally {
    mongoose.connection.close();
  }
};

updateSubscriptionPlans();
