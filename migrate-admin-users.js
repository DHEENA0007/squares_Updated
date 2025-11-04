const mongoose = require('mongoose');
const User = require('./models/User');

// Migration script to convert existing admin users to superadmin
const migrateAdminUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ninety-nine-acres');
    
    console.log('Connected to MongoDB');
    
    // Find all users with 'admin' role
    const adminUsers = await User.find({ role: 'admin' });
    
    console.log(`Found ${adminUsers.length} admin users to migrate`);
    
    // Update all admin users to superadmin
    const result = await User.updateMany(
      { role: 'admin' },
      { role: 'superadmin' }
    );
    
    console.log(`Updated ${result.modifiedCount} users to superadmin role`);
    
    // Verify the migration
    const superAdmins = await User.find({ role: 'superadmin' });
    const remainingAdmins = await User.find({ role: 'admin' });
    
    console.log(`Current superadmin users: ${superAdmins.length}`);
    console.log(`Remaining admin users: ${remainingAdmins.length}`);
    
    if (superAdmins.length > 0) {
      console.log('\nSuperadmin users:');
      superAdmins.forEach(user => {
        console.log(`- ${user.email} (${user.profile.firstName} ${user.profile.lastName})`);
      });
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the migration
if (require.main === module) {
  migrateAdminUsers();
}

module.exports = migrateAdminUsers;
