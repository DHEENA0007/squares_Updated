# Message Attachments Implementation

## Current Status (Issues Found)

### 1. **Vendor Portal** - Attachment Buttons NOT Working
- UI shows Paperclip and Image buttons
- Buttons are present but have NO functionality
- No file input, no upload handler, just empty buttons

### 2. **Customer Portal** - Attachment Feature COMPLETELY Missing
- No attachment buttons in UI
- No attachment handling code
- Missing entirely from the component

### 3. **Admin Portal** - Need to verify
- Different architecture (message-based, not conversation-based)
- Will check for attachment support

### 4. **Backend Issues**
- Message model has NO `attachments` field in schema
- TypeScript interface defines attachments but backend doesn't support it
- Backend routes don't handle file uploads for messages
- Need to add attachment support to Message model and API routes

## Implementation Plan

### Phase 1: Backend Implementation

1. **Update Message Model** (`server/models/Message.js`)
   - Add `attachments` array field with structure:
     ```javascript
     attachments: [{
       type: { type: String, enum: ['image', 'document'] },
       url: String,
       name: String,
       size: Number
     }]
     ```

2. **Update Message Routes** (`server/routes/messages.js`)
   - Update POST `/api/messages` to accept attachments in request body
   - Update POST `/api/messages/property-inquiry` to accept attachments
   - Integrate with existing upload service (Cloudinary)

### Phase 2: Frontend Implementation

#### Vendor Portal (`src/pages/vendor/VendorMessages.tsx`)
1. Add file input state
2. Add file upload handler
3. Connect Paperclip button to file input (documents)
4. Connect Image button to file input (images only)
5. Upload files to backend before sending message
6. Display attachments in message bubbles
7. Handle attachment viewing/downloading

#### Customer Portal (`src/pages/customer/Messages.tsx`)
1. Add complete attachment functionality (same as vendor)
2. Add Paperclip and Image buttons to UI
3. Implement file upload handler
4. Display attachments in message bubbles

#### Admin Portal (`src/pages/admin/Messages.tsx`)
1. Check current implementation
2. Add attachment viewing if missing
3. Ensure attachments are displayed in message details

### Phase 3: UI Components
1. Create AttachmentPreview component for displaying attachments
2. Add file size validation (max 10MB per file)
3. Add file type validation (images: jpg, png, gif; docs: pdf, doc, docx)
4. Add loading states during upload
5. Add error handling

## Files to Modify

### Backend
- `server/models/Message.js` - Add attachments field
- `server/routes/messages.js` - Handle attachments in message creation

### Frontend
- `src/pages/vendor/VendorMessages.tsx` - Implement attachment functionality
- `src/pages/customer/Messages.tsx` - Add attachment functionality
- `src/pages/admin/Messages.tsx` - Verify and add if needed
- `src/services/messageService.ts` - Already has TypeScript types for attachments

## Implementation Steps

1. ✅ Document current state
2. ⏳ Update backend Message model
3. ⏳ Update backend API routes
4. ⏳ Implement vendor portal attachments
5. ⏳ Implement customer portal attachments  
6. ⏳ Verify admin portal attachments
7. ⏳ Test end-to-end functionality
