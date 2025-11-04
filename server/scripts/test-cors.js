const axios = require('axios');

const testCORS = async () => {
  console.log('🔧 Testing CORS Configuration and API Endpoints...\n');

  const baseURL = process.env.API_URL || 'https://squares-v2.onrender.com';
  const frontendOrigins = [
    'https://squares-v2.vercel.app',
    'https://squares.vercel.app',
    'https://squares-git-main.vercel.app'
  ];

  // Test health endpoint first
  try {
    console.log('🏥 Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/health`, { timeout: 10000 });
    console.log(`✅ Health check successful: ${healthResponse.data.status}`);
    console.log(`   Database status: ${healthResponse.data.database?.status || 'Unknown'}`);
    console.log(`   Environment: ${healthResponse.data.environment || 'Unknown'}\n`);
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
    console.log('');
  }

  // Test properties endpoint without CORS first
  try {
    console.log('🏠 Testing properties endpoint (direct call)...');
    const directResponse = await axios.get(`${baseURL}/api/properties?limit=12&page=1`, { 
      timeout: 15000,
      validateStatus: () => true // Accept any status code
    });
    
    console.log(`   Status: ${directResponse.status}`);
    if (directResponse.status === 200) {
      console.log(`✅ Properties endpoint working`);
      console.log(`   Properties count: ${directResponse.data?.data?.properties?.length || 0}`);
      console.log(`   Total: ${directResponse.data?.data?.pagination?.totalProperties || 0}`);
    } else {
      console.log(`❌ Properties endpoint error`);
      console.log(`   Response:`, JSON.stringify(directResponse.data, null, 2));
    }
    console.log('');
  } catch (error) {
    console.log(`❌ Properties endpoint failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
    console.log(`   Error code: ${error.code}`);
    console.log('');
  }

  // Test CORS for each origin
  for (const origin of frontendOrigins) {
    try {
      console.log(`📍 Testing CORS for origin: ${origin}`);
      
      // Test preflight OPTIONS request
      const optionsResponse = await axios({
        method: 'OPTIONS',
        url: `${baseURL}/api/properties`,
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        },
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log(`   OPTIONS Status: ${optionsResponse.status}`);
      console.log(`   Access-Control-Allow-Origin: ${optionsResponse.headers['access-control-allow-origin']}`);
      console.log(`   Access-Control-Allow-Methods: ${optionsResponse.headers['access-control-allow-methods']}`);
      
      // Test actual GET request
      const getResponse = await axios({
        method: 'GET',
        url: `${baseURL}/api/properties?limit=1`,
        headers: {
          'Origin': origin,
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        validateStatus: () => true
      });
      
      if (getResponse.status === 200) {
        console.log(`✅ GET request successful for ${origin}`);
        console.log(`   Properties returned: ${getResponse.data?.data?.properties?.length || 0}`);
      } else {
        console.log(`❌ GET request failed for ${origin}`);
        console.log(`   Status: ${getResponse.status}`);
        console.log(`   Response:`, getResponse.data);
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ Failed for origin ${origin}:`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Response data:`, error.response.data);
      } else {
        console.log(`   Error: ${error.message}`);
        console.log(`   Code: ${error.code}`);
      }
      console.log('');
    }
  }
};

// Run test if this file is executed directly
if (require.main === module) {
  testCORS().catch(console.error);
}

module.exports = testCORS;
