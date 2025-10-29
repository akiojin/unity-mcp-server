# 実装計画: コードインデックスビルドのバックグラウンド実行

**機能ID**: `SPEC-yt3ikddd` | **日付**: 2025-10-29 | **仕様**: [spec.md](./spec.md)
**入力**: `/specs/SPEC-yt3ikddd/spec.md`の機能仕様

## 実行フロー (/speckit.plan コマンドのスコープ)
```
1. 入力パスから機能仕様を読み込み ✅
2. 技術コンテキストを記入 ✅
3. 憲章チェックセクションを評価 → 進行中
4. Phase 0 を実行 → research.md
5. Phase 1 を実行 → data-model.md, contracts/, quickstart.md
6. 憲章チェックセクションを再評価
7. Phase 2 を計画 → タスク生成アプローチを記述
8. 停止 - /speckit.tasks コマンドの準備完了
```

## 概要

現在のcode_index_buildは2分以上かかるブロッキング処理であり、開発者は完了まで待機する必要がある。本機能では、バックグラウンドジョブ化によりビルド開始後即座に制御を返し、既存のscript_index_statusツールで進捗を確認できるようにする。

既存のコードインデックスビルド機能は、Promise.allによるWorkerプールパターンで並列実行されているが、MCPツール呼び出しがブロックされる問題がある。本計画では、軽量なメモリ内JobManagerを導入し、ビルドをバックグラウンドで実行しながら進捗情報を共有する。

## 技術コンテキスト
**言語/バージョン**: Node.js 18+ (ESM)
**主要依存関係**: better-sqlite3 (既存), MCP SDK
**ストレージ**: SQLite (code-index.db - 既存), メモリ内ジョブ管理
**テスト**: Vitest (既存のテストフレームワーク)
**対象プラットフォーム**: Linux/macOS/Windows (WSL2含む)
**プロジェクトタイプ**: single (MCPサーバー)
**パフォーマンス目標**: ビルド開始1秒以内にレスポンス、進捗更新500ms間隔
**制約**: 同時ビルドジョブ1つのみ、メモリ内ジョブ管理（永続化なし）
**スケール/スコープ**: 10,000+ファイル、2分以上のビルド時間

## 憲章チェック
*ゲート: Phase 0 research前に合格必須。Phase 1 design後に再チェック。*

**シンプルさ**:
- プロジェクト数: 1 (mcp-server) ✅
- フレームワークを直接使用? Yes - MCP SDK直接使用 ✅
- 単一データモデル? Yes - JobとIndexStatsのみ ✅
- パターン回避? Yes - シンプルなJobManager、Repository/UoWなし ✅

**アーキテクチャ**:
- すべての機能をライブラリとして? Yes - ハンドラーベースアーキテクチャ遵守 ✅
- ライブラリリスト:
  - `handlers/script/` - MCPツールハンドラ (BaseToolHandler継承)
  - `core/` - ジョブ管理、インデックス管理、設定
- ライブラリごとのCLI: MCPツールとして公開 (CLIは不要) ✅
- ライブラリドキュメント: README.md, CLAUDE.md (既存) ✅

**テスト (妥協不可)**:
- RED-GREEN-Refactorサイクルを強制? Yes - TDD必須 ✅
- Gitコミットはテストが実装より先に表示? Yes - 厳守 ✅
- 順序: Contract→Integration→E2E→Unitを厳密に遵守? Yes ✅
- 実依存関係を使用? Yes - 実SQLite、モックなし ✅
- Integration testの対象: 新JobManager、既存ハンドラ拡張 ✅
- 禁止: テスト前の実装、REDフェーズのスキップ ✅

**可観測性**:
- 構造化ロギング含む? Yes - logger経由、jobId/status/progressを記録 ✅
- フロントエンドログ → バックエンド? N/A (サーバーのみ)
- エラーコンテキスト十分? Yes - エラー発生時jobにerrorフィールド記録 ✅

**バージョニング**:
- バージョン番号割り当て済み? 次回npm version minor (新機能) ✅
- 変更ごとにBUILDインクリメント? Yes ✅
- 破壊的変更を処理? No - script_index_statusの下位互換性維持 ✅

## プロジェクト構造

