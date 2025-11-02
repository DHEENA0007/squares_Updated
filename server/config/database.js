const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Connection options for production stability
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
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