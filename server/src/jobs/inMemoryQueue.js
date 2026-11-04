import { EventEmitter } from 'events';
import logger from '../utils/logger.js';

const queuesRegistry = new Map();

/**
 * Resilient In-Memory Queue implementing the BullMQ Queue interface.
 * Used for local development, CI testing, and graceful fallback when Redis is offline.
 */
export class InMemoryQueue extends EventEmitter {
  constructor(name, options = {}) {
    super();
    this.name = name;
    this.options = options;
    this.jobs = new Map(); // id -> job
    this.isPaused = false;
    this.workers = [];

    queuesRegistry.set(name, this);
  }

  /**
   * Adds a job to the in-memory queue with idempotency and deduplication.
   *
   * @param {string} jobName
   * @param {object} data
   * @param {object} [opts]
   * @returns {Promise<object>} The added or deduplicated job
   */
  async add(jobName, data, opts = {}) {
    const jobId = opts.jobId || `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Job deduplication check
    if (opts.jobId && this.jobs.has(jobId)) {
      const existing = this.jobs.get(jobId);
      if (['waiting', 'active', 'delayed'].includes(existing.state)) {
        logger.debug(`[InMemoryQueue:${this.name}] Duplicate job ignored via jobId: ${jobId}`);
        return existing;
      }
    }

    const maxAttempts = opts.attempts || 3;
    const backoff = opts.backoff || { type: 'exponential', delay: 1000 };
    const delay = opts.delay || 0;

    const job = {
      id: jobId,
      name: jobName,
      data: Object.freeze({ ...data }), // Prevent external mutation
      opts: { ...opts, attempts: maxAttempts, backoff },
      attemptsMade: 0,
      timestamp: Date.now(),
      processedOn: null,
      finishedOn: null,
      state: delay > 0 ? 'delayed' : 'waiting',
      failedReason: null,
      stacktrace: [],
      returnvalue: null,
      // Helper methods to match BullMQ Job API
      async updateData(newData) {
        this.data = Object.freeze({ ...newData });
      },
      async log(msg) {
        // Job log placeholder
      },
    };

    this.jobs.set(jobId, job);
    this.emit('added', job);

    if (delay > 0) {
      setTimeout(() => {
        if (job.state === 'delayed') {
          job.state = 'waiting';
          this._dispatchToWorkers();
        }
      }, delay);
    } else {
      setImmediate(() => this._dispatchToWorkers());
    }

    return job;
  }

  _dispatchToWorkers() {
    if (this.isPaused) return;
    for (const worker of this.workers) {
      if (worker.activeCount < worker.concurrency) {
        worker._processNext();
      }
    }
  }

  async getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  async getWaitingCount() {
    return Array.from(this.jobs.values()).filter((j) => j.state === 'waiting').length;
  }

  async getActiveCount() {
    return Array.from(this.jobs.values()).filter((j) => j.state === 'active').length;
  }

  async getCompletedCount() {
    return Array.from(this.jobs.values()).filter((j) => j.state === 'completed').length;
  }

  async getFailedCount() {
    return Array.from(this.jobs.values()).filter((j) => j.state === 'failed').length;
  }

  async getDelayedCount() {
    return Array.from(this.jobs.values()).filter((j) => j.state === 'delayed').length;
  }

  async getJobs(types = ['waiting', 'active', 'completed', 'failed', 'delayed'], start = 0, end = -1) {
    const typeList = Array.isArray(types) ? types : [types];
    const matched = Array.from(this.jobs.values()).filter((j) => typeList.includes(j.state));
    const sliceEnd = end === -1 ? matched.length : end + 1;
    return matched.slice(start, sliceEnd);
  }

  async retryJobs(count = 100) {
    const failed = Array.from(this.jobs.values()).filter((j) => j.state === 'failed');
    let retried = 0;
    for (const job of failed.slice(0, count)) {
      job.state = 'waiting';
      job.attemptsMade = 0;
      job.failedReason = null;
      retried++;
    }
    this._dispatchToWorkers();
    return retried;
  }

  async clean(graceMs = 0, limit = 1000, type = 'completed') {
    const cutoff = Date.now() - graceMs;
    const candidates = Array.from(this.jobs.values()).filter(
      (j) => j.state === type && (j.finishedOn || j.timestamp) <= cutoff
    );

    let removed = 0;
    for (const job of candidates.slice(0, limit)) {
      this.jobs.delete(job.id);
      removed++;
    }
    return removed;
  }

  async pause() {
    this.isPaused = true;
    this.emit('paused');
  }

  async resume() {
    this.isPaused = false;
    this.emit('resumed');
    this._dispatchToWorkers();
  }

  async close() {
    this.isPaused = true;
    this.removeAllListeners();
  }
}

/**
 * Resilient In-Memory Worker implementing the BullMQ Worker interface.
 */
export class InMemoryWorker extends EventEmitter {
  constructor(queueName, processor, options = {}) {
    super();
    this.queueName = queueName;
    this.processor = processor;
    this.concurrency = options.concurrency || 1;
    this.activeCount = 0;
    this.isClosing = false;

    // Attach to queue
    let q = queuesRegistry.get(queueName);
    if (!q) {
      q = new InMemoryQueue(queueName);
    }
    this.queue = q;
    q.workers.push(this);

    setImmediate(() => this._processNext());
  }

  async _processNext() {
    if (this.isClosing || this.queue.isPaused) return;
    if (this.activeCount >= this.concurrency) return;

    const waitingJob = Array.from(this.queue.jobs.values()).find((j) => j.state === 'waiting');
    if (!waitingJob) return;

    this.activeCount++;
    waitingJob.state = 'active';
    waitingJob.processedOn = Date.now();
    this.emit('active', waitingJob);

    try {
      const result = await this.processor(waitingJob);
      waitingJob.state = 'completed';
      waitingJob.returnvalue = result;
      waitingJob.finishedOn = Date.now();
      this.emit('completed', waitingJob, result);
    } catch (err) {
      waitingJob.attemptsMade++;
      const maxAttempts = waitingJob.opts.attempts || 3;
      waitingJob.failedReason = err.message;
      waitingJob.stacktrace.push(err.stack || err.message);

      if (waitingJob.attemptsMade < maxAttempts) {
        // Exponential backoff
        const baseDelay = waitingJob.opts.backoff?.delay || 1000;
        const delay = baseDelay * Math.pow(2, waitingJob.attemptsMade - 1);
        waitingJob.state = 'delayed';

        setTimeout(() => {
          if (waitingJob.state === 'delayed') {
            waitingJob.state = 'waiting';
            this._processNext();
          }
        }, delay);
      } else {
        // Attempts exhausted: Dead-letter state
        waitingJob.state = 'failed';
        waitingJob.finishedOn = Date.now();
        this.emit('failed', waitingJob, err);
      }
    } finally {
      this.activeCount--;
      setImmediate(() => this._processNext());
    }
  }

  async close() {
    this.isClosing = true;
    const index = this.queue.workers.indexOf(this);
    if (index !== -1) {
      this.queue.workers.splice(index, 1);
    }
    // Wait for in-flight tasks
    while (this.activeCount > 0) {
      await new Promise((r) => setTimeout(r, 50));
    }
    this.removeAllListeners();
  }
}

export default {
  InMemoryQueue,
  InMemoryWorker,
};
