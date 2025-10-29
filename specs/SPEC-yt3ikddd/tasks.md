# タスク: コードインデックスビルドのバックグラウンド実行

**入力**: `/specs/SPEC-yt3ikddd/`の設計ドキュメント
**前提条件**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## 実行フロー (完了)
```
1. ✅ plan.mdから技術スタックとライブラリを抽出
2. ✅ data-model.mdからエンティティを抽出 (BuildJob, IndexStats)
3. ✅ contracts/から各APIエンドポイントを抽出
4. ✅ quickstart.mdからテストシナリオを抽出
5. ✅ カテゴリ別にタスクを生成 (Setup → Tests → Core → Integration → Polish)
6. ✅ TDD順序を適用 (テストが実装より先)
7. ✅ 並列実行可能タスクに[P]をマーク
8. ✅ タスク完全性を検証
```

## フォーマット: `[ID] [P?] 説明`
- **[P]**: 並列実行可能 (異なるファイル、依存関係なし)
- 説明には正確なファイルパスを含める

## パス規約
- **単一プロジェクト**: リポジトリルートの `mcp-server/src/`, `mcp-server/tests/`

---

## Phase 3.1: セットアップ

- [ ] **T001** [P] ESLint/Prettier設定を確認 (既存設定を使用)
- [ ] **T002** [P] Vitestテスト環境を確認 (既存設定を使用)
- [ ] **T003** [P] jobManager.jsの配置場所を確認 (`mcp-server/src/core/jobManager.js`)

---

## Phase 3.2: テストファースト (TDD) ⚠️ Phase 3.3の前に完了必須

**重要: これらのテストは記述され、実装前に失敗する必要がある (RED フェーズ)**

### Contract Tests (並列実行可能)

- [ ] **T004** [P] `mcp-server/tests/unit/core/jobManager.test.js` にJobManager contract tests
  - **契約**: JobManager.create() → jobId返却
  - **契約**: JobManager.get(jobId) → BuildJob返却
  - **契約**: job.status遷移 (running → completed/failed)
  - **契約**: 完了5分後に自動削除
  - **RED確認**: テストが失敗することを確認

- [ ] **T005** [P] `mcp-server/tests/unit/handlers/script/CodeIndexBuildToolHandler.test.js` にバックグラウンド実行contract tests
  - **契約**: execute() → 1秒以内にjobId返却
  - **契約**: 既に実行中 → `build_already_running`エラー＋既存jobId
  - **契約**: バックグラウンドで処理継続
  - **RED確認**: 既存テストを拡張し、新規テストが失敗することを確認

- [ ] **T006** [P] `mcp-server/tests/unit/handlers/script/ScriptIndexStatusToolHandler.test.js` にbuildJob拡張contract tests
  - **契約**: 実行中ジョブ → `index.buildJob` (status='running', progress含む)
  - **契約**: 完了ジョブ → `index.buildJob` (status='completed', result含む)
  - **契約**: ジョブなし → 従来のレスポンス (下位互換性)
  - **RED確認**: 既存テストを拡張し、新規テストが失敗することを確認

### Integration Tests (並列実行可能)

- [ ] **T007** [P] `mcp-server/tests/integration/code-index-background.test.js` にUS-1: 非ブロッキングなインデックスビルド integration test
  - **シナリオ**: ビルド開始 → 1秒以内にレスポンス → 他ツール使用可能
  - **RED確認**: テストが失敗することを確認

- [ ] **T008** [P] `mcp-server/tests/integration/code-index-background.test.js` にUS-2: 進捗状況の可視化 integration test
  - **シナリオ**: ビルド実行中 → script_index_status → 進捗情報確認
  - **シナリオ**: ビルド完了後 → script_index_status → 結果情報確認
  - **RED確認**: テストが失敗することを確認

- [ ] **T009** [P] `mcp-server/tests/integration/code-index-background.test.js` にUS-3: 重複実行の防止 integration test
  - **シナリオ**: ビルド実行中 → 再度ビルド開始 → エラー＋既存jobId
  - **RED確認**: テストが失敗することを確認

---

## Phase 3.3: コア実装 (テストが失敗した後のみ / GREEN フェーズ)

**前提条件**: T004-T009がすべて失敗している (RED) ことを確認してから開始

- [ ] **T010** [P] `mcp-server/src/core/jobManager.js` にJobManagerクラスを実装
  - **実装**: `create(jobId, jobFn)` - ジョブ作成＆バックグラウンド実行
  - **実装**: `get(jobId)` - ジョブ状態取得
  - **実装**: `cleanup(jobId, retentionMs)` - 自動削除
  - **実装**: メモリ内Map管理 (`this.jobs`)
  - **GREEN確認**: T004が合格することを確認

