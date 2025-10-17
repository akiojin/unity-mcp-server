# Unity実接続インテグレーションテストガイド

Unity MCP Serverの機能仕様書に基づいたインテグレーションテストの作成ガイド

## 概要

このガイドでは、実際にUnity Editorに接続してテストを実行するインテグレーションテストの作成方法を説明します。

### テストの種類

1. **Unit Tests** (`tests/unit/`) - モックを使用した単体テスト（Unity接続不要）
2. **Integration Tests** (`tests/integration/`) - Unity実接続テスト（Unity Editor起動必要）
3. **E2E Tests** (`tests/e2e/`) - エンドツーエンドシナリオテスト

## Unity実接続インテグレーションテストの前提条件

### 1. Unity Editorの起動

```bash
# Unity Editorを開く
# UnityMCPServerプロジェクトを開いておく
# TCP接続が localhost:6400 で待機していることを確認
```

### 2. 環境変数の設定（オプション）

```bash
export UNITY_HOST=localhost
export UNITY_PORT=6400
export NODE_ENV=test
```

### 3. テスト実行

```bash
# インテグレーションテストのみ実行
npm run test:integration

# 全テスト実行
npm run test

# カバレッジ付きテスト実行
npm run test:coverage
```

## 仕様書ベースのインテグレーションテスト設計

### テスト構造

各機能仕様書（`specs/SPEC-*/spec.md`）に対して、以下の構造でテストを作成します：

```
tests/integration/
├── SPEC-9d2bc43b/                    # Unity MCP基本接続機能
│   └── connection.integration.test.js
├── SPEC-3c9871b3/                    # GameObject/Scene管理
│   ├── gameobject-crud.integration.test.js
│   └── scene-management.integration.test.js
├── SPEC-5873e340/                    # Component管理
│   └── component-management.integration.test.js
└── ...
```

### テンプレート構造

```javascript
// tests/integration/SPEC-{id}/{feature}.integration.test.js
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { UnityConnection } from '../../src/core/unityConnection.js';
import { {Handler}ToolHandler } from '../../src/handlers/{path}/{Handler}ToolHandler.js';

describe('SPEC-{id}: {機能名} - Integration Tests', () => {
  let connection;
  let handler;
  const createdResources = []; // クリーンアップ用リソース追跡

  before(async () => {
    // Unity接続確立
    connection = new UnityConnection();
    await connection.connect();
    assert.ok(connection.connected, 'Unity connection should be established');
  });

  after(async () => {
    // リソースクリーンアップ
    for (const resource of createdResources.reverse()) {
      try {
        await resource.cleanup();
      } catch (error) {
        console.warn(`Cleanup failed for ${resource.name}:`, error.message);
      }
    }

    // 接続切断
    if (connection && connection.connected) {
      connection.disconnect();
    }
  });

  beforeEach(() => {
    handler = new {Handler}ToolHandler(connection);
  });

  describe('FR-001: {機能要件の説明}', () => {
    it('should {受け入れシナリオ1}', async () => {
      // Given: 前提条件
      const params = {
        // テストパラメータ
      };

      // When: 実行
      const result = await handler.execute(params);

      // Then: 検証
      assert.ok(result);
      assert.strictEqual(result.success, true);

      // クリーンアップ登録
      createdResources.push({
        name: 'test-resource',
        cleanup: async () => {
          // クリーンアップ処理
        }
      });
    });

    it('should handle edge case: {エッジケース}', async () => {
      // エッジケーステスト
      await assert.rejects(
        async () => await handler.execute({ /* invalid params */ }),
        /expected error pattern/i
      );
    });
  });

  describe('NFR-001: {非機能要件の説明}', () => {
    it('should complete within {X}ms', async () => {
      const startTime = Date.now();

      await handler.execute({ /* params */ });

      const duration = Date.now() - startTime;
      assert.ok(duration < 2000, `Should complete within 2000ms, took ${duration}ms`);
    });
  });
});
```

## 実装例: SPEC-2e6d9a3b（コンソール管理機能）

### 仕様書から要件を抽出

仕様書 `specs/SPEC-2e6d9a3b/spec.md` から：

- **FR-001**: ユーザーはコンソールログを読み取ることができる必要がある
- **FR-002**: システムは取得するログの最大件数を指定できる必要がある（1-1000、デフォルト100）
- **FR-003**: ユーザーはログタイプ（Info/Warning/Error/All）でフィルタリングできる必要がある
- **NFR-001**: ログ読み取りは2秒以内に完了する必要がある（1000件以下の場合）

