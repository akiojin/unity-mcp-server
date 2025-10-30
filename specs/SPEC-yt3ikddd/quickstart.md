# クイックスタート - コードインデックスビルドのバックグラウンド実行

**機能ID**: SPEC-yt3ikddd | **日付**: 2025-10-29

このドキュメントは、実装完了後に各ユーザーストーリーを検証するための手順を提供します。

## 前提条件

- Unity MCPサーバーが起動していること
- MCPクライアント（Claude Code等）が接続されていること
- Unity Editorが起動していること
- プロジェクトに`.cs`ファイルが存在すること（推奨: 100ファイル以上）

## ユーザーストーリー検証

### US-1: 非ブロッキングなインデックスビルド

**目的**: ビルド開始後、即座に制御が返り、他の作業を並行して進められることを確認する

**手順**:

1. **ビルドを開始する**

   ```
   MCPツール: code_index_build
   パラメータ: { "delayStartMs": 300 }
   ```

   期待されるレスポンス（1秒以内）:
   ```json
   {
     "success": true,
     "message": "Code index build started in background",
     "jobId": "build-1730188800000-abc123",
     "checkStatus": "Use code_index_status to check progress"
   }
   ```

   ✅ **成功基準**: レスポンスが1秒以内に返る

2. **他のツールを使用できることを確認**

   ビルド実行中に以下のツールを実行:

   ```
   MCPツール: script_read
   パラメータ: { "path": "Assets/Scripts/Player.cs" }
   ```

   ✅ **成功基準**: ビルド完了を待たずに即座にファイルが読める

3. **複数回実行しても問題ないことを確認**

   ```
   MCPツール: code_index_status
   パラメータ: {}
   ```

   ✅ **成功基準**: ビルド中でもステータス確認が即座に返る

---

### US-2: 進捗状況の可視化

**目的**: ビルドの進捗状況を確認できることを確認する

**手順**:

1. **ビルドを開始する**

   ```
   MCPツール: code_index_build
   パラメータ: {}
   ```

