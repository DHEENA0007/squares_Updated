const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const LoginAttempt = require('../models/LoginAttempt');
const TwoFactorAuth = require('../models/TwoFactorAuth');
const { asyncHandler, validateRequest } = require('../middleware/errorMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const { sendEmail } = require('../utils/emailService');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../utils/validationSchemas');
const {
  createOTP,
  verifyOTP,
  canRequestOTP,
  isOTPVerified,
  consumeVerifiedOTP
} = require('../utils/otpService');

const router = express.Router();

// @desc    Test route to verify auth routes are working
// @route   GET /api/auth/test
// @access  Public
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Helper function to map document types from registration to approval document types
const mapDocumentType = (type) => {
  const typeMap = {
    'business_license': 'business_license',
    'identity': 'identity_proof',
    'address': 'address_proof',
    'pan_card': 'pan_card',
    'gst_certificate': 'gst_certificate',
    'other': 'other'
  };
  return typeMap[type] || 'other';
};

// @desc    Send OTP for email verification
// @route   POST /api/auth/send-otp
// @access  Public
router.post('/send-otp', asyncHandler(async (req, res) => {
  const { email, firstName, phone } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Check if phone number already exists (if provided)
  if (phone) {
    const existingPhone = await User.findOne({ 'profile.phone': phone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'This phone number is already registered with another account'
      });
    }
  }

  // Check rate limiting
  const rateLimitCheck = await canRequestOTP(email, 'email_verification');
  if (!rateLimitCheck.canRequest) {
    return res.status(429).json({
      success: false,
      message: rateLimitCheck.message,
      remainingSeconds: rateLimitCheck.remainingSeconds
    });
  }

  // Generate OTP
  const otpResult = await createOTP(email, 'email_verification');

  // Send OTP email
  try {
    await sendEmail({
      to: email,
      template: 'otp-verification',
      data: {
        firstName: firstName || 'User',
        otpCode: otpResult.otpCode,
        expiryMinutes: otpResult.expiryMinutes
      }
    });

    res.json({
      success: true,
      message: 'OTP sent to your email address',
      expiryMinutes: otpResult.expiryMinutes
    });

  } catch (emailError) {
    console.error('Failed to send OTP email:', emailError);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP email. Please try again.'
    });
  }
}));

// @desc    Check business name availability
// @route   POST /api/auth/check-business-name
// @access  Public
router.post('/check-business-name', asyncHandler(async (req, res) => {
  const { businessName } = req.body;

  if (!businessName || businessName.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Business name is required'
    });
  }

  // Check if business name already exists (case-insensitive)
  const existingBusiness = await Vendor.findOne({
    'businessInfo.companyName': new RegExp(`^${businessName.trim()}$`, 'i')
  });

  if (existingBusiness) {
    return res.status(409).json({
      success: false,
      message: 'A business with this name is already registered. Please choose a different business name.',
      available: false
    });
  }

  res.json({
    success: true,
    message: 'Business name is available',
    available: true
  });
}));

// @desc    Check phone number availability
// @route   POST /api/auth/check-phone
// @access  Public
router.post('/check-phone', asyncHandler(async (req, res) => {
  console.log('📞 Check phone route hit with body:', req.body);

  const { phone } = req.body;

  if (!phone || phone.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required'
    });
  }

  try {
    // Check if phone number already exists
    const existingPhone = await User.findOne({ 'profile.phone': phone.trim() });
    console.log('📞 Phone check result:', existingPhone ? 'Found existing' : 'Available');

    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: 'This phone number is already registered with another account. Please use a different phone number.',
        available: false
      });
    }

    res.json({
      success: true,
      message: 'Phone number is available',
      available: true
    });
  } catch (error) {
    console.error('📞 Error checking phone availability:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking phone availability',
      available: false
    });
  }
}));

// @desc    Check email availability
// @route   GET /api/auth/check-email
// @access  Public
router.get('/check-email', asyncHandler(async (req, res) => {
  console.log('📧 Check email route hit with query:', req.query);

  const { email } = req.query;

  if (!email || email.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Email is required',
      exists: false
    });
  }

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    console.log('📧 Email check result:', existingUser ? 'Found existing' : 'Available');

    res.json({
      success: true,
      exists: !!existingUser,
      message: existingUser ? 'Email already registered' : 'Email is available'
    });
  } catch (error) {
    console.error('📧 Error checking email availability:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking email availability',
      exists: false
    });
  }
}));

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
router.post('/verify-otp', asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Email and OTP are required'
    });
  }

  // Verify OTP
  const verificationResult = await verifyOTP(email, otp, 'email_verification');

  if (!verificationResult.success) {
    return res.status(400).json({
      success: false,
      message: verificationResult.message,
      error: verificationResult.error,
      attemptsLeft: verificationResult.attemptsLeft
    });
  }

  res.json({
    success: true,
    message: 'Email verified successfully. You can now complete your registration.',
    verified: true
  });
}));

