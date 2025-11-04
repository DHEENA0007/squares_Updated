# Admin Portal Restructure - Super Admin & Sub Admin Implementation

## Overview
The admin portal has been restructured to implement a two-tier administrative system:
- **Super Admin Portal**: Full system access with all administrative functions
- **Sub Admin Portal**: Limited access with specific operational functions only

## Changes Made

### 1. User Model Updates
- User model already supports `subadmin` and `superadmin` roles
- Role hierarchy: `customer` < `agent` < `subadmin` < `superadmin`

### 2. Authentication & Authorization

#### AuthContext Updates (`src/contexts/AuthContext.tsx`)
```typescript
// New properties added:
isSuperAdmin: boolean  // user?.role === 'superadmin'
isSubAdmin: boolean   // user?.role === 'subadmin'
isAdmin: boolean      // includes admin, subadmin, superadmin
```

#### Role Middleware (`server/middleware/roleMiddleware.js`)
- `isSuperAdmin`: Restricts access to superadmin only
- `isSubAdmin`: Allows subadmin and superadmin access
- `isAnyAdmin`: Legacy admin + subadmin + superadmin access
- `hasPermission`: Permission-based access control

### 3. Frontend Components

#### Super Admin Components
- **Location**: `src/components/adminpanel/Sidebar.tsx`
- **Features**: Full access to all admin functions
- **Badge**: "Super Admin Panel" with gradient styling
- **Routes**: All existing admin routes (`/admin/*`)

#### Sub Admin Components
- **Location**: `src/components/adminpanel/SubAdminSidebar.tsx`
- **Badge**: "Sub Admin Panel" with blue styling
- **Limited Navigation**:
  - Dashboard
  - Property Review
  - Property Approval
  - Content Moderation
  - Support Tickets
  - Performance Tracking
  - Promotion Approval
  - Send Notifications
  - Generate Reports

#### Dynamic Layout (`src/components/adminpanel/DashboardLayout.tsx`)
- Automatically switches between Super Admin and Sub Admin sidebars
- Based on user role detection

### 4. Sub Admin Pages

#### Created Pages:
1. **SubAdminDashboard** (`src/pages/admin/SubAdminDashboard.tsx`)
   - Overview of pending tasks
   - Quick action cards
   - Recent activity feed

2. **PropertyReview** (`src/pages/admin/PropertyReview.tsx`)
   - Review property listings
   - Approve/reject properties
   - Search and filter functionality

3. **PropertyApproval** (`src/pages/admin/PropertyApproval.tsx`)
   - Final approval workflow
   - Detailed property inspection
   - Approval notes and rejection reasons

4. **ContentModeration** (`src/pages/admin/ContentModeration.tsx`)
   - Review reported content
   - Moderate images and reviews
   - Content approval/removal actions

5. **SupportTickets** (`src/pages/admin/SupportTickets.tsx`)
   - Handle customer support requests
   - Ticket management and responses
   - Status updates and resolution

6. **PerformanceTracking** (`src/pages/admin/PerformanceTracking.tsx`)
   - Monitor vendor performance
   - Performance metrics and scores
   - Trend analysis and warnings

7. **PromotionApproval** (`src/pages/admin/PromotionApproval.tsx`)
   - Review featured property requests
   - Approve/reject paid promotions
   - Cost and duration management

8. **SendNotifications** (`src/pages/admin/SendNotifications.tsx`)
   - Send push notifications and emails
   - Template management
   - Audience targeting and scheduling

9. **GenerateReports** (`src/pages/admin/GenerateReports.tsx`)
   - Generate city/region-level reports
   - Multiple export formats (PDF, Excel, CSV)
   - Custom metrics selection

### 5. Backend Routes

#### Super Admin Routes (`server/routes/admin.js`)
- Unchanged - all existing functionality
- Access restricted to `superadmin` role only
- Full system administration capabilities

#### Sub Admin Routes (`server/routes/subadmin.js`)
- Limited functionality based on sub admin permissions
- Property review and approval endpoints
- Content moderation endpoints
- Support ticket management
- Vendor performance tracking
- Promotion approval workflow
- Notification sending capabilities
- Report generation (city/region level only)

### 6. Sub Admin Permissions

#### Core Functions:
1. **Review and verify property listings**
   - `REVIEW_PROPERTIES` permission
   - View pending properties
   - Basic property information review

2. **Approve/reject property listings**
   - `APPROVE_PROPERTIES` / `REJECT_PROPERTIES` permissions
   - Final approval workflow
   - Rejection reason requirements

