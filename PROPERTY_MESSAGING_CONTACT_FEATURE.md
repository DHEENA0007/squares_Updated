# Property Messaging & Contact Feature Implementation

## Overview
This document describes the implementation of messaging and contact features for properties in the customer portal. Customers can now send messages to property owners (vendors/admins) and view their contact information directly from property listings.

## Changes Made

### 1. New Components Created

#### PropertyMessageDialog.tsx
**Location:** `src/components/PropertyMessageDialog.tsx`

**Purpose:** 
- Provides a dialog interface for customers to send messages to property owners
- Automatically determines the correct recipient (vendor or admin) based on who added the property
- Pre-fills subject line with property title
- Shows property details in the dialog for context

**Key Features:**
- Subject and message input fields
- Property information display (title, location, price)
- Auto-detects recipient (vendor or admin)
- Validates message before sending
- Shows loading state during send
- Toast notifications for success/error
- Closes automatically after successful send

**Props:**
```typescript
interface PropertyMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
  onMessageSent?: () => void;
}
```

#### PropertyContactDialog.tsx
**Location:** `src/components/PropertyContactDialog.tsx`

**Purpose:**
- Displays property owner's contact information (phone and email)
- Shows owner/vendor name and type
- Provides quick actions to call or email

**Key Features:**
- Shows owner/vendor name with appropriate icon
- Displays phone number and email
- Copy to clipboard functionality for both phone and email
- Visual feedback on copy (checkmark animation)
- Quick action buttons to call or send email
- Handles missing contact information gracefully
- Property information display for context

**Props:**
```typescript
interface PropertyContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
}
```

### 2. Updated Components

#### PropertyCard.tsx
**Location:** `src/components/PropertyCard.tsx`

**Changes:**
- Added state management for message and contact dialogs
- Replaced generic "Contact Owner/Agent" button with two specific buttons:
  - **Message Button:** Opens message dialog
  - **Contact Button:** Opens contact dialog
- Added navigation support for "View Details" button
- Integrated PropertyMessageDialog and PropertyContactDialog components

**Button Layout:**
```
[Message] [Contact] [View Details]
```

#### PropertySearch.tsx
**Location:** `src/pages/customer/PropertySearch.tsx`

**Changes:**
- Added imports for PropertyMessageDialog and PropertyContactDialog
- Added state for selected property and dialog visibility
- Created new handler functions:
  - `handlePropertyMessage()` - Opens message dialog
  - `handlePropertyContact()` - Opens contact dialog
  - Updated `handlePropertyView()` - Now navigates to property detail page
- Added Message button to property cards in search results
- Added dialog components at component bottom
- Updated button layout in property cards to include messaging

**New Handlers:**
```typescript
const handlePropertyMessage = (property: Property) => {
  setSelectedProperty(property);
  setShowMessageDialog(true);
};

const handlePropertyContact = (property: Property) => {
  setSelectedProperty(property);
  setShowContactDialog(true);
};
```

### 3. Service Updates

#### messageService.ts
**Location:** `src/services/messageService.ts`

**New Method:**
```typescript
async sendPropertyInquiry(data: {
  recipientId: string;
  propertyId: string;
  subject: string;
  content: string;
}): Promise<Message>
```

**Purpose:**
- Sends property inquiry message to property owner
- Uses the existing `/api/messages` POST endpoint
- Validates response and handles errors
- Returns created message object

**Usage:**
```typescript
await messageService.sendPropertyInquiry({
  recipientId: property.vendor?._id || property.owner._id,
  propertyId: property._id,
  subject: "Inquiry about property",
  content: "I am interested in this property..."
});
```

## How It Works

### Message Flow

1. **Customer Views Property**
   - Customer browses properties in PropertySearch or sees PropertyCard
   - Sees "Message" button on each property

2. **Customer Clicks Message Button**
   - PropertyMessageDialog opens
   - Dialog shows property details
   - Subject pre-filled with property title
   - Customer types message

3. **Message Sent**
   - System determines recipient:
     - If property has vendor → send to vendor
     - If property has owner → send to admin/owner
   - Message saved to database with property reference
   - Recipient receives message in their Messages inbox