// @desc    Register new user with OTP verification
// @route   POST /api/auth/register
// @access  Public
router.post('/register', validateRequest(registerSchema), asyncHandler(async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    phone,
    role = 'customer',
    agreeToTerms,
    businessInfo,
    documents,
    otp // OTP verification code
  } = req.body;

  if (!agreeToTerms) {
    return res.status(400).json({
      success: false,
      message: 'You must agree to the terms and conditions'
    });
  }

  // OTP verification is required for registration
  if (!otp) {
    return res.status(400).json({
      success: false,
      message: 'Email verification OTP is required for registration',
      requiresOTP: true
    });
  }

  // Check if OTP is already verified (for multi-step processes)
  const otpStatus = await isOTPVerified(email, 'email_verification');
  console.log('OTP Status for', email, ':', otpStatus);

  if (!otpStatus.verified) {
    // If not verified, try to verify the provided OTP
    console.log('Attempting to verify OTP for registration:', email);
    const otpVerification = await verifyOTP(email, otp, 'email_verification');
    if (!otpVerification.success) {
      console.log('OTP verification failed:', otpVerification);
      return res.status(400).json({
        success: false,
        message: otpVerification.message,
        error: otpVerification.error,
        attemptsLeft: otpVerification.attemptsLeft
      });
    }
  } else {
    console.log('OTP already verified for registration:', email);
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Check if phone number already exists
  const existingPhone = await User.findOne({ 'profile.phone': phone });
  if (existingPhone) {
    return res.status(400).json({
      success: false,
      message: 'This phone number is already registered with another account. Please use a different phone number or contact support if this is your number.'
    });
  }

  // For vendors, check if business name already exists
  if (role === 'agent' && businessInfo?.businessName) {
    const existingBusiness = await Vendor.findOne({
      'businessInfo.companyName': new RegExp(`^${businessInfo.businessName.trim()}$`, 'i')
    });
    if (existingBusiness) {
      return res.status(400).json({
        success: false,
        message: 'A business with this name is already registered. Please choose a different business name or contact support if this is your business.'
      });
    }
  }

  // For vendors, validate business description length
  if (role === 'agent' && businessInfo?.businessDescription) {
    if (businessInfo.businessDescription.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Business description must be at least 10 characters long.'
      });
    }
  }

  // Create user profile with business info for vendors
  const profile = {
    firstName,
    lastName,
    phone,
    emailVerified: true // Email is verified through OTP during registration
  };

  // Add business info for vendors (agents)
  if (role === 'agent' && businessInfo) {
    profile.businessInfo = businessInfo;
    profile.documents = documents;
  }

  // Create user
  // For vendors (agents), set status to 'pending' until admin approves
  // For customers, set to 'active' since they only need email verification
  const user = new User({
    email,
    password,
    role,
    status: role === 'agent' ? 'pending' : 'active', // Vendors need admin approval
    profile
  });

  await user.save();

  // Consume the verified OTP now that registration is complete
  await consumeVerifiedOTP(email, 'email_verification');

  // Create vendor profile for agents
  let vendor = null;
  if (role === 'agent') {
    // Prepare documents array properly - ensure each document has required 'type' field
    const vendorDocuments = [];

    if (documents && Array.isArray(documents)) {
      // Frontend sends documents as array: [{ type, name, url, status, uploadDate }]
      documents.forEach(doc => {
        if (doc && doc.type && doc.url) {
          vendorDocuments.push({
            type: doc.type,
            name: doc.name || 'Document',
            url: doc.url,
            status: doc.status || 'pending',
            uploadDate: doc.uploadDate || new Date()
          });
        }
      });
    } else if (documents && typeof documents === 'object') {
      // Legacy format: { businessRegistration: {...}, identityProof: {...} }
      const documentTypeMap = {
        'businessRegistration': 'business_license',
        'professionalLicense': 'business_license',
        'identityProof': 'identity',
        'addressProof': 'address',
        'panCard': 'pan_card',
        'gstCertificate': 'gst_certificate'
      };

      Object.entries(documents).forEach(([key, doc]) => {
        if (doc && doc.url) {
          vendorDocuments.push({
            type: documentTypeMap[key] || 'other',
            name: doc.name || key,
            url: doc.url,
            status: 'pending',
            uploadDate: new Date()
          });
        }
      });
    }

    console.log('Vendor documents prepared:', vendorDocuments);

    // Map documents to approval.submittedDocuments format
    const submittedDocuments = vendorDocuments.map(doc => ({
      documentType: mapDocumentType(doc.type),
      documentName: doc.name,
      documentUrl: doc.url,
      uploadedAt: doc.uploadDate || new Date(),
      verified: false
    }));

    console.log('Submitted documents for approval:', submittedDocuments);

    const vendorData = {
      user: user._id,
      businessInfo: {
        companyName: businessInfo?.businessName || `${firstName} ${lastName}`.trim() || 'Unknown Business',
        businessType: businessInfo?.businessType || 'real_estate_agent',
        licenseNumber: businessInfo?.licenseNumber || undefined,
        gstNumber: businessInfo?.gstNumber || undefined,
        panNumber: businessInfo?.panNumber || undefined,
        website: businessInfo?.website || undefined
      },
      professionalInfo: {
        experience: businessInfo?.experience || 0,
        description: businessInfo?.businessDescription || '',
        specializations: businessInfo?.specializations || [],
        officeAddress: {
          area: businessInfo?.address || '',
          city: businessInfo?.city || '',
          state: businessInfo?.state || '',
          district: businessInfo?.district || '',
          country: 'India',
          countryCode: businessInfo?.countryCode || 'IN',
          pincode: businessInfo?.pincode || ''
        },
        serviceAreas: businessInfo?.serviceAreas ? businessInfo.serviceAreas.map(area => ({
          city: area,
          state: '',
          pincode: '',
          locality: ''
        })) : [],
        languages: ['english'],
        certifications: []
      },
      contactInfo: {
        officeAddress: {
          street: businessInfo?.address || '',
          area: businessInfo?.address || '',
          city: businessInfo?.city || '',
          state: businessInfo?.state || '',
          district: businessInfo?.district || '',
          country: 'India',
          countryCode: businessInfo?.countryCode || 'IN',
          stateCode: businessInfo?.stateCode || '',
          districtCode: businessInfo?.districtCode || '',
          cityCode: businessInfo?.cityCode || '',
          pincode: businessInfo?.pincode || '',
          landmark: ''
        },
        officePhone: phone || '',
        whatsappNumber: phone || '',
        socialMedia: {
          facebook: '',
          instagram: '',
          linkedin: '',
          twitter: '',
          youtube: ''
        }
      },
      verification: {
        isVerified: false, // Email verified but business verification pending
        verificationLevel: 'basic', // Email verification completed
        documents: vendorDocuments // Store in verification.documents as well
      },
      approval: {
        status: 'pending',
        submittedAt: new Date(),
        submittedDocuments: submittedDocuments // Documents for admin review
      },
      status: 'pending_approval', // Awaiting admin approval for business verification
      metadata: {
        source: 'website',
        notes: 'Created during registration - Awaiting admin approval'
      }
    };

    vendor = new Vendor(vendorData);
    await vendor.save();

    // Link user to vendor profile
    user.vendorProfile = vendor._id;
    await user.save();

    // Send notification to admin about new vendor application
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@buildhomemartsquares.com',
        template: 'admin-new-vendor-application',
        data: {
          companyName: businessInfo?.businessName || `${firstName} ${lastName}`.trim(),
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
          businessType: businessInfo?.businessType || 'individual',
          experience: businessInfo?.experience || 'Not specified',
          applicationId: vendor._id.toString(),
          submittedDate: new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          documentCount: vendorDocuments ? vendorDocuments.length : 0,
          adminReviewLink: `${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/vendors/${vendor._id}`,
          documentsLink: `${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/vendors/${vendor._id}/documents`
        }
      });
      console.log('Admin notification sent for new vendor application:', email);
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
      // Don't fail the registration if admin email fails
    }
  }

  // Send confirmation email (for vendors, confirm profile submission)
  try {
    if (role === 'agent') {
      // Send profile submission confirmation to vendor
      await sendEmail({
        to: email,
        template: 'vendor-profile-submitted-confirmation',
        data: {
          firstName,
          email,
          businessName: businessInfo?.businessName || `${firstName} ${lastName}`.trim(),
          applicationId: vendor._id.toString(),
          submissionDate: new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          supportEmail: 'partners@buildhomemartsquares.com'
        }
      });
    } else {
      // Regular welcome email for customers
      await sendEmail({
        to: email,
        template: 'welcome',
        data: {
          firstName,
          dashboardLink: `${process.env.CLIENT_URL}/dashboard`
        }
      });
    }
  } catch (emailError) {
    console.error('Failed to send confirmation email:', emailError);
  }

  res.status(201).json({
    success: true,
    message: role === 'agent'
      ? 'Vendor registration successful! Your email is verified. Please wait for admin approval to start offering services.'
      : 'Registration successful! Your account is ready to use.',
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status
      },
      ...(vendor && { vendor: { id: vendor._id, status: vendor.status } })
    }
  });
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', validateRequest(loginSchema), asyncHandler(async (req, res) => {
  const { email, password, twoFactorCode } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Get security settings for max login attempts and lockout duration
  const Settings = require('../models/Settings');
  const settings = await Settings.getSettings();
  const maxAttempts = settings.security.maxLoginAttempts || 5;
  const lockoutDuration = settings.security.lockoutDuration || 30; // minutes

  // Check login attempts
  let loginAttempt = await LoginAttempt.findOne({ email, ipAddress });

  if (!loginAttempt) {
    loginAttempt = new LoginAttempt({ email, ipAddress, userAgent, attempts: 0 });
  }

  // Check if account is locked
  if (loginAttempt.isCurrentlyLocked()) {
    const remainingMinutes = loginAttempt.getRemainingLockTime();
    return res.status(429).json({
      success: false,
      message: `Too many failed login attempts. Account is locked for ${remainingMinutes} more minutes. You can reset your password to unlock immediately.`,
      isLocked: true,
      remainingMinutes,
      canResetPassword: true,
      lockoutDuration: lockoutDuration
    });
  }

  // Get user
  const user = await User.findOne({ email });

  if (!user) {
    // Increment failed attempts
    loginAttempt.attempts += 1;
    loginAttempt.lastAttempt = new Date();

    // Lock account if max attempts reached
    if (loginAttempt.attempts >= maxAttempts) {
      loginAttempt.isLocked = true;
      loginAttempt.lockedUntil = new Date(Date.now() + lockoutDuration * 60 * 1000); // Use dynamic lockout duration
    }

    await loginAttempt.save();

    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
      attemptsLeft: Math.max(0, maxAttempts - loginAttempt.attempts)
    });
  }

  // Check account status FIRST - before password validation
  // This provides better UX for vendors pending approval
  if (user.status === 'suspended') {
    return res.status(401).json({
      success: false,
      message: 'Your account has been suspended. Please contact support.'
    });
  }

  // Check if vendor profile is pending approval - show this message regardless of password
  if (user.status === 'pending' && user.role === 'agent') {
    return res.status(403).json({
      success: false,
      message: 'Your vendor profile is pending approval. You will be notified once approved by our admin team.',
      reason: 'pending_approval'
    });
  }

  // For non-agent users with pending status (email not verified)
  if (user.status === 'pending') {
    return res.status(401).json({
      success: false,
      message: 'Please verify your email before signing in.'
    });
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    // Increment failed attempts
    loginAttempt.attempts += 1;
    loginAttempt.lastAttempt = new Date();

    if (loginAttempt.attempts >= maxAttempts) {
      loginAttempt.isLocked = true;
      loginAttempt.lockedUntil = new Date(Date.now() + lockoutDuration * 60 * 1000); // Use dynamic lockout duration

      // Send account locked email
      try {
        await sendEmail({
          to: user.email,
          template: 'account-locked',
          data: {
            firstName: user.profile.firstName || 'User',
            lockDuration: `${lockoutDuration} minutes`,
            resetPasswordLink: `${process.env.CLIENT_URL}/v3/forgot-password`,
            ipAddress: ipAddress
          }
        });
      } catch (emailError) {
        console.error('Failed to send account locked email:', emailError);
      }
    }

    await loginAttempt.save();

    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
      attemptsLeft: Math.max(0, maxAttempts - loginAttempt.attempts)
    });
  }

  // Check if 2FA is enabled for user
  const twoFactorAuth = await TwoFactorAuth.findOne({ user: user._id, isEnabled: true });

  if (twoFactorAuth) {
    // 2FA is enabled, verify code
    if (!twoFactorCode) {
      return res.status(200).json({
        success: false,
        requires2FA: true,
        message: 'Two-factor authentication code required',
        method: twoFactorAuth.method
      });
    }

    // Verify 2FA token or backup code
    const isValidToken = twoFactorAuth.verifyToken(twoFactorCode);
    const isValidBackupCode = !isValidToken && twoFactorAuth.verifyBackupCode(twoFactorCode);

    if (!isValidToken && !isValidBackupCode) {
      return res.status(401).json({
        success: false,
        message: 'Invalid two-factor authentication code',
        requires2FA: true
      });
    }

    // If backup code was used, save it
    if (isValidBackupCode) {
      twoFactorAuth.lastUsed = new Date();
      await twoFactorAuth.save();

      const remainingCodes = twoFactorAuth.getRemainingBackupCodes();
      if (remainingCodes < 3) {
        // Warn user about low backup codes
        try {
          await sendEmail({
            to: user.email,
            template: 'low-backup-codes',
            data: {
              firstName: user.profile.firstName || 'User',
              remainingCodes,
              regenerateLink: `${process.env.CLIENT_URL}/settings/security`
            }
          });
        } catch (emailError) {
          console.error('Failed to send low backup codes warning:', emailError);
        }
      }
    } else {
      twoFactorAuth.lastUsed = new Date();
      await twoFactorAuth.save();
    }
  }

  // Reset login attempts on successful login
  if (loginAttempt.attempts > 0) {
    loginAttempt.attempts = 0;
    loginAttempt.isLocked = false;
    loginAttempt.lockedUntil = null;
    await loginAttempt.save();
  }

  // Update last login
  user.profile.lastLogin = new Date();
  await user.save();

  // Get role pages and permissions
  let rolePages = user.rolePages || [];
  let rolePermissions = [];

  let userRoleDoc = null;
  try {
    const Role = require('../models/Role');
    userRoleDoc = await Role.findOne({ name: user.role });

    if (!userRoleDoc) {
      return res.status(403).json({
        success: false,
        message: 'Your role has been removed from the system. Please contact support for assistance.',
        reason: 'role_deleted'
      });
    }

    if (!userRoleDoc.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your role has been deactivated. Please contact support for assistance.',
        reason: 'role_inactive'
      });
    }

    if (!rolePages || rolePages.length === 0) {
      if (userRoleDoc.pages) {
        rolePages = userRoleDoc.pages;
      }
    }

    if (userRoleDoc.permissions) {
      rolePermissions = userRoleDoc.permissions;
    }
  } catch (error) {
    console.error('Error checking role status:', error);
  }

  if (!rolePages || rolePages.length === 0) {
    try {
      const Role = require('../models/Role');
      const userRole = await Role.findOne({ name: user.role });
      if (userRole && userRole.pages) {
        rolePages = userRole.pages;
      }
      if (userRole && userRole.permissions) {
        rolePermissions = userRole.permissions;
      }
    } catch (error) {
      console.error('Error fetching role pages:', error);
    }
  }

  // Get session timeout from system settings (in minutes)
  const systemSessionTimeout = settings.security.sessionTimeout || 30;
  // Allow user preference to override if it's more restrictive, otherwise use system setting
  const userSessionTimeout = user.profile?.preferences?.security?.sessionTimeout;
  const sessionTimeout = userSessionTimeout && parseInt(userSessionTimeout) < systemSessionTimeout 
    ? userSessionTimeout 
    : systemSessionTimeout.toString();
  const timeoutMinutes = sessionTimeout === '0' ? 7 * 24 * 60 : parseInt(sessionTimeout); // 0 = never expire (7 days)

  // Generate JWT token with session timeout (either system or user preference, whichever is more restrictive)
  const token = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: sessionTimeout === '0' ? '7d' : `${timeoutMinutes}m` }
  );

  // Set secure cookie with matching expiration
  const cookieExpiryMs = sessionTimeout === '0' ? 7 * 24 * 60 * 60 * 1000 : timeoutMinutes * 60 * 1000;
  const cookieOptions = {
    expires: new Date(Date.now() + cookieExpiryMs),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  // Send login alert if enabled in user preferences
  const loginAlertsEnabled = user.profile?.preferences?.security?.loginAlerts;
  if (loginAlertsEnabled) {
    try {
      const { sendEmail } = require('../utils/emailService');
      const requestIp = req.ip || req.connection.remoteAddress || 'Unknown';
      const userAgent = req.get('user-agent') || 'Unknown Device';

      // Send login alert email (non-blocking)
      sendEmail({
        to: user.email,
        template: 'login-alert',
        data: {
          firstName: user.profile?.firstName || 'User',
          loginDate: new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          device: userAgent,
          location: 'India', // Can be enhanced with IP geolocation
          ipAddress: requestIp,
          secureAccountLink: `${process.env.CLIENT_URL}/customer/settings`
        }
      }).catch(err => console.error('Failed to send login alert:', err));
    } catch (error) {
      console.error('Error sending login alert:', error);
    }
  }

  res.cookie('token', token, cookieOptions);

  // Send login alert email
  try {
    const deviceInfo = userAgent.includes('Mobile') ? 'Mobile Device' :
      userAgent.includes('Chrome') ? 'Chrome Browser' :
        'Unknown Device';

    await sendEmail({
      to: user.email,
      template: 'login-alert',
      data: {
        firstName: user.profile.firstName || 'User',
        loginDate: new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        device: deviceInfo,
        location: 'India',
        ipAddress: ipAddress,
        secureAccountLink: `${process.env.CLIENT_URL}/dashboard/security`
      }
    });
  } catch (emailError) {
    console.error('Failed to send login alert:', emailError);
  }

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        rolePages: rolePages,
        rolePermissions: rolePermissions,
        profile: user.profile,
        has2FA: !!twoFactorAuth
      }
    }
  });
}));

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  res.clearCookie('token');

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Fetch fresh role permissions
  let rolePermissions = [];
  const defaultRoles = ['customer', 'agent', 'admin', 'subadmin', 'superadmin'];

  if (!defaultRoles.includes(user.role)) {
    // User has a custom role, fetch permissions from Role collection
    const Role = require('../models/Role');
    const roleDoc = await Role.findOne({ name: user.role, isActive: true });

    if (roleDoc && roleDoc.permissions) {
      rolePermissions = roleDoc.permissions;
    }
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        rolePermissions: rolePermissions,
        status: user.status,
        createdAt: user.createdAt,
        profile: user.profile
      }
    }
  });
}));

