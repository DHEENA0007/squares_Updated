const mongoose = require('mongoose');
require('dotenv').config();

const Role = require('./models/Role');

async function updateSubadminRole() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find subadmin role
    const subadminRole = await Role.findOne({ name: 'subadmin' });
    
    if (!subadminRole) {
      console.log('❌ Subadmin role not found');
      return;
    }

    console.log('\n📋 Current Subadmin Role Pages:');
    subadminRole.pages.forEach((page, index) => {
      console.log(`   ${index + 1}. ${page}`);
    });

    // Add the missing policy pages
    const pagesToAdd = [];
    
    if (!subadminRole.pages.includes('subadmin_privacy_policy')) {
      pagesToAdd.push('subadmin_privacy_policy');
    }
    
    if (!subadminRole.pages.includes('subadmin_refund_policy')) {
      pagesToAdd.push('subadmin_refund_policy');
    }

    if (pagesToAdd.length > 0) {
      console.log(`\n➕ Adding ${pagesToAdd.length} missing pages:`);
      pagesToAdd.forEach(page => {
        console.log(`   - ${page}`);
        subadminRole.pages.push(page);
      });

      // Save the updated role
      await subadminRole.save();
      console.log('\n✅ Subadmin role updated successfully!');
      
      console.log('\n📋 Updated Subadmin Role Pages:');
      subadminRole.pages.forEach((page, index) => {
        console.log(`   ${index + 1}. ${page}`);
      });
    } else {
      console.log('\n✅ All required pages already exist');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

updateSubadminRole();