4. **Message Delivered**
   - Vendor/Admin can view message in their Messages section
   - Can reply directly from Messages page
   - Property context maintained in conversation

### Contact Flow

1. **Customer Clicks Contact Button**
   - PropertyContactDialog opens
   - Shows property details

2. **Contact Information Displayed**
   - Owner/Vendor name with type badge
   - Phone number (if available)
   - Email address (if available)
   - Both can be copied to clipboard

3. **Customer Takes Action**
   - **Call Now:** Opens phone dialer with number
   - **Send Email:** Opens email client with pre-filled subject
   - **Copy:** Copies phone/email to clipboard

## Recipient Logic

The system determines the message recipient based on property ownership:

```typescript
// Determine recipient
const recipientId = property.vendor?._id || property.owner?._id;
```

**Priority Order:**
1. **Vendor** - If property was added by a vendor, message goes to vendor
2. **Owner** - If property was added by admin, message goes to admin/owner

## Contact Information Display

Contact information is retrieved from the property object:

```typescript
// Vendor-added properties
if (property.vendor?.name) {
  name: property.vendor.name
  type: "Vendor"
  phone: property.owner?.profile?.phone
  email: property.owner?.email
}

// Admin-added properties
if (property.owner?.profile) {
  name: firstName + lastName
  type: property.agent ? "Agent" : "Owner"
  phone: property.owner.profile.phone
  email: property.owner.email
}
```

## User Interface

### Message Dialog
```
┌─────────────────────────────────────┐
│ 🗨 Send Message                     │
│ Send a message to [Owner Name]      │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Property Title                  │ │
│ │ City, State                     │ │
│ │ ₹ Price                         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Subject:                            │
│ [Inquiry about Property Title]      │
│                                     │
│ Message:                            │
│ ┌─────────────────────────────────┐ │
│ │ Type your message here...       │ │
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│           [Cancel] [📤 Send Message]│
└─────────────────────────────────────┘
```

### Contact Dialog
```
┌─────────────────────────────────────┐
│ 📞 Contact Information              │
│ Get in touch with the property owner│
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Property Title                  │ │
│ │ City, State                     │ │
│ │ ₹ Price                         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👤  Owner Name                  │ │
│ │     Vendor/Owner/Agent          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📞  Phone                       │ │
│ │     +91 XXXXXXXXXX          [📋]│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📧  Email                       │ │
│ │     email@example.com       [📋]│ │
│ └─────────────────────────────────┘ │
│                                     │
│    [📞 Call Now]  [📧 Send Email]   │
└─────────────────────────────────────┘
```

### Property Card Buttons
```
┌──────────────────────────────────────┐
│                                      │
│  Property Image                      │
│                                      │
├──────────────────────────────────────┤
│ Property Title                       │
│ 📍 City, State                       │
│ 🏠 Type | 🛏 Beds | 🛁 Baths          │
│ ₹ Price                              │
│                                      │
│ [💬 Message] [📞 Contact] [View Det] │
└──────────────────────────────────────┘
```

## Backend API Integration

### Endpoint Used
```
POST /api/messages
```

### Request Format
```json
{
  "recipientId": "vendor_or_admin_user_id",
  "propertyId": "property_id",
  "subject": "Inquiry about Property Title",
  "content": "I am interested in this property..."
}
```