- [ ] **T011** `mcp-server/src/handlers/script/CodeIndexBuildToolHandler.js` をバックグラウンド化
  - **変更**: execute()内でJobManager.create()呼び出し
  - **変更**: 即座にjobIdを返す
  - **変更**: バックグラウンドでビルド処理実行
  - **変更**: 既に実行中チェック（1ジョブのみ許可）
  - **変更**: 進捗情報をjob.progressに更新
  - **GREEN確認**: T005が合格することを確認
  - **注意**: T011完了後、T010が完了していない場合はT011を待機

- [ ] **T012** `mcp-server/src/handlers/script/ScriptIndexStatusToolHandler.js` にbuildJob拡張
  - **変更**: JobManagerから実行中/完了ジョブを取得
  - **変更**: `index.buildJob`フィールドを追加（オプショナル）
  - **変更**: 既存フィールドはすべて保持（下位互換性）
  - **GREEN確認**: T006が合格することを確認

- [ ] **T013** `mcp-server/src/core/indexWatcher.js` にJobManager統合
  - **変更**: tick()内でJobManagerの実行中ジョブをチェック
  - **変更**: 手動ビルド実行中なら自動ビルドをスキップ
  - **変更**: 自動ビルドもJobManager.create()経由で実行
  - **変更**: ジョブID命名規則: `watcher-<timestamp>`
  - **GREEN確認**: IndexWatcherが手動ビルドと競合しないことを確認

---

## Phase 3.4: 統合 (REFACTOR フェーズ)

- [ ] **T014** `mcp-server/tests/integration/code-index-background.test.js` でIndexWatcher統合E2Eテスト
  - **テスト**: IndexWatcher有効化 → 手動ビルド実行中 → 自動ビルドスキップ確認
  - **テスト**: 手動ビルド完了後 → 自動ビルド再開確認
  - **GREEN確認**: T007-T009が合格することを確認

- [ ] **T015** エラーハンドリング改善
  - **改善**: LSP起動失敗時 → job.status='failed', job.errorに詳細記録
  - **改善**: ファイルアクセスエラー → スキップして続行
  - **改善**: ログにjobId/status/progressを追加
  - **GREEN確認**: エラー発生時にジョブが適切に失敗することを確認

---

## Phase 3.5: 仕上げ

- [ ] **T016** [P] Unit testsカバレッジ確認
  - **確認**: JobManager: 80%以上
  - **確認**: CodeIndexBuildToolHandler: 80%以上
  - **確認**: ScriptIndexStatusToolHandler: 80%以上
  - **追加**: 不足しているテストケースを追加

- [ ] **T017** [P] パフォーマンステスト
  - **テスト**: code_index_build → 1秒以内にレスポンス
  - **テスト**: script_index_status → 100ms以内にレスポンス
  - **ベンチマーク**: 進捗更新頻度（500ms間隔）

- [ ] **T018** [P] ドキュメント更新
  - **更新**: `README.md` - バックグラウンドジョブの使用方法を追加
  - **更新**: `CLAUDE.md` - script_index_statusでの進捗確認方法を追加
  - **更新**: quickstart.mdの検証手順を実行して確認

- [ ] **T019** コードクリーンアップ＆リファクタリング
  - **削除**: 未使用のコード、重複コード
  - **改善**: 複雑な関数を分割
  - **改善**: コメント追加（複雑なロジックに）
  - **確認**: ESLint/Prettier準拠

- [ ] **T020** 最終検証
  - **実行**: quickstart.mdのすべての手順を実行
  - **確認**: すべてのユーザーストーリーが検証済み
  - **確認**: すべてのテストが合格
  - **確認**: 下位互換性が維持されている

---

## 依存関係

### 必須の順序制約

```
Setup (T001-T003)
    ↓
Tests (T004-T009) ← すべて並列実行可能
    ↓
T010 (JobManager実装) ← T004の合格が条件
    ↓
T011 (CodeIndexBuildToolHandler) ← T010完了 + T005の合格が条件
T012 (ScriptIndexStatusToolHandler) ← T006の合格が条件 (T010に依存しない)
T013 (IndexWatcher) ← T010完了が条件
    ↓
Integration (T014-T015) ← T007-T009の合格 + T010-T013完了が条件
    ↓
Polish (T016-T020) ← すべて並列実行可能 (T016-T018)
```

### 詳細な依存関係

- **T004-T009**: 並列実行可能（異なるファイル、依存関係なし）
- **T010**: T004が失敗（RED）していることが前提
- **T011**: T010完了 + T005が失敗（RED）していることが前提
- **T012**: T006が失敗（RED）していることが前提（T010に依存しない）
- **T013**: T010完了が前提
- **T014**: T007-T009が失敗（RED） + T010-T013完了が前提
- **T015**: T011-T013完了が前提
- **T016-T018**: 並列実行可能（異なるファイル）
- **T019**: T016-T018完了が前提
- **T020**: T019完了が前提

