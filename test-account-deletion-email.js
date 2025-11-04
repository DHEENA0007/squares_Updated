require('dotenv').config();
const { sendTemplateEmail } = require('./server/utils/emailService');

// Test the account deletion email template
async function testAccountDeletionEmail() {
  console.log('🧪 Testing Account Deletion Email Template...\n');

  const testData = {
    firstName: 'John',
    email: 'john.doe@example.com',
    role: 'customer',
    deletionDate: new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    reason: 'Account deleted by administrator due to policy violation',
    websiteUrl: process.env.FRONTEND_URL || 'https://buildhomemartsquares.com'
  };

  try {
    // Send test email
    const result = await sendTemplateEmail(
      'test@buildhomemartsquares.com', // Replace with your test email
      'account-deleted',
      testData
    );

    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Recipient: test@buildhomemartsquares.com`);
      console.log('   Template: account-deleted');
    } else {
      console.log('❌ Test email failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
  }
}

// Run the test
testAccountDeletionEmail();