2. **実行中の進捗を確認する**（ビルド完了前）

   ```
   MCPツール: code_index_status
   パラメータ: {}
   ```

   期待されるレスポンス:
   ```json
   {
     "success": true,
     "totalFiles": 1500,
     "indexedFiles": 1200,
     "coverage": 0.8,
     "breakdown": { ... },
     "index": {
       "ready": true,
       "rows": 12000,
       "lastIndexedAt": "...",
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

   ✅ **成功基準**:
   - `buildJob`フィールドが存在する
   - `status`が`"running"`
   - `progress.processed`が増加している
   - `progress.rate`が表示されている（files/sec）

3. **数秒待ってから再度確認**

   ```
   MCPツール: code_index_status
   パラメータ: {}
   ```

   ✅ **成功基準**: `progress.processed`が前回より増加している

4. **完了後の結果を確認する**

   ビルド完了を待って（2-5分）：

   ```
   MCPツール: code_index_status
   パラメータ: {}
   ```

   期待されるレスポンス:
   ```json
   {
     "success": true,
     "totalFiles": 1500,
     "indexedFiles": 1500,
     "coverage": 1.0,
     "breakdown": { ... },
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

   ✅ **成功基準**:
   - `status`が`"completed"`
   - `result`フィールドが存在する
   - `completedAt`が記録されている

---

### US-3: 重複実行の防止

**目的**: 既にビルドが実行中の場合、新規ビルドを開始せず、既存のジョブIDが返されることを確認する

**手順**:

1. **ビルドを開始する**

   ```
   MCPツール: code_index_build
   パラメータ: {}
   ```

   レスポンス:
   ```json
   {
     "success": true,
     "message": "Code index build started in background",
     "jobId": "build-1730188800000-abc123",
     ...
   }
   ```

   `jobId`をメモしておく: `build-1730188800000-abc123`

2. **実行中に再度ビルドを開始しようとする**

   ```
   MCPツール: code_index_build
   パラメータ: {}
   ```

   期待されるレスポンス:
   ```json
   {
     "success": false,
     "error": "build_already_running",
     "message": "Code index build is already in progress",
     "jobId": "build-1730188800000-abc123"
   }
   ```

   ✅ **成功基準**:
   - `success`が`false`
   - `error`が`"build_already_running"`
   - `jobId`が最初のジョブIDと一致する

3. **完了後は新規ビルドを開始できることを確認**

   ビルド完了を待って：

   ```
   MCPツール: code_index_build
   パラメータ: {}
   ```

   期待されるレスポンス:
   ```json
   {
     "success": true,
     "message": "Code index build started in background",
     "jobId": "build-1730188805000-def456",
     ...
   }
   ```

   ✅ **成功基準**:
   - `success`が`true`
   - `jobId`が新しい値（前回と異なる）

---

## エッジケース検証

### エッジケース1: IndexWatcherとの競合

**目的**: 自動ビルドと手動ビルドが同時に実行されないことを確認する

**手順**:

1. **IndexWatcherを有効化**

   `config.json`で:
   ```json
   {
     "indexing": {
       "watch": true,
       "intervalMs": 5000
     }
   }
   ```

   MCPサーバーを再起動

2. **手動ビルドを開始**

   ```
   MCPツール: code_index_build
   パラメータ: {}
   ```

3. **5秒以内にログを確認**

   サーバーログに以下が表示されないことを確認:
   ```
   [index] watcher enabled
   [index] updated=...
   ```

   ✅ **成功基準**: 手動ビルド中は自動ビルドがスキップされる

---

### エッジケース2: ビルド中のエラー

**目的**: LSPエラー発生時に適切に処理されることを確認する

**手順**:

1. **LSPを停止する**（テスト用）

   LSPプロセスを手動で停止

2. **ビルドを開始する**

   ```
   MCPツール: code_index_build
   パラメータ: {}
   ```

3. **エラー状態を確認**

   ```
   MCPツール: code_index_status
   パラメータ: {}
   ```

   期待されるレスポンス:
   ```json
   {
     ...
     "index": {
       "buildJob": {
         "id": "build-...",
         "status": "failed",
         "error": "LSP connection failed: ...",
         "failedAt": "2025-10-29T10:02:30Z"
       }
     }
   }
   ```

   ✅ **成功基準**:
   - `status`が`"failed"`
   - `error`フィールドにエラーメッセージが記録されている

---

## 下位互換性確認

**目的**: 既存のクライアントが引き続き動作することを確認する

**手順**:

1. **ビルドを完了させる**

2. **code_index_statusを実行**

   ```
   MCPツール: code_index_status
   パラメータ: {}
   ```

3. **既存のフィールドがすべて存在することを確認**

   期待されるフィールド:
   - `success`: boolean
   - `totalFiles`: number
   - `indexedFiles`: number
   - `coverage`: number
   - `breakdown`: object
   - `index.ready`: boolean
   - `index.rows`: number
   - `index.lastIndexedAt`: string

   ✅ **成功基準**: すべての既存フィールドが存在し、正しい値を持つ

4. **buildJobフィールドはオプショナル**

   ビルドジョブがない場合、`buildJob`フィールドは存在しなくてもエラーにならない

   ✅ **成功基準**: レスポンスが正常に返る

---

## パフォーマンス検証

### 1秒以内レスポンス

**手順**:

1. **タイマーを開始**

2. **ビルドを開始**

   ```
   MCPツール: code_index_build
   パラメータ: {}
   ```

3. **タイマーを停止**

   ✅ **成功基準**: レスポンスが1秒以内に返る

### 進捗更新頻度

**手順**:

1. **ビルドを開始**（`reportEvery: 100`）

2. **ログを確認**

   100ファイルごとに進捗ログが出力されることを確認:
   ```
   [index] progress 100/1500 (removed:0) rate:12.5 f/s
   [index] progress 200/1500 (removed:0) rate:13.2 f/s
   ...
   ```

   ✅ **成功基準**: 進捗ログが適切な頻度で出力される

---

## トラブルシューティング

### ビルドが開始されない

- LSPが起動しているか確認: `ps aux | grep csharp-lsp`
- Unity Editorが起動しているか確認
- ログを確認: `[index]`タグの出力

### 進捗が表示されない

- ビルドが開始されているか確認: `code_index_build`のレスポンスを確認
- `code_index_status`を実行してbuildJobフィールドを確認

### 下位互換性の問題

- 既存のフィールドがすべて存在するか確認
- `buildJob`フィールドの有無を確認（オプショナル）

---

## まとめ

すべての検証が成功した場合、以下が確認されます：

- ✅ **US-1**: ビルド開始後1秒以内にレスポンスが返る
- ✅ **US-2**: 進捗状況が確認できる
- ✅ **US-3**: 重複実行が防止される
- ✅ **エッジケース**: IndexWatcherとの競合、エラーハンドリング
- ✅ **下位互換性**: 既存クライアントが引き続き動作する
- ✅ **パフォーマンス**: 1秒以内レスポンス、適切な進捗更新頻度

これで、SPEC-yt3ikdddの機能が正常に動作していることが確認できます。