// @desc    Verify email
// @route   POST /api/auth/verify-email
// @access  Public
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Verification token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'email_verification') {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Update user status and email verification
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    user.status = 'active';
    user.profile.emailVerified = true;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Verification token has expired'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid verification token'
    });
  }
}));

// @desc    Forgot password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', validateRequest(forgotPasswordSchema), asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Find user
  const user = await User.findOne({ email });

  // Check if user exists
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'EMAIL_NOT_REGISTERED',
      message: 'This email is not registered. Please check your email or sign up for a new account.'
    });
  }

  // Check rate limiting for OTP requests
  const rateLimitCheck = await canRequestOTP(email, 'password_reset');
  if (!rateLimitCheck.canRequest) {
    return res.status(429).json({
      success: false,
      message: rateLimitCheck.message,
      remainingSeconds: rateLimitCheck.remainingSeconds
    });
  }

  // Generate OTP for password reset
  const otpResult = await createOTP(email, 'password_reset', {
    userId: user._id.toString(),
    expiryMinutes: 10
  });

  // Send OTP email
  try {
    await sendEmail({
      to: user.email,
      template: 'password-reset-otp',
      data: {
        firstName: user.profile.firstName || 'User',
        otpCode: otpResult.otpCode,
        expiryMinutes: otpResult.expiryMinutes
      }
    });
  } catch (emailError) {
    console.error('Failed to send password reset OTP email:', emailError);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP email. Please try again.'
    });
  }

  res.json({
    success: true,
    message: 'Password reset OTP has been sent to your email address.',
    expiryMinutes: otpResult.expiryMinutes
  });
}));

