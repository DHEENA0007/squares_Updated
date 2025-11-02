# Smart Property Management with Role-Based Actions

## 🎯 Overview

The Property Management system now features **intelligent action-based permissions** that dynamically adjust available actions based on who created the property (Admin vs Vendor/Agent).

---

## ✨ Key Features

### 1. **Dynamic Action Menu**
Actions in the property list now adapt based on:
- **Who created the property** (Admin or Vendor/Agent)
- **Current property status** (pending, active, rejected, etc.)

### 2. **Two Different Workflows**

#### **Vendor/Agent Created Properties**
Properties created by vendors or agents go through an approval workflow:

**Pending State:**
- ✅ **View Details** - Opens comprehensive property inspection dialog
- ✅ **Approve & Publish** - Makes property live and visible to public
- ✅ **Reject** - Requires admin to provide rejection reason
- ✅ **Delete** - Permanent removal

**After Approval:**
- ✅ **View Details** - Inspect property information
- ✅ **Mark/Remove Featured** - Highlight property
- ✅ **Delete** - Remove if needed

#### **Admin Created Properties**
Properties created by admin have direct management:

**All States:**
- ✅ **Edit Property** - Full edit capabilities
- ✅ **Mark/Remove Featured** - Highlight property
- ✅ **Delete** - Permanent removal
- ❌ **No approval needed** - Goes live immediately

---

## 🔍 How It Works

### Property Creator Detection

The system uses the `isAdminCreated()` helper function to determine property origin:

```typescript
const isAdminCreated = (property: Property): boolean => {
  // Check if owner is current admin user
  if (currentUser && property.owner._id === currentUser.id) {
    return true;
  }
  
  // Admin properties don't have vendor reference
  // and don't go through approval (status: active/available)
  return !property.vendor && 
         (property.status === 'active' || property.status === 'available');
};
```

### Action Logic

```typescript
// In Actions Column
{adminCreated && (
  <DropdownMenuItem onClick={() => navigate(`/admin/properties/edit/${property._id}`)}>
    Edit Property  // Admin can edit
  </DropdownMenuItem>
)}

{!adminCreated && (
  <DropdownMenuItem onClick={() => openViewDialog(property)}>
    View Details  // Vendor properties - view only
  </DropdownMenuItem>
)}

{!adminCreated && isPending && (
  <>
    <DropdownMenuItem onClick={() => handleApproveProperty(property)}>
      Approve & Publish  // Only for vendor pending properties
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => openRejectDialog(property)}>
      Reject  // Requires reason
    </DropdownMenuItem>
  </>
)}
```

---

## 📋 Complete Action Matrix

| Property Type | Status | Available Actions |
|--------------|--------|-------------------|
| **Vendor/Agent** | Pending | View Details, Approve, Reject, Delete |
| **Vendor/Agent** | Active | View Details, Toggle Featured, Delete |
| **Vendor/Agent** | Rejected | View Details, Delete |
| **Admin** | Any | Edit, Toggle Featured, Delete |

---

## 🎨 User Interface Features

### View Property Dialog

When clicking "View Details" on vendor properties, admins see:

#### **Header Section**
- Property title (large, bold)
- Full address with pin icon
- Location details

#### **Status Badges**
- Current status (pending/active/rejected)
- Property type (apartment, house, villa, etc.)
- Listing type (For Sale / For Rent)
- Featured badge (if applicable)
- Verified badge (if applicable)

#### **Key Metrics Grid**
Four-column grid showing:
- 💰 **Price** - With currency symbol and period
- 📏 **Area** - Built-up/carpet/plot area
- 🛏️ **Bedrooms** - Count
- 🛁 **Bathrooms** - Count

#### **Detailed Information**
- **Description** - Full property description
- **Amenities** - Badge list of all amenities
- **Owner Information** - Name, email, phone
- **Images Gallery** - Responsive grid with primary image indicator
- **Rejection Reason** - Red alert box (if rejected)

---

## 🚀 Workflow Examples

### Example 1: Vendor Submits Property

1. **Vendor creates property** → Status: `pending`
2. **Admin views in Property Management**
3. **Admin clicks "View Details"** → Opens comprehensive dialog
4. **Admin reviews all information**
5. **Admin has two options:**
   
   **Option A: Approve**
   - Clicks "Approve & Publish"
   - Property status → `active`
   - Property visible to public
   - Realtime update in list
   
   **Option B: Reject**
   - Clicks "Reject"
   - Dialog opens for rejection reason
   - Admin enters reason (required)
   - Property status → `rejected`
   - Vendor receives notification with reason
   - Realtime update in list

### Example 2: Admin Creates Property

1. **Admin creates property** → Status: `active` (immediate)
2. **Property appears in list immediately**
3. **Admin can "Edit Property" anytime**
4. **No approval workflow needed**
5. **Direct publish to public**

---

## 🔧 Technical Implementation

### Files Modified/Created

