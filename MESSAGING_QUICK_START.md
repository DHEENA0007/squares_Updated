# Customer Portal Messaging - Quick Start Guide

## ✅ What's Been Implemented

### 1. Complete Messaging System
- ✅ **Property Inquiry**: Customers can send messages to property owners from listings
- ✅ **Auto-Routing**: Messages automatically sent to agent (if exists) or admin who created the property
- ✅ **Conversation System**: Messages grouped by conversationId (userId1_userId2)
- ✅ **Real-time Ready**: WebSocket hooks integrated for live updates
- ✅ **Read Receipts**: Automatic read tracking when viewing messages
- ✅ **Contact Information**: Phone and email display with click-to-call/email

### 2. UI Components
- ✅ **Message Button** on every property card
- ✅ **Contact Button** on every property card
- ✅ **PropertyMessageDialog**: Send inquiry with subject and message
- ✅ **PropertyContactDialog**: Show owner phone/email with copy buttons
- ✅ **Messages Page**: Full chat interface with conversation list

### 3. Backend API
- ✅ **GET /api/messages/conversations**: List all conversations
- ✅ **GET /api/messages/conversation/:id**: Get messages in conversation
- ✅ **POST /api/messages/property-inquiry**: Send inquiry to property owner
- ✅ **POST /api/messages**: Send message in conversation
- ✅ **PATCH /api/messages/conversation/:id/read**: Mark as read

## 🚀 How to Use

### As a Customer:

1. **Browse Properties**
   - Go to Customer Portal → Property Search
   - Browse available properties

2. **Send a Message**
   - Click **"Message"** button on any property card
   - Dialog opens with property info
   - Enter subject (pre-filled) and your message
   - Click **"Send Message"**
   - Message automatically sent to property owner

3. **View Contact Info**
   - Click **"Contact"** button on any property card
   - See owner name, phone, and email
   - Click phone number to call
   - Click email to send email
   - Click copy icon to copy to clipboard

4. **Continue Conversation**
   - After sending message, you're redirected to Messages page
   - See all your conversations on the left
   - Click a conversation to view messages
   - Type in the input box and send replies
   - Messages auto-marked as read when you view them

### As a Property Owner:

1. **Receive Messages**
   - Go to Messages page
   - See all conversations with customers
   - Unread count badge shows new messages

2. **Reply to Inquiries**
   - Click on a conversation
   - See full property context
   - Type your reply and send
   - Customer gets the message immediately

## 📁 File Structure

```
Backend:
  server/routes/messages.js          - All messaging routes
  server/models/Message.js            - Message database schema

Frontend:
  src/pages/customer/Messages.tsx     - Chat interface
  src/pages/customer/PropertySearch.tsx - Property listings with buttons
  src/components/PropertyMessageDialog.tsx - Send inquiry dialog
  src/components/PropertyContactDialog.tsx - Contact info dialog
  src/services/messageService.ts      - API service layer
```

## 🔧 Configuration

### Backend Environment
```env
# Make sure MongoDB is running
MONGODB_URI=mongodb://localhost:27017/ninety-nine-acres
JWT_SECRET=your-secret-key
```

### Frontend Environment
```env
VITE_API_URL=http://localhost:8000/api
```

## 🧪 Testing Steps

1. **Start Backend**
   ```bash
   cd server
   npm install
   npm start
   ```

2. **Start Frontend**
   ```bash
   npm install
   npm run dev
   ```

3. **Test Flow**
   - Register/Login as customer
   - Go to Property Search
   - Click "Message" on a property
   - Send a test message
   - Go to Messages page
   - Verify conversation appears
   - Send a reply
   - Check it appears in chat

## 🐛 Troubleshooting

### "Messages not appearing"
- Check backend server is running on port 8000
- Verify token in localStorage (login again)
- Check browser console for errors

### "Can't send message"
- Ensure you're logged in
- Check property has owner/agent
- Verify network request in DevTools

### "Conversation not loading"
- Refresh the page
- Check conversationId in URL
- Verify backend API responds

## 📊 Database Structure

### messages Collection
```javascript
{
  _id: ObjectId,
  conversationId: "userId1_userId2",
  sender: ObjectId (User),
  recipient: ObjectId (User),
  message: "text content",
  property: ObjectId (Property),  // optional
  read: false,
  createdAt: Date,
  updatedAt: Date
}
```

## 🎯 Key Features

### Automatic Recipient Detection
When a customer sends a property inquiry, the system automatically:
1. Checks if property has an `agent` field
2. If yes, sends to agent
3. If no, sends to property `owner`
4. Creates conversationId: `customerId_ownerId` (sorted)

### Conversation Grouping
- All messages between same 2 users about same property = 1 conversation
- ConversationId format: `{userId1}_{userId2}` (alphabetically sorted)
- Easy to find: split by `_` and check if current user is in it

### Read Tracking
- Messages have `read: boolean` and `readAt: Date`
- Auto-marked read when recipient views conversation
- Unread count badge on conversation list
- Last message preview shows in list

### Property Context
- Every message can reference a property
- Property info shown in conversation header
- Easy to know what they're discussing
- Price and title displayed

## 💡 Next Steps (Optional)

1. **Email Notifications**: Send email when new message
2. **Push Notifications**: Browser notifications for new messages
3. **Attachments**: Upload images with messages
4. **Message Search**: Search across conversations
5. **Archive**: Hide old conversations

## ✨ Summary

Everything is fully implemented and working:
- ✅ Backend API routes
- ✅ Database schema
- ✅ Frontend UI components
- ✅ Message sending/receiving
- ✅ Contact information display
- ✅ Read/unread tracking
- ✅ Conversation management

Just start the server and test it out!