// @desc    Verify OTP and reset password
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Email, OTP, and new password are required'
    });
  }

  // Validate new password
  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long'
    });
  }

  // Verify OTP
  const verificationResult = await verifyOTP(email, otp, 'password_reset');
  if (!verificationResult.success) {
    return res.status(400).json({
      success: false,
      message: verificationResult.message,
      error: verificationResult.error,
      attemptsLeft: verificationResult.attemptsLeft
    });
  }

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if new password is different from current password
  const isSamePassword = await user.comparePassword(newPassword);
  if (isSamePassword) {
    return res.status(400).json({
      success: false,
      message: 'New password must be different from your current password'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Consume the OTP after successful password reset
  await consumeVerifiedOTP(email, 'password_reset');

  // Send password change confirmation email
  try {
    await sendEmail({
      to: user.email,
      template: 'password-changed',
      data: {
        firstName: user.profile.firstName || 'User',
        changeDate: new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    });
  } catch (emailError) {
    console.error('Failed to send password change confirmation:', emailError);
  }

  res.json({
    success: true,
    message: 'Password reset successfully! You can now login with your new password.'
  });
}));

// @desc    Request OTP for password change
// @route   POST /api/auth/request-password-change-otp
// @access  Private
router.post('/request-password-change-otp', authenticateToken, asyncHandler(async (req, res) => {
  const { currentPassword } = req.body;

  if (!currentPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password is required to verify your identity'
    });
  }

  // Get current user
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Check rate limiting for OTP requests
  const rateLimitCheck = await canRequestOTP(user.email, 'password_change');
  if (!rateLimitCheck.canRequest) {
    return res.status(429).json({
      success: false,
      message: rateLimitCheck.message,
      remainingSeconds: rateLimitCheck.remainingSeconds
    });
  }

  // Generate OTP for password change
  const otpResult = await createOTP(user.email, 'password_change', {
    userId: user._id.toString(),
    expiryMinutes: 5 // Shorter expiry for security-sensitive operations
  });

  // Send OTP to user's registered email
  try {
    await sendEmail({
      to: user.email,
      template: 'password-change-otp',
      data: {
        firstName: user.profile.firstName || 'User',
        otpCode: otpResult.otpCode,
        expiryMinutes: otpResult.expiryMinutes
      }
    });

    res.json({
      success: true,
      message: 'OTP sent to your registered email address. Please check your email to continue with password change.',
      expiryMinutes: otpResult.expiryMinutes
    });

  } catch (emailError) {
    console.error('Failed to send password change OTP:', emailError);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP email. Please try again.'
    });
  }
}));

