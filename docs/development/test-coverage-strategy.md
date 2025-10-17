# テストカバレッジ戦略

Unity MCP Serverプロジェクトにおけるテストカバレッジの目標、測定方法、改善戦略

## カバレッジ目標

### カテゴリ別カバレッジ

| テストカテゴリ | カバレッジ目標 | 対象範囲 | 優先度 |
|--------------|--------------|---------|-------|
| **Unit Tests** | **80%以上** | すべてのコード | 高 |
| **Integration Tests** | **100%** | クリティカルパス | 最高 |
| **E2E Tests** | **100%** | 主要ユーザーワークフロー | 高 |
| **Performance Tests** | N/A | レスポンスタイムベンチマーク | 中 |

### コンポーネント別カバレッジ

| コンポーネント | 目標カバレッジ | 理由 |
|--------------|---------------|------|
| **Handlers** (`src/handlers/`) | 90%以上 | MCPツールの中核、エラーハンドリングが重要 |
| **Tools** (`src/tools/`) | 85%以上 | Unity通信ロジック、信頼性が重要 |
| **Core** (`src/core/`) | 95%以上 | 接続管理、設定、ログ - システムの基盤 |
| **Utils** (`src/utils/`) | 80%以上 | ヘルパー関数、一般的な変換処理 |

## カバレッジ測定

### ツール