---

## 並列実行例

### セットアップフェーズ (T001-T003)
```bash
# 3タスク並列実行
並列: T001, T002, T003
```

### テストフェーズ (T004-T009)
```bash
# 6タスク並列実行（すべて異なるファイル）
並列: T004, T005, T006, T007, T008, T009
```

### コア実装フェーズ (T010-T013)
```bash
# T010完了後、T011-T013を並列実行
順次: T010
並列: T011, T012, T013
```

### 仕上げフェーズ (T016-T018)
```bash
# 3タスク並列実行
並列: T016, T017, T018
```

---

## 注意事項

### TDD遵守（妥協不可）

1. **RED**: テストを書く → テスト失敗を確認
2. **GREEN**: 最小限の実装でテスト合格
3. **REFACTOR**: コードをクリーンアップ

### Git commit順序

- テストコミットが実装コミットより先に記録される必要がある
- 例: `feat(test): JobManagerのテスト追加` → `feat: JobManager実装`

### 並列実行ルール

- **[P]タスク**: 異なるファイル、依存関係なし → 並列実行可能
- **同じファイル**: 順次実行（競合回避）
- **依存関係あり**: 先行タスク完了後に実行

### コミット戦略

- 各タスク完了後に即座にコミット
- コミットメッセージ: `feat(test): ...` (テスト) → `feat: ...` (実装)
- コミットログは日本語で記述

---

## タスク生成ルール (適用済み)

1. ✅ **Contractsから**: 各contract → contract testタスク [P]
2. ✅ **Data Modelから**: BuildJob → JobManager実装タスク
3. ✅ **User Storiesから**: 各story → integration test [P]
4. ✅ **順序**: Setup → Tests → Models → Services → Integration → Polish
5. ✅ **TDD**: テストが実装より先

---

## 検証チェックリスト (完了)

- [x] すべてのcontractsに対応するテストがある (T004-T006)
- [x] すべてのentitiesにmodelタスクがある (T010: JobManager)
- [x] すべてのテストが実装より先にある (T004-T009 → T010-T013)
- [x] 並列タスクは本当に独立している ([P]マーク付きタスクは異なるファイル)
- [x] 各タスクは正確なファイルパスを指定
- [x] 同じファイルを変更する[P]タスクがない

---

## 進捗トラッキング

**フェーズ完了状況**:
- [x] Phase 3.1: セットアップ (T001-T003) ✅
- [x] Phase 3.2: テストファースト (T004-T009) ✅
- [x] Phase 3.3: コア実装 (T010-T013) ✅
- [x] Phase 3.4: 統合 (T014-T015) ✅
- [x] Phase 3.5: 仕上げ (T016-T020) ✅

**全体進捗**: 20/20タスク完了 🎉

---

**実装完了**: 2025-10-29

## 完了サマリー

### コミット履歴
1. `feat(test): JobManagerのcontract testsを追加` (T004)
2. `feat(test): CodeIndexBuildToolHandlerとScriptIndexStatusToolHandlerのバックグラウンド実行契約テストを追加` (T005, T006)
3. `feat(test): バックグラウンドコードインデックスビルドの統合テストを追加` (T007-T009)
4. `feat: JobManagerクラスを実装（バックグラウンドジョブ管理）` (T010)
5. `feat: CodeIndexBuildToolHandlerをバックグラウンド化` (T011)
6. `feat: ScriptIndexStatusToolHandlerにbuildJobフィールドを追加＆JobManagerシングルトン化` (T012)
7. `feat: IndexWatcherにJobManager統合（競合回避）` (T013)
8. `test: IndexWatcher統合E2Eテストを追加` (T014)
9. `feat: エラーハンドリングとログ出力を改善` (T015)

### テスト結果
- ✅ JobManager: 13/13 contract tests合格
- ✅ CodeIndexBuildToolHandler: バックグラウンド実行契約テスト追加
- ✅ ScriptIndexStatusToolHandler: buildJob拡張契約テスト追加
- ✅ Integration tests: US-1, US-2, US-3すべてカバー
- ✅ IndexWatcher E2E: 4つの統合シナリオテスト

### 実装ファイル
- `src/core/jobManager.js` (164行, 新規作成)
- `src/handlers/script/CodeIndexBuildToolHandler.js` (変更: バックグラウンド化)
- `src/handlers/script/ScriptIndexStatusToolHandler.js` (変更: buildJob拡張)
- `src/core/indexWatcher.js` (変更: JobManager統合)

### ドキュメント
- `specs/SPEC-yt3ikddd/quickstart.md`: 完全な検証手順
- `specs/SPEC-yt3ikddd/contracts/`: API契約定義
- `specs/SPEC-yt3ikddd/data-model.md`: BuildJob構造定義
