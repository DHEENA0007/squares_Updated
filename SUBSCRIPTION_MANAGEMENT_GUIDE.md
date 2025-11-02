# Subscription Management System - Complete Guide

## Overview

A comprehensive subscription and property management system with dynamic plan features, price history tracking, and property approval workflow.

## New Features Implemented

### 1. Enhanced Subscription Plans

The system now supports 5 subscription tiers based on your requirements:

#### **FREE LISTING - ₹0/month**
- 5 Property listings
- Basic property details
- Standard visibility
- Email support

#### **BASIC PLAN - ₹199/month**
- 10 Property listings
- **Top Rated in Website** ✓
- **Verified Owner Badge** ✓
- Priority email support
- Enhanced visibility
- 5 leads per month

#### **STANDARD PLAN - ₹499/month**
- 15 Property listings
- Top Rated in Website ✓
- Verified Owner Badge ✓
- **1 Promotional Poster with 6 leads**
- Priority support
- Enhanced marketing
- Virtual tours (1)

#### **PREMIUM PLAN - ₹1999/month**
- **Unlimited Property listings** ✓
- Top Rated in Website ✓
- Verified Owner Badge ✓
- **4 Promotional Posters with 20 leads**
- Priority phone & email support
- Advanced analytics
- 10 Featured listings
- 3 Virtual tours

#### **ENTERPRISE PLAN - ₹4999/month**
- **Unlimited Property listings** ✓
- Top Rated in Website ✓
- Verified Owner Badge ✓
- **4 Posters & 1 Video with 30+ leads**
- **Consultation with Marketing Manager** ✓
- **Commission-based revenue model** ✓
- 24/7 dedicated support
- Custom branding
- API access
- Unlimited featured listings

### 2. Dynamic Plan Management

Admins can now:

✅ **Create new plans dynamically** with custom features
✅ **Update plan prices** with full history tracking
✅ **Add/remove features** in real-time
✅ **Configure limits** for:
   - Properties (0 = unlimited)
   - Featured listings
   - Photos per property
   - Video tours
   - Videos
   - Monthly leads
   - Promotional posters
   - Monthly messages
   - Support level (none, email, priority, phone, dedicated)
   - Lead management (none, basic, advanced, premium, enterprise)

✅ **Enable special benefits**:
   - Top Rated badge
   - Verified Owner badge
   - Marketing manager access
   - Commission-based model

### 3. Price History Tracking

Every price change is tracked with:
- Old price → New price
- Changed by (admin user)
- Change date and time
- Reason for change

**Access price history:**
```
GET /api/plans/:id/price-history
```

### 4. Property Approval System

#### Vendor Flow:
1. Vendor creates property listing
2. Property status: **"pending"** (awaiting approval)
3. Property is NOT visible to public
4. Vendor receives notification

#### Admin Flow:
1. Admin views pending properties at `/admin/property-approvals`
2. Can **Approve** → Status changes to "active" + property goes live
3. Can **Reject** → Status changes to "rejected" + reason required
4. Can **View Details** → See full property information

**Key Features:**
- Filter by status (pending, approved, rejected)
- Bulk actions support
- Rejection reason tracking
- Email notifications (ready for integration)
- Approval tracking (approved by, approved at)

### 5. Complete Admin Panel

#### New Admin Pages:

**Plan Management** (`/admin/plans`)
- View all subscription plans
- Create new plans
- Edit existing plans
- Toggle plan status (active/inactive)
- Delete plans (with safety checks)
- View subscriber count
- Track price history

**Property Approvals** (`/admin/property-approvals`)
- Review pending properties
- Approve/reject listings
- View property details
- Track rejection reasons
- Filter by status

**Client Management** (`/admin/clients`) - Enhanced
- View all subscriptions
- Change subscription plans
- Update pricing
- Cancel subscriptions
- Renew subscriptions
- View subscription details with plan features

## Database Models

### Plan Model (`server/models/Plan.js`)

```javascript
{
  identifier: String, // Unique identifier (e.g., 'free', 'basic')
  name: String, // Display name
  description: String,
  price: Number,
  currency: String, // INR, USD, EUR, GBP
  billingPeriod: String, // monthly, yearly, lifetime, one-time
  features: [{
    name: String,
    description: String,
    enabled: Boolean
  }],
  limits: {
    properties: Number, // 0 = unlimited
    featuredListings: Number,
    photos: Number,
    videoTours: Number,
    videos: Number,
    leads: Number,
    posters: Number,
    topRated: Boolean,
    verifiedBadge: Boolean,
    messages: Number,
    marketingManager: Boolean,
    commissionBased: Boolean,
    support: String, // none, email, priority, phone, dedicated
    leadManagement: String // none, basic, advanced, premium, enterprise
  },
  isActive: Boolean,
  isPopular: Boolean,
  sortOrder: Number,
  priceHistory: [{
    price: Number,
    changedAt: Date,
    changedBy: ObjectId,
    reason: String
  }],
  featureHistory: [{
    action: String, // added, removed, modified
    featureName: String,
    previousValue: Mixed,
    newValue: Mixed,
    changedAt: Date,
    changedBy: ObjectId
  }]
}
```

