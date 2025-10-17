# TDDワークフロー

Unity MCP ServerプロジェクトにおけるTest-Driven Development (TDD) の実践ガイド

## 概要

このプロジェクトでは、**テストファースト開発を絶対原則**としています。すべての新機能・バグ修正は、実装前にテストを書くことから始めます。

## Red-Green-Refactorサイクル

TDDの基本サイクルを厳格に遵守します：

### 1. RED（失敗するテストを書く）

**目的**: 何を実装するかを明確にする

```bash
# テストファイルを作成
touch mcp-server/tests/unit/handlers/NewFeatureToolHandler.test.js

# テストを実装（実装はまだ存在しない）
# → テストは必ず失敗する
npm test -- NewFeatureToolHandler.test.js
```

**チェックポイント**:

- ✅ テストが実行され、期待通りに**失敗**する
- ✅ 失敗理由が明確（"function not defined"、"returns undefined" など）
- ❌ テストをスキップしない
- ❌ 実装コードを先に書かない

**Git commit例**:

```bash
git add tests/unit/handlers/NewFeatureToolHandler.test.js
git commit -m "test(handler): NewFeatureToolHandlerのテスト追加 (RED)"
```

### 2. GREEN（最小限の実装でテスト合格）

**目的**: テストを通すための最小限のコードを書く

```bash
# ハンドラーの実装
touch mcp-server/src/handlers/NewFeatureToolHandler.js

# 最小限の実装でテスト合格
npm test -- NewFeatureToolHandler.test.js
# ✅ All tests passed
```

**チェックポイント**:

- ✅ すべてのテストが合格
- ✅ 実装は最小限（過剰な設計を避ける）
- ❌ リファクタリングをこの段階で行わない

**Git commit例**:

```bash
git add src/handlers/NewFeatureToolHandler.js
git commit -m "feat(handler): NewFeatureToolHandler実装 (GREEN)"
```

### 3. REFACTOR（コードをクリーンアップ）

**目的**: テストが通る状態を維持しながら、コード品質を向上

```bash
# リファクタリング実施
# - 重複コードの削除
# - 変数名の改善
# - 関数の分割

# テストが引き続き合格することを確認
npm test
```

**チェックポイント**:

- ✅ テストがすべて合格したまま
- ✅ コードが読みやすく、保守しやすい
- ✅ 重複が削除されている

**Git commit例**:

```bash
git add src/handlers/NewFeatureToolHandler.js
git commit -m "refactor(handler): NewFeatureToolHandlerをクリーンアップ"
```

## テストカテゴリと優先順位

### 1. Contract Tests（統合テスト）- 最優先

**目的**: API/インターフェースの契約を定義

**ディレクトリ**: `tests/integration/`

**タイミング**: 機能設計直後、実装前

```javascript
// tests/integration/NewFeatureTool.integration.test.js
import { test } from 'node:test';
import assert from 'node:assert';

test('NewFeatureTool should communicate with Unity correctly', async () => {
  // Unity接続を使った統合テスト（モック禁止）
  const handler = new NewFeatureToolHandler();
  const result = await handler.handle({ param: 'value' });

  assert.strictEqual(result.success, true);
});
```

**特徴**:

- 実Unity接続を使用（モック禁止）
- クリティカルパス100%カバレッジ
- `[P]`マーク付き（並列実行可能）

### 2. Integration Tests（統合テスト）

**目的**: コンポーネント間の連携を検証

**ディレクトリ**: `tests/integration/`

**例**:

- Unity通信レイヤーとハンドラー間の統合
- LSP統合テスト
- ファイルI/O統合

### 3. E2E Tests（エンドツーエンドテスト）

**目的**: ユーザーワークフローの完全な検証

**ディレクトリ**: `tests/e2e/`

**例**:

```javascript
// tests/e2e/create-gameobject-workflow.test.js
test('Complete GameObject creation workflow', async () => {
  // 1. Unity起動
  // 2. MCPサーバー接続
  // 3. GameObjectツール実行
  // 4. Hierarchy取得
  // 5. 検証
});
```

### 4. Unit Tests（ユニットテスト）

**目的**: 個別関数・クラスの動作を検証

**ディレクトリ**: `tests/unit/`

**カバレッジ目標**: 80%以上

**例**:

```javascript
// tests/unit/handlers/NewFeatureToolHandler.test.js
import { test } from 'node:test';
import assert from 'node:assert';

test('NewFeatureToolHandler validates input correctly', () => {
  const handler = new NewFeatureToolHandler();
  const result = handler.validateInput({ invalid: true });

  assert.strictEqual(result.valid, false);
});
```

## 実践例：新機能追加

### シナリオ: 「GameObject複製機能」を追加

#### ステップ1: Contract test作成（RED）

