/**
 * Migration Script: Migrate Vendor Documents to Approval Field
 * 
 * This script migrates existing vendor documents from verification.documents
 * to approval.submittedDocuments so they appear in the admin portal.
 * 
 * Run: node server/scripts/migrate-vendor-documents.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Vendor = require('../models/Vendor');
const User = require('../models/User');

// Helper function to map document types
const mapDocumentType = (type) => {
  const typeMap = {
    'business_license': 'business_license',
    'identity': 'identity_proof',
    'address': 'address_proof',
    'pan_card': 'pan_card',
    'gst_certificate': 'gst_certificate',
    'other': 'other'
  };
  return typeMap[type] || 'other';
};

async function migrateVendorDocuments() {
  try {
    console.log('='.repeat(60));
    console.log('VENDOR DOCUMENTS MIGRATION SCRIPT');
    console.log('='.repeat(60));
    console.log();

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Find vendors that have documents in verification but not in approval
    console.log('🔍 Finding vendors that need migration...');
    const vendors = await Vendor.find({
      'verification.documents.0': { $exists: true }, // Has documents in verification
      $or: [
        { 'approval.submittedDocuments': { $exists: false } }, // No approval field
        { 'approval.submittedDocuments': { $size: 0 } } // Empty approval field
      ]
    }).populate('user', 'email profile.firstName profile.lastName');

    console.log(`📦 Found ${vendors.length} vendors to migrate\n`);

    if (vendors.length === 0) {
      console.log('✨ No vendors need migration. All documents are already in the correct location.');
      await mongoose.connection.close();
      return;
    }

    // Migrate each vendor
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const vendor of vendors) {
      try {
        const companyName = vendor.businessInfo?.companyName || 'Unknown Company';
        const userEmail = vendor.user?.email || 'Unknown Email';
        const verificationDocs = vendor.verification?.documents || [];

        console.log(`\n📋 Processing: ${companyName} (${userEmail})`);
        console.log(`   Documents to migrate: ${verificationDocs.length}`);

        if (verificationDocs.length === 0) {
          console.log('   ⚠️  No documents found in verification.documents - skipping');
          skipped++;
          continue;
        }

        // Map documents to approval format
        const submittedDocuments = verificationDocs.map(doc => ({
          documentType: mapDocumentType(doc.type),
          documentName: doc.name || 'Document',
          documentUrl: doc.url,
          uploadedAt: doc.uploadDate || vendor.approval?.submittedAt || vendor.createdAt || new Date(),
          verified: doc.status === 'verified' || false
        }));

        // Update vendor
        if (!vendor.approval) {
          vendor.approval = {
            status: 'pending',
            submittedAt: vendor.createdAt || new Date(),
            submittedDocuments: submittedDocuments
          };
        } else {
          vendor.approval.submittedDocuments = submittedDocuments;
        }

        await vendor.save();

        console.log(`   ✅ Migrated ${submittedDocuments.length} documents:`);
        submittedDocuments.forEach((doc, index) => {
          console.log(`      ${index + 1}. ${doc.documentType}: ${doc.documentName}`);
        });

        migrated++;

      } catch (error) {
        console.error(`   ❌ Error migrating ${vendor.businessInfo?.companyName}:`, error.message);
        errors++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total vendors processed: ${vendors.length}`);
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`⚠️  Skipped (no documents): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    if (migrated > 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('📍 Documents are now visible in the admin portal at:');
      console.log('   /admin/vendor-approvals');
    }

    // Close connection
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
console.log('Starting vendor documents migration...\n');
migrateVendorDocuments()
  .then(() => {
    console.log('\n✨ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
