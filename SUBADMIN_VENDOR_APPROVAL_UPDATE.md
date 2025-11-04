# SubAdmin Portal - Vendor Approval Feature

## Changes Made

### Frontend Changes

#### 1. SubAdmin Routes (`src/routes/SubAdminRoutes.tsx`)
- Added `VendorApprovals` route to SubAdmin portal
- Route: `/admin/vendor-approvals`

#### 2. SubAdmin Lazy Imports (`src/routes/SubAdminLazyImports.ts`)
- Added lazy import for `VendorApprovals` component

#### 3. SubAdmin Sidebar (`src/components/adminpanel/SubAdminSidebar.tsx`)
- Added "Vendor Approvals" menu item with `UserCheck` icon
- Positioned after "Property Approval" in the navigation menu

### Backend Changes

#### 1. Admin Routes (`server/routes/admin.js`)
- **Added import**: `isAnyAdmin` middleware from roleMiddleware
- **Updated middleware**: Changed from `router.use(isSuperAdmin)` to selective middleware per route group
- **Vendor Approval Routes** - Changed access from SuperAdmin only to Admin & SubAdmin:
  - `GET /api/admin/vendor-approvals` - List vendor applications
  - `GET /api/admin/vendor-approvals/:vendorId` - Get vendor details
  - `POST /api/admin/vendor-approvals/:vendorId/approve` - Approve vendor
  - `POST /api/admin/vendor-approvals/:vendorId/reject` - Reject vendor
  - `POST /api/admin/vendor-approvals/:vendorId/under-review` - Mark under review
  - `POST /api/admin/vendor-approvals/:vendorId/verify-document` - Verify documents
  - `GET /api/admin/vendor-approval-stats` - Get statistics
- **Added** `router.use(isSuperAdmin)` middleware after vendor approval routes to protect remaining SuperAdmin-only routes

#### 2. Role Middleware (`server/middleware/roleMiddleware.js`)
- **Added vendor approval permissions** to `SUB_ADMIN_PERMISSIONS`:
  - `APPROVE_VENDORS: 'approve_vendors'`
  - `REJECT_VENDORS: 'reject_vendors'`
  - `REVIEW_VENDORS: 'review_vendors'`

## SubAdmin Access Control

### Routes Accessible to SubAdmin
1. Dashboard
2. Property Review
3. Property Approval
4. **Vendor Approvals** (NEW)
5. Content Moderation
6. Support Tickets
7. Performance Tracking
8. Promotion Approval
9. Send Notifications
10. Generate Reports

### Routes Restricted to SuperAdmin Only
- User Management
- Role Management
- Plan Management
- Settings
- System Configuration
- Full Dashboard Analytics

## API Endpoints Access Matrix

| Endpoint | SuperAdmin | SubAdmin | Admin |
|----------|-----------|----------|-------|
| GET /api/admin/vendor-approvals | ✅ | ✅ | ✅ |
| GET /api/admin/vendor-approvals/:id | ✅ | ✅ | ✅ |
| POST /api/admin/vendor-approvals/:id/approve | ✅ | ✅ | ✅ |
| POST /api/admin/vendor-approvals/:id/reject | ✅ | ✅ | ✅ |
| POST /api/admin/vendor-approvals/:id/under-review | ✅ | ✅ | ✅ |
| POST /api/admin/vendor-approvals/:id/verify-document | ✅ | ✅ | ✅ |
| GET /api/admin/vendor-approval-stats | ✅ | ✅ | ✅ |
| GET /api/admin/dashboard | ✅ | ❌ | ❌ |
| GET /api/roles | ✅ | ❌ | ❌ |
| POST /api/roles | ✅ | ❌ | ❌ |

## Testing Checklist

### SubAdmin User
- [ ] Login as SubAdmin
- [ ] Access `/admin/vendor-approvals` page
- [ ] View pending vendor applications
- [ ] View vendor details
- [ ] Approve a vendor application
- [ ] Reject a vendor application
- [ ] Mark vendor as under review
- [ ] View vendor approval statistics
- [ ] Verify cannot access SuperAdmin routes (Users, Roles, Plans)

### SuperAdmin User
- [ ] Login as SuperAdmin
- [ ] Access all admin routes including vendor approvals
- [ ] Full CRUD operations on all resources

## Known Issues Fixed

1. ✅ "Admin access required" error when accessing roles page - Fixed by adding proper middleware separation
2. ✅ SubAdmin cannot access vendor approvals - Fixed by adding isAnyAdmin middleware
3. ✅ Vendor approval routes not accessible to SubAdmin - Fixed by updating route middleware

## Migration Notes

- No database migrations required
- SubAdmin users will automatically get access to vendor approvals
- Existing permissions in the Role model should include vendor approval permissions for SubAdmin role
