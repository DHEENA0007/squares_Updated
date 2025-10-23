const mongoose = require('mongoose');
const Plan = require('../models/Plan');
require('dotenv').config();

const { connectDB } = require('../config/database');

async function testPaymentEndpoint() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Get a sample plan ID
    const plan = await Plan.findOne();
    if (!plan) {
      console.log('No plans found. Creating a test plan...');
      const testPlan = new Plan({
        name: 'Test Plan',
        description: 'Test plan for API testing',
        price: 999,
        currency: 'INR',
        billingPeriod: 'monthly',
        features: ['Test Feature'],
        isActive: true
      });
      await testPlan.save();
      console.log('Test plan created:', testPlan._id);
    } else {
      console.log('Found plan:', {
        id: plan._id,
        name: plan.name,
        price: plan.price,
        isActive: plan.isActive
      });
    }

    // Test API endpoint manually
    const { default: fetch } = await import('node-fetch');
    
    // First, login to get a token
    const loginResponse = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'vendor@ninetyneacres.com',
        password: 'vendor123'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', { success: loginData.success, token: !!loginData.data?.token });

    if (loginData.success && loginData.data?.token) {
      // Test payment endpoint
      const planToTest = plan || await Plan.findOne();
      const paymentResponse = await fetch('http://localhost:8000/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.data.token}`
        },
        body: JSON.stringify({
          planId: planToTest._id.toString(),
          billingCycle: 'monthly'
        })
      });

      const paymentData = await paymentResponse.json();
      console.log('Payment response:', {
        status: paymentResponse.status,
        success: paymentData.success,
        message: paymentData.message,
        hasData: !!paymentData.data
      });
    }

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testPaymentEndpoint();
