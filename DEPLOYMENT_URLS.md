# Deployment Configuration

## Backend (Render)
Your backend is deployed at: https://squares-v2.onrender.com

### Environment Variables for Render:
- Copy all variables from `server/.env.production`
3. Update environment variables on Render:
- Make sure to update `CLIENT_URL=https://squares-v2.vercel.app`

## 🌐 Active Deployment URLs

Your frontend is deployed at: https://squares-v2.vercel.app
Your backend is deployed at: https://squares-v2.onrender.com
- Set `MONGODB_URI` to your production MongoDB connection string

## Frontend (Vercel)
Your frontend is deployed at: https://squares-v2.vercel.app

### Environment Variables for Vercel:
Add these in your Vercel project settings:

```bash
VITE_API_URL=https://squares-v2.onrender.com/api
VITE_API_BASE_URL=https://squares-v2.onrender.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key_here
```

## Local Development
For local development, the app will automatically fallback to:
- Backend: http://localhost:8000/api
- Frontend: http://localhost:8001

Create a `.env.local` file (copy from `.env.example`) to override defaults locally.

## Testing URLs
- Local Frontend: http://localhost:8001
- Local Backend: http://localhost:8000
- Production Frontend: https://squares-v2.vercel.app
- Production Backend: https://squares-v2.onrender.com
