/**
 * Companio Phase 10: Operational Alerting Engine
 * Evaluates operational conditions and dispatches alerts for infrastructure degradation,
 * clinical safety outbox backlogs, and external provider failures.
 */
import { EventEmitter } from 'events';
import logger from '../../utils/logger.js';
import metricsRegistry from './metricsRegistry.js';
import { checkRedisHealth } from '../../jobs/redisConnection.js';
import { checkDatabaseHealth } from '../../config/db.js';
import { EscalationEvent } from '../../models/index.js';

class AlertEngine extends EventEmitter {
  constructor() {
    super();
    this.activeAlerts = new Map(); // ruleName -> AlertRecord
    this.alertHistory = [];
    this.webhookUrl = process.env.ALERT_WEBHOOK_URL || null;
  }

  /**
   * Fires or clears an alert based on a rule condition.
   *
   * @param {string} rule
   * @param {string} severity 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
   * @param {string} message
   * @param {boolean} isConditionBreached
   * @param {object} [metadata]
   */
  processRule(rule, severity, message, isConditionBreached, metadata = {}) {
    if (isConditionBreached) {
      if (!this.activeAlerts.has(rule)) {
        const alertRecord = {
          rule,
          severity,
          message,
          metadata,
          firedAt: new Date().toISOString(),
          status: 'FIRING',
        };

        this.activeAlerts.set(rule, alertRecord);
        this.alertHistory.unshift(alertRecord);
        if (this.alertHistory.length > 100) this.alertHistory.pop();

        metricsRegistry.alertsFiredTotal.inc(1, { rule, severity });

        logger.error(`🚨 [OPERATIONAL ALERT:${severity}] ${rule}: ${message}`, {
          rule,
          severity,
          ...metadata,
        });

        this.emit('alert_fired', alertRecord);
        this._dispatchWebhook(alertRecord);
      }
    } else {
      if (this.activeAlerts.has(rule)) {
        const resolved = this.activeAlerts.get(rule);
        this.activeAlerts.delete(rule);

        logger.info(`✔ [ALERT RESOLVED] ${rule}: Condition returned to normal.`, {
          rule,
          firedAt: resolved.firedAt,
          resolvedAt: new Date().toISOString(),
        });

        this.emit('alert_resolved', { ...resolved, status: 'RESOLVED', resolvedAt: new Date().toISOString() });
      }
    }
  }

  /**
   * Evaluates all core system rules against current infrastructure state.
   * @returns {Promise<Array<object>>} List of active firing alerts
   */
  async evaluateAllRules() {
    const [dbHealth, redisHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    // Rule 1: Database Connectivity
    this.processRule(
      'DATABASE_DISCONNECTED',
      'CRITICAL',
      `MongoDB database is unreachable (State: ${dbHealth.statusString})`,
      !dbHealth.connected,
      { host: dbHealth.host }
    );

    // Rule 2: Redis Broker Degradation in Production
    const isProduction = process.env.NODE_ENV === 'production';
    const isRedisDegraded = redisHealth.status === 'DEGRADED' || (!redisHealth.connected && isProduction && !redisHealth.isFallback);
    this.processRule(
      'REDIS_DEGRADED',
      'CRITICAL',
      `Redis message broker is offline or degraded (${redisHealth.lastError || redisHealth.status})`,
      isRedisDegraded,
      { status: redisHealth.status, mode: redisHealth.mode }
    );

    // Rule 3: Clinical Outbox Backlog Accumulation
    let pendingOutbox = 0;
    try {
      if (dbHealth.connected) {
        pendingOutbox = await EscalationEvent.countDocuments({
          status: { $in: ['QUEUED', 'RETRY_PENDING'] },
        });
      }
    } catch {}

    metricsRegistry.outboxBacklogTotal.set(pendingOutbox, { status: 'PENDING', tier: 'ALL' });

    this.processRule(
      'OUTBOX_BACKLOG_HIGH',
      'HIGH',
      `Clinical escalation outbox has accumulated ${pendingOutbox} pending events (> 5 threshold)`,
      pendingOutbox > 5,
      { pendingOutbox }
    );

    return Array.from(this.activeAlerts.values());
  }

  /**
   * Dispatches alert notification via webhook if configured.
   */
  async _dispatchWebhook(alertRecord) {
    if (!this.webhookUrl) return;

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'Companio Operational Telemetry',
          ...alertRecord,
        }),
      });
    } catch (err) {
      logger.warn(`[AlertEngine] Webhook delivery failed: ${err.message}`);
    }
  }

  /**
   * Returns list of currently firing alerts.
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Returns recent alert history.
   */
  getAlertHistory() {
    return this.alertHistory;
  }
}

export const alertEngine = new AlertEngine();
export default alertEngine;
