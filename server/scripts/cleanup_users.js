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

async function cleanupUsers() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Define a simple schema/model to interact with the users collection
        // We don't need the full schema just for deletion, but using the model is standard.
        // However, to be safe and generic, we can access the collection directly via mongoose.connection.db

        const usersCollection = mongoose.connection.db.collection('users');

        // Count users before deletion
        const totalUsers = await usersCollection.countDocuments();
        console.log(`Total users before cleanup: ${totalUsers}`);

        // Delete all users who are NOT superadmin
        // We assume the role field is 'role' and the value is 'superadmin' based on previous output
        const result = await usersCollection.deleteMany({ role: { $ne: 'superadmin' } });

        console.log(`Deleted ${result.deletedCount} users.`);

        // Verify remaining users
        const remainingUsers = await usersCollection.find({}).toArray();
        console.log('Remaining users:');
        remainingUsers.forEach(user => {
            console.log(`- ${user.email} (${user.role})`);
        });

    } catch (error) {
        console.error('Error cleaning up users:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

cleanupUsers();
