import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

const dbStatusMap = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/**
 * @route   GET /api/v1/health (or /api/health)
 * @desc    Health check endpoint returning system, uptime, & DB connectivity status
 * @access  Public
 */
router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isConnected = dbState === 1;

  res.status(200).json({
    status: isConnected ? 'ok' : 'degraded',
    service: 'Companio Voice Agent API',
    version: '1.0.0',
    apiNamespace: '/api/v1',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    requestId: req.id || req.headers['x-request-id'] || undefined,
    database: {
      status: dbStatusMap[dbState] || 'unknown',
      readyState: dbState,
    },
  });
});

/**
 * @route   GET /api/v1/health/live
 * @desc    Liveness probe: verifies Express event loop is operational
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
 * @desc    Readiness probe: verifies all critical database dependencies are connected
 * @access  Public
 */
router.get('/ready', (req, res) => {
  const dbState = mongoose.connection.readyState;
  if (dbState !== 1) {
    return res.status(503).json({
      status: 'unready',
      error: 'Database connection is not ready.',
      databaseStatus: dbStatusMap[dbState] || 'unknown',
    });
  }

  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    database: 'connected',
  });
});

export default router;