### Response Format
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "message": {
      "_id": "message_id",
      "sender": { ... },
      "recipient": { ... },
      "property": { ... },
      "subject": "Inquiry about Property Title",
      "content": "I am interested...",
      "createdAt": "2024-11-01T10:00:00Z",
      "read": false
    }
  }
}
```

## Property Model Requirements

For the messaging and contact features to work properly, the Property model should include:

```typescript
interface Property {
  _id: string;
  title: string;
  price: number;
  address: {
    city: string;
    state: string;
    // ... other fields
  };
  owner?: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      phone?: string;
    };
  };
  vendor?: {
    _id: string;
    name?: string;
  };
  agent?: {
    _id: string;
    // ... agent fields
  };
  // ... other property fields
}
```

## Testing Checklist

### Message Feature
- [ ] Message button visible on property cards
- [ ] Message button visible in search results
- [ ] Message dialog opens when clicked
- [ ] Property details displayed correctly in dialog
- [ ] Subject pre-filled with property title
- [ ] Message textarea allows input
- [ ] Send button disabled when message empty
- [ ] Send button shows loading state
- [ ] Message sent successfully to vendor
- [ ] Message sent successfully to admin/owner
- [ ] Success toast shown after send
- [ ] Dialog closes after successful send
- [ ] Error handling works for failed sends
- [ ] Recipient receives message in Messages inbox

### Contact Feature
- [ ] Contact button visible on property cards
- [ ] Contact button visible in search results
- [ ] Contact dialog opens when clicked
- [ ] Property details displayed correctly
- [ ] Owner/Vendor name shown correctly
- [ ] Owner type (Vendor/Agent/Owner) shown correctly
- [ ] Phone number displayed when available
- [ ] Email address displayed when available
- [ ] "Not available" shown for missing info
- [ ] Copy phone number works
- [ ] Copy email works
- [ ] Visual feedback (checkmark) on copy
- [ ] Call Now button opens phone dialer
- [ ] Send Email button opens email client
- [ ] Email pre-filled with property subject

### Edge Cases
- [ ] Property with no owner info
- [ ] Property with vendor but no phone
- [ ] Property with owner but no email
- [ ] Long property titles
- [ ] Long messages
- [ ] Network errors during send
- [ ] Unauthorized user trying to send message

## Benefits

### For Customers
1. **Easy Communication** - Quick way to contact property owners
2. **Contextual Messaging** - Property details included in message
3. **Multiple Contact Options** - Message, call, or email
4. **Convenient** - No need to manually copy contact details
5. **Professional** - Structured message format

### For Property Owners/Vendors
1. **Organized Inquiries** - All messages in one place
2. **Property Context** - Know which property customer is asking about
3. **Lead Tracking** - Messages tied to specific properties
4. **Response Management** - Can reply directly from Messages

### For Platform
1. **Engagement** - Easier communication increases engagement
2. **Lead Generation** - Captures all property inquiries
3. **Analytics** - Track which properties get most inquiries
4. **Professional Image** - Built-in messaging system

## Future Enhancements

1. **Message Templates**
   - Pre-written message templates for common inquiries
   - "Schedule a viewing" template
   - "Request more details" template

2. **Quick Replies**
   - Owner can set auto-replies for common questions
   - Business hours auto-responder

3. **Attachment Support**
   - Allow customers to attach documents
   - ID proof for serious inquiries

4. **Chat Integration**
   - Real-time chat interface
   - Online/offline status
   - Typing indicators

5. **Message History**
   - View all messages for a property
   - Track conversation threads

6. **WhatsApp Integration**
   - Direct WhatsApp chat option
   - Share property via WhatsApp

7. **Call Scheduling**
   - Schedule callback request
   - Preferred contact time selection

8. **Analytics**
   - Track response rates
   - Average response time
   - Conversion tracking

## Troubleshooting

### Message Not Sending
**Issue:** Message button doesn't work
**Solution:**
- Check if user is authenticated
- Verify property has owner or vendor ID
- Check network connectivity
- Look for errors in browser console

### Contact Info Not Showing
**Issue:** "Not available" shown for phone/email
**Solution:**
- Verify property owner/vendor has profile data
- Check if phone/email populated in database
- Ensure property includes owner/vendor in API response

### Dialog Not Opening
**Issue:** Click doesn't open dialog
**Solution:**
- Check if dialogs are properly imported
- Verify state management (open/onOpenChange)
- Check for JavaScript errors in console

## Conclusion

The Property Messaging & Contact feature provides a comprehensive communication solution for the customer portal. Customers can easily reach out to property owners through messages or direct contact, while the platform maintains organized records of all inquiries. The implementation follows React best practices with proper state management, error handling, and user feedback.
