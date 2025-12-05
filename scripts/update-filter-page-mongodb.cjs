// MongoDB Script to update role pages from 'configuration' to 'filter'
// Run this script using: node scripts/update-filter-page-mongodb.cjs

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

async function updateFilterPage() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Update users collection - replace 'configuration' with 'filter' in rolePages array
    const usersResult = await db.collection('users').updateMany(
      {
        role: { $in: ['superadmin', 'admin'] },
        rolePages: 'configuration'
      },
      {
        $set: { 'rolePages.$[elem]': 'filter' }
      },
      {
        arrayFilters: [{ 'elem': 'configuration' }]
      }
    );
    console.log(`Updated ${usersResult.modifiedCount} users with 'configuration' → 'filter'`);

    // Add 'filter' to users who don't have it yet
    const addFilterResult = await db.collection('users').updateMany(
      {
        role: { $in: ['superadmin', 'admin'] },
        rolePages: { $ne: 'filter', $exists: true }
      },
      {
        $addToSet: { rolePages: 'filter' }
      }
    );
    console.log(`Added 'filter' page to ${addFilterResult.modifiedCount} users`);

    // If you have a roles collection, update it too
    const rolesResult = await db.collection('roles').updateMany(
      {
        name: { $in: ['SuperAdmin', 'Admin'] },
        pages: 'configuration'
      },
      {
        $set: { 'pages.$[elem]': 'filter' }
      },
      {
        arrayFilters: [{ 'elem': 'configuration' }]
      }
    );
    console.log(`Updated ${rolesResult.modifiedCount} roles with 'configuration' → 'filter'`);

    // Add 'filter' to roles who don't have it yet
    const addFilterRolesResult = await db.collection('roles').updateMany(
      {
        name: { $in: ['SuperAdmin', 'Admin'] },
        pages: { $ne: 'filter', $exists: true }
      },
      {
        $addToSet: { pages: 'filter' }
      }
    );
    console.log(`Added 'filter' page to ${addFilterRolesResult.modifiedCount} roles`);

    console.log('\n✓ Migration completed successfully!');
    console.log('\nNote: Superadmins automatically see all admin pages in the frontend.');
    console.log('If the Filter page still doesn\'t appear, try:');
    console.log('1. Clear browser cache and refresh');
    console.log('2. Log out and log back in');
    console.log('3. Check browser console for errors');

  } catch (error) {
    console.error('Error updating filter page:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

updateFilterPage();
