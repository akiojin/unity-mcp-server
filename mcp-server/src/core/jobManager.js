/**
 * JobManager - Manages background job execution and tracking
 *
 * SPEC-yt3ikddd: Background job execution for code index build
 * - Memory-based job tracking (no persistence)
 * - Single concurrent job execution
 * - Auto-cleanup after 5 minutes (configurable)
 */

/**
 * BuildJob structure
 * @typedef {Object} BuildJob
 * @property {string} id - Unique job identifier
 * @property {'running'|'completed'|'failed'} status - Current job status
 * @property {Object} progress - Progress information
 * @property {number} progress.processed - Number of processed items
 * @property {number} progress.total - Total items to process
 * @property {number} progress.rate - Processing rate (items/sec)
 * @property {Object|null} result - Result object (only for completed jobs)
 * @property {number} result.updatedFiles - Number of updated files
 * @property {number} result.removedFiles - Number of removed files
 * @property {number} result.totalIndexedSymbols - Total indexed symbols
 * @property {string} result.lastIndexedAt - ISO8601 timestamp of last index
 * @property {string|null} error - Error message (only for failed jobs)
 * @property {string} startedAt - ISO8601 timestamp when job started
 * @property {string|null} completedAt - ISO8601 timestamp when job completed
 * @property {string|null} failedAt - ISO8601 timestamp when job failed
 */

export class JobManager {
  constructor() {
    /**
     * Map of jobId -> BuildJob
     * @type {Map<string, BuildJob>}
     */
    this.jobs = new Map();

    /**
     * Map of jobId -> cleanup timeout handle
     * @type {Map<string, NodeJS.Timeout>}
     */
    this.cleanupTimers = new Map();
  }

  /**
   * Get the singleton instance
   * @returns {JobManager}
   */
  static getInstance() {
    if (!JobManager._instance) {
      JobManager._instance = new JobManager();
    }
    return JobManager._instance;
  }

  /**
   * Create a new job and execute it in background
   *
   * @param {string} jobId - Unique job identifier
   * @param {Function} jobFn - Async function to execute: async (job) => result
   * @returns {string} jobId - Returns immediately
   */
  create(jobId, jobFn) {
    // Create initial job object
    const job = {
      id: jobId,
      status: 'running',
      progress: {
        processed: 0,
        total: 0,
        rate: 0
      },
      result: null,
      error: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      failedAt: null
    };

    // Store job
    this.jobs.set(jobId, job);

    // Execute in background (don't await)
    this._executeJob(jobId, jobFn, job);

    // Return jobId immediately
    return jobId;
  }

  /**
   * Get job by ID
   *
   * @param {string} jobId - Job identifier
   * @returns {BuildJob|undefined} Job object or undefined if not found
   */
  get(jobId) {
    return this.jobs.get(jobId);
  }

  /**
   * Schedule job cleanup after retention period
   *
   * @param {string} jobId - Job identifier
   * @param {number} retentionMs - Retention period in milliseconds (default: 5 minutes)
   */
  cleanup(jobId, retentionMs = 300000) {
    // Clear any existing cleanup timer
    if (this.cleanupTimers.has(jobId)) {
      clearTimeout(this.cleanupTimers.get(jobId));
    }

    // Schedule new cleanup
    const timer = setTimeout(() => {
      this.jobs.delete(jobId);
      this.cleanupTimers.delete(jobId);
    }, retentionMs);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    this.cleanupTimers.set(jobId, timer);
  }

  /**
   * Execute job function in background
   *
   * @private
   * @param {string} jobId - Job identifier
   * @param {Function} jobFn - Async job function
   * @param {BuildJob} job - Job object (passed by reference for progress updates)
   */
  async _executeJob(jobId, jobFn, job) {
    try {
      // Execute job function
      // jobFn can update job.progress directly
      const result = await jobFn(job);

      // Update job on success
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date().toISOString();

      // Schedule cleanup after 5 minutes
      this.cleanup(jobId, 300000);
    } catch (error) {
      // Update job on failure
      job.status = 'failed';
      job.error = error.message || String(error);
      job.failedAt = new Date().toISOString();

      // Schedule cleanup after 5 minutes
      this.cleanup(jobId, 300000);
    }
  }

  /**
   * Get all jobs (for debugging/testing)
   *
   * @returns {BuildJob[]} Array of all jobs
   */
  getAllJobs() {
    return Array.from(this.jobs.values());
  }

  /**
   * Clear all jobs (for testing)
   */
  clearAll() {
    // Clear all cleanup timers
    for (const timer of this.cleanupTimers.values()) {
      clearTimeout(timer);
    }
    this.cleanupTimers.clear();

    // Clear all jobs
    this.jobs.clear();
  }
}
