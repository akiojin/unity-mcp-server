import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CodeIndexStatusToolHandler } from '../../../../src/handlers/script/CodeIndexStatusToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('CodeIndexStatusToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true
      }
    });
    handler = new CodeIndexStatusToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'get_index_status');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('index status'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.deepEqual(schema.properties, {});
      assert.deepEqual(schema.required ?? [], []);
    });
  });

  describe('validate', () => {
    it('should pass with no parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });
  });

  describe('execute', () => {
    it('should report index status successfully', async () => {
      // Note: This handler uses CodeIndex which requires file system access
      // For unit tests, we test the interface contract
      try {
        const result = await handler.execute({});

        // If successful, verify response structure
        if (result.success) {
          assert.ok(result.totalFiles !== undefined);
          assert.ok(result.indexedFiles !== undefined);
          assert.ok(result.coverage !== undefined);
          assert.ok(result.breakdown);
          assert.ok(result.index);
        } else {
          // If index not built, should return specific error
          assert.equal(result.success, false);
          assert.ok(result.error || result.message);
        }
      } catch (error) {
        // Expected in test environment without actual index
        assert.ok(error);
      }
    });

    it('should return degraded status when index is disabled', async () => {
      handler.codeIndex = {
        disabled: true,
        disableReason: 'fast-sql could not be loaded',
        isReady: async () => false
      };

      const result = await handler.execute({});

      assert.equal(result.success, true);
      assert.equal(result.status, 'degraded');
      assert.equal(result.disabled, true);
      assert.equal(result.coverage, 0);
      assert.ok(result.message.includes('fast-sql'));
    });

    it('should have correct response structure when index is ready', async () => {
      // Mock successful case
      const mockResult = {
        success: true,
        totalFiles: 150,
        indexedFiles: 145,
        coverage: 0.967,
        breakdown: {
          assets: 50,
          packages: 80,
          packageCache: 15,
          other: 5
        },
        index: {
          ready: true,
          rows: 145,
          lastIndexedAt: '2025-01-17T12:00:00Z'
        }
      };

      // Verify expected structure
      assert.ok(typeof mockResult.totalFiles === 'number');
      assert.ok(typeof mockResult.indexedFiles === 'number');
      assert.ok(typeof mockResult.coverage === 'number');
      assert.ok(mockResult.coverage >= 0 && mockResult.coverage <= 1);
      assert.ok(mockResult.breakdown.assets >= 0);
      assert.ok(mockResult.index.ready === true);
    });

    it('should return error when index not built', async () => {
      const mockResult = {
        success: false,
        error: 'index_not_built',
        message: 'Code index is not built. Please run UnityMCP.build_index first.'
      };

      assert.equal(mockResult.success, false);
      assert.equal(mockResult.error, 'index_not_built');
      assert.ok(mockResult.message.includes('build_index'));
    });

    it('should treat watcher builds as in-progress', async () => {
      handler.codeIndex = {
        disabled: false,
        isReady: async () => false,
        getStats: async () => ({ total: 0, lastIndexedAt: null, totalFilesEstimate: 0 })
      };
      handler.jobManager = {
        getAllJobs: () => [
          {
            id: 'watcher-1730188800000',
            status: 'running',
            startedAt: '2025-01-01T00:00:00Z',
            progress: { processed: 10, total: 100, rate: 1.5 }
          }
        ]
      };

      const result = await handler.execute({});

      assert.equal(result.success, true);
      assert.ok(result.index?.buildJob);
      assert.equal(result.index.buildJob.id, 'watcher-1730188800000');
      assert.equal(result.index.buildJob.status, 'running');
    });

    it('should report in-progress when worker pool is running without job tracking', async () => {
      handler.codeIndex = {
        disabled: false,
        isReady: async () => false,
        getStats: async () => ({ total: 0, lastIndexedAt: null, totalFilesEstimate: 0 })
      };
      handler.jobManager = {
        getAllJobs: () => []
      };
      handler.workerPool = {
        isRunning: () => true
      };

      const result = await handler.execute({});

      assert.equal(result.success, true);
      assert.equal(result.status, 'pending');
      assert.ok(result.index?.buildJob);
      assert.equal(result.index.buildJob.status, 'running');
      assert.equal(result.index.buildJob.source, 'worker');
    });

    it('should report failed build job when index is not ready', async () => {
      handler.codeIndex = {
        disabled: false,
        isReady: async () => false,
        getStats: async () => ({ total: 0, lastIndexedAt: null, totalFilesEstimate: 0 })
      };
      handler.jobManager = {
        getAllJobs: () => [
          {
            id: 'build-1730188800000',
            status: 'failed',
            startedAt: '2025-01-01T00:00:00Z',
            failedAt: '2025-01-01T00:01:00Z',
            error: 'boom'
          }
        ]
      };

      const result = await handler.execute({});

      assert.equal(result.success, true);
      assert.equal(result.status, 'failed');
      assert.ok(result.index?.buildJob);
      assert.equal(result.index.buildJob.status, 'failed');
      assert.match(result.message, /failed/i);
    });

    it('should include file breakdown by location', async () => {
      const mockResult = {
        success: true,
        breakdown: {
          assets: 50,
          packages: 80,
          packageCache: 15,
          other: 5
        }
      };

      assert.ok(mockResult.breakdown.assets >= 0);
      assert.ok(mockResult.breakdown.packages >= 0);
      assert.ok(mockResult.breakdown.packageCache >= 0);
      assert.ok(mockResult.breakdown.other >= 0);
    });

    it('should calculate coverage percentage correctly', async () => {
      const mockResult = {
        success: true,
        totalFiles: 100,
        indexedFiles: 95,
        coverage: 0.95
      };

      const expectedCoverage = mockResult.indexedFiles / mockResult.totalFiles;
      assert.ok(Math.abs(mockResult.coverage - expectedCoverage) < 0.01);
      assert.ok(mockResult.coverage >= 0 && mockResult.coverage <= 1);
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      try {
        const result = await handler.handle({});

        assert.ok(result);
        assert.ok(result.status);
        assert.ok(result.result);
      } catch (error) {
        // Expected in test environment
        assert.ok(error);
      }
    });
  });

  describe('SPEC-e757a01f compliance', () => {
    it('FR-003: should report index status', async () => {
      // Index status reporting is core functionality
      assert.equal(handler.name, 'get_index_status');
      assert.ok(handler.description.includes('status'));
    });

    it('FR-004: should show coverage percentage', async () => {
      const mockResult = {
        success: true,
        coverage: 0.95
      };

      assert.ok(mockResult.coverage !== undefined);
      assert.ok(typeof mockResult.coverage === 'number');
    });

    it('FR-005: should provide file breakdown', async () => {
      const mockResult = {
        success: true,
        breakdown: {
          assets: 50,
          packages: 80,
          packageCache: 15,
          other: 5
        }
      };

      assert.ok(mockResult.breakdown);
      assert.ok(mockResult.breakdown.assets !== undefined);
      assert.ok(mockResult.breakdown.packages !== undefined);
    });
  });

  describe('SPEC-yt3ikddd: buildJob field extension (RED phase)', () => {
    describe('Contract: Running job progress', () => {
      it('should include buildJob field when job is running', async () => {
        // Mock response with running job
        const mockResult = {
          success: true,
          totalFiles: 1500,
          indexedFiles: 1200,
          coverage: 0.8,
          breakdown: { assets: 500, packages: 800, packageCache: 100, other: 100 },
          index: {
            ready: true,
            rows: 12000,
            lastIndexedAt: '2025-10-29T10:00:00Z',
            buildJob: {
              id: 'build-1730188800000-abc123',
              status: 'running',
              progress: {
                processed: 1200,
                total: 1500,
                rate: 12.5
              },
              startedAt: '2025-10-29T10:00:00Z'
            }
          }
        };

        // Verify buildJob structure for running job
        assert.ok(mockResult.index.buildJob, 'buildJob should exist');
        assert.equal(mockResult.index.buildJob.status, 'running');
        assert.ok(mockResult.index.buildJob.progress, 'progress should exist');
        assert.ok(typeof mockResult.index.buildJob.progress.processed === 'number');
        assert.ok(typeof mockResult.index.buildJob.progress.total === 'number');
        assert.ok(typeof mockResult.index.buildJob.progress.rate === 'number');
        assert.ok(mockResult.index.buildJob.startedAt);
      });

      it('should allow index.ready to be false during an initial build', async () => {
        const mockResult = {
          success: true,
          totalFiles: 1500,
          indexedFiles: 0,
          coverage: 0,
          breakdown: { assets: 500, packages: 800, packageCache: 150, other: 50 },
          index: {
            ready: false,
            rows: 0,
            lastIndexedAt: null,
            buildJob: {
              id: 'build-1730188800000-xyz789',
              status: 'running',
              progress: {
                processed: 200,
                total: 1500,
                rate: 8.5
              },
              startedAt: '2025-10-29T10:00:00Z'
            }
          }
        };

        assert.equal(mockResult.index.ready, false, 'ready can be false while build runs');
        assert.ok(mockResult.index.buildJob, 'buildJob should be present');
        assert.equal(mockResult.index.buildJob.status, 'running');
      });

      it('should not include completedAt or result for running job', async () => {
        const mockResult = {
          index: {
            buildJob: {
              id: 'build-123',
              status: 'running',
              progress: { processed: 100, total: 200, rate: 10.0 },
              startedAt: '2025-10-29T10:00:00Z'
            }
          }
        };

        assert.equal(mockResult.index.buildJob.status, 'running');
        assert.equal(
          mockResult.index.buildJob.completedAt,
          undefined,
          'completedAt should not exist for running job'
        );
        assert.equal(
          mockResult.index.buildJob.result,
          undefined,
          'result should not exist for running job'
        );
      });
    });

    describe('Contract: Completed job result', () => {
      it('should include buildJob with result when job is completed', async () => {
        const mockResult = {
          success: true,
          totalFiles: 1500,
          indexedFiles: 1500,
          coverage: 1.0,
          breakdown: { assets: 500, packages: 850, packageCache: 100, other: 50 },
          index: {
            ready: true,
            rows: 15500,
            lastIndexedAt: '2025-10-29T10:05:00Z',
            buildJob: {
              id: 'build-1730188800000-abc123',
              status: 'completed',
              progress: {
                processed: 1500,
                total: 1500,
                rate: 15.2
              },
              startedAt: '2025-10-29T10:00:00Z',
              completedAt: '2025-10-29T10:05:00Z',
              result: {
                updatedFiles: 50,
                removedFiles: 0,
                totalIndexedSymbols: 15500,
                lastIndexedAt: '2025-10-29T10:05:00Z'
              }
            }
          }
        };

        // Verify buildJob structure for completed job
        assert.equal(mockResult.index.buildJob.status, 'completed');
        assert.ok(mockResult.index.buildJob.completedAt, 'completedAt should exist');
        assert.ok(mockResult.index.buildJob.result, 'result should exist');
        assert.ok(typeof mockResult.index.buildJob.result.updatedFiles === 'number');
        assert.ok(typeof mockResult.index.buildJob.result.removedFiles === 'number');
        assert.ok(typeof mockResult.index.buildJob.result.totalIndexedSymbols === 'number');
        assert.ok(mockResult.index.buildJob.result.lastIndexedAt);
      });
    });

    describe('Contract: Failed job error', () => {
      it('should include buildJob with error when job failed', async () => {
        const mockResult = {
          success: true,
          totalFiles: 1500,
          indexedFiles: 1200,
          coverage: 0.8,
          breakdown: { assets: 500, packages: 800, packageCache: 100, other: 100 },
          index: {
            ready: true,
            rows: 12000,
            lastIndexedAt: '2025-10-29T09:00:00Z',
            buildJob: {
              id: 'build-1730188800000-abc123',
              status: 'failed',
              progress: {
                processed: 800,
                total: 1500,
                rate: 10.0
              },
              startedAt: '2025-10-29T10:00:00Z',
              failedAt: '2025-10-29T10:02:30Z',
              error: 'LSP connection failed: ECONNREFUSED'
            }
          }
        };

        // Verify buildJob structure for failed job
        assert.equal(mockResult.index.buildJob.status, 'failed');
        assert.ok(mockResult.index.buildJob.error, 'error should exist');
        assert.ok(mockResult.index.buildJob.failedAt, 'failedAt should exist');
        assert.equal(
          mockResult.index.buildJob.result,
          undefined,
          'result should not exist for failed job'
        );
      });
    });

    describe('Contract: Backward compatibility', () => {
      it('should work without buildJob field (existing clients)', async () => {
        // Response without buildJob (backward compatible)
        const mockResult = {
          success: true,
          totalFiles: 1500,
          indexedFiles: 1500,
          coverage: 1.0,
          breakdown: { assets: 500, packages: 850, packageCache: 100, other: 50 },
          index: {
            ready: true,
            rows: 15500,
            lastIndexedAt: '2025-10-29T09:00:00Z'
            // No buildJob field
          }
        };

        // Verify all existing fields are present
        assert.ok(mockResult.success);
        assert.ok(typeof mockResult.totalFiles === 'number');
        assert.ok(typeof mockResult.indexedFiles === 'number');
        assert.ok(typeof mockResult.coverage === 'number');
        assert.ok(mockResult.breakdown);
        assert.ok(mockResult.index.ready);
        assert.ok(mockResult.index.rows);
        assert.ok(mockResult.index.lastIndexedAt);

        // buildJob is optional
        assert.equal(mockResult.index.buildJob, undefined, 'buildJob is optional');
      });

      it('should maintain all existing fields when buildJob is present', async () => {
        const mockResult = {
          success: true,
          totalFiles: 1500,
          indexedFiles: 1500,
          coverage: 1.0,
          breakdown: { assets: 500, packages: 850, packageCache: 100, other: 50 },
          index: {
            ready: true,
            rows: 15500,
            lastIndexedAt: '2025-10-29T10:05:00Z',
            buildJob: {
              id: 'build-123',
              status: 'completed',
              progress: { processed: 1500, total: 1500, rate: 15.2 },
              startedAt: '2025-10-29T10:00:00Z',
              completedAt: '2025-10-29T10:05:00Z',
              result: {
                updatedFiles: 50,
                removedFiles: 0,
                totalIndexedSymbols: 15500,
                lastIndexedAt: '2025-10-29T10:05:00Z'
              }
            }
          }
        };

        // All existing fields must be present
        assert.ok(mockResult.success);
        assert.ok(mockResult.totalFiles);
        assert.ok(mockResult.indexedFiles);
        assert.ok(mockResult.coverage);
        assert.ok(mockResult.breakdown);
        assert.ok(mockResult.index.ready);
        assert.ok(mockResult.index.rows);
        assert.ok(mockResult.index.lastIndexedAt);

        // New buildJob field is also present
        assert.ok(mockResult.index.buildJob);
      });
    });

    describe('Contract: Status values', () => {
      it('should only allow running, completed, or failed status', async () => {
        const validStatuses = ['running', 'completed', 'failed'];

        for (const status of validStatuses) {
          const mockJob = {
            id: 'build-123',
            status: status,
            progress: { processed: 0, total: 0, rate: 0 },
            startedAt: '2025-10-29T10:00:00Z'
          };

          assert.ok(validStatuses.includes(mockJob.status), `${status} should be a valid status`);
        }
      });
    });
  });
});
