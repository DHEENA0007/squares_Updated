const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  console.log('🧪 Testing MongoDB Connection');
  console.log('================================');
  
  try {
    console.log('🔍 Checking environment variables...');
    console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? 'Set' : 'Not set'}`);
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }
    
    // Parse the MongoDB URI to check components
    const uri = process.env.MONGODB_URI;
    const uriParts = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)/);
    
    if (uriParts) {
      console.log('🔗 MongoDB URI Components:');
      console.log(`   Username: ${uriParts[1]}`);
      console.log(`   Password: ${'*'.repeat(uriParts[2].length)}`);
      console.log(`   Host: ${uriParts[3]}`);
      console.log(`   Database: ${uriParts[4]}`);
    } else {
      console.log('⚠️  Could not parse MongoDB URI');
    }
    
    console.log('\n🔄 Attempting connection...');
    
    const options = {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
    };
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log('✅ Connection successful!');
    console.log(`🏠 Host: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔌 Ready State: ${conn.connection.readyState}`);
    
    // Test a simple operation
    console.log('\n🧪 Testing database operations...');
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`📁 Collections found: ${collections.length}`);
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    
    if (error.name === 'MongooseServerSelectionError') {
      console.error('\n🔍 Troubleshooting Server Selection Error:');
      console.error('   1. Check internet connectivity');
      console.error('   2. Verify MongoDB Atlas cluster is running');
      console.error('   3. Check IP whitelist in MongoDB Atlas Network Access');
      console.error('   4. Verify username/password in connection string');
      console.error('   5. Try connecting from MongoDB Compass with the same URI');
    }
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n🌐 DNS Resolution Error:');
      console.error('   - Cannot resolve MongoDB Atlas hostname');
      console.error('   - Check DNS settings or try different network');
    }
    
    console.error('\n📝 Error Details:');
    console.error(`   Name: ${error.name}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Reason: ${error.reason?.type || 'Unknown'}`);
    
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 Connection closed');
    }
    process.exit(0);
  }
};

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

testConnection();
