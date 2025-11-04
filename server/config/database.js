const mongoose = require('mongoose');

// Add mongoose event listeners for better debugging
mongoose.connection.on('connecting', () => {
  console.log('🔄 Mongoose connecting to MongoDB...');
});

mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('open', () => {
  console.log('🔓 Mongoose connection opened');
});

mongoose.connection.on('disconnecting', () => {
  console.log('⚠️  Mongoose disconnecting from MongoDB');
});

mongoose.connection.on('disconnected', () => {
  console.log('❌ Mongoose disconnected from MongoDB');
});

mongoose.connection.on('close', () => {
  console.log('🔒 Mongoose connection closed');
});

mongoose.connection.on('error', (error) => {
  console.error('💥 Mongoose connection error:', error.message);
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 Mongoose reconnected to MongoDB');
});

const connectDB = async () => {
  try {
    // Enhanced connection options with better timeout and retry settings
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 30000, // Increased timeout to 30 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      connectTimeoutMS: 30000, // Connection timeout
      heartbeatFrequencyMS: 10000, // Heartbeat frequency
      retryWrites: true, // Enable retry writes
      w: 'majority', // Write concern
      bufferCommands: false, // Disable mongoose buffering
      // Removed bufferMaxEntries as it's deprecated in newer Mongoose versions
    };

    console.log('🔄 Connecting to MongoDB Atlas...');
    console.log('URI:', process.env.MONGODB_URI ? 'Configured' : 'Not configured');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('💡 Possible solutions:');
    console.error('   - Check internet connection');
    console.error('   - Verify MongoDB Atlas cluster is running');
    console.error('   - Check if IP address is whitelisted in MongoDB Atlas');
    console.error('   - Verify credentials in MONGODB_URI');
    
    // Don't exit immediately, let the application handle the error
    throw error;
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const state = mongoose.connection.readyState;
    if (state === 1) {
      console.log('✅ Database connection successful');
      return true;
    } else {
      console.log('❌ Database not connected');
      return false;
    }
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
};

// Initialize database
const initializeDatabase = async () => {
  console.log('🔄 Initializing database...');
  
  try {
    // MongoDB will create collections automatically when first document is inserted
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
};

module.exports = {
  connectDB,
  testConnection,
  initializeDatabase
};