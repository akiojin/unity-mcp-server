import { Worker } from 'worker_threads';
import path from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { logger, WORKSPACE_ROOT } from './config.js';
import { JobManager } from './jobManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DB_RELATIVE_PATH = path.join('.unity', 'cache', 'code-index', 'code-index.db');

/**
 * Resolve database path for Worker Thread builds.
 * Falls back to workspace-root based cache when dbPath is not provided.
 * @param {Object} [options] - Build options
 * @param {string} [options.dbPath] - Explicit database path
 * @param {string} [options.projectRoot] - Unity project root path
 * @returns {string} Resolved database path
 */
export function resolveDbPath(options = {}) {
  if (typeof options.dbPath === 'string' && options.dbPath.trim().length > 0) {
    return options.dbPath;
  }

  const baseRoot =
    (typeof WORKSPACE_ROOT === 'string' && WORKSPACE_ROOT.trim().length > 0 && WORKSPACE_ROOT) ||
    (typeof options.projectRoot === 'string' && options.projectRoot.trim().length > 0
      ? options.projectRoot
      : process.cwd());

  return path.resolve(baseRoot, DEFAULT_DB_RELATIVE_PATH);
}

const DEFAULT_TMP_DB_DIR = path.join(os.tmpdir(), 'unity-mcp-code-index');

function resolveDbPath(options) {
  if (typeof options?.dbPath === 'string' && options.dbPath.trim().length > 0) {
    return options.dbPath;
  }

  const projectRoot = typeof options?.projectRoot === 'string' ? options.projectRoot : '';
  const projectExists = projectRoot && fs.existsSync(projectRoot);

  if (projectExists) {
    return path.join(projectRoot, '.unity', 'cache', 'code-index', 'code-index.db');
  }

  // Fallback for mock/non-existent roots used in integration tests.
  const hash = crypto
    .createHash('sha1')
    .update(projectRoot || 'unknown-project-root', 'utf8')
    .digest('hex')
    .slice(0, 12);
  return path.join(DEFAULT_TMP_DB_DIR, hash, 'code-index.db');
}

/**
 * Worker Thread pool for non-blocking code index builds.
 *
 * This class manages Worker Threads that execute index builds in a separate
 * thread, preventing the main Node.js event loop from being blocked by
 * fast-sql database operations (hybrid backend with better-sqlite3 or sql.js fallback).
 *
 * Requirements:
 * - FR-056: Execute index build in Worker Thread
 * - FR-057: Maintain <1s ping response during builds
 * - FR-058: Propagate Worker Thread errors to main thread
 * - FR-059: Async progress notification from Worker Thread
 */
export class IndexBuildWorkerPool {
  constructor() {
    this.worker = null;
    this.jobManager = JobManager.getInstance();
    this.progressCallbacks = [];
    this.currentBuildId = null;
  }

  /**
   * Subscribe to progress updates from Worker Thread
   * @param {Function} callback - Called with progress object {processed, total, rate}
   */
  onProgress(callback) {
    this.progressCallbacks.push(callback);
  }

  /**
   * Execute index build in Worker Thread
   * @param {Object} options - Build options
   * @param {string} options.projectRoot - Unity project root path
   * @param {string} options.dbPath - Database file path
   * @param {number} [options.concurrency=1] - Worker concurrency (kept low to avoid blocking)
   * @param {number} [options.throttleMs=0] - Delay between files for testing
   * @returns {Promise<Object>} Build result
   */
  async executeBuild(options) {
    if (this.worker) {
      throw new Error('Build already in progress');
    }

    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'workers', 'indexBuildWorker.js');
      const buildOptions = options ?? {};
      const resolvedDbPath = resolveDbPath(buildOptions);
      const concurrency =
        Number.isFinite(buildOptions.concurrency) && buildOptions.concurrency > 0
          ? buildOptions.concurrency
          : 1;

      try {
        this.worker = new Worker(workerPath, {
          workerData: {
            ...buildOptions,
            dbPath: resolvedDbPath,
            concurrency
          }
        });

        this.worker.on('message', message => {
          if (message.type === 'progress') {
            // Notify progress callbacks
            this.progressCallbacks.forEach(cb => {
              try {
                cb(message.data);
              } catch (e) {
                logger.warning(`[worker-pool] Progress callback error: ${e.message}`);
              }
            });

            // Update JobManager if job is tracked
            if (this.currentBuildId) {
              const job = this.jobManager.get(this.currentBuildId);
              if (job) {
                job.progress = message.data;
              }
            }
          } else if (message.type === 'complete') {
            this._cleanup();
            resolve(message.data);
          } else if (message.type === 'error') {
            this._cleanup();
            reject(new Error(message.error));
          } else if (message.type === 'log') {
            // Forward logs from worker
            const level = message.level || 'info';
            if (logger[level]) {
              logger[level](message.message);
            }
          }
        });

        this.worker.on('error', error => {
          logger.error(`[worker-pool] Worker error: ${error.message}`);
          this._cleanup();
          reject(error);
        });

        this.worker.on('exit', code => {
          if (code !== 0 && this.worker) {
            logger.warning(`[worker-pool] Worker exited with code ${code}`);
            this._cleanup();
            reject(new Error(`Worker exited with code ${code}`));
          }
        });
      } catch (error) {
        this._cleanup();
        reject(error);
      }
    });
  }

  /**
   * Execute build with JobManager integration
   * @param {string} jobId - Job ID for tracking
   * @param {Object} options - Build options
   * @returns {Promise<Object>} Build result
   */
  async executeBuildWithJob(jobId, options) {
    this.currentBuildId = jobId;

    try {
      const result = await this.executeBuild(options);
      this.currentBuildId = null;
      return result;
    } catch (error) {
      this.currentBuildId = null;
      throw error;
    }
  }

  /**
   * Terminate the worker thread
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this._cleanup();
    }
  }

  /**
   * Check if a build is currently running
   * @returns {boolean}
   */
  isRunning() {
    return this.worker !== null;
  }

  /**
   * Clean up worker reference
   * @private
   */
  _cleanup() {
    this.worker = null;
    this.currentBuildId = null;
  }
}

// Singleton instance for shared use
let instance = null;

/**
 * Get singleton instance of IndexBuildWorkerPool
 * @returns {IndexBuildWorkerPool}
 */
export function getWorkerPool() {
  if (!instance) {
    instance = new IndexBuildWorkerPool();
  }
  return instance;
}

/**
 * Reset singleton (for testing)
 */
export function __resetWorkerPoolForTest() {
  if (instance) {
    instance.terminate();
    instance = null;
  }
}
