#!/bin/bash

echo " Building for Hostinger Premium Hosting..."

# Build frontend
npm run build

echo ""
echo " Build complete!"
echo ""
echo " Upload instructions:"
echo "1. Open Hostinger File Manager"
echo "2. Navigate to: public_html/en-new/"
echo "   (Create the 'en-new' folder inside 'public_html' if it doesn't exist)"
echo "3. Upload the CONTENTS of the 'dist' folder into 'public_html/en-new/'"
echo "   - You should see 'index.html', '.htaccess', and 'assets' folder inside 'en-new'"
echo "3. Ensure .htaccess is included (it should be in the dist folder)"
if [ -f "dist/.htaccess" ]; then
    echo "   [OK] .htaccess found in dist/"
else
    echo "   [WARNING] .htaccess NOT found in dist/ - Please check public/ folder"
fi
echo ""
echo "Backend VPS should be running at: api.buildhomemartsquares.com"
echo ""
echo "Frontend will be available at: buildhomemartsquares.com/en-new/"
