# Phone Number Display Issue - Debugging Guide

## Issue Description
Phone number shows as "Not available" in property details view, even though the phone number exists in the database.

**Property**: Murugan Villa  
**Owner**: Vendor One (vendor1@ninetyneacres.com)  
**Phone in DB**: +91 9876543210

## Investigation Summary

### Database Verification ✓
```
Owner ID: 68f8b1214f4741e752f0e18b
Email: vendor1@ninetyneacres.com
Role: agent
Phone: +91 9876543210
Privacy Setting: showPhone = true
```

### Backend Code ✓
The backend correctly:
1. Populates owner with phone field: `.populate('owner', 'profile.firstName profile.lastName profile.phone email role')`
2. Does NOT filter phone based on privacy settings
3. User model toJSON only removes password, keeps phone

### Frontend Code ✓
The frontend `getPropertyContactInfo()` function correctly checks:
```typescript
phone: property.owner?.profile?.phone || "Not available"
```

## Debugging Steps Added

### 1. Backend Logging
**File**: `server/routes/properties.js` (line ~128)

Added logging to see what data is being sent:
```javascript
console.log('Property found:', {
  id: property._id,
  title: property.title,
  ownerData: property.owner ? {
    phone: property.owner.profile?.phone,
    email: property.owner.email,
    // ... other fields
  } : null
});
```

### 2. Frontend Logging  
**Files**: 
- `src/pages/customer/PropertyDetails.tsx` (line ~67)
- `src/pages/PublicPropertyDetails.tsx` (line ~54)

Added logging to see what data is received:
```typescript
console.log('Property data received:', response.data.property);
console.log('Owner phone:', response.data.property.owner?.profile?.phone);
```

## How to Debug

### Step 1: Check Backend Logs
1. Start the server: `npm run dev` (in server directory)
2. Navigate to the property in browser
3. Check server terminal for "Property found" log
4. Verify if `ownerData.phone` is present

### Step 2: Check Frontend Logs  
1. Open browser developer console (F12)
2. Navigate to the property page
3. Check console for "Owner phone" log
4. Verify if phone number is present in the received data

### Step 3: Analyze the Issue

#### If phone is in backend logs but NOT in frontend:
- Check network tab in browser dev tools
- Verify the API response includes owner.profile.phone
- Check for any middleware or proxies stripping the data

#### If phone is in frontend logs but shows "Not available":
- Issue is in the `getPropertyContactInfo()` function
- Check `/src/utils/propertyUtils.ts` line 155-196
- Verify the property structure matches what the function expects

#### If phone is NOT in backend logs:
- Check MongoDB connection  
- Verify the populate query is working
- Check if `.lean()` is affecting nested objects

## Expected Data Structure

### Backend Response:
```json
{
  "success": true,
  "data": {
    "property": {
      "_id": "...",
      "title": "Murugan Villa",
      "owner": {
        "_id": "68f8b1214f4741e752f0e18b",
        "email": "vendor1@ninetyneacres.com",
        "role": "agent",
        "profile": {
          "firstName": "Vendor",
          "lastName": "One",
          "phone": "+91 9876543210"
        }
      }
    }
  }
}
```

### Frontend `getPropertyContactInfo()` Output:
```javascript
{
  name: "Vendor One",
  type: "Vendor",
  phone: "+91 9876543210",  // Should not be "Not available"
  email: "vendor1@ninetyneacres.com"
}
```

## Potential Root Causes

1. **Mongoose populate not working**: Check if `profile.phone` path is correct
2. **Privacy filter**: Check if there's middleware filtering based on `showPhone`
3. **Frontend type mismatch**: Property interface might not match actual data
4. **Caching issue**: Old data cached in browser or server

## Next Steps

1. Clear browser cache and reload
2. Restart both frontend and backend servers
3. Check the console logs in both terminals
4. Check browser developer console
5. If phone appears in logs but not in UI, the issue is in the display logic
6. If phone doesn't appear in logs, the issue is in the data fetching

## Files Modified

1. `server/routes/properties.js` - Added backend logging
2. `src/pages/customer/PropertyDetails.tsx` - Added frontend logging  
3. `src/pages/PublicPropertyDetails.tsx` - Added frontend logging

## Testing

Test with property ID for "Murugan Villa" and check:
1. Server console output
2. Browser console output
3. Network tab API response
4. Final display in UI

If phone number appears in all logs but still shows "Not available", check:
- `src/components/PropertyContactDialog.tsx`
- `src/utils/propertyUtils.ts` - `getPropertyContactInfo()` function
