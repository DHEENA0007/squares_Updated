const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Email templates
const emailTemplates = {
  'email-verification': (data) => ({
    subject: 'Verify Your Email - Ninety Nine Acres',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Ninety Nine Acres</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Your Real Estate Partner</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">Welcome ${data.firstName}!</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
            Thank you for signing up with Ninety Nine Acres. To complete your registration and start exploring properties, please verify your email address.
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
          <p>&copy; 2024 Ninety Nine Acres. All rights reserved.</p>
        </div>
      </div>
    `
  }),

  'password-reset': (data) => ({
    subject: 'Password Reset - Ninety Nine Acres',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Ninety Nine Acres</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Your Real Estate Partner</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">Password Reset Request</h2>
          <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
            Hi ${data.firstName}, we received a request to reset your password. Click the button below to create a new password.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetLink}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Reset Password
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">
            This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>&copy; 2024 Ninety Nine Acres. All rights reserved.</p>
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
          <h1 style="color: #2563eb; margin: 0;">Ninety Nine Acres</h1>
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
          <p>&copy; 2024 Ninety Nine Acres. All rights reserved.</p>
        </div>
      </div>
    `
  })
};

// Send email function
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    // Verify connection configuration
    await transporter.verify();

    let mailOptions = {
      from: `"Ninety Nine Acres" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject
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

module.exports = {
  sendEmail,
  sendBulkEmail,
  emailTemplates
};