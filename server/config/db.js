const mongoose = require('mongoose');

let isInMemoryFallback = false;

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  // 1. Try configured MongoDB Atlas Cluster URI
  if (mongoURI) {
    try {
      console.log('Connecting to MongoDB Atlas Cloud Cluster...');
      const conn = await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 15000, // 15s timeout for cloud SSL handshake
      });
      console.log(`🎉 MongoDB Atlas Cloud Connected: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.warn(`⚠️ Atlas Cloud MongoDB connection failed: ${err.message}. Trying local MongoDB fallback...`);
    }
  }

  // 2. Try default local MongoDB daemon
  try {
    const localUri = 'mongodb://127.0.0.1:27017/keltron_mpp_ems';
    const conn = await mongoose.connect(localUri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`✅ Local MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (localErr) {
    console.warn(`⚠️ Local MongoDB daemon not running. Initializing MongoMemoryServer...`);
  }

  // 3. Try In-Memory Mongo Server
  try {
    isInMemoryFallback = true;
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const memoryUri = mongoServer.getUri();
    const conn = await mongoose.connect(memoryUri);
    console.log(`✅ MongoMemoryServer running at: ${memoryUri}`);
    return conn;
  } catch (memErr) {
    console.error('In-memory database error:', memErr.message);
    throw memErr;
  }
};

const getDBStatus = () => ({
  connected: mongoose.connection.readyState === 1,
  host: mongoose.connection.host || 'Memory Store / Atlas Cluster',
  isInMemoryFallback
});

module.exports = { connectDB, getDBStatus };