```bash
# テストファイル作成
cat > tests/integration/DuplicateGameObjectTool.integration.test.js <<'EOF'
import { test } from 'node:test';
import assert from 'node:assert';
import { DuplicateGameObjectToolHandler } from '../../src/handlers/DuplicateGameObjectToolHandler.js';

test('DuplicateGameObjectTool should duplicate GameObject in Unity', async () => {
  const handler = new DuplicateGameObjectToolHandler();

  const result = await handler.handle({
    path: '/TestObject',
    newName: 'TestObject_Copy'
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.duplicatedPath, '/TestObject_Copy');
});
EOF

# テスト実行（RED - 失敗するはず）
npm test -- DuplicateGameObjectTool.integration.test.js
# ❌ Error: Cannot find module 'DuplicateGameObjectToolHandler'

# コミット
git add tests/integration/DuplicateGameObjectTool.integration.test.js
git commit -m "test(integration): GameObject複製機能のContract test追加 (RED)"
```

#### ステップ2: ハンドラー実装（GREEN）

```bash
# ハンドラー実装
cat > src/handlers/DuplicateGameObjectToolHandler.js <<'EOF'
import { BaseToolHandler } from './base/BaseToolHandler.js';

export class DuplicateGameObjectToolHandler extends BaseToolHandler {
  async handle(params) {
    // 最小限の実装
    const result = await this.sendUnityCommand('duplicate_gameobject', params);
    return result;
  }
}
EOF

# テスト実行（GREEN - 合格するはず）
npm test -- DuplicateGameObjectTool.integration.test.js
# ✅ All tests passed

# コミット
git add src/handlers/DuplicateGameObjectToolHandler.js
git commit -m "feat(handler): GameObject複製ハンドラー実装 (GREEN)"
```

#### ステップ3: Unit test追加（RED → GREEN）

```bash
# Unit testファイル作成
cat > tests/unit/handlers/DuplicateGameObjectToolHandler.test.js <<'EOF'
import { test } from 'node:test';
import assert from 'node:assert';
import { DuplicateGameObjectToolHandler } from '../../../src/handlers/DuplicateGameObjectToolHandler.js';

test('validates path parameter', () => {
  const handler = new DuplicateGameObjectToolHandler();

  // RED: バリデーションはまだ実装していない
  const result = handler.validateInput({ path: '' });
  assert.strictEqual(result.valid, false);
});
EOF

# テスト実行（RED）
npm test -- DuplicateGameObjectToolHandler.test.js
# ❌ validateInput is not defined

git commit -am "test(unit): DuplicateGameObjectHandlerのバリデーションテスト追加 (RED)"

# バリデーション実装
# ... validateInput() メソッドを追加 ...

# テスト実行（GREEN）
npm test
# ✅ All tests passed

git commit -am "feat(handler): DuplicateGameObjectHandlerにバリデーション追加 (GREEN)"
```

#### ステップ4: リファクタリング

```bash
# コードクリーンアップ
# - 共通処理をBaseToolHandlerに移動
# - 変数名改善
# - コメント追加

# テストが引き続き合格
npm test
# ✅ All tests passed

git commit -am "refactor(handler): DuplicateGameObjectHandlerをクリーンアップ"
```

## CI/CDでの検証

### GitHub Actionsでの自動チェック

```yaml
# .github/workflows/test.yml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Check coverage threshold
  run: |
    # 80%未満で警告
    if [ $(coverage) -lt 80 ]; then
      echo "Warning: Coverage below 80%"
    fi
```

## よくある間違いと対策

### ❌ 間違い1: 実装を先に書く

```bash
# 悪い例
git log --oneline
a1b2c3d feat: GameObject複製機能実装
d4e5f6g test: GameObject複製のテスト追加  # ← テストが後！
```

**対策**: 常にテストコミットを先にする

### ❌ 間違い2: REDフェーズをスキップ

```javascript
// 悪い例：テストが最初から合格してしまう
test('should work', () => {
  // 実装が既に存在するため、最初から合格
  assert.strictEqual(alreadyImplemented(), true);
});
```

**対策**: テストを書いたら必ず実行し、失敗を確認する

### ❌ 間違い3: モックを使いすぎる

```javascript
// 悪い例：Integration testでモックを使用
test('Integration test with mock', async () => {
  const mockUnity = { send: () => ({ success: true }) };  // ❌
  // ...
});
```

**対策**: Integration testは実Unity接続を使用

## まとめ

- **RED → GREEN → REFACTOR**を厳格に遵守
- **テストが実装より先**のコミット順序
- **Contract test → Integration → E2E → Unit**の順序
- **実Unity接続**を使った統合テスト（モック禁止）
- **80%以上**のユニットテストカバレッジ

詳細は [`memory/constitution.md`](../../memory/constitution.md) を参照してください。