// @desc    Verify OTP and change password
// @route   POST /api/auth/change-password-with-otp
// @access  Private
router.post('/change-password-with-otp', authenticateToken, asyncHandler(async (req, res) => {
  const { otp, newPassword } = req.body;

  if (!otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'OTP and new password are required'
    });
  }

  // Get current user
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Verify OTP
  const verificationResult = await verifyOTP(user.email, otp, 'password_change');
  if (!verificationResult.success) {
    return res.status(400).json({
      success: false,
      message: verificationResult.message,
      error: verificationResult.error,
      attemptsLeft: verificationResult.attemptsLeft
    });
  }

  // Validate new password (basic validation)
  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long'
    });
  }

  // Check if new password is different from current password
  const isSamePassword = await user.comparePassword(newPassword);
  if (isSamePassword) {
    return res.status(400).json({
      success: false,
      message: 'New password must be different from your current password'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Consume the verified OTP
  await consumeVerifiedOTP(user.email, 'password_change');

  // Send password change confirmation email
  try {
    await sendEmail({
      to: user.email,
      template: 'password-changed',
      data: {
        firstName: user.profile.firstName || 'User',
        changeDate: new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    });
  } catch (emailError) {
    // Log error but don't fail the password change
    console.error('Failed to send password change confirmation:', emailError);
  }

  res.json({
    success: true,
    message: 'Password changed successfully! A confirmation email has been sent to your registered email address.'
  });
}));

// @desc    Change password (Legacy route - kept for backwards compatibility but should use OTP method)
// @route   POST /api/auth/change-password
// @access  Private
router.post('/change-password', authenticateToken, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required'
    });
  }

  // Get current user
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // For enhanced security, redirect to OTP-based flow
  return res.status(200).json({
    success: false,
    requiresOTP: true,
    message: 'For your security, password changes now require email verification. Please use the OTP-based password change method.',
    nextStep: 'request-password-change-otp'
  });
}));

