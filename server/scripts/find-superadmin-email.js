const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const User = require('../models/User');

const OLD_EMAIL = 'superadmin@ninetyneacres.com';
const NEW_EMAIL = 'admin@buildhomemartsquares.com';

const updateSuperadminEmail = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: OLD_EMAIL });

    if (!user) {
      console.log(`No user found with email: ${OLD_EMAIL}`);
      return;
    }

    console.log(`Found user: ${user.profile?.firstName} ${user.profile?.lastName}`);
    console.log(`Old email: ${user.email}`);

    user.email = NEW_EMAIL;
    await user.save();

    console.log(`Email updated to: ${NEW_EMAIL}`);
    console.log('Update successful!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

updateSuperadminEmail();
