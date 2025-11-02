const mongoose = require('mongoose');
const AddonService = require('../models/AddonService');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/squares');

const addonData = [
  {
    name: 'Professional Photography',
    description: 'High-quality property photography service with professional equipment and editing',
    price: 2999,
    currency: 'INR',
    billingType: 'per_property',
    category: 'photography',
    icon: 'camera',
    isActive: true,
    sortOrder: 1
  },
  {
    name: 'Virtual Tours',
    description: '360° virtual property tours for immersive viewing experience',
    price: 4999,
    currency: 'INR',
    billingType: 'per_property',
    category: 'technology',
    icon: 'view-360',
    isActive: true,
    sortOrder: 2
  },
  {
    name: 'Social Media Marketing',
    description: 'Promote your listings across social media platforms',
    price: 1999,
    currency: 'INR',
    billingType: 'monthly',
    category: 'marketing',
    icon: 'share',
    isActive: true,
    sortOrder: 3
  },
  {
    name: 'Property Video Creation',
    description: 'Professional property showcase videos with drone footage',
    price: 3999,
    currency: 'INR',
    billingType: 'per_property',
    category: 'photography',
    icon: 'video',
    isActive: true,
    sortOrder: 4
  },
  {
    name: 'SEO Optimization',
    description: 'Enhanced search engine visibility for your listings',
    price: 1499,
    currency: 'INR',
    billingType: 'monthly',
    category: 'marketing',
    icon: 'search',
    isActive: true,
    sortOrder: 5
  },
  {
    name: 'CRM Integration',
    description: 'Advanced customer relationship management tools',
    price: 999,
    currency: 'INR',
    billingType: 'monthly',
    category: 'crm',
    icon: 'users',
    isActive: true,
    sortOrder: 6
  },
  {
    name: 'Priority Support',
    description: '24/7 priority customer support and dedicated account manager',
    price: 2499,
    currency: 'INR',
    billingType: 'monthly',
    category: 'support',
    icon: 'headphones',
    isActive: true,
    sortOrder: 7
  }
];

async function populateAddons() {
  try {
    // Clear existing addons
    await AddonService.deleteMany({});
    
    // Insert new addon data
    await AddonService.insertMany(addonData);
    
    console.log('✅ Addon services populated successfully!');
    console.log(`📊 Created ${addonData.length} addon services`);
    
    // Display created addons
    const addons = await AddonService.find({}).sort({ sortOrder: 1 });
    console.log('\n📝 Created Addon Services:');
    addons.forEach(addon => {
      console.log(`  - ${addon.name}: ₹${addon.price} (${addon.billingType})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating addon data:', error);
    process.exit(1);
  }
}

populateAddons();
