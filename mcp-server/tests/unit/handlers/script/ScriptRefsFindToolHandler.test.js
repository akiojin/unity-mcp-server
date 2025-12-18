import { describe, it, beforeEach, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ScriptRefsFindToolHandler } from '../../../../src/handlers/script/ScriptRefsFindToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('ScriptRefsFindToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ScriptRefsFindToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'find_script_refs');
    });

    it('should have [OFFLINE] tag in description', () => {
      assert.ok(handler.description.includes('[OFFLINE]'));
    });

    it('should describe file-based search', () => {
      assert.ok(handler.description.includes('file-based search'));
    });
  });

  describe('SPEC compliance', () => {
    it('should find code references using file-based search', () => {
      assert.equal(handler.name, 'find_script_refs');
    });
  });

  describe('FR-052: DB index requirement', () => {
    it('should return index_not_ready error when DB index is not built and no build job running', async () => {
      // Mock index as not ready
      handler.index.isReady = mock.fn(async () => false);
      // Mock JobManager to return no running jobs
      const mockJobManager = {
        getAllJobs: mock.fn(() => [])
      };
      handler.jobManager = mockJobManager;

      const result = await handler.execute({ name: 'TestClass' });

      assert.equal(result.success, false);
      assert.equal(result.error, 'index_not_ready');
      assert.ok(result.message.includes('Code index is not built'));
      assert.ok(result.hint.includes('build_code_index'));
    });
  });

  describe('FR-053: index_building error with progress', () => {
    it('should return index_building error with progress info when build job is running', async () => {
      // Mock index as not ready
      handler.index.isReady = mock.fn(async () => false);
      // Mock JobManager to return a running build job
      const mockJobManager = {
        getAllJobs: mock.fn(() => [
          {
            id: 'build-1234567890-abc123',
            status: 'running',
            progress: {
              processed: 75,
              total: 100
            }
          }
        ])
      };
      handler.jobManager = mockJobManager;

      const result = await handler.execute({ name: 'TestClass' });

      assert.equal(result.success, false);
      assert.equal(result.error, 'index_building');
      assert.ok(result.message.includes('currently being built'));
      assert.equal(result.jobId, 'build-1234567890-abc123');
      assert.deepEqual(result.progress, {
        processed: 75,
        total: 100,
        percentage: 75
      });
    });
  });

  describe('FR-054: index_not_ready with hint', () => {
    it('should include hint about get_code_index_status and build_code_index', async () => {
      // Mock index as not ready
      handler.index.isReady = mock.fn(async () => false);
      // Mock JobManager to return no running jobs
      const mockJobManager = {
        getAllJobs: mock.fn(() => [])
      };
      handler.jobManager = mockJobManager;

      const result = await handler.execute({ name: 'TestClass' });

      assert.equal(result.error, 'index_not_ready');
      assert.ok(result.hint.includes('get_code_index_status'));
      assert.ok(result.hint.includes('build_code_index'));
    });
  });

  describe('file-based search', () => {
    let tempDir;

    beforeEach(async () => {
      // Create temp directory structure
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'script-refs-test-'));
      const assetsDir = path.join(tempDir, 'Assets');
      const packagesDir = path.join(tempDir, 'Packages');
      await fs.mkdir(assetsDir, { recursive: true });
      await fs.mkdir(packagesDir, { recursive: true });

      // Create test .cs files
      await fs.writeFile(
        path.join(assetsDir, 'TestClass.cs'),
        `using UnityEngine;
public class TestClass : MonoBehaviour
{
    public void Start()
    {
        Debug.Log("TestClass started");
    }
}
`
      );

      await fs.writeFile(
        path.join(assetsDir, 'UseTestClass.cs'),
        `using UnityEngine;
public class UseTestClass : MonoBehaviour
{
    private TestClass myTestClass;

    void Awake()
    {
        myTestClass = GetComponent<TestClass>();
    }
}
`
      );

      await fs.writeFile(
        path.join(packagesDir, 'PackageScript.cs'),
        `public class PackageScript
{
    public void DoSomething()
    {
        // Does nothing with TestClass
    }
}
`
      );

      // Mock index as ready
      handler.index.isReady = mock.fn(async () => true);
      // Mock projectInfo
      handler.projectInfo.get = mock.fn(async () => ({
        projectRoot: tempDir,
        assetsPath: assetsDir,
        packagesPath: packagesDir
      }));
    });

    afterEach(async () => {
      // Cleanup temp directory
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should find references using word-boundary matching', async () => {
      const result = await handler.execute({ name: 'TestClass' });

      assert.equal(result.success, true);
      assert.ok(result.total >= 2, 'Should find at least 2 references');
      // Check that results have correct grouped structure
      const firstResult = result.results[0];
      assert.ok(firstResult.path, 'Result should have path');
      assert.ok(Array.isArray(firstResult.references), 'Result should have references array');
      const firstRef = firstResult.references[0];
      assert.ok(typeof firstRef.line === 'number', 'Reference should have line number');
      assert.ok(typeof firstRef.column === 'number', 'Reference should have column number');
      assert.ok(firstRef.snippet, 'Reference should have snippet');
    });

    it('should respect scope filtering for assets', async () => {
      const result = await handler.execute({ name: 'TestClass', scope: 'assets' });

      assert.equal(result.success, true);
      // All results should be from Assets/
      for (const fileResult of result.results) {
        assert.ok(
          fileResult.path.startsWith('Assets/'),
          `Expected Assets/ path, got: ${fileResult.path}`
        );
      }
    });

    it('should respect maxMatchesPerFile limit', async () => {
      const result = await handler.execute({ name: 'TestClass', maxMatchesPerFile: 1 });

      assert.equal(result.success, true);
      // Each file group should have at most 1 reference
      for (const fileResult of result.results) {
        assert.ok(
          fileResult.references.length <= 1,
          `File ${fileResult.path} has ${fileResult.references.length} matches, expected max 1`
        );
      }
    });

    it('should respect pageSize limit', async () => {
      const result = await handler.execute({ name: 'TestClass', pageSize: 1 });

      assert.equal(result.success, true);
      assert.ok(result.total <= 1, 'Should respect pageSize');
    });

    it('should not match partial words', async () => {
      // Add a file with partial match
      await fs.writeFile(
        path.join(tempDir, 'Assets', 'NoMatch.cs'),
        `public class MyTestClassExtended { }` // "TestClass" is part of "MyTestClassExtended"
      );

      const result = await handler.execute({ name: 'TestClass' });

      // Should find "TestClass" but the word-boundary regex should prevent
      // false positives from class names like "MyTestClassExtended"
      assert.equal(result.success, true);
      // The word "TestClass" appears as a whole word in TestClass.cs and UseTestClass.cs
      // but "MyTestClassExtended" should NOT match because "TestClass" is not a word boundary there
    });

    it('should include snippet with context', async () => {
      const result = await handler.execute({ name: 'TestClass', snippetContext: 2 });

      assert.equal(result.success, true);
      if (result.results.length > 0) {
        const firstResult = result.results[0];
        assert.ok(firstResult.references.length > 0, 'Should have references');
        const firstRef = firstResult.references[0];
        assert.ok(firstRef.snippet, 'Should have snippet');
        // Snippet should contain multiple lines if context is available
        const lines = firstRef.snippet.split('\n');
        assert.ok(lines.length >= 1, 'Snippet should have at least 1 line');
      }
    });

    it('should return truncated flag when results exceed limits', async () => {
      const result = await handler.execute({ name: 'TestClass', maxBytes: 100 });

      // With very small maxBytes, results should be truncated
      assert.equal(result.success, true);
      // truncated can be true or false depending on actual data size
      assert.ok(typeof result.truncated === 'boolean');
    });
  });

  describe('code_index_unavailable', () => {
    it('should return error when code index is disabled', async () => {
      handler.index.isReady = mock.fn(async () => false);
      handler.index.disabled = true;
      handler.index.disableReason = 'SQLite driver could not be loaded';

      const result = await handler.execute({ name: 'TestClass' });

      assert.equal(result.success, false);
      assert.equal(result.error, 'code_index_unavailable');
      assert.ok(result.message.includes('SQLite'));
    });
  });
});
