const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const twoFactorRoutes = require('./routes/twoFactor');
const userRoutes = require('./routes/users');
const propertyRoutes = require('./routes/properties');
const dashboardRoutes = require('./routes/dashboard');
const favoriteRoutes = require('./routes/favorites');
const messageRoutes = require('./routes/messages');
const planRoutes = require('./routes/plans');
const addonRoutes = require('./routes/addons');
const roleRoutes = require('./routes/roles');
const subscriptionRoutes = require('./routes/subscriptions');
const adminRoutes = require('./routes/admin');
const subAdminRoutes = require('./routes/subadmin');
const vendorRoutes = require('./routes/vendors');
const paymentRoutes = require('./routes/payments');
const uploadRoutes = require('./routes/upload');
const locationRoutes = require('./routes/locations');
const localLocationRoutes = require('./routes/localLocations');
const serviceRoutes = require('./routes/services');
const customerReviewsRoutes = require('./routes/customerReviews');
const customerRoutes = require('./routes/customer');
const notificationRoutes = require('./routes/notifications');
const supportRoutes = require('./routes/support');
const policyRoutes = require('./routes/policies');
const webhookRoutes = require('./routes/webhooks');
const refund_policyRoutes = require('./routes/refund_policy');
const configurationRoutes = require('./routes/configuration');
const contentRoutes = require('./routes/content');
const reviewRoutes = require('./routes/reviews');
const userActivityRoutes = require('./routes/userActivity');
const analyticsRoutes = require('./routes/analytics');
const trafficRoutes = require('./routes/traffic');
const heroContentRoutes = require('./routes/heroContent');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { authenticateToken } = require('./middleware/authMiddleware');

// Import services
const paymentStatusService = require('./services/paymentStatusService');
const paymentCleanupJob = require('./jobs/paymentCleanup');
const freeListingExpiryJob = require('./jobs/freeListingExpiry');
const notificationSchedulerJob = require('./jobs/notificationScheduler');
const analyticsCalculatorJob = require('./jobs/analyticsCalculator');

// Import database
const { connectDB } = require('./config/database');

const app = express();
const server = createServer(app);
// CORS configuration for both development and production
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  "https://buildhomemartsquares.com",
  "https://buildhomemartsquares.com/v3",
  "https://www.buildhomemartsquares.com",
  "https://www.buildhomemartsquares.com/v3",
  "https://squares-v3.vercel.app",
  "https://squares.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8001",
  "http://localhost:3002/v3/",
  "http://localhost:3002/v3",
].filter(Boolean);

// Add additional origins from environment variable
const additionalOriginsEnv = process.env.ADDITIONAL_ALLOWED_ORIGINS;
let additionalOrigins = [
  "https://squares-v3.onrender.com",
  "https://app.buildhomemartsquares.com",
];

if (additionalOriginsEnv) {
  const envOrigins = additionalOriginsEnv.split(',').map(origin => origin.trim());
  additionalOrigins = [...additionalOrigins, ...envOrigins];
}

additionalOrigins.push("https://squares-h1ev7dmj1-dheenadhayalans-projects.vercel.app");
additionalOrigins.push("https://cool-profiterole-5e0feb.netlify.app");
additionalOrigins.push("https://69cc952bc2a5.ngrok-free.app");
additionalOrigins.push("https://fuzzy-papayas-see.loca.lt");
additionalOrigins.push("http://[2401:4900:7b9d:5a57:3d2b:b008:a6fe:6c]:8001");

// Combine all allowed origins
const allAllowedOrigins = [...allowedOrigins, ...additionalOrigins];

// Log allowed origins for debugging
console.log('🌐 Configured CORS origins:');
allAllowedOrigins.forEach(origin => console.log(`  - ${origin}`));

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin
      if (!origin) return callback(null, true);

      // Use the same logic as Express CORS
      if (allAllowedOrigins.includes(origin) ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.match(/^https:\/\/squares.*\.vercel\.app$/)) {
        return callback(null, true);
      }

      // Temporarily allow all origins for debugging
      if (process.env.NODE_ENV === 'production') {
        return callback(null, true);
      }

      return callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 8000;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Handle preflight OPTIONS requests FIRST before any other middleware
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, x-device-id, X-Device-Id');
  res.setHeader('Access-Control-Max-Age', '86400');
  return res.status(204).end();
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now to avoid issues with frontend
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
  origin: function (origin, callback) {
    console.log(`🔍 CORS check for origin: ${origin || 'NO_ORIGIN'}`);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('✅ Allowing request with no origin');
      return callback(null, true);
    }

    // Check if the origin is in the allowed list
    if (allAllowedOrigins.includes(origin)) {
      console.log('✅ Origin found in allowed list');
      return callback(null, true);
    }

    // Allow localhost and 127.0.0.1 for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      console.log('✅ Allowing localhost/127.0.0.1 origin');
      return callback(null, true);
    }

    // Allow any Vercel deployment URLs for squares project
    if (origin.match(/^https:\/\/squares.*\.vercel\.app$/)) {
      console.log('✅ Allowing squares vercel deployment');
      return callback(null, true);
    }

    // For production, be more permissive temporarily for debugging
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Production mode - allowing origin for debugging:', origin);
      // Temporarily allow all origins to debug CORS issues
      return callback(null, true);
    }

    console.log('❌ Origin not allowed:', origin);
    console.log('   Configured origins:', allAllowedOrigins);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-device-id']
}));

