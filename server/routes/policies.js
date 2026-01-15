const express = require('express');
const router = express.Router();
const Policy = require('../models/Policy');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { hasPermission } = require('../middleware/roleMiddleware');
const { PERMISSIONS } = require('../utils/permissions');
const { sendEmail } = require('../utils/emailService');

const { authenticateToken, requireAdmin, requireSubAdmin } = authMiddleware;

// Verify middleware functions are loaded
if (!authenticateToken || !requireAdmin || !requireSubAdmin) {
  console.error('Auth middleware not loaded correctly:', { authenticateToken: !!authenticateToken, requireAdmin: !!requireAdmin, requireSubAdmin: !!requireSubAdmin });
  throw new Error('Auth middleware functions are not properly exported');
}

// Get policy by type (public endpoint)
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    if (!['privacy-policy', 'refund-policy'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid policy type'
      });
    }

    let policy = await Policy.findOne({ type });
    
    if (!policy) {
      // Return default content if no policy exists
      const defaultContent = getDefaultContent(type);
      return res.json({
        success: true,
        data: {
          type,
          content: defaultContent,
          lastUpdated: new Date(),
          isDefault: true
        }
      });
    }

    res.json({
      success: true,
      data: policy
    });
  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch policy'
    });
  }
});

// Admin: Get policy
router.get('/admin/:type', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    
    if (!['privacy-policy', 'refund-policy'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid policy type'
      });
    }

    let policy = await Policy.findOne({ type }).populate('updatedBy', 'email profile.firstName profile.lastName');
    
    if (!policy) {
      const defaultContent = getDefaultContent(type);
      return res.json({
        success: true,
        data: {
          type,
          content: defaultContent,
          lastUpdated: new Date(),
          isDefault: true
        }
      });
    }

    res.json({
      success: true,
      data: policy
    });
  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch policy'
    });
  }
});

// Admin: Update policy
router.put('/admin/:type', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { content } = req.body;
    
    if (!['privacy-policy', 'refund-policy'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid policy type'
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Policy content is required'
      });
    }

    let policy = await Policy.findOne({ type });
    
    if (policy) {
      policy.content = content;
      policy.lastUpdated = new Date();
      policy.updatedBy = req.user.id;
      await policy.save();
    } else {
      policy = await Policy.create({
        type,
        content,
        updatedBy: req.user.id
      });
    }

    await policy.populate('updatedBy', 'email profile.firstName profile.lastName');

    // Send email notifications to all non-admin users
    try {
      const nonAdminUsers = await User.find({ 
        role: { $nin: ['superadmin', 'admin', 'subadmin'] },
        email: { $exists: true, $ne: null }
      }).select('email profile.firstName profile.lastName');

      const policyTitle = type === 'privacy-policy' ? 'Privacy Policy' : 'Refund & Cancellation Policy';
      const policyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/${type}`;

      // Send emails in batches to avoid overwhelming the server
      const batchSize = 50;
      for (let i = 0; i < nonAdminUsers.length; i += batchSize) {
        const batch = nonAdminUsers.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(user => 
            sendEmail({
              to: user.email,
              subject: `${policyTitle} Updated - BuildHomeMart Squares`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
                    <p style="color: #666; margin: 5px 0 0 0;">Policy Update Notification</p>
                  </div>
                  
                  <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
                    <h2 style="color: #92400e; margin: 0 0 20px 0;">📝 Our ${policyTitle} Has Been Updated</h2>
                    <p style="color: #92400e; line-height: 1.6; margin: 0 0 20px 0;">
                      Hello ${user.profile?.firstName || 'Valued User'},
                    </p>
                    <p style="color: #92400e; line-height: 1.6; margin: 0 0 20px 0;">
                      We wanted to inform you that we've updated our <strong>${policyTitle}</strong>. These changes are effective immediately.
                    </p>
                    
                    <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                      <h3 style="color: #1e293b; margin: 0 0 15px 0;">What This Means:</h3>
                      <ul style="color: #475569; line-height: 1.6; padding-left: 20px; margin: 0;">
                        <li>We've made improvements to better protect your rights and clarify our services</li>
                        <li>Continued use of our services means you accept these updated terms</li>
                        <li>We encourage you to review the changes at your convenience</li>
                      </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${policyUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                        Review ${policyTitle}
                      </a>
                    </div>
                    
                    <div style="background: #e0f2fe; border: 1px solid #7dd3fc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                      <p style="color: #0c4a6e; margin: 0; font-size: 14px;">
                        <strong>Updated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    
                    <p style="color: #92400e; font-size: 14px; margin: 20px 0 0 0;">
                      If you have any questions or concerns about these changes, please don't hesitate to contact our support team.
                    </p>
                  </div>
                  
                  <div style="text-align: center; color: #94a3b8; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} BuildHomeMart Squares. All rights reserved.</p>
                    <p>Support: support@buildhomemartsquares.com</p>
                  </div>
                </div>
              `
            })
          )
        );
      }

      console.log(`✅ Policy update notifications sent to ${nonAdminUsers.length} users`);
    } catch (emailError) {
      console.error('Error sending policy update emails:', emailError);
      // Don't fail the request if email sending fails
    }

    res.json({
      success: true,
      message: 'Policy updated successfully',
      data: policy
    });
  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update policy'
    });
  }
});

