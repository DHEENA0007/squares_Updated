const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { FilterConfiguration, NavigationItem } = require('../models/Configuration');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI is not defined in .env file');
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const fixBuyValue = async () => {
    await connectDB();
    console.log('Fixing Buy listing type value...');

    // 1. Fix FilterConfiguration
    // Remove 'buy' if it exists
    await FilterConfiguration.deleteOne({ filterType: 'listing_type', value: 'buy' });
    
    // Ensure 'sale' exists with name 'Buy'
    await FilterConfiguration.findOneAndUpdate(
        { filterType: 'listing_type', value: 'sale' },
        { 
            filterType: 'listing_type', 
            name: 'Buy', 
            value: 'sale', 
            displayLabel: 'Buy', 
            displayOrder: 1, 
            isActive: true 
        },
        { upsert: true }
    );
    console.log("Updated Listing Type 'Buy' to have value 'sale'.");

    // 2. Fix NavigationItems
    const result = await NavigationItem.updateMany(
        { parentId: 'buy' },
        { $set: { parentId: 'sale' } }
    );
    console.log(`Updated ${result.modifiedCount} navigation items from parentId 'buy' to 'sale'.`);

    process.exit(0);
};

fixBuyValue();