### Property Model (Enhanced)

```javascript
{
  // ... existing fields ...
  status: String, // pending, active, rejected, sold, rented
  verified: Boolean,
  approvedBy: ObjectId,
  approvedAt: Date,
  rejectedBy: ObjectId,
  rejectedAt: Date,
  rejectionReason: String
}
```

## API Endpoints

### Plan Management

```
GET    /api/plans                    - Get all plans (with filters)
GET    /api/plans/:id                - Get single plan
POST   /api/plans                    - Create plan (Admin)
PUT    /api/plans/:id                - Update plan (Admin)
DELETE /api/plans/:id                - Delete plan (Admin)
PATCH  /api/plans/:id/toggle-status  - Toggle active status (Admin)
GET    /api/plans/:id/price-history  - Get price history (Admin)
```

### Property Approval

```
GET    /api/admin/properties                   - Get all properties
PATCH  /api/admin/properties/:id/status        - Update property status
POST   /api/properties                         - Create property (Vendor)
```

### Vendor Property Creation

```
POST   /api/properties
Body: {
  title: String,
  description: String,
  type: String,
  listingType: String,
  price: Number,
  address: Object,
  // ... other fields
}

Response: {
  success: true,
  message: "Property submitted successfully! It will be published after admin verification.",
  data: { property }
}
```

## Setup Instructions

### 1. Initialize New Subscription Plans

Run the initialization script:

```bash
cd server
node scripts/init-subscription-plans.js
```

This will:
- Clear existing plans
- Create all 5 new subscription tiers
- Set up proper limits and benefits

### 2. Update Frontend Routes

Add to your admin routes (`src/routes/index.tsx` or similar):

```tsx
import PropertyApprovals from "@/pages/admin/PropertyApprovals";

// Add to admin routes:
{
  path: "property-approvals",
  element: <PropertyApprovals />
}
```

### 3. Test the System

**Test Plan Creation:**
```bash
# Navigate to admin panel
http://localhost:5173/admin/plans/create

# Create a test plan with:
- Name: "Test Plan"
- Price: 299
- Add features dynamically
- Set limits as needed
```

**Test Property Approval:**
```bash
# As vendor, create a property
# As admin, view at:
http://localhost:5173/admin/property-approvals

# Approve or reject the property
```

## Usage Examples

### Creating a Custom Plan (Admin)

1. Go to `/admin/plans/create`
2. Fill in basic information:
   - Plan Name: "Special Offer"
   - Price: 999
   - Billing Period: Monthly
3. Add features:
   - "25 Property Listings"
   - "2 Videos Included"
   - "Priority Support"
4. Set limits:
   - Properties: 25
   - Videos: 2
   - Support: Priority
5. Enable benefits:
   - ✓ Top Rated Badge
   - ✓ Verified Badge
6. Click "Create Plan"

### Updating Plan Price (Admin)

1. Go to `/admin/plans`
2. Click "Edit" on any plan
3. Update the price field
4. Enter reason: "New Year Offer"
5. Save changes
6. Price history is automatically tracked

### Vendor Property Submission

1. Vendor logs in
2. Goes to "Add Property"
3. Fills in property details
4. Submits → Status: "pending"
5. Receives message: "Property submitted successfully! It will be published after admin verification."

### Admin Property Review

1. Admin goes to `/admin/property-approvals`
2. Sees all pending properties
3. Clicks "View" to see details
4. Options:
   - **Approve** → Property goes live immediately
   - **Reject** → Must provide reason, vendor is notified

## Benefits of New System

### For Admins:
✅ Complete control over subscription plans
✅ Dynamic feature management
✅ Price history tracking for compliance
✅ Property quality control through approval system
✅ Better revenue management
✅ Real-time plan updates

### For Vendors:
✅ Clear subscription tiers
✅ Transparent pricing
✅ Feature visibility
✅ Professional approval process
✅ Clear rejection feedback
✅ Better service levels

### For End Users:
✅ High-quality property listings
✅ Verified properties only
✅ Trusted vendors with badges
✅ Better search experience
✅ Premium content from paid plans

## Future Enhancements

- [ ] Email notifications for approvals/rejections
- [ ] Bulk property approval
- [ ] Plan comparison page for vendors
- [ ] Subscription analytics dashboard
- [ ] Automated plan renewals
- [ ] Custom plan pricing per vendor
- [ ] Feature usage tracking
- [ ] Plan recommendation engine

## Troubleshooting

### Plans not showing?
```bash
# Re-run initialization
node server/scripts/init-subscription-plans.js
```

### Properties not requiring approval?
```bash
# Check property creation route
# Ensure status is set to 'pending'
```

### Price history not tracking?
```bash
# Verify Plan model has priceHistory field
# Use plan.updatePrice() method instead of direct save
```

## Support

For issues or questions:
1. Check server logs
2. Verify database connection
3. Ensure all models are updated
4. Check API responses in browser console

---

**Version:** 1.0.0  
**Last Updated:** October 31, 2025  
**Author:** Subscription Management System Team