// SubAdmin: Get policy (with permission check)
router.get('/subadmin/:type', authenticateToken, requireSubAdmin, hasPermission(PERMISSIONS.POLICIES_READ), async (req, res) => {
  try {
    const { type } = req.params;
    
    if (!['privacy-policy', 'refund-policy'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid policy type'
      });
    }

    let policy = await Policy.findOne({ type }).populate('updatedBy', 'email profile.firstName profile.lastName');
    
    if (!policy) {
      const defaultContent = getDefaultContent(type);
      return res.json({
        success: true,
        data: {
          type,
          content: defaultContent,
          lastUpdated: new Date(),
          isDefault: true
        }
      });
    }

    res.json({
      success: true,
      data: policy
    });
  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch policy'
    });
  }
});

// SubAdmin: Update policy (with permission check based on type)
router.put('/subadmin/:type', authenticateToken, requireSubAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { content } = req.body;
    
    if (!['privacy-policy', 'refund-policy'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid policy type'
      });
    }

    // Check specific permission based on policy type
    const requiredPermission = type === 'privacy-policy' 
      ? PERMISSIONS.POLICIES_EDIT_PRIVACY 
      : PERMISSIONS.POLICIES_EDIT_REFUND;
    
    // Check if user has admin role or specific permission
    const hasAdminRole = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'subadmin';
    const hasRequiredPermission = req.user.rolePermissions && req.user.rolePermissions.includes(requiredPermission);
    
    if (!hasAdminRole && !hasRequiredPermission) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to edit the ${type === 'privacy-policy' ? 'Privacy Policy' : 'Refund Policy'}`
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Policy content is required'
      });
    }

    let policy = await Policy.findOne({ type });
    
    if (policy) {
      policy.content = content;
      policy.lastUpdated = new Date();
      policy.updatedBy = req.user.id;
      await policy.save();
    } else {
      policy = await Policy.create({
        type,
        content,
        updatedBy: req.user.id
      });
    }

    await policy.populate('updatedBy', 'email profile.firstName profile.lastName');

    // Send email notifications to all non-admin users
    try {
      const nonAdminUsers = await User.find({ 
        role: { $nin: ['superadmin', 'admin', 'subadmin'] },
        email: { $exists: true, $ne: null }
      }).select('email profile.firstName profile.lastName');

      const policyTitle = type === 'privacy-policy' ? 'Privacy Policy' : 'Refund & Cancellation Policy';
      const policyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/${type}`;

      // Send emails in batches to avoid overwhelming the server
      const batchSize = 50;
      for (let i = 0; i < nonAdminUsers.length; i += batchSize) {
        const batch = nonAdminUsers.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(user => 
            sendEmail({
              to: user.email,
              subject: `${policyTitle} Updated - BuildHomeMart Squares`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2563eb; margin: 0;">BuildHomeMart Squares</h1>
                    <p style="color: #666; margin: 5px 0 0 0;">Policy Update Notification</p>
                  </div>
                  
                  <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
                    <h2 style="color: #92400e; margin: 0 0 20px 0;">📝 Our ${policyTitle} Has Been Updated</h2>
                    <p style="color: #92400e; line-height: 1.6; margin: 0 0 20px 0;">
                      Hello ${user.profile?.firstName || 'Valued User'},
                    </p>
                    <p style="color: #92400e; line-height: 1.6; margin: 0 0 20px 0;">
                      We wanted to inform you that we've updated our <strong>${policyTitle}</strong>. These changes are effective immediately.
                    </p>
                    
                    <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                      <h3 style="color: #1e293b; margin: 0 0 15px 0;">What This Means:</h3>
                      <ul style="color: #475569; line-height: 1.6; padding-left: 20px; margin: 0;">
                        <li>We've made improvements to better protect your rights and clarify our services</li>
                        <li>Continued use of our services means you accept these updated terms</li>
                        <li>We encourage you to review the changes at your convenience</li>
                      </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${policyUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                        Review ${policyTitle}
                      </a>
                    </div>
                    
                    <div style="background: #e0f2fe; border: 1px solid #7dd3fc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                      <p style="color: #0c4a6e; margin: 0; font-size: 14px;">
                        <strong>Updated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    
                    <p style="color: #92400e; font-size: 14px; margin: 20px 0 0 0;">
                      If you have any questions or concerns about these changes, please don't hesitate to contact our support team.
                    </p>
                  </div>
                  
                  <div style="text-align: center; color: #94a3b8; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} BuildHomeMart Squares. All rights reserved.</p>
                    <p>Support: support@buildhomemartsquares.com</p>
                  </div>
                </div>
              `
            })
          )
        );
      }

      console.log(`✅ Policy update notifications sent to ${nonAdminUsers.length} users`);
    } catch (emailError) {
      console.error('Error sending policy update emails:', emailError);
      // Don't fail the request if email sending fails
    }

    res.json({
      success: true,
      message: 'Policy updated successfully',
      data: policy
    });
  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update policy'
    });
  }
});

function getDefaultContent(type) {
  if (type === 'privacy-policy') {
    return `
      <h2>1. Information We Collect</h2>
      <p>We collect information that you provide directly to us, including when you create an account, list a property, contact us, or use our services.</p>
      
      <h2>2. How We Use Your Information</h2>
      <p>We use the information we collect to provide, maintain, and improve our services.</p>
      
      <h2>3. Information Sharing</h2>
      <p>We do not share your personal information with third parties except as described in this policy.</p>
      
      <h2>4. Data Security</h2>
      <p>We implement appropriate technical and organizational measures to protect your personal information.</p>
      
      <h2>5. Your Rights</h2>
      <p>You have the right to access, update, or delete your personal information at any time.</p>
    `;
  } else {
    return `
      <h2>1. Subscription Refund Policy</h2>
      <p>We offer a 7-day money-back guarantee on all subscription plans.</p>
      
      <h2>2. Cancellation Process</h2>
      <p>You may cancel your subscription at any time through your account settings.</p>
      
      <h2>3. Refund Eligibility</h2>
      <p>Refunds are available under specific conditions outlined in this section.</p>
      
      <h2>4. Non-Refundable Items</h2>
      <p>Certain items and services are not eligible for refunds.</p>
      
      <h2>5. Refund Processing Time</h2>
      <p>Approved refunds will be processed within 5-7 business days.</p>
    `;
  }
}

module.exports = router;
