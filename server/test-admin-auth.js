// Test admin login and subscription access
const testAdminAuth = async () => {
  const API_BASE = 'http://localhost:8000/api';
  
  try {
    console.log('🔐 Testing admin login...');
    
    // Login as admin
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@ninetyneacres.com',
        password: 'Admin@123456'
      }),
    });

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status, loginResponse.statusText);
      const errorData = await loginResponse.json().catch(() => ({}));
      console.error('Error details:', errorData);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful!');
    console.log('User:', loginData.data?.user?.email, 'Role:', loginData.data?.user?.role);
    
    const token = loginData.data?.token;
    if (!token) {
      console.error('❌ No token received');
      return;
    }

    console.log('\n📊 Testing subscriptions endpoint...');
    
    // Test subscriptions endpoint
    const subscriptionsResponse = await fetch(`${API_BASE}/subscriptions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!subscriptionsResponse.ok) {
      console.error('❌ Subscriptions request failed:', subscriptionsResponse.status, subscriptionsResponse.statusText);
      const errorData = await subscriptionsResponse.json().catch(() => ({}));
      console.error('Error details:', errorData);
      return;
    }

    const subscriptionsData = await subscriptionsResponse.json();
    console.log('✅ Subscriptions endpoint accessible!');
    console.log('Response:', JSON.stringify(subscriptionsData, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testAdminAuth();