### インテグレーションテスト実装

```javascript
// tests/integration/SPEC-2e6d9a3b/console-management.integration.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { UnityConnection } from '../../../src/core/unityConnection.js';
import { ReadConsoleToolHandler } from '../../../src/handlers/console/ReadConsoleToolHandler.js';
import { ClearConsoleToolHandler } from '../../../src/handlers/console/ClearConsoleToolHandler.js';

describe('SPEC-2e6d9a3b: コンソール管理機能 - Integration Tests', () => {
  let connection;
  let readHandler;
  let clearHandler;

  before(async () => {
    connection = new UnityConnection();
    await connection.connect();
    assert.ok(connection.connected, 'Unity connection should be established');
  });

  after(() => {
    if (connection && connection.connected) {
      connection.disconnect();
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
      assert.ok(result);
      assert.ok(Array.isArray(result.logs), 'Should return logs array');
      assert.strictEqual(typeof result.totalCount, 'number');
    });
  });

  describe('FR-002: 最大件数の指定', () => {
    it('should respect count parameter (default 100)', async () => {
      // When: デフォルトでログ取得
      const result = await readHandler.execute({});

      // Then: 最大100件まで
      assert.ok(result.logs.length <= 100);
    });

    it('should limit logs to specified count', async () => {
      // When: count=10で取得
      const result = await readHandler.execute({ count: 10 });

      // Then: 最大10件まで
      assert.ok(result.logs.length <= 10);
    });

    it('should handle maximum count of 1000', async () => {
      // When: count=1000で取得
      const result = await readHandler.execute({ count: 1000 });

      // Then: 最大1000件まで
      assert.ok(result.logs.length <= 1000);
    });
  });

  describe('FR-003: ログタイプフィルタリング', () => {
    it('should filter by log type: Error', async () => {
      // When: エラーログのみ取得
      const result = await readHandler.execute({
        logTypes: ['Error']
      });

      // Then: エラーログのみ返される
      assert.ok(result.logs.every(log => log.type === 'Error'));
    });

    it('should filter by log type: Warning', async () => {
      // When: 警告ログのみ取得
      const result = await readHandler.execute({
        logTypes: ['Warning']
      });

      // Then: 警告ログのみ返される
      assert.ok(result.logs.every(log => log.type === 'Warning'));
    });

    it('should filter by multiple log types', async () => {
      // When: エラーと警告のみ取得
      const result = await readHandler.execute({
        logTypes: ['Error', 'Warning']
      });

      // Then: エラーまたは警告のみ返される
      assert.ok(result.logs.every(log =>
        log.type === 'Error' || log.type === 'Warning'
      ));
    });
  });

  describe('FR-010: コンソールのクリア', () => {
    it('should clear console logs', async () => {
      // Given: ログが存在する
      const beforeClear = await readHandler.execute({});
      const initialCount = beforeClear.totalCount;

      // When: クリア実行
      const clearResult = await clearHandler.execute({});

      // Then: クリア成功
      assert.ok(clearResult.success);

      // Then: ログ数が減少（または0）
      const afterClear = await readHandler.execute({});
      assert.ok(afterClear.totalCount <= initialCount);
    });
  });

  describe('NFR-001: パフォーマンス要件 - 2秒以内', () => {
    it('should complete log reading within 2 seconds (1000 logs)', async () => {
      const startTime = Date.now();

      // When: 1000件のログを取得
      await readHandler.execute({ count: 1000 });

      const duration = Date.now() - startTime;

      // Then: 2秒以内に完了
      assert.ok(duration < 2000,
        `Should complete within 2000ms, took ${duration}ms`
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty console', async () => {
      // Given: コンソールをクリア
      await clearHandler.execute({});

      // When: ログ取得
      const result = await readHandler.execute({});

      // Then: 空の配列が返される
      assert.strictEqual(result.totalCount, 0);
      assert.strictEqual(result.logs.length, 0);
    });

    it('should handle invalid count parameter', async () => {
      // When: 無効なcount（範囲外）
      await assert.rejects(
        async () => await readHandler.execute({ count: 2000 }),
        /count.*1.*1000/i
      );
    });
  });
});
```

## ベストプラクティス

### 1. リソースクリーンアップの徹底

