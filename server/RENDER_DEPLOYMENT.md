# Ninety Nine Acres Server - Render Deployment

## Production Environment Variables

Copy these to your Render service environment variables:

### Required Environment Variables
```bash
NODE_ENV=production
PORT=10000
CLIENT_URL=https://your-frontend-domain.com

# Database
MONGODB_URI=your_mongodb_connection_string

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_very_long_and_random
JWT_EXPIRE=7d

# Supabase Configuration (if using Supabase for additional features)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Cloudinary Configuration (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Payment Gateway
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Rate Limiting (Optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_RATE_LIMIT=true

# File Upload Configuration (Optional)
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx
```

## Deployment Steps

### 1. Prepare Your Repository
- Ensure all changes are committed and pushed to GitHub
- The `render.yaml` file is configured for automatic deployments

### 2. Create a New Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Choose the repository: `squares`
5. Configure the service:
   - **Name**: `ninety-nine-acres-server`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your production branch)
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3. Set Environment Variables
In your Render service settings, add all the environment variables listed above.

### 4. Configure MongoDB Database
You have several options:
- **MongoDB Atlas** (Recommended for production)
- **Render's PostgreSQL** (if you want to switch to PostgreSQL)
- **External MongoDB service**

#### For MongoDB Atlas:
1. Create a MongoDB Atlas cluster
2. Whitelist Render's IP addresses (or use 0.0.0.0/0 for simplicity)
3. Create a database user
4. Get the connection string and add it as `MONGODB_URI`

### 5. Configure Health Checks
Render will automatically use the `/health` endpoint for health checks.

### 6. Deploy
1. Click "Create Web Service"
2. Render will automatically deploy your application
3. Monitor the deployment logs for any errors

## Post-Deployment Configuration

### 1. Update Frontend Configuration
Update your frontend's API URL to point to your new Render service:
```bash
VITE_API_URL=https://squares-v2.onrender.com/api
```

### 2. Configure CORS
The server is already configured to handle CORS, but make sure to update the `CLIENT_URL` environment variable with your frontend domain.

### 3. Database Initialization
If you need to initialize your database with default data:
```bash
# You can create a script and run it manually in the Render shell
node scripts/create-admin-user.js
```

### 4. SSL/TLS
Render automatically provides SSL certificates for all services.

## Monitoring and Maintenance

### Health Monitoring
- Health endpoint: `https://your-service.onrender.com/health`
- Monitor logs in Render dashboard
- Set up uptime monitoring (like UptimeRobot)

### Performance Optimization
- Enable gzip compression (already configured)
- Monitor memory usage in Render dashboard
- Consider upgrading to a paid plan for better performance

### Database Backups
- Configure regular backups in MongoDB Atlas
- Test restore procedures

### Security
- Keep all dependencies updated
- Monitor for security vulnerabilities
- Use strong, unique JWT secrets
- Regularly rotate API keys

## Troubleshooting

### Common Issues
1. **Build Failures**: Check package.json dependencies
2. **Environment Variables**: Ensure all required vars are set
3. **Database Connection**: Check MongoDB URI and network access
4. **CORS Errors**: Verify CLIENT_URL and CORS configuration
5. **Memory Issues**: Consider upgrading Render plan

### Logs
Access logs through:
- Render dashboard → Your service → Logs
- Use structured logging for better debugging

### Performance
- Monitor response times
- Check database query performance
- Use MongoDB indexes for better performance

## Auto-Deploy Setup

The `render.yaml` file enables automatic deployments. Every push to the main branch will trigger a new deployment.

To disable auto-deploy:
1. Go to your service settings
2. Uncheck "Auto-Deploy"

## Scaling

For high traffic:
1. Upgrade to a higher Render plan
2. Implement Redis for session storage
3. Use MongoDB connection pooling (already configured)
4. Consider implementing caching strategies

## Support

For deployment issues:
- Check Render documentation
- Monitor application logs
- Test all API endpoints after deployment
- Verify all integrations (email, payments, file upload)