// @desc    Request OTP for profile update (email/phone change)
// @route   POST /api/auth/request-profile-update-otp
// @access  Private
router.post('/request-profile-update-otp', authenticateToken, asyncHandler(async (req, res) => {
  const { newEmail, newPhone, currentEmail, currentPhone } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Determine if email or phone is changing
  const isEmailChanging = newEmail && newEmail !== user.email;
  const isPhoneChanging = newPhone && newPhone !== user.profile.phone;

  if (!isEmailChanging && !isPhoneChanging) {
    return res.status(400).json({
      success: false,
      message: 'No changes detected to email or phone'
    });
  }

  // If email is changing, check if new email is already in use
  if (isEmailChanging) {
    const emailExists = await User.findOne({ email: newEmail, _id: { $ne: user._id } });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered to another account'
      });
    }
  }

  // If phone is changing, check if new phone is already in use
  if (isPhoneChanging) {
    const phoneExists = await User.findOne({ 'profile.phone': newPhone, _id: { $ne: user._id } });
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: 'This phone number is already registered to another account'
      });
    }
  }

  // Check rate limiting for OTP requests
  const rateLimitCheck = await canRequestOTP(user.email, 'profile_update');
  if (!rateLimitCheck.canRequest) {
    return res.status(429).json({
      success: false,
      message: rateLimitCheck.message,
      remainingSeconds: rateLimitCheck.remainingSeconds
    });
  }

  // Determine which email to send OTP to
  // If email is changing, send to NEW email for verification
  // If only phone is changing, send to CURRENT email
  const otpEmail = isEmailChanging ? newEmail : user.email;

  // Generate OTP for profile update
  const otpResult = await createOTP(otpEmail, 'profile_update', {
    userId: user._id.toString(),
    newEmail: newEmail || user.email,
    newPhone: newPhone || user.profile.phone,
    expiryMinutes: 10
  });

  // Send OTP email
  try {
    await sendEmail({
      to: otpEmail,
      template: 'profile-update-otp',
      data: {
        firstName: user.profile.firstName || 'User',
        otpCode: otpResult.otpCode,
        expiryMinutes: otpResult.expiryMinutes,
        changeType: isEmailChanging ? 'email' : 'phone',
        newValue: isEmailChanging ? newEmail : newPhone
      }
    });

    res.json({
      success: true,
      message: 'Verification code has been sent to ' + (isEmailChanging ? 'your new email address' : 'your current email address'),
      expiryMinutes: otpResult.expiryMinutes,
      sentTo: otpEmail
    });
  } catch (emailError) {
    console.error('Failed to send profile update OTP:', emailError);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code. Please try again.'
    });
  }
}));

