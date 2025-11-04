const mongoose = require('mongoose');
require('dotenv').config();

// Simple connection test with minimal configuration
const quickConnect = async () => {
  try {
    console.log('🚀 Quick MongoDB Connection Test');
    
    // Use the most basic connection options
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      connectTimeoutMS: 10000,
    };
    
    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ Quick connection successful!');
    
    // Test basic operations
    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.ping();
    console.log('🏓 Database ping successful:', result);
    
    return true;
  } catch (error) {
    console.error('❌ Quick connection failed:', error.message);
    return false;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected');
    }
  }
};

quickConnect();
