/**
 * Companio Phase 10: Prometheus-Compatible Metrics Registry
 * Tracks application performance, queues, voice pipelines, and operational telemetry.
 * Strictly HIPAA-compliant: NEVER records PHI, patient names, DOBs, or transcripts in labels.
 */

class Counter {
  constructor(name, help, labelNames = []) {
    this.name = name;
    this.help = help;
    this.labelNames = labelNames;
    this.values = new Map(); // labelKey -> number
  }

  _getKey(labels = {}) {
    return this.labelNames.map((l) => labels[l] || '').join('|');
  }

  inc(amount = 1, labels = {}) {
    const key = this._getKey(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + amount);
  }

  get(labels = {}) {
    return this.values.get(this._getKey(labels)) || 0;
  }

  toPrometheus() {
    let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} counter\n`;
    if (this.values.size === 0) {
      out += `${this.name} 0\n`;
      return out;
    }
    for (const [key, val] of this.values.entries()) {
      const parts = key.split('|');
      const labelStr = this.labelNames
        .map((name, i) => `${name}="${parts[i] || ''}"`)
        .join(',');
      out += `${this.name}{${labelStr}} ${val}\n`;
    }
    return out;
  }
}

class Gauge {
  constructor(name, help, labelNames = []) {
    this.name = name;
    this.help = help;
    this.labelNames = labelNames;
    this.values = new Map();
  }

  _getKey(labels = {}) {
    return this.labelNames.map((l) => labels[l] || '').join('|');
  }

  set(val, labels = {}) {
    this.values.set(this._getKey(labels), val);
  }

  get(labels = {}) {
    return this.values.get(this._getKey(labels)) || 0;
  }

  toPrometheus() {
    let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} gauge\n`;
    if (this.values.size === 0) {
      out += `${this.name} 0\n`;
      return out;
    }
    for (const [key, val] of this.values.entries()) {
      const parts = key.split('|');
      const labelStr = this.labelNames.length > 0
        ? `{${this.labelNames.map((name, i) => `${name}="${parts[i] || ''}"`).join(',')}}`
        : '';
      out += `${this.name}${labelStr} ${val}\n`;
    }
    return out;
  }
}

class Histogram {
  constructor(name, help, labelNames = [], buckets = [10, 50, 100, 250, 500, 1000, 2500, 5000]) {
    this.name = name;
    this.help = help;
    this.labelNames = labelNames;
    this.buckets = buckets.sort((a, b) => a - b);
    this.entries = new Map(); // labelKey -> { count, sum, bucketCounts }
  }

  _getKey(labels = {}) {
    return this.labelNames.map((l) => labels[l] || '').join('|');
  }

  observe(val, labels = {}) {
    const key = this._getKey(labels);
    let entry = this.entries.get(key);
    if (!entry) {
      entry = {
        count: 0,
        sum: 0,
        bucketCounts: new Array(this.buckets.length).fill(0),
      };
      this.entries.set(key, entry);
    }

    entry.count += 1;
    entry.sum += val;

    for (let i = 0; i < this.buckets.length; i++) {
      if (val <= this.buckets[i]) {
        entry.bucketCounts[i] += 1;
      }
    }
  }

