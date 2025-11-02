const mongoose = require('mongoose');
const Property = require('./models/Property');
const User = require('./models/User');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ninety-nine-acres');
    console.log('✅ Connected to MongoDB');
    
    // Check properties count
    const propertyCount = await Property.countDocuments();
    console.log(`📊 Total properties in database: ${propertyCount}`);
    
    // Check users count
    const userCount = await User.countDocuments();
    console.log(`👥 Total users in database: ${userCount}`);
    
    // List some properties
    if (propertyCount > 0) {
      console.log('\n📋 Sample properties:');
      const properties = await Property.find().limit(5).select('_id title type status');
      properties.forEach(prop => {
        console.log(`  - ${prop._id}: ${prop.title} (${prop.type}, ${prop.status})`);
      });
    } else {
      console.log('\n⚠️  No properties found in database');
      console.log('💡 Run: node add-sample-properties.js to add sample data');
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
};

connectDB();