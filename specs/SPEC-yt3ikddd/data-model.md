# データモデル - コードインデックスビルドのバックグラウンド実行

**機能ID**: SPEC-yt3ikddd | **日付**: 2025-10-29

## エンティティ定義

### BuildJob (新規)

バックグラウンドで実行中または完了したインデックスビルドジョブを表す。

**フィールド**:

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `id` | string | ✓ | ジョブID（形式: `build-<timestamp>-<random>`または`watcher-<timestamp>`） |
| `status` | enum | ✓ | ジョブ状態: `'running'` \| `'completed'` \| `'failed'` |
| `progress` | object | ✓ | 進捗情報 |
| `progress.processed` | number | ✓ | 処理済みファイル数 |
| `progress.total` | number | ✓ | 全ファイル数 |
| `progress.rate` | number | ✓ | 処理速度（files/sec） |
| `result` | object \| null | - | 完了時の結果（`status='completed'`の場合のみ） |
| `result.updatedFiles` | number | ✓ | 更新されたファイル数 |
| `result.removedFiles` | number | ✓ | 削除されたファイル数 |
| `result.totalIndexedSymbols` | number | ✓ | 総シンボル数 |
| `result.lastIndexedAt` | string | ✓ | 最終更新時刻（ISO 8601） |
| `error` | string \| null | - | エラーメッセージ（`status='failed'`の場合のみ） |
| `startedAt` | string | ✓ | ジョブ開始時刻（ISO 8601） |
| `completedAt` | string \| null | - | ジョブ完了時刻（ISO 8601、`status='completed'`の場合のみ） |
| `failedAt` | string \| null | - | ジョブ失敗時刻（ISO 8601、`status='failed'`の場合のみ） |

**検証ルール**:

1. `status`は`'running'`、`'completed'`、`'failed'`のいずれかのみ
2. `progress.processed` ≤ `progress.total`
3. `progress.rate` ≥ 0
4. `status='completed'`の場合、`result`必須、`completedAt`必須
5. `status='failed'`の場合、`error`必須、`failedAt`必須
6. `status='running'`の場合、`result`、`error`、`completedAt`、`failedAt`はnull

**状態遷移**:

```
          success
running ---------> completed
   |
   | error
   +-------------> failed
```

**ジョブID命名規則**:

- **手動ビルド**: `build-<timestamp>-<random6chars>`
  - 例: `build-1730188800000-abc123`
  - `<timestamp>`: `Date.now()`
  - `<random6chars>`: `Math.random().toString(36).slice(2,8)`

- **自動ビルド（Watcher）**: `watcher-<timestamp>`
  - 例: `watcher-1730188800000`

**例**:

```javascript
// 実行中ジョブ
{
  id: 'build-1730188800000-abc123',
  status: 'running',
  progress: {
    processed: 1200,
    total: 1500,
    rate: 12.5
  },
  result: null,
  error: null,
  startedAt: '2025-10-29T10:00:00Z',
  completedAt: null,
  failedAt: null
}

// 完了ジョブ
{
  id: 'build-1730188800000-abc123',
  status: 'completed',
  progress: {
    processed: 1500,
    total: 1500,
    rate: 15.2
  },
  result: {
    updatedFiles: 50,
    removedFiles: 0,
    totalIndexedSymbols: 15500,
    lastIndexedAt: '2025-10-29T10:05:00Z'
  },
  error: null,
  startedAt: '2025-10-29T10:00:00Z',
  completedAt: '2025-10-29T10:05:00Z',
  failedAt: null
}

// 失敗ジョブ
{
  id: 'build-1730188800000-abc123',
  status: 'failed',
  progress: {
    processed: 800,
    total: 1500,
    rate: 10.0
  },
  result: null,
  error: 'LSP connection failed: ECONNREFUSED',
  startedAt: '2025-10-29T10:00:00Z',
  completedAt: null,
  failedAt: '2025-10-29T10:02:30Z'
}
```

---

### IndexStats (既存、変更なし)

プロジェクト全体のコードインデックス統計情報。

