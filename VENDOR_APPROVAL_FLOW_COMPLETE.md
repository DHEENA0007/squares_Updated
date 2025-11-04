# Vendor Registration & Approval Flow - Complete Implementation

## ✅ Complete Flow Implementation

### **Registration Flow (Step 1-6)**

#### **Steps 1-5: Vendor completes registration form**
- Personal Info (Step 1)
- Business Info (Step 2)  
- Address (Step 3)
- Documents (Step 4)
- Review & Submit (Step 5)

#### **Step 5 → Step 6: Email Verification**
When vendor clicks "Proceed to Email Verification" in Step 5:
1. Calls `handleProfileSubmission()`
2. Sends OTP to vendor's email
3. Moves to Step 6 (OTP Verification)

#### **Step 6: OTP Verification & Account Creation**
When vendor enters OTP and clicks "Complete Registration":
1. Calls `handleOtpSubmit()` → `handleFinalRegistration()`
2. Verifies OTP with backend
3. Creates user account with:
   - **User.status**: `'pending'` (awaiting admin approval)
   - **User.role**: `'agent'` (vendor role)
4. Creates vendor profile with:
   - **Vendor.status**: `'pending_approval'`
   - **Vendor.approval.status**: `'pending'`
5. Sends emails:
   - ✉️ **To Vendor**: Registration successful, awaiting approval
   - ✉️ **To Admin**: New vendor application notification
6. **IMPORTANT**: Removes any auto-stored tokens
7. Redirects to `/vendor/login` after 3 seconds

---

## 🔐 Login Flow - Account Status Check

### **Vendor Login Attempt**

**File**: `server/routes/auth.js` (Lines 373-465)

```javascript
// Check account status
if (user.status === 'suspended') {
  return res.status(401).json({
    success: false,
    message: 'Account has been suspended. Please contact support.'
  });
}

if (user.status === 'pending') {
  // For vendors (agents), check if they're awaiting admin approval
  if (user.role === 'agent') {
    return res.status(403).json({
      success: false,
      message: 'Your vendor profile is under review. You will be notified once approved by our admin team.',
      reason: 'pending_approval'
    });
  }
  
  // For other users, it's email verification
  return res.status(401).json({
    success: false,
    message: 'Please verify your email before signing in.'
  });
}
```

### **Frontend Handling**

**File**: `src/pages/vendor/VendorLogin.tsx` (Lines 75-89)

```typescript
// Check if it's a pending approval error
if (errorMessage.includes("profile is under review") || 
    errorMessage.includes("pending approval") ||
    errorMessage.includes("awaiting admin approval")) {
  toast({
    title: "Account Pending Approval",
    description: errorMessage,
    variant: "default",
    duration: 5000,
  });
  return;
}
```

**Result**: Vendor sees a friendly toast message: 
> **Account Pending Approval**
> 
> Your vendor profile is under review. You will be notified once approved by our admin team.

---

## 👨‍💼 Admin Approval Process

### **Admin Dashboard - Vendor Approvals Page**

**File**: `src/pages/admin/VendorApprovals.tsx`

**API Endpoint**: `GET /api/admin/vendor-approvals?status=pending`

**Backend**: `server/routes/admin.js` (Lines 138-213)

Fetches all vendors with:
- **Vendor.approval.status**: `'pending'`
- **User.status**: `'pending'`

### **Approval Action**

**Frontend**: Admin clicks "Approve" button
- **API Endpoint**: `POST /api/admin/vendor-approvals/:vendorId/approve`
- **Backend**: `server/routes/admin.js` (Lines 261-339)

**What Happens**:
1. Updates **Vendor** model:
   - `vendor.approval.status` = `'approved'`
   - `vendor.approval.reviewedAt` = Current date
   - `vendor.approval.reviewedBy` = Admin ID
   - `vendor.verification.isVerified` = `true`
   - `vendor.status` = `'active'`
   - All submitted documents marked as verified

2. Updates **User** model:
   - `user.status` = `'active'` ✅ **THIS IS KEY!**

3. Sends email to vendor:
   - ✉️ **Template**: `vendor-application-approved`
   - Contains dashboard link, approval details

### **Rejection Action**

**API Endpoint**: `POST /api/admin/vendor-approvals/:vendorId/reject`

**What Happens**:
1. Updates **Vendor** model:
   - `vendor.approval.status` = `'rejected'`
   - `vendor.approval.rejectionReason` = Admin's reason
   - `vendor.status` = `'rejected'`

2. Updates **User** model:
   - `user.status` = `'suspended'` or `'rejected'`

3. Sends rejection email to vendor

---

## 🔄 Post-Approval Login Flow

### **After Admin Approval**

1. **User.status** = `'active'`
2. **Vendor.status** = `'active'`

### **Vendor Login Attempt**

**Backend** (`server/routes/auth.js`):
```javascript
// Status check passes (user.status === 'active')
// Generate JWT token
const token = jwt.sign(
  { userId: user._id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Return success response
res.json({
  success: true,
  message: 'Login successful',
  data: { token, user: { ... } }
});
```

**Frontend** (`VendorLogin.tsx`):
```typescript
if (success) {
  if (user?.role === 'agent') {
    toast({
      title: "Login Successful",
      description: "Welcome to your vendor dashboard!",
    });
    navigate("/vendor/dashboard"); // ✅ Success!
  }
}
```

---

