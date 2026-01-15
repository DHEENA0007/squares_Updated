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

async function dryRunCleanup() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('DRY RUN: Checking data to be cleared (Properties, Vendors, User Activity)...');
        console.log('------------------------------------------------');

        let totalDocsToDelete = 0;

        for (const collectionName of COLLECTIONS_TO_CLEAR) {
            try {
                const collection = mongoose.connection.db.collection(collectionName);
                const count = await collection.countDocuments();

                if (count > 0) {
                    console.log(`[WOULD DELETE] ${collectionName}: ${count} documents`);
                    totalDocsToDelete += count;
                } else {
                    console.log(`[EMPTY] ${collectionName}`);
                }
            } catch (err) {
                console.log(`[SKIP] ${collectionName}: ${err.message}`);
            }
        }

        console.log('------------------------------------------------');
        console.log(`Total documents that WOULD be deleted: ${totalDocsToDelete}`);
        console.log('------------------------------------------------');
        console.log('The following application configuration data would be PRESERVED:');
        console.log('- Users (Superadmin only)');
        console.log('- Roles');
        console.log('- Settings (Global, Hero, etc.)');
        console.log('- Property Types & Fields');
        console.log('- Amenities');
        console.log('- Plans & Policies');
        console.log('- Navigation Items');

    } catch (error) {
        console.error('Error during dry run:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

dryRunCleanup();
