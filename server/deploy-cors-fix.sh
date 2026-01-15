#!/bin/bash

echo "🚀 Deploying CORS Fix to Render..."
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the server directory."
    exit 1
fi

echo "📦 Current environment variables to be deployed:"
echo "CLIENT_URL: https://squares-v3.vercel.app"
echo "ADDITIONAL_ALLOWED_ORIGINS: https://squares.vercel.app,https://squares-git-main.vercel.app,https://squares-h1ev7dmj1-dheenadhayalans-projects.vercel.app"
echo ""

echo "🔧 CORS Configuration Updates:"
echo "- Added support for ADDITIONAL_ALLOWED_ORIGINS environment variable"
echo "- Added your current deployment domain: squares-h1ev7dmj1-dheenadhayalans-projects.vercel.app"
echo "- Added better CORS debugging logs"
echo "- Made CORS more permissive for production debugging"
echo ""

echo "📋 Next steps:"
echo "1. Commit and push these changes to your git repository"
echo "2. Render will automatically deploy the updates"
echo "3. Test the API endpoints after deployment"
echo ""

echo "🔍 To test after deployment, run:"
echo "node scripts/test-cors.js"
echo ""

echo "✅ CORS fix is ready for deployment!"
echo "⚠️  Remember to commit and push to trigger Render deployment"