- **カバレッジエンジン**: [c8](https://github.com/bcoe/c8) (Node.js native code coverage)
- **テストフレームワーク**: Node.js `node:test` (標準テストランナー)

### カバレッジコマンド

```bash
# すべてのテストを実行してカバレッジ計測
npm run test:coverage

# 特定のカテゴリのカバレッジ
npm run test:coverage -- tests/unit/**/*.test.js
npm run test:coverage -- tests/integration/**/*.test.js

# HTML レポート生成
npm run test:coverage -- --reporter=html
```

### カバレッジレポートの読み方

c8の出力例：

```
----------------------|---------|----------|---------|---------|-------------------
File                  | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------------|---------|----------|---------|---------|-------------------
All files             |   82.5  |   76.3   |   88.1  |   82.5  |
 handlers/            |   89.2  |   81.4   |   92.3  |   89.2  |
  BaseToolHandler.js  |   95.0  |   87.5   |  100.0  |   95.0  | 45-48
  CreateGameObject... |   87.3  |   78.9   |   90.0  |   87.3  | 23,67-72
 tools/               |   78.1  |   68.2   |   82.5  |   78.1  |
  unityCommands.js    |   75.0  |   65.0   |   80.0  |   75.0  | 120-135,178
----------------------|---------|----------|---------|---------|-------------------
```

**重要な指標**:

- **% Stmts** (Statements): 実行された文の割合
- **% Branch** (Branches): 実行された分岐（if/switch等）の割合
- **% Funcs** (Functions): 実行された関数の割合
- **% Lines**: 実行された行の割合
- **Uncovered Line #s**: カバーされていない行番号

## カバレッジ戦略

### 1. クリティカルパス優先

**定義**: ユーザーが最も頻繁に使用する機能

**対象**:

- GameObject作成/変更/削除
- シーン読み込み/保存
- Unity接続管理
- ログ読み取り

**要件**:

- Integration test: 100%カバレッジ
- Unit test: 95%以上
- E2E test: 主要ワークフロー100%

**例**:

```javascript
// tests/integration/critical-path/CreateGameObjectWorkflow.integration.test.js
import { test } from 'node:test';
import assert from 'node:assert';

test('[Critical Path] Complete GameObject creation workflow', async () => {
  // 1. Unity接続確立
  const connection = await establishUnityConnection();
  assert.ok(connection.isConnected);

  // 2. GameObject作成
  const handler = new CreateGameObjectToolHandler();
  const result = await handler.handle({ name: 'TestObject' });
  assert.strictEqual(result.success, true);

  // 3. Hierarchy取得して検証
  const hierarchy = await getHierarchy();
  assert.ok(hierarchy.find(obj => obj.name === 'TestObject'));

  // 4. クリーンアップ
  await deleteGameObject({ path: '/TestObject' });
});
```

### 2. エッジケースと例外処理

**目的**: エラーハンドリングの堅牢性を保証

**対象**:

- 不正な入力パラメータ
- Unity接続エラー
- タイムアウト
- JSON-RPCエラー

**要件**:

- すべてのエラーパスをテスト
- エラーメッセージの検証
- エラーリカバリーの検証

**例**:

```javascript
// tests/unit/handlers/CreateGameObjectToolHandler.test.js
import { test } from 'node:test';
import assert from 'node:assert';

test('handles invalid name parameter', () => {
  const handler = new CreateGameObjectToolHandler();

  const result = handler.validateInput({ name: '' });

  assert.strictEqual(result.valid, false);
  assert.match(result.error, /name.*required/i);
});

test('handles Unity connection timeout', async () => {
  const handler = new CreateGameObjectToolHandler();

  // Unity接続タイムアウトをシミュレート
  await assert.rejects(
    async () => {
      await handler.handle({ name: 'TestObject' }, { timeout: 1 });
    },
    /timeout/i
  );
});
```

### 3. レグレッション防止

**目的**: 過去のバグの再発を防止

**プロセス**:

1. バグ発見
2. **バグを再現するテストを作成（RED）**
3. バグ修正（GREEN）
4. リファクタリング
5. テストをリグレッションスイートに追加

**例**:

```javascript
// tests/unit/regression/issue-123-duplicate-gameobject.test.js
import { test } from 'node:test';
import assert from 'node:assert';

// Issue #123: GameObject複製時に親子関係が保持されない
test('Regression: GameObject duplication preserves parent-child relationship', async () => {
  const handler = new DuplicateGameObjectToolHandler();

  const result = await handler.handle({
    path: '/Parent/Child',
    newName: 'Child_Copy'
  });

  assert.strictEqual(result.duplicatedPath, '/Parent/Child_Copy');
  assert.strictEqual(result.parent, '/Parent');  // 親が保持されている
});
```

### 4. ブランチカバレッジの向上

**目的**: すべての条件分岐を網羅

**戦略**:

- すべての`if`文の両方のブランチをテスト
- `switch`文のすべてのケースをテスト
- 三項演算子の両方の結果をテスト

**例**:

```javascript
// src/handlers/BaseToolHandler.js
validateInput(params) {
  if (!params.name) {
    return { valid: false, error: 'Name is required' };
  }

  if (params.name.length > 100) {
    return { valid: false, error: 'Name too long' };
  }

  return { valid: true };
}

// tests/unit/handlers/BaseToolHandler.test.js
test('validates missing name', () => {
  const result = handler.validateInput({});
  assert.strictEqual(result.valid, false);  // Branch 1
});

test('validates name too long', () => {
  const result = handler.validateInput({ name: 'a'.repeat(101) });
  assert.strictEqual(result.valid, false);  // Branch 2
});

test('validates valid name', () => {
  const result = handler.validateInput({ name: 'ValidName' });
  assert.strictEqual(result.valid, true);  // Branch 3
});
```

## CI/CDでの自動検証

### GitHub Actions統合

```yaml
# .github/workflows/test.yml
name: Test Coverage

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Check coverage threshold
        run: |
          COVERAGE=$(npm run test:coverage -- --reporter=json | jq '.coverage.total.statements.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "❌ Coverage $COVERAGE% is below 80% threshold"
            exit 1
          else
            echo "✅ Coverage $COVERAGE% meets 80% threshold"
          fi

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

### プルリクエスト時のチェック

```yaml
# .github/workflows/pr-check.yml
name: PR Coverage Check

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  coverage-diff:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout base branch
        uses: actions/checkout@v3
        with:
          ref: ${{ github.base_ref }}

      - name: Run coverage on base
        run: |
          npm ci
          npm run test:coverage
          mv coverage/coverage-summary.json coverage-base.json

      - name: Checkout PR branch
        uses: actions/checkout@v3

      - name: Run coverage on PR
        run: |
          npm ci
          npm run test:coverage
          mv coverage/coverage-summary.json coverage-pr.json

      - name: Compare coverage
        run: |
          BASE=$(jq '.total.statements.pct' coverage-base.json)
          PR=$(jq '.total.statements.pct' coverage-pr.json)
          DIFF=$(echo "$PR - $BASE" | bc)

          echo "Base coverage: $BASE%"
          echo "PR coverage: $PR%"
          echo "Diff: $DIFF%"

          if (( $(echo "$DIFF < 0" | bc -l) )); then
            echo "❌ Coverage decreased by $DIFF%"
            exit 1
          fi
```

## カバレッジギャップの特定と対処

### 1. カバレッジレポートの分析

```bash
# HTML レポート生成
npm run test:coverage -- --reporter=html

# coverage/index.html をブラウザで開く
open coverage/index.html
```

### 2. 未カバー領域の優先順位付け

**高優先度**:

- クリティカルパスの未カバー分岐
- エラーハンドリングの未テスト部分
- Unity通信の未カバーコマンド

**中優先度**:

- ユーティリティ関数の一部ブランチ
- ログ出力の条件分岐
- パフォーマンス最適化コード

**低優先度**:

- デバッグ専用コード
- 到達不可能なエラーケース

### 3. カバレッジ改善のアクション

```javascript
// 例: 未カバーのエラーハンドリングを発見
// coverage/index.html で handlers/CreateGameObjectToolHandler.js:67-72 が赤色

// src/handlers/CreateGameObjectToolHandler.js:67-72
async handle(params) {
  try {
    return await this.sendUnityCommand('create_gameobject', params);
  } catch (error) {
    // 67-72行目: この部分が未カバー
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Unity is not running');
    }
    throw error;
  }
}

