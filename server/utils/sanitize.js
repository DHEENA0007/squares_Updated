/**
 * Server-side sanitization utilities
 */

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
const escapeRegex = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Sanitize search query for MongoDB regex
 */
const sanitizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') return '';

  // Remove potential malicious patterns
  let sanitized = query.trim();

  // Limit length to prevent DOS
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  // Escape regex special characters
  return escapeRegex(sanitized);
};

/**
 * Validate and sanitize price
 */
const sanitizePrice = (price) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(numPrice) || numPrice < 0 || numPrice > 100000000000) {
    throw new Error('Invalid price value');
  }

  return numPrice;
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Indian phone number
 */
const validateIndianPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Sanitize filename to prevent path traversal
 */
const sanitizeFilename = (filename) => {
  if (!filename || typeof filename !== 'string') return '';

  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');

  // Remove any path separators
  sanitized = sanitized.replace(/[\/\\]/g, '');

  // Remove any null bytes
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized;
};

/**
 * Sanitize CSV value to prevent CSV injection
 */
const sanitizeCSV = (value) => {
  if (value === null || value === undefined) return '';

  const str = String(value);

  // Check if value starts with potentially dangerous characters
  if (/^[=+\-@]/.test(str)) {
    // Prefix with single quote to neutralize formula
    return `'${str}`;
  }

  return str;
};

/**
 * Validate date string
 */
const validateDate = (dateString) => {
  if (!dateString) return false;

  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

/**
 * Sanitize MongoDB ObjectId
 */
const sanitizeObjectId = (id) => {
  if (!id || typeof id !== 'string') return null;

  // ObjectId is 24 hex characters
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return null;
  }

  return id;
};

/**
 * Sanitize pagination parameters
 */
const sanitizePagination = (page, limit) => {
  const sanitizedPage = Math.max(1, parseInt(page) || 1);
  const sanitizedLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));

  return {
    page: sanitizedPage,
    limit: sanitizedLimit,
    skip: (sanitizedPage - 1) * sanitizedLimit
  };
};

/**
 * Validate password strength
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters long' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }

  return { valid: true, message: 'Password is strong' };
};

module.exports = {
  escapeRegex,
  sanitizeSearchQuery,
  sanitizePrice,
  validateEmail,
  validateIndianPhone,
  sanitizeFilename,
  sanitizeCSV,
  validateDate,
  sanitizeObjectId,
  sanitizePagination,
  validatePassword
};
