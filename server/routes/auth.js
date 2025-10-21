const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { asyncHandler, validateRequest } = require('../middleware/errorMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const { sendEmail } = require('../utils/emailService');
const { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} = require('../utils/validationSchemas');

const router = express.Router();

// @desc    Register new user
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
    agreeToTerms 
  } = req.body;

  if (!agreeToTerms) {
    return res.status(400).json({
      success: false,
      message: 'You must agree to the terms and conditions'
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

  // Create user
  const user = new User({
    email,
    password,
    role,
    status: 'pending',
    profile: {
      firstName,
      lastName,
      phone,
      emailVerified: false
    }
  });

  await user.save();

  // Generate email verification token
  const verificationToken = jwt.sign(
    { userId: user._id, type: 'email_verification' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Send verification email
  try {
    await sendEmail({
      to: email,
      subject: 'Verify Your Email - Ninety Nine Acres',
      template: 'email-verification',
      data: {
        firstName,
        verificationLink: `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`
      }
    });
  } catch (emailError) {
    console.error('Failed to send verification email:', emailError);
  }

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please check your email for verification.',
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status
      }
    }
  });
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', validateRequest(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Get user
  const user = await User.findOne({ email });
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Check account status
  if (user.status === 'suspended') {
    return res.status(401).json({
      success: false,
      message: 'Account has been suspended. Please contact support.'
    });
  }

  if (user.status === 'pending') {
    return res.status(401).json({
      success: false,
      message: 'Please verify your email before signing in.'
    });
  }

  // Update last login
  user.profile.lastLogin = new Date();
  await user.save();

  // Generate JWT token
  const token = jwt.sign(
    { 
      userId: user._id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

  // Set secure cookie
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  res.cookie('token', token, cookieOptions);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile
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

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
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

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', validateRequest(forgotPasswordSchema), asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({
      success: true,
      message: 'If an account with that email exists, we sent a password reset link.'
    });
  }

  // Generate reset token
  const resetToken = jwt.sign(
    { userId: user._id, type: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Send reset email
  try {
    await sendEmail({
      to: email,
      subject: 'Password Reset - Ninety Nine Acres',
      template: 'password-reset',
      data: {
        firstName: user.profile.firstName || 'User',
        resetLink: `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`
      }
    });
  } catch (emailError) {
    console.error('Failed to send reset email:', emailError);
  }

  res.json({
    success: true,
    message: 'If an account with that email exists, we sent a password reset link.'
  });
}));

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', validateRequest(resetPasswordSchema), asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Update password
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    user.password = password;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'Invalid reset token'
    });
  }
}));

// @desc    Change password
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

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

module.exports = router;