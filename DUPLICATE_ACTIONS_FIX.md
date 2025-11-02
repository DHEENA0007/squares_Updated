# Duplicate Actions Header Fix

## Issue
The Roles management page had duplicate "Actions" headers in the table:
- One from the column header
- One from the button text in the dropdown trigger

This created a confusing UI with "Actions    Actions" appearing in the table header.

## Solution
Updated `/src/pages/admin/Roles.tsx` to replace the text button with an icon button (MoreHorizontal icon), matching the pattern used in other admin pages like Properties.

## Changes Made

### 1. Updated Imports
**File:** `src/pages/admin/Roles.tsx`

Added `MoreHorizontal` to the lucide-react imports:
```typescript
import { Loader2, Plus, Edit, Trash2, Shield, Users, ToggleLeft, ToggleRight, MoreHorizontal } from "lucide-react";
```

### 2. Updated Actions Column Button
**File:** `src/pages/admin/Roles.tsx`

**Before:**
```tsx
<Button variant="ghost" size="sm">
  Actions
</Button>
```

**After:**
```tsx
<Button variant="ghost" size="sm">
  <MoreHorizontal className="w-4 h-4" />
</Button>
```

## Result
- ✅ Removed duplicate "Actions" text from table header
- ✅ Consistent UI with other admin pages (Properties, etc.)
- ✅ Cleaner, more professional appearance
- ✅ Better UX with icon-based action menu trigger

## Testing
- [x] No TypeScript errors
- [x] Consistent with Properties page pattern
- [x] MoreHorizontal icon properly imported