3. **Moderate user-generated content**
   - `MODERATE_CONTENT` permission
   - Review reported images and reviews
   - Content approval/removal actions

4. **Handle customer complaints/support tickets**
   - `HANDLE_SUPPORT` permission
   - Ticket response and resolution
   - Status management

5. **Track vendor/builder performance**
   - `TRACK_PERFORMANCE` permission
   - Performance metrics monitoring
   - Vendor analytics and trends

6. **Approve featured/paid promotions**
   - `APPROVE_PROMOTIONS` permission
   - Review promotion requests
   - Cost and duration validation

7. **Push notifications/emails for marketing**
   - `SEND_NOTIFICATIONS` permission
   - Template-based messaging
   - Audience targeting

8. **Generate city/region-level reports**
   - `GENERATE_REPORTS` permission
   - Location-specific analytics
   - Multiple export formats

## Migration Instructions

### 1. Migrate Existing Admin Users
Run the migration script to convert existing admin users to superadmin:

```bash
node migrate-admin-users.js
```

This will:
- Find all users with `role: 'admin'`
- Update them to `role: 'superadmin'`
- Preserve all existing data and permissions

### 2. Create Sub Admin Users
Use the existing user creation endpoints with `role: 'subadmin'`:

```javascript
POST /api/admin/users
{
  "email": "subadmin@example.com",
  "password": "secure_password",
  "role": "subadmin",
  "profile": {
    "firstName": "Sub",
    "lastName": "Admin"
  }
}
```

### 3. Environment Setup
No additional environment variables required. The system uses existing authentication and database configurations.

## Security Considerations

### Role-Based Access Control
- Super Admin: Full system access
- Sub Admin: Limited to operational tasks only
- Cannot escalate privileges
- Session-based role validation

### API Security
- All endpoints require authentication
- Role-specific middleware on all routes
- Permission-based function access
- Audit logging for administrative actions

### Data Access Restrictions
- Sub Admins cannot access:
  - User management (create/edit/delete users)
  - System settings and configuration
  - Financial data and billing
  - Advanced analytics and system reports
  - Role and permission management

## Usage Guide

### For Super Admins
1. Login with superadmin credentials
2. Access full admin panel with all functions
3. Manage sub admin users through user management
4. Monitor sub admin activities through audit logs

### For Sub Admins
1. Login with subadmin credentials
2. Access limited admin panel with operational functions
3. Focus on day-to-day operational tasks:
   - Property moderation
   - Customer support
   - Content review
   - Performance monitoring

### Switching Between Roles
The system automatically detects user role and displays appropriate interface:
- No manual switching required
- Role-based navigation and permissions
- Consistent user experience within role boundaries

## API Endpoints

### Sub Admin Specific Endpoints
```
GET    /api/subadmin/dashboard                    - Sub admin dashboard stats
GET    /api/subadmin/properties/pending          - Pending property reviews
POST   /api/subadmin/properties/:id/approve      - Approve property
POST   /api/subadmin/properties/:id/reject       - Reject property
GET    /api/subadmin/content/reports             - Content moderation reports
GET    /api/subadmin/support/tickets             - Support ticket management
GET    /api/subadmin/vendors/performance         - Vendor performance tracking
GET    /api/subadmin/promotions/pending          - Pending promotion requests
POST   /api/subadmin/notifications/send          - Send notifications
POST   /api/subadmin/reports/generate            - Generate reports
```

### Super Admin Endpoints
All existing `/api/admin/*` endpoints remain unchanged and accessible only to superadmin users.

## Testing

### Role-Based Testing
1. Test superadmin access to all functions
2. Test subadmin access restrictions
3. Verify permission-based function access
4. Test role-based UI rendering

### Migration Testing
1. Verify existing admin users become superadmin
2. Test new subadmin user creation
3. Verify role persistence across sessions
4. Test role-based redirect logic

## Future Enhancements

### Potential Additions
1. **Custom Permission Sets**: Allow creating custom sub-admin roles with specific permission combinations
2. **Audit Logging**: Comprehensive logging of all administrative actions
3. **Geographic Restrictions**: Limit sub-admin access to specific cities/regions
4. **Time-Based Access**: Schedule-based access control for sub-admins
5. **Bulk Operations**: Mass approve/reject capabilities for efficiency
6. **Advanced Analytics**: Sub-admin specific performance dashboards
7. **Workflow Approval**: Multi-level approval workflows for critical actions
8. **Mobile Admin App**: Dedicated mobile interface for sub-admin functions

### Scalability Considerations
- Role-based caching strategies
- Permission-based query optimization  
- Distributed session management
- Multi-tenant sub-admin support
