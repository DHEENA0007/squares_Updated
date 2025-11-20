const mongoose = require('mongoose');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const twoFactorAuthSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  secret: {
    type: String,
    required: true
  },
  backupCodes: [{
    code: {
      type: String,
      required: true
    },
    used: {
      type: Boolean,
      default: false
    },
    usedAt: Date
  }],
  isEnabled: {
    type: Boolean,
    default: false
  },
  enabledAt: Date,
  lastUsed: Date,
  method: {
    type: String,
    enum: ['totp', 'sms', 'email'],
    default: 'totp'
  }
}, {
  timestamps: true
});

twoFactorAuthSchema.methods.generateSecret = function() {
  const secret = speakeasy.generateSecret({
    name: `BuildHomeMart Squares (${this.user})`,
    length: 32
  });
  
  this.secret = secret.base32;
  return secret;
};

twoFactorAuthSchema.methods.generateBackupCodes = function(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push({
      code: code,
      used: false
    });
  }
  this.backupCodes = codes;
  return codes.map(c => c.code);
};

twoFactorAuthSchema.methods.generateQRCode = async function(userEmail) {
  const otpauthUrl = speakeasy.otpauthURL({
    secret: this.secret,
    label: userEmail,
    issuer: 'BuildHomeMart Squares',
    encoding: 'base32'
  });
  
  return await qrcode.toDataURL(otpauthUrl);
};

twoFactorAuthSchema.methods.verifyToken = function(token) {
  return speakeasy.totp.verify({
    secret: this.secret,
    encoding: 'base32',
    token: token,
    window: 2
  });
};

twoFactorAuthSchema.methods.verifyBackupCode = function(code) {
  const backupCode = this.backupCodes.find(
    bc => bc.code === code.toUpperCase() && !bc.used
  );
  
  if (backupCode) {
    backupCode.used = true;
    backupCode.usedAt = new Date();
    return true;
  }
  
  return false;
};

twoFactorAuthSchema.methods.getRemainingBackupCodes = function() {
  return this.backupCodes.filter(bc => !bc.used).length;
};

module.exports = mongoose.model('TwoFactorAuth', twoFactorAuthSchema);