**フィールド**:

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `total` | number | ✓ | 総シンボル数 |
| `lastIndexedAt` | string | ✓ | 最終更新時刻（ISO 8601） |

**例**:

```javascript
{
  total: 15500,
  lastIndexedAt: '2025-10-29T10:05:00Z'
}
```

---

## エンティティ関係

```
BuildJob 1 ----completes----> 1 IndexStats
                              (result.totalIndexedSymbols → total)
                              (result.lastIndexedAt → lastIndexedAt)
```

**関係の詳細**:

- BuildJobが`completed`状態になると、`result`に保存された統計情報がIndexStatsに反映される
- IndexStatsはSQLite（code-index.db）に永続化
- BuildJobはメモリ内のみ（完了5分後に削除）

---

## ストレージ戦略

### BuildJob (メモリ内)

**ストレージ**: メモリ内Map

```javascript
// jobManager.js
class JobManager {
  constructor() {
    this.jobs = new Map(); // jobId -> BuildJob
  }
}
```

**ライフサイクル**:
1. ジョブ作成時: Mapに追加
2. 実行中: `progress`を随時更新
3. 完了/失敗時: 最終状態を保存
4. 完了5分後: Mapから削除（自動クリーンアップ）

**永続化しない理由**:
- 短期ジョブ（数十秒〜数分）
- サーバー再起動は稀
- シンプルさ優先

### IndexStats (SQLite)

**ストレージ**: SQLite（`

.unity/cache/code-index/code-index.db`）

**テーブル**: `files`、`symbols`（既存）

**更新タイミング**: BuildJob完了時

**永続化する理由**:
- 長期保存が必要
- 複数セッション間で共有
- 既存の設計を踏襲

---

## データフロー

```
1. code_index_build 実行
   ↓
2. JobManager.create(jobId, jobFn)
   ↓
3. BuildJob作成（status='running'）
   ↓
4. バックグラウンドでjobFn実行
   │ - progress更新（processed++, rate計算）
   │ - LSPでシンボル取得
   │ - SQLiteに書き込み
   ↓
5a. 成功時: status='completed', result保存
    ↓
    IndexStats更新（SQLite）
    ↓
    5分後にBuildJob削除

5b. 失敗時: status='failed', error保存
    ↓
    5分後にBuildJob削除
```

---

## 検証ルール詳細

### BuildJob検証

**TypeScript型定義** (参考):

```typescript
type JobStatus = 'running' | 'completed' | 'failed';

interface BuildJobProgress {
  processed: number;  // >= 0
  total: number;      // > 0
  rate: number;       // >= 0 (files/sec)
}

interface BuildJobResult {
  updatedFiles: number;
  removedFiles: number;
  totalIndexedSymbols: number;
  lastIndexedAt: string; // ISO 8601
}

interface BuildJob {
  id: string;           // match /^(build|watcher)-\d+-[a-z0-9]{6}$/
  status: JobStatus;
  progress: BuildJobProgress;
  result: BuildJobResult | null;
  error: string | null;
  startedAt: string;    // ISO 8601
  completedAt: string | null;
  failedAt: string | null;
}
```

**バリデーション関数** (実装時):

```javascript
function validateBuildJob(job) {
  if (!['running', 'completed', 'failed'].includes(job.status)) {
    throw new Error(`Invalid status: ${job.status}`);
  }
  if (job.progress.processed > job.progress.total) {
    throw new Error(`processed (${job.progress.processed}) > total (${job.progress.total})`);
  }
  if (job.status === 'completed' && !job.result) {
    throw new Error('result required for completed job');
  }
  if (job.status === 'failed' && !job.error) {
    throw new Error('error required for failed job');
  }
  if (job.status === 'running' && (job.result || job.error)) {
    throw new Error('result/error must be null for running job');
  }
}
```

---

## まとめ

- **新規エンティティ**: BuildJob（メモリ内、一時的）
- **既存エンティティ**: IndexStats（SQLite、永続）
- **関係**: BuildJob完了 → IndexStats更新
- **ストレージ戦略**: シンプルさ優先、短期ジョブはメモリ内
- **検証**: 状態に応じた必須フィールドチェック
