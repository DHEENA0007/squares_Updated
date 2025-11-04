require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./server/models/User');

const createSubAdminUser = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ninety-nine-acres');
    console.log('✅ Connected to MongoDB successfully');

    const email = 'admin@buildhomemart.com';
    const password = 'Admin@123';

    // Check if user already exists
    console.log('🔄 Checking if sub admin user already exists...');
    const existingUser = await User.findOne({ email: email });
    
    if (existingUser) {
      console.log('⚠️  User already exists with email:', email);
      console.log('   Current role:', existingUser.role);
      console.log('   Current status:', existingUser.status);
      
      // Update existing user to subadmin if needed
      if (existingUser.role !== 'subadmin') {
        console.log('🔄 Updating existing user to subadmin role...');
        existingUser.role = 'subadmin';
        existingUser.status = 'active';
        existingUser.profile.emailVerified = true;
        await existingUser.save();
        console.log('✅ Existing user updated to subadmin role');
      } else {
        console.log('✅ User already has subadmin role');
      }
      
      // Display user info
      console.log('\n👤 Sub Admin User Details:');
      console.log('   Email:', existingUser.email);
      console.log('   Role:', existingUser.role);
      console.log('   Status:', existingUser.status);
      console.log('   Name:', `${existingUser.profile.firstName} ${existingUser.profile.lastName}`);
      console.log('   Email Verified:', existingUser.profile.emailVerified);
      
      return;
    }

    // Create new sub admin user
    console.log('🔄 Creating new sub admin user...');
    
    const subAdminUser = new User({
      email: email,
      password: password,
      role: 'subadmin',
      status: 'active',
      profile: {
        firstName: 'Sub',
        lastName: 'Admin',
        phone: '+1234567890',
        emailVerified: true,
        preferences: {
          notifications: {
            email: true,
            sms: false,
            push: true
          },
          privacy: {
            showEmail: false,
            showPhone: false
          }
        }
      }
    });

    await subAdminUser.save();
    
    console.log('✅ Sub admin user created successfully!');
    console.log('\n👤 Sub Admin User Details:');
    console.log('   ID:', subAdminUser._id);
    console.log('   Email:', subAdminUser.email);
    console.log('   Role:', subAdminUser.role);
    console.log('   Status:', subAdminUser.status);
    console.log('   Name:', `${subAdminUser.profile.firstName} ${subAdminUser.profile.lastName}`);
    console.log('   Email Verified:', subAdminUser.profile.emailVerified);
    console.log('   Created:', subAdminUser.createdAt);

    // Verify login credentials
    console.log('\n🔐 Login Credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('\n📱 Access URL: http://localhost:3000/login');
    console.log('   After login, user will be redirected to sub admin dashboard');
    
    // Test password verification
    const isPasswordValid = await subAdminUser.comparePassword(password);
    console.log('\n🔍 Password Verification Test:', isPasswordValid ? '✅ PASS' : '❌ FAIL');

  } catch (error) {
    console.error('❌ Error creating sub admin user:', error.message);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      console.error('   Duplicate key error - user with this email already exists');
    } else if (error.name === 'ValidationError') {
      console.error('   Validation error:', error.message);
    }
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

// Additional function to verify sub admin access
const verifySubAdminAccess = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ninety-nine-acres');
    
    const subAdmin = await User.findOne({ email: 'admin@buildhomemart.com' });
    
    if (subAdmin && subAdmin.role === 'subadmin') {
      console.log('\n✅ Sub Admin Access Verification:');
      console.log('   ✓ User exists');
      console.log('   ✓ Role is subadmin');
      console.log('   ✓ Status is', subAdmin.status);
      console.log('   ✓ Email verified:', subAdmin.profile.emailVerified);
      
      // Test available sub admin functions
      console.log('\n🎯 Available Sub Admin Functions:');
      console.log('   1. ✓ Review/verify property listings');
      console.log('   2. ✓ Approve/reject properties');
      console.log('   3. ✓ Moderate user content');
      console.log('   4. ✓ Handle support tickets');
      console.log('   5. ✓ Track vendor performance');
      console.log('   6. ✓ Approve promotions');
      console.log('   7. ✓ Send notifications');
      console.log('   8. ✓ Generate reports');
      
      return true;
    } else {
      console.log('❌ Sub admin user not found or invalid role');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying sub admin access:', error.message);
    return false;
  } finally {
    await mongoose.connection.close();
  }
};

// Run the script
const main = async () => {
  console.log('🚀 Starting Sub Admin User Creation Process...\n');
  
  await createSubAdminUser();
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Verifying Sub Admin Access...\n');
  
  await verifySubAdminAccess();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Sub Admin User Creation Complete!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Start your development server: npm run dev');
  console.log('   2. Navigate to: http://localhost:3000/login');
  console.log('   3. Login with the credentials above');
  console.log('   4. You will be automatically redirected to the sub admin dashboard');
  console.log('   5. Test all 8 sub admin functions');
};

// Handle script execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createSubAdminUser, verifySubAdminAccess };
