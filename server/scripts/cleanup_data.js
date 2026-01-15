const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env file');
    process.exit(1);
}

// Collections to clear (User data, Properties, Vendors, Activity logs)
const COLLECTIONS_TO_CLEAR = [
    'properties',
    'vendors',
    'vendorprofiles',
    'vendorservices',
    'favorites',
    'propertyviews',
    'pagevisits',
    'loginattempts',
    'messages',
    'notifications',
    'usernotifications',
    'supporttickets',
    'reviews',
    'servicebookings',
    'subscriptions',
    'payments',
    'promotionrequests',
    'chatbotconversations',
    'airecommendations',
    'contentreports',
    'twofactorauths',
    'addonserviceschedules'
];

async function cleanupData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('Starting cleanup of properties, vendor data, and user activity logs...');
        console.log('------------------------------------------------');

        for (const collectionName of COLLECTIONS_TO_CLEAR) {
            try {
                const collection = mongoose.connection.db.collection(collectionName);
                const countBefore = await collection.countDocuments();

                if (countBefore > 0) {
                    await collection.deleteMany({});
                    console.log(`✅ Cleared ${collectionName}: Removed ${countBefore} documents.`);
                } else {
                    console.log(`⚪ ${collectionName} was already empty.`);
                }
            } catch (err) {
                // Some collections might not exist, which is fine
                console.log(`⚠️  Skipping ${collectionName}: ${err.message}`);
            }
        }

        console.log('------------------------------------------------');
        console.log('Cleanup completed successfully.');
        console.log('The following application configuration data was PRESERVED:');
        console.log('- Users (Superadmin only)');
        console.log('- Roles');
        console.log('- Settings (Global, Hero, etc.)');
        console.log('- Property Types & Fields');
        console.log('- Amenities');
        console.log('- Plans & Policies');
        console.log('- Navigation Items');

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

cleanupData();
