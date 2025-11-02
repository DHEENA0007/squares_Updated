# CORS Configuration Fix Guide

## Problem
CORS (Cross-Origin Resource Sharing) errors when frontend tries to access the API:
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://squares-9d84.onrender.com/api/properties?limit=12&page=1. (Reason: CORS header 'Access-Control-Allow-Origin' missing).
```

## Root Cause
The server's CORS configuration was not properly allowing requests from all possible Vercel deployment URLs for the frontend application.

## Solutions Applied

### 1. Updated Server CORS Configuration
**File**: `server/index.js`

- Added more permissive CORS origin checking
- Included pattern matching for Vercel deployment URLs (`squares*.vercel.app`)
- Temporarily allowing all origins for debugging (should be restricted in production)
- Added explicit handling of preflight OPTIONS requests

### 2. Enhanced Allowed Origins List
```javascript
const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://squares-smoky.vercel.app", 
  "https://squares.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8001"
];
```

### 3. Updated Socket.IO CORS Configuration
Applied the same permissive CORS rules to Socket.IO server for real-time features.

### 4. Added Explicit OPTIONS Handler
```javascript
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }
  next();
});
```

## Deployment Steps

### 1. Deploy Server Changes to Render
```bash
# The changes are automatically deployed when you push to the main branch
# or manually trigger a deployment on Render
git add .
git commit -m "Fix CORS configuration for Vercel frontend"
git push origin main
```

### 2. Update Environment Variables on Render
Navigate to your Render service and ensure these environment variables are set:
- `CLIENT_URL=https://squares-smoky.vercel.app`
- `NODE_ENV=production`
- All other variables from `render.yaml`

### 3. Test CORS Configuration
Run the test script:
```bash
cd server
node scripts/test-cors.js
```

### 4. Verify Frontend Connection
1. Deploy frontend to Vercel
2. Check browser console for CORS errors
3. Test API calls from frontend

## Monitoring

### Check Server Logs
Monitor Render logs for:
- "Origin attempted: [URL]" messages
- CORS-related errors
- 500 errors that might indicate server issues

### Health Check
Visit: `https://squares-9d84.onrender.com/health`
Should return server status and database connection info.

## Production Hardening (TODO)

**Important**: The current configuration temporarily allows all origins for debugging. For production, you should:

1. Remove the "allow all" fallback
2. Explicitly list only trusted frontend domains
3. Enable strict origin checking
4. Monitor and log rejected CORS requests

```javascript
// Production CORS configuration (replace current config)
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://squares-smoky.vercel.app',
      'https://squares.vercel.app'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('Blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
```

## Testing Checklist

- [ ] Server starts without errors
- [ ] Health endpoint accessible
- [ ] Properties API endpoint returns data
- [ ] CORS headers present in responses
- [ ] Frontend can fetch data without CORS errors
- [ ] Socket.IO connections work (if used)

## Support
If CORS issues persist:
1. Check Render deployment logs
2. Verify Vercel deployment URL
3. Test with browser dev tools (Network tab)
4. Run the CORS test script
