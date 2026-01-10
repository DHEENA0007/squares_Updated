#!/bin/bash

echo " Building for Hostinger Premium Hosting..."

# Build frontend
npm run build

echo ""
echo " Build complete!"
echo ""
echo " Upload instructions:"
echo "1. Upload contents of 'dist/' folder to Hostinger"
echo "2. Target directory: /public_html/en-new/"
echo "3. Ensure .htaccess is included"
echo ""
echo "Backend VPS should be running at: api.buildhomemartsquares.com"
echo ""
echo "Frontend will be available at: buildhomemartsquares.com/en-new/"
