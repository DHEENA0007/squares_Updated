const axios = require('axios');

// Test vendor registration with OTP verification
async function testVendorRegistration() {
  const API_URL = 'http://localhost:8000/api';
  
  console.log('========================================');
  console.log('VENDOR REGISTRATION TEST SCRIPT');
  console.log('========================================\n');

  // Test data
  const testEmail = `test.vendor.${Date.now()}@example.com`;
  const testData = {
    // Personal Information
    email: testEmail,
    password: 'Test@1234',
    firstName: 'Test',
    lastName: 'Vendor',
    phone: '+919876543210',
    role: 'agent',
    agreeToTerms: true,
    
    // Business Information
    businessInfo: {
      businessName: 'Test Real Estate Company',
      businessType: 'real_estate_agent', // Using exact enum value
      businessDescription: 'This is a test business description that is longer than 50 characters to meet the minimum requirement for validation.',
      experience: 5, // Number type, not string
      address: '123 Test Street, Test Area',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      licenseNumber: 'LIC123456',
      gstNumber: '27ABCDE1234F1Z5', // Valid GST format
      panNumber: 'ABCDE1234F' // Valid PAN format
    },
    
    // Documents
    documents: {
      businessRegistration: {
        name: 'business-reg.pdf',
        url: 'https://example.com/docs/business-reg.pdf',
        size: 102400
      },
      identityProof: {
        name: 'identity.pdf',
        url: 'https://example.com/docs/identity.pdf',
        size: 204800
      },
      professionalLicense: {
        name: 'license.pdf',
        url: 'https://example.com/docs/license.pdf',
        size: 153600
      }
    },
    
    // OTP (dummy for testing - will be replaced with real OTP)
    otp: '123456'
  };

  try {
    // Step 1: Send OTP
    console.log('Step 1: Sending OTP to email...');
    console.log('Email:', testEmail);
    
    const otpResponse = await axios.post(`${API_URL}/auth/send-otp`, {
      email: testEmail,
      firstName: testData.firstName
    });
    
    console.log('✅ OTP sent successfully');
    console.log('Response:', JSON.stringify(otpResponse.data, null, 2));
    console.log('\n⚠️  Please check the email for OTP (or use the backend logs)\n');
    
    // In a real scenario, you would get the OTP from email
    // For testing, we'll prompt for it or use a test OTP
    const realOtp = '123456'; // Replace with actual OTP from email/logs
    testData.otp = realOtp;
    
    // Step 2: Verify OTP
    console.log('Step 2: Verifying OTP...');
    console.log('OTP:', realOtp);
    
    const verifyResponse = await axios.post(`${API_URL}/auth/verify-otp`, {
      email: testEmail,
      otp: realOtp
    });
    
    console.log('✅ OTP verified successfully');
    console.log('Response:', JSON.stringify(verifyResponse.data, null, 2));
    
    // Step 3: Complete registration
    console.log('\nStep 3: Completing vendor registration...');
    console.log('\n--- Registration Payload ---');
    console.log(JSON.stringify(testData, null, 2));
    console.log('----------------------------\n');
    
    const registerResponse = await axios.post(`${API_URL}/auth/register`, testData);
    
    console.log('✅ Registration successful!');
    console.log('\n--- Registration Response ---');
    console.log(JSON.stringify(registerResponse.data, null, 2));
    console.log('-----------------------------\n');
    
    console.log('========================================');
    console.log('TEST COMPLETED SUCCESSFULLY ✅');
    console.log('========================================');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('========================================\n');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Status Code:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('\n--- Error Response Data ---');
      console.error(JSON.stringify(error.response.data, null, 2));
      console.error('---------------------------\n');
      
      // Show which fields failed validation
      if (error.response.data.errors) {
        console.error('Validation Errors:');
        error.response.data.errors.forEach((err, index) => {
          console.error(`${index + 1}. Field: ${err.field || err.path || 'unknown'}`);
          console.error(`   Message: ${err.message}`);
          console.error('');
        });
      }
      
      // Show what data was sent
      if (error.config && error.config.data) {
        console.error('--- Data That Was Sent ---');
        console.error(error.config.data);
        console.error('--------------------------\n');
      }
      
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
      console.error('Request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }
    
    console.error('\n========================================');
    process.exit(1);
  }
}

// Run the test
console.log('Starting vendor registration test...\n');
testVendorRegistration();
