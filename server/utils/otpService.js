// OTP Service for Email Verification and 2FA
const crypto = require('crypto');

// In-memory storage for OTPs (in production, use Redis or database)
const otpStore = new Map();

// OTP Configuration
const OTP_CONFIG = {
  length: 6,
  expiryMinutes: 10,
  maxAttempts: 5,
  resendCooldown: 2 // minutes
};

/**
 * Generate a secure OTP code
 * @param {number} length - Length of OTP (default: 6)
 * @returns {string} OTP code
 */
const generateOTP = (length = OTP_CONFIG.length) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    // Use crypto.randomInt for cryptographically secure random numbers
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  
  return otp;
};

/**
 * Store OTP with expiry and attempt tracking
 * @param {string} identifier - Usually email address
 * @param {string} purpose - 'email_verification', 'password_reset', '2fa', 'password_change'
 * @param {object} options - Additional options
 * @returns {object} Generated OTP details
 */
const createOTP = async (identifier, purpose = 'email_verification', options = {}) => {
  const otp = generateOTP(options.length);
  const expiryTime = Date.now() + (options.expiryMinutes || OTP_CONFIG.expiryMinutes) * 60 * 1000;
  
  const otpData = {
    code: otp,
    purpose,
    expiryTime,
    attempts: 0,
    maxAttempts: options.maxAttempts || OTP_CONFIG.maxAttempts,
    createdAt: Date.now(),
    lastAttempt: null,
    // Store additional context for password change
    ...(purpose === 'password_change' && options.userId && { userId: options.userId })
  };
  
  // Store with composite key
  const key = `${identifier}:${purpose}`;
  otpStore.set(key, otpData);
  
  // Auto cleanup after expiry
  setTimeout(() => {
    otpStore.delete(key);
  }, (options.expiryMinutes || OTP_CONFIG.expiryMinutes) * 60 * 1000);
  
  return {
    otpCode: otp,
    expiryMinutes: options.expiryMinutes || OTP_CONFIG.expiryMinutes,
    maxAttempts: otpData.maxAttempts
  };
};

/**
 * Verify OTP code
 * @param {string} identifier - Usually email address
 * @param {string} code - OTP code to verify
 * @param {string} purpose - Purpose of OTP
 * @returns {object} Verification result
 */
const verifyOTP = async (identifier, code, purpose = 'email_verification') => {
  const key = `${identifier}:${purpose}`;
  const otpData = otpStore.get(key);
  
  if (!otpData) {
    return {
      success: false,
      error: 'OTP_NOT_FOUND',
      message: 'OTP not found or has expired'
    };
  }
  
  // Check if OTP is expired
  if (Date.now() > otpData.expiryTime) {
    otpStore.delete(key);
    return {
      success: false,
      error: 'OTP_EXPIRED',
      message: 'OTP has expired. Please request a new one.'
    };
  }
  
  // Check attempt limit
  if (otpData.attempts >= otpData.maxAttempts) {
    otpStore.delete(key);
    return {
      success: false,
      error: 'MAX_ATTEMPTS_EXCEEDED',
      message: 'Too many failed attempts. Please request a new OTP.'
    };
  }
  
  // Update attempt count
  otpData.attempts++;
  otpData.lastAttempt = Date.now();
  
  // Verify code
  if (otpData.code !== code) {
    otpStore.set(key, otpData);
    return {
      success: false,
      error: 'INVALID_OTP',
      message: 'Invalid OTP code',
      attemptsLeft: otpData.maxAttempts - otpData.attempts
    };
  }
  
  // Success - remove OTP
  otpStore.delete(key);
  
  return {
    success: true,
    message: 'OTP verified successfully'
  };
};

/**
 * Check if user can request new OTP (rate limiting)
 * @param {string} identifier - Usually email address
 * @param {string} purpose - Purpose of OTP
 * @returns {object} Rate limit check result
 */
const canRequestOTP = async (identifier, purpose = 'email_verification') => {
  const key = `${identifier}:${purpose}`;
  const otpData = otpStore.get(key);
  
  if (!otpData) {
    return { canRequest: true };
  }
  
  const timeSinceCreation = Date.now() - otpData.createdAt;
  const cooldownMs = OTP_CONFIG.resendCooldown * 60 * 1000;
  
  if (timeSinceCreation < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - timeSinceCreation) / 1000);
    return {
      canRequest: false,
      error: 'RATE_LIMITED',
      message: `Please wait ${remainingSeconds} seconds before requesting a new OTP`,
      remainingSeconds
    };
  }
  
  return { canRequest: true };
};

/**
 * Get OTP status without revealing the code
 * @param {string} identifier - Usually email address
 * @param {string} purpose - Purpose of OTP
 * @returns {object} OTP status
 */
const getOTPStatus = async (identifier, purpose = 'email_verification') => {
  const key = `${identifier}:${purpose}`;
  const otpData = otpStore.get(key);
  
  if (!otpData) {
    return { exists: false };
  }
  
  const isExpired = Date.now() > otpData.expiryTime;
  const remainingTime = Math.max(0, Math.ceil((otpData.expiryTime - Date.now()) / 1000));
  
  return {
    exists: true,
    isExpired,
    remainingSeconds: remainingTime,
    attempts: otpData.attempts,
    maxAttempts: otpData.maxAttempts,
    attemptsLeft: otpData.maxAttempts - otpData.attempts
  };
};

/**
 * Clear all OTPs for a user (useful for cleanup)
 * @param {string} identifier - Usually email address
 */
const clearUserOTPs = async (identifier) => {
  const keysToDelete = [];
  
  for (const key of otpStore.keys()) {
    if (key.startsWith(`${identifier}:`)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => otpStore.delete(key));
  
  return { cleared: keysToDelete.length };
};

/**
 * Get statistics about OTP usage
 * @returns {object} OTP statistics
 */
const getOTPStats = () => {
  const stats = {
    totalActive: otpStore.size,
    byPurpose: {},
    expired: 0
  };
  
  const now = Date.now();
  
  for (const [key, data] of otpStore.entries()) {
    const purpose = data.purpose;
    stats.byPurpose[purpose] = (stats.byPurpose[purpose] || 0) + 1;
    
    if (now > data.expiryTime) {
      stats.expired++;
    }
  }
  
  return stats;
};

module.exports = {
  generateOTP,
  createOTP,
  verifyOTP,
  canRequestOTP,
  getOTPStatus,
  clearUserOTPs,
  getOTPStats,
  OTP_CONFIG
};
