#!/usr/bin/env node
/**
 * Razorpay Diagnostic Tool
 * Checks common issues with Razorpay integration
 */

require('dotenv').config();
const Razorpay = require('razorpay');

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

function pass(msg) {
  checks.passed.push(msg);
  console.log('✅', msg);
}

function fail(msg) {
  checks.failed.push(msg);
  console.error('❌', msg);
}

function warn(msg) {
  checks.warnings.push(msg);
  console.warn('⚠️ ', msg);
}

console.log('\n🔍 Razorpay Integration Diagnostic Tool\n');
console.log('=' .repeat(60));

// Check 1: Environment Variables
console.log('\n📋 Check 1: Environment Variables');
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId) {
  fail('RAZORPAY_KEY_ID not set');
} else if (!keyId.startsWith('rzp_')) {
  fail('RAZORPAY_KEY_ID has invalid format');
} else if (keyId.startsWith('rzp_test_')) {
  pass('Using TEST mode credentials');
} else if (keyId.startsWith('rzp_live_')) {
  warn('Using LIVE mode credentials (real payments!)');
} else {
  warn('Unusual RAZORPAY_KEY_ID format');
}

if (!keySecret) {
  fail('RAZORPAY_KEY_SECRET not set');
} else {
  pass('RAZORPAY_KEY_SECRET is set');
}

// Check 2: Razorpay SDK
console.log('\n📋 Check 2: Razorpay SDK');
try {
  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
  pass('Razorpay SDK initialized');
  
  // Check 3: API Connectivity
  console.log('\n📋 Check 3: API Connectivity');
  (async () => {
    try {
      const testOrder = await razorpay.orders.create({
        amount: 100,
        currency: 'INR',
        receipt: `diag_${Date.now()}`
      });
      pass('Can create orders via API');
      pass(`Test order ID: ${testOrder.id}`);
      
      // Check 4: Order Details
      console.log('\n📋 Check 4: Order Verification');
      const fetchedOrder = await razorpay.orders.fetch(testOrder.id);
      pass('Can fetch orders via API');
      
      if (fetchedOrder.status === 'created') {
        pass('Order status is correct');
      } else {
        warn(`Unexpected order status: ${fetchedOrder.status}`);
      }
      
      // Print summary
      printSummary();
      
    } catch (error) {
      fail(`API call failed: ${error.message}`);
      
      if (error.statusCode === 401) {
        fail('Authentication failed - check API credentials');
      } else if (error.statusCode === 400) {
        fail('Bad request - check API key format');
      } else if (error.statusCode === 429) {
        warn('Rate limited - too many requests');
      }
      
      if (error.error && error.error.description) {
        fail(`Razorpay error: ${error.error.description}`);
      }
      
      printSummary();
      process.exit(1);
    }
  })();
  
} catch (error) {
  fail(`Failed to initialize Razorpay: ${error.message}`);
  printSummary();
  process.exit(1);
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 DIAGNOSTIC SUMMARY\n');
  
  console.log(`✅ Passed: ${checks.passed.length}`);
  console.log(`❌ Failed: ${checks.failed.length}`);
  console.log(`⚠️  Warnings: ${checks.warnings.length}`);
  
  if (checks.failed.length === 0) {
    console.log('\n🎉 All checks passed! Backend Razorpay integration is working.');
    console.log('\n💡 If checkout still fails:');
    console.log('   1. Check Razorpay Dashboard → Settings → Checkout');
    console.log('   2. Enable Standard Checkout');
    console.log('   3. Complete Merchant Profile');
    console.log('   4. Enable payment methods in Settings');
    console.log('\n📖 See RAZORPAY_TROUBLESHOOTING.md for detailed steps\n');
  } else {
    console.log('\n❌ Issues detected! Fix the following:');
    checks.failed.forEach(msg => console.log('   •', msg));
    
    if (checks.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      checks.warnings.forEach(msg => console.log('   •', msg));
    }
    
    console.log('\n📖 See RAZORPAY_TROUBLESHOOTING.md for solutions\n');
  }
}
