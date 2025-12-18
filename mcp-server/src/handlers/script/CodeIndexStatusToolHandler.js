import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { JobManager } from '../../core/jobManager.js';
import { CodeIndex } from '../../core/codeIndex.js';

export class CodeIndexStatusToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'get_index_status',
      '[OFFLINE] No Unity connection required. Report code index status and readiness for symbol/search operations. BEST PRACTICES: Check before heavy symbol operations. Shows total files indexed and coverage percentage. If coverage is low, some symbol operations may be incomplete. Index is automatically built on first use. No parameters needed - lightweight status check.',
      {
        type: 'object',
        properties: {},
        required: []
      }
    );
    this.unityConnection = unityConnection;
    this.jobManager = JobManager.getInstance();
    this.codeIndex = new CodeIndex(unityConnection);
  }

  async execute() {
    const jobManager = this.jobManager;
    const buildJobs = jobManager
      .getAllJobs()
      .filter(job => typeof job?.id === 'string' && job.id.startsWith('build-'))
      .sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime());
    const latestBuildJob = buildJobs.length > 0 ? buildJobs[0] : null;

    // Check whether the persistent index already exists or is being built in the background.
    const ready = await this.codeIndex.isReady();
    if (this.codeIndex.disabled) {
      return {
        success: true,
        status: 'degraded',
        disabled: true,
        ready: false,
        totalFiles: 0,
        indexedFiles: 0,
        coverage: 0,
        message:
          this.codeIndex.disableReason ||
          'Code index is disabled because fast-sql could not be loaded. The server will continue without the symbol index.',
        remediation:
          'Ensure fast-sql is properly installed. After reinstalling dependencies, restart unity-mcp-server.',
        index: {
          ready: false,
          disabled: true,
          reason: this.codeIndex.disableReason || 'fast-sql unavailable; code index is disabled'
        }
      };
    }
    const buildInProgress = latestBuildJob?.status === 'running';
    if (!ready && !buildInProgress) {
      return {
        success: false,
        error: 'index_not_built',
        message: 'Code index is not built. Please run UnityMCP.build_index first.'
      };
    }

    // Use DB stats directly for fast status check - avoid expensive filesystem traversal
    const stats = await this.codeIndex.getStats();

    // Estimate total files from DB metadata if available, otherwise use indexed count
    // The actual file count scan is too slow (6+ minutes for 7000+ files)
    const totalFiles = stats.totalFilesEstimate || stats.total;
    const coverage = totalFiles > 0 ? Math.min(1, stats.total / totalFiles) : 1;

    const indexInfo = {
      ready,
      rows: stats.total,
      lastIndexedAt: stats.lastIndexedAt
    };

    if (latestBuildJob) {
      const progress = latestBuildJob.progress ? { ...latestBuildJob.progress } : undefined;
      indexInfo.buildJob = {
        id: latestBuildJob.id,
        status: latestBuildJob.status,
        startedAt: latestBuildJob.startedAt ?? null,
        ...(progress ? { progress } : {})
      };

      if (latestBuildJob.status === 'completed') {
        indexInfo.buildJob.completedAt = latestBuildJob.completedAt ?? null;
        indexInfo.buildJob.result = latestBuildJob.result ?? null;
      } else if (latestBuildJob.status === 'failed') {
        indexInfo.buildJob.failedAt = latestBuildJob.failedAt ?? null;
        indexInfo.buildJob.error = latestBuildJob.error ?? 'Unknown error';
      }
    }

    return {
      success: true,
      totalFiles,
      indexedFiles: stats.total,
      coverage,
      index: indexInfo
    };
  }
}
