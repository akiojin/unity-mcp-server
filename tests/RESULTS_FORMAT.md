# テスト結果フォーマット（共通仕様／Markdown・単一ファイル）

本プロジェクトのテスト結果・レポートは「Markdown」に統一し、1 回の実行（Run）につき 1 つのレポートファイルに集約します。カテゴリごとに別ファイルは作成しません。

出力先（単一ファイル）
- ランレポート: `tests/.reports/run-<YYYYMMDD_HHmmss>.md`（Git管理外。.gitignore 済）
- 直近ポインタ（任意）: `tests/.reports/latest.md`（当該ランの内容を都度上書き）

ラン初期化（必須・最初の1回のみ）
1) Run ID を採番し、レポートパスを決定（例: `tests/.reports/run-20250904_123000.md`）。
2) 決定したパスを `tests/.reports/.current-run` に書き出す（他カテゴリが参照）。
3) レポート冒頭にヘッダと「グローバルサマリ（空枠）」を出力して作成。

追記ポリシー（全カテゴリ共通）
- すべてのカテゴリは `tests/.reports/.current-run` を読み、同一レポートに「追記」します。
- カテゴリ先頭で見出し `## <Category>` を一度だけ追記し、以降はチェックリスト行を追加。
- 別ファイルの新規作成は禁止（1 ラン＝1 ファイル）。

テンプレート（ランファイルの雛形・例）
```
# <Run Title> テストレポート

- 実行者: <agent or name>
- 実行時刻: 2025-01-01T12:00:00Z 〜 2025-01-01T12:03:45Z（合計 225000 ms）
- 前提: .sln あり / roslyn-cli serve 稼働 / インデックス coverage: 95%

## サマリ
| total | pass | fail | skip | BLOCKED_ENV | FAIL_EXPECTATION | TOOL_ERROR | TIMEOUT |
|------:|-----:|-----:|-----:|------------:|-----------------:|-----------:|--------:|
|   20  |  18  |   1  |   1  |           0 |                1 |          0 |       0 |

## Script（各ケースは1行）
- [x] S20-01 置換適用 — pass (250 ms) restored:true
- [x] S30-01 リネーム — pass (310 ms) restored:true
- [ ] S00-00 前提チェック — blocked（Missing .sln） restored:true

## Scene
- [ ] U10-01 create_scene … restored:true

## GameObject
- [ ] U20-01 create_gameobject … restored:true

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

ToDo 管理（エージェント内運用）
- ファイル出力は不要。エージェント（LLM）の ToDo/プラン機能（update_plan 等）に、各カテゴリの全テストを登録して進捗更新する。
- 登録例: 1) S00 前提チェック → pending、2) 実行時に in_progress、3) 完了で completed。