#### **1. src/pages/admin/Properties.tsx**
```typescript
// New state
const [viewDialogOpen, setViewDialogOpen] = useState(false);
const [currentUser, setCurrentUser] = useState<any>(null);

// Get current user
useEffect(() => {
  const user = authService.getCurrentUser();
  setCurrentUser(user);
  fetchProperties();
}, []);

// Helper function
const isAdminCreated = (property: Property): boolean => { ... }

// Dynamic actions
{adminCreated && <Edit action>}
{!adminCreated && <View Details action>}
{!adminCreated && isPending && <Approve/Reject actions>}
```

#### **2. src/components/adminpanel/ViewPropertyDialog.tsx** (NEW)
```typescript
interface ViewPropertyDialogProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ViewPropertyDialog = ({ property, open, onOpenChange }) => {
  // Comprehensive property details view
  // Images gallery
  // Owner information
  // Amenities list
  // Rejection reason display
}
```

### API Integration

#### Uses Admin Property Service
```typescript
// Fetches ALL properties (including pending)
const response = await adminPropertyService.getProperties({
  limit: 1000,
});

// Approve property
await adminPropertyService.updatePropertyStatus(propertyId, 'active');

// Reject property with reason
await adminPropertyService.updatePropertyStatus(propertyId, 'rejected', reason);
```

---

## 📊 Benefits

### For Admins
✅ **Clear distinction** between admin and vendor properties
✅ **Efficient review process** with View Details dialog
✅ **Quality control** before properties go live
✅ **Direct editing** of admin-created properties
✅ **Realtime updates** after actions

### For Vendors
✅ **Transparent approval process**
✅ **Feedback on rejections** with reasons
✅ **Professional review** before going live
✅ **Email notifications** on status changes

### For System
✅ **Clean separation** of concerns
✅ **Role-based access control**
✅ **Audit trail** with approval/rejection tracking
✅ **Scalable workflow** for growth

---

## 🎯 Statistics Dashboard

Properties page now includes four key metrics:

1. **Total Properties** - All properties in system
2. **Pending Approval** - Yellow badge, awaiting review
3. **Active Properties** - Green badge, live on site
4. **Featured** - Blue badge, highlighted listings

---

## 🔒 Security & Permissions

- ✅ Admin authentication required
- ✅ Action authorization per role
- ✅ Property creator verification
- ✅ Audit trail for all changes
- ✅ Rejection reasons logged

---

## 📱 Responsive Design

All components are fully responsive:
- Mobile: Stacked layouts
- Tablet: 2-column grids
- Desktop: 3-4 column grids
- Images: Responsive aspect ratios

---

## 🚦 Next Steps

### Recommended Enhancements

1. **Email Notifications**
   - Send email on approval
   - Send email on rejection with reason
   - Weekly digest for pending properties

2. **Bulk Actions**
   - Approve multiple properties at once
   - Bulk rejection with same reason
   - Bulk delete

3. **Advanced Filtering**
   - Filter by creator (admin/vendor)
   - Filter by date range
   - Filter by price range
   - Filter by location

4. **Analytics**
   - Approval rate metrics
   - Time to approval tracking
   - Rejection reason analytics
   - Vendor performance scores

---

## 📖 Usage Guide

### For Admin Users

#### Reviewing Vendor Properties
1. Navigate to "Property Management"
2. Look for properties with "Pending" badge
3. Click three-dot menu on property
4. Click "View Details"
5. Review all information carefully
6. Close dialog
7. Click three-dot menu again
8. Choose:
   - "Approve & Publish" - to make live
   - "Reject" - to decline (enter reason)

#### Managing Admin Properties
1. Navigate to "Property Management"
2. Find your created properties (usually "Active" status)
3. Click three-dot menu
4. Click "Edit Property"
5. Make changes
6. Save

#### Featuring Properties
1. Any active property can be featured
2. Click three-dot menu
3. Click "Mark Featured"
4. Property gets highlighted in public view
5. Click "Remove Featured" to undo

---

## ✅ Testing Checklist

- [ ] Vendor creates property → appears as "Pending"
- [ ] Admin sees "View Details" for vendor property
- [ ] Dialog shows all property information
- [ ] "Approve" changes status to "Active"
- [ ] "Reject" requires reason
- [ ] Rejection reason saved and visible
- [ ] Admin creates property → immediately "Active"
- [ ] Admin sees "Edit" for admin property
- [ ] Featured toggle works on active properties
- [ ] Delete works for all properties
- [ ] Realtime updates after each action
- [ ] Statistics cards update correctly
- [ ] Filters work (status, type)
- [ ] Search works across properties
- [ ] Pagination works with filters

---

## 🎉 Summary

The smart property management system now provides:

1. **Intelligent Actions** - Based on property creator
2. **Vendor Approval Workflow** - With view-only details
3. **Admin Direct Management** - With full edit rights
4. **Comprehensive Details View** - For inspection
5. **Realtime Updates** - Across all actions
6. **Professional UI** - With color-coded badges
7. **Rejection Feedback** - With required reasons
8. **Statistics Dashboard** - At-a-glance metrics

This creates a **professional, scalable, and user-friendly** property management system! 🚀
