const express = require('express');
const router = express.Router();
const { 
  sendTemplateEmail, 
  testEmailConnection, 
  getEmailStats,
  emailTemplates 
} = require('../../utils/emailService');
const auth = require('../../middleware/auth');
const { isAdmin } = require('../../middleware/roles');

// Test email connection
router.get('/test-connection', auth, isAdmin, async (req, res) => {
  try {
    const result = await testEmailConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test email connection',
      details: error.message 
    });
  }
});

// Get email statistics
router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    const stats = getEmailStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get email stats',
      details: error.message 
    });
  }
});

// Send test email
router.post('/send-test', auth, isAdmin, async (req, res) => {
  try {
    const { to, templateName, testData } = req.body;

    if (!to || !templateName) {
      return res.status(400).json({
        success: false,
        error: 'Email address and template name are required'
      });
    }

    // Default test data for different templates
    const defaultTestData = {
      'welcome': {
        userName: 'Test User',
        activationLink: 'https://buildhomemartsquares.com/activate?token=test123'
      },
      'password-reset': {
        userName: 'Test User',
        resetLink: 'https://buildhomemartsquares.com/reset?token=test123'
      },
      'vendor-welcome': {
        vendorName: 'Test Vendor',
        dashboardLink: 'https://buildhomemartsquares.com/vendor/dashboard'
      },
      'customer-booking-confirmation': {
        customerName: 'Test Customer',
        serviceName: 'Home Cleaning Service',
        providerName: 'Test Provider',
        bookingDate: new Date().toLocaleDateString('en-IN'),
        bookingTime: '10:00 AM',
        amount: '1500',
        bookingId: 'BK123456789',
        dashboardLink: 'https://buildhomemartsquares.com/customer/bookings'
      },
      'service-status-update': {
        serviceTitle: 'Home Cleaning Service',
        status: 'In Progress',
        statusColor: '#059669',
        providerName: 'Test Provider',
        message: 'Your service provider is on the way and will arrive within 30 minutes.',
        dashboardLink: 'https://buildhomemartsquares.com/customer/bookings'
      },
      'weekly-report': {
        weekRange: 'Jan 15 - Jan 21, 2024',
        newUsers: '45',
        newBookings: '128',
        revenue: '85,000',
        newVendors: '12',
        dashboardLink: 'https://buildhomemartsquares.com/admin/reports'
      }
    };

    const emailData = testData || defaultTestData[templateName] || {};

    const result = await sendTemplateEmail(to, templateName, emailData);

    if (result.success) {
      res.json({
        success: true,
        message: `Test email sent successfully to ${to}`,
        messageId: result.messageId
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to send test email',
        details: result.error
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      details: error.message
    });
  }
});

// Get available email templates
router.get('/templates', auth, isAdmin, async (req, res) => {
  try {
    const templates = Object.keys(emailTemplates).map(key => ({
      name: key,
      displayName: key.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    }));

    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get email templates',
      details: error.message
    });
  }
});

// Send bulk notification emails
router.post('/send-bulk', auth, isAdmin, async (req, res) => {
  try {
    const { recipients, templateName, data } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipients array is required'
      });
    }

    if (!templateName) {
      return res.status(400).json({
        success: false,
        error: 'Template name is required'
      });
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      try {
        const result = await sendTemplateEmail(
          recipient.email, 
          templateName, 
          { ...data, ...recipient.customData }
        );
        
        results.push({ 
          email: recipient.email, 
          success: result.success,
          messageId: result.messageId 
        });

        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }

        // Add small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        results.push({ 
          email: recipient.email, 
          success: false, 
          error: error.message 
        });
        failCount++;
      }
    }

    res.json({
      success: true,
      message: `Bulk email completed: ${successCount} sent, ${failCount} failed`,
      results: results,
      summary: {
        total: recipients.length,
        sent: successCount,
        failed: failCount
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk emails',
      details: error.message
    });
  }
});

module.exports = router;
