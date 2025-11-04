const Joi = require('joi');

// User registration schema
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    'any.required': 'Password is required'
  }),
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters',
    'any.required': 'First name is required'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters',
    'any.required': 'Last name is required'
  }),
  phone: Joi.string().pattern(new RegExp('^[+]?[1-9]\\d{1,14}$')).required().messages({
    'string.pattern.base': 'Please provide a valid phone number',
    'any.required': 'Phone number is required'
  }),
  role: Joi.string().valid('customer', 'agent', 'service_provider').default('customer'),
  agreeToTerms: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must agree to the terms and conditions',
    'any.required': 'You must agree to the terms and conditions'
  }),
  // Optional business info for vendors
  businessInfo: Joi.object({
    businessName: Joi.string().min(2).max(100),
    businessType: Joi.string().max(50),
    businessDescription: Joi.string().max(500),
    experience: Joi.string().max(20),
    address: Joi.string().max(200),
    city: Joi.string().max(50),
    state: Joi.string().max(50),
    pincode: Joi.string().max(10),
    licenseNumber: Joi.string().max(50),
    gstNumber: Joi.string().max(15),
    panNumber: Joi.string().max(10)
  }).optional(),
  // Optional documents for vendors
  documents: Joi.object({
    businessRegistration: Joi.object({
      name: Joi.string(),
      url: Joi.string().uri(),
      size: Joi.number()
    }).optional(),
    professionalLicense: Joi.object({
      name: Joi.string(),
      url: Joi.string().uri(),
      size: Joi.number()
    }).optional(),
    identityProof: Joi.object({
      name: Joi.string(),
      url: Joi.string().uri(),
      size: Joi.number()
    }).optional()
  }).optional(),
  // OTP for email verification
  otp: Joi.string().pattern(new RegExp('^[0-9]{6}$')).required().messages({
    'string.pattern.base': 'OTP must be a 6-digit number',
    'any.required': 'Email verification OTP is required'
  })
});

// User login schema
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

// Forgot password schema
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
});

// Reset password schema
const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required'
  }),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    'any.required': 'Password is required'
  })
});

// Property creation schema
const propertySchema = Joi.object({
  title: Joi.string().min(10).max(200).required().messages({
    'string.min': 'Property title must be at least 10 characters long',
    'string.max': 'Property title cannot exceed 200 characters',
    'any.required': 'Property title is required'
  }),
  description: Joi.string().min(50).max(2000).required().messages({
    'string.min': 'Property description must be at least 50 characters long',
    'string.max': 'Property description cannot exceed 2000 characters',
    'any.required': 'Property description is required'
  }),
  price: Joi.number().positive().required().messages({
    'number.positive': 'Price must be a positive number',
    'any.required': 'Price is required'
  }),
  propertyType: Joi.string().valid('apartment', 'villa', 'house', 'commercial', 'plot', 'office').required().messages({
    'any.only': 'Property type must be one of: apartment, villa, house, commercial, plot, office',
    'any.required': 'Property type is required'
  }),
  listingType: Joi.string().valid('sell', 'rent').required().messages({
    'any.only': 'Listing type must be either sell or rent',
    'any.required': 'Listing type is required'
  }),
  bhk: Joi.string().valid('1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK').allow(null),
  area: Joi.number().positive().required().messages({
    'number.positive': 'Area must be a positive number',
    'any.required': 'Area is required'
  }),
  address: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Address must be at least 10 characters long',
    'string.max': 'Address cannot exceed 500 characters',
    'any.required': 'Address is required'
  }),
  city: Joi.string().min(2).max(100).required().messages({
    'string.min': 'City must be at least 2 characters long',
    'string.max': 'City cannot exceed 100 characters',
    'any.required': 'City is required'
  }),
  state: Joi.string().min(2).max(100).required().messages({
    'string.min': 'State must be at least 2 characters long',
    'string.max': 'State cannot exceed 100 characters',
    'any.required': 'State is required'
  }),
  pincode: Joi.string().pattern(new RegExp('^[0-9]{6}$')).required().messages({
    'string.pattern.base': 'Pincode must be a 6-digit number',
    'any.required': 'Pincode is required'
  }),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180)
  }).allow(null),
  images: Joi.array().items(
    Joi.object({
      url: Joi.string().uri().required(),
      isPrimary: Joi.boolean().default(false),
      caption: Joi.string().max(200).allow('')
    })
  ).min(1).max(20).messages({
    'array.min': 'At least one image is required',
    'array.max': 'Maximum 20 images allowed'
  }),
  amenities: Joi.array().items(Joi.string().max(100)).max(50).default([]),
  nearbyPlaces: Joi.array().items(
    Joi.object({
      name: Joi.string().max(200).required(),
      type: Joi.string().valid('school', 'hospital', 'mall', 'metro', 'bus_stop', 'airport', 'restaurant', 'bank', 'atm', 'park').required(),
      distance: Joi.number().positive().max(100).required()
    })
  ).max(20).default([]),
  ageOfProperty: Joi.number().min(0).max(100).allow(null),
  furnishingStatus: Joi.string().valid('furnished', 'semi_furnished', 'unfurnished').allow(null),
  parkingSpaces: Joi.number().min(0).max(10).allow(null),
  totalFloors: Joi.number().min(1).max(200).allow(null),
  propertyFloor: Joi.number().min(0).max(200).allow(null),
  facingDirection: Joi.string().valid('north', 'south', 'east', 'west', 'north_east', 'north_west', 'south_east', 'south_west').allow(null)
});

