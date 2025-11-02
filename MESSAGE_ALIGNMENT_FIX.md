# Message Alignment Fix - Real-time Chat Look

## Issue
Messages were appearing on only one side instead of showing a proper left/right chat interface like WhatsApp or other messaging apps.

## Root Cause
The logic to determine if a message belongs to the current user was incorrect:

### ❌ BEFORE (Wrong Logic)
```tsx
// Customer Portal
const isOwnMessage = message.sender._id === message.recipient._id;
// This compares sender with recipient - always false or random!

// Vendor Portal
className={`flex ${message.sender._id === otherParticipant?._id ? 'justify-start' : 'justify-end'}`}
// This compares sender with other participant - works but backwards
```

### ✅ AFTER (Correct Logic)
```tsx
// Both Portals
const isOwnMessage = user?.id === message.sender._id || user?.id === message.sender.toString();
// This correctly compares current logged-in user with message sender
```

## Changes Made

### 1. Customer Portal (`src/pages/customer/Messages.tsx`)

**Added useAuth import:**
```tsx
import { useAuth } from "@/contexts/AuthContext";

const Messages = () => {
  const { user } = useAuth(); // Get current logged-in user
  // ...
```

**Fixed message alignment:**
```tsx
{messages.map((message) => {
  // Check if current user is the sender
  const isOwnMessage = user?.id === message.sender._id || user?.id === message.sender.toString();
  
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] p-3 rounded-lg ${
        isOwnMessage
          ? 'bg-primary text-primary-foreground'    // Your messages: right side, primary color
          : 'bg-muted'                               // Their messages: left side, muted color
      }`}>
        {/* Message content */}
      </div>
    </div>
  );
})}
```

### 2. Vendor Portal (`src/pages/vendor/VendorMessages.tsx`)

**Added useAuth import:**
```tsx
import { useAuth } from "@/contexts/AuthContext";

const VendorMessages = () => {
  const { user } = useAuth(); // Get current logged-in user
  // ...
```

**Fixed message alignment:**
```tsx
{messages.map((message) => {
  // Check if current user is the sender
  const isOwnMessage = user?.id === message.sender._id || user?.id === message.sender.toString();
  
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] rounded-lg p-3 ${
        isOwnMessage
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted'
      }`}>
        {/* Message content */}
      </div>
    </div>
  );
})}
```

**Fixed attachment styling:**
```tsx
// Document attachment link styling
className={`flex items-center gap-2 p-2 rounded border ${
  isOwnMessage
    ? 'border-primary-foreground/20 hover:bg-primary-foreground/10'
    : 'border-border bg-background hover:bg-muted'
}`}
```

**Fixed timestamp and status icon logic:**
```tsx
<div className={`flex items-center justify-end mt-1 space-x-1 ${
  isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
}`}>
  <span className="text-xs">{timestamp}</span>
  {isOwnMessage && getStatusIcon(message.status)} {/* Only show status on own messages */}
</div>
```

## Visual Result

### Before ❌
```
[All messages on one side]
┌────────────────────┐
│ Message 1          │
│ Message 2          │
│ Message 3          │
│ Message 4          │
└────────────────────┘
```

### After ✅
```
[Proper chat interface]
┌──────────────────────────────┐
│         ┌─────────────────┐  │  (Received - Left)
│         │ Their message   │  │
│         └─────────────────┘  │
│                              │
│  ┌─────────────────┐         │  (Sent - Right)
│  │ Your message    │         │
│  └─────────────────┘         │
│                              │
│         ┌─────────────────┐  │
│         │ Their reply     │  │
│         └─────────────────┘  │
│                              │
│  ┌─────────────────┐         │
│  │ Your reply      │         │
│  └─────────────────┘         │
└──────────────────────────────┘
```

## Message Styling

### Your Messages (Right Side)
- **Position:** `justify-end` (right aligned)
- **Background:** Primary color (blue/brand color)
- **Text:** White text (`text-primary-foreground`)
- **Status Icons:** Checkmarks for read/delivered
- **Attachments:** Light border on primary background

### Their Messages (Left Side)
- **Position:** `justify-start` (left aligned)
- **Background:** Muted color (gray)
- **Text:** Default text color
- **Status Icons:** None (don't show status for received messages)
- **Attachments:** Standard border and background

## How It Works

1. **User Authentication:** Get current logged-in user from `useAuth()` hook
2. **Message Comparison:** Compare `user.id` with `message.sender._id`
3. **Dynamic Styling:** Apply different classes based on `isOwnMessage` boolean
4. **Responsive Layout:** Messages flow naturally with flexbox justify-content

## Testing

To verify the fix works correctly:

1. ✅ Login as User A
2. ✅ Send a message to User B
3. ✅ Your message should appear on the RIGHT with PRIMARY color
4. ✅ Login as User B
5. ✅ Open conversation with User A
6. ✅ User A's message should appear on the LEFT with MUTED color
7. ✅ Send a reply
8. ✅ Your reply should appear on the RIGHT with PRIMARY color
9. ✅ Switch back to User A
10. ✅ User B's reply should appear on the LEFT with MUTED color

## Files Modified

1. ✅ `src/pages/customer/Messages.tsx`
   - Added `useAuth` import
   - Fixed `isOwnMessage` logic
   - Proper left/right alignment

2. ✅ `src/pages/vendor/VendorMessages.tsx`
   - Added `useAuth` import  
   - Fixed `isOwnMessage` logic
   - Updated attachment styling
   - Fixed timestamp and status icon display

## Additional Benefits

- ✅ Read receipts (blue checkmarks) only show on YOUR messages
- ✅ Attachment styling adapts to message position
- ✅ Timestamps have proper contrast on both backgrounds
- ✅ Consistent with modern messaging UX patterns
- ✅ Works with real-time message updates

## Summary

The chat interface now works exactly like WhatsApp, Telegram, or any modern messaging app:
- **Your messages:** Right side, colored background
- **Their messages:** Left side, neutral background
- **Natural conversation flow**
- **Proper visual hierarchy**

All TypeScript errors resolved. Ready for testing! 🎉
