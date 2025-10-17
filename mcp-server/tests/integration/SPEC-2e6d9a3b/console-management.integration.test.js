/**
 * Integration Tests for SPEC-2e6d9a3b: コンソール管理機能
 *
 * 前提条件:
 * - Unity Editorが起動している
 * - UnityMCPServerプロジェクトが開いている
 * - TCP接続がlocalhost:6400で待機している
 *
 * 実行方法:
 * npm run test:integration -- tests/integration/SPEC-2e6d9a3b/*.test.js
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UnityConnection } from '../../../src/core/unityConnection.js';
import { ReadConsoleToolHandler } from '../../../src/handlers/console/ReadConsoleToolHandler.js';
import { ClearConsoleToolHandler } from '../../../src/handlers/console/ClearConsoleToolHandler.js';

describe('SPEC-2e6d9a3b: コンソール管理機能 - Integration Tests', () => {
  let connection;
  let readHandler;
  let clearHandler;

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
    readHandler = new ReadConsoleToolHandler(connection);
    clearHandler = new ClearConsoleToolHandler(connection);
  });

  describe('FR-001: コンソールログの読み取り', () => {
    it('should read console logs from Unity', async () => {
      // Given: Unityにログが存在する（セットアップ不要、既存ログを使用）

      // When: ログを読み取る
      const result = await readHandler.execute({});

      // Then: ログが返される
      assert.ok(result, 'Result should exist');
      assert.ok(Array.isArray(result.logs), 'Should return logs array');
      assert.strictEqual(typeof result.totalCount, 'number', 'Should have totalCount');
      console.log(`  ✓ Read ${result.logs.length} logs (total: ${result.totalCount})`);
    });

    it('should return log objects with required properties', async () => {
      // When: ログを取得
      const result = await readHandler.execute({ count: 10 });

      // Then: 各ログが必要なプロパティを持つ
      if (result.logs.length > 0) {
        const log = result.logs[0];
        assert.ok('message' in log, 'Log should have message');
        assert.ok('type' in log, 'Log should have type');
        assert.ok('timestamp' in log, 'Log should have timestamp');
        console.log(`  ✓ Log structure validated: ${Object.keys(log).join(', ')}`);
      } else {
        console.log('  ⚠ No logs available to validate structure');
      }
    });
  });

  describe('FR-002: 最大件数の指定', () => {
    it('should respect count parameter (default 100)', async () => {
      // When: デフォルトでログ取得
      const result = await readHandler.execute({});

      // Then: 最大100件まで
      assert.ok(result.logs.length <= 100,
        `Should return max 100 logs, got ${result.logs.length}`);
      console.log(`  ✓ Default count limit respected: ${result.logs.length} logs`);
    });

    it('should limit logs to specified count (10)', async () => {
      // When: count=10で取得
      const result = await readHandler.execute({ count: 10 });

      // Then: 最大10件まで
      assert.ok(result.logs.length <= 10,
        `Should return max 10 logs, got ${result.logs.length}`);
      console.log(`  ✓ Count=10 limit respected: ${result.logs.length} logs`);
    });

    it('should handle maximum count of 1000', async () => {
      // When: count=1000で取得
      const result = await readHandler.execute({ count: 1000 });

      // Then: 最大1000件まで
      assert.ok(result.logs.length <= 1000,
        `Should return max 1000 logs, got ${result.logs.length}`);
      console.log(`  ✓ Count=1000 limit respected: ${result.logs.length} logs`);
    });

    it('should reject count below minimum (1)', async () => {
      // When/Then: count=0で拒否される
      await assert.rejects(
        async () => await readHandler.execute({ count: 0 }),
        /count.*1.*1000|invalid.*count/i,
        'Should reject count < 1'
      );
      console.log('  ✓ Count=0 rejected as expected');
    });

    it('should reject count above maximum (1000)', async () => {
      // When/Then: count=2000で拒否される
      await assert.rejects(
        async () => await readHandler.execute({ count: 2000 }),
        /count.*1.*1000|invalid.*count/i,
        'Should reject count > 1000'
      );
      console.log('  ✓ Count=2000 rejected as expected');
    });
  });

  describe('FR-003: ログタイプフィルタリング', () => {
    it('should filter by log type: Error', async () => {
      // When: エラーログのみ取得
      const result = await readHandler.execute({
        logTypes: ['Error'],
        count: 100
      });

      // Then: エラーログのみ返される（ログが存在する場合）
      if (result.logs.length > 0) {
        const allErrors = result.logs.every(log => log.type === 'Error');
        assert.ok(allErrors, 'All logs should be Error type');
        console.log(`  ✓ Error filter applied: ${result.logs.length} error logs`);
      } else {
        console.log('  ⚠ No error logs available to test filter');
      }
    });

    it('should filter by log type: Warning', async () => {
      // When: 警告ログのみ取得
      const result = await readHandler.execute({
        logTypes: ['Warning'],
        count: 100
      });

      // Then: 警告ログのみ返される（ログが存在する場合）
      if (result.logs.length > 0) {
        const allWarnings = result.logs.every(log => log.type === 'Warning');
        assert.ok(allWarnings, 'All logs should be Warning type');
        console.log(`  ✓ Warning filter applied: ${result.logs.length} warning logs`);
      } else {
        console.log('  ⚠ No warning logs available to test filter');
      }
    });

    it('should filter by log type: Info', async () => {
      // When: 情報ログのみ取得
      const result = await readHandler.execute({
        logTypes: ['Info'],
        count: 100
      });

      // Then: 情報ログのみ返される（ログが存在する場合）
      if (result.logs.length > 0) {
        const allInfo = result.logs.every(log => log.type === 'Info');
        assert.ok(allInfo, 'All logs should be Info type');
        console.log(`  ✓ Info filter applied: ${result.logs.length} info logs`);
      } else {
        console.log('  ⚠ No info logs available to test filter');
      }
    });

    it('should filter by multiple log types', async () => {
      // When: エラーと警告のみ取得
      const result = await readHandler.execute({
        logTypes: ['Error', 'Warning'],
        count: 100
      });

      // Then: エラーまたは警告のみ返される（ログが存在する場合）
      if (result.logs.length > 0) {
        const allErrorsOrWarnings = result.logs.every(log =>
          log.type === 'Error' || log.type === 'Warning'
        );
        assert.ok(allErrorsOrWarnings, 'All logs should be Error or Warning type');
        console.log(`  ✓ Multi-type filter applied: ${result.logs.length} logs`);
      } else {
        console.log('  ⚠ No error/warning logs available to test filter');
      }
    });
  });

  describe('FR-004: テキストフィルタリング', () => {
    it('should filter logs by text content (case insensitive)', async () => {
      // When: 特定のテキストを含むログを取得
      const result = await readHandler.execute({
        filterText: 'unity',
        count: 100
      });

      // Then: 全ログがテキストを含む（ログが存在する場合）
      if (result.logs.length > 0) {
        const allContainText = result.logs.every(log =>
          log.message.toLowerCase().includes('unity')
        );
        assert.ok(allContainText, 'All logs should contain "unity" (case insensitive)');
        console.log(`  ✓ Text filter applied: ${result.logs.length} logs contain "unity"`);
      } else {
        console.log('  ⚠ No logs matching "unity" found');
      }
    });
  });

  describe('FR-006: ソート順の指定', () => {
    it('should sort logs by newest first (default)', async () => {
      // When: デフォルト（newest）で取得
      const result = await readHandler.execute({ count: 10 });

      // Then: タイムスタンプが降順（ログが複数ある場合）
      if (result.logs.length >= 2) {
        const firstTimestamp = new Date(result.logs[0].timestamp);
        const lastTimestamp = new Date(result.logs[result.logs.length - 1].timestamp);
        assert.ok(firstTimestamp >= lastTimestamp,
          'First log should be newer than or equal to last log');
        console.log('  ✓ Logs sorted newest first');
      } else {
        console.log('  ⚠ Not enough logs to verify sort order');
      }
    });

    it('should sort logs by oldest first', async () => {
      // When: oldest で取得
      const result = await readHandler.execute({ count: 10, sortOrder: 'oldest' });

      // Then: タイムスタンプが昇順（ログが複数ある場合）
      if (result.logs.length >= 2) {
        const firstTimestamp = new Date(result.logs[0].timestamp);
        const lastTimestamp = new Date(result.logs[result.logs.length - 1].timestamp);
        assert.ok(firstTimestamp <= lastTimestamp,
          'First log should be older than or equal to last log');
        console.log('  ✓ Logs sorted oldest first');
      } else {
        console.log('  ⚠ Not enough logs to verify sort order');
      }
    });
  });

  describe('FR-007: 出力形式のサポート', () => {
    it('should support detailed format', async () => {
      // When: detailed形式で取得
      const result = await readHandler.execute({ count: 5, format: 'detailed' });

      // Then: 詳細情報を含む
      assert.ok(result.logs);
      console.log(`  ✓ Detailed format returned ${result.logs.length} logs`);
    });

    it('should support compact format', async () => {
      // When: compact形式で取得
      const result = await readHandler.execute({ count: 5, format: 'compact' });

      // Then: コンパクト形式
      assert.ok(result.logs);
      console.log(`  ✓ Compact format returned ${result.logs.length} logs`);
    });

    it('should support json format', async () => {
      // When: json形式で取得
      const result = await readHandler.execute({ count: 5, format: 'json' });

      // Then: JSON形式
      assert.ok(result.logs);
      console.log(`  ✓ JSON format returned ${result.logs.length} logs`);
    });

    it('should support plain format', async () => {
      // When: plain形式で取得
      const result = await readHandler.execute({ count: 5, format: 'plain' });

      // Then: プレーン形式
      assert.ok(result.logs);
      console.log(`  ✓ Plain format returned ${result.logs.length} logs`);
    });
  });

  describe('FR-010: コンソールのクリア', () => {
    it('should clear console logs', async () => {
      // Given: 現在のログ数を取得
      const beforeClear = await readHandler.execute({});
      const initialCount = beforeClear.totalCount;
      console.log(`  Initial log count: ${initialCount}`);

      // When: クリア実行
      const clearResult = await clearHandler.execute({});

      // Then: クリア成功
      assert.ok(clearResult.success, 'Clear should succeed');
      console.log('  ✓ Console cleared successfully');

      // Then: ログ数が減少または0
      const afterClear = await readHandler.execute({});
      assert.ok(afterClear.totalCount <= initialCount,
        `Log count should decrease or stay same: ${initialCount} -> ${afterClear.totalCount}`);
      console.log(`  ✓ Log count after clear: ${afterClear.totalCount}`);
    });
  });

  describe('FR-011: エラー保護オプション', () => {
    it('should preserve errors when clearing with preserveErrors=true', async () => {
      // Given: エラーログがあることを確認
      const errorLogs = await readHandler.execute({ logTypes: ['Error'] });
      const errorCount = errorLogs.logs.length;

      if (errorCount === 0) {
        console.log('  ⚠ No error logs to test preservation, skipping');
        return;
      }

      // When: エラー保護でクリア
      await clearHandler.execute({ preserveErrors: true });

      // Then: エラーログが残っている
      const afterClear = await readHandler.execute({ logTypes: ['Error'] });
      assert.strictEqual(afterClear.logs.length, errorCount,
        'Error logs should be preserved');
      console.log(`  ✓ ${errorCount} error logs preserved`);
    });
  });

  describe('NFR-001: パフォーマンス要件 - 2秒以内', () => {
    it('should complete log reading within 2 seconds (100 logs)', async () => {
      const startTime = Date.now();

      // When: 100件のログを取得
      await readHandler.execute({ count: 100 });

      const duration = Date.now() - startTime;

      // Then: 2秒以内に完了
      assert.ok(duration < 2000,
        `Should complete within 2000ms, took ${duration}ms`);
      console.log(`  ✓ Performance: ${duration}ms (< 2000ms threshold)`);
    });

    it('should complete log reading within 2 seconds (1000 logs)', async () => {
      const startTime = Date.now();

      // When: 1000件のログを取得
      await readHandler.execute({ count: 1000 });

      const duration = Date.now() - startTime;

      // Then: 2秒以内に完了
      assert.ok(duration < 2000,
        `Should complete within 2000ms for 1000 logs, took ${duration}ms`);
      console.log(`  ✓ Performance (1000 logs): ${duration}ms (< 2000ms threshold)`);
    });
  });

  describe('NFR-003: コンソールクリアは500ms以内', () => {
    it('should complete console clear within 500ms', async () => {
      const startTime = Date.now();

      // When: クリア実行
      await clearHandler.execute({});

      const duration = Date.now() - startTime;

      // Then: 500ms以内に完了
      assert.ok(duration < 500,
        `Should complete within 500ms, took ${duration}ms`);
      console.log(`  ✓ Clear performance: ${duration}ms (< 500ms threshold)`);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty console gracefully', async () => {
      // Given: コンソールをクリア
      await clearHandler.execute({});

      // When: ログ取得
      const result = await readHandler.execute({});

      // Then: 空の配列が返される（エラーにならない）
      assert.strictEqual(result.totalCount, 0, 'Total count should be 0');
      assert.strictEqual(result.logs.length, 0, 'Logs array should be empty');
      console.log('  ✓ Empty console handled gracefully');
    });

    it('should handle filter with no matches', async () => {
      // When: マッチしないフィルタでログ取得
      const result = await readHandler.execute({
        filterText: 'thisTextShouldNeverAppearInAnyLog12345',
        count: 100
      });

      // Then: 空の結果が返される（エラーにならない）
      assert.strictEqual(result.logs.length, 0, 'Should return empty array');
      console.log('  ✓ No-match filter handled gracefully');
    });

    it('should handle invalid log type filter', async () => {
      // When/Then: 無効なログタイプで拒否される
      await assert.rejects(
        async () => await readHandler.execute({ logTypes: ['InvalidType'] }),
        /invalid.*log.*type|unknown.*type/i,
        'Should reject invalid log type'
      );
      console.log('  ✓ Invalid log type rejected');
    });

    it('should handle invalid format', async () => {
      // When/Then: 無効な形式で拒否される
      await assert.rejects(
        async () => await readHandler.execute({ format: 'invalidFormat' }),
        /invalid.*format|unknown.*format/i,
        'Should reject invalid format'
      );
      console.log('  ✓ Invalid format rejected');
    });
  });
});