// Service request schema
const serviceRequestSchema = Joi.object({
  serviceType: Joi.string().valid('home_loan', 'movers', 'legal', 'interior', 'cleaning', 'security').required().messages({
    'any.only': 'Service type must be one of: home_loan, movers, legal, interior, cleaning, security',
    'any.required': 'Service type is required'
  }),
  title: Joi.string().min(10).max(200).required().messages({
    'string.min': 'Service title must be at least 10 characters long',
    'string.max': 'Service title cannot exceed 200 characters',
    'any.required': 'Service title is required'
  }),
  description: Joi.string().min(20).max(1000).required().messages({
    'string.min': 'Service description must be at least 20 characters long',
    'string.max': 'Service description cannot exceed 1000 characters',
    'any.required': 'Service description is required'
  }),
  propertyId: Joi.string().uuid().allow(null),
  providerId: Joi.string().uuid().allow(null),
  amount: Joi.number().positive().allow(null),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  metadata: Joi.object().default({})
});

// Contact/Message schema
const messageSchema = Joi.object({
  message: Joi.string().min(1).max(2000).required().messages({
    'string.min': 'Message cannot be empty',
    'string.max': 'Message cannot exceed 2000 characters',
    'any.required': 'Message is required'
  }),
  attachments: Joi.array().items(
    Joi.object({
      url: Joi.string().uri().required(),
      type: Joi.string().required(),
      name: Joi.string().required(),
      size: Joi.number().positive().required()
    })
  ).max(5).default([])
});

// User profile update schema
const profileUpdateSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters'
  }),
  lastName: Joi.string().min(2).max(50).messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters'
  }),
  phone: Joi.string().pattern(new RegExp('^[+]?[1-9]\\d{1,14}$')).messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  bio: Joi.string().max(500).allow('').messages({
    'string.max': 'Bio cannot exceed 500 characters'
  }),
  address: Joi.string().max(500).allow('').messages({
    'string.max': 'Address cannot exceed 500 characters'
  }),
  dateOfBirth: Joi.date().max('now').allow(null).messages({
    'date.max': 'Date of birth cannot be in the future'
  }),
  gender: Joi.string().valid('male', 'female', 'other').allow(null),
  preferences: Joi.object().default({})
});

// Rating schema
const ratingSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required().messages({
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
    'any.required': 'Rating is required'
  }),
  review: Joi.string().max(1000).allow('').messages({
    'string.max': 'Review cannot exceed 1000 characters'
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  propertySchema,
  serviceRequestSchema,
  messageSchema,
  profileUpdateSchema,
  ratingSchema
};