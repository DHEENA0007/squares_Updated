# Bedrooms Filter NaN Error Fix

## Issue
**Error:** `Cast to Number failed for value "NaN" (type number) at path "bedrooms" for model "Property"`

This error occurred in the Customer Portal's Property Search when filtering properties by bedrooms.

## Root Cause
When the bedrooms filter was set to "any", the code was trying to parse it as a number:
```typescript
bedrooms: bedrooms !== "any" ? parseInt(bedrooms) : undefined
```

The problem:
- `parseInt("any")` returns `NaN`
- The condition `bedrooms !== "any"` was true for empty strings and other falsy values
- `NaN` was being sent to the MongoDB query, causing the cast error

## Files Fixed

### 1. **src/pages/customer/PropertySearch.tsx**

#### Before:
```typescript
const buildFilters = useCallback((): PropertyFilters => {
  return {
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
    propertyType: propertyType !== "all" ? propertyType : undefined,
    bedrooms: bedrooms !== "any" ? parseInt(bedrooms) : undefined, // ❌ Problem
    location: selectedCity !== "all" ? selectedCity : undefined,
    search: searchQuery || undefined
  };
}, [priceRange, propertyType, bedrooms, selectedCity, searchQuery]);
```

#### After:
```typescript
const buildFilters = useCallback((): PropertyFilters => {
  const bedroomsValue = bedrooms !== "any" && bedrooms ? parseInt(bedrooms) : undefined;
  
  return {
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
    propertyType: propertyType !== "all" ? propertyType : undefined,
    bedrooms: bedroomsValue && !isNaN(bedroomsValue) ? bedroomsValue : undefined, // ✅ Fixed
    location: selectedCity !== "all" ? selectedCity : undefined,
    search: searchQuery || undefined
  };
}, [priceRange, propertyType, bedrooms, selectedCity, searchQuery]);
```

**Key Changes:**
- ✅ Check if value is valid before parsing
- ✅ Explicitly check for `NaN` after parsing
- ✅ Only send numeric values to API

#### Clear Filters Fix:
```typescript
// Before: Used empty strings
setSelectedCity("");
setPropertyType("");
setBedrooms("");

// After: Use proper "all"/"any" defaults
setSelectedCity("all");
setPropertyType("all");
setBedrooms("any");
```

#### Badge Display Fix:
```typescript
// Before: Could show badges for empty strings
{bedrooms && (
  <Badge>{bedrooms} BHK</Badge>
)}

// After: Properly check for "any"
{bedrooms && bedrooms !== "any" && (
  <Badge>{bedrooms} BHK</Badge>
)}
```

### 2. **src/components/PropertyFilters.tsx**

#### Enhanced bedroom filter validation:
```typescript
// Before:
onValueChange={(value) => handleFilterChange('bedrooms', value === 'any' ? undefined : parseInt(value))}

// After:
onValueChange={(value) => {
  const bedroomValue = value === 'any' ? undefined : parseInt(value);
  handleFilterChange('bedrooms', bedroomValue && !isNaN(bedroomValue) ? bedroomValue : undefined);
}}
```

### 3. **server/routes/properties.js**

#### Server-side validation:
```javascript
// Before:
if (bedrooms) {
  queryFilter.bedrooms = parseInt(bedrooms);  // ❌ Could result in NaN
}

// After:
if (bedrooms) {
  const bedroomsNum = parseInt(bedrooms);
  if (!isNaN(bedroomsNum)) {  // ✅ Validate before using
    queryFilter.bedrooms = bedroomsNum;
  }
}
```

## Prevention Strategy

### Client-Side Validation
1. ✅ Always validate parsed numbers with `isNaN()` check
2. ✅ Use meaningful defaults ("any", "all") instead of empty strings
3. ✅ Only send defined, valid values to the API

### Server-Side Validation
1. ✅ Validate all numeric query parameters before using them
2. ✅ Check for `NaN` values before database queries
3. ✅ Return clear error messages for invalid inputs

## Testing Checklist

- [x] Select "Any BHK" - should not send bedrooms filter
- [x] Select "1 BHK" - should filter for 1 bedroom
- [x] Select "2 BHK" - should filter for 2 bedrooms
- [x] Select "3 BHK" - should filter for 3 bedrooms
- [x] Select "4+ BHK" - should filter for 4 bedrooms
- [x] Clear all filters - should reset to "any"
- [x] Badge only shows when valid bedroom count selected
- [x] No NaN errors in console
- [x] API requests don't include invalid bedroom values

## Similar Issues to Watch For

Other filters that could have the same issue:
- ✅ Property Type filter (already handles "all")
- ✅ Listing Type filter (already handles "all")
- ✅ City/Location filter (already handles "all")
- ⚠️ Any other numeric filters (bathrooms, floor, etc.)

## Best Practices

### When working with Select components and numeric filters:

```typescript
// ✅ Good - Validate before parsing
const value = select !== 'any' && select ? parseInt(select) : undefined;
const validValue = value && !isNaN(value) ? value : undefined;

// ✅ Good - Use explicit defaults
const [filter, setFilter] = useState("any");

// ❌ Bad - No validation
const value = parseInt(select);  // Could be NaN

// ❌ Bad - Empty string default
const [filter, setFilter] = useState("");  // Unclear intent
```

### Server-side numeric parameter handling:

```javascript
// ✅ Good - Always validate
if (param) {
  const numValue = parseInt(param);
  if (!isNaN(numValue) && numValue > 0) {
    queryFilter.field = numValue;
  }
}

// ❌ Bad - No validation
queryFilter.field = parseInt(param);  // Unsafe
```

## Related Files

Files that use bedroom filtering:
- ✅ `src/pages/customer/PropertySearch.tsx` - Fixed
- ✅ `src/components/PropertyFilters.tsx` - Fixed
- ✅ `server/routes/properties.js` - Fixed
- ✅ `src/services/propertyService.ts` - Uses interface, no changes needed
- ⚠️ Other files with property filtering may need similar fixes

## Summary

The issue was caused by attempting to cast the string "any" to a Number in MongoDB queries. The fix involves:

1. **Proper validation** before parsing strings to numbers
2. **NaN checks** after parsing
3. **Meaningful defaults** instead of empty strings
4. **Server-side validation** as an additional safety layer

This ensures that only valid numeric values are sent to the database, preventing type casting errors.
