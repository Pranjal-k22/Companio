/**
 * Companio Phase 10: Prometheus Metrics & Operational Telemetry Endpoints
 * Exposes /metrics in standard OpenMetrics/Prometheus exposition format
 * and provides operational alert endpoints.
 */
import express from 'express';
import metricsRegistry from '../services/telemetry/metricsRegistry.js';
import alertEngine from '../services/telemetry/alertEngine.js';
import { checkDatabaseHealth } from '../config/db.js';
import { checkRedisHealth } from '../jobs/redisConnection.js';
import { getQueueHealth } from '../jobs/queueManager.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

/**
 * Updates dynamic gauges immediately prior to rendering Prometheus metrics.
 */
async function syncDynamicMetrics() {
  try {
    const [dbHealth, redisHealth, queueHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
      getQueueHealth().catch(() => ({ queues: {} })),
    ]);

    // Database Telemetry
    metricsRegistry.databaseStatus.set(dbHealth.connected ? 1 : 0, { database: dbHealth.database || 'companio' });
    if (typeof dbHealth.latencyMs === 'number') {
      metricsRegistry.databaseLatencyMs.set(dbHealth.latencyMs);
    }

    // Redis Telemetry
    metricsRegistry.redisStatus.set(redisHealth.connected ? 1 : 0, { mode: redisHealth.mode || 'UNKNOWN' });
    if (typeof redisHealth.latencyMs === 'number') {
      metricsRegistry.redisLatencyMs.set(redisHealth.latencyMs);
    }

    // Background Queue Telemetry
    if (queueHealth.queues) {
      for (const [qName, qData] of Object.entries(queueHealth.queues)) {
        if (typeof qData.waiting === 'number') {
          metricsRegistry.queueJobsWaiting.set(qData.waiting, { queue: qName });
          metricsRegistry.queueJobsActive.set(qData.active, { queue: qName });
          metricsRegistry.queueJobsFailed.set(qData.failed, { queue: qName });
          metricsRegistry.queueWorkersActive.set(qData.workersActive, { queue: qName });
        }
      }
    }
  } catch (err) {
    // Non-fatal sync error; continue serving cached metrics
  }
}

/**
 * @route   GET /metrics (and /api/v1/admin/metrics)
 * @desc    Prometheus OpenMetrics text exposition format
 * @access  Protected in production; accessible to scrapers via bearer or internal network
 */
router.get('/', async (req, res) => {
  await syncDynamicMetrics();
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metricsRegistry.toPrometheusText());
});

/**
 * @route   GET /api/v1/admin/alerts
 * @desc    Returns active firing alerts and recent operational alert history
 * @access  Clinician / Admin
 */
router.get('/alerts', verifyToken, requireRole('CLINICIAN', 'ADMIN'), (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      activeAlerts: alertEngine.getActiveAlerts(),
      history: alertEngine.getAlertHistory(),
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * @route   POST /api/v1/admin/alerts/evaluate
 * @desc    Manually triggers evaluation of all operational alert rules
 * @access  Clinician / Admin
 */
router.post('/alerts/evaluate', verifyToken, requireRole('CLINICIAN', 'ADMIN'), async (req, res) => {
  const activeAlerts = await alertEngine.evaluateAllRules();
  res.status(200).json({
    success: true,
    data: {
      firingCount: activeAlerts.length,
      activeAlerts,
      evaluatedAt: new Date().toISOString(),
    },
  });
});

export default router;
