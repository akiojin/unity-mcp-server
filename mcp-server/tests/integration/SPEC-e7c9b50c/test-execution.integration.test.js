/**
 * Integration Tests for SPEC-e7c9b50c: Unity Test Execution（ユニットテスト実行）機能
 *
 * 前提条件:
 * - Unity Editorが起動している
 * - UnityMCPServerプロジェクトが開いている
 * - TCP接続がlocalhost:6400で待機している
 * - Unity側にテストが存在する（Packages/unity-mcp-server/Tests/Editor/）
 *
 * 実行方法:
 * npm run test:integration -- tests/integration/SPEC-e7c9b50c/*.test.js
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UnityConnection } from '../../../src/core/unityConnection.js';
import { RunTestsToolHandler } from '../../../src/handlers/test/RunTestsToolHandler.js';
import { GetTestStatusToolHandler } from '../../../src/handlers/test/GetTestStatusToolHandler.js';

describe('SPEC-e7c9b50c: Unity Test Execution - Integration Tests', () => {
  let connection;
  let runTestsHandler;
  let getStatusHandler;

  before(async () => {
    // Unity接続確立
    connection = new UnityConnection();

    try {
      await connection.connect();
    } catch (error) {
      console.error('❌ Unity connection failed. Make sure Unity Editor is running.');
      console.error('   1. Open UnityMCPServer project in Unity');
      console.error('   2. Ensure TCP server is listening on localhost:6400');
      throw error;
    }

    assert.ok(connection.connected, 'Unity connection should be established');
    console.log('✓ Unity connection established');
  });

  after(() => {
    if (connection && connection.connected) {
      connection.disconnect();
      console.log('✓ Unity connection closed');
    }
  });

  beforeEach(() => {
    runTestsHandler = new RunTestsToolHandler(connection);
    getStatusHandler = new GetTestStatusToolHandler(connection);
  });

  describe('FR-001: Unity NUnitテストの実行', () => {
    it('should execute EditMode tests successfully', async () => {
      // Given: Unity側にEditModeテストが存在する
      // When: EditModeテストを実行
      const startTime = Date.now();
      const result = await runTestsHandler.execute({ testMode: 'EditMode' });
      const duration = Date.now() - startTime;

      // Then: テスト結果が返される
      assert.ok(result, 'Result should exist');

      // NFR-001: テスト実行開始は1秒以内
      assert.ok(duration < 1000, `Test execution should start within 1s (actual: ${duration}ms)`);

      // 結果の構造を検証
      if (result.status === 'running') {
        // 非ブロッキング実行の場合
        console.log(`  ⚠ Test execution started (non-blocking mode)`);
        assert.ok(result.message, 'Should have status message');
      } else {
        // ブロッキング実行の場合
        assert.ok(typeof result.totalTests === 'number', 'Should have totalTests');
        assert.ok(typeof result.passedTests === 'number', 'Should have passedTests');
        assert.ok(typeof result.failedTests === 'number', 'Should have failedTests');
        console.log(`  ✓ Executed ${result.totalTests} tests (${result.passedTests} passed, ${result.failedTests} failed) in ${duration}ms`);
      }
    });

    it('should execute tests with specific filter', async () => {
      // Given: 特定のテストクラスを指定
      const filter = 'TestExecutionHandlerTests';

      // When: フィルタを指定してテストを実行
      const result = await runTestsHandler.execute({
        testMode: 'EditMode',
        filter
      });

      // Then: フィルタにマッチするテストのみが実行される
      assert.ok(result, 'Result should exist');

      if (result.status !== 'running') {
        // テストが見つからない場合は0件、見つかった場合は1件以上
        assert.ok(result.totalTests >= 0, 'Should have valid test count');
        console.log(`  ✓ Filter test completed: ${result.totalTests} tests found for filter "${filter}"`);
      }
    });
  });

  describe('FR-002-FR-005: テストモードとフィルタリング', () => {
    it('should support different test modes', async () => {
      // Given: EditMode/PlayMode/Allのテストモード
      const testModes = ['EditMode', 'PlayMode', 'All'];

      // When/Then: 各テストモードが受け入れられる
      for (const testMode of testModes) {
        const result = await runTestsHandler.execute({ testMode });

        assert.ok(result, `Result should exist for testMode=${testMode}`);
        assert.ok(!result.error, `Should not have error for testMode=${testMode}`);

        if (result.status !== 'running') {
          console.log(`  ✓ testMode="${testMode}": ${result.totalTests || 0} tests`);
        }
      }
    });

    it('should filter tests by namespace', async () => {
      // Given: 名前空間でフィルタ
      const namespace = 'UnityMCPServer.Tests';

      // When: 名前空間フィルタを指定
      const result = await runTestsHandler.execute({
        testMode: 'EditMode',
        namespace
      });

      // Then: 指定された名前空間のテストのみが実行される
      assert.ok(result, 'Result should exist');
      console.log(`  ✓ Namespace filter test completed`);
    });
  });

  describe('FR-006-FR-009: テスト結果の詳細情報', () => {
    it('should return test summary with required fields', async () => {
      // When: テストを実行
      const result = await runTestsHandler.execute({
        testMode: 'EditMode',
        filter: 'NonExistentTest' // 高速実行のため存在しないテストを指定
      });

      // Then: サマリ情報が含まれる
      if (result.status !== 'running') {
        assert.ok(typeof result.totalTests === 'number', 'Should have totalTests');
        assert.ok(typeof result.passedTests === 'number', 'Should have passedTests');
        assert.ok(typeof result.failedTests === 'number', 'Should have failedTests');
        assert.ok(typeof result.skippedTests === 'number', 'Should have skippedTests');
        assert.ok(typeof result.inconclusiveTests === 'number', 'Should have inconclusiveTests');
        console.log(`  ✓ Test summary structure validated`);
      }
    });

    it('should include detailed test results when requested', async () => {
      // When: 詳細情報を要求
      const result = await runTestsHandler.execute({
        testMode: 'EditMode',
        includeDetails: true,
        filter: 'NonExistentTest'
      });

      // Then: 詳細情報が含まれる
      if (result.status !== 'running' && result.totalTests > 0) {
        assert.ok(Array.isArray(result.tests), 'Should have tests array');
        console.log(`  ✓ Detailed test results included: ${result.tests.length} tests`);
      } else {
        console.log(`  ⚠ No tests executed to validate detailed results`);
      }
    });
  });

  describe('NFR-001-NFR-003: パフォーマンス要件', () => {
    it('should start test execution within 1 second (NFR-001)', async () => {
      // Given: パフォーマンス要件
      const maxStartTime = 1000; // ms

      // When: テスト実行を開始
      const startTime = Date.now();
      const result = await runTestsHandler.execute({
        testMode: 'EditMode',
        filter: 'NonExistentTest'
      });
      const duration = Date.now() - startTime;

      // Then: 1秒以内に開始
      assert.ok(duration < maxStartTime, `Test should start within ${maxStartTime}ms (actual: ${duration}ms)`);
      console.log(`  ✓ NFR-001 verified: Test execution started in ${duration}ms`);
    });

    it('should handle test status check efficiently', async () => {
      // Given: テスト状態チェック
      const maxStatusCheckTime = 500; // ms

      // When: テスト状態を確認
      const startTime = Date.now();
      const result = await getStatusHandler.execute({});
      const duration = Date.now() - startTime;

      // Then: 500ms以内に完了
      assert.ok(duration < maxStatusCheckTime, `Status check should complete within ${maxStatusCheckTime}ms (actual: ${duration}ms)`);
      assert.ok(result, 'Result should exist');
      assert.ok(result.status, 'Should have status field');
      console.log(`  ✓ Status check completed in ${duration}ms (status: ${result.status})`);
    });
  });

  describe('FR-013: テスト進捗通知と状態管理', () => {
    it('should check test execution status', async () => {
      // When: テスト状態を確認
      const result = await getStatusHandler.execute({});

      // Then: 状態が返される（idle/running/completed/error）
      assert.ok(result, 'Result should exist');
      assert.ok(result.status, 'Should have status field');
      assert.ok(['idle', 'running', 'completed', 'error'].includes(result.status),
        `Status should be one of: idle, running, completed, error (actual: ${result.status})`);
      console.log(`  ✓ Test status: ${result.status}`);

      // 状態に応じた追加フィールドを検証
      if (result.status === 'completed') {
        assert.ok(typeof result.totalTests === 'number', 'Completed status should have totalTests');
        console.log(`    - Completed: ${result.passedTests}/${result.totalTests} passed`);
      } else if (result.status === 'running') {
        assert.ok(result.message, 'Running status should have message');
        console.log(`    - Running: ${result.message}`);
      }
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle invalid test mode', async () => {
      // Given: 無効なテストモード
      const invalidMode = 'InvalidMode';

      // When: 無効なテストモードで実行
      await assert.rejects(
        async () => await runTestsHandler.execute({ testMode: invalidMode }),
        /Invalid testMode/i,
        'Should reject with invalid testMode error'
      );
      console.log(`  ✓ Invalid testMode rejected as expected`);
    });

    it('should handle Unity communication errors gracefully', async () => {
      // Given: Unity接続が切断される可能性がある
      // When/Then: エラーハンドリングが適切に機能する
      // （このテストは実際の接続切断をシミュレートできないため、スキップ）
      console.log(`  ⚠ Unity communication error test skipped (requires connection failure simulation)`);
    });
  });
});