// テストを追加してカバレッジ向上
// tests/unit/handlers/CreateGameObjectToolHandler.test.js
test('handles Unity connection refused error', async () => {
  const handler = new CreateGameObjectToolHandler();

  // Unity接続拒否をシミュレート
  await assert.rejects(
    async () => {
      await handler.handle({ name: 'Test' });
    },
    /Unity is not running/
  );
});

// カバレッジ再測定
npm run test:coverage
// ✅ handlers/CreateGameObjectToolHandler.js: 95.0% → 98.5%
```

## カバレッジ例外

### カバレッジ目標から除外する項目

以下のコードはカバレッジ計算から除外できます（正当な理由がある場合のみ）：

1. **デバッグコード**:

   ```javascript
   /* c8 ignore start */
   if (process.env.DEBUG) {
     console.log('Debug info:', data);
   }
   /* c8 ignore stop */
   ```

2. **到達不可能なエラーケース**:

   ```javascript
   // 型安全性が保証されている場合
   /* c8 ignore next 3 */
   default:
     throw new Error('Unreachable');
   ```

3. **サードパーティライブラリのラッパー**（最小限の場合のみ）

**注意**: カバレッジ除外は濫用しない。すべての除外は文書化し、正当な理由を記載する。

## まとめ

- **Unit tests: 80%以上**、**Integration tests: 100%**のカバレッジ目標
- **c8**でカバレッジ測定、HTML/JSONレポート生成
- **クリティカルパス優先**でカバレッジを段階的に改善
- **CI/CD**でカバレッジ自動チェック、80%未満でビルド失敗
- **カバレッジギャップ分析**で優先順位付けして対処

詳細は [`memory/constitution.md`](../../memory/constitution.md) および [`tdd-workflow.md`](tdd-workflow.md) を参照してください。
