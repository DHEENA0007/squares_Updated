#!/usr/bin/env node

// Test email configuration with the new SMTP settings
require('dotenv').config();
const { sendEmail, testEmailConnection, sendTemplateEmail } = require('../utils/emailService');

async function testEmailConfiguration() {
  console.log('🧪 Testing BuildHomeMart Squares Email Configuration');
  console.log('===================================================\n');

  // Test SMTP connection
  console.log('1. Testing SMTP Connection...');
  try {
    const connectionResult = await testEmailConnection();
    if (connectionResult.success) {
      console.log('✅ SMTP Connection successful');
    } else {
      console.log('❌ SMTP Connection failed:', connectionResult.error);
      return;
    }
  } catch (error) {
    console.log('❌ SMTP Connection error:', error.message);
    return;
  }

  console.log('\n2. Current Configuration:');
  console.log(`   Host: ${process.env.SMTP_HOST}`);
  console.log(`   Port: ${process.env.SMTP_PORT}`);
  console.log(`   Secure: ${process.env.SMTP_SECURE}`);
  console.log(`   User: ${process.env.SMTP_USER}`);
  console.log(`   Password: ${process.env.SMTP_PASS ? '✓ Set' : '❌ Not set'}`);

  // Test sending a simple email
  console.log('\n3. Testing Simple Email...');
  try {
    const testEmail = {
      to: 'test@buildhomemartsquares.com', // You can change this to your test email
      subject: 'BuildHomeMart Squares - Email Configuration Test',
      html: `
        <h2>Email Configuration Test</h2>
        <p>This is a test email to verify the SMTP configuration is working correctly.</p>
        <p><strong>Configuration Details:</strong></p>
        <ul>
          <li>Host: ${process.env.SMTP_HOST}</li>
          <li>Port: ${process.env.SMTP_PORT}</li>
          <li>Secure: ${process.env.SMTP_SECURE}</li>
          <li>From: ${process.env.SMTP_USER}</li>
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
      'test@buildhomemartsquares.com', // You can change this to your test email
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
  console.log('   • SMTP Host: smtp.hostinger.com');
  console.log('   • SMTP Port: 465 (Secure SSL/TLS)');
  console.log('   • Username: support@buildhomemartsquares.com');
  console.log('   • Password: Sprt123@7');
  console.log('\nNote: Make sure to update the test email address before running this script.');
}

// Run the test
testEmailConfiguration().catch(console.error);