// Use combined format in production, dev format in development
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Ensure CORS headers on all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allAllowedOrigins.includes(origin) ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.match(/^https:\/\/squares.*\.vercel\.app$/))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, x-device-id, X-Device-Id');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Apply rate limiting only in production or if explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_RATE_LIMIT === 'true') {
  app.use(limiter);
}

// Health check endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    version: process.version,
    platform: process.platform
  };

  try {
    // Check database connection
    const mongoose = require('mongoose');
    healthCheck.database = {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  } catch (error) {
    healthCheck.database = {
      status: 'error',
      error: error.message
    };
  }

  res.status(200).json(healthCheck);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'BuildHomeMartSquares API Server',
    version: '1.0.0',
    status: 'Running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api-docs'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/addons', addonRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subadmin', subAdminRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/local-locations', localLocationRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/customer/reviews', customerReviewsRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/refund_policy', refund_policyRoutes);
app.use('/api/configuration', configurationRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/user-activity', userActivityRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/hero-content', heroContentRoutes);


// Import services
const adminRealtimeService = require('./services/adminRealtimeService');
const socketService = require('./services/socketService');
const notificationService = require('./services/notificationService');

// Initialize Socket.IO service
socketService.initialize(io);

// Initialize notification service with Socket.IO
notificationService.initialize(io);

// Setup admin-specific socket handlers
io.on('connection', (socket) => {
  // Handle admin connections for real-time admin dashboard
  if (socket.userRole === 'admin' || socket.userRole === 'superadmin') {
    const clientId = `admin_${socket.userId}_${Date.now()}`;
    adminRealtimeService.addClient(clientId, socket, socket.userId);

    // Store clientId in socket for cleanup
    socket.adminClientId = clientId;

    // Handle admin-specific events
    socket.on('admin:request-metrics', async () => {
      await adminRealtimeService.sendLiveMetrics(clientId);
    });

    socket.on('admin:broadcast-notification', (notification) => {
      adminRealtimeService.broadcastNotification(notification);
    });

    console.log(`✅ Admin ${socket.userId} connected to real-time dashboard`);
  }

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    // Clean up admin real-time connection
    if (socket.adminClientId) {
      adminRealtimeService.removeClient(socket.adminClientId);
    }
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Database connection with retry logic
const connectWithRetry = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Database connection attempt ${i + 1}/${retries}`);
      await connectDB();
      return; // Success, exit retry loop
    } catch (error) {
      console.error(`❌ Connection attempt ${i + 1} failed:`, error.message);

      if (i === retries - 1) {
        console.error('🚫 All database connection attempts failed');
        throw error;
      }

      const delay = Math.pow(2, i) * 2000; // Exponential backoff: 2s, 4s, 8s, 16s
      console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB with retry logic
    await connectWithRetry();

    server.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Client URL: ${process.env.CLIENT_URL || 'http://localhost:8001'}`);
      console.log(` Database connection established`);

      // Set server timeout for large file uploads (2 minutes)
      server.timeout = 120000; // 120 seconds
      server.keepAliveTimeout = 65000; // 65 seconds
      server.headersTimeout = 66000; // 66 seconds
      console.log(` Server timeout configured: 120s`);

      // Start payment cleanup job (runs every 5 minutes)
      paymentCleanupJob.start(5);
      console.log(` Payment cleanup job started (runs every 5 minutes)`);
      console.log(`  Razorpay timeout limit: 15 minutes`);

      // Start free listing expiry job (runs daily)
      freeListingExpiryJob.start(24);
      console.log(` Free listing expiry job started (runs every 24 hours)`);
      console.log(`  Free listings expire after 30 days`);

      // Start notification scheduler job (runs every minute)
      notificationSchedulerJob.start(1);
      console.log(` Notification scheduler job started (runs every 1 minute)`);

      // Start analytics calculator job (runs every hour)
      analyticsCalculatorJob.start(1);
      console.log(` Analytics calculator job started (runs every 1 hour)`);
      console.log(`  Calculates conversion rate, views, and registrations`);
    });
  } catch (error) {
    console.error(' Failed to start server:', error.message);
    console.error(' Server starting without database connection - some features may not work');

    // Start server anyway but warn about database issues
    server.listen(PORT, () => {
      console.log(`  Server running on port ${PORT} (DATABASE DISCONNECTED)`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Client URL: ${process.env.CLIENT_URL || 'http://localhost:8001'}`);
      console.log(` Database connection failed - check connection and restart`);
    });
  }
};

startServer();

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully`);

  server.close(async () => {
    console.log('HTTP server closed');

    try {
      // Stop payment cleanup job
      paymentCleanupJob.stop();
      console.log('Payment cleanup job stopped');

      // Stop free listing expiry job
      freeListingExpiryJob.stop();
      console.log('Free listing expiry job stopped');

      // Stop notification scheduler job
      notificationSchedulerJob.stop();
      console.log('Notification scheduler job stopped');

      // Stop analytics calculator job
      analyticsCalculatorJob.stop();
      console.log('Analytics calculator job stopped');

      // Close database connection
      await mongoose.connection.close();
      console.log('Database connection closed');

      // Close Socket.IO connections
      io.close();
      console.log('Socket.IO connections closed');

      console.log('Process terminated gracefully');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  // Force close server after 30 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;