require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Role = require('../models/Role');

const createAdminUser = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: 'admin@ninetyneacres.com' },
        { role: 'admin' }
      ]
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:', existingAdmin.email);
      console.log('👤 Admin Details:');
      console.log('   Email:', existingAdmin.email);
      console.log('   Role:', existingAdmin.role);
      console.log('   Status:', existingAdmin.status);
      console.log('   Name:', `${existingAdmin.profile.firstName} ${existingAdmin.profile.lastName}`);
      
      // Update admin user if needed
      if (existingAdmin.status !== 'active') {
        existingAdmin.status = 'active';
        existingAdmin.profile.emailVerified = true;
        await existingAdmin.save();
        console.log('✅ Admin user status updated to active');
      }
      
      await mongoose.disconnect();
      return;
    }

    // First, ensure admin role exists
    console.log('🔄 Checking admin role...');
    let adminRole = await Role.findOne({ name: 'admin' });
    
    if (!adminRole) {
      console.log('📝 Creating admin role...');
      adminRole = await Role.create({
        name: 'admin',
        description: 'Administrator with full system access',
        permissions: [
          'create_property', 'read_property', 'update_property', 'delete_property',
          'manage_users', 'manage_roles', 'manage_plans', 'view_dashboard',
          'manage_settings', 'manage_content', 'send_messages', 'moderate_content',
          'access_analytics'
        ],
        isSystemRole: true,
        isActive: true,
        level: 10
      });
      console.log('✅ Admin role created');
    } else {
      console.log('✅ Admin role already exists');
    }

    // Create admin user
    console.log('📝 Creating admin user...');
    
    const adminUserData = {
      email: 'admin@ninetyneacres.com',
      password: 'Admin@123456', // This will be hashed by the pre-save middleware
      role: 'admin',
      status: 'active',
      profile: {
        firstName: 'Super',
        lastName: 'Admin',
        phone: '+1234567890',
        emailVerified: true,
        bio: 'System Administrator for Ninety Nine Acres Platform',
        address: {
          street: '123 Admin Street',
          city: 'Admin City',
          state: 'Admin State',
          zipCode: '12345',
          country: 'India'
        },
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
    };

    const adminUser = await User.create(adminUserData);

    console.log('🎉 Admin user created successfully!');
    console.log('📋 Admin User Details:');
    console.log('   Email:', adminUser.email);
    console.log('   Password: Admin@123456 (CHANGE THIS IMMEDIATELY!)');
    console.log('   Role:', adminUser.role);
    console.log('   Status:', adminUser.status);
    console.log('   Name:', `${adminUser.profile.firstName} ${adminUser.profile.lastName}`);
    console.log('   ID:', adminUser._id);
    
    console.log('\n🔐 Security Notice:');
    console.log('   - Please change the default password immediately after first login');
    console.log('   - The password is: Admin@123456');
    console.log('   - Login URL: http://localhost:5173/login (or your frontend URL)');
    
    console.log('\n📱 Admin Panel Access:');
    console.log('   - Admin Dashboard: http://localhost:5173/admin/dashboard');
    console.log('   - Users Management: http://localhost:5173/admin/users');
    console.log('   - Roles Management: http://localhost:5173/admin/roles');
    console.log('   - Properties Management: http://localhost:5173/admin/properties');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === 11000) {
      console.log('⚠️  User with this email already exists');
    }
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
};

// Also create some default roles if they don't exist
const createDefaultRoles = async () => {
  try {
    const defaultRoles = [
      {
        name: 'customer',
        description: 'Regular customer with basic property viewing and inquiry capabilities',
        permissions: ['read_property', 'send_messages'],
        isSystemRole: true,
        isActive: true,
        level: 1
      },
      {
        name: 'agent',
        description: 'Property agent who can manage their own listings and interact with customers',
        permissions: ['create_property', 'read_property', 'update_property', 'send_messages', 'access_analytics'],
        isSystemRole: true,
        isActive: true,
        level: 5
      },
      {
        name: 'admin',
        description: 'Administrator with full system access',
        permissions: [
          'create_property', 'read_property', 'update_property', 'delete_property',
          'manage_users', 'manage_roles', 'manage_plans', 'view_dashboard',
          'manage_settings', 'manage_content', 'send_messages', 'moderate_content',
          'access_analytics'
        ],
        isSystemRole: true,
        isActive: true,
        level: 10
      }
    ];

    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      if (!existingRole) {
        await Role.create(roleData);
        console.log(`✅ Created ${roleData.name} role`);
      } else {
        console.log(`ℹ️  ${roleData.name} role already exists`);
      }
    }
  } catch (error) {
    console.error('❌ Error creating default roles:', error.message);
  }
};

const main = async () => {
  console.log('🚀 Starting admin user creation process...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully\n');

    // Create default roles
    console.log('📝 Creating default roles...');
    await createDefaultRoles();
    console.log('');

    // Create admin user
    await createAdminUser();
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🏁 Process completed');
  }
};

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { createAdminUser, createDefaultRoles };
