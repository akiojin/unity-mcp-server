import { BaseToolHandler } from '../base/BaseToolHandler.js';
import path from 'path';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { JobManager } from '../../core/jobManager.js';
import { getWorkerPool } from '../../core/indexBuildWorkerPool.js';

export class CodeIndexBuildToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'code_index_build',
      '[OFFLINE] No Unity connection required. Build (or rebuild) the persistent SQLite symbol index by scanning document symbols via the C# LSP. Returns immediately with jobId for background execution. Check progress with code_index_status. Stores DB under .unity/cache/code-index/code-index.db.',
      {
        type: 'object',
        properties: {
          throttleMs: {
            type: 'number',
            minimum: 0,
            description:
              'Optional delay in milliseconds after processing each file (testing/debugging).'
          },
          retry: {
            type: 'number',
            minimum: 0,
            maximum: 5,
            description: 'Number of retries for LSP requests (default: 2).'
          }
        },
        required: []
      }
    );
    this.unityConnection = unityConnection;
    this.projectInfo = new ProjectInfoProvider(unityConnection);
    this.jobManager = JobManager.getInstance();
    this.workerPool = getWorkerPool();
    this.currentJobId = null; // Track current running job
  }

  async execute(params = {}) {
    // Check if a build is already running via JobManager
    if (this.currentJobId) {
      const existingJob = this.jobManager.get(this.currentJobId);
      if (existingJob && existingJob.status === 'running') {
        return {
          success: false,
          error: 'build_already_running',
          message: `Code index build is already running (jobId: ${this.currentJobId}). Use code_index_status to check progress.`,
          jobId: this.currentJobId
        };
      }
    }

    // Check Worker Pool status (prevents concurrent Worker Thread builds)
    if (this.workerPool.isRunning()) {
      return {
        success: false,
        error: 'build_already_running',
        message: 'Code index build is already running (Worker Thread). Use code_index_status to check progress.',
        jobId: this.currentJobId
      };
    }

    // Generate new jobId
    const jobId = `build-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    this.currentJobId = jobId;

    // Get project info for DB path
    const info = await this.projectInfo.get();
    const dbPath = path.join(info.codeIndexRoot, 'code-index.db');

    // Create background job using Worker Thread (non-blocking)
    // This is the key change: execute build in Worker Thread instead of main thread
    this.jobManager.create(jobId, async job => {
      // Initialize progress
      job.progress = { processed: 0, total: 0, rate: 0 };

      // Subscribe to progress updates from Worker Thread
      this.workerPool.onProgress(progress => {
        job.progress = progress;
      });

      try {
        // Execute build in Worker Thread (non-blocking for main event loop)
        const result = await this.workerPool.executeBuild({
          projectRoot: info.projectRoot,
          dbPath: dbPath,
          concurrency: 1, // Worker Thread uses sequential processing for stability
          throttleMs: Math.max(0, Number(params?.throttleMs ?? 0)),
          retry: Math.max(0, Math.min(5, Number(params?.retry ?? 2))),
          reportPercentage: 10
        });

        // Clear current job tracking on success
        this.currentJobId = null;
        return result;
      } catch (error) {
        // Clear current job tracking on error
        this.currentJobId = null;
        throw error;
      }
    });

    // Return immediately with jobId (non-blocking)
    return {
      success: true,
      jobId,
      message: 'Code index build started in background (Worker Thread)',
      checkStatus: 'Use code_index_status to check progress and completion'
    };
  }
}
