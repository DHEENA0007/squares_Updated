require('dotenv').config();
const axios = require('axios');

async function testVendorAPI() {
  try {
    console.log('🔐 Testing vendor login and API access...');
    
    // Step 1: Login
    console.log('\n1. Attempting login...');
    const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'vendor1@ninetyneacres.com',
      password: 'vendor@123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.message);
    }
    
    console.log('✅ Login successful!');
    console.log('   User ID:', loginResponse.data.data.user.id);
    console.log('   User role:', loginResponse.data.data.user.role);
    console.log('   Token length:', loginResponse.data.data.token.length);
    
    const token = loginResponse.data.data.token;
    
    // Step 2: Test vendor dashboard
    console.log('\n2. Testing vendor dashboard...');
    try {
      const dashboardResponse = await axios.get('http://localhost:8000/api/vendors/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Dashboard accessible!');
      console.log('   Total properties:', dashboardResponse.data.data.stats.totalProperties);
    } catch (error) {
      console.log('❌ Dashboard error:', error.response?.data?.message || error.message);
    }
    
    // Step 3: Test vendor properties
    console.log('\n3. Testing vendor properties...');
    try {
      const propertiesResponse = await axios.get('http://localhost:8000/api/vendors/properties', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Properties endpoint accessible!');
      console.log('   Properties found:', propertiesResponse.data.data?.properties?.length || 0);
      console.log('   Pagination:', propertiesResponse.data.data?.pagination || 'No pagination data');
    } catch (error) {
      console.log('❌ Properties error:', error.response?.data?.message || error.message);
    }
    
    // Step 4: Test vendor stats
    console.log('\n4. Testing vendor statistics...');
    try {
      const statsResponse = await axios.get('http://localhost:8000/api/vendors/statistics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Statistics accessible!');
      console.log('   Stats:', JSON.stringify(statsResponse.data.data, null, 2));
    } catch (error) {
      console.log('❌ Statistics error:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server is not running. Please start the server with:');
      console.log('   cd server && npm start');
    }
  }
}

testVendorAPI();