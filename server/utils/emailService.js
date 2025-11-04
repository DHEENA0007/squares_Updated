// Email service for BuildHomeMart Squares
const nodemailer = require('nodemailer');

// SMTP Configuration - Use environment variables for flexibility  
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: process.env.SMTP_PORT || 465,
  secure: process.env.SMTP_SECURE === 'true' || true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'support@buildhomemartsquares.com',
    pass: process.env.SMTP_PASS || 'Sprt123@7'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server Ready for email delivery');
  }
});

// Email delivery status tracking
const emailLog = {
  sent: 0,
  failed: 0,
  getStats: () => ({ sent: emailLog.sent, failed: emailLog.failed })
};

// Email templates
const emailTemplates = {
  'email-verification': (data) => ({
    subject: 'Verify Your Email - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Your Premium Real Estate Partner</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">Welcome ${data.firstName}!</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
            Thank you for signing up with BuildHomeMart Squares. To complete your registration and start exploring premium properties, please verify your email address.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.verificationLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">
            This link will expire in 24 hours. If you didn't create an account, please ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Email: support@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  'password-reset': (data) => ({
    subject: 'Reset Your Password - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Secure Password Reset</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">Password Reset Request</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.firstName}, we received a request to reset your password for your BuildHomeMart Squares account.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetLink}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Reset My Password
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">
            <strong>Security Info:</strong> This link expires in 1 hour. If you didn't request this reset, please ignore this email - your account remains secure.
          </p>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Need help? Contact us at help@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  // New template for password change confirmation (not reset)
  'password-changed': (data) => ({
    subject: 'Password Successfully Changed - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Account Security Alert</p>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #166534; margin: 0 0 20px 0;">✅ Password Changed Successfully</h2>
          <p style="color: #166534; line-height: 1.6; margin: 0 0 15px 0;">
            Hello ${data.firstName}, your account password was successfully changed on ${data.changeDate}.
          </p>
          <p style="color: #166534; line-height: 1.6; margin: 0;">
            If you made this change, no action is needed. If you did not change your password, please secure your account immediately.
          </p>
        </div>

        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <p style="color: #991b1b; margin: 0; font-size: 14px;">
            <strong>Didn't make this change?</strong> Contact our security team immediately at security@buildhomemartsquares.com
          </p>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Security Team: security@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  'property-inquiry': (data) => ({
    subject: `New Inquiry for ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Ninety Nine Acres</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Property Inquiry Notification</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">New Property Inquiry</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 15px 0;">
            You have received a new inquiry for your property: <strong>${data.propertyTitle}</strong>
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">Inquiry Details:</h3>
            <p style="margin: 5px 0;"><strong>From:</strong> ${data.inquirerName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${data.inquirerEmail}</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${data.inquirerPhone}</p>
            <p style="margin: 15px 0 5px 0;"><strong>Message:</strong></p>
            <p style="color: #475569; background: #f1f5f9; padding: 15px; border-radius: 4px; margin: 5px 0;">${data.message}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              View in Dashboard
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 Ninety Nine Acres. All rights reserved.</p>
        </div>
      </div>
    `
  }),

  'service-status-update': (data) => ({
    subject: `Service Request Update - ${data.serviceTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Service Request Update</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">Service Request Update</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 15px 0;">
            Your service request "<strong>${data.serviceTitle}</strong>" has been updated.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${data.statusColor};">${data.status}</span></p>
            <p style="margin: 5px 0;"><strong>Provider:</strong> ${data.providerName}</p>
            ${data.message ? `<p style="margin: 15px 0 5px 0;"><strong>Update:</strong></p><p style="color: #475569; background: #f1f5f9; padding: 15px; border-radius: 4px; margin: 5px 0;">${data.message}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              View Details
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Email: support@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  'vendor-welcome': (data) => ({
    subject: 'Welcome to BuildHomeMart Squares - Vendor Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Vendor Partner Program</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">Welcome ${data.vendorName}!</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
            Congratulations! Your vendor account has been approved. You can now start offering your services to customers on BuildHomeMart Squares.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">Next Steps:</h3>
            <ul style="color: #475569; line-height: 1.6; padding-left: 20px;">
              <li>Complete your vendor profile</li>
              <li>Add your services and pricing</li>
              <li>Upload portfolio images</li>
              <li>Set your availability</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Access Vendor Dashboard
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Email: support@buildhomemartsquares.com | Phone: +91-XXXXXXXXXX</p>
        </div>
      </div>
    `
  }),

  'customer-booking-confirmation': (data) => ({
    subject: `Booking Confirmed - ${data.serviceName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Booking Confirmation</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">Booking Confirmed!</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
            Hi ${data.customerName}, your booking for "<strong>${data.serviceName}</strong>" has been confirmed.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">Booking Details:</h3>
            <p style="margin: 5px 0;"><strong>Service:</strong> ${data.serviceName}</p>
            <p style="margin: 5px 0;"><strong>Provider:</strong> ${data.providerName}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${data.bookingDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${data.bookingTime}</p>
            <p style="margin: 5px 0;"><strong>Amount:</strong> ₹${data.amount}</p>
            <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${data.bookingId}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              View Booking Details
            </a>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>Important:</strong> The service provider will contact you within 24 hours to confirm the appointment.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Email: support@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  // OTP Verification Template
  'otp-verification': (data) => ({
    subject: 'Verify Your Email - OTP Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Email Verification Required</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">Verify Your Email Address</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 25px 0;">
            Hello ${data.firstName}, welcome to BuildHomeMart Squares! Use the verification code below to complete your registration:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px; display: inline-block; font-family: 'Courier New', monospace;">
              <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Your verification code:</div>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${data.otpCode}</div>
            </div>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0; text-align: center;">
            <strong>Important:</strong> This code expires in ${data.expiryMinutes} minutes. Don't share this code with anyone.
          </p>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Having trouble? Contact support@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  // Login Alert Template
  'login-alert': (data) => ({
    subject: 'New Login to Your Account - Security Alert',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Account Security Alert</p>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #92400e; margin: 0 0 20px 0;">🔐 New Login Detected</h2>
          <p style="color: #92400e; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.firstName}, we detected a new login to your account:
          </p>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p style="margin: 5px 0; color: #374151;"><strong>Date & Time:</strong> ${data.loginDate}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Device:</strong> ${data.device || 'Unknown Device'}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Location:</strong> ${data.location || 'Unknown Location'}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>IP Address:</strong> ${data.ipAddress}</p>
          </div>
          
          <p style="color: #92400e; font-size: 14px; margin: 15px 0 0 0;">
            If this was you, no action is needed. If you don't recognize this login, secure your account immediately.
          </p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${data.secureAccountLink}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Secure My Account
          </a>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Security Team: security@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  'password-change-otp': (data) => ({
    subject: 'Password Change Verification - OTP Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Secure Password Change</p>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #92400e; margin: 0 0 20px 0;">🔒 Password Change Request</h2>
          <p style="color: #92400e; line-height: 1.6; margin: 0 0 25px 0;">
            Hello ${data.firstName}, you've requested to change your password. For your security, please verify this request with the OTP below:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px; display: inline-block; font-family: 'Courier New', monospace;">
              <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Your verification code:</div>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${data.otpCode}</div>
            </div>
          </div>
          
          <p style="color: #92400e; font-size: 14px; margin: 20px 0 0 0; text-align: center;">
            <strong>Security Notice:</strong> This OTP expires in ${data.expiryMinutes} minutes. If you didn't request this password change, please secure your account immediately.
          </p>
        </div>

        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <p style="color: #991b1b; margin: 0; font-size: 14px; text-align: center;">
            <strong>Didn't request this?</strong> Please contact our security team immediately at security@buildhomemartsquares.com
          </p>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Security Team: security@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  'weekly-report': (data) => ({
    subject: `Weekly Report - BuildHomeMart Squares (${data.weekRange})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Weekly Performance Report</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">Week of ${data.weekRange}</h2>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0;">
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
              <h3 style="color: #2563eb; margin: 0; font-size: 24px;">${data.newUsers}</h3>
              <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">New Users</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
              <h3 style="color: #059669; margin: 0; font-size: 24px;">${data.newBookings}</h3>
              <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">New Bookings</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
              <h3 style="color: #dc2626; margin: 0; font-size: 24px;">₹${data.revenue}</h3>
              <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Revenue</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
              <h3 style="color: #7c3aed; margin: 0; font-size: 24px;">${data.newVendors}</h3>
              <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">New Vendors</p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              View Full Report
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Email: support@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  // Welcome template for regular customers
  'welcome': (data) => ({
    subject: 'Welcome to BuildHomeMart Squares!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Your Premium Real Estate Partner</p>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #166534; margin: 0 0 20px 0;">🎉 Welcome ${data.firstName}!</h2>
          <p style="color: #166534; line-height: 1.6; margin: 0 0 20px 0;">
            Thank you for joining BuildHomeMart Squares! Your account has been successfully created and verified. You now have access to premium properties and services.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">What's Next?</h3>
            <ul style="color: #475569; line-height: 1.6; padding-left: 20px; margin: 0;">
              <li>Explore premium properties in your area</li>
              <li>Set up property alerts and preferences</li>
              <li>Connect with verified real estate agents</li>
              <li>Access exclusive deals and offers</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Start Exploring Properties
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Need help? Contact us at support@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  })
};

// Send email function
const sendEmail = async (options) => {
  try {
    // Verify connection configuration
    await transporter.verify();

    // Determine sender based on email type
    const getSenderInfo = (template) => {
      const senders = {
        'otp-verification': { name: 'BuildHomeMart Verification', email: 'verify@buildhomemartsquares.com' },
        'email-verification': { name: 'BuildHomeMart Verification', email: 'verify@buildhomemartsquares.com' },
        'password-reset': { name: 'BuildHomeMart Security', email: 'security@buildhomemartsquares.com' },
        'password-changed': { name: 'BuildHomeMart Security', email: 'security@buildhomemartsquares.com' },
        'login-alert': { name: 'BuildHomeMart Security', email: 'security@buildhomemartsquares.com' },
        'property-inquiry': { name: 'BuildHomeMart Notifications', email: 'notifications@buildhomemartsquares.com' },
        'vendor-welcome': { name: 'BuildHomeMart Partners', email: 'partners@buildhomemartsquares.com' },
        'welcome': { name: 'BuildHomeMart Welcome', email: 'welcome@buildhomemartsquares.com' },
        'customer-booking-confirmation': { name: 'BuildHomeMart Bookings', email: 'bookings@buildhomemartsquares.com' },
        'service-status-update': { name: 'BuildHomeMart Services', email: 'services@buildhomemartsquares.com' },
        'weekly-report': { name: 'BuildHomeMart Reports', email: 'reports@buildhomemartsquares.com' },
        default: { name: 'BuildHomeMart Squares', email: process.env.SMTP_USER || 'support@buildhomemartsquares.com' }
      };
      return senders[template] || senders.default;
    };

    const sender = getSenderInfo(options.template);
    
    let mailOptions = {
      from: `"${sender.name}" <${process.env.SMTP_USER || sender.email}>`,
      to: options.to,
      subject: options.subject,
      replyTo: options.replyTo || 'support@buildhomemartsquares.com'
    };

    // Use template if provided
    if (options.template && emailTemplates[options.template]) {
      const template = emailTemplates[options.template](options.data);
      mailOptions.subject = template.subject;
      mailOptions.html = template.html;
    } else {
      // Use custom content
      mailOptions.text = options.text;
      mailOptions.html = options.html;
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Send bulk emails
const sendBulkEmail = async (emails) => {
  const results = [];
  
  for (const email of emails) {
    try {
      const result = await sendEmail(email);
      results.push({ ...result, recipient: email.to });
    } catch (error) {
      results.push({ 
        success: false, 
        error: error.message, 
        recipient: email.to 
      });
    }
  }
  
  return results;
};

// Test email connectivity
const testEmailConnection = async () => {
  try {
    await transporter.verify();
    return { success: true, message: 'SMTP connection successful' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get email statistics
const getEmailStats = () => emailLog.getStats();

// Send email with template (enhanced version)
const sendTemplateEmail = async (to, templateName, data = {}) => {
  try {
    const template = emailTemplates[templateName];
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const { subject, html } = template(data);
    
    const result = await sendEmail({
      to: to,
      subject: subject,
      html: html
    });

    return result;
    
  } catch (error) {
    console.error('Template email sending failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendBulkEmail,
  sendTemplateEmail,
  testEmailConnection,
  getEmailStats,
  emailTemplates
};