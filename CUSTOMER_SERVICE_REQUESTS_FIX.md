# Customer Service Requests Fix

## Problem
The customer portal's Service Requests page was attempting to use vendor-specific API endpoints (`/api/vendors/services`), which resulted in 404 errors:
- `GET /api/vendors/services//bookings` - 404 Not Found
- `GET /api/vendors/services?status=active` - 404 Not Found

## Root Cause
The `ServiceRequests.tsx` component in the customer portal was incorrectly using `vendorServicesService` which calls vendor endpoints. Customers should have their own service request endpoints.

## Solution

### 1. Created Customer Service Requests Service
**File:** `src/services/customerServiceRequestsService.ts`

This new service provides customer-specific functionality for service requests:

#### Key Features:
- **Service Request Management**
  - `getServiceRequests(filters)` - Fetch customer's service requests with filtering
  - `createServiceRequest(data)` - Create a new service request
  - `updateServiceRequest(id, data)` - Update an existing request
  - `cancelServiceRequest(id, reason)` - Cancel a request
  - `rateServiceRequest(id, rating, review)` - Rate completed services

- **Service Discovery**
  - `getServiceProviders(filters)` - Browse available service providers
  - `getServiceCategories()` - Get all service categories with provider counts

- **Utility Methods**
  - `formatCurrency(amount)` - Format amounts in INR
  - `getServiceTypeLabel(type)` - Get human-readable service type names
  - `getStatusColor(status)` - Get status badge colors
  - `getPriorityColor(priority)` - Get priority badge colors
  - `getStatusText(status)` - Get status display text

#### API Endpoints Used:
- `GET /api/services/requests` - Get service requests
- `POST /api/services/requests` - Create request
- `PUT /api/services/requests/:id` - Update request
- `POST /api/services/requests/:id/cancel` - Cancel request
- `POST /api/services/requests/:id/rate` - Rate service
- `GET /api/services/providers` - Get providers
- `GET /api/services/categories` - Get categories

### 2. Updated ServiceRequests Component
**File:** `src/pages/customer/ServiceRequests.tsx`

#### Changes Made:
1. **Import Changes**
   - Removed: `vendorServicesService, ServiceBooking, VendorService`
   - Added: `customerServiceRequestsService, ServiceRequest, ServiceCategory, ServiceProvider`

2. **State Management**
   - Replaced `serviceBookings` with `serviceRequests`
   - Added `serviceCategories` state
   - Added pagination support with `currentPage` and `totalPages`
   - Updated `statusFilter` to use proper typing

3. **Data Loading**
   - `loadServiceRequests()` - Uses customer service API with filters
   - `loadServiceCategories()` - Loads service categories from API
   - Removed vendor-specific `loadServices()`

4. **Event Handlers**
   - Updated realtime events to use `service_request_*` instead of `service_booking_*`
   - Added `handleCancelRequest()` for request cancellation
   - Removed vendor-specific status update handler

5. **UI Components**
   - Updated service request cards to show:
     - Request title and description
     - Service type badges
     - Linked property information
     - Assigned provider details with contact info
     - Progress bars for in-progress requests
     - Document attachments
     - Proper action buttons (Cancel, Contact Provider, Rate Service)
   - Updated stats cards to use request data
   - Updated filters to work with customer data
   - Added empty state with proper messaging
   - Updated "Browse Services" tab to show service categories

6. **Helper Functions**
   - Updated to use service methods from `customerServiceRequestsService`
   - Removed vendor-specific booking logic
   - Added proper request filtering logic

## Backend Support
The backend already has the necessary endpoints in `server/routes/services.js`:
- ✅ GET `/api/services/requests` - Get user's service requests
- ✅ POST `/api/services/requests` - Create service request
- ✅ PUT `/api/services/requests/:id` - Update service request
- ✅ POST `/api/services/requests/:id/cancel` - Cancel request
- ✅ POST `/api/services/requests/:id/rate` - Rate provider
- ✅ GET `/api/services/providers` - Get service providers
- ✅ GET `/api/services/categories` - Get service categories

## Testing Checklist
- [x] Service requests load without 404 errors
- [ ] Filters work correctly (status, service type, search)
- [ ] Service categories display properly
- [ ] Create new service request works
- [ ] Cancel request functionality works
- [ ] Rating system works for completed requests
- [ ] Pagination works correctly
- [ ] Real-time updates work
- [ ] Empty states display correctly
- [ ] Provider contact information displays

## Data Structure

### ServiceRequest Interface
```typescript
{
  id: string;
  serviceType: 'home_loan' | 'movers' | 'legal' | 'interior' | 'cleaning' | 'security';
  title: string;
  description: string;
  amount?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  progress?: number;
  estimatedCompletion?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  property?: PropertyInfo;
  provider?: ProviderInfo;
  documents?: DocumentInfo[];
  metadata?: Record<string, any>;
}
```

### Service Categories
- Home Loans
- Packers & Movers
- Legal Services
- Interior Design
- Cleaning Services
- Security Services

## Benefits
1. **Proper API Usage** - Customer portal now uses customer-specific endpoints
2. **Better UX** - More relevant information display for customers
3. **Type Safety** - Proper TypeScript interfaces for all data
4. **Maintainability** - Clear separation between customer and vendor services
5. **Scalability** - Easy to add more service types and features

## Future Enhancements
1. Add service request creation form with validation
2. Implement rating and review system
3. Add real-time chat with service providers
4. Implement payment integration
5. Add document upload functionality
6. Add service request history and analytics
7. Implement notifications for status changes
8. Add multi-step service request wizard
