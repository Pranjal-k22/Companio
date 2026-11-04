import express from 'express';
import mongoose from 'mongoose';
import { checkDatabaseHealth } from '../config/db.js';
import { checkRedisHealth, isFallbackPermitted, getConnectionStatus } from '../jobs/redisConnection.js';
import { getQueueHealth } from '../jobs/queueManager.js';
import { EscalationEvent } from '../models/index.js';

const router = express.Router();

/**
 * @route   GET /api/v1/health (or /api/health)
 * @desc    Comprehensive system health, dependencies, and memory telemetry
 * @access  Public
 */
router.get('/', async (req, res) => {
  const [dbHealth, redisHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
  ]);

  let outboxPendingCount = 0;
  try {
    if (mongoose.connection.readyState === 1) {
      outboxPendingCount = await EscalationEvent.countDocuments({ status: { $in: ['QUEUED', 'RETRY_PENDING'] } });
    }
  } catch {}

  const mem = process.memoryUsage();
  const isHealthy = dbHealth.connected && (redisHealth.connected || redisHealth.isFallback);

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'Companio Voice Agent & Operations Platform',
    version: '1.0.0',
    apiNamespace: '/api/v1',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    requestId: req.id || req.headers['x-request-id'] || undefined,
    dependencies: {
      database: dbHealth,
      redis: redisHealth,
      outboxBacklog: {
        pendingEvents: outboxPendingCount,
      },
    },
    system: {
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      rssMb: Math.round(mem.rss / 1024 / 1024),
      nodeVersion: process.version,
    },
  });
});

/**
 * @route   GET /api/v1/health/live
 * @desc    Kubernetes liveness probe: verifies process event loop is responsive
 * @access  Public
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'live',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

/**
 * @route   GET /api/v1/health/ready
 * @desc    Kubernetes readiness probe: verifies database & queue connectivity for accepting traffic
 * @access  Public
 */
router.get('/ready', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const redisHealth = await checkRedisHealth();

  const isProduction = process.env.NODE_ENV === 'production';
  const fallbackAllowed = isFallbackPermitted();

  // In production, both MongoDB and Redis must be operational (unless explicit fallback override)
  const isDbReady = dbHealth.connected;
  const isRedisReady = redisHealth.connected || (fallbackAllowed && redisHealth.isFallback);

  if (!isDbReady || (!isRedisReady && isProduction)) {
    return res.status(503).json({
      status: 'unready',
      timestamp: new Date().toISOString(),
      databaseReady: isDbReady,
      redisReady: isRedisReady,
      databaseError: dbHealth.error,
      redisStatus: redisHealth.status,
    });
  }

  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    database: dbHealth.status,
    redis: redisHealth.status,
    mode: redisHealth.mode,
  });
});

/**
 * @route   GET /api/v1/health/startup
 * @desc    Kubernetes startup probe: verifies application has finished bootstrapping
 * @access  Public
 */
router.get('/startup', async (req, res) => {
  const readyState = mongoose.connection.readyState;
  if (readyState !== 1) {
    return res.status(503).json({
      status: 'starting',
      timestamp: new Date().toISOString(),
      stage: 'DATABASE_CONNECTING',
    });
  }

  res.status(200).json({
    status: 'started',
    timestamp: new Date().toISOString(),
    stage: 'BOOTSTRAP_COMPLETE',
  });
});

export default router;
