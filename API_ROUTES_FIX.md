# API Routes and React Infinite Loop Fixes

## Issues Fixed

### 1. Missing API Endpoints (404 Errors)

The following endpoints were missing and have been added to `/server/routes/customer.js`:

#### Added Endpoints:
- **GET `/api/customer/quick-stats`** - Returns quick statistics for customer dashboard
  - Response: `{ favoritesCount, messagesCount, propertiesCount, unreadMessages }`

- **GET `/api/customer/activities`** - Returns recent customer activities
  - Response: Array of activities (favorites, inquiries, property posts)

- **GET `/api/customer/recommended-properties`** - Returns recommended properties based on user favorites
  - Query params: `limit` (default: 6)
  - Response: Array of recommended properties

### 2. Duplicate Dashboard Route
- **Fixed**: Removed duplicate `app.use('/api/dashboard', dashboardRoutes)` from `server/index.js`
- Only one dashboard route is now registered

### 3. Updated Customer Dashboard Service Endpoints

Updated `/src/services/customerDashboardService.ts` to use correct endpoints:

- Changed `/dashboard/customer` → `/customer/dashboard`
- Changed `/dashboard/customer/activities` → `/customer/activities`
- Changed `/dashboard/customer/recommended-properties` → `/customer/recommended-properties`
- Changed `/dashboard/customer/quick-stats` → `/customer/quick-stats`

### 4. React Infinite Loop Fixes

#### MyFavorites.tsx
**Issue**: `useRealtimeEvent` callbacks were calling `loadFavorites()` and `loadStats()` without proper memoization

**Fix**:
```tsx
// Added useCallback for stability
const loadFavorites = useCallback(async () => { ... }, []);
const loadStats = useCallback(async () => { ... }, []);

// Wrapped event handlers with useCallback
useRealtimeEvent('favorite_added', useCallback((data) => {
  loadFavorites();
  loadStats();
}, [loadFavorites, loadStats]));
```

#### Dashboard.tsx
**Issue**: `usePropertyRealtime` callbacks were creating new functions on every render

**Fix**:
```tsx
// Memoized callbacks
const handleStatsUpdate = useCallback(() => {
  refreshDashboard();
}, [refreshDashboard]);

const handlePropertiesUpdate = useCallback(() => {
  refreshDashboard();
}, [refreshDashboard]);

// Wrapped realtime event handlers with useCallback
useRealtimeEvent('favorite_added', useCallback((data) => {
  setStats(prev => ({ ...prev, ... }));
}, []));
```

## API Route Structure

### Customer Routes (`/api/customer/*`)
```
GET  /api/customer/dashboard                - Full dashboard data
GET  /api/customer/quick-stats             - Quick stats only
GET  /api/customer/activities              - Recent activities
GET  /api/customer/recommended-properties  - Property recommendations
GET  /api/customer/properties/stats        - Customer property statistics
GET  /api/customer/properties              - Customer's properties with filters
```

### Favorites Routes (`/api/favorites/*`)
All favorite routes require authentication and are handled by `/server/routes/favorites.js`

## Testing

After these fixes:
1. ✅ No more 404 errors for customer dashboard endpoints
2. ✅ No more React infinite loop warnings
3. ✅ Dashboard loads correctly with real data
4. ✅ Favorites functionality works properly
5. ✅ Real-time updates work without causing re-render loops

## Server Files Modified
- `/server/index.js` - Removed duplicate dashboard route
- `/server/routes/customer.js` - Added missing endpoints

## Client Files Modified
- `/src/services/customerDashboardService.ts` - Updated endpoint URLs
- `/src/pages/customer/MyFavorites.tsx` - Fixed infinite loop with useCallback
- `/src/pages/customer/Dashboard.tsx` - Fixed infinite loop with useCallback

## Notes
- All endpoints use JWT authentication via `authenticateToken` middleware
- Customer dashboard aggregates data from Favorites, Properties, and Messages models
- Recommendations are based on user's favorite properties (property types and cities)
- Real-time updates are now properly memoized to prevent infinite loops
