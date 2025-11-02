#!/bin/bash

# Deployment script for Render - CORS Fix
echo "🚀 Deploying CORS fixes to Render..."

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "❌ Not in a git repository. Please run this from the project root."
  exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "📝 Uncommitted changes detected. Committing CORS fixes..."
  
  git add .
  git commit -m "🔧 Fix CORS configuration for Vercel frontend

  - Updated allowedOrigins to include all Vercel deployment URLs
  - Added pattern matching for squares*.vercel.app domains  
  - Temporarily allowing all origins in production for debugging
  - Added explicit OPTIONS request handler
  - Enhanced Socket.IO CORS configuration
  
  This should resolve the CORS errors when frontend tries to access:
  https://squares-9d84.onrender.com/api/properties"
  
  echo "✅ Changes committed successfully"
else
  echo "✅ No uncommitted changes"
fi

# Check if we have a remote configured
if ! git remote get-url origin > /dev/null 2>&1; then
  echo "❌ No git remote 'origin' configured. Please set up your git remote:"
  echo "   git remote add origin <your-repo-url>"
  exit 1
fi

# Push to main branch (which should trigger Render deployment)
echo "📤 Pushing to main branch..."
git push origin main

if [ $? -eq 0 ]; then
  echo "✅ Successfully pushed to main branch"
  echo ""
  echo "🔄 Render should automatically detect the changes and redeploy"
  echo "📊 Monitor deployment at: https://dashboard.render.com"
  echo ""
  echo "⏱️  Expected deployment time: 2-5 minutes"
  echo ""
  echo "🧪 After deployment, test the fix:"
  echo "   curl -H 'Origin: https://squares-smoky.vercel.app' https://squares-9d84.onrender.com/api/properties?limit=1"
  echo ""
  echo "🔍 Check server logs on Render for 'Origin attempted:' messages"
else
  echo "❌ Failed to push changes. Please check your git configuration and try again."
  exit 1
fi

echo ""
echo "📝 Next steps:"
echo "1. Wait for Render deployment to complete"
echo "2. Test CORS with: node server/scripts/test-cors.js"  
echo "3. Test frontend connection"
echo "4. Monitor server logs for any issues"
