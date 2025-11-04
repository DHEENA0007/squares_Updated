# Vendor Approval Flow - Complete Implementation

## Overview
Implemented a complete vendor approval workflow where vendors cannot login until admin approves their account. Vendors see "Profile under review" message when attempting to login before approval.

---

## Flow Diagram

```
Vendor Registration
        ↓
Step 1-5: Complete all forms
        ↓
Step 6: Email OTP Verification
        ↓
Account Created with:
├── User.status = 'pending' (NOT 'active')
└── Vendor.status = 'pending_approval'
        ↓
Admin Notification Email Sent
        ↓
Vendor tries to login → ❌ BLOCKED
        ↓
"Profile under review" message shown
        ↓
Admin Reviews in Vendor Approvals Page
        ↓
Admin Approves
        ↓
User.status = 'active'
Vendor.status = 'active'
        ↓
Vendor Approval Email Sent
        ↓
Vendor can now login ✅
```

---

## Changes Made

### 1. Backend: Registration Flow (`server/routes/auth.js`)

#### Changed User Status for Vendors
**Location**: Line ~195
```javascript
// BEFORE
status: 'active', // User is active since email is verified through OTP

// AFTER
status: role === 'agent' ? 'pending' : 'active', // Vendors need admin approval
```

#### Changed Vendor Status
**Location**: Line ~240
```javascript
// BEFORE
status: 'pending_verification', // Awaiting admin approval for business verification

// AFTER
status: 'pending_approval', // Awaiting admin approval for business verification
metadata: {
  source: 'website',
  notes: 'Created during registration - Awaiting admin approval'
}
```

### 2. Backend: Login Flow (`server/routes/auth.js`)

#### Added Vendor Approval Check
**Location**: Line ~395
```javascript
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

### 3. Frontend: Admin Sidebar (`src/components/adminpanel/Sidebar.tsx`)

#### Added Vendor Approvals Link
```javascript
import { UserCheck } from "lucide-react";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: UserCheck, label: "Vendor Approvals", path: "/admin/vendor-approvals" }, // ✅ NEW
  // ... other items
];
```

### 4. Frontend: Admin Routes (`src/routes/AdminRoutes.tsx`)

#### Added Route for Vendor Approvals
```javascript
import { VendorApprovalsPage } from "@/routes/AdminLazyImports";

// In Routes:
<Route path="/vendor-approvals" element={<VendorApprovalsPage />} />
```

### 5. Frontend: Admin Lazy Imports (`src/routes/AdminLazyImports.ts`)

#### Added Lazy Import
```javascript
export const VendorApprovalsPage = lazy(() => import("@/pages/admin/VendorApprovals"));
```

### 6. Frontend: Vendor Login (`src/pages/vendor/VendorLogin.tsx`)

#### Enhanced Error Handling
```javascript
catch (error) {
  let errorMessage = "An error occurred during login. Please try again.";
  
  if (error instanceof Error) {
    errorMessage = error.message;
    
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
  }
  
  // Show generic error
  toast({
    title: "Login Failed",
    description: errorMessage,
    variant: "destructive",
  });
}
```

### 7. Frontend: Auth Service (`src/services/authService.ts`)

#### Updated Login to Not Show Toast for Pending Approvals
```javascript
async login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    // ... login logic
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Login failed";
    
    // Don't show toast for pending approval - let the calling component handle it
    if (!errorMessage.includes("profile is under review") && 
        !errorMessage.includes("pending approval") &&
        !errorMessage.includes("awaiting admin approval")) {
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
    
    throw error;
  }
}
```

### 8. Frontend: Vendor Registration (`src/pages/vendor/VendorRegister.tsx`)

#### Updated Success Message
```javascript
toast({
  title: "Registration Successful!",
  description: "Your vendor account has been created and submitted for admin approval. You will receive an email notification once approved. Please check your email regularly.",
  duration: 6000,
});
```

---

## Testing the Flow

### 1. Vendor Registration Test
```bash
1. Go to /vendor/register
2. Complete all 6 steps
3. Verify email with OTP
4. Submit registration
5. Check that success message mentions "admin approval"
6. Redirected to /vendor/login
```

### 2. Vendor Login Test (Before Approval)
```bash
1. Try to login with newly registered vendor account
2. Should see: "Your vendor profile is under review. You will be notified once approved by our admin team."
3. Login should be BLOCKED ❌
```

### 3. Admin Approval Test
```bash
1. Login as admin at /admin/login
2. Navigate to "Vendor Approvals" in sidebar
3. See pending vendor application
4. Click "Approve" or "Reject"
5. Vendor user.status changes to 'active'
6. Vendor receives approval email
```

### 4. Vendor Login Test (After Approval)
```bash
1. Try to login with approved vendor account
2. Should see: "Login Successful"
3. Redirected to /vendor/dashboard ✅
```

---

## Database States

### Before Admin Approval
```javascript
// User Collection
{
  email: "vendor@example.com",
  role: "agent",
  status: "pending", // ❌ Cannot login
  profile: { ... }
}

