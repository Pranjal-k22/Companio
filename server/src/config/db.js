import mongoose from 'mongoose';

/**
 * Connect to MongoDB instance using Mongoose
 */
export const connectDB = async () => {
  const connUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/companio';
  
  try {
    const conn = await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: 3000, // Timeout after 3s if MongoDB isn't running locally
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '50', 10),
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5', 10),
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host} / ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn(`[Database Warning] Mongoose connection deferred (${error.message}). Server will remain active.`);
  }
};

const DB_STATUS_MAP = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/**
 * Performs a comprehensive database health and ping latency check.
 * @returns {Promise<object>}
 */
export async function checkDatabaseHealth() {
  const readyState = mongoose.connection.readyState;
  const statusStr = DB_STATUS_MAP[readyState] || 'unknown';

  if (readyState !== 1) {
    return {
      status: readyState === 2 ? 'CONNECTING' : 'DISCONNECTED',
      connected: false,
      readyState,
      statusString: statusStr,
      host: mongoose.connection.host || 'unknown',
      database: mongoose.connection.name || 'unknown',
      checkedAt: new Date().toISOString(),
    };
  }

  const start = Date.now();
  try {
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
    }
    const latencyMs = Date.now() - start;

    return {
      status: 'HEALTHY',
      connected: true,
      readyState: 1,
      statusString: 'connected',
      latencyMs,
      host: mongoose.connection.host,
      database: mongoose.connection.name,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: 'DEGRADED',
      connected: false,
      readyState: 1,
      error: err.message,
      checkedAt: new Date().toISOString(),
    };
  }
}

export default {
  connectDB,
  checkDatabaseHealth,
};

