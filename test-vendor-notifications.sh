#!/bin/bash

# Simple test script to verify vendor notifications are working correctly

echo "Testing Vendor Notification System..."

# Test 1: Check if vendor can save notification settings
echo "1. Testing vendor notification settings save..."
curl -X PUT "http://localhost:5000/api/vendors/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_VENDOR_TOKEN" \
  -d '{
    "profile": {
      "preferences": {
        "notifications": {
          "email": true,
          "push": true,
          "newMessages": true,
          "newsUpdates": true,
          "marketing": false
        }
      },
      "vendorInfo": {
        "vendorPreferences": {
          "emailNotifications": true,
          "smsNotifications": false,
          "leadAlerts": true,
          "marketingEmails": false,
          "weeklyReports": true
        }
      }
    }
  }'

echo -e "\n"

# Test 2: Send test vendor notification
echo "2. Testing vendor lead alert notification..."
curl -X POST "http://localhost:5000/api/notifications/test/vendor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_VENDOR_TOKEN" \
  -d '{
    "type": "lead_alert",
    "data": {
      "leadId": "test_lead_123",
      "propertyId": "test_property_456",
      "propertyTitle": "3BHK Apartment in Whitefield",
      "customerName": "John Doe",
      "customerPhone": "+91 9876543210"
    }
  }'

echo -e "\n"

# Test 3: Send test inquiry notification
echo "3. Testing vendor inquiry notification..."
curl -X POST "http://localhost:5000/api/notifications/test/vendor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_VENDOR_TOKEN" \
  -d '{
    "type": "inquiry_received",
    "data": {
      "inquiryId": "test_inquiry_789",
      "propertyId": "test_property_456",
      "propertyTitle": "3BHK Apartment in Whitefield",
      "customerName": "Jane Smith",
      "customerEmail": "jane@example.com",
      "customerPhone": "+91 9876543211",
      "message": "I am interested in this property. Please contact me."
    }
  }'

echo -e "\n"

# Test 4: Check notification stream
echo "4. Testing notification stream connection..."
echo "Connect to: http://localhost:5000/api/notifications/stream"
echo "Should receive real-time notifications for vendors"

echo -e "\nTest completed. Check the responses and notification stream for proper functionality."
