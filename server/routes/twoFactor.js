const express = require('express');
const TwoFactorAuth = require('../models/TwoFactorAuth');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const { sendEmail } = require('../utils/emailService');

const router = express.Router();

// @desc    Setup 2FA - Generate QR code
// @route   POST /api/2fa/setup
// @access  Private
router.post('/setup', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if 2FA already exists
  let twoFA = await TwoFactorAuth.findOne({ user: userId });
  
  if (twoFA && twoFA.isEnabled) {
    return res.status(400).json({
      success: false,
      message: '2FA is already enabled. Disable it first to set up again.'
    });
  }

  // Create or update 2FA
  if (!twoFA) {
    twoFA = new TwoFactorAuth({ user: userId });
  }

  // Generate secret and backup codes
  const secret = twoFA.generateSecret();
  const backupCodes = twoFA.generateBackupCodes();
  
  await twoFA.save();

  // Generate QR code
  const qrCode = await twoFA.generateQRCode(user.email);

  res.json({
    success: true,
    message: '2FA setup initiated. Scan the QR code with your authenticator app.',
    data: {
      qrCode,
      secret: secret.base32,
      backupCodes
    }
  });
}));

// @desc    Enable 2FA - Verify setup
// @route   POST /api/2fa/enable
// @access  Private
router.post('/enable', authenticateToken, asyncHandler(async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Verification token is required'
    });
  }

  const twoFA = await TwoFactorAuth.findOne({ user: userId });
  
  if (!twoFA) {
    return res.status(404).json({
      success: false,
      message: '2FA not set up. Please set up 2FA first.'
    });
  }

  if (twoFA.isEnabled) {
    return res.status(400).json({
      success: false,
      message: '2FA is already enabled'
    });
  }

  // Verify token
  const isValid = twoFA.verifyToken(token);
  
  if (!isValid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid verification code. Please try again.'
    });
  }

  // Enable 2FA
  twoFA.isEnabled = true;
  twoFA.enabledAt = new Date();
  await twoFA.save();

  // Send confirmation email
  const user = await User.findById(userId);
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
        disableLink: `${process.env.CLIENT_URL}/settings/security`
      }
    });
  } catch (emailError) {
    console.error('Failed to send 2FA enabled email:', emailError);
  }

  res.json({
    success: true,
    message: '2FA has been successfully enabled for your account'
  });
}));

// @desc    Disable 2FA
// @route   POST /api/2fa/disable
// @access  Private
router.post('/disable', authenticateToken, asyncHandler(async (req, res) => {
  const { password, token } = req.body;
  const userId = req.user.id;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required to disable 2FA'
    });
  }

  const user = await User.findById(userId);
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

  const twoFA = await TwoFactorAuth.findOne({ user: userId });
  
  if (!twoFA || !twoFA.isEnabled) {
    return res.status(400).json({
      success: false,
      message: '2FA is not enabled'
    });
  }

  // Verify 2FA token before disabling
  if (!token) {
    return res.status(400).json({
      success: false,
      message: '2FA code is required to disable 2FA'
    });
  }

  const isValidToken = twoFA.verifyToken(token) || twoFA.verifyBackupCode(token);
  if (!isValidToken) {
    return res.status(400).json({
      success: false,
      message: 'Invalid 2FA code'
    });
  }

  // Disable 2FA
  twoFA.isEnabled = false;
  await twoFA.save();

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
        enableLink: `${process.env.CLIENT_URL}/settings/security`
      }
    });
  } catch (emailError) {
    console.error('Failed to send 2FA disabled email:', emailError);
  }

  res.json({
    success: true,
    message: '2FA has been disabled for your account'
  });
}));

// @desc    Get 2FA status
// @route   GET /api/2fa/status
// @access  Private
router.get('/status', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const twoFA = await TwoFactorAuth.findOne({ user: userId });
  
  res.json({
    success: true,
    data: {
      isEnabled: twoFA ? twoFA.isEnabled : false,
      method: twoFA ? twoFA.method : null,
      enabledAt: twoFA ? twoFA.enabledAt : null,
      lastUsed: twoFA ? twoFA.lastUsed : null,
      remainingBackupCodes: twoFA ? twoFA.getRemainingBackupCodes() : 0
    }
  });
}));

// @desc    Regenerate backup codes
// @route   POST /api/2fa/regenerate-backup-codes
// @access  Private
router.post('/regenerate-backup-codes', authenticateToken, asyncHandler(async (req, res) => {
  const { password, token } = req.body;
  const userId = req.user.id;

  if (!password || !token) {
    return res.status(400).json({
      success: false,
      message: 'Password and 2FA token are required'
    });
  }

  const user = await User.findById(userId);
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

  const twoFA = await TwoFactorAuth.findOne({ user: userId });
  
  if (!twoFA || !twoFA.isEnabled) {
    return res.status(400).json({
      success: false,
      message: '2FA is not enabled'
    });
  }

  // Verify 2FA token
  const isValidToken = twoFA.verifyToken(token);
  if (!isValidToken) {
    return res.status(400).json({
      success: false,
      message: 'Invalid 2FA code'
    });
  }

  // Regenerate backup codes
  const backupCodes = twoFA.generateBackupCodes();
  await twoFA.save();

  // Send email with new backup codes
  try {
    await sendEmail({
      to: user.email,
      template: 'backup-codes-regenerated',
      data: {
        firstName: user.profile.firstName || 'User',
        backupCodes: backupCodes.join(', '),
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
    console.error('Failed to send backup codes email:', emailError);
  }

  res.json({
    success: true,
    message: 'Backup codes have been regenerated',
    data: {
      backupCodes
    }
  });
}));

module.exports = router;
