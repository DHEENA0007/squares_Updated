#!/usr/bin/env node

// Test email configuration with Resend
require('dotenv').config();
const { sendEmail, testEmailConnection, sendTemplateEmail } = require('../utils/emailService');

async function testEmailConfiguration() {
  console.log('🧪 Testing BuildHomeMart Squares Email Configuration (Resend)');
  console.log('==========================================================\n');

  // Test Resend connection
  console.log('1. Testing Resend Connection...');
  try {
    const connectionResult = await testEmailConnection();
    if (connectionResult.success) {
      console.log('✅ Resend Connection successful');
    } else {
      console.log('❌ Resend Connection failed:', connectionResult.error);
      return;
    }
  } catch (error) {
    console.log('❌ Resend Connection error:', error.message);
    return;
  }

  console.log('\n2. Current Configuration:');
  console.log(`   Service: Resend`);
  console.log(`   API Key: ${process.env.RESEND_API_KEY ? '✓ Set' : '❌ Not set'}`);
  console.log(`   From Email: ${process.env.EMAIL_FROM || 'onboarding@resend.dev'}`);

  // Test sending a simple email
  console.log('\n3. Testing Simple Email...');
  try {
    const testEmail = {
      to: 'ddd732443@gmail.com', // Test email address
      subject: 'BuildHomeMart Squares - Email Configuration Test',
      html: `
        <h2>Email Configuration Test</h2>
        <p>This is a test email to verify the Resend configuration is working correctly.</p>
        <p><strong>Configuration Details:</strong></p>
        <ul>
          <li>Service: Resend</li>
          <li>From: ${process.env.EMAIL_FROM || 'onboarding@resend.dev'}</li>
          <li>Test Time: ${new Date().toISOString()}</li>
        </ul>
        <p>If you received this email, the configuration is working correctly!</p>
        <hr>
        <p><small>BuildHomeMart Squares - Email Service Test</small></p>
      `
    };

    const result = await sendEmail(testEmail);
    if (result.success) {
      console.log('✅ Test email sent successfully');
      console.log(`   Message ID: ${result.messageId}`);
    } else {
      console.log('❌ Test email failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Test email error:', error.message);
  }

  // Test template email
  console.log('\n4. Testing Template Email (OTP Verification)...');
  try {
    const templateResult = await sendTemplateEmail(
      'ddd732443@gmail.com', // Test email address
      'otp-verification',
      {
        firstName: 'Test User',
        otpCode: '123456',
        expiryMinutes: 10
      }
    );

    if (templateResult.success) {
      console.log('✅ Template email sent successfully');
      console.log(`   Message ID: ${templateResult.messageId}`);
    } else {
      console.log('❌ Template email failed:', templateResult.error);
    }
  } catch (error) {
    console.log('❌ Template email error:', error.message);
  }

  console.log('\n✅ Email configuration testing completed!');
  console.log('\n📧 Email Settings Summary:');
  console.log('   • Service: Resend');
  console.log('   • API Key: re_Lw3kDf93_FmnQPRSGpWeGejkXPkvF5iWb');
  console.log('   • From Email: onboarding@resend.dev');
  console.log('\nNote: Resend provides reliable email delivery with built-in analytics.');
}

// Run the test
testEmailConfiguration().catch(console.error);