// @desc    Verify OTP and update profile (email/phone)
// @route   POST /api/auth/verify-profile-update-otp
// @access  Private
router.post('/verify-profile-update-otp', authenticateToken, asyncHandler(async (req, res) => {
  const { otp, newEmail, newPhone } = req.body;

  if (!otp) {
    return res.status(400).json({
      success: false,
      message: 'OTP is required'
    });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Determine which email to verify OTP against
  const otpEmail = (newEmail && newEmail !== user.email) ? newEmail : user.email;

  // Verify OTP
  const verificationResult = await verifyOTP(otpEmail, otp, 'profile_update');
  if (!verificationResult.success) {
    return res.status(400).json({
      success: false,
      error: verificationResult.error,
      message: verificationResult.message,
      attemptsLeft: verificationResult.attemptsLeft
    });
  }

  // Update email if changed
  if (newEmail && newEmail !== user.email) {
    user.email = newEmail;
    user.profile.emailVerified = true; // Mark new email as verified
  }

  // Update phone if changed
  if (newPhone && newPhone !== user.profile.phone) {
    user.profile.phone = newPhone;
    // Note: We're using email OTP, so we don't mark phone as verified
    // Phone verification would require SMS OTP which is not implemented yet
  }

  await user.save();

  // Remove password from response
  const userResponse = user.toObject();
  delete userResponse.password;

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: userResponse }
  });
}));

// @desc    Request account deactivation - Send confirmation email
// @route   POST /api/auth/request-deactivation
// @access  Private
router.post('/request-deactivation', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Generate deactivation token (valid for 24 hours)
  const deactivationToken = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      type: 'account_deactivation'
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Send deactivation confirmation email
  try {
    await sendEmail({
      to: user.email,
      template: 'account-deactivation',
      data: {
        firstName: user.profile.firstName || 'User',
        deactivationUrl: `${process.env.CLIENT_URL}/v3/confirm-deactivation?token=${deactivationToken}`,
        userName: `${user.profile.firstName} ${user.profile.lastName}`.trim()
      }
    });

    res.json({
      success: true,
      message: 'Deactivation confirmation email sent. Please check your email to complete the process.'
    });
  } catch (emailError) {
    console.error('Failed to send deactivation email:', emailError);
    res.status(500).json({
      success: false,
      message: 'Failed to send confirmation email. Please try again.'
    });
  }
}));

// @desc    Confirm account deactivation
// @route   POST /api/auth/confirm-deactivation
// @access  Public
router.post('/confirm-deactivation', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Deactivation token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'account_deactivation') {
      return res.status(400).json({
        success: false,
        message: 'Invalid deactivation token'
      });
    }

    // Find and update user status to inactive
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Deactivate account
    user.status = 'inactive';
    await user.save();

    // Send confirmation email
    try {
      await sendEmail({
        to: user.email,
        template: 'account-deactivated-confirmation',
        data: {
          firstName: user.profile.firstName || 'User',
          deactivationDate: new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          reactivationLink: `${process.env.CLIENT_URL}/v3/login`
        }
      });
    } catch (emailError) {
      console.error('Failed to send deactivation confirmation:', emailError);
    }

    res.json({
      success: true,
      message: 'Your account has been deactivated. You can reactivate it anytime by logging in.'
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Deactivation link has expired. Please request a new one.'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid deactivation token'
    });
  }
}));

// @desc    Request account deletion - Send confirmation email
// @route   POST /api/auth/request-deletion
// @access  Private
router.post('/request-deletion', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Generate deletion token (valid for 24 hours)
  const deletionToken = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      type: 'account_deletion'
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Send deletion confirmation email
  try {
    await sendEmail({
      to: user.email,
      template: 'account-deletion',
      data: {
        firstName: user.profile.firstName || 'User',
        deletionUrl: `${process.env.CLIENT_URL}/v3/confirm-deletion?token=${deletionToken}`,
        userName: `${user.profile.firstName} ${user.profile.lastName}`.trim()
      }
    });

    res.json({
      success: true,
      message: 'Deletion confirmation email sent. Link expires in 24 hours.'
    });
  } catch (emailError) {
    console.error('Failed to send deletion email:', emailError);
    res.status(500).json({
      success: false,
      message: 'Failed to send confirmation email. Please try again.'
    });
  }
}));

// @desc    Confirm account deletion (permanent)
// @route   POST /api/auth/confirm-deletion
// @access  Public
router.post('/confirm-deletion', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Deletion token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'account_deletion') {
      return res.status(400).json({
        success: false,
        message: 'Invalid deletion token'
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userEmail = user.email;
    const userName = user.profile.firstName || 'User';

    // Delete related data
    // Note: Add cascade delete for related models as needed
    // Examples: Properties, Messages, Favorites, etc.

    // If user is a vendor, delete vendor profile
    if (user.role === 'agent' && user.vendorProfile) {
      await Vendor.findByIdAndDelete(user.vendorProfile);
    }

    // Delete user account permanently
    await User.findByIdAndDelete(decoded.userId);

    // Send deletion confirmation email
    try {
      await sendEmail({
        to: userEmail,
        template: 'account-deleted',
        data: {
          firstName: userName,
          email: userEmail,
          role: user.role,
          deletionDate: new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          websiteUrl: process.env.CLIENT_URL || 'https://buildhomemartsquares.com'
        }
      });
    } catch (emailError) {
      console.error('Failed to send deletion confirmation:', emailError);
    }

    res.json({
      success: true,
      message: 'Your account has been permanently deleted. All your data has been removed from our servers.'
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Deletion link has expired. Please request a new one.'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid deletion token'
    });
  }
}));

