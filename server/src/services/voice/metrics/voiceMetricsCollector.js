export class VoiceMetricsCollector {
  constructor() {
    this.latencies = {
      sttConnectionMs: [],
      speechFinalizationMs: [],
      geminiResponseStartMs: [],
      ttsFirstAudioMs: [],
      completeTurnDurationMs: [],
      interruptionResponseMs: [],
    };

    this.counters = {
      sessionsStarted: 0,
      sessionsCompleted: 0,
      sessionsAborted: 0,
      sessionsFailed: 0,
      sessionsRecovered: 0,
      recoveryAttempts: 0,
      audioFramesReceived: 0,
      audioFramesDropped: 0,
      audioFramesDuplicate: 0,
      bargeInEvents: 0,
      sttErrors: 0,
      geminiErrors: 0,
      ttsErrors: 0,
    };
  }

  recordLatency(metricName, valueMs) {
    if (typeof valueMs === 'number' && !isNaN(valueMs) && valueMs >= 0) {
      let key = metricName;
      if (metricName === 'geminiResponseMs') key = 'geminiResponseStartMs';
      if (metricName === 'sttConnectMs') key = 'sttConnectionMs';

      if (this.latencies[key]) {
        this.latencies[key].push(valueMs);
        // Bound memory usage to last 1000 measurements per metric
        if (this.latencies[key].length > 1000) {
          this.latencies[key].shift();
        }
      }
    }
  }

  recordTurnDuration(durationMs) {
    this.recordLatency('completeTurnDurationMs', durationMs);
  }

  recordDuplicateFrame() {
    this.increment('audioFramesDuplicate');
  }

  recordDroppedFrame() {
    this.increment('audioFramesDropped');
  }

  getSummaryReport() {
    const summary = this.getMetricsSummary();
    return {
      ...summary,
      metrics: {
        ...summary.latencies,
        geminiResponseMs: summary.latencies.geminiResponseStartMs,
        sttConnectMs: summary.latencies.sttConnectionMs,
      },
    };
  }

  increment(counterName, amount = 1) {
    if (typeof this.counters[counterName] === 'number') {
      this.counters[counterName] += amount;
    }
  }

  _calculatePercentiles(samples = []) {
    if (!samples || samples.length === 0) {
      return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, count: 0 };
    }
    const sorted = [...samples].sort((a, b) => a - b);
    const getP = (p) => {
      const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
      return sorted[idx];
    };

    return {
      p50: getP(50),
      p95: getP(95),
      p99: getP(99),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: sorted.length,
    };
  }

  getMetricsSummary() {
    const latenciesSummary = {};
    for (const [key, samples] of Object.entries(this.latencies)) {
      latenciesSummary[key] = this._calculatePercentiles(samples);
    }

    const totalSessions = this.counters.sessionsStarted || 1;
    const completionRate = Math.round((this.counters.sessionsCompleted / totalSessions) * 100);
    const recoverySuccessRate = this.counters.recoveryAttempts > 0
      ? Math.round((this.counters.sessionsRecovered / this.counters.recoveryAttempts) * 100)
      : 100;

    const totalFrames = this.counters.audioFramesReceived + this.counters.audioFramesDropped || 1;
    const frameLossRate = parseFloat(((this.counters.audioFramesDropped / totalFrames) * 100).toFixed(2));
    const duplicateFrameRate = parseFloat(((this.counters.audioFramesDuplicate / totalFrames) * 100).toFixed(2));

    return {
      timestamp: new Date().toISOString(),
      counters: { ...this.counters },
      rates: {
        completionRatePct: completionRate,
        recoverySuccessRatePct: recoverySuccessRate,
        frameLossRatePct: frameLossRate,
        duplicateFrameRatePct: duplicateFrameRate,
      },
      latencies: latenciesSummary,
    };
  }

  reset() {
    for (const key of Object.keys(this.latencies)) {
      this.latencies[key] = [];
    }
    for (const key of Object.keys(this.counters)) {
      this.counters[key] = 0;
    }
  }
}

export const voiceMetricsCollector = new VoiceMetricsCollector();
export default voiceMetricsCollector;
