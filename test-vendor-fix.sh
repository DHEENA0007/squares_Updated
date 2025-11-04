#!/bin/bash

echo "=========================================="
echo "Testing Vendor Registration"
echo "=========================================="
echo ""

echo "Running payload debug script..."
node debug-registration-payload.js

echo ""
echo "=========================================="
echo "✅ Fix Summary:"
echo "=========================================="
echo "1. Documents now include required 'type' field"
echo "2. PAN validation fixed"
echo "3. Business type enum matches backend"
echo "4. Experience is number type"
echo "5. OTP bypass removed"
echo "6. Admin approval required"
echo ""
echo "Next: Test the registration on http://localhost:3000/vendor/register"
echo "=========================================="
