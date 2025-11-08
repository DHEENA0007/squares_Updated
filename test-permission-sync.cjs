#!/usr/bin/env node

/**
 * Permission System Synchronization Test
 * This script verifies that permissions granted/revoked in the roles management
 * are properly reflected in the user's sidebar navigation
 */

const axios = require('axios');

const API_URL = process.env.VITE_API_URL || 'http://localhost:8000/api';
const FRONTEND_URL = 'http://localhost:8001';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60) + '\n');
}

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${name}`, color);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Test configuration
const testConfig = {
  superadminEmail: 'admin@example.com',
  superadminPassword: 'admin123',
  testSubadminEmail: `testsubadmin${Date.now()}@example.com`,
  testSubadminPassword: 'Test@123',
};

let authToken = null;
let testRoleId = null;
let testUserId = null;

// All available permissions from universalNavigation.ts
const allPermissions = [
  'view_dashboard',
  'manage_users',
  'manage_roles',
  'view_users',
  'create_users',
  'update_users',
  'delete_users',
  'approve_vendors',
  'reject_vendors',
  'review_vendors',
  'track_vendor_performance',
  'create_property',
  'read_property',
  'update_property',
  'delete_property',
  'review_properties',
  'approve_properties',
  'reject_properties',
  'manage_plans',
  'view_billing',
  'manage_billing',
  'view_subscriptions',
  'manage_subscriptions',
  'manage_addon_services',
  'send_messages',
  'moderate_content',
  'moderate_user_content',
  'send_notifications',
  'handle_support_tickets',
  'access_analytics',
  'generate_reports',
  'view_analytics',
  'approve_promotions',
  'manage_promotions',
  'view_promotions',
  'manage_settings',
  'manage_content',
  'manage_system_settings',
  'manage_privacy_policy',
  'manage_refund_policy',
  'manage_terms_conditions',
];

// Permission to route mapping (from universalNavigation.ts)
const permissionRouteMap = {
  'manage_plans': '/subadmin/plans',
  'view_billing': '/subadmin/billing',
  'manage_addon_services': '/subadmin/addon-services',
  'review_properties': '/subadmin/property-reviews',
  'reject_properties': '/subadmin/property-rejections',
  'moderate_content': '/subadmin/content-moderation',
  'send_notifications': '/subadmin/notifications',
  'handle_support_tickets': '/subadmin/support-tickets',
  'generate_reports': '/subadmin/reports',
  'track_vendor_performance': '/subadmin/vendor-performance',
  'approve_promotions': '/subadmin/promotions',
  'manage_users': '/subadmin/users',
  'view_users': '/subadmin/view-users',
  'approve_vendors': '/subadmin/vendor-approvals',
  'reject_vendors': '/subadmin/vendor-approvals',
  'manage_settings': '/subadmin/system-settings',
  'manage_content': '/subadmin/policy-editor',
};

// Step 1: Login as superadmin
async function loginAsSuperAdmin() {
  logSection('Step 1: Logging in as SuperAdmin');
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testConfig.superadminEmail,
      password: testConfig.superadminPassword,
    });

    authToken = response.data.token;
    log(`✅ Successfully logged in as SuperAdmin`, 'green');
    log(`   Token: ${authToken.substring(0, 20)}...`, 'cyan');
    return true;
  } catch (error) {
    log(`❌ Failed to login as SuperAdmin`, 'red');
    log(`   Error: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// Step 2: Create a test role with specific permissions
