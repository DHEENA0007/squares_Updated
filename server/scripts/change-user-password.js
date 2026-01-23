const mongoose = require('mongoose');
require('dotenv').config();

const changeUserPassword = async () => {
  const email = 'hello@akodefy.com';
  const newPassword = 'Arunv@ni11';
  
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ninety-nine-acres');
    console.log('✅ Connected to database\n');

    const User = require('../models/User');

    console.log(`📧 Finding user with email: ${email}\n`);

    const user = await User.findOne({ email: email });
    
    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      await mongoose.disconnect();
      return;
    }

    console.log(`👤 Found user: ${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Role: ${user.role}`);

    // Set plain password - User model pre-save middleware will hash it
    user.password = newPassword;
    await user.save();

    console.log('\n✅ Password updated successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   New Password: ${newPassword}`);

    await mongoose.disconnect();
    console.log('\n✅ Script completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

changeUserPassword();
