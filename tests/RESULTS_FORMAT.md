# テスト結果フォーマット（共通仕様）

各テストケースは 1 行 1 JSON（JSON Lines）で出力してください。LLM ランナーはこの JSONL を収集・集約します。すべてのテストは原状回復（変更のロールバック）までを含めて完了とし、Git へのコミット・バージョン変更は一切行わないでください。

出力先
- 原則: 標準出力（stdout）へ逐次出力
- 併用可: ファイル保存時は `tests/.reports/<category>-<YYYYMMDD_HHmmss>.jsonl` を推奨

ケース行（必須フィールドを含む例）
```
{"testId":"U10-01","name":"シーン作成","status":"pass|fail|skip",
 "startedAt":"2025-01-01T12:00:00.000Z","finishedAt":"2025-01-01T12:00:01.234Z","durationMs":1234,
 "restored":true,"retries":0,"reasonCode":null,
 "artifacts":{"paths":[".unity/capture/screenshot_game_20250101_120000.png"],"ids":["/LLMTEST_Cube"]},
 "beforeAfter":{"path":"Assets/Scripts/GigaTestFile.cs","startLine":2580,"endLine":2600,
                 "beforeHash":"sha1:...","afterHash":"sha1:...","verified":true},
 "diagnosticsTopN":[{"code":"CS0234","count":2}],
 "dependsOn":[],
 "notes":"期待どおりに作成できた","error":null}
```

フィールド仕様（厳格）
- `testId` (string, required): 一意 ID（例: S20-01, U10-01）
- `name` (string, required): テスト名
- `status` (string, required): `pass` | `fail` | `skip`
- `startedAt` (RFC3339 string, required): 開始時刻（UTC推奨）
- `finishedAt` (RFC3339 string, required): 終了時刻（UTC推奨）
- `durationMs` (number, required): 実測ミリ秒
- `restored` (boolean, required): 原状回復完了（非破壊でも true を出力）
- `retries` (integer, required): リトライ回数（0以上）
- `reasonCode` (string|null, optional): 失敗/スキップ理由の分類。推奨: `FAIL_EXPECTATION` | `BLOCKED_ENV` | `TOOL_ERROR` | `TIMEOUT` | `SKIP_CONDITION` | null
- `artifacts` (object, optional): `{ paths: string[], ids: string[] }`
- `beforeAfter` (object, optional): 変更検証 `{ path, startLine, endLine, beforeHash, afterHash, verified }`
- `diagnosticsTopN` (array, optional): 診断上位 `[{ code: string, count: number }]`
- `dependsOn` (array, optional): 依存テスト ID
- `notes` (string, optional, ≤300 chars 目安)
- `error` (string|null, optional, ≤200 chars 目安)

制約と上限
- `error` は最大 200 文字、`notes` は最大 300 文字の要約を推奨
- 大きな本文や差分は出力しない。必要なら `beforeAfter` と `artifacts` のみに留める（1KB 目安）

ステータス別サンプル
1) PASS 例
```
{"testId":"S20-01","name":"置換適用","status":"pass","startedAt":"2025-01-01T12:00:00Z","finishedAt":"2025-01-01T12:00:00.250Z","durationMs":250,"restored":true,"retries":0,"reasonCode":null,"beforeAfter":{"path":"Assets/Scripts/GigaTestFile.cs","startLine":2580,"endLine":2600,"beforeHash":"sha1:a1","afterHash":"sha1:a1","verified":true},"notes":"applied=true, 整形OK","error":null}
```
2) FAIL 例（期待不一致）
```
{"testId":"S20-01","name":"置換適用","status":"fail","startedAt":"2025-01-01T12:00:00Z","finishedAt":"2025-01-01T12:00:00.200Z","durationMs":200,"restored":true,"retries":1,"reasonCode":"FAIL_EXPECTATION","diagnosticsTopN":[{"code":"CS0234","count":5}],"notes":"applied=false","error":"構造編集が未適用"}
```
3) SKIP 例（条件スキップ）
```
{"testId":"U60-01","name":"Input 状態取得","status":"skip","startedAt":"2025-01-01T12:00:00Z","finishedAt":"2025-01-01T12:00:00.010Z","durationMs":10,"restored":true,"retries":0,"reasonCode":"SKIP_CONDITION","notes":"Input アセット無し","error":null}
```
4) BLOCKED_ENV 例（前提未充足）
```
{"testId":"S00-00","name":"前提チェック","status":"fail","startedAt":"2025-01-01T12:00:00Z","finishedAt":"2025-01-01T12:00:00.005Z","durationMs":5,"restored":true,"retries":0,"reasonCode":"BLOCKED_ENV","notes":"Missing .sln","error":"環境前提不足"}
```

サマリ行（最後に 1 行）
```
{"summary":{"total":N,"pass":A,"fail":B,"skip":C,
             "reasons":{"BLOCKED_ENV":x,"FAIL_EXPECTATION":y,"TOOL_ERROR":z,"TIMEOUT":w,"SKIP_CONDITION":s},
             "passRate": (A/(A+B))},
 "startedAt":"2025-01-01T12:00:00Z","finishedAt":"2025-01-01T12:03:45Z","durationMs":225000}
```

注意
- 人間可読の補助として Markdown テーブル併用は可。ただし JSONL が主系です。
- 失敗（`fail`）時は、可能であれば直近のリクエスト/レスポンスからエラーメッセージを 1～2 文で要約して `error` に格納してください。

実行ポリシー（必須）
- 変更前の状態を取得・保存し、各テストケースの終了時に必ず復元する（`restored=true` を出力）
- 破壊的操作はテストで新規作成した `LLMTEST_` 系資産に限定し、テスト末尾で削除する
- プロジェクト設定は必ず元の値へ戻す。既存アセット/Prefab/シーンへ加えた変更はすべてロールバックする
- Git のコミット/プッシュ、`npm version` などのバージョン変更は行わない

ToDo 管理（必須）
- テスト開始前に、当該カテゴリ内のすべてのケースを ToDo 化してください（AGENTS.md の「作業開始前にToDo登録」に準拠）。
- ToDo には少なくとも以下を含めます: `id`（= `testId`）、`name`、`status`（`pending`/`in_progress`/`completed`/`blocked`）、`reasonCode`（任意）、`assignee`（任意）、`lastUpdated`（ISO）。
- 推奨保存先: `tests/.todo/<category>-<YYYYMMDD_HHmmss>.json`（JSON）または `tests/TODO.md`（Markdown チェックボックス）。
- 重要: ToDo は「各項目の状態変更ごと」に即時書き戻し（開始→`in_progress`、終了→`completed`/`blocked`）。最後にまとめて更新しないこと。
- 併用可: 競合回避のため、単一ライター/原子的な書き込み（tempファイル→rename）を推奨。
- JSONL の各ケース出力と ToDo の `id` を一致させ、機械集計しやすくしてください。
