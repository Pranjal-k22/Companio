import Redis from 'ioredis';
import logger from '../utils/logger.js';

let sharedRedisClient = null;
let connectionStatus = 'UNINITIALIZED';
let isFallbackMode = false;
let lastError = null;

/**
 * Determines whether in-memory fallback is permitted in the current environment.
 * CRITICAL SAFETY GUARD: In production (NODE_ENV === 'production'), in-memory
 * fallback is strictly forbidden unless explicitly enabled by ALLOW_IN_MEMORY_FALLBACK=true.
 * Ephemeral in-memory queues vanish on restart and must NEVER silently drop critical clinical alerts.
 */
export function isFallbackPermitted() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    return process.env.ALLOW_IN_MEMORY_FALLBACK === 'true';
  }
  return true;
}

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
          // After 3 attempts, avoid spamming logs and allow fallback mode if permitted
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
  const fallbackAllowed = isFallbackPermitted();

  if (config.forceFallback) {
    if (!fallbackAllowed) {
      logger.error('[Redis:SECURITY] Force fallback requested in production without ALLOW_IN_MEMORY_FALLBACK=true. Queue system marked DEGRADED.');
      isFallbackMode = false;
      connectionStatus = 'DEGRADED';
      lastError = 'In-memory fallback forbidden in production';
      return { isFallback: false, client: null, status: connectionStatus, error: lastError };
    }
    logger.info('[Redis] Force fallback configured via REDIS_FALLBACK=true.');
    isFallbackMode = true;
    connectionStatus = 'FALLBACK';
    return { isFallback: true, client: null, status: connectionStatus };
  }

  connectionStatus = 'CONNECTING';
  let client = null;

  try {
    client = createRedisConnection();
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
    logger.info('[Redis] Successfully connected to live Redis instance at ' + config.redisUrl);

    return { isFallback: false, client: sharedRedisClient, status: connectionStatus };
  } catch (err) {
    if (client) {
      try {
        client.disconnect();
      } catch {}
    }
    lastError = err.message;
    if (!fallbackAllowed) {
      connectionStatus = 'DEGRADED';
      isFallbackMode = false;
      sharedRedisClient = null;
      logger.error(`[Redis:CRITICAL] Live Redis unavailable in production (${err.message}). Ephemeral fallback prohibited. Critical events remain safely in MongoDB durable outbox.`);
      return { isFallback: false, client: null, status: connectionStatus, error: err.message };
    }

    connectionStatus = 'FALLBACK';
    isFallbackMode = true;
    logger.warn('[Redis] Live Redis unavailable (' + err.message + '). Activating resilient in-memory fallback queue engine for dev/test.');

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
 * Returns current Redis connection status ('CONNECTED' | 'FALLBACK' | 'DEGRADED' | 'DISCONNECTED' | 'CONNECTING')
 */
export function getConnectionStatus() {
  return connectionStatus;
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
  const fallbackAllowed = isFallbackPermitted();

  if (connectionStatus === 'DEGRADED' || (!sharedRedisClient && !isFallbackMode)) {
    return {
      status: 'DEGRADED',
      connected: false,
      isFallback: false,
      mode: 'DEGRADED_OUTBOX_PRESERVED',
      targetUrl: config.redisUrl,
      lastError: lastError || 'Live Redis unreachable in production. Ephemeral fallback prohibited.',
      checkedAt: new Date().toISOString(),
    };
  }

  if (isFallbackMode || !sharedRedisClient) {
    return {
      status: fallbackAllowed ? 'FALLBACK_ACTIVE' : 'DEGRADED',
      connected: false,
      isFallback: fallbackAllowed,
      mode: fallbackAllowed ? 'IN_MEMORY_RESILIENT' : 'DEGRADED_OUTBOX_PRESERVED',
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
      isFallback: isFallbackMode,
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
  isFallbackPermitted,
  getRedisConfig,
  createRedisConnection,
  initRedisConnection,
  isInFallbackMode,
  getConnectionStatus,
  setFallbackMode,
  checkRedisHealth,
  closeRedisConnections,
};