## 📊 Status Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ VENDOR REGISTRATION                                          │
├─────────────────────────────────────────────────────────────┤
│ 1. Vendor fills form (Steps 1-5)                            │
│ 2. Vendor clicks "Proceed to Email Verification"            │
│    → OTP sent to email                                       │
│ 3. Vendor enters OTP and clicks "Complete Registration"     │
│    → Account created:                                        │
│      • User.status = 'pending'                              │
│      • Vendor.status = 'pending_approval'                   │
│    → Emails sent (Vendor + Admin)                           │
│    → Redirected to /vendor/login                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ VENDOR LOGIN ATTEMPT (Before Approval)                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Vendor enters credentials                                 │
│ 2. Backend checks: user.status === 'pending' + role='agent' │
│ 3. Returns 403 error with message:                          │
│    "Your vendor profile is under review..."                 │
│ 4. Frontend shows toast:                                     │
│    "Account Pending Approval"                               │
│    "Your vendor profile is under review..."                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ADMIN APPROVAL PROCESS                                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Admin navigates to Vendor Approvals page                 │
│ 2. Sees list of pending vendors                             │
│ 3. Reviews vendor details, documents                        │
│ 4. Clicks "Approve" button                                  │
│    → Vendor.status = 'active'                               │
│    → User.status = 'active' ✅                              │
│    → Approval email sent to vendor                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ VENDOR LOGIN ATTEMPT (After Approval)                        │
├─────────────────────────────────────────────────────────────┤
│ 1. Vendor enters credentials                                 │
│ 2. Backend checks: user.status === 'active' ✅              │
│ 3. JWT token generated                                       │
│ 4. Login successful                                          │
│ 5. Redirected to /vendor/dashboard                          │
│ 6. Vendor can now use the platform                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Database Fields

### **User Model** (`server/models/User.js`)
```javascript
{
  email: String,
  role: 'agent', // Vendors are agents
  status: 'pending' | 'active' | 'suspended', // Default: 'active'
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    emailVerified: Boolean
  },
  vendorProfile: ObjectId // Reference to Vendor model
}
```

### **Vendor Model** (`server/models/Vendor.js`)
```javascript
{
  user: ObjectId, // Reference to User model
  status: 'pending_approval' | 'active' | 'inactive' | 'suspended',
  approval: {
    status: 'pending' | 'approved' | 'rejected' | 'under_review',
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: ObjectId,
    approvalNotes: String,
    rejectionReason: String,
    submittedDocuments: [{
      documentType: String,
      documentName: String,
      documentUrl: String,
      verified: Boolean
    }]
  },
  verification: {
    isVerified: Boolean,
    verificationLevel: 'basic' | 'advanced' | 'premium',
    verificationDate: Date
  },
  businessInfo: { ... },
  professionalInfo: { ... },
  contactInfo: { ... }
}
```

---

## 🔧 Files Involved

### **Frontend**
1. `src/pages/vendor/VendorRegister.tsx` - Registration flow
2. `src/pages/vendor/VendorLogin.tsx` - Login with approval check
3. `src/pages/admin/VendorApprovals.tsx` - Admin approval page
4. `src/services/authService.ts` - Authentication API calls

### **Backend**
1. `server/routes/auth.js` - Registration & Login routes
2. `server/routes/admin.js` - Vendor approval routes
3. `server/models/User.js` - User model
4. `server/models/Vendor.js` - Vendor model
5. `server/utils/emailService.js` - Email notifications

---

## ✨ Email Notifications

### **1. Vendor Registration Confirmation**
- **To**: Vendor's email
- **Template**: `vendor-profile-submitted-confirmation`
- **Content**: 
  - Registration successful
  - Application ID
  - Submission date
  - "Under Review" message
  - Support contact info

### **2. Admin New Vendor Notification**
- **To**: Admin email (from env: ADMIN_EMAIL)
- **Template**: `admin-new-vendor-application`
- **Content**:
  - Vendor details
  - Business type
  - Application ID
  - Review link
  - Document count

### **3. Vendor Approval Email**
- **To**: Vendor's email
- **Template**: `vendor-application-approved`
- **Content**:
  - Approval confirmation
  - Dashboard link
  - Setup guide link
  - Approval notes

### **4. Vendor Rejection Email**
- **To**: Vendor's email
- **Template**: `vendor-application-rejected`
- **Content**:
  - Rejection reason
  - Resubmission instructions (if allowed)
  - Support contact

---

## 🎉 Summary

### **The Complete Flow Works Like This:**

1. ✅ Vendor completes all 6 steps including OTP verification
2. ✅ Account created with `status: 'pending'` 
3. ✅ Vendor cannot login (gets "under review" message)
4. ✅ Admin receives notification email
5. ✅ Admin reviews in `/admin/vendor-approvals` page
6. ✅ Admin approves → User status changes to `'active'`
7. ✅ Vendor receives approval email
8. ✅ Vendor can now login and access dashboard

### **Status Transitions:**

```
Registration → pending → (Admin Review) → approved/rejected
              ↓                            ↓
         Cannot Login              Can Login (if approved)
                                   Cannot Login (if rejected)
```

---

## 🔍 Testing Checklist

- [ ] Vendor can complete registration with OTP
- [ ] Vendor receives confirmation email after registration
- [ ] Admin receives notification about new vendor
- [ ] Vendor cannot login before approval (sees "under review" message)
- [ ] Admin can see pending vendors in approval page
- [ ] Admin can approve vendor
- [ ] Vendor receives approval email
- [ ] Vendor can login after approval
- [ ] Vendor is redirected to dashboard
- [ ] Admin can reject vendor
- [ ] Rejected vendor cannot login (sees appropriate message)

---

**Last Updated**: November 4, 2025  
**Status**: ✅ FULLY IMPLEMENTED
