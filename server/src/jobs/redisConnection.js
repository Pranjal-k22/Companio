import Redis from 'ioredis';
import logger from '../utils/logger.js';

let sharedRedisClient = null;
let connectionStatus = 'UNINITIALIZED';
let isFallbackMode = false;
let lastError = null;

/**
 * Returns connection configuration options for ioredis and BullMQ.
 * BullMQ requires maxRetriesPerRequest to be null on Redis clients.
 */
export function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const forceFallback = process.env.REDIS_FALLBACK === 'true';

  return {
    redisUrl,
    forceFallback,
    options: {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times > 3) {
          // After 3 attempts, avoid spamming logs and allow fallback mode
          return null;
        }
        return Math.min(times * 500, 2000);
      },
      lazyConnect: true,
    },
  };
}

/**
 * Creates a new dedicated Redis connection (for workers or pub/sub).
 * @param {object} [customOptions]
 * @returns {Redis}
 */
export function createRedisConnection(customOptions = {}) {
  const config = getRedisConfig();
  const client = new Redis(config.redisUrl, {
    ...config.options,
    ...customOptions,
  });

  client.on('error', (err) => {
    lastError = err.message;
    if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) {
      logger.warn('[Redis] Connection refused. Operating with resilience.', { host: config.redisUrl });
    } else {
      logger.warn('[Redis] Connection error:', { error: err.message });
    }
  });

  return client;
}

/**
 * Initializes and verifies the shared Redis client.
 * If Redis is not reachable or REDIS_FALLBACK=true, seamlessly flags fallback mode.
 *
 * @returns {Promise<{ isFallback: boolean, client: Redis|null, status: string }>}
 */
export async function initRedisConnection() {
  const config = getRedisConfig();

  if (config.forceFallback) {
    logger.info('[Redis] Force fallback configured via REDIS_FALLBACK=true.');
    isFallbackMode = true;
    connectionStatus = 'FALLBACK';
    return { isFallback: true, client: null, status: connectionStatus };
  }

  connectionStatus = 'CONNECTING';

  try {
    const client = createRedisConnection();
    // Test connection with timeout
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis connection timeout (2000ms)')), 2000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    await client.ping();

    sharedRedisClient = client;
    connectionStatus = 'CONNECTED';
    isFallbackMode = false;
    logger.info('[Redis] Successfully connected to Redis instance at ' + config.redisUrl);

    return { isFallback: false, client: sharedRedisClient, status: connectionStatus };
  } catch (err) {
    lastError = err.message;
    connectionStatus = 'FALLBACK';
    isFallbackMode = true;
    logger.warn('[Redis] Live Redis unavailable (' + err.message + '). Activating resilient in-memory fallback queue engine.');

    return { isFallback: true, client: null, status: connectionStatus };
  }
}

/**
 * Returns whether the system is currently running in fallback queue mode.
 */
export function isInFallbackMode() {
  return isFallbackMode;
}

/**
 * Manually forces fallback mode (used during testing).
 * @param {boolean} fallback
 */
export function setFallbackMode(fallback) {
  isFallbackMode = fallback;
  connectionStatus = fallback ? 'FALLBACK' : 'CONNECTED';
}

/**
 * Performs a health and latency check on the Redis connection.
 * @returns {Promise<object>}
 */
export async function checkRedisHealth() {
  const startTime = Date.now();
  const config = getRedisConfig();

  if (isFallbackMode || !sharedRedisClient) {
    return {
      status: 'FALLBACK_ACTIVE',
      connected: false,
      isFallback: true,
      mode: 'IN_MEMORY_RESILIENT',
      targetUrl: config.redisUrl,
      lastError: lastError || 'Redis not connected or fallback forced',
      checkedAt: new Date().toISOString(),
    };
  }

  try {
    const pong = await sharedRedisClient.ping();
    const latencyMs = Date.now() - startTime;

    return {
      status: 'HEALTHY',
      connected: pong === 'PONG',
      isFallback: false,
      mode: 'DISTRIBUTED_REDIS',
      targetUrl: config.redisUrl,
      latencyMs,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: 'DEGRADED',
      connected: false,
      isFallback: true,
      lastError: err.message,
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * Gracefully terminates the shared Redis client.
 */
export async function closeRedisConnections() {
  if (sharedRedisClient) {
    try {
      await sharedRedisClient.quit();
    } catch {
      sharedRedisClient.disconnect();
    }
    sharedRedisClient = null;
  }
  connectionStatus = 'DISCONNECTED';
}

export default {
  getRedisConfig,
  createRedisConnection,
  initRedisConnection,
  isInFallbackMode,
  setFallbackMode,
  checkRedisHealth,
  closeRedisConnections,
};
