// Email service for BuildHomeMart Squares using Hostinger SMTP
const nodemailer = require('nodemailer');

// Email delivery status tracking
const emailLog = {
  sent: 0,
  failed: 0,
  getStats: () => ({ sent: emailLog.sent, failed: emailLog.failed })
};

// Initialize SMTP transporter with Hostinger configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify SMTP configuration on startup
(async () => {
  try {
    await transporter.verify();
    console.log('✅ Hostinger SMTP service initialized and ready');
  } catch (error) {
    console.error('❌ SMTP initialization error:', error.message);
  }
})();

// Email templates
const emailTemplates = {
  // Admin notification templates
  'admin-alert': (data) => ({
    subject: '🚨 Admin Alert - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🚨 Admin Alert</h1>
        </div>
        <div style="padding: 30px; background: #fff;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">${data.title || 'Alert Notification'}</h2>
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px; color: #7f1d1d;">${data.message}</p>
          </div>
          ${data.details ? `
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">Alert Details:</h3>
            <p style="margin: 0; white-space: pre-wrap; font-family: monospace; font-size: 13px;">${data.details}</p>
          </div>
          ` : ''}
          <p style="margin-top: 20px;"><strong>Alert Level:</strong> <span style="color: #dc2626; font-weight: bold;">${data.level || 'High'}</span></p>
          <p><strong>Triggered At:</strong> ${new Date().toLocaleString('en-IN')}</p>
          ${data.actionUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.actionUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Take Action</a>
          </div>
          ` : ''}
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="margin: 0; color: #6c757d; font-size: 14px;">
            Admin alert from BuildHomeMart Squares<br>
            <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@buildhomemartsquares.com'}" style="color: #007bff;">${process.env.SUPPORT_EMAIL || 'support@buildhomemartsquares.com'}</a>
          </p>
        </div>
      </div>
    `
  }),
  
  'system-alert': (data) => ({
    subject: '⚠️ System Alert - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">⚠️ System Alert</h1>
        </div>
        <div style="padding: 30px; background: #fff;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">${data.title || 'System Notification'}</h2>
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px; color: #78350f;">${data.message}</p>
          </div>
          ${data.systemInfo ? `
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">System Information:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${Object.entries(data.systemInfo).map(([key, value]) => `
                <li style="margin: 5px 0;"><strong>${key}:</strong> ${value}</li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          <p style="margin-top: 20px;"><strong>Alert Type:</strong> ${data.alertType || 'System'}</p>
          <p><strong>Severity:</strong> <span style="color: #f59e0b; font-weight: bold;">${data.severity || 'Medium'}</span></p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString('en-IN')}</p>
          ${data.dashboardUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
          </div>
          ` : ''}
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="margin: 0; color: #6c757d; font-size: 14px;">
            System alert from BuildHomeMart Squares<br>
            <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@buildhomemartsquares.com'}" style="color: #007bff;">${process.env.SUPPORT_EMAIL || 'support@buildhomemartsquares.com'}</a>
          </p>
        </div>
      </div>
    `
  }),

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
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMartSquares</h1>
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
          <p>&copy; 2024 BuildHomeMartSquares. All rights reserved.</p>
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

  'password-reset-otp': (data) => ({
    subject: 'Password Reset Code - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Password Reset Request</p>
        </div>
        
        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #991b1b; margin: 0 0 20px 0;">🔐 Reset Your Password</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 25px 0;">
            Hello ${data.firstName}, we received a request to reset your password. Use the code below to proceed:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px; display: inline-block; font-family: 'Courier New', monospace;">
              <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Your reset code:</div>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${data.otpCode}</div>
            </div>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0; text-align: center;">
            <strong>Security Notice:</strong> This code expires in ${data.expiryMinutes} minutes.
          </p>
        </div>

        <div style="background: #fffbeb; border: 1px solid #fcd34d; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>Didn't request this?</strong> If you didn't request a password reset, please ignore this email or contact support immediately.
          </p>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Security Team: security@buildhomemartsquares.com</p>
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

  'profile-update-otp': (data) => ({
    subject: 'Profile Update Verification - OTP Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Secure Profile Update</p>
        </div>

        <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #0c4a6e; margin: 0 0 20px 0;">🔒 Profile Update Verification</h2>
          <p style="color: #0c4a6e; line-height: 1.6; margin: 0 0 25px 0;">
            Hello ${data.firstName}, you've requested to update your ${data.changeType}. For your security, please verify this request with the OTP below:
          </p>

          ${data.newValue ? `
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0284c7;">
            <p style="margin: 0; color: #374151;">
              <strong>New ${data.changeType === 'email' ? 'Email' : 'Phone'}:</strong> ${data.newValue}
            </p>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #0284c7; color: white; padding: 20px; border-radius: 8px; display: inline-block; font-family: 'Courier New', monospace;">
              <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Your verification code:</div>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${data.otpCode}</div>
            </div>
          </div>

          <p style="color: #0c4a6e; font-size: 14px; margin: 20px 0 0 0; text-align: center;">
            <strong>Security Notice:</strong> This OTP expires in ${data.expiryMinutes} minutes. If you didn't request this change, please secure your account immediately.
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
  }),

  // Account deactivation request - sends confirmation link
  'account-deactivation': (data) => ({
    subject: 'Confirm Account Deactivation - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Account Deactivation Request</p>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffd54f; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #92400e; margin: 0 0 20px 0;">⏸️ Deactivate Your Account</h2>
          <p style="color: #92400e; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.firstName}, we received a request to temporarily deactivate your BuildHomeMart Squares account.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">What happens when you deactivate?</h3>
            <ul style="color: #475569; line-height: 1.6; padding-left: 20px; margin: 0;">
              <li>Your profile will be hidden from public view</li>
              <li>Your listings will be temporarily inactive</li>
              <li>You won't receive notifications</li>
              <li>You can reactivate anytime by logging in</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.deactivationUrl}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Confirm Deactivation
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0; text-align: center;">
            This link will expire in 24 hours. If you didn't request this, please ignore this email or contact support.
          </p>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Support: support@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  // Account deactivation confirmation - after account is deactivated
  'account-deactivated-confirmation': (data) => ({
    subject: 'Account Deactivated - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Account Status Update</p>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffd54f; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #92400e; margin: 0 0 20px 0;">⏸️ Account Deactivated</h2>
          <p style="color: #92400e; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.firstName}, your BuildHomeMart Squares account has been temporarily deactivated.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Deactivated on:</strong> ${data.deactivationDate}</p>
            <p style="margin: 15px 0 5px 0;"><strong>Your account status:</strong></p>
            <ul style="color: #475569; line-height: 1.6; padding-left: 20px; margin: 5px 0;">
              <li>Profile hidden from searches</li>
              <li>Listings temporarily inactive</li>
              <li>Data safely stored</li>
              <li>Ready to reactivate anytime</li>
            </ul>
          </div>

          <div style="background: #e0f2fe; border: 1px solid #81d4fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #0277bd; margin: 0 0 15px 0;">🔄 Easy Reactivation</h3>
            <p style="color: #0277bd; margin: 0; font-size: 14px;">
              To reactivate your account, simply log in again. All your data and settings will be restored immediately.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.reactivationLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Reactivate My Account
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Support: support@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  // Account deletion request - sends confirmation link
  'account-deletion': (data) => ({
    subject: 'Confirm Account Deletion - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Account Deletion Request</p>
        </div>
        
        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #991b1b; margin: 0 0 20px 0;">🗑️ Delete Your Account</h2>
          <p style="color: #991b1b; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.firstName}, we received a request to permanently delete your BuildHomeMart Squares account.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #991b1b; margin: 0 0 15px 0;">⚠️ Warning: This action is permanent!</h3>
            <ul style="color: #475569; line-height: 1.6; padding-left: 20px; margin: 0;">
              <li>All your personal data will be permanently deleted</li>
              <li>Your property listings will be removed</li>
              <li>Active subscriptions will be cancelled</li>
              <li>Messages and notifications will be deleted</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffd54f; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>💡 Alternative:</strong> Consider deactivating your account instead if you want to take a break. You can reactivate it anytime.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.deletionUrl}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Confirm Permanent Deletion
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0; text-align: center;">
            This link will expire in 24 hours. If you didn't request this, please secure your account immediately.
          </p>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Support: support@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  // Account deletion notification - after account is deleted
  'account-deleted': (data) => ({
    subject: 'Account Deleted - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Account Deletion Notification</p>
        </div>
        
        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #991b1b; margin: 0 0 20px 0;">🗑️ Account Deleted</h2>
          <p style="color: #991b1b; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.firstName}, your BuildHomeMart Squares account has been permanently deleted from our system.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">Account Details:</h3>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${data.email}</p>
            <p style="margin: 5px 0;"><strong>Role:</strong> ${data.role}</p>
            <p style="margin: 5px 0;"><strong>Deletion Date:</strong> ${data.deletionDate}</p>
            ${data.reason ? `<p style="margin: 15px 0 5px 0;"><strong>Reason:</strong></p><p style="color: #475569; background: #f1f5f9; padding: 15px; border-radius: 4px; margin: 5px 0;">${data.reason}</p>` : ''}
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #856404; margin: 0 0 15px 0;">⚠️ Important Information:</h3>
            <ul style="color: #856404; line-height: 1.6; padding-left: 20px; margin: 0;">
              <li>All your personal data has been permanently removed</li>
              <li>Any active subscriptions have been cancelled</li>
              <li>Property listings have been deactivated</li>
              <li>You can register again with the same email if needed</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.websiteUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Visit Our Website
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Questions? Contact us at support@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  // Vendor application submission confirmation
  'vendor-application-submitted': (data) => ({
    subject: 'Vendor Application Submitted - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Vendor Partner Program</p>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #166534; margin: 0 0 20px 0;">📋 Application Submitted Successfully!</h2>
          <p style="color: #166534; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.firstName}, thank you for submitting your vendor application to BuildHomeMart Squares! We've received all your details and documents.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">Application Details:</h3>
            <p style="margin: 5px 0;"><strong>Company Name:</strong> ${data.companyName}</p>
            <p style="margin: 5px 0;"><strong>Business Type:</strong> ${data.businessType}</p>
            <p style="margin: 5px 0;"><strong>Application ID:</strong> ${data.applicationId}</p>
            <p style="margin: 5px 0;"><strong>Submitted Date:</strong> ${data.submittedDate}</p>
            <p style="margin: 5px 0;"><strong>Documents Uploaded:</strong> ${data.documentCount} files</p>
          </div>

          <div style="background: #e0f2fe; border: 1px solid #81d4fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #0277bd; margin: 0 0 15px 0;">📝 What Happens Next?</h3>
            <ul style="color: #0277bd; line-height: 1.6; padding-left: 20px; margin: 0;">
              <li><strong>Under Review:</strong> Your application is now under review by our verification team</li>
              <li><strong>Phone Verification:</strong> Our team will call you to verify your identity and business details</li>
              <li><strong>Document Verification:</strong> We'll verify all uploaded documents (identity, business license, GST, PAN, etc.)</li>
              <li><strong>Background Check:</strong> Standard verification of business credentials and references</li>
              <li><strong>Final Decision:</strong> You'll receive an email notification within 2-3 business days with our decision</li>
            </ul>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffd54f; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #f57f17; margin: 0; font-size: 14px; line-height: 1.6;">
              <strong>⏰ Processing Time:</strong> We'll review your application and update you shortly. Please keep your phone accessible for our verification call. You'll receive status updates via email.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Questions? Contact us at partners@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  // Vendor application approved
  'vendor-application-approved': (data) => ({
    subject: '🎉 Congratulations! Your Vendor Profile is Approved - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Vendor Partner Program</p>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #166534; margin: 0 0 20px 0;">🎉 Welcome to BuildHomeMart Squares!</h2>
          <p style="color: #166534; line-height: 1.6; margin: 0 0 20px 0;">
            Congratulations ${data.firstName}! Your vendor profile has been <strong>approved successfully</strong>. You are now an official partner of BuildHomeMart Squares and can start using the application!
          </p>

          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">✅ Approval Details:</h3>
            <p style="margin: 5px 0;"><strong>Company Name:</strong> ${data.companyName}</p>
            <p style="margin: 5px 0;"><strong>Vendor ID:</strong> ${data.vendorId}</p>
            <p style="margin: 5px 0;"><strong>Approved Date:</strong> ${data.approvedDate}</p>
          </div>

          <div style="background: #e3f2fd; border: 1px solid #90caf9; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1565c0; margin: 0 0 15px 0;">🚀 Get Started:</h3>
            <ul style="color: #1565c0; line-height: 1.6; padding-left: 20px; margin: 0;">
              <li>Complete your vendor profile setup</li>
              <li>Add your services and pricing</li>
              <li>Upload portfolio images and certifications</li>
              <li>Set your business hours and availability</li>
              <li>Start receiving customer inquiries</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.vendorDashboardLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin-right: 10px;">
              Access Vendor Portal
            </a>
            <a href="${data.setupGuideLink}" style="background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Setup Guide
            </a>
          </div>

          <div style="background: #fff8e1; border: 1px solid #ffcc02; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #f57f17; margin: 0; font-size: 14px;">
              <strong>💡 Pro Tip:</strong> Complete your profile within 48 hours to start appearing in customer searches and receive priority placement!
            </p>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Partner Support: partners@buildhomemartsquares.com | Phone: +91-XXXXXXXXXX</p>
        </div>
      </div>
    `
  }),

  // System notification template
  'system-notification': (data) => ({
    subject: `${data.notificationTitle} - BuildHomeMart Squares`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">System Notification</p>
        </div>
        
        <div style="background: ${
          data.notificationType === 'info' ? '#eff6ff' : 
          data.notificationType === 'success' ? '#f0fdf4' :
          data.notificationType === 'warning' ? '#fffbeb' : '#fef2f2'
        }; border: 1px solid ${
          data.notificationType === 'info' ? '#93c5fd' : 
          data.notificationType === 'success' ? '#86efac' :
          data.notificationType === 'warning' ? '#fcd34d' : '#fca5a5'
        }; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: ${
            data.notificationType === 'info' ? '#1e40af' : 
            data.notificationType === 'success' ? '#15803d' :
            data.notificationType === 'warning' ? '#b45309' : '#b91c1c'
          }; margin: 0 0 20px 0;">${data.notificationType === 'info' ? '📢' : data.notificationType === 'success' ? '✅' : data.notificationType === 'warning' ? '⚠️' : '🔴'} ${data.notificationTitle}</h2>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #475569; line-height: 1.6; margin: 0; white-space: pre-wrap;">${data.notificationMessage}</p>
          </div>

          ${data.actionUrl ? `
            <div style="text-align: center; margin: 25px 0;">
              <a href="${data.actionUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                ${data.actionText || 'View Details'}
              </a>
            </div>
          ` : ''}

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              <strong>Hello ${data.firstName},</strong><br>
              This is an important notification from the BuildHomeMart Squares platform.
            </p>
          </div>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${data.dashboardUrl}" style="color: #2563eb; text-decoration: none; font-size: 14px;">
            Visit Dashboard
          </a>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Support: support@buildhomemartsquares.com</p>
          <p style="margin-top: 10px;">
            <a href="${data.websiteUrl}/settings/notifications" style="color: #94a3b8; text-decoration: underline;">Manage Notification Preferences</a>
          </p>
        </div>
      </div>
    `
  }),

  // Vendor application rejected
  'vendor-application-rejected': (data) => ({
    subject: 'Vendor Application Status Update - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Vendor Partner Program</p>
        </div>

        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #991b1b; margin: 0 0 20px 0;">📋 Application Status Update</h2>
          <p style="color: #991b1b; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.firstName}, thank you for your interest in becoming a vendor partner with BuildHomeMart Squares. After careful review, we are unable to approve your application at this time.
          </p>

          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">❌ Application Details:</h3>
            <p style="margin: 5px 0;"><strong>Company Name:</strong> ${data.companyName}</p>
            <p style="margin: 5px 0;"><strong>Application ID:</strong> ${data.applicationId || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Reviewed Date:</strong> ${data.reviewedDate}</p>

            ${data.rejectionReason ? `
            <div style="margin: 20px 0;">
              <h4 style="color: #991b1b; margin: 0 0 10px 0;">📝 Rejection Reason:</h4>
              <div style="color: #1e293b; background: #fef2f2; padding: 15px; border-radius: 4px; border-left: 4px solid #dc2626; line-height: 1.6;">
                ${data.rejectionReason}
              </div>
            </div>
            ` : ''}
          </div>

          <div style="background: #e3f2fd; border: 1px solid #90caf9; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1565c0; margin: 0 0 15px 0;">📝 Next Steps:</h3>
            <p style="color: #1565c0; line-height: 1.8; margin: 0;">
              You can register again with proper information based on the rejection reason mentioned above. We will revalidate your profile upon resubmission.
            </p>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffd54f; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #f57f17; margin: 0; font-size: 14px; line-height: 1.6;">
              <strong>💡 Important:</strong> Please ensure all information and documents are accurate and complete before reapplying. This will help expedite the approval process.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.reapplyLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin-right: 10px;">
              Submit New Application
            </a>
            <a href="mailto:partners@buildhomemartsquares.com" style="background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Contact Support
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Partner Support: partners@buildhomemartsquares.com | Phone: +91-XXXXXXXXXX</p>
        </div>
      </div>
    `
  }),

  // Vendor profile submitted for review (to admin)
  'vendor-profile-submitted': (data) => ({
    subject: `New Vendor Profile Submitted - ${data.businessName} | BuildHomeMart Squares`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Admin Notification - Vendor Profile Review</p>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #92400e; margin: 0 0 20px 0;">🔔 New Vendor Profile Submitted</h2>
          <p style="color: #92400e; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.adminName || 'Admin'}, a new vendor profile has been submitted and requires your review and approval.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">Vendor Details:</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <p style="margin: 5px 0;"><strong>Business Name:</strong><br/>${data.businessName}</p>
              <p style="margin: 5px 0;"><strong>Contact Person:</strong><br/>${data.vendorName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong><br/>${data.email}</p>
              <p style="margin: 5px 0;"><strong>Phone:</strong><br/>${data.phone}</p>
              <p style="margin: 5px 0;"><strong>Business Type:</strong><br/>${data.businessType}</p>
              <p style="margin: 5px 0;"><strong>Location:</strong><br/>${data.location}</p>
            </div>
            
            ${data.businessDescription ? `
            <div style="margin: 15px 0;">
              <strong>Business Description:</strong>
              <div style="background: #f1f5f9; padding: 10px; border-radius: 4px; margin: 5px 0;">
                ${data.businessDescription}
              </div>
            </div>
            ` : ''}

            <div style="margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Submitted:</strong> ${data.submissionDate}</p>
              <p style="margin: 5px 0;"><strong>Documents Uploaded:</strong> ${data.documents} files</p>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.reviewUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Review Profile
            </a>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffd54f; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #f57f17; margin: 0; font-size: 14px;">
              <strong>⏰ Review Target:</strong> Please review this profile within 2-3 business days to maintain good vendor experience.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Admin Portal: admin@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  // Vendor profile submitted confirmation (to vendor) - NEW FLOW
  'vendor-profile-submitted-confirmation': (data) => ({
    subject: 'Profile Submitted for Review - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Vendor Partner Program</p>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #166534; margin: 0 0 20px 0;">🎉 Profile Successfully Submitted!</h2>
          <p style="color: #166534; line-height: 1.6; margin: 0 0 20px 0;">
            Congratulations ${data.firstName}! Your vendor profile has been successfully verified and submitted to our admin team for approval.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">Submission Details:</h3>
            <p style="margin: 5px 0;"><strong>Business Name:</strong> ${data.businessName}</p>
            <p style="margin: 5px 0;"><strong>Email Verified:</strong> ✅ ${data.email}</p>
            <p style="margin: 5px 0;"><strong>Application ID:</strong> ${data.applicationId}</p>
            <p style="margin: 5px 0;"><strong>Submitted Date:</strong> ${data.submissionDate}</p>
          </div>

          <div style="background: #e0f2fe; border: 1px solid #81d4fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #0277bd; margin: 0 0 15px 0;">📝 What Happens Next?</h3>
            <ul style="color: #0277bd; line-height: 1.6; padding-left: 20px; margin: 0;">
              <li><strong>Admin Review:</strong> Our team will review your profile and documents within 2-3 business days</li>
              <li><strong>Document Verification:</strong> We'll verify all uploaded documents and credentials</li>
              <li><strong>Background Check:</strong> Standard verification of business information</li>
              <li><strong>Final Decision:</strong> You'll receive email notification of approval or feedback</li>
            </ul>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffd54f; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #f57f17; margin: 0; font-size: 14px;">
              <strong>⏰ Processing Time:</strong> Most applications are processed within 2-3 business days. You'll receive status updates via email.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Questions? Contact us at partners@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  // Admin notification for new vendor application
  'admin-new-vendor-application': (data) => ({
    subject: `New Vendor Application - ${data.companyName} | BuildHomeMart Squares`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Admin Notification - Vendor Applications</p>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #92400e; margin: 0 0 20px 0;">🔔 New Vendor Application Received</h2>
          <p style="color: #92400e; line-height: 1.6; margin: 0 0 20px 0;">
            A new vendor application has been submitted and requires your review and approval.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">Vendor Details:</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <p style="margin: 5px 0;"><strong>Company Name:</strong><br/>${data.companyName}</p>
              <p style="margin: 5px 0;"><strong>Contact Person:</strong><br/>${data.firstName} ${data.lastName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong><br/>${data.email}</p>
              <p style="margin: 5px 0;"><strong>Phone:</strong><br/>${data.phone}</p>
              <p style="margin: 5px 0;"><strong>Business Type:</strong><br/>${data.businessType}</p>
              <p style="margin: 5px 0;"><strong>Experience:</strong><br/>${data.experience} years</p>
            </div>
            
            ${data.specializations ? `
            <div style="margin: 15px 0;">
              <strong>Specializations:</strong>
              <div style="background: #f1f5f9; padding: 10px; border-radius: 4px; margin: 5px 0;">
                ${data.specializations.join(', ')}
              </div>
            </div>
            ` : ''}

            <div style="margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Application ID:</strong> ${data.applicationId}</p>
              <p style="margin: 5px 0;"><strong>Submitted:</strong> ${data.submittedDate}</p>
              <p style="margin: 5px 0;"><strong>Documents Uploaded:</strong> ${data.documentCount} files</p>
            </div>
          </div>

          <div style="background: #e3f2fd; border: 1px solid #90caf9; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1565c0; margin: 0 0 15px 0;">📋 Review Checklist:</h3>
            <ul style="color: #1565c0; line-height: 1.6; padding-left: 20px; margin: 0;">
              <li>Verify business registration documents</li>
              <li>Check professional licenses and certifications</li>
              <li>Validate contact information and references</li>
              <li>Review portfolio and previous work</li>
              <li>Assess business credibility and reputation</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.adminReviewLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin-right: 10px;">
              Review Application
            </a>
            <a href="${data.documentsLink}" style="background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              View Documents
            </a>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffd54f; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #f57f17; margin: 0; font-size: 14px;">
              <strong>⏰ Review Target:</strong> Please review this application within 2-3 business days to maintain good vendor experience.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p>Admin Portal: admin@buildhomemartsquares.com</p>
        </div>
      </div>
    `
  }),

  // New Message Alert for Vendors
  'vendor-new-message': (data) => ({
    subject: `New Message from ${data.senderName} - BuildHomeMart Squares`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">New Message Alert</p>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #166534; margin: 0 0 20px 0;">💬 You have a new message!</h2>
          <p style="color: #166534; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.vendorName}, you've received a new message from ${data.senderName}.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">Message Preview:</h3>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 4px; border-left: 4px solid #2563eb;">
              <p style="color: #475569; margin: 0; font-style: italic;">"${data.messagePreview}"</p>
            </div>
            <p style="margin: 15px 0 5px 0; color: #64748b; font-size: 14px;">
              <strong>From:</strong> ${data.senderName}<br/>
              <strong>Received:</strong> ${data.timestamp}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.messageLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              View Message
            </a>
          </div>
          
          <div style="background: #e0f2fe; border: 1px solid #81d4fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #0277bd; margin: 0; font-size: 14px;">
              <strong>💡 Quick Response:</strong> Respond quickly to improve your response time and customer satisfaction rating!
            </p>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p><a href="${data.unsubscribeLink}" style="color: #94a3b8; text-decoration: underline;">Manage notification preferences</a></p>
        </div>
      </div>
    `
  }),

  // Vendor Weekly Report
  'vendor-weekly-report': (data) => ({
    subject: `Your Weekly Performance Report - BuildHomeMart Squares (${data.weekRange})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Vendor Performance Report</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">📊 Week of ${data.weekRange}</h2>
          <p style="color: #475569; margin: 0 0 20px 0;">Hello ${data.vendorName}, here's your weekly performance summary:</p>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0;">
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #2563eb;">
              <h3 style="color: #2563eb; margin: 0; font-size: 28px;">${data.newLeads || 0}</h3>
              <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">New Leads</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #059669;">
              <h3 style="color: #059669; margin: 0; font-size: 28px;">${data.newInquiries || 0}</h3>
              <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">New Inquiries</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #dc2626;">
              <h3 style="color: #dc2626; margin: 0; font-size: 28px;">${data.propertyViews || 0}</h3>
              <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Property Views</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #7c3aed;">
              <h3 style="color: #7c3aed; margin: 0; font-size: 28px;">${data.responseRate || 0}%</h3>
              <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Response Rate</p>
            </div>
          </div>

          ${data.topProperty ? `
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">🏆 Top Performing Property:</h3>
            <p style="margin: 5px 0;"><strong>${data.topProperty.title}</strong></p>
            <p style="margin: 5px 0; color: #64748b; font-size: 14px;">${data.topProperty.views} views this week</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              View Full Report
            </a>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffd54f; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #f57f17; margin: 0; font-size: 14px;">
              <strong>💡 Tip:</strong> ${data.tip || 'Respond to inquiries within 2 hours to improve your response rate and customer satisfaction!'}
            </p>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p><a href="${data.unsubscribeLink}" style="color: #94a3b8; text-decoration: underline;">Manage notification preferences</a></p>
        </div>
      </div>
    `
  }),

  // Vendor Business Update/News
  'vendor-business-update': (data) => ({
    subject: `${data.updateTitle} - BuildHomeMart Squares`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Business Update</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">📢 ${data.updateTitle}</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.vendorName},
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <div style="color: #475569; line-height: 1.6; white-space: pre-wrap;">${data.updateContent}</div>
          </div>
          
          ${data.actionRequired ? `
          <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #f57f17; margin: 0; font-size: 14px;">
              <strong>⚠️ Action Required:</strong> ${data.actionRequired}
            </p>
          </div>
          ` : ''}

          ${data.actionLink ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.actionLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              ${data.actionLinkText || 'Learn More'}
            </a>
          </div>
          ` : ''}
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p><a href="${data.unsubscribeLink}" style="color: #94a3b8; text-decoration: underline;">Manage notification preferences</a></p>
        </div>
      </div>
    `
  }),

  // Vendor Marketing Tips
  'vendor-marketing-tips': (data) => ({
    subject: `Marketing Tips to Boost Your Business - BuildHomeMart Squares`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Marketing & Growth Tips</p>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #166534; margin: 0 0 20px 0;">🚀 Grow Your Business</h2>
          <p style="color: #166534; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.vendorName}, here are some proven strategies to grow your real estate business:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            ${data.tips && data.tips.length > 0 ? data.tips.map((tip, index) => `
              <div style="margin-bottom: ${index < data.tips.length - 1 ? '20px' : '0'}; padding-bottom: ${index < data.tips.length - 1 ? '20px' : '0'}; border-bottom: ${index < data.tips.length - 1 ? '1px solid #e2e8f0' : 'none'};">
                <h3 style="color: #1e293b; margin: 0 0 10px 0; font-size: 16px;">💡 ${tip.title}</h3>
                <p style="color: #475569; margin: 0; line-height: 1.6;">${tip.description}</p>
              </div>
            `).join('') : '<p>Check out our latest marketing resources!</p>'}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resourceLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              View All Resources
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
          <p><a href="${data.unsubscribeLink}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe from marketing emails</a></p>
        </div>
      </div>
    `
  }),

  // Two-Factor Authentication Enabled
  '2fa-enabled': (data) => ({
    subject: 'Two-Factor Authentication Enabled - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Security Alert</p>
        </div>
        
        <div style="background: #f0fdf4; border: 2px solid #22c55e; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #166534; margin: 0 0 20px 0; text-align: center;">🔐 Two-Factor Authentication Enabled</h2>
          <p style="color: #166534; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.firstName}, two-factor authentication (2FA) has been successfully enabled for your account on ${data.enabledDate}.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">🛡️ What This Means:</h3>
            <ul style="color: #475569; line-height: 1.8;">
              <li>You'll need your authentication app code when logging in</li>
              <li>Your account is now more secure against unauthorized access</li>
              <li>Keep your backup codes in a safe place</li>
              <li>You can disable 2FA anytime from your security settings</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.settingsLink}" style="background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Manage Security Settings
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
        </div>
      </div>
    `
  }),

  // Two-Factor Authentication Disabled
  '2fa-disabled': (data) => ({
    subject: 'Two-Factor Authentication Disabled - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Security Alert</p>
        </div>
        
        <div style="background: #fff7ed; border: 2px solid #f97316; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #c2410c; margin: 0 0 20px 0; text-align: center;">⚠️ Two-Factor Authentication Disabled</h2>
          <p style="color: #c2410c; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.firstName}, two-factor authentication (2FA) has been disabled for your account on ${data.disabledDate}.
          </p>
          
          <div style="background: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #991b1b; margin: 0; font-size: 14px;">
              <strong>Important:</strong> If you did not disable 2FA, your account may be compromised. Change your password immediately and contact support.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.securityLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Re-enable 2FA Now
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
        </div>
      </div>
    `
  }),

  // Backup Codes Regenerated
  'backup-codes-regenerated': (data) => ({
    subject: 'New 2FA Backup Codes Generated - BuildHomeMart Squares',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Security Update</p>
        </div>
        
        <div style="background: #f0f9ff; border: 2px solid #0ea5e9; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #075985; margin: 0 0 20px 0; text-align: center;">🔑 Backup Codes Regenerated</h2>
          <p style="color: #075985; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.firstName}, new backup codes for your two-factor authentication have been generated on ${data.regeneratedDate}.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #475569; margin: 0;">Your previous backup codes are now invalid. Please save your new codes in a secure location.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.settingsLink || process.env.CLIENT_URL + '/settings/security'}" style="background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              View Backup Codes
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
        </div>
      </div>
    `
  }),

  // Free Listing Expired
  'free-listing-expired': (data) => ({
    subject: '⏰ Your Free Listing Has Expired - Upgrade to Continue',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Subscription Notice</p>
        </div>

        <div style="background: #fff7ed; border: 2px solid #f97316; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #c2410c; margin: 0 0 20px 0; text-align: center;">⏰ Free Listing Expired</h2>
          <p style="color: #9a3412; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${data.firstName},
          </p>
          <p style="color: #9a3412; line-height: 1.6; margin: 0 0 20px 0;">
            Your free property listing <strong>"${data.propertyTitle}"</strong> has expired after 30 days and is <strong>no longer visible to customers</strong>.
          </p>

          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">🚀 Upgrade to Keep Your Property Active</h3>
            <p style="color: #475569; margin: 0 0 15px 0;">Purchase any subscription plan to make your property visible again and unlock premium features:</p>
            <ul style="color: #475569; line-height: 1.8;">
              <li><strong>Basic Plan</strong> - Extended duration with more photos</li>
              <li><strong>Standard Plan</strong> - Featured listings & lead management</li>
              <li><strong>Premium Plan</strong> - Top placement & verified badge</li>
              <li><strong>Enterprise Plan</strong> - Unlimited listings & priority support</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.subscriptionLink || process.env.CLIENT_URL + '/vendor/subscriptions'}" style="background: #f97316; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
              View Subscription Plans
            </a>
          </div>

          <div style="background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626;">
            <p style="color: #7f1d1d; margin: 0; font-size: 14px;">
              <strong>Note:</strong> All your archived properties will be automatically restored once you purchase any subscription.
            </p>
          </div>
        </div>

        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>Need help? Contact us at ${process.env.SUPPORT_EMAIL || 'support@buildhomemartsquares.com'}</p>
          <p>&copy; 2024 BuildHomeMart Squares. All rights reserved.</p>
        </div>
      </div>
    `
  }),

  // Addon Service Scheduled
  'addon-service-scheduled': (data) => ({
    subject: `Service Scheduled - ${data.addonName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #16a34a; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px; background-color: #dcfce7; padding: 20px; border-radius: 8px;">
          <h1 style="color: #16a34a; margin: 0;">✅ Service Scheduled</h1>
          <p style="color: #15803d; margin: 5px 0;">Appointment Confirmation</p>
        </div>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #16a34a;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">Service Information</h3>
          <p style="margin: 5px 0;"><strong>Service:</strong> ${data.addonName}</p>
          <p style="margin: 5px 0;"><strong>Category:</strong> ${data.category}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">SCHEDULED</span></p>
        </div>
        <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">Appointment Details</h3>
          <p style="margin: 5px 0;"><strong>Scheduled Date & Time:</strong> ${data.scheduledDate}</p>
          <p style="margin: 5px 0;"><strong>Vendor:</strong> ${data.vendorName}</p>
          <p style="margin: 5px 0;"><strong>Scheduled by:</strong> ${data.scheduledBy}</p>
          ${data.notes ? `<p style="margin: 10px 0 0 0;"><strong>Notes:</strong></p><p style="margin: 5px 0; padding: 10px; background-color: #ffffff; border-radius: 4px;">${data.notes}</p>` : ''}
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">If you have any questions, please reply to this email.</p>
        </div>
      </div>
    `
  }),

  // Addon Service Cancelled
  'addon-service-cancelled': (data) => ({
    subject: `Service Cancelled - ${data.addonName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dc2626; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px; background-color: #fee2e2; padding: 20px; border-radius: 8px;">
          <h1 style="color: #dc2626; margin: 0;">❌ Service Cancelled</h1>
          <p style="color: #991b1b; margin: 5px 0;">Status Update Notification</p>
        </div>
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">Service Information</h3>
          <p style="margin: 5px 0;"><strong>Service:</strong> ${data.addonName}</p>
          <p style="margin: 5px 0;"><strong>Category:</strong> ${data.category}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">CANCELLED</span></p>
        </div>
        <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">Cancellation Details</h3>
          <p style="margin: 5px 0;"><strong>Reason:</strong></p>
          <p style="margin: 10px 0; padding: 10px; background-color: #ffffff; border-radius: 4px;">${data.cancellationReason}</p>
          <p style="margin: 5px 0;"><strong>Cancelled on:</strong> ${data.cancelledAt}</p>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">If you have any questions, please reply to this email.</p>
        </div>
      </div>
    `
  }),

  // Addon Service In Progress
  'addon-service-in-progress': (data) => ({
    subject: `Service In Progress - ${data.addonName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #2563eb; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px; background-color: #dbeafe; padding: 20px; border-radius: 8px;">
          <h1 style="color: #2563eb; margin: 0;">🔄 Service In Progress</h1>
          <p style="color: #1e40af; margin: 5px 0;">Status Update Notification</p>
        </div>
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2563eb;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">Service Information</h3>
          <p style="margin: 5px 0;"><strong>Service:</strong> ${data.addonName}</p>
          <p style="margin: 5px 0;"><strong>Category:</strong> ${data.category}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #2563eb; font-weight: bold;">IN PROGRESS</span></p>
        </div>
        <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">Progress Details</h3>
          <p style="margin: 5px 0;"><strong>Started on:</strong> ${data.inProgressAt}</p>
          ${data.scheduledDate ? `<p style="margin: 5px 0;"><strong>Scheduled for:</strong> ${data.scheduledDate}</p>` : ''}
          ${data.notes ? `<p style="margin: 10px 0 0 0;"><strong>Notes:</strong></p><p style="margin: 5px 0; padding: 10px; background-color: #ffffff; border-radius: 4px;">${data.notes}</p>` : ''}
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">We will notify you once the service is completed.</p>
        </div>
      </div>
    `
  }),

  // Addon Service Completed
  'addon-service-completed': (data) => ({
    subject: `Service Completed - ${data.addonName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #16a34a; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px; background-color: #dcfce7; padding: 20px; border-radius: 8px;">
          <h1 style="color: #16a34a; margin: 0;">✅ Service Completed</h1>
          <p style="color: #15803d; margin: 5px 0;">Status Update Notification</p>
        </div>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #16a34a;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">Service Information</h3>
          <p style="margin: 5px 0;"><strong>Service:</strong> ${data.addonName}</p>
          <p style="margin: 5px 0;"><strong>Category:</strong> ${data.category}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">COMPLETED</span></p>
        </div>
        <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">Completion Details</h3>
          <p style="margin: 5px 0;"><strong>Completed on:</strong> ${data.completedAt}</p>
          ${data.scheduledDate ? `<p style="margin: 5px 0;"><strong>Was scheduled for:</strong> ${data.scheduledDate}</p>` : ''}
          ${data.inProgressAt ? `<p style="margin: 5px 0;"><strong>Started on:</strong> ${data.inProgressAt}</p>` : ''}
          ${data.notes ? `<p style="margin: 10px 0 0 0;"><strong>Final Notes:</strong></p><p style="margin: 5px 0; padding: 10px; background-color: #ffffff; border-radius: 4px;">${data.notes}</p>` : ''}
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Thank you for using our services!</p>
        </div>
      </div>
    `
  }),

  // Addon Service Rescheduled
  'addon-service-rescheduled': (data) => ({
    subject: `Service Rescheduled - ${data.addonName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ea580c; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px; background-color: #ffedd5; padding: 20px; border-radius: 8px;">
          <h1 style="color: #ea580c; margin: 0;">📅 Service Rescheduled</h1>
          <p style="color: #c2410c; margin: 5px 0;">New Date & Time Confirmed</p>
        </div>
        <div style="background-color: #fff7ed; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ea580c;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">Service Information</h3>
          <p style="margin: 5px 0;"><strong>Service:</strong> ${data.addonName}</p>
          <p style="margin: 5px 0;"><strong>Category:</strong> ${data.category}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #ea580c; font-weight: bold;">RESCHEDULED</span></p>
        </div>
        <div style="background-color: #ffedd5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">Date Changes</h3>
          ${data.oldScheduledDate ? `
          <div style="margin-bottom: 15px; padding: 10px; background-color: #ffffff; border-radius: 4px; text-decoration: line-through; opacity: 0.7;">
            <p style="margin: 0;"><strong>Previous Date:</strong> ${data.oldScheduledDate}</p>
          </div>
          ` : ''}
          <div style="padding: 10px; background-color: #ffffff; border-radius: 4px; border: 2px solid #ea580c;">
            <p style="margin: 0;"><strong>New Scheduled Date:</strong> ${data.newScheduledDate}</p>
          </div>
          ${data.notes ? `<p style="margin: 10px 0 0 0;"><strong>Notes:</strong></p><p style="margin: 5px 0; padding: 10px; background-color: #ffffff; border-radius: 4px;">${data.notes}</p>` : ''}
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Please make note of the new date and time. If you have any questions, reply to this email.</p>
        </div>
      </div>
    `
  })
};

// Send email function using Hostinger SMTP
const sendEmail = async (options) => {
  try {
    // Determine sender based on email type
    const getSenderInfo = (template) => {
      const senders = {
        'otp-verification': { name: 'BuildHomeMart Verification', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'email-verification': { name: 'BuildHomeMart Verification', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'password-reset': { name: 'BuildHomeMart Security', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'password-changed': { name: 'BuildHomeMart Security', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'password-change-otp': { name: 'BuildHomeMart Security', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'profile-update-otp': { name: 'BuildHomeMart Security', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'login-alert': { name: 'BuildHomeMart Security', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'account-deleted': { name: 'BuildHomeMart Account Services', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'property-inquiry': { name: 'BuildHomeMart Notifications', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'vendor-welcome': { name: 'BuildHomeMart Partners', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'vendor-application-submitted': { name: 'BuildHomeMart Partners', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'vendor-application-approved': { name: 'BuildHomeMart Partners', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'vendor-application-rejected': { name: 'BuildHomeMart Partners', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'admin-new-vendor-application': { name: 'BuildHomeMart Admin', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'welcome': { name: 'BuildHomeMart Welcome', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'customer-booking-confirmation': { name: 'BuildHomeMart Bookings', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'service-status-update': { name: 'BuildHomeMart Services', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'weekly-report': { name: 'BuildHomeMart Reports', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        'free-listing-expired': { name: 'BuildHomeMart Subscriptions', email: process.env.SMTP_FROM || process.env.SMTP_USER },
        default: { name: 'BuildHomeMart Squares', email: process.env.SMTP_FROM || process.env.SMTP_USER }
      };
      return senders[template] || senders.default;
    };

    const sender = getSenderInfo(options.template);
    
    let emailData = {
      from: `${sender.name} <${sender.email}>`,
      to: options.to,
      subject: options.subject,
      replyTo: options.replyTo || process.env.SMTP_FROM || process.env.SMTP_USER
    };

    // Use template if provided
    if (options.template && emailTemplates[options.template]) {
      const template = emailTemplates[options.template](options.data);
      emailData.subject = template.subject;
      emailData.html = template.html;
    } else {
      // Use custom content
      emailData.html = options.html || options.text;
    }

    // Send email via SMTP
    const result = await transporter.sendMail(emailData);

    console.log('✅ Email sent successfully via SMTP:', result.messageId);
    emailLog.sent++;
    
    return {
      success: true,
      messageId: result.messageId
    };

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    emailLog.failed++;
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