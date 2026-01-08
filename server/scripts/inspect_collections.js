require('dotenv').config({ path: '../.env' });
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');

const inspect = async () => {
    try {
        await connectDB();
        console.log('Connected to database');

        const chatbotConversations = await mongoose.connection.db.collection('chatbotconversations').findOne({});
        console.log('\n=== ChatbotConversation Sample ===');
        console.log(JSON.stringify(chatbotConversations, null, 2));

        const vendorProfile = await mongoose.connection.db.collection('vendorprofiles').findOne({});
        console.log('\n=== VendorProfile Sample ===');
        console.log(JSON.stringify(vendorProfile, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Inspection failed:', error);
        process.exit(1);
    }
};

inspect();
