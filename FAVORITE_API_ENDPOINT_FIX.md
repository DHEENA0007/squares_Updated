# Favorite API Endpoint Fix

## Issue
When trying to add a property to favorites, the API returned a 404 error:
```
POST http://localhost:8000/api/favorites
[HTTP/1.1 404 Not Found]
```

## Root Cause
The frontend `favoriteService.ts` was sending a POST request to `/api/favorites` with the `propertyId` in the request body, but the backend expects the `propertyId` as a URL parameter: `POST /api/favorites/:propertyId`.

**Backend Route (server/routes/favorites.js, line 51):**
```javascript
router.post('/:propertyId', asyncHandler(async (req, res) => {
  const { propertyId } = req.params; // ← Expects propertyId in URL
  ...
}));
```

**Frontend Service (BEFORE - favoriteService.ts, line 148):**
```typescript
const response = await this.makeRequest<SingleFavoriteResponse>("/favorites", {
  method: "POST",
  body: JSON.stringify({ propertyId }), // ← Was sending in body
});
```

## Solution
Updated the frontend `favoriteService.ts` to send the `propertyId` as a URL parameter instead of in the request body.

**Frontend Service (AFTER - favoriteService.ts, line 148):**
```typescript
const response = await this.makeRequest<SingleFavoriteResponse>(`/favorites/${propertyId}`, {
  method: "POST", // ← Now propertyId is in URL, no body needed
});
```

## Files Modified
- `/src/services/favoriteService.ts` - Updated `addToFavorites()` method

## API Endpoint Consistency
All favorite endpoints now correctly use URL parameters:

✅ **GET** `/api/favorites` - Get all favorites
✅ **POST** `/api/favorites/:propertyId` - Add to favorites
✅ **DELETE** `/api/favorites/:propertyId` - Remove from favorites
✅ **GET** `/api/favorites/check/:propertyId` - Check if favorited
✅ **GET** `/api/favorites/stats` - Get favorite statistics
✅ **DELETE** `/api/favorites/bulk` - Bulk remove (propertyIds in body)

## Testing
After this fix, adding properties to favorites should work correctly:
1. User clicks "Add to Favorites" on a property
2. Frontend sends: `POST /api/favorites/{propertyId}`
3. Backend creates favorite record
4. User sees success toast notification
5. Property is added to their favorites list

## Related Files
- Backend: `/server/routes/favorites.js`
- Frontend Service: `/src/services/favoriteService.ts`
- Frontend Components using favorites:
  - `/src/pages/customer/PropertySearch.tsx`
  - `/src/pages/customer/MyFavorites.tsx`
  - `/src/pages/customer/Dashboard.tsx`
