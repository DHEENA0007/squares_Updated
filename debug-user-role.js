const jwt = require('jsonwebtoken');
require('dotenv').config();

// This script will help debug the current user's token and role
// You can get the token from browser localStorage or from network requests

console.log('🔍 JWT Token Debugger');
console.log('=====================');

// Try to get token from environment or add it here manually
const token = process.argv[2];

if (!token) {
  console.log('❌ No token provided');
  console.log('');
  console.log('Usage:');
  console.log('  node debug-user-role.js <JWT_TOKEN>');
  console.log('');
  console.log('To get your token:');
  console.log('  1. Open browser DevTools (F12)');
  console.log('  2. Go to Application/Storage tab');
  console.log('  3. Find localStorage');
  console.log('  4. Look for "token" or "authToken"');
  console.log('  OR');
  console.log('  1. Open Network tab in DevTools');
  console.log('  2. Make a request to the API');
  console.log('  3. Check the Authorization header: "Bearer <token>"');
  process.exit(1);
}

try {
  console.log('🎫 Token provided');
  
  // Decode without verification first to see structure
  const decoded = jwt.decode(token);
  console.log('📋 Decoded token payload:', JSON.stringify(decoded, null, 2));
  
  // Now verify with secret
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token is valid');
    console.log('👤 User ID:', verified.userId);
    console.log('⏰ Issued at:', new Date(verified.iat * 1000));
    console.log('⏰ Expires at:', new Date(verified.exp * 1000));
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (verified.exp < now) {
      console.log('⚠️  Token is EXPIRED');
    } else {
      console.log('✅ Token is still valid');
    }
    
  } catch (verifyError) {
    console.log('❌ Token verification failed:', verifyError.message);
  }
  
} catch (error) {
  console.log('❌ Error decoding token:', error.message);
}
