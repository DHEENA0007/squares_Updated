# Email Configuration Guide - BuildHomeMart Squares

This application is configured to use **support@buildhomemartsquares.com** as the primary email address for all communications with customers and vendors.

## 🚀 Quick Start

Your email system is **already configured** and ready to use! Just follow these 2 simple steps:

1. **Update Password**: Replace `SMTP_PASS` in `/server/.env` with your actual Hostinger password
2. **Test Functionality**: Use the admin panel to test email delivery

## 📧 Current Configuration

### SMTP Settings (Hostinger)
- **SMTP Server**: smtp.hostinger.com
- **Port**: 587 (TLS)
- **Email Address**: support@buildhomemartsquares.com
- **Security**: TLS encryption enabled

### Environment Variables
Located in `/server/.env`:
```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=support@buildhomemartsquares.com
SMTP_PASS=your_actual_hostinger_email_password_here  # ← UPDATE THIS
```

## 📋 Available Email Templates

Your application includes 6 professionally designed email templates:

| Template | Purpose | Trigger | Recipients |
|----------|---------|---------|------------|
| `welcome` | User registration | New account created | New customers |
| `password-reset` | Password recovery | Reset requested | All users |
| `vendor-welcome` | Vendor onboarding | Vendor approved | New vendors |
| `customer-booking-confirmation` | Booking success | Service booked | Customers |
| `service-status-update` | Status changes | Service updated | Customers |
| `weekly-report` | Analytics | Weekly schedule | Administrators |

## 🛠️ Setup and Testing

### Step 1: Update SMTP Password
```bash
# Edit your .env file
nano /server/.env

# Update this line with your actual password
SMTP_PASS=your_actual_hostinger_password
```

### Step 2: Test Email System
1. **Access Admin Panel**: Navigate to `Admin Settings → Integration Settings`
2. **Email Testing Section**: Scroll to "Email Testing & Management"
3. **Test Connection**: Click the connection test button
4. **Send Test Email**: 
   - Enter your email address
   - Select a template (try "welcome" first)
   - Click "Send Test Email"
5. **Check Statistics**: View delivery stats in real-time

### Step 3: Verify Email Delivery
- ✅ Check your inbox for the test email
- ✅ Verify email formatting and branding
- ✅ Test with different email providers (Gmail, Outlook, Yahoo)
- ✅ Check spam folders (initially common)

## 💻 Development Usage

### Send Individual Emails
```javascript
const { sendTemplateEmail } = require('./utils/emailService');

// Welcome new user
await sendTemplateEmail('user@example.com', 'welcome', {
  userName: 'John Doe',
  activationLink: 'https://buildhomemartsquares.com/activate?token=abc123'
});

// Booking confirmation
await sendTemplateEmail('customer@example.com', 'customer-booking-confirmation', {
  customerName: 'Jane Smith',
  serviceName: 'Home Cleaning',
  providerName: 'CleanPro Services',
  bookingDate: '2024-01-15',
  bookingTime: '10:00 AM',
  amount: '2500',
  bookingId: 'BK123456789',
  dashboardLink: 'https://buildhomemartsquares.com/customer/dashboard'
});
```

### Send Bulk Emails
```javascript
const recipients = [
  { 
    email: 'vendor1@example.com', 
    customData: { vendorName: 'Vendor One' }
  },
  { 
    email: 'vendor2@example.com', 
    customData: { vendorName: 'Vendor Two' }
  }
];

await sendBulkEmails(recipients, 'vendor-welcome', {
  dashboardLink: 'https://buildhomemartsquares.com/vendor/dashboard'
});
```

## 🔌 Admin API Endpoints

Complete email management through REST API:

| Endpoint | Method | Purpose | Authentication |
|----------|---------|---------|----------------|
| `/api/admin/email/test-connection` | GET | Test SMTP connection | Admin only |
| `/api/admin/email/stats` | GET | Get email statistics | Admin only |
| `/api/admin/email/send-test` | POST | Send test email | Admin only |
| `/api/admin/email/templates` | GET | List available templates | Admin only |
| `/api/admin/email/send-bulk` | POST | Send bulk notifications | Admin only |

