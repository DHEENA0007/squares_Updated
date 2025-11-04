const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');
const { sendTemplateEmail } = require('../utils/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/vendor-documents');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs only
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  }
});



// @desc    Register vendor with documents
// @route   POST /api/vendor-registration/register
// @access  Private
router.post('/register', authenticateToken, upload.array('documents', 10), asyncHandler(async (req, res) => {
  const {
    // Business Information
    companyName,
    businessType,
    licenseNumber,
    gstNumber,
    panNumber,
    registrationNumber,
    website,
    
    // Professional Information
    experience,
    specializations,
    serviceAreas,
    languages,
    
    // Contact Information
    officeAddress,
    officePhone,
    whatsappNumber,
    socialMedia,
    
    // Document Types
    documentTypes
  } = req.body;

  const userId = req.user.id;
  const uploadedFiles = req.files || [];

  try {
    // Check if user already has a vendor profile
    const existingVendor = await Vendor.findOne({ user: userId });
    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor profile already exists for this user'
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Process uploaded documents
    const submittedDocuments = uploadedFiles.map((file, index) => {
      const documentType = Array.isArray(documentTypes) ? documentTypes[index] : documentTypes;
      return {
        documentType: documentType || 'other',
        documentName: file.originalname,
        documentUrl: `/uploads/vendor-documents/${file.filename}`,
        uploadedAt: new Date(),
        verified: false
      };
    });

    // Parse arrays from JSON strings
    const parsedSpecializations = typeof specializations === 'string' ? JSON.parse(specializations) : specializations || [];
    const parsedServiceAreas = typeof serviceAreas === 'string' ? JSON.parse(serviceAreas) : serviceAreas || [];
    const parsedLanguages = typeof languages === 'string' ? JSON.parse(languages) : languages || [];
    const parsedOfficeAddress = typeof officeAddress === 'string' ? JSON.parse(officeAddress) : officeAddress || {};
    const parsedSocialMedia = typeof socialMedia === 'string' ? JSON.parse(socialMedia) : socialMedia || {};

    // Create vendor profile with approval status
    const vendorData = {
      user: userId,
      
      // Business Information
      businessInfo: {
        companyName: companyName || `${user.profile.firstName} ${user.profile.lastName}`,
        businessType: businessType || 'individual',
        licenseNumber: licenseNumber || '',
        gstNumber: gstNumber || '',
        panNumber: panNumber || '',
        registrationNumber: registrationNumber || '',
        website: website || ''
      },
      
      // Professional Information
      professionalInfo: {
        experience: parseInt(experience) || 0,
        specializations: parsedSpecializations,
        serviceAreas: parsedServiceAreas.map(area => ({
          city: area.city || '',
          state: area.state || '',
          district: area.district || '',
          country: area.country || 'India',
          countryCode: 'IN'
        })),
        languages: parsedLanguages,
        certifications: []
      },
      
      // Contact Information
      contactInfo: {
        officeAddress: {
          street: parsedOfficeAddress.street || '',
          area: parsedOfficeAddress.area || '',
          city: parsedOfficeAddress.city || '',
          state: parsedOfficeAddress.state || '',
          district: parsedOfficeAddress.district || '',
          country: parsedOfficeAddress.country || 'India',
          countryCode: 'IN',
          pincode: parsedOfficeAddress.pincode || '',
          landmark: parsedOfficeAddress.landmark || ''
        },
        officePhone: officePhone || '',
        whatsappNumber: whatsappNumber || user.profile.phone || '',
        socialMedia: parsedSocialMedia
      },
      
      // Approval System
      approval: {
        status: 'pending',
        submittedAt: new Date(),
        requiredDocuments: ['identity_proof', 'address_proof', 'business_license', 'pan_card'],
        submittedDocuments
      },
      
      // Status
      status: 'pending_approval',
      
      // Performance initialization
      performance: {
        rating: {
          average: 0,
          count: 0,
          breakdown: { five: 0, four: 0, three: 0, two: 0, one: 0 }
        },
        statistics: {
          totalProperties: 0,
          activeListing: 0,
          soldProperties: 0,
          rentedProperties: 0,
          totalViews: 0,
          totalLeads: 0,
          totalClients: 0,
          responseTime: { average: 0 }
        }
      },
      
      // Settings
      settings: {
        notifications: {
          emailNotifications: true,
          smsNotifications: true,
          leadAlerts: true,
          marketingEmails: false,
          weeklyReports: true
        },
        privacy: {
          showContactInfo: true,
          showPerformanceStats: true,
          allowDirectContact: true
        }
      },
      
      // Metadata
      metadata: {
        source: 'website',
        notes: `Vendor registration submitted on ${new Date().toISOString()}`
      }
    };

    // Create vendor profile
    const vendor = new Vendor(vendorData);
    await vendor.save();

    // Update user role to agent and link vendor profile
    user.role = 'agent';
    user.status = 'pending';
    user.vendorProfile = vendor._id;
    await user.save();

    // Prepare email data for vendor submission confirmation
    const vendorEmailData = {
      firstName: user.profile.firstName,
      companyName: companyName || `${user.profile.firstName} ${user.profile.lastName}`,
      businessType: businessType || 'Individual',
      applicationId: `VEN-${vendor._id.toString().slice(-8).toUpperCase()}`,
      submittedDate: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      documentCount: submittedDocuments.length
    };

    // Prepare email data for admin notification
    const adminEmailData = {
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      email: user.email,
      phone: user.profile.phone,
      companyName: companyName || 'Not specified',
      businessType: businessType || 'Individual',
      experience: experience || 0,
      specializations: parsedSpecializations,
      applicationId: `VEN-${vendor._id.toString().slice(-8).toUpperCase()}`,
      submittedDate: new Date().toLocaleString('en-IN'),
      documentCount: submittedDocuments.length,
      adminReviewLink: `${process.env.FRONTEND_URL || 'https://squares-v2.vercel.app'}/admin/vendor-approvals`,
      documentsLink: `${process.env.FRONTEND_URL || 'https://squares-v2.vercel.app'}/admin/vendor-approvals/${vendor._id}`
    };

    // Send emails using new template system
    const emailResults = await Promise.allSettled([
      sendTemplateEmail(
        user.email,
        'vendor-application-submitted',
        vendorEmailData
      ),
      sendTemplateEmail(
        process.env.ADMIN_EMAIL || 'support@buildhomemartsquares.com',
        'admin-new-vendor-application',
        adminEmailData
      )
    ]);

    res.status(201).json({
      success: true,
      message: 'Vendor registration submitted successfully',
      data: {
        vendorId: vendor._id,
        applicationId: `VEN-${vendor._id.toString().slice(-8).toUpperCase()}`,
        status: 'pending',
        submittedDocuments: submittedDocuments.length,
        estimatedReviewTime: '2-3 business days',
        nextSteps: [
          'Document verification in progress',
          'Profile review by admin team',
          'Email notification with approval decision',
          'Account activation upon approval'
        ],
        emailNotifications: {
          vendor: emailResults[0].status === 'fulfilled' ? emailResults[0].value : null,
          admin: emailResults[1].status === 'fulfilled' ? emailResults[1].value : null
        }
      }
    });

  } catch (error) {
    console.error('Vendor registration error:', error);
    
    // Clean up uploaded files if registration fails
    if (uploadedFiles.length > 0) {
      uploadedFiles.forEach(file => {
        const filePath = path.join(__dirname, '../../uploads/vendor-documents', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Vendor registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

// @desc    Get vendor registration status
// @route   GET /api/vendor-registration/status
// @access  Private
router.get('/status', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    const vendor = await Vendor.findOne({ user: userId })
      .populate('approval.reviewedBy', 'profile.firstName profile.lastName email')
      .select('approval status createdAt businessInfo.companyName');

    if (!vendor) {
      return res.json({
        success: true,
        data: {
          hasApplication: false,
          message: 'No vendor application found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        hasApplication: true,
        applicationId: `VEN-${vendor._id.toString().slice(-8).toUpperCase()}`,
        status: vendor.approval.status,
        companyName: vendor.businessInfo.companyName,
        submittedAt: vendor.approval.submittedAt,
        reviewedAt: vendor.approval.reviewedAt,
        reviewedBy: vendor.approval.reviewedBy,
        approvalNotes: vendor.approval.approvalNotes,
        rejectionReason: vendor.approval.rejectionReason,
        submittedDocuments: vendor.approval.submittedDocuments.length,
        documentsDetails: vendor.approval.submittedDocuments.map(doc => ({
          type: doc.documentType,
          name: doc.documentName,
          verified: doc.verified,
          rejectionReason: doc.rejectionReason
        }))
      }
    });
  } catch (error) {
    console.error('Get registration status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registration status'
    });
  }
}));

module.exports = router;
