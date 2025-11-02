# Message API Authentication Fix

## Issue
When customers tried to send messages from property listings, the backend returned an error:
```
Error: Cannot read properties of undefined (reading 'toString')
```

## Root Cause
The authentication middleware (`server/middleware/authMiddleware.js`) sets `req.user.id`, but the message routes (`server/routes/messages.js`) were trying to access `req.user._id`.

**Authentication Middleware (authMiddleware.js, line 34):**
```javascript
req.user = {
  id: user._id,  // ← Sets as 'id'
  email: user.email,
  role: user.role,
  profile: user.profile
};
```

**Message Route (messages.js, line 221 - OLD):**
```javascript
const conversationId = [req.user._id.toString(), ...] // ← Trying to access '_id'
```

## Solution
Replaced all occurrences of `req.user._id` with `req.user.id` in:
- `server/routes/messages.js` - All message-related routes
- `server/routes/favorites.js` - All favorite-related routes

## Files Modified
1. **server/routes/messages.js**
   - Fixed POST /api/messages (send message)
   - Fixed GET /api/messages/conversations
   - Fixed GET /api/messages/conversation/:otherUserId
   - Fixed GET /api/messages/message/:id
   - Fixed PATCH /api/messages/:id/read
   - Fixed DELETE /api/messages/:id

2. **server/routes/favorites.js**
   - Fixed GET /api/favorites
   - Fixed POST /api/favorites
   - Fixed GET /api/favorites/check/:propertyId
   - Fixed DELETE /api/favorites/:id
   - Fixed DELETE /api/favorites/property/:propertyId

## Testing
The messaging feature should now work correctly:
1. Customer opens property listing
2. Clicks "Send Message" button
3. Fills in subject and message content
4. Message is sent to the property owner (vendor or admin)
5. Backend creates conversation with proper sender/recipient IDs

## Related Features
- Property inquiry messaging
- Contact information display
- Message conversations by property
- User-to-user messaging
