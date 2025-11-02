# Vercel Deployment Guide for Ninety Nine Acres

## 🚀 Vercel Deployment Setup

### 1. **Environment Variables Configuration**

Add these environment variables in your Vercel dashboard:

**Go to:** Vercel Dashboard → Your Project → Settings → Environment Variables

```bash
# Supabase Configuration
VITE_SUPABASE_PROJECT_ID=fiwawbrrfznxiuymgeyn
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd2F3YnJyZnpueGl1eW1nZXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTQ4NjYsImV4cCI6MjA3NTM5MDg2Nn0.wQ8yi_KI-XW5iKcxpReRTPryWKiNYlrvXEEBZ2K4ufo
VITE_SUPABASE_URL=https://pmpugqwfwcqzjvbnylms.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcHVncXdmd2Nxemp2Ym55bG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAzOTUxNTgsImV4cCI6MjA0NTk3MTE1OH0.Kt0O0UGWkADgFCFCEzYzwTx_YvFi5w0fQOyJWV7R1Yg

# Backend API Configuration
VITE_API_URL=https://squares-9d84.onrender.com/api
VITE_API_BASE_URL=https://squares-9d84.onrender.com

# Payment Configuration (for production)
RAZORPAY_KEY_ID=rzp_test_RMylhPWMBGHzdi
RAZORPAY_KEY_SECRET=UhEfD2dXPxob6Y44b12mdB4W
```

### 2. **Vercel Project Settings**

Make sure your Vercel project has these settings:

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Node.js Version:** 18.x

### 3. **Git Repository Setup**

Ensure your repository is properly connected:

1. **Push latest changes to GitHub:**
```bash
git add .
git commit -m "Fix Vercel deployment configuration"
git push origin main
```

2. **Connect to Vercel:**
   - Go to Vercel Dashboard
   - Click "Add New Project"
   - Import from GitHub: `DHEENA0007/squares`
   - Select the root directory (not server folder)

### 4. **Deployment Configuration Fixed**

✅ **vercel.json** has been updated with:
- Proper Vite framework detection
- Correct build configuration  
- SPA routing support
- Asset caching headers

### 5. **Manual Deployment Steps**

If automatic deployment fails, try manual deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel --prod
```

### 6. **Environment Variables Checklist**

Verify these are set in Vercel Dashboard:

- ✅ VITE_SUPABASE_PROJECT_ID
- ✅ VITE_SUPABASE_PUBLISHABLE_KEY  
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY
- ✅ VITE_API_URL
- ✅ VITE_API_BASE_URL
- ✅ RAZORPAY_KEY_ID
- ✅ RAZORPAY_KEY_SECRET

### 7. **Common Issues & Solutions**

**Issue: "A commit author is required"**
```bash
git config user.email "your-email@example.com"
git config user.name "Your Name"
git commit --amend --reset-author
git push --force
```

**Issue: Build fails**
- Check that all environment variables are set
- Verify Node.js version is 18.x
- Clear Vercel build cache

**Issue: Routing doesn't work**
- Verify `vercel.json` rewrites configuration
- Check that `cleanUrls` is set to `true`

### 8. **Production URLs**

Once deployed successfully:
- **Frontend:** https://squares-swart.vercel.app
- **Backend API:** https://squares-9d84.onrender.com

### 9. **Post-Deployment Verification**

Test these URLs after deployment:
1. Homepage loads correctly
2. Login/Register functionality works
3. API calls to backend succeed
4. Supabase integration works
5. Payment flow functions properly

---

## 🔧 Quick Fix Commands

```bash
# Fix git author
git config user.email "dheena0007@gmail.com"
git config user.name "DHEENA0007"

# Force redeploy
git commit --allow-empty -m "trigger vercel deployment"
git push origin main
```

## ⚡ Instant Deploy

1. Commit and push latest changes
2. Go to Vercel Dashboard
3. Select "squares" project
4. Click "Redeploy" on latest deployment
5. Or create new deployment with commit hash

The deployment should now work correctly! 🚀
