# Vendor Registration Documents Validation Fix

## Issue Summary
Vendor registration was failing with validation error when submitting documents.

**Error**: `Validation error`

**Payload sent from frontend**:
```json
{
  "documents": [
    {
      "type": "business_license",
      "name": "output.pdf",
      "url": "https://res.cloudinary.com/...",
      "status": "pending",
      "uploadDate": "2025-11-04T18:36:24.404Z"
    },
    {
      "type": "identity",
      "name": "output.pdf",
      "url": "https://res.cloudinary.com/...",
      "status": "pending",
      "uploadDate": "2025-11-04T18:36:24.404Z"
    }
  ]
}
```

## Root Cause
The validation schema in `server/utils/validationSchemas.js` expected `documents` to be an **object** with nested document types:

```javascript
// OLD - Expected object format
documents: Joi.object({
  businessRegistration: Joi.object({...}),
  professionalLicense: Joi.object({...}),
  identityProof: Joi.object({...})
}).optional()
```

But the frontend (`VendorRegister.tsx`) was sending documents as an **array**:

```javascript
documents: [
  { type: 'business_license', name: '...', url: '...', status: 'pending' },
  { type: 'identity', name: '...', url: '...', status: 'pending' }
]
```

## Solution Applied ✅

### Updated Validation Schema
**File**: `server/utils/validationSchemas.js`

Changed the `documents` field validation to accept an **array** of document objects:

```javascript
// NEW - Accepts array format
documents: Joi.array().items(
  Joi.object({
    type: Joi.string().valid(
      'business_license', 
      'identity', 
      'address', 
      'pan_card', 
      'gst_certificate', 
      'other'
    ).required(),
    name: Joi.string().required(),
    url: Joi.string().uri().required(),
    status: Joi.string().valid('pending', 'approved', 'rejected').default('pending'),
    uploadDate: Joi.date().optional()
  })
).optional().allow(null)
```

### Validation Rules
- ✅ **documents**: Optional array (can be null or omitted)
- ✅ **type**: Required, must be one of the valid document types
- ✅ **name**: Required string (filename)
- ✅ **url**: Required valid URI
- ✅ **status**: Optional, defaults to 'pending'
- ✅ **uploadDate**: Optional date

### Backend Compatibility
The backend registration handler (`server/routes/auth.js`) was already designed to handle both formats:

```javascript
// Already handles array format correctly
if (documents && Array.isArray(documents)) {
  documents.forEach(doc => {
    if (doc && doc.type && doc.url) {
      vendorDocuments.push({
        type: doc.type,
        name: doc.name || 'Document',
        url: doc.url,
        status: doc.status || 'pending',
        uploadDate: doc.uploadDate || new Date()
      });
    }
  });
}
```

## Testing

### Valid Document Types
- `business_license` - Business registration/license
- `identity` - Identity proof (Aadhar, PAN, etc.)
- `address` - Address proof
- `pan_card` - PAN card
- `gst_certificate` - GST certificate
- `other` - Other documents

### Sample Valid Payload
```json
{
  "email": "vendor@example.com",
  "password": "SecurePass@123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "9876543210",
  "role": "agent",
  "agreeToTerms": true,
  "otp": "123456",
  "businessInfo": {
    "businessName": "ABC Constructions",
    "businessType": "construction_company",
    "businessDescription": "Professional construction services",
    "experience": 5,
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "panNumber": "ABCDE1234F"
  },
  "documents": [
    {
      "type": "business_license",
      "name": "license.pdf",
      "url": "https://cloudinary.com/image.pdf",
      "status": "pending",
      "uploadDate": "2025-11-04T18:36:24.404Z"
    },
    {
      "type": "identity",
      "name": "aadhar.pdf",
      "url": "https://cloudinary.com/aadhar.pdf",
      "status": "pending",
      "uploadDate": "2025-11-04T18:36:24.404Z"
    }
  ]
}
```

## Impact
- ✅ Vendor registration now works with document uploads
- ✅ No changes needed in frontend code
- ✅ Backward compatible with backend processing
- ✅ Proper validation of document types and URLs

## Files Modified
1. `server/utils/validationSchemas.js` - Updated `registerSchema` documents validation

## Status
🟢 **FIXED** - Vendor registration with documents now validates correctly