```javascript
describe('GameObject CRUD', () => {
  const createdObjects = [];

  after(async () => {
    // 作成したGameObjectを削除
    for (const obj of createdObjects.reverse()) {
      try {
        await deleteGameObject({ path: obj.path });
      } catch (error) {
        console.warn(`Failed to cleanup ${obj.path}:`, error.message);
      }
    }
  });

  it('should create GameObject', async () => {
    const result = await createGameObject({ name: 'TestCube' });
    createdObjects.push(result); // クリーンアップ登録
  });
});
```

### 2. Unity接続のエラーハンドリング

```javascript
before(async () => {
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
});
```

### 3. テストの独立性

```javascript
describe('Multiple tests', () => {
  // ❌ 悪い例: テスト間で状態を共有
  let sharedObject;
  it('test 1', async () => {
    sharedObject = await createGameObject({ name: 'Shared' });
  });
  it('test 2', async () => {
    await modifyGameObject(sharedObject.path, { /* ... */ }); // test 1に依存
  });

  // ✅ 良い例: 各テストが独立
  it('test 1', async () => {
    const obj = await createGameObject({ name: 'Test1' });
    // テスト内で完結
    await deleteGameObject({ path: obj.path });
  });
  it('test 2', async () => {
    const obj = await createGameObject({ name: 'Test2' });
    // 別のテストに依存しない
    await deleteGameObject({ path: obj.path });
  });
});
```

### 4. パフォーマンステスト

```javascript
describe('NFR-001: Performance', () => {
  it('should complete within specified time', async () => {
    const startTime = Date.now();

    await handler.execute({ /* params */ });

    const duration = Date.now() - startTime;
    const threshold = 2000; // 2秒

    assert.ok(duration < threshold,
      `Expected < ${threshold}ms, actual: ${duration}ms`
    );

    // パフォーマンスログ出力（オプション）
    console.log(`✓ Performance: ${duration}ms (< ${threshold}ms)`);
  });
});
```

### 5. エッジケースの網羅

```javascript
describe('Edge Cases', () => {
  it('should handle empty input', async () => {
    await assert.rejects(
      async () => await handler.execute({}),
      /required/i
    );
  });

  it('should handle null values', async () => {
    await assert.rejects(
      async () => await handler.execute({ name: null }),
      /invalid/i
    );
  });

  it('should handle very long strings', async () => {
    const longName = 'a'.repeat(1000);
    await assert.rejects(
      async () => await handler.execute({ name: longName }),
      /too long/i
    );
  });
});
```

## 実行とデバッグ

### テスト実行

```bash
# 特定の仕様書のテストを実行
npm run test:integration -- tests/integration/SPEC-2e6d9a3b/*.test.js

# 詳細ログ付きで実行
VERBOSE_TEST=true npm run test:integration

# ウォッチモードで実行
npm run test:watch -- tests/integration/SPEC-2e6d9a3b/*.test.js
```

### デバッグ

```javascript
import { logger } from '../../src/core/config.js';

describe('Debug test', () => {
  it('should debug Unity command', async () => {
    logger.debug('Sending command to Unity...');
    const result = await connection.sendCommand('ping', {});
    logger.debug('Result:', result);
  });
});
```

## CI/CDインテグレーション

### GitHub Actions

```yaml
# .github/workflows/integration-test.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      # Unity Editorのインストール（Linux版）
      - name: Setup Unity
        uses: game-ci/unity-builder@v2
        with:
          targetPlatform: StandaloneLinux64
          unityVersion: 2020.3.48f1

      # Unity Editorをバックグラウンドで起動
      - name: Start Unity Editor
        run: |
          unity-editor -batchmode -projectPath UnityMCPServer &
          sleep 30 # Unityの起動待機

      - name: Install dependencies
        run: cd mcp-server && npm ci

      - name: Run integration tests
        run: cd mcp-server && npm run test:integration
```

## まとめ

- 各機能仕様書（SPEC-*）に対応するインテグレーションテストを作成
- 機能要件（FR-*）と非機能要件（NFR-*）を網羅的にテスト
- Unity実接続テストには前提条件（Unity Editor起動）が必要
- リソースクリーンアップとテストの独立性を確保
- パフォーマンステストとエッジケーステストも含める

詳細は以下も参照：
- [`test-coverage-strategy.md`](test-coverage-strategy.md) - カバレッジ目標と測定
- [`tdd-workflow.md`](tdd-workflow.md) - TDD開発フロー
- [`../../memory/constitution.md`](../../memory/constitution.md) - 開発原則
