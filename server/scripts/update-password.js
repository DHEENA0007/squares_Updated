require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const LoginAttempt = require('../models/LoginAttempt');

const updatePassword = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    const email = 'palawik136@ixospace.com';
    const user = await User.findOne({ email });

    if (!user) {
      console.log('❌ User not found');
      await mongoose.disconnect();
      return;
    }

    console.log('👤 Found:', user.email);

    // Reset login attempts / unlock account
    await LoginAttempt.deleteMany({ email });
    console.log('🔓 Account unlocked (login attempts cleared)');

    const hashedPassword = await bcrypt.hash('Vendor@123', 12);
    user.password = hashedPassword;
    await user.save();

    console.log('✅ Password updated to: Vendor@123');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

updatePassword();
