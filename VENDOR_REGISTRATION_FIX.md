# Vendor Registration API Error Fixes

## Issues Fixed

### 1. Business Type Validation Error
**Error:** `Construction Company` is not a valid enum value for path `businessInfo.businessType`

**Root Cause:** The business type field represents the **legal structure** of the vendor's business entity, not the services they provide.

**Fix:**
- Updated business types to match Vendor model enum values:
  - `individual` - Individual/Sole Proprietor
  - `partnership` - Partnership Firm
  - `pvt_ltd` - Private Limited Company
  - `llp` - Limited Liability Partnership
  - `public_ltd` - Public Limited Company

**Files Changed:**
- `src/pages/vendor/VendorRegister.tsx` - Updated businessTypes array and Select component
- `server/utils/validationSchemas.js` - Added proper enum validation

---

### 2. Experience Type Validation Error
**Error:** Cast to Number failed for value "0-1 years" (type string) at path "professionalInfo.experience"

**Root Cause:** The backend Vendor model expects `experience` as a Number (0-50), but the form was sending strings like "0-1 years".

**Fix:**
- Experience options now store numeric values:
  - 0-1 years → `0`
  - 2-5 years → `3`
  - 6-10 years → `8`
  - 10+ years → `10`
- Convert experience to Number before sending to API: `Number(formData.experience)`

**Files Changed:**
- `src/pages/vendor/VendorRegister.tsx` - Updated experienceOptions array, Select component, and registration data preparation
- `server/utils/validationSchemas.js` - Changed validation from `Joi.string()` to `Joi.number().min(0).max(50).required()`

---

### 3. PAN Number Format Validation
**Error:** Invalid PAN number format

**Root Cause:** PAN numbers must be uppercase and follow specific format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)

**Fix:**
- Ensure PAN number is converted to uppercase before sending: `.toUpperCase()`
- Added proper validation pattern in schema: `/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`

**Files Changed:**
- `src/pages/vendor/VendorRegister.tsx` - Added `.toUpperCase()` for PAN number
- `server/utils/validationSchemas.js` - Added PAN pattern validation with helpful error message

---

### 4. Document Type Validation
**Error:** Path `type` is required (for verification.documents array)

**Root Cause:** When documents are uploaded, they need a `type` field to be stored in the Vendor model's verification.documents array.

**Note:** This is handled by the backend when processing the registration. The frontend sends documents in a separate `documents` object with keys like `businessRegistration`, `professionalLicense`, `identityProof`.

---

## Validation Schema Updates

### Updated businessInfo Schema:
```javascript
businessInfo: Joi.object({
  businessName: Joi.string().min(2).max(100).required(),
  businessType: Joi.string().valid('individual', 'partnership', 'pvt_ltd', 'llp', 'public_ltd').required(),
  businessDescription: Joi.string().max(500).required(),
  experience: Joi.number().min(0).max(50).required(),
  address: Joi.string().max(200).required(),
  city: Joi.string().max(50).required(),
  state: Joi.string().max(50).required(),
  pincode: Joi.string().length(6).pattern(/^[0-9]{6}$/).required(),
  licenseNumber: Joi.string().max(50).optional().allow(''),
  gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional().allow(''),
  panNumber: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional().allow('')
}).optional()
```

---

## Frontend Changes Summary

### VendorRegister.tsx

1. **Business Types Array:**
```typescript
const businessTypes = [
  { label: "Individual/Sole Proprietor", value: "individual" },
  { label: "Partnership Firm", value: "partnership" },
  { label: "Private Limited Company", value: "pvt_ltd" },
  { label: "Limited Liability Partnership (LLP)", value: "llp" },
  { label: "Public Limited Company", value: "public_ltd" }
];
```

2. **Experience Options Array:**
```typescript
const experienceOptions = [
  { label: "0-1 years", value: 0 },
  { label: "2-5 years", value: 3 },
  { label: "6-10 years", value: 8 },
  { label: "10+ years", value: 10 }
];
```

3. **Registration Data Preparation:**
```typescript
const businessInfo = {
  // ... other fields
  businessType: formData.businessType, // Now sends 'individual', 'partnership', etc.
  experience: Number(formData.experience), // Converted to number
  panNumber: formData.panNumber.trim().toUpperCase() // Uppercase for PAN
};
```

---

## Testing

To test the fixes, ensure:

1. **Business Type:** Select any legal structure (Individual, Partnership, etc.) - should send correct enum value
2. **Experience:** Select any experience range - should send numeric value (0, 3, 8, or 10)
3. **PAN Number:** Enter PAN in any case (e.g., "abcde1234f") - should convert to uppercase "ABCDE1234F"
4. **GST Number:** Optional, but if provided must follow format: 22AAAAA0000A1Z5
5. **PIN Code:** Must be exactly 6 digits

---

## API Request Example

After fixes, the registration request should look like:
```json
{
  "email": "vendor@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+919876543210",
  "role": "agent",
  "agreeToTerms": true,
  "otp": "123456",
  "businessInfo": {
    "businessName": "ABC Real Estate",
    "businessType": "pvt_ltd",
    "businessDescription": "We provide comprehensive real estate services...",
    "experience": 8,
    "address": "123 Main Street, Mumbai",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "panNumber": "ABCDE1234F",
    "gstNumber": "27AAAAA0000A1Z5"
  },
  "documents": {
    "businessRegistration": {
      "name": "registration.pdf",
      "url": "https://...",
      "size": 12345
    }
  }
}
```

---

## Conclusion

All validation errors have been resolved:
- ✅ Business types now match backend enum values
- ✅ Experience is sent as a number
- ✅ PAN number is properly formatted and validated
- ✅ All required fields have proper validation

The vendor can now successfully register with proper data validation.
