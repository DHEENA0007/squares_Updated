const mongoose = require('mongoose');
require('dotenv').config();

const findUserByEmail = async () => {
  const email = 'hello@akodefy.com';
  
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ninety-nine-acres');
    console.log('✅ Connected to database\n');

    const User = require('../models/User');
    const Subscription = require('../models/Subscription');
    const Payment = require('../models/Payment');
    const Property = require('../models/Property');
    const Vendor = require('../models/Vendor');

    console.log(`📧 Searching for user with email: ${email}\n`);
    console.log('='.repeat(60));

    // Find user
    const user = await User.findOne({ email: email });
    
    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      await mongoose.disconnect();
      return;
    }

    console.log('\n👤 USER DETAILS:');
    console.log('-'.repeat(40));
    console.log(`ID: ${user._id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`);
    console.log(`Phone: ${user.profile?.phone || 'N/A'}`);
    console.log(`Role: ${user.role}`);
    console.log(`Status: ${user.status}`);
    console.log(`Email Verified: ${user.isEmailVerified}`);
    console.log(`Created: ${user.createdAt}`);
    console.log(`Last Login: ${user.lastLogin || 'N/A'}`);

    // Find vendor profile
    const vendor = await Vendor.findOne({ user: user._id });
    if (vendor) {
      console.log('\n🏪 VENDOR PROFILE:');
      console.log('-'.repeat(40));
      console.log(`Vendor ID: ${vendor._id}`);
      console.log(`Company: ${vendor.businessInfo?.companyName || 'N/A'}`);
      console.log(`Verified: ${vendor.isVerified}`);
      console.log(`Rating: ${vendor.performance?.statistics?.rating?.average || 'N/A'}`);
    }

    // Find subscriptions
    const subscriptions = await Subscription.find({ user: user._id })
      .populate('plan', 'name price')
      .sort({ createdAt: -1 });

    console.log(`\n📋 SUBSCRIPTIONS (${subscriptions.length} total):`);
    console.log('-'.repeat(40));
    
    if (subscriptions.length === 0) {
      console.log('No subscriptions found');
    } else {
      subscriptions.forEach((sub, index) => {
        console.log(`\n${index + 1}. Subscription ID: ${sub._id}`);
        console.log(`   Plan: ${sub.plan?.name || 'Unknown'}`);
        console.log(`   Status: ${sub.status}`);
        console.log(`   Amount: ₹${sub.amount}`);
        console.log(`   Start Date: ${sub.startDate}`);
        console.log(`   End Date: ${sub.endDate}`);
        console.log(`   Payment Method: ${sub.paymentMethod || 'N/A'}`);
        console.log(`   Razorpay Payment ID: ${sub.paymentDetails?.razorpayPaymentId || 'N/A'}`);
        console.log(`   Razorpay Order ID: ${sub.paymentDetails?.razorpayOrderId || 'N/A'}`);
        console.log(`   Cancellation Reason: ${sub.cancellationReason || 'N/A'}`);
        console.log(`   Created: ${sub.createdAt}`);
      });
    }

    // Find payments
    const payments = await Payment.find({ user: user._id })
      .sort({ createdAt: -1 });

    console.log(`\n💳 PAYMENTS (${payments.length} total):`);
    console.log('-'.repeat(40));
    
    if (payments.length === 0) {
      console.log('No payment records found');
    } else {
      payments.forEach((payment, index) => {
        console.log(`\n${index + 1}. Payment ID: ${payment._id}`);
        console.log(`   Razorpay Order ID: ${payment.razorpayOrderId}`);
        console.log(`   Razorpay Payment ID: ${payment.razorpayPaymentId || 'N/A'}`);
        console.log(`   Amount: ₹${payment.amount}`);
        console.log(`   Status: ${payment.status}`);
        console.log(`   Type: ${payment.type}`);
        console.log(`   Description: ${payment.description || 'N/A'}`);
        console.log(`   Failure Reason: ${payment.failureReason || 'N/A'}`);
        console.log(`   Created: ${payment.createdAt}`);
        console.log(`   Expires At: ${payment.expiresAt || 'N/A'}`);
      });
    }

    // Find properties
    const properties = await Property.find({ 
      $or: [
        { owner: user._id },
        { agent: user._id }
      ]
    }).select('title status price createdAt');

    console.log(`\n🏠 PROPERTIES (${properties.length} total):`);
    console.log('-'.repeat(40));
    
    if (properties.length === 0) {
      console.log('No properties found');
    } else {
      properties.forEach((prop, index) => {
        console.log(`${index + 1}. ${prop.title} - ${prop.status} - ₹${prop.price}`);
      });
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('-'.repeat(40));
    
    const activeSubscription = subscriptions.find(s => s.status === 'active');
    const paidPayments = payments.filter(p => p.status === 'paid');
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const failedPayments = payments.filter(p => p.status === 'failed' || p.status === 'cancelled');

    console.log(`Active Subscription: ${activeSubscription ? `Yes (${activeSubscription.plan?.name})` : 'No'}`);
    console.log(`Total Subscriptions: ${subscriptions.length}`);
    console.log(`Total Payments: ${payments.length}`);
    console.log(`  - Paid: ${paidPayments.length}`);
    console.log(`  - Pending: ${pendingPayments.length}`);
    console.log(`  - Failed/Cancelled: ${failedPayments.length}`);
    console.log(`Total Properties: ${properties.length}`);

    if (paidPayments.length > 0) {
      const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
      console.log(`Total Amount Paid: ₹${totalPaid}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Script completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

findUserByEmail();
