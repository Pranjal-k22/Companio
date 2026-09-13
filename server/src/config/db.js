import mongoose from 'mongoose';

/**
 * Connect to MongoDB instance using Mongoose
 */
export const connectDB = async () => {
  const connUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';
  
  try {
    const conn = await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: 3000, // Timeout after 3s if MongoDB isn't running locally
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host} / ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn(`[Database Warning] Mongoose connection deferred (${error.message}). Server will remain active.`);
  }
};

