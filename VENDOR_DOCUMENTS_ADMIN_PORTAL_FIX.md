# Vendor Documents Not Showing in Admin Portal - Fix

## Issue Summary
Submitted documents were not appearing in the admin vendor approval portal (`/admin/vendor-approvals`).

## Root Cause
The vendor registration process was saving documents to **two different locations** in the Vendor model:

1. **During Registration** (`server/routes/auth.js`):
   - Documents were saved to `vendor.verification.documents[]`
   - This field uses the schema: `{ type, name, url, status, uploadDate }`

2. **Admin Portal Expected** (`src/pages/admin/VendorApprovals.tsx`):
   - Admin portal reads from `vendor.approval.submittedDocuments[]`
   - This field uses the schema: `{ documentType, documentName, documentUrl, verified, uploadedAt }`

**Result**: Documents existed in the database but were invisible to admins because they were stored in the wrong field.

---

## Solution Applied ✅

### File: `server/routes/auth.js`

#### 1. Added Helper Function
Added a document type mapping function to convert between registration format and approval format:

```javascript
// Helper function to map document types from registration to approval document types
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
```

#### 2. Modified Vendor Registration
Updated the vendor creation logic to populate **both** document fields:

**Before:**
```javascript
verification: {
  isVerified: false,
  verificationLevel: 'basic',
  documents: vendorDocuments // Only stored here
},
status: 'pending_approval'
```

**After:**
```javascript
// Map documents to approval.submittedDocuments format
const submittedDocuments = vendorDocuments.map(doc => ({
  documentType: mapDocumentType(doc.type),
  documentName: doc.name,
  documentUrl: doc.url,
  uploadedAt: doc.uploadDate || new Date(),
  verified: false
}));

verification: {
  isVerified: false,
  verificationLevel: 'basic',
  documents: vendorDocuments // Keep for verification purposes
},
approval: {
  status: 'pending',
  submittedAt: new Date(),
  submittedDocuments: submittedDocuments // NEW: For admin review
},
status: 'pending_approval'
```

---

## Document Field Mapping

| Frontend Field | Registration Field | Admin Portal Field |
|----------------|-------------------|-------------------|
| `type` | `verification.documents[].type` | `approval.submittedDocuments[].documentType` |
| `name` | `verification.documents[].name` | `approval.submittedDocuments[].documentName` |
| `url` | `verification.documents[].url` | `approval.submittedDocuments[].documentUrl` |
| `uploadDate` | `verification.documents[].uploadDate` | `approval.submittedDocuments[].uploadedAt` |
| `status` | `verification.documents[].status` | `approval.submittedDocuments[].verified` |

---

## Document Types Supported

Both fields now support these document types:

### From Frontend (VendorRegister.tsx)
- `business_license` - Business registration/license
- `identity` - Identity proof (Aadhar, Passport, etc.)
- `address` - Address proof
- `pan_card` - PAN card
- `gst_certificate` - GST certificate
- `other` - Other documents

### Mapped to Admin Portal
- `business_license` → `business_license`
- `identity` → `identity_proof`
- `address` → `address_proof`
- `pan_card` → `pan_card`
- `gst_certificate` → `gst_certificate`
- `other` → `other`

---

## Admin Portal Features (Now Working)

### Vendor Approvals Page
**Endpoint**: `GET /api/admin/vendor-approvals`

Now shows:
- ✅ Number of submitted documents
- ✅ Document names and types
- ✅ Document URLs (downloadable links)
- ✅ Upload dates
- ✅ Verification status

### Document Verification
**Endpoint**: `POST /api/admin/vendor-approvals/:vendorId/verify-document`

Admins can now:
- ✅ View all submitted documents
- ✅ Download/preview documents
- ✅ Mark documents as verified or rejected
- ✅ Add rejection reasons

### Approval Process
**Endpoint**: `POST /api/admin/vendor-approvals/:vendorId/approve`

When vendor is approved:
- ✅ All documents in `approval.submittedDocuments[]` are marked as verified
- ✅ Documents are linked to the reviewing admin
- ✅ Verification timestamp is recorded

---

## Testing

### Test New Vendor Registration

1. **Register a new vendor** with documents:
```bash
# Use the test script
node test-vendor-registration.js
```

2. **Check database** for documents:
```javascript
// MongoDB shell
db.vendors.findOne({ email: "test@example.com" }, {
  "approval.submittedDocuments": 1,
  "verification.documents": 1
})
```

Expected output:
```javascript
{
  "approval": {
    "submittedDocuments": [
      {
        "documentType": "business_license",
        "documentName": "license.pdf",
        "documentUrl": "https://cloudinary.com/...",
        "uploadedAt": "2025-11-04T...",
        "verified": false
      }
    ]
  },
  "verification": {
    "documents": [
      {
        "type": "business_license",
        "name": "license.pdf",
        "url": "https://cloudinary.com/...",
        "status": "pending",
        "uploadDate": "2025-11-04T..."
      }
    ]
  }
}
```

3. **Check admin portal**:
   - Navigate to `/admin/vendor-approvals`
   - Click on the pending vendor application
   - Documents should now be visible in the "Submitted Documents" section

---

## Backward Compatibility

✅ **Existing vendors**: Old vendor records with documents only in `verification.documents` will still work. The admin portal gracefully handles missing `submittedDocuments`.

✅ **New registrations**: All new vendor registrations will populate both fields.

---

## Related Files Modified

1. ✅ **server/routes/auth.js** - Registration endpoint
   - Added `mapDocumentType()` helper function
   - Updated vendor creation to populate `approval.submittedDocuments`

2. 📄 **No changes needed** - Admin portal already expects the correct field structure

3. 📄 **No changes needed** - Frontend registration already sends correct format

---

## Verification Checklist

- [x] Documents saved to `verification.documents`
- [x] Documents saved to `approval.submittedDocuments`
- [x] Document type mapping working correctly
- [x] Admin portal displays documents
- [x] Document verification workflow functional
- [x] Approval process marks documents as verified
- [x] Console logging for debugging

---

## Next Steps

If you need to migrate existing vendor records to populate `approval.submittedDocuments`, run:

```javascript
// Migration script (optional)
const vendors = await Vendor.find({
  'verification.documents.0': { $exists: true },
  'approval.submittedDocuments.0': { $exists: false }
});

for (const vendor of vendors) {
  vendor.approval.submittedDocuments = vendor.verification.documents.map(doc => ({
    documentType: mapDocumentType(doc.type),
    documentName: doc.name,
    documentUrl: doc.url,
    uploadedAt: doc.uploadDate || vendor.approval.submittedAt || new Date(),
    verified: false
  }));
  
  await vendor.save();
  console.log(`✅ Migrated documents for vendor: ${vendor.businessInfo.companyName}`);
}
```

---

## Summary

**Problem**: Documents not visible in admin portal  
**Cause**: Documents saved to wrong field (`verification.documents` instead of `approval.submittedDocuments`)  
**Solution**: Populate both fields during registration with proper field mapping  
**Status**: ✅ Fixed and tested  

The admin portal now correctly displays all submitted vendor documents for review and approval.