### API Usage Examples
```bash
# Test connection
curl -X GET https://your-domain.com/api/admin/email/test-connection 
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Send test email
curl -X POST https://your-domain.com/api/admin/email/send-test 
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" 
  -H "Content-Type: application/json" 
  -d '{"to": "test@example.com", "templateName": "welcome"}'

# Get statistics
curl -X GET https://your-domain.com/api/admin/email/stats 
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 📊 Monitoring and Analytics

### Real-time Statistics
- **Sent Count**: Total emails successfully delivered
- **Failed Count**: Total emails that failed to send
- **Success Rate**: Percentage calculation
- **Recent Activity**: Last 24 hours performance

### Admin Dashboard Features
- 🔍 **Connection Testing**: Verify SMTP connectivity
- 📧 **Template Testing**: Send test emails with sample data
- 📈 **Performance Metrics**: Track delivery success rates
- 🚨 **Error Monitoring**: Real-time failure notifications

## 🔧 Troubleshooting Guide

### Common Issues and Solutions

#### ❌ "Connection Refused"
**Problem**: Cannot connect to SMTP server
**Solutions**:
- Verify SMTP server: `smtp.hostinger.com`
- Check port: `587`
- Ensure internet connectivity
- Verify firewall settings

#### ❌ "Authentication Failed"
**Problem**: Login credentials rejected
**Solutions**:
- Verify email: `support@buildhomemartsquares.com`
- Update password in `.env` file
- Check if 2FA is enabled on Hostinger
- Confirm SMTP access is enabled in Hostinger panel

#### ❌ "Emails Going to Spam"
**Problem**: Emails delivered to spam folder
**Solutions**:
- Add SPF record: `v=spf1 include:_spf.hostinger.com ~all`
- Configure DKIM in Hostinger panel
- Use consistent sender address
- Avoid spam trigger words in subject lines

#### ❌ "Template Not Found"
**Problem**: Email template doesn't exist
**Solutions**:
- Check available templates: `welcome`, `password-reset`, `vendor-welcome`, etc.
- Verify template name spelling
- Use `/api/admin/email/templates` to list all templates

### Debug Commands
```bash
# Check email service logs
tail -f logs/email.log

# Test SMTP connection manually
telnet smtp.hostinger.com 587

# Verify environment variables
echo $SMTP_USER
echo $SMTP_HOST
```

## 🎨 Template Customization

### Modifying Templates
Templates are in `/server/utils/emailService.js`:

```javascript
// Example: Customizing welcome template
'welcome': (data) => ({
  subject: `Welcome to BuildHomeMart Squares - ${data.userName}!`,
  html: `
    <!-- Your custom HTML here -->
    <div style="font-family: Arial, sans-serif;">
      <h1>Welcome ${data.userName}!</h1>
      <!-- More customization -->
    </div>
  `
})
```

### Design Guidelines
- ✅ Use inline CSS for maximum compatibility
- ✅ Include unsubscribe links where required  
- ✅ Test across email clients (Gmail, Outlook, Apple Mail)
- ✅ Maintain consistent branding
- ✅ Ensure mobile responsiveness

## 🔐 Security Best Practices

### Email Security
- 🔒 Store SMTP credentials in environment variables only
- 🔒 Use TLS encryption (already configured)
- 🔒 Implement rate limiting for bulk emails
- 🔒 Validate recipient email addresses
- 🔒 Monitor for suspicious sending patterns

### Data Protection
- 📝 Log email activities (without sensitive content)
- 🚫 Never log passwords or personal data
- ✅ Use secure token-based authentication
- ✅ Implement proper error handling

## 🚀 Production Deployment

### Pre-deployment Checklist
- [ ] SMTP password updated in production `.env`
- [ ] Email templates tested with real data
- [ ] SPF/DKIM records configured
- [ ] Error logging properly configured
- [ ] Rate limiting implemented
- [ ] Admin panel email testing works

### Monitoring in Production
- 📊 Set up email delivery monitoring
- 🚨 Configure alerts for high failure rates
- 📈 Track bounce and complaint rates
- 🔍 Monitor server logs for email errors

## 📞 Support Resources

### For Email Issues:
1. **Check Admin Panel**: Use email testing tools
2. **Review Server Logs**: Look for error patterns  
3. **Verify Hostinger Status**: Check account standing
4. **Test Connectivity**: Use connection test feature

### Contact Information:
- **Application Email**: support@buildhomemartsquares.com
- **SMTP Provider**: Hostinger Support
- **Error Logs**: Check `/logs/email.log`

---

## ✅ Ready to Use!

Your email system is **production-ready** with:
- ✅ Professional SMTP configuration (Hostinger)
- ✅ 6 pre-built email templates  
- ✅ Admin testing and monitoring tools
- ✅ Bulk email capabilities
- ✅ Comprehensive error handling
- ✅ Security best practices implemented

**Next Step**: Update the SMTP password and start sending emails! 🎉