### ドキュメント (この機能)
```
specs/SPEC-yt3ikddd/
├── spec.md              # 機能仕様 (完了)
├── plan.md              # このファイル (/speckit.plan コマンド出力)
├── research.md          # Phase 0 出力 (作成予定)
├── data-model.md        # Phase 1 出力 (作成予定)
├── quickstart.md        # Phase 1 出力 (作成予定)
├── contracts/           # Phase 1 出力 (作成予定)
└── tasks.md             # Phase 2 出力 (/speckit.tasks コマンド)
```

### ソースコード (リポジトリルート)
```
mcp-server/
├── src/
│   ├── core/
│   │   ├── jobManager.js          # 新規: メモリ内ジョブ管理
│   │   ├── codeIndex.js           # 既存: SQLiteインデックス
│   │   ├── indexWatcher.js        # 変更: JobManager統合
│   │   └── config.js              # 既存: 設定管理
│   ├── handlers/
│   │   ├── base/
│   │   │   └── BaseToolHandler.js # 既存: ハンドラ基底クラス
│   │   └── script/
│   │       ├── CodeIndexBuildToolHandler.js    # 変更: バックグラウンド化
│   │       └── ScriptIndexStatusToolHandler.js # 変更: buildJob追加
│   └── lsp/
│       └── LspRpcClient.js        # 既存: LSP通信
└── tests/
    ├── unit/
    │   ├── core/
    │   │   └── jobManager.test.js # 新規: JobManagerテスト
    │   └── handlers/script/
    │       ├── CodeIndexBuildToolHandler.test.js    # 変更
    │       └── ScriptIndexStatusToolHandler.test.js # 変更
    └── integration/
        └── code-index-background.test.js # 新規: E2Eテスト
```

**構造決定**: 単一プロジェクト (MCPサーバー) - ハンドラーベースアーキテクチャ遵守

## Phase 0: アウトライン＆リサーチ

### 技術リサーチタスク

1. **Node.jsバックグラウンドジョブパターン**
   - 調査: Promise非同期実行パターン
   - 調査: EventEmitter vs オブジェクト参照での進捗共有
   - 調査: Worker Threads vs 単一スレッド非同期

2. **メモリ内ジョブ管理 vs 永続化**
   - 調査: シンプルさ vs 復元可能性のトレードオフ
   - 調査: サーバー再起動時の動作
   - 調査: メモリリーク防止策（自動クリーンアップ）

3. **IndexWatcherとの統合**
   - 調査: 手動ビルドと自動ビルドの競合回避パターン
   - 調査: 既存の`running`フラグとの統合
   - 調査: ジョブIDの命名規則（`build-xxx` vs `watcher-xxx`）

4. **既存ハンドラの拡張パターン**
   - 調査: BaseToolHandlerの変更なしでの拡張
   - 調査: script_index_statusの下位互換性維持
   - 調査: エラーハンドリング（LSP起動失敗、ファイルアクセスエラー）

### リサーチ結果の統合 (research.md作成)

**決定事項**:
- **ジョブ管理**: メモリ内Map（外部依存なし、シンプル）
- **進捗共有**: オブジェクト参照（EventEmitter不要）
- **並行制御**: 1ビルドジョブのみ許可（競合回避）
- **自動クリーンアップ**: 完了5分後に削除（メモリリーク防止）
- **IndexWatcher統合**: ジョブマネージャで実行中チェック

**検討した代替案**:
- Worker Threads: オーバースペック（I/Oバウンド処理）
- SQLite永続化: 不要（ビルドは数分で完了、再起動稀）
- EventEmitter: 不要（進捗はオブジェクト参照で十分）

**出力**: `research.md` (次のステップで作成)

## Phase 1: 設計＆契約
*前提条件: research.md完了*

### 1. データモデル設計 (data-model.md)

**エンティティ1: BuildJob**
- `id`: string - ジョブID（例: `build-1730188800000-abc123`）
- `status`: 'running' | 'completed' | 'failed'
- `progress`: object
  - `processed`: number - 処理済みファイル数
  - `total`: number - 全ファイル数
  - `rate`: number - 処理速度（files/sec）
- `result`: object | null - 完了時の結果
  - `updatedFiles`: number
  - `removedFiles`: number
  - `totalIndexedSymbols`: number
  - `lastIndexedAt`: string (ISO 8601)