  toPrometheus() {
    let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} histogram\n`;
    for (const [key, entry] of this.entries.entries()) {
      const parts = key.split('|');
      const baseLabels = this.labelNames
        .map((name, i) => `${name}="${parts[i] || ''}"`)
        .join(',');
      const prefix = baseLabels ? `${baseLabels},` : '';

      let cumulative = 0;
      for (let i = 0; i < this.buckets.length; i++) {
        cumulative += entry.bucketCounts[i];
        out += `${this.name}_bucket{${prefix}le="${this.buckets[i]}"} ${cumulative}\n`;
      }
      out += `${this.name}_bucket{${prefix}le="+Inf"} ${entry.count}\n`;
      out += `${this.name}_sum{${baseLabels}} ${entry.sum}\n`;
      out += `${this.name}_count{${baseLabels}} ${entry.count}\n`;
    }
    return out;
  }
}

class MetricsRegistry {
  constructor() {
    // 1. HTTP API Metrics
    this.httpRequestsTotal = new Counter(
      'companio_http_requests_total',
      'Total HTTP requests processed by endpoint and status',
      ['method', 'route', 'status']
    );
    this.httpRequestDurationMs = new Histogram(
      'companio_http_request_duration_ms',
      'HTTP request latency distribution in milliseconds',
      ['method', 'route']
    );
    this.httpErrorsTotal = new Counter(
      'companio_http_errors_total',
      'Total HTTP error responses (4xx and 5xx)',
      ['method', 'route', 'status']
    );

    // 2. Auth & Access Security
    this.authFailuresTotal = new Counter(
      'companio_auth_failures_total',
      'Total authentication and authorization failures',
      ['reason']
    );

    // 3. Infrastructure & Dependencies
    this.databaseStatus = new Gauge(
      'companio_database_connection_status',
      'Database connection health (1=connected, 0=disconnected)',
      ['database']
    );
    this.databaseLatencyMs = new Gauge(
      'companio_database_ping_latency_ms',
      'Database ping latency in milliseconds'
    );
    this.redisStatus = new Gauge(
      'companio_redis_connection_status',
      'Redis broker health (1=healthy, 0=degraded/offline)',
      ['mode']
    );
    this.redisLatencyMs = new Gauge(
      'companio_redis_ping_latency_ms',
      'Redis round-trip ping latency in milliseconds'
    );

    // 4. Voice Gateway & Audio Protocol
    this.voiceSessionsActive = new Gauge(
      'companio_voice_sessions_active',
      'Current active concurrent real-time voice sessions'
    );
    this.voiceSessionFailuresTotal = new Counter(
      'companio_voice_session_failures_total',
      'Voice session errors and early terminations',
      ['reason']
    );
    this.voiceBargeInInterruptionsTotal = new Counter(
      'companio_voice_bargein_interruptions_total',
      'Total voice barge-in speech interruptions triggered by patients'
    );

    // 5. External AI & Notification Providers
    this.providerErrorsTotal = new Counter(
      'companio_provider_errors_total',
      'External provider errors (rate limits, timeouts, failures)',
      ['provider', 'type']
    );

    // 6. Background Queue Depth & Worker Telemetry
    this.queueJobsWaiting = new Gauge(
      'companio_queue_jobs_waiting',
      'Number of jobs waiting to be processed in queue',
      ['queue']
    );
    this.queueJobsActive = new Gauge(
      'companio_queue_jobs_active',
      'Number of jobs actively being executed by workers',
      ['queue']
    );
    this.queueJobsFailed = new Gauge(
      'companio_queue_jobs_failed',
      'Number of failed dead-letter jobs in queue',
      ['queue']
    );
    this.queueWorkersActive = new Gauge(
      'companio_queue_workers_active',
      'Number of active workers attached to queue',
      ['queue']
    );

    // 7. Clinical Outbox & Safety Net
    this.outboxBacklogTotal = new Gauge(
      'companio_outbox_backlog_total',
      'Number of pending escalation events in durable MongoDB outbox',
      ['status', 'tier']
    );
    this.escalationsTriggeredTotal = new Counter(
      'companio_clinical_escalations_total',
      'Total clinical escalation alerts triggered by severity tier',
      ['tier', 'channel']
    );
    this.escalationFailuresTotal = new Counter(
      'companio_clinical_escalation_failures_total',
      'Clinical escalation notifications that exhausted all delivery attempts',
      ['tier', 'channel']
    );

    // 8. Alerts
    this.alertsFiredTotal = new Counter(
      'companio_alerts_fired_total',
      'Operational alerts triggered by rule and severity',
      ['rule', 'severity']
    );
  }

  /**
   * Generates standard Prometheus OpenMetrics text format string.
   * @returns {string}
   */
  toPrometheusText() {
    const metrics = [
      this.httpRequestsTotal,
      this.httpRequestDurationMs,
      this.httpErrorsTotal,
      this.authFailuresTotal,
      this.databaseStatus,
      this.databaseLatencyMs,
      this.redisStatus,
      this.redisLatencyMs,
      this.voiceSessionsActive,
      this.voiceSessionFailuresTotal,
      this.voiceBargeInInterruptionsTotal,
      this.providerErrorsTotal,
      this.queueJobsWaiting,
      this.queueJobsActive,
      this.queueJobsFailed,
      this.queueWorkersActive,
      this.outboxBacklogTotal,
      this.escalationsTriggeredTotal,
      this.escalationFailuresTotal,
      this.alertsFiredTotal,
    ];

    let output = '';
    for (const metric of metrics) {
      output += metric.toPrometheus() + '\n';
    }
    return output;
  }
}

export const metricsRegistry = new MetricsRegistry();
export default metricsRegistry;
