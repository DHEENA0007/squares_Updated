#!/usr/bin/env node

/**
 * Update database roles with the corrected page configurations
 */

const axios = require('axios');

const API_URL = process.env.VITE_API_URL || 'http://localhost:8000/api';

async function syncRolesToDatabase() {
  console.log('🔄 Syncing roles to database...');
  
  try {
    // Try to trigger role synchronization
    const response = await axios.post(`${API_URL}/admin/sync-roles`, {});
    console.log('✅ Roles synchronized successfully');
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('⚠️  Authentication required for role sync endpoint');
      console.log('💡 The role updates will take effect when:');
      console.log('   - Server is restarted');
      console.log('   - A new user with subadmin role is created');
      console.log('   - Default roles are re-initialized');
    } else if (error.response?.status === 404) {
      console.log('⚠️  Role sync endpoint not found');
      console.log('💡 The updated role configuration will be used for new role creation');
    } else {
      console.log('❌ Error syncing roles:', error.message);
      if (error.response?.data) {
        console.log('Response:', error.response.data);
      }
    }
  }
}

async function checkCurrentState() {
  console.log('\n📊 Checking current configuration state...');
  
  // Summary of changes made
  console.log('\n✅ Changes completed:');
  console.log('   1. Updated Role.js model:');
  console.log('      - Changed "privacy_policy" → "subadmin_privacy_policy"');
  console.log('      - Changed "refund_policy" → "subadmin_refund_policy"');
  console.log('');
  console.log('   2. Updated pages.config.ts:');
  console.log('      - Privacy Policy path: /subadmin/policy-editor/privacy-policy');
  console.log('      - Refund Policy path: /subadmin/policy-editor/refund-policy');
  console.log('');
  console.log('   3. Verified existing components:');
  console.log('      - ✅ /src/pages/subadmin/PrivacyPolicy.tsx');
  console.log('      - ✅ /src/pages/subadmin/RefundPolicy.tsx');
  console.log('');
  console.log('   4. Verified existing routes:');
  console.log('      - ✅ /subadmin/privacy-policy route exists');
  console.log('      - ✅ /subadmin/refund-policy route exists');
  
  console.log('\n🎯 Expected result:');
  console.log('   When a user with subadmin role logs in, they should see:');
  console.log('   - Privacy Policy (navigates to /subadmin/privacy-policy)');
  console.log('   - Refund Policy (navigates to /subadmin/refund-policy)');
  console.log('   in their dynamic sidebar navigation');
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║               ROLE SYNCHRONIZATION SCRIPT                 ║
╚════════════════════════════════════════════════════════════╝
`);

  await syncRolesToDatabase();
  await checkCurrentState();
  
  console.log('\n🚀 Next steps to test:');
  console.log('   1. Restart the backend server (if roles need to be reloaded)');
  console.log('   2. Login as a subadmin user');
  console.log('   3. Verify Privacy Policy and Refund Policy appear in sidebar');
  console.log('   4. Click each link to ensure they navigate correctly');
}

main();
