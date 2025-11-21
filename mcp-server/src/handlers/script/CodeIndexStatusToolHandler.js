import fs from 'fs';
import path from 'path';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { JobManager } from '../../core/jobManager.js';
import { CodeIndex } from '../../core/codeIndex.js';

export class CodeIndexStatusToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'code_index_status',
      'Report code index status and readiness for symbol/search operations. BEST PRACTICES: Check before heavy symbol operations. Shows total files indexed and coverage percentage. If coverage is low, some symbol operations may be incomplete. Index is automatically built on first use. No parameters needed - lightweight status check.',
      {
        type: 'object',
        properties: {},
        required: []
      }
    );
    this.unityConnection = unityConnection;
    this.projectInfo = new ProjectInfoProvider(unityConnection);
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
        success: false,
        error: 'code_index_unavailable',
        message:
          this.codeIndex.disableReason ||
          'Code index is disabled because the SQLite driver could not be loaded. The server will continue without the symbol index.',
        remediation:
          'Install native build tools (python3, make, g++) in this environment and run "npm rebuild better-sqlite3 --build-from-source", then restart the server.'
      };
    }
    const buildInProgress = latestBuildJob?.status === 'running';
    if (!ready && !buildInProgress) {
      return {
        success: false,
        error: 'index_not_built',
        message: 'Code index is not built. Please run UnityMCP.code_index_build first.'
      };
    }

    let projectInfo;
    try {
      projectInfo = await this.projectInfo.get();
    } catch (error) {
      return {
        success: false,
        error: 'project_info_unavailable',
        message: error.message || 'Unable to resolve Unity project root.'
      };
    }

    const projectRoot = projectInfo.projectRoot.replace(/\\/g, '/');
    const roots = [
      path.resolve(projectRoot, 'Assets'),
      path.resolve(projectRoot, 'Packages'),
      path.resolve(projectRoot, 'Library/PackageCache')
    ];

    let totalFiles = 0;
    const breakdown = { assets: 0, packages: 0, packageCache: 0, other: 0 };

    const visit = targetPath => {
      try {
        if (!fs.existsSync(targetPath)) return;
        const stats = fs.statSync(targetPath);
        if (stats.isFile()) {
          if (!targetPath.endsWith('.cs')) return;
          totalFiles += 1;
          const normalized = targetPath.replace(/\\/g, '/');
          const relative = normalized.replace(projectRoot, '').replace(/^\//, '');
          if (relative.startsWith('Assets/')) breakdown.assets += 1;
          else if (relative.startsWith('Packages/')) breakdown.packages += 1;
          else if (relative.includes('Library/PackageCache/')) breakdown.packageCache += 1;
          else breakdown.other += 1;
          return;
        }

        if (stats.isDirectory()) {
          for (const child of fs.readdirSync(targetPath)) {
            if (child === 'obj' || child === 'bin' || child.startsWith('.')) continue;
            visit(path.join(targetPath, child));
          }
        }
      } catch (error) {
        // Ignore permission errors while traversing; status reporting should not fail because of a single file.
      }
    };

    for (const root of roots) visit(root);

    const stats = await this.codeIndex.getStats();
    const coverage = totalFiles > 0 ? Math.min(1, stats.total / totalFiles) : 0;

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
      breakdown,
      index: indexInfo
    };
  }
}
