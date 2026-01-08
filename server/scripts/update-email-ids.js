const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

const emailMappings = [
  {
    oldEmail: 'ddd732443@gmail.com',
    newEmail: 'customer@gmail.com',
    role: 'customer'
  },
  {
    oldEmail: 'admin@ninetyneacres.com',
    newEmail: 'superadmin@ninetyneacres.com',
    role: 'admin'
  },
  {
    oldEmail: 'vendor1@ninetyneacres.com',
    newEmail: 'samplevendor@ninetyneacres.com',
    role: 'vendor'
  },
  {
    oldEmail: 'admin@buildhomemart.com',
    newEmail: 'subadmin@buildhomemart.com',
    role: 'subadmin'
  }
];

async function updateEmailIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    for (const mapping of emailMappings) {
      const user = await User.findOne({ email: mapping.oldEmail });
      
      if (user) {
        console.log(`\n📧 Updating: ${mapping.oldEmail} → ${mapping.newEmail}`);
        console.log(`   Role: ${user.role || 'N/A'}`);
        console.log(`   Name: ${user.profile?.firstName || 'N/A'} ${user.profile?.lastName || ''}`);
        
        const result = await User.updateOne(
          { email: mapping.oldEmail },
          { $set: { email: mapping.newEmail } }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`   ✅ Successfully updated`);
        } else {
          console.log(`   ⚠️  No changes made`);
        }
      } else {
        console.log(`\n❌ User not found: ${mapping.oldEmail}`);
      }
    }

    console.log('\n📊 Verification:');
    for (const mapping of emailMappings) {
      const updatedUser = await User.findOne({ email: mapping.newEmail });
      if (updatedUser) {
        console.log(`✅ ${mapping.newEmail} - exists (${updatedUser.role})`);
      } else {
        console.log(`❌ ${mapping.newEmail} - not found`);
      }
    }

    console.log('\n✨ Email update completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

updateEmailIds();
