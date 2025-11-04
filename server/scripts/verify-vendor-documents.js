/**
 * Verification Script: Check Vendor Documents in Admin Portal
 * 
 * This script checks if vendor documents are properly stored in both:
 * 1. verification.documents (for verification purposes)
 * 2. approval.submittedDocuments (for admin portal display)
 * 
 * Run: node server/scripts/verify-vendor-documents.js [vendorEmail]
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Vendor = require('../models/Vendor');
const User = require('../models/User');

async function verifyVendorDocuments(vendorEmail) {
  try {
    console.log('='.repeat(70));
    console.log('VENDOR DOCUMENTS VERIFICATION');
    console.log('='.repeat(70));
    console.log();

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    let vendors;

    if (vendorEmail) {
      // Find specific vendor by email
      console.log(`🔍 Looking for vendor: ${vendorEmail}`);
      const user = await User.findOne({ email: vendorEmail, role: 'agent' });
      
      if (!user) {
        console.log(`❌ No vendor found with email: ${vendorEmail}`);
        await mongoose.connection.close();
        return;
      }

      const vendor = await Vendor.findOne({ user: user._id }).populate('user', 'email profile.firstName profile.lastName');
      vendors = vendor ? [vendor] : [];
    } else {
      // Check all vendors
      console.log('🔍 Checking all vendors...');
      vendors = await Vendor.find({}).populate('user', 'email profile.firstName profile.lastName').limit(10);
    }

    if (vendors.length === 0) {
      console.log('❌ No vendors found in database\n');
      await mongoose.connection.close();
      return;
    }

    console.log(`📦 Found ${vendors.length} vendor(s) to verify\n`);

    // Check each vendor
    vendors.forEach((vendor, index) => {
      console.log('='.repeat(70));
      console.log(`Vendor ${index + 1}: ${vendor.businessInfo?.companyName || 'Unknown'}`);
      console.log('='.repeat(70));
      
      const user = vendor.user;
      console.log(`📧 Email: ${user?.email || 'N/A'}`);
      console.log(`👤 Name: ${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`);
      console.log(`📋 Status: ${vendor.status}`);
      console.log(`✅ Approval Status: ${vendor.approval?.status || 'N/A'}`);
      console.log();

      // Check verification.documents
      const verificationDocs = vendor.verification?.documents || [];
      console.log('🔐 verification.documents:');
      if (verificationDocs.length === 0) {
        console.log('   ⚠️  No documents found');
      } else {
        console.log(`   ✅ ${verificationDocs.length} document(s) found:`);
        verificationDocs.forEach((doc, i) => {
          console.log(`   ${i + 1}. Type: ${doc.type}`);
          console.log(`      Name: ${doc.name}`);
          console.log(`      URL: ${doc.url?.substring(0, 50)}...`);
          console.log(`      Status: ${doc.status}`);
          console.log();
        });
      }

      // Check approval.submittedDocuments
      const submittedDocs = vendor.approval?.submittedDocuments || [];
      console.log('📊 approval.submittedDocuments (Admin Portal):');
      if (submittedDocs.length === 0) {
        console.log('   ❌ No documents found - NOT VISIBLE IN ADMIN PORTAL!');
        console.log('   💡 Run migration script: node server/scripts/migrate-vendor-documents.js');
      } else {
        console.log(`   ✅ ${submittedDocs.length} document(s) found - VISIBLE IN ADMIN PORTAL:`);
        submittedDocs.forEach((doc, i) => {
          console.log(`   ${i + 1}. Type: ${doc.documentType}`);
          console.log(`      Name: ${doc.documentName}`);
          console.log(`      URL: ${doc.documentUrl?.substring(0, 50)}...`);
          console.log(`      Verified: ${doc.verified ? '✅ Yes' : '❌ No'}`);
          console.log(`      Uploaded: ${doc.uploadedAt}`);
          console.log();
        });
      }

      // Summary for this vendor
      if (verificationDocs.length > 0 && submittedDocs.length === 0) {
        console.log('⚠️  WARNING: Documents exist but NOT visible to admin!');
        console.log('   Action required: Run migration script');
      } else if (verificationDocs.length === 0 && submittedDocs.length === 0) {
        console.log('ℹ️  No documents uploaded yet');
      } else if (submittedDocs.length > 0) {
        console.log('✅ Documents properly configured - visible in admin portal');
      }

      console.log();
    });

    // Overall summary
    console.log('='.repeat(70));
    console.log('OVERALL SUMMARY');
    console.log('='.repeat(70));
    
    const withBothDocs = vendors.filter(v => 
      (v.verification?.documents?.length > 0) && 
      (v.approval?.submittedDocuments?.length > 0)
    ).length;
    
    const withOnlyVerificationDocs = vendors.filter(v => 
      (v.verification?.documents?.length > 0) && 
      (v.approval?.submittedDocuments?.length === 0)
    ).length;
    
    const withNoDocs = vendors.filter(v => 
      (v.verification?.documents?.length === 0) && 
      (v.approval?.submittedDocuments?.length === 0)
    ).length;

    console.log(`Total vendors checked: ${vendors.length}`);
    console.log(`✅ Properly configured (visible in admin): ${withBothDocs}`);
    console.log(`⚠️  Need migration (not visible): ${withOnlyVerificationDocs}`);
    console.log(`ℹ️  No documents uploaded: ${withNoDocs}`);
    console.log('='.repeat(70));

    if (withOnlyVerificationDocs > 0) {
      console.log('\n💡 TIP: Run the migration script to fix vendors that need migration:');
      console.log('   node server/scripts/migrate-vendor-documents.js');
    }

    // Close connection
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

// Get email from command line argument
const vendorEmail = process.argv[2];

if (vendorEmail) {
  console.log(`\nVerifying specific vendor: ${vendorEmail}\n`);
} else {
  console.log('\nVerifying all vendors (showing first 10)...');
  console.log('💡 To check a specific vendor: node server/scripts/verify-vendor-documents.js [email]\n');
}

verifyVendorDocuments(vendorEmail)
  .then(() => {
    console.log('\n✨ Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