- `error`: string | null - エラーメッセージ
- `startedAt`: string (ISO 8601)
- `completedAt`: string (ISO 8601) | null
- `failedAt`: string (ISO 8601) | null

**エンティティ2: IndexStats (既存)**
- `total`: number - 総シンボル数
- `lastIndexedAt`: string (ISO 8601)

**関係**:
- BuildJob → IndexStats: ビルド完了時に更新

**検証ルール**:
- `status`は3値のみ許可
- `progress.processed` ≤ `progress.total`
- `status='completed'`の場合`result`必須
- `status='failed'`の場合`error`必須

**状態遷移**:
```
running → completed (成功時)
running → failed (エラー時)
```

### 2. API契約設計 (contracts/)

**契約1: code_index_build (変更)**

リクエスト:
```json
{
  "concurrency": 8,
  "retry": 2,
  "reportEvery": 100
}
```

レスポンス (成功):
```json
{
  "success": true,
  "message": "Code index build started in background",
  "jobId": "build-1730188800000-abc123",
  "checkStatus": "Use script_index_status to check progress"
}
```

レスポンス (既に実行中):
```json
{
  "success": false,
  "error": "build_already_running",
  "message": "Code index build is already in progress",
  "jobId": "build-1730188800000-existing"
}
```

**契約2: script_index_status (拡張)**

レスポンス (ビルド実行中):
```json
{
  "success": true,
  "totalFiles": 1500,
  "indexedFiles": 1450,
  "coverage": 0.967,
  "breakdown": { "assets": 500, "packages": 800, "packageCache": 100, "other": 50 },
  "index": {
    "ready": true,
    "rows": 15000,
    "lastIndexedAt": "2025-10-29T10:00:00Z",
    "buildJob": {
      "id": "build-1730188800000-abc123",
      "status": "running",
      "progress": {
        "processed": 1200,
        "total": 1500,
        "rate": 12.5
      },
      "startedAt": "2025-10-29T10:00:00Z"
    }
  }
}
```

レスポンス (ビルド完了):
```json
{
  "success": true,
  "totalFiles": 1500,
  "indexedFiles": 1500,
  "coverage": 1.0,
  "breakdown": { "assets": 500, "packages": 850, "packageCache": 100, "other": 50 },
  "index": {
    "ready": true,
    "rows": 15500,
    "lastIndexedAt": "2025-10-29T10:05:00Z",
    "buildJob": {
      "id": "build-1730188800000-abc123",
      "status": "completed",
      "progress": {
        "processed": 1500,
        "total": 1500,
        "rate": 15.2
      },
      "startedAt": "2025-10-29T10:00:00Z",
      "completedAt": "2025-10-29T10:05:00Z",
      "result": {
        "updatedFiles": 50,
        "removedFiles": 0,
        "totalIndexedSymbols": 15500,
        "lastIndexedAt": "2025-10-29T10:05:00Z"
      }
    }
  }
}
```

レスポンス (下位互換 - ビルドジョブなし):
```json
{
  "success": true,
  "totalFiles": 1500,
  "indexedFiles": 1500,
  "coverage": 1.0,
  "breakdown": { "assets": 500, "packages": 850, "packageCache": 100, "other": 50 },
  "index": {
    "ready": true,
    "rows": 15500,
    "lastIndexedAt": "2025-10-29T09:00:00Z"
  }
}
```

### 3. 契約テスト生成

**テストファイル**: `tests/unit/handlers/script/CodeIndexBuildToolHandler.test.js`

テストシナリオ:
- ビルド開始時に即座にjobIdを返す
- 既に実行中の場合は既存jobIdを返す
- バックグラウンドで処理が継続される
- 進捗情報がJobManagerに更新される

**テストファイル**: `tests/unit/handlers/script/ScriptIndexStatusToolHandler.test.js`

テストシナリオ:
- 実行中ジョブの進捗情報を含むレスポンス
- 完了ジョブの結果情報を含むレスポンス
- ジョブがない場合は従来のレスポンス（下位互換性）

**テストファイル**: `tests/unit/core/jobManager.test.js`

テストシナリオ:
- ジョブ作成とバックグラウンド実行
- ジョブ状態取得
- ジョブ完了時の結果保存
- ジョブ失敗時のエラー保存
- 自動クリーンアップ

### 4. ユーザーストーリーからテストシナリオ抽出