// ============= TWO-FACTOR AUTHENTICATION ROUTES =============

// @desc    Setup 2FA - Generate secret and QR code
// @route   POST /api/auth/2fa/setup
// @access  Private
router.post('/2fa/setup', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if 2FA already exists
  let twoFactorAuth = await TwoFactorAuth.findOne({ user: user._id });

  if (twoFactorAuth && twoFactorAuth.isEnabled) {
    return res.status(400).json({
      success: false,
      message: 'Two-factor authentication is already enabled'
    });
  }

  // Create or update 2FA record
  if (!twoFactorAuth) {
    twoFactorAuth = new TwoFactorAuth({ user: user._id });
  }

  // Generate secret
  const secret = twoFactorAuth.generateSecret();

  // Generate QR code
  const qrCode = await twoFactorAuth.generateQRCode(user.email);

  // Generate backup codes
  const backupCodes = twoFactorAuth.generateBackupCodes();

  await twoFactorAuth.save();

  res.json({
    success: true,
    message: '2FA setup initiated. Scan QR code with your authenticator app.',
    data: {
      secret: secret.base32,
      qrCode: qrCode,
      backupCodes: backupCodes
    }
  });
}));

// @desc    Enable 2FA - Verify setup with token
// @route   POST /api/auth/2fa/enable
// @access  Private
router.post('/2fa/enable', authenticateToken, asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Verification token is required'
    });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const twoFactorAuth = await TwoFactorAuth.findOne({ user: user._id });

  if (!twoFactorAuth) {
    return res.status(400).json({
      success: false,
      message: '2FA not set up. Please initiate setup first.'
    });
  }

  if (twoFactorAuth.isEnabled) {
    return res.status(400).json({
      success: false,
      message: '2FA is already enabled'
    });
  }

  // Verify token
  const isValid = twoFactorAuth.verifyToken(token);

  if (!isValid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid verification token'
    });
  }

  // Enable 2FA
  twoFactorAuth.isEnabled = true;
  twoFactorAuth.enabledAt = new Date();
  await twoFactorAuth.save();

  // Send confirmation email
  try {
    await sendEmail({
      to: user.email,
      template: '2fa-enabled',
      data: {
        firstName: user.profile.firstName || 'User',
        enabledDate: new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        settingsLink: `${process.env.CLIENT_URL}/settings/security`
      }
    });
  } catch (emailError) {
    console.error('Failed to send 2FA enabled email:', emailError);
  }

  res.json({
    success: true,
    message: 'Two-factor authentication has been enabled successfully'
  });
}));

// @desc    Disable 2FA
// @route   POST /api/auth/2fa/disable
// @access  Private
router.post('/2fa/disable', authenticateToken, asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required to disable 2FA'
    });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid password'
    });
  }

  const twoFactorAuth = await TwoFactorAuth.findOne({ user: user._id });

  if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
    return res.status(400).json({
      success: false,
      message: '2FA is not enabled'
    });
  }

  // Verify 2FA token if provided
  if (token) {
    const isValid = twoFactorAuth.verifyToken(token) || twoFactorAuth.verifyBackupCode(token);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA token'
      });
    }
  }

  // Disable 2FA
  twoFactorAuth.isEnabled = false;
  await twoFactorAuth.save();

  // Send confirmation email
  try {
    await sendEmail({
      to: user.email,
      template: '2fa-disabled',
      data: {
        firstName: user.profile.firstName || 'User',
        disabledDate: new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        securityLink: `${process.env.CLIENT_URL}/settings/security`
      }
    });
  } catch (emailError) {
    console.error('Failed to send 2FA disabled email:', emailError);
  }

  res.json({
    success: true,
    message: 'Two-factor authentication has been disabled'
  });
}));

// @desc    Get 2FA status
// @route   GET /api/auth/2fa/status
// @access  Private
router.get('/2fa/status', authenticateToken, asyncHandler(async (req, res) => {
  const twoFactorAuth = await TwoFactorAuth.findOne({ user: req.user.id });

  res.json({
    success: true,
    data: {
      isEnabled: twoFactorAuth?.isEnabled || false,
      method: twoFactorAuth?.method || 'totp',
      enabledAt: twoFactorAuth?.enabledAt || null,
      lastUsed: twoFactorAuth?.lastUsed || null,
      backupCodesRemaining: twoFactorAuth?.getRemainingBackupCodes() || 0
    }
  });
}));

// @desc    Regenerate backup codes
// @route   POST /api/auth/2fa/regenerate-backup-codes
// @access  Private
router.post('/2fa/regenerate-backup-codes', authenticateToken, asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required'
    });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid password'
    });
  }

  const twoFactorAuth = await TwoFactorAuth.findOne({ user: user._id });

  if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
    return res.status(400).json({
      success: false,
      message: '2FA must be enabled to regenerate backup codes'
    });
  }

  // Generate new backup codes
  const backupCodes = twoFactorAuth.generateBackupCodes();
  await twoFactorAuth.save();

  // Send email with new backup codes
  try {
    await sendEmail({
      to: user.email,
      template: 'backup-codes-regenerated',
      data: {
        firstName: user.profile.firstName || 'User',
        regeneratedDate: new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    });
  } catch (emailError) {
    console.error('Failed to send backup codes regenerated email:', emailError);
  }

  res.json({
    success: true,
    message: 'Backup codes regenerated successfully',
    data: {
      backupCodes: backupCodes
    }
  });
}));

module.exports = router;