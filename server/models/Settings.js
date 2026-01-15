const mongoose = require('mongoose');

const generalSettingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'BuildHomeMart Squares' },
  siteDescription: { type: String, default: 'Premium Real Estate Platform' },
  contactEmail: { type: String, default: 'support@buildhomemartsquares.com' },
  supportEmail: { type: String, default: 'support@buildhomemartsquares.com' },
  maintenanceMode: { type: Boolean, default: false },
  registrationEnabled: { type: Boolean, default: true },
  defaultCurrency: { type: String, default: 'INR' },
  defaultLanguage: { type: String, default: 'en' },
  timezone: { type: String, default: 'Asia/Kolkata' }
});

const notificationSettingsSchema = new mongoose.Schema({
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: true },
  pushNotifications: { type: Boolean, default: true },
  adminAlerts: { type: Boolean, default: true },
  systemAlerts: { type: Boolean, default: true },
  userActivityAlerts: { type: Boolean, default: false },
  marketingEmails: { type: Boolean, default: true },
  weeklyReports: { type: Boolean, default: true }
});

const securitySettingsSchema = new mongoose.Schema({
  twoFactorAuth: { type: Boolean, default: false },
  sessionTimeout: { type: Number, default: 30 }, // minutes - also used for JWT token expiration
  passwordMinLength: { type: Number, default: 8 },
  maxLoginAttempts: { type: Number, default: 5 },
  lockoutDuration: { type: Number, default: 30 }, // minutes - how long account is locked after max attempts
  requireEmailVerification: { type: Boolean, default: true },
  requirePhoneVerification: { type: Boolean, default: false },
  allowPasswordReset: { type: Boolean, default: true },
  autoLockAccount: { type: Boolean, default: true },
  ipWhitelisting: { type: Boolean, default: false }
});

const paymentSettingsSchema = new mongoose.Schema({
  currency: { type: String, default: 'INR' },
  taxRate: { type: Number, default: 18 }, // percentage
  processingFee: { type: Number, default: 2.5 }, // percentage
  refundPolicy: { type: String, default: '7 days' },
  autoRefund: { type: Boolean, default: false },
  paymentMethods: [{ type: String, enum: ['card', 'upi', 'netbanking', 'wallet'], default: ['card', 'upi', 'netbanking'] }],
  minimumAmount: { type: Number, default: 100 },
  maximumAmount: { type: Number, default: 1000000 }
});

const systemSettingsSchema = new mongoose.Schema({
  backupEnabled: { type: Boolean, default: true },
  backupFrequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
  backupRetention: { type: Number, default: 30 }, // days
  maintenanceWindow: { type: String, default: '02:00-04:00' },
  debugMode: { type: Boolean, default: false },
  logLevel: { type: String, enum: ['error', 'warn', 'info', 'debug'], default: 'info' },
  performanceMode: { type: String, enum: ['balanced', 'performance', 'memory'], default: 'balanced' }
});

const integrationSettingsSchema = new mongoose.Schema({
  emailProvider: { type: String, enum: ['smtp', 'sendgrid', 'aws-ses'], default: 'smtp' },
  emailApiKey: { type: String },
  smsProvider: { type: String, enum: ['twilio', 'aws-sns', 'firebase'], default: 'twilio' },
  smsApiKey: { type: String },
  paymentGateway: { type: String, enum: ['razorpay', 'stripe', 'paypal'], default: 'razorpay' },
  paymentApiKey: { type: String },
  googleMapsApiKey: { type: String },
  cloudinaryApiKey: { type: String },
  firebaseConfig: {
    apiKey: { type: String },
    authDomain: { type: String },
    projectId: { type: String }
  }
});

const locationSettingsSchema = new mongoose.Schema({
  defaultCountry: { type: String, default: 'India' },
  defaultState: { type: String, default: 'Karnataka' },
  defaultCity: { type: String, default: 'Bangalore' },
  enableLocationAutodetection: { type: Boolean, default: true },
  locationDataSource: { type: String, enum: ['loca', 'google', 'mapbox'], default: 'loca' },
  radiusUnit: { type: String, enum: ['km', 'miles'], default: 'km' },
  defaultRadius: { type: Number, default: 25 }
});

const settingsSchema = new mongoose.Schema({
  // Using a singleton pattern - there should only be one settings document
  _id: { type: String, default: 'app_settings' },
  
  general: { type: generalSettingsSchema, default: () => ({}) },
  notifications: { type: notificationSettingsSchema, default: () => ({}) },
  security: { type: securitySettingsSchema, default: () => ({}) },
  payment: { type: paymentSettingsSchema, default: () => ({}) },
  system: { type: systemSettingsSchema, default: () => ({}) },
  integrations: { type: integrationSettingsSchema, default: () => ({}) },
  location: { type: locationSettingsSchema, default: () => ({}) },
  
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  version: { type: Number, default: 1 }
}, {
  timestamps: true,
  versionKey: false
});

// Static method to get or create settings
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findById('app_settings');
  
  if (!settings) {
    // Create default settings if they don't exist
    settings = await this.create({
      _id: 'app_settings'
    });
  }
  
  return settings;
};

// Static method to update specific category
settingsSchema.statics.updateCategory = async function(category, updates, updatedBy) {
  const settings = await this.getSettings();
  
  if (!settings[category]) {
    throw new Error(`Invalid settings category: ${category}`);
  }
  
  // Merge updates with existing settings
  Object.assign(settings[category], updates);
  settings.lastUpdatedBy = updatedBy;
  settings.version += 1;
  
  await settings.save();
  return settings;
};

// Static method to reset category to defaults
settingsSchema.statics.resetCategory = async function(category, updatedBy) {
  const settings = await this.getSettings();
  
  if (!settings[category]) {
    throw new Error(`Invalid settings category: ${category}`);
  }
  
  // Get the schema for this category and create default values
  const categorySchema = settingsSchema.paths[category].schema;
  const defaults = {};
  
  for (const [key, schemaType] of Object.entries(categorySchema.paths)) {
    if (key !== '_id' && schemaType.defaultValue !== undefined) {
      defaults[key] = schemaType.defaultValue;
    }
  }
  
  settings[category] = defaults;
  settings.lastUpdatedBy = updatedBy;
  settings.version += 1;
  
  await settings.save();
  return settings;
};

// Method to export settings (excluding sensitive data)
settingsSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  
  // Remove sensitive integration keys from export
  if (obj.integrations) {
    delete obj.integrations.emailApiKey;
    delete obj.integrations.smsApiKey;
    delete obj.integrations.paymentApiKey;
    delete obj.integrations.googleMapsApiKey;
    delete obj.integrations.cloudinaryApiKey;
    if (obj.integrations.firebaseConfig) {
      delete obj.integrations.firebaseConfig.apiKey;
    }
  }
  
  return obj;
};

module.exports = mongoose.model('Settings', settingsSchema);