**US-1: 非ブロッキングなインデックスビルド**
- Integration test: ビルド開始 → 1秒以内にレスポンス → 他ツール使用可能

**US-2: 進捗状況の可視化**
- Integration test: ビルド実行中 → script_index_status呼び出し → 進捗情報確認

**US-3: 重複実行の防止**
- Integration test: ビルド実行中 → 再度ビルド開始 → エラー＋既存jobId返却

### 5. エージェントファイル更新

**CLAUDE.md更新**:
- バックグラウンドジョブの使用方法を追加
- script_index_statusでの進捗確認方法を追加

**出力**: data-model.md, /contracts/*, 失敗するテスト, quickstart.md, CLAUDE.md更新

## Phase 2: タスク計画アプローチ
*このセクションは/speckit.tasksコマンドが実行することを記述 - /speckit.plan中は実行しない*

**タスク生成戦略**:
- `/templates/tasks-template.md` をベースとして読み込み
- Phase 1設計ドキュメント (contracts, data model, quickstart) からタスクを生成

**Setup タスク**:
- [P] ESLint/Prettier設定確認
- [P] テスト環境セットアップ確認

**Test タスク (TDD順序)**:
1. [P] Contract test: JobManager API (RED)
2. [P] Contract test: code_index_build レスポンス (RED)
3. [P] Contract test: script_index_status 拡張レスポンス (RED)
4. Integration test: バックグラウンドビルド実行 (RED)
5. Integration test: 進捗確認 (RED)
6. Integration test: 重複実行防止 (RED)
7. Integration test: IndexWatcher統合 (RED)

**Core タスク (実装)**:
8. JobManager実装 (GREEN - test 1合格)
9. CodeIndexBuildToolHandler バックグラウンド化 (GREEN - test 2合格)
10. ScriptIndexStatusToolHandler 拡張 (GREEN - test 3合格)
11. IndexWatcher統合 (GREEN - test 4-7合格)

**Integration タスク**:
12. E2Eテスト: 全ユーザーストーリー検証
13. パフォーマンステスト: 1秒以内レスポンス確認

**Polish タスク**:
14. エラーハンドリング改善
15. ドキュメント更新 (README.md, CLAUDE.md)
16. コミットログ作成＆プッシュ

**順序戦略**:
- TDD順序: テストが実装より先（1-7 → 8-11）
- 依存関係順序: JobManager → ハンドラ拡張 → Watcher統合
- 並列実行のために[P]をマーク (test 1-3, setup)

**推定出力**: tasks.mdに約20個の番号付き、順序付きタスク

**重要**: このフェーズは/speckit.tasksコマンドで実行、/speckit.planではない

## Phase 3+: 今後の実装
*これらのフェーズは/planコマンドのスコープ外*

**Phase 3**: タスク実行 (/speckit.tasksコマンドがtasks.mdを作成)
**Phase 4**: 実装 (憲章原則に従ってtasks.mdを実行)
**Phase 5**: 検証 (テスト実行、quickstart.md実行、パフォーマンス検証)

## 複雑さトラッキング
*憲章チェックに正当化が必要な違反がある場合のみ記入*

| 違反 | 必要な理由 | より単純な代替案が却下された理由 |
|------|-----------|--------------------------------|
| なし | N/A | N/A |

## 進捗トラッキング
*このチェックリストは実行フロー中に更新される*

**フェーズステータス**:
- [x] Phase 0: Research完了 (/speckit.plan コマンド) ✅ research.md作成済み
- [x] Phase 1: Design完了 (/speckit.plan コマンド) ✅ data-model.md, contracts/, quickstart.md作成済み
- [x] Phase 2: Task planning完了 (/speckit.plan コマンド - アプローチのみ記述) ✅ plan.md内に記述済み
- [ ] Phase 3: Tasks生成済み (/speckit.tasks コマンド)
- [ ] Phase 4: 実装完了
- [ ] Phase 5: 検証合格

**ゲートステータス**:
- [x] 初期憲章チェック: 合格
- [x] 設計後憲章チェック: 合格 ✅ シンプルさ維持、TDD遵守、下位互換性確保
- [x] すべての要明確化解決済み ✅ research.mdで全て解決
- [x] 複雑さの逸脱を文書化済み (逸脱なし)

---
*憲章 v1.0.0 に基づく - `/memory/constitution.md` 参照*
