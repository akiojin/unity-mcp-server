import { logger, config } from './config.js';
import { JobManager } from './jobManager.js';
import { getWorkerPool } from './indexBuildWorkerPool.js';

export class IndexWatcher {
  constructor(unityConnection) {
    this.unityConnection = unityConnection;
    this.timer = null;
    this.running = false;
    this.jobManager = JobManager.getInstance();
    this.currentWatcherJobId = null;
    this.workerPool = getWorkerPool();
    // FR-061: Use Worker Thread for watcher builds
    this.useWorkerThread = true;
  }

  start() {
    if (!config.indexing?.watch) return;
    if (this.timer) return;
    const interval = Math.max(2000, Number(config.indexing.intervalMs || 15000));
    // Initial delay: wait longer to allow MCP server to fully initialize
    // and first tool calls to complete before starting background indexing
    const initialDelay = Math.max(30000, Number(config.indexing.initialDelayMs || 30000));
    logger.info(`[index] watcher enabled (interval=${interval}ms, initialDelay=${initialDelay}ms)`);

    // Delay initial tick significantly to avoid blocking MCP server initialization
    const delayedStart = setTimeout(() => {
      this.tick();
      // Start periodic timer only after first tick
      this.timer = setInterval(() => this.tick(), interval);
      if (typeof this.timer.unref === 'function') {
        this.timer.unref();
      }
    }, initialDelay);
    if (typeof delayedStart.unref === 'function') {
      delayedStart.unref();
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      // Skip watcher entirely when the native SQLite binding is unavailable
      const { CodeIndex } = await import('./codeIndex.js');
      const probe = new CodeIndex(this.unityConnection);
      const driverOk = await probe._ensureDriver();
      if (!driverOk || probe.disabled) {
        const reason = probe.disableReason || 'SQLite native binding not available';
        logger.warning(`[index] watcher: code index disabled (${reason}); stopping watcher`);
        this.stop();
        return;
      }

      // Check if code index DB file exists (before opening DB)
      const { ProjectInfoProvider } = await import('./projectInfo.js');
      const projectInfo = new ProjectInfoProvider(this.unityConnection);
      const info = await projectInfo.get();
      const fs = await import('fs');
      const path = await import('path');
      const dbPath = path.default.join(info.codeIndexRoot, 'code-index.db');
      const dbExists = fs.default.existsSync(dbPath);

      if (!dbExists) {
        logger.warning('[index] watcher: code index DB file not found, triggering full rebuild');
        // Force full rebuild when DB file is missing
        const jobId = `watcher-rebuild-${Date.now()}`;
        this.currentWatcherJobId = jobId;

        // FR-061: Use Worker Thread for non-blocking builds
        await this._startWorkerBuild(jobId, info, dbPath);

        logger.info(`[index] watcher: started DB rebuild job ${jobId} (Worker Thread)`);
        this._monitorJob(jobId);
        return;
      }

      // Check if manual build is already running (jobs starting with 'build-')
      const allJobs = this.jobManager.getAllJobs();
      const manualBuildRunning = allJobs.some(
        job => job.id.startsWith('build-') && job.status === 'running'
      );

      if (manualBuildRunning) {
        logger.info('[index] watcher: skipping auto-build (manual build in progress)');
        return;
      }

      // Check if our watcher job is still running
      if (this.currentWatcherJobId) {
        const watcherJob = this.jobManager.get(this.currentWatcherJobId);
        if (watcherJob && watcherJob.status === 'running') {
          logger.info('[index] watcher: previous auto-build still running, skipping');
          return;
        }
        // Previous watcher job completed or cleaned up
        this.currentWatcherJobId = null;
      }

      // Start new watcher build job
      const jobId = `watcher-${Date.now()}`;
      this.currentWatcherJobId = jobId;

      // FR-061: Use Worker Thread for non-blocking builds
      await this._startWorkerBuild(jobId, info, dbPath);

      logger.info(`[index] watcher: started auto-build job ${jobId} (Worker Thread)`);

      // Monitor job completion in background
      // (Job result will be logged when it completes/fails)
      this._monitorJob(jobId);
    } catch (e) {
      logger.warning(`[index] watcher exception: ${e.message}`);
    } finally {
      this.running = false;
    }
  }

  /**
   * Start a build using Worker Thread pool
   * @param {string} jobId - Job ID for tracking
   * @param {Object} info - Project info
   * @param {string} dbPath - Database file path
   * @private
   */
  async _startWorkerBuild(jobId, info, dbPath) {
    // Create job in JobManager
    this.jobManager.create(jobId, async job => {
      // Initialize progress
      job.progress = { processed: 0, total: 0, rate: 0 };

      // Subscribe to progress updates from Worker
      this.workerPool.onProgress(progress => {
        job.progress = progress;
      });

      // Execute build in Worker Thread (non-blocking)
      const result = await this.workerPool.executeBuild({
        projectRoot: info.projectRoot,
        dbPath: dbPath,
        concurrency: config.indexing?.watcherConcurrency || 1,
        retry: config.indexing?.retry || 2,
        reportPercentage: 10
      });

      return result;
    });
  }

  /**
   * Monitor job completion for logging
   * @private
   */
  async _monitorJob(jobId) {
    // Check job status periodically
    const checkInterval = setInterval(() => {
      const job = this.jobManager.get(jobId);
      if (!job) {
        // Job cleaned up
        clearInterval(checkInterval);
        return;
      }

      if (job.status === 'completed') {
        logger.info(
          `[index] watcher: auto-build completed - updated=${job.result?.updatedFiles || 0} removed=${job.result?.removedFiles || 0} total=${job.result?.totalIndexedSymbols || 0}`
        );
        clearInterval(checkInterval);
      } else if (job.status === 'failed') {
        logger.warning(`[index] watcher: auto-build failed - ${job.error}`);
        clearInterval(checkInterval);
      }
    }, 1000);
    if (typeof checkInterval.unref === 'function') {
      checkInterval.unref();
    }

    // Cleanup interval after 10 minutes (longer than job cleanup)
    const cleanupTimeout = setTimeout(() => clearInterval(checkInterval), 600000);
    if (typeof cleanupTimeout.unref === 'function') {
      cleanupTimeout.unref();
    }
  }
}
