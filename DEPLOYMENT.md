# Deployment Guide

This guide explains how to deploy the Ninety Nine Acres application to Vercel.

## Prerequisites

- Node.js 18+ installed
- Vercel account
- Git repository

## Backend Deployment (Deploy First!)

### 1. Deploy Backend to Vercel

```bash
# Navigate to server directory
cd server

# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy backend
vercel --prod
```

### 2. Set Backend Environment Variables

In your Vercel dashboard for the backend project, add these environment variables:

```bash
NODE_ENV=production
JWT_SECRET=your_super_secure_jwt_secret_key_for_production_change_this
JWT_EXPIRE=7d
MONGODB_URI=mongodb+srv://squares:HbpqwfWiJvR00bG7@cluster0.loonmqw.mongodb.net/ninety-nine-acres
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@ninety-nine-acres.com
SMTP_PASS=your_app_specific_password
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
CLIENT_URL=https://your-frontend-app.vercel.app
```

### 3. Note Your Backend URL

After deployment, note your backend URL (e.g., `https://your-backend-api.vercel.app`)

## Frontend Deployment

### 1. Update Frontend Environment Variables

In your Vercel dashboard for the frontend project, add these environment variables:

```bash
VITE_SUPABASE_PROJECT_ID=fiwawbrrfznxiuymgeyn
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd2F3YnJyZnpueGl1eW1nZXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTQ4NjYsImV4cCI6MjA3NTM5MDg2Nn0.wQ8yi_KI-XW5iKcxpReRTPryWKiNYlrvXEEBZ2K4ufo
VITE_SUPABASE_URL=https://pmpugqwfwcqzjvbnylms.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcHVncXdmd2Nxemp2Ym55bG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAzOTUxNTgsImV4cCI6MjA0NTk3MTE1OH0.Kt0O0UGWkADgFCFCEzYzwTx_YvFi5w0fQOyJWV7R1Yg
VITE_API_URL=https://your-backend-api.vercel.app/api
VITE_API_BASE_URL=https://your-backend-api.vercel.app
```

**Important**: Replace `https://your-backend-api.vercel.app` with your actual backend URL from step 3.

### 2. Deploy Frontend to Vercel

```bash
# From root directory
vercel --prod
```

## Quick Fix for Current Issue

If you want to temporarily test with a local backend:

1. Start your backend locally:
```bash
cd server
npm install
npm run dev
```

2. Update your Vercel environment variables to:
```bash
VITE_API_URL=http://localhost:5000/api
VITE_API_BASE_URL=http://localhost:5000
```

3. Redeploy your frontend

**Note**: This is only for testing. For production, you must deploy your backend.

## Build Configuration

The application uses Vite with optimized build settings:

- Manual chunk splitting for vendor libraries
- Optimized asset handling
- Tree shaking enabled
- Minification in production

## SPA Routing

The `vercel.json` file is configured to handle SPA routing properly:

```json
{
  "rewrites": [
    {
      "source": "/((?!api/.*).*)",
      "destination": "/index.html"
    }
  ]
}
```

This ensures that all routes (except API routes) are handled by the React Router on the client side.

## Troubleshooting

### CORS Errors (Current Issue)
- **Cause**: Frontend trying to connect to localhost backend from deployed app
- **Solution**: Deploy backend first, then update frontend environment variables

### 404 Errors
- Ensure `vercel.json` is properly configured for SPA routing
- Check that all routes use React Router's `BrowserRouter`

### Build Errors
- Check that all dependencies are properly installed
- Verify TypeScript compilation passes locally
- Ensure all environment variables are set

### API Connection Issues
- Verify `VITE_API_URL` points to the correct backend
- Check CORS configuration on the backend
- Ensure backend is deployed and accessible

## Production Checklist

- [ ] Backend deployed to Vercel
- [ ] Backend environment variables configured
- [ ] Frontend environment variables updated with backend URL
- [ ] Frontend deployed to Vercel
- [ ] CORS configuration allows frontend domain
- [ ] All services (Cloudinary, MongoDB, etc.) configured for production