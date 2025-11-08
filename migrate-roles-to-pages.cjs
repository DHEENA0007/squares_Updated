const mongoose = require('mongoose');
require('dotenv').config();

const Role = require('./server/models/Role');

const ROLE_PAGES_MAPPING = {
  'superadmin': [
    'dashboard',
    'users',
    'vendor_approvals',
    'messages',
    'roles',
    'clients',
    'properties',
    'plans',
    'addons',
    'privacy_policy',
    'refund_policy'
  ],
  'subadmin': [
    'subadmin_dashboard',
    'property_reviews',
    'property_rejections',
    'content_moderation',
    'support_tickets',
    'vendor_performance',
    'addon_services',
    'notifications',
    'reports',
    'subadmin_privacy_policy',
    'subadmin_refund_policy'
  ],
  'agent': [
    'vendor_dashboard',
    'vendor_properties',
    'vendor_add_property',
    'vendor_leads',
    'vendor_messages',
    'vendor_analytics',
    'vendor_services',
    'vendor_subscription',
    'vendor_billing',
    'vendor_reviews',
    'vendor_profile'
  ],
  'customer': [
    'customer_dashboard',
    'customer_search',
    'customer_favorites',
    'customer_compare',
    'customer_owned_properties',
    'customer_messages',
    'customer_services',
    'customer_reviews',
    'customer_profile',
    'customer_settings'
  ]
};

async function migrateRolesToPages() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔄 Starting role migration to page-based system...\n');

    // Get all roles
    const roles = await Role.find();
    console.log(`📋 Found ${roles.length} roles to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const role of roles) {
      const roleName = role.name.toLowerCase();
      
      // Check if role already has pages
      if (role.pages && role.pages.length > 0) {
        console.log(`⏭️  Skipping "${role.name}" - already has pages configured`);
        skippedCount++;
        continue;
      }

      // Get pages for this role
      const pages = ROLE_PAGES_MAPPING[roleName];
      
      if (!pages) {
        console.log(`⚠️  No page mapping found for role: ${role.name}`);
        continue;
      }

      // Update role with pages
      role.pages = pages;
      
      // Remove permissions field if it exists
      if (role.permissions) {
        role.permissions = undefined;
      }
      
      await role.save();
      
      console.log(`✅ Migrated "${role.name}" - Added ${pages.length} pages`);
      migratedCount++;
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount} roles`);
    console.log(`   ⏭️  Skipped: ${skippedCount} roles`);
    console.log(`   📋 Total: ${roles.length} roles`);

    console.log('\n✨ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Run migration
migrateRolesToPages();