// Vendor Collection
{
  user: ObjectId("..."),
  status: "pending_approval", // ⏳ Awaiting review
  businessInfo: { ... },
  verification: {
    isVerified: false
  }
}
```

### After Admin Approval
```javascript
// User Collection
{
  email: "vendor@example.com",
  role: "agent",
  status: "active", // ✅ Can login
  profile: { ... }
}

// Vendor Collection
{
  user: ObjectId("..."),
  status: "active", // ✅ Approved
  businessInfo: { ... },
  verification: {
    isVerified: true,
    verificationDate: ISODate("..."),
    verifiedBy: ObjectId("admin_id")
  }
}
```

---

## API Endpoints Used

### 1. Registration
```
POST /api/auth/register
Body: {
  email, password, firstName, lastName, phone,
  role: "agent",
  businessInfo: { ... },
  documents: { ... },
  otp: "123456"
}
Response: {
  success: true,
  message: "Registration successful"
}
```

### 2. Login (Pending Vendor)
```
POST /api/auth/login
Body: { email, password }
Response: 403 {
  success: false,
  message: "Your vendor profile is under review...",
  reason: "pending_approval"
}
```

### 3. Get Pending Vendors (Admin)
```
GET /api/admin/vendor-approvals
Response: {
  success: true,
  data: {
    applications: [...],
    stats: { ... }
  }
}
```

### 4. Approve Vendor (Admin)
```
POST /api/admin/vendor-approvals/:vendorId/approve
Body: { approvalNotes: "..." }
Response: {
  success: true,
  message: "Vendor approved successfully"
}
```

---

## Email Templates

### 1. Vendor Registration Confirmation
**To**: Vendor
**Subject**: "Application Received - Under Review"
**Content**: "Your vendor application has been submitted and is under review. You'll be notified once approved."

### 2. Admin New Vendor Notification
**To**: Admin
**Subject**: "New Vendor Application Received"
**Content**: Details about new vendor application with link to approve/reject

### 3. Vendor Approval Notification
**To**: Vendor
**Subject**: "Congratulations! Your Vendor Account is Approved"
**Content**: "Your vendor account has been approved. You can now login and start listing properties."

### 4. Vendor Rejection Notification
**To**: Vendor
**Subject**: "Vendor Application Update"
**Content**: "Your application requires additional information. Reason: [rejection reason]"

---

## Security Considerations

1. ✅ **JWT not issued to pending vendors** - Token only issued after approval
2. ✅ **Status check on every login** - Prevents approved vendors from being blocked
3. ✅ **Role-based access** - Only admins can approve/reject
4. ✅ **Audit trail** - All approvals/rejections logged with admin info
5. ✅ **Email verification** - OTP verified before account creation

---

## Future Enhancements

1. **Multi-level Approval** - Add review stages (Tier 1, Tier 2, Final)
2. **Document Verification** - Separate approval for each document
3. **Auto-rejection Rules** - Reject if missing required documents
4. **Vendor Dashboard Preview** - Show limited dashboard to pending vendors
5. **Re-submission Flow** - Allow vendors to re-submit after rejection
6. **Approval SLA** - Track time taken for approvals
7. **Bulk Approval** - Approve multiple vendors at once

---

## Support & Troubleshooting

### Issue: Vendor created before this fix shows as "active"
**Solution**: Run migration script to set status to 'pending' for unapproved vendors
```javascript
// migration-script.js
db.users.updateMany(
  { 
    role: 'agent',
    status: 'active',
    createdAt: { $lt: new Date('2024-11-04') } // Before this fix
  },
  { 
    $set: { status: 'pending' }
  }
);
```

### Issue: Admin can't see Vendor Approvals page
**Solution**: Clear browser cache and refresh

### Issue: Vendor login shows generic error
**Solution**: Check backend logs for actual error, ensure error message contains keywords

---

## Conclusion

The vendor approval flow is now fully implemented with:
- ✅ Account creation blocked until admin approval
- ✅ Clear messaging to vendors about review status
- ✅ Admin dashboard page for managing approvals
- ✅ Email notifications at each stage
- ✅ Proper status tracking in database
- ✅ Security controls to prevent unauthorized access

All vendors must now wait for admin approval before they can access their dashboard and start listing properties.
