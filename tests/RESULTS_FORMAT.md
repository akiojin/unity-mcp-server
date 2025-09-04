# テスト結果フォーマット（共通仕様／Markdown）

本プロジェクトのテスト結果・レポートは「Markdown」に統一します。各カテゴリの結果は 1 ファイルにまとめ、チェックリストとテーブル要約で構成してください。

出力先
- `tests/.reports/<category>-<YYYYMMDD_HHmmss>.md` に保存（Git管理外。.gitignore 済）

テンプレート（例）
```
# <Category> テストレポート

- 実行者: <agent or name>
- 実行時刻: 2025-01-01T12:00:00Z 〜 2025-01-01T12:03:45Z（合計 225000 ms）
- 前提: .sln あり / roslyn-cli serve 稼働 / インデックス coverage: 95%

## サマリ
| total | pass | fail | skip | BLOCKED_ENV | FAIL_EXPECTATION | TOOL_ERROR | TIMEOUT |
|------:|-----:|-----:|-----:|------------:|-----------------:|-----------:|--------:|
|   20  |  18  |   1  |   1  |           0 |                1 |          0 |       0 |

## チェックリスト（各ケースは1行）
- [x] S20-01 置換適用 — pass (250 ms) restored:true
- [x] S30-01 リネーム — pass (310 ms) restored:true
- [ ] U60-01 Input 状態取得 — skip（アセット無し） restored:true
- [x] S20-02 置換（構文不正）— fail（FAIL_EXPECTATION） restored:true

## 詳細（必要なケースのみ）
<details>
<summary>S20-01 置換適用（詳細）</summary>

- startedAt: 2025-01-01T12:00:00Z / finishedAt: 2025-01-01T12:00:00.250Z / durationMs: 250
- retries: 0 / reasonCode: -
- artifacts: [.unity/capture/screenshot_game_20250101_120000.png]
- beforeAfter: Assets/Scripts/GigaTestFile.cs 2580-2600 / beforeHash=sha1:a1 / afterHash=sha1:a1 / verified=true
- notes: applied=true, 整形OK
- error: 

</details>
```

ステータス規約
- pass / fail / skip / BLOCKED_ENV は語で明示
- 各行（チェックリスト）は `- [ ]` / `- [x]` を必須とし、末尾に `restored:true/false` を付記

実行ポリシー（必須）
- 変更前の状態を取得・保存し、各テストケースの終了時に必ず復元する（チェックリスト行に restored:true を明記）
- 破壊的操作はテストで新規作成した `LLMTEST_` 系資産に限定し、テスト末尾で削除する
- プロジェクト設定は必ず元の値へ戻す。既存アセット/Prefab/シーンへ加えた変更はすべてロールバックする
- Git のコミット/プッシュ、`npm version` などのバージョン変更は行わない

ToDo 管理（必須／Markdown）
- テスト開始前に、当該カテゴリ内のすべてのケースを Markdown チェックリストとして ToDo 化してください（AGENTS.md に準拠）
- 保存先: `tests/.todo/<category>-<YYYYMMDD_HHmmss>.md` または `tests/TODO.md`（Git管理外）
- 重要: 各項目の状態変更ごとに「即時」書き戻し（開始→in_progress、終了→completed/blocked）。最後にまとめて更新しないこと
- 競合回避: 一時ファイル→rename の原子的書き込みを推奨