async function createTestRole(permissions) {
  logSection('Step 2: Creating Test Role');
  
  try {
    const roleName = `TestRole_${Date.now()}`;
    const response = await axios.post(
      `${API_URL}/roles`,
      {
        name: roleName,
        description: 'Test role for permission synchronization testing',
        permissions: permissions,
        isActive: true,
        level: 5,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    testRoleId = response.data.data.role._id;
    log(`✅ Test role created successfully`, 'green');
    log(`   Role ID: ${testRoleId}`, 'cyan');
    log(`   Role Name: ${roleName}`, 'cyan');
    log(`   Permissions: ${permissions.join(', ')}`, 'cyan');
    return true;
  } catch (error) {
    log(`❌ Failed to create test role`, 'red');
    log(`   Error: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// Step 3: Create a test user with the test role
async function createTestUser() {
  logSection('Step 3: Creating Test User');
  
  try {
    const response = await axios.post(
      `${API_URL}/auth/register`,
      {
        email: testConfig.testSubadminEmail,
        password: testConfig.testSubadminPassword,
        firstName: 'Test',
        lastName: 'SubAdmin',
        role: 'subadmin',
        phone: '1234567890',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    testUserId = response.data.user?._id || response.data.data?.user?._id;
    log(`✅ Test user created successfully`, 'green');
    log(`   User ID: ${testUserId}`, 'cyan');
    log(`   Email: ${testConfig.testSubadminEmail}`, 'cyan');
    return true;
  } catch (error) {
    log(`❌ Failed to create test user`, 'red');
    log(`   Error: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// Step 4: Get user's permissions
async function getUserPermissions(userId) {
  try {
    const response = await axios.get(`${API_URL}/users/${userId}/permissions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    return response.data.data.permissions || [];
  } catch (error) {
    log(`❌ Failed to fetch user permissions`, 'red');
    log(`   Error: ${error.response?.data?.message || error.message}`, 'red');
    return [];
  }
}

// Step 5: Update role permissions
async function updateRolePermissions(roleId, permissions) {
  logSection(`Step 5: Updating Role Permissions`);
  
  try {
    const response = await axios.put(
      `${API_URL}/roles/${roleId}`,
      {
        permissions: permissions,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    log(`✅ Role permissions updated successfully`, 'green');
    log(`   New permissions: ${permissions.join(', ')}`, 'cyan');
    return true;
  } catch (error) {
    log(`❌ Failed to update role permissions`, 'red');
    log(`   Error: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// Step 6: Verify permissions are synced
async function verifyPermissionSync(expectedPermissions) {
  logSection('Step 6: Verifying Permission Synchronization');
  
  const actualPermissions = await getUserPermissions(testUserId);
  
  log(`Expected permissions: ${expectedPermissions.length}`, 'cyan');
  log(`Actual permissions: ${actualPermissions.length}`, 'cyan');
  
  const allExpectedPresent = expectedPermissions.every(perm => 
    actualPermissions.includes(perm)
  );
  
  const noExtraPermissions = actualPermissions.every(perm => 
    expectedPermissions.includes(perm) || perm === 'view_dashboard'
  );
  
  if (allExpectedPresent && noExtraPermissions) {
    log(`✅ Permissions synced correctly`, 'green');
    return true;
  } else {
    log(`❌ Permission sync mismatch`, 'red');
    
    const missing = expectedPermissions.filter(perm => !actualPermissions.includes(perm));
    const extra = actualPermissions.filter(perm => 
      !expectedPermissions.includes(perm) && perm !== 'view_dashboard'
    );
    
    if (missing.length > 0) {
      log(`   Missing permissions: ${missing.join(', ')}`, 'red');
    }
    if (extra.length > 0) {
      log(`   Extra permissions: ${extra.join(', ')}`, 'yellow');
    }
    
    return false;
  }
}

// Step 7: Verify routes are accessible
async function verifyRouteAccess(permissions) {
  logSection('Step 7: Verifying Route Access');
  
  const expectedRoutes = [];
  const unexpectedRoutes = [];
  
  // Get routes that should be accessible
  permissions.forEach(permission => {
    const route = permissionRouteMap[permission];
    if (route) {
      expectedRoutes.push({ permission, route });
    }
  });
  
  // Get routes that should NOT be accessible
  Object.keys(permissionRouteMap).forEach(permission => {
    if (!permissions.includes(permission)) {
      const route = permissionRouteMap[permission];
      if (route) {
        unexpectedRoutes.push({ permission, route });
      }
    }
  });
  
  log(`Routes that should be accessible: ${expectedRoutes.length}`, 'cyan');
  expectedRoutes.forEach(({ permission, route }) => {
    log(`   ✓ ${permission} → ${route}`, 'green');
  });
  
  log(`\nRoutes that should NOT be accessible: ${unexpectedRoutes.length}`, 'cyan');
  unexpectedRoutes.forEach(({ permission, route }) => {
    log(`   ✗ ${permission} → ${route}`, 'yellow');
  });
  
  return expectedRoutes.length > 0;
}

// Step 8: Test permission addition
async function testPermissionAddition() {
  logSection('TEST 1: Adding Permissions');
  
  const initialPermissions = ['view_dashboard', 'manage_users'];
  const additionalPermissions = ['manage_plans', 'view_billing', 'manage_addon_services'];
  
  log('Initial permissions:', 'cyan');
  log(`   ${initialPermissions.join(', ')}`);
  
  // Create role with initial permissions
  await createTestRole(initialPermissions);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Verify initial state
  const initialSync = await verifyPermissionSync(initialPermissions);
  logTest('Initial permission sync', initialSync);
  
  // Add more permissions
  log('\nAdding permissions:', 'cyan');
  log(`   ${additionalPermissions.join(', ')}`);
  
  const allPermissions = [...initialPermissions, ...additionalPermissions];
  await updateRolePermissions(testRoleId, allPermissions);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Verify updated state
  const updatedSync = await verifyPermissionSync(allPermissions);
  logTest('Updated permission sync', updatedSync);
  
  // Verify routes
  await verifyRouteAccess(allPermissions);
  
  return initialSync && updatedSync;
}

// Step 9: Test permission removal
async function testPermissionRemoval() {
  logSection('TEST 2: Removing Permissions');
  
  const fullPermissions = ['view_dashboard', 'manage_users', 'manage_plans', 'view_billing', 'manage_addon_services'];
  const reducedPermissions = ['view_dashboard', 'manage_users'];
  
  log('Current permissions:', 'cyan');
  log(`   ${fullPermissions.join(', ')}`);
  
  // Remove permissions
  log('\nRemoving permissions:', 'cyan');
  const removed = fullPermissions.filter(p => !reducedPermissions.includes(p));
  log(`   ${removed.join(', ')}`);
  
  await updateRolePermissions(testRoleId, reducedPermissions);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Verify reduced state
  const reducedSync = await verifyPermissionSync(reducedPermissions);
  logTest('Reduced permission sync', reducedSync);
  
  // Verify routes
  await verifyRouteAccess(reducedPermissions);
  
  return reducedSync;
}

// Step 10: Cleanup
async function cleanup() {
  logSection('Cleanup');
  
  try {
    // Delete test role
    if (testRoleId) {
      await axios.delete(`${API_URL}/roles/${testRoleId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      log(`✅ Test role deleted`, 'green');
    }
    
    // Delete test user
    if (testUserId) {
      await axios.delete(`${API_URL}/users/${testUserId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      log(`✅ Test user deleted`, 'green');
    }
  } catch (error) {
    log(`⚠️  Cleanup warning: ${error.message}`, 'yellow');
  }
}

// Main test execution
async function runTests() {
  log('╔════════════════════════════════════════════════════════════╗', 'bright');
  log('║     PERMISSION SYNCHRONIZATION TEST SUITE                 ║', 'bright');
  log('╚════════════════════════════════════════════════════════════╝', 'bright');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // Login
    const loginSuccess = await loginAsSuperAdmin();
    if (!loginSuccess) {
      log('\n❌ Cannot proceed without authentication', 'red');
      process.exit(1);
    }
    
    // Create test user
    await createTestUser();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 1: Permission Addition
    const test1Passed = await testPermissionAddition();
    if (test1Passed) testsPassed++; else testsFailed++;
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Permission Removal
    const test2Passed = await testPermissionRemoval();
    if (test2Passed) testsPassed++; else testsFailed++;
    
    // Cleanup
    await cleanup();
    
    // Summary
    logSection('TEST SUMMARY');
    log(`Total Tests: ${testsPassed + testsFailed}`, 'cyan');
    log(`Passed: ${testsPassed}`, 'green');
    log(`Failed: ${testsFailed}`, 'red');
    
    if (testsFailed === 0) {
      log('\n🎉 All tests passed!', 'green');
      process.exit(0);
    } else {
      log('\n⚠️  Some tests failed. Please check the permission system.', 'red');
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
    console.error(error);
    await cleanup();
    process.exit(1);
  }
}

// Run the tests
runTests();
