#!/bin/bash

echo "🌐 Frontend Deployment Preparation Script for Vercel"
echo "================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create production environment file
echo "⚙️  Creating production environment file..."
cat > .env.production << EOF
# Vercel Frontend Environment Variables
VITE_API_URL=https://api.buildhomemartsquares.com/api
VITE_API_BASE_URL=https://api.buildhomemartsquares.com
VITE_FRONTEND_URL=https://buildhomemartsquares.com/v2
VITE_SUPABASE_URL=https://fiwawbrrfznxiuymgeyn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
EOF

# Update vercel.json for better configuration
echo "📝 Creating/updating vercel.json..."
cat > vercel.json << EOF
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
EOF

# Create deployment instructions
cat > VERCEL_DEPLOY_INSTRUCTIONS.md << EOF
# Frontend Deployment Instructions for Vercel

## Method 1: Vercel CLI (Recommended)

### Installation:
\`\`\`bash
npm install -g vercel
vercel login
\`\`\`

### Deployment:
\`\`\`bash
# From project root
vercel

# For production deployment
vercel --prod
\`\`\`

## Method 2: GitHub + Vercel Dashboard

### 1. Push to GitHub:
\`\`\`bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
\`\`\`

### 2. Connect to Vercel:
1. Visit vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - Framework: Vite
   - Root Directory: ./
   - Build Command: npm run build
   - Output Directory: dist

### 3. Environment Variables in Vercel:
Add these in Project Settings → Environment Variables:
- VITE_API_URL (your Hostinger backend URL)
- VITE_API_BASE_URL (your Hostinger backend URL)
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

## Important Notes:
1. Update .env.production with your actual Hostinger domain
2. Make sure backend CORS allows your Vercel domain
3. Test the deployment thoroughly

## Testing:
After deployment, test:
- All pages load correctly
- API calls work (check browser console)
- Authentication flow
- File uploads
- All features function properly
EOF

# Test build locally
echo "🔨 Testing build locally..."
if npm run build; then
    echo "✅ Build successful!"
    echo "📁 Built files are in ./dist directory"
else
    echo "❌ Build failed! Please fix errors before deploying."
    exit 1
fi

echo ""
echo "✅ Frontend deployment preparation complete!"
echo ""
echo "📋 Files created/updated:"
echo "   - .env.production (update with your backend URL)"
echo "   - vercel.json (Vercel configuration)"
echo "   - VERCEL_DEPLOY_INSTRUCTIONS.md (step-by-step guide)"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env.production with your Hostinger backend URL"
echo "   2. Follow instructions in VERCEL_DEPLOY_INSTRUCTIONS.md"
echo "   3. Deploy using 'vercel' command or GitHub integration"
echo ""
echo "⚠️  Remember to:"
echo "   - Update your backend CORS with the Vercel URL"
echo "   - Test all functionality after deployment"
