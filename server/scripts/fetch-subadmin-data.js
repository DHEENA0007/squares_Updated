require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const CREDENTIALS = {
  email: 'admin@buildhomemart.com',
  password: 'Admin@123'
};

let authToken = '';

async function login() {
  console.log('🔐 Logging in...\n');
  
  const response = await axios.post(`${BASE_URL}/auth/login`, CREDENTIALS);
  
  if (response.data.success && response.data.data.token) {
    authToken = response.data.data.token;
    console.log('✅ Login successful');
    console.log(`   Role: ${response.data.data.user.role}\n`);
    return true;
  }
  
  return false;
}

async function fetchData(endpoint, description) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 ${description}`);
  console.log('='.repeat(70));
  
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log(JSON.stringify(response.data.data, null, 2));
      return response.data.data;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }
}

async function fetchAllData() {
  console.log('\n🚀 FETCHING SUBADMIN PORTAL DATA');
  console.log('='.repeat(70));
  
  if (!await login()) {
    console.log('❌ Login failed');
    return;
  }
  
  // Dashboard Stats
  await fetchData('/subadmin/dashboard', 'DASHBOARD STATISTICS');
  
  // Pending Properties
  const pendingProps = await fetchData(
    '/subadmin/properties/pending?page=1&limit=100',
    'PENDING PROPERTIES (Page 1)'
  );
  
  // Support Tickets - Open
  await fetchData(
    '/subadmin/support/tickets?page=1&limit=50&status=open',
    'OPEN SUPPORT TICKETS'
  );
  
  // Support Tickets - All
  await fetchData(
    '/subadmin/support/tickets?page=1&limit=50&status=all',
    'ALL SUPPORT TICKETS'
  );
  
  // Vendor Performance
  await fetchData(
    '/subadmin/vendors/performance',
    'VENDOR PERFORMANCE METRICS'
  );
  
  // Content Reports
  await fetchData(
    '/subadmin/content/reports',
    'CONTENT MODERATION REPORTS'
  );
  
  // Pending Promotions
  await fetchData(
    '/subadmin/promotions/pending',
    'PENDING PROMOTIONS'
  );
  
  // City Reports
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'];
  
  for (const city of cities) {
    await fetchData(
      `/subadmin/reports/city/${city}`,
      `REPORT FOR ${city.toUpperCase()}`
    );
  }
  
  // Detailed City Report with Date Range
  const startDate = '2024-01-01';
  const endDate = new Date().toISOString().split('T')[0];
  
  await fetchData(
    `/subadmin/reports/city/Bangalore?startDate=${startDate}&endDate=${endDate}`,
    `DETAILED BANGALORE REPORT (${startDate} to ${endDate})`
  );
  
  console.log('\n\n✅ DATA FETCH COMPLETED\n');
}

fetchAllData().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
