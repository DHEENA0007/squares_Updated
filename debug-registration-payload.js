// This script simulates what the frontend VendorRegister.tsx is sending to the backend
// Run this to see the exact payload structure

const formData = {
  // Personal Information
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "+919876543210",
  password: "Test@1234",
  confirmPassword: "Test@1234",
  
  // Business Information
  businessName: "John Doe Real Estate",
  businessType: "real_estate_agent",
  businessDescription: "This is a test business description that needs to be at least 50 characters long for validation.",
  experience: "3", // Frontend stores this as STRING from select value
  
  // Address Information
  address: "123 Test Street, Mumbai, Maharashtra",
  country: "India",
  countryCode: "IN",
  state: "Maharashtra",
  stateCode: "MH",
  district: "Mumbai Suburban",
  districtCode: "MS",
  city: "Mumbai",
  cityCode: "MUM",
  pincode: "400001",
  
  // Legal Documents
  licenseNumber: "LIC123456",
  gstNumber: "27ABCDE1234F1Z5",
  panNumber: "ABCDE1234F",
  
  // Agreements
  termsAccepted: true,
  marketingConsent: false
};

const uploadedDocuments = {
  businessRegistration: {
    name: 'business-cert.pdf',
    url: 'https://example.com/docs/business-cert.pdf',
    size: 102400
  },
  professionalLicense: {
    name: 'license.pdf',
    url: 'https://example.com/docs/license.pdf',
    size: 204800
  },
  identityProof: {
    name: 'id-proof.pdf',
    url: 'https://example.com/docs/id-proof.pdf',
    size: 153600
  }
};

// Simulate what handleFinalRegistration() does
console.log('========================================');
console.log('SIMULATING FRONTEND REGISTRATION PAYLOAD');
console.log('========================================\n');

// Clean phone number
let cleanPhone = formData.phone.trim().replace(/[^\d+]/g, '');
if (!cleanPhone.startsWith('+') && !cleanPhone.match(/^[1-9]/)) {
  cleanPhone = '+91' + cleanPhone;
}

// Prepare business info
const businessInfo = {
  businessName: formData.businessName.trim(),
  businessType: formData.businessType,
  businessDescription: formData.businessDescription.trim(),
  experience: Number(formData.experience), // Convert to number
  address: formData.address.trim(),
  city: formData.city,
  state: formData.state,
  pincode: formData.pincode.trim()
};

// Only add optional fields if they exist and are valid
if (formData.licenseNumber && formData.licenseNumber.trim()) {
  businessInfo.licenseNumber = formData.licenseNumber.trim();
}

if (formData.gstNumber && formData.gstNumber.trim()) {
  const gstUpper = formData.gstNumber.trim().toUpperCase();
  if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstUpper)) {
    businessInfo.gstNumber = gstUpper;
  } else {
    console.log('⚠️  GST number is invalid, skipping:', formData.gstNumber);
  }
}

if (formData.panNumber && formData.panNumber.trim()) {
  const panUpper = formData.panNumber.trim().toUpperCase();
  if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panUpper)) {
    businessInfo.panNumber = panUpper;
  } else {
    console.log('⚠️  PAN number is invalid, skipping:', formData.panNumber);
  }
}

// Prepare documents array for Vendor model
const documents = [];
Object.entries(uploadedDocuments).forEach(([docType, docData]) => {
  if (docData && docData.url) {
    // Map frontend document types to backend enum values
    const documentTypeMap = {
      'businessRegistration': 'business_license',
      'professionalLicense': 'business_license',
      'identityProof': 'identity'
    };
    
    documents.push({
      type: documentTypeMap[docType] || 'other',
      name: docData.name,
      url: docData.url,
      status: 'pending',
      uploadDate: new Date()
    });
  }
});

// Build the final registration payload
const registrationData = {
  email: formData.email.trim(),
  password: formData.password,
  firstName: formData.firstName.trim(),
  lastName: formData.lastName.trim(),
  phone: cleanPhone,
  role: 'agent',
  agreeToTerms: formData.termsAccepted,
  businessInfo: businessInfo,
  documents: uploadedDocuments, // Frontend format
  otp: '123456' // Placeholder
};

console.log('--- REGISTRATION PAYLOAD ---');
console.log(JSON.stringify(registrationData, null, 2));
console.log('---------------------------\n');

console.log('--- BUSINESS INFO DETAILS ---');
console.log('businessName:', typeof businessInfo.businessName, '=', businessInfo.businessName);
console.log('businessType:', typeof businessInfo.businessType, '=', businessInfo.businessType);
console.log('experience:', typeof businessInfo.experience, '=', businessInfo.experience);
console.log('panNumber:', typeof businessInfo.panNumber, '=', businessInfo.panNumber);
console.log('gstNumber:', typeof businessInfo.gstNumber, '=', businessInfo.gstNumber);
console.log('----------------------------\n');

console.log('--- DOCUMENTS FOR VENDOR MODEL ---');
console.log(JSON.stringify(documents, null, 2));
console.log('----------------------------------\n');

console.log('--- VALIDATION CHECKS ---');
console.log('✓ businessType is enum value:', ['real_estate_agent', 'property_developer', 'construction_company', 'interior_designer', 'legal_services', 'home_loan_provider', 'packers_movers', 'property_management', 'other'].includes(businessInfo.businessType));
console.log('✓ experience is number:', typeof businessInfo.experience === 'number');
console.log('✓ experience range (0-50):', businessInfo.experience >= 0 && businessInfo.experience <= 50);
console.log('✓ PAN format valid:', /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(businessInfo.panNumber || ''));
console.log('✓ GST format valid:', businessInfo.gstNumber ? /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(businessInfo.gstNumber) : 'Not provided');
console.log('✓ Documents have type field:', documents.every(doc => doc.type));
console.log('------------------------\n');

console.log('========================================');
console.log('EXPECTED ISSUES:');
console.log('========================================');
console.log('1. Documents format mismatch:');
console.log('   Frontend sends: { businessRegistration: {...}, identityProof: {...} }');
console.log('   Backend expects: Array of { type, name, url, status }');
console.log('');
console.log('2. Vendor model documents require "type" field in each document');
console.log('   Each document in array needs: { type: "identity" | "business_license" | ... }');
console.log('');
console.log('========================================\n');
