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

サマリ更新（必須）
- 各カテゴリの追記後・およびラン終了時に、先頭の「サマリ」テーブルを再計算して上書き更新する。
- カウント規約:
  - `pass`: 行に `- [x]` かつ `— pass` を含む数
  - `fail`: 行に `- [ ]` かつ `— fail` を含む数
  - `skip`: 行に `- [ ]` かつ `— skip` を含む数
  - `BLOCKED_ENV`: 行に `- [ ]` かつ `— blocked（...）` を含む数（グローバル前提のS00を含む）
  - `FAIL_EXPECTATION`: 詳細内に `reasonCode: FAIL_EXPECTATION` を含む、または行本文に `FAIL_EXPECTATION` を含む数（無ければ0）
  - `TOOL_ERROR`: 詳細に `reasonCode: TOOL_ERROR` を含む数（無ければ0）
  - `TIMEOUT`: 詳細に `reasonCode: TIMEOUT` を含む数（無ければ0）
  - `total`: チェックリスト行（`- [ ]` または `- [x]`）の合計
- latest 更新: 再計算後のレポート全文を `tests/.reports/latest.md` にも上書きする。

テンプレート（ランファイルの雛形・例）
```
# <Run Title> テストレポート

- 実行者: <agent or name>
- 実行時刻: 2025-01-01T12:00:00Z 〜 2025-01-01T12:03:45Z（合計 225000 ms）
- 前提: UnityMCP script_* 到達性 / インデックス coverage: 95%
- テスト仕様: tests/test-mcp-<category>-tools.md（本レポートの根拠となる仕様ファイル名）
- 所感: <実施時の短い所感・気づき（任意だが推奨）>

## サマリ
| total | pass | fail | skip | BLOCKED_ENV | FAIL_EXPECTATION | TOOL_ERROR | TIMEOUT |
|------:|-----:|-----:|-----:|------------:|-----------------:|-----------:|--------:|
|   20  |  18  |   1  |   1  |           0 |                1 |          0 |       0 |

## Script（各ケースは1行）
- テスト仕様: tests/test-mcp-script-tools.md
- 操作対象ファイル: Assets/Scripts/GigaTestFile.cs（当カテゴリで操作・参照したファイルの一覧／任意）
- 所感: <当カテゴリの簡単な所感（任意）>
- [x] S20-01 置換適用 — pass (250 ms) restored:true
- [x] S30-01 リネーム — pass (310 ms) restored:true
- [x] S00-00 ラン初期化 — pass (0 ms) restored:true

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
- targetPaths: [Assets/Scripts/GigaTestFile.cs]
- beforeAfter: Assets/Scripts/GigaTestFile.cs 2580-2600 / beforeHash=sha1:a1 / afterHash=sha1:a1 / verified=true
- notes: applied=true, 整形OK
- error: 

</details>
```

ステータス規約
- pass / fail / skip / BLOCKED_ENV は語で明示
- 各行（チェックリスト）は `- [ ]` / `- [x]` を必須とし、末尾に `restored:true/false` を付記

ステータス定義（厳密規約）
- pass: 期待した結果が観測できた場合。
- fail: ツール呼び出しは成立したが「期待と観測が不一致」の場合（期待したトリム/エラーが発生しない等）。必ず `reasonCode: FAIL_EXPECTATION` を付す。
- skip: 事前条件不足・環境限定により「検証そのものが実行不能/観測不能」の場合（例: 必須アセット無し、UI不存在、ツール応答に診断が無く判断不可）。`reasonCode: ENV_LIMITATION` または `OBSERVATION_GAP`、`TOOL_ERROR` 等を付す（ツールのネイティブ依存欠如・クラッシュ等は原則 skip 扱い）。
- BLOCKED_ENV: カテゴリ全体の前提（S00-00）が満たせず以降を実施不可。

判定フロー（原則）
1) グローバル前提が崩れている → BLOCKED_ENV
2) ケースの事前条件が欠如（入力アセット無し/対象シンボル不在 等） → skip（ENV_LIMITATION または INPUT_MISSING）
3) ツールの応答が簡略すぎて判断不能（診断未返却/空） → skip（OBSERVATION_GAP）
4) 検証は実行され観測できたが期待に不一致 → fail（FAIL_EXPECTATION）
5) それ以外で期待どおり → pass

観測不能時の再判定（エビデンス・エスカレーション）
- 目的: 可能な限り skip を pass/fail に再分類する。
- 手順（上から順に試行。どれかで判定できたら確定）
  1) 差分検証: `script_read` で対象範囲を「実行前/実行後」取得し、`beforeHash/afterHash` と `verified`（等価判定）を記録。
     - 期待=適用される（applied=true）: 差分なし → fail（FAIL_EXPECTATION）／差分あり → pass。
     - 期待=未適用（ガード/ブロック）: 差分なし → pass／差分あり → fail（FAIL_EXPECTATION）。
  2) 構造検証: `script_symbols_get` でシンボルの有無/開始行が期待どおりに変化しているか確認（rename/remove/insert）。
  3) 参照検証: `script_refs_find` で参照件数の期待（例: rename 後の旧名=0 件）を確認。
  4) なお判定不能（診断も差分も得られない）なら、初めて skip（OBSERVATION_GAP）とする。
- details テンプレ（例）:
- evidence:
  - read.beforeHash=sha1:..., afterHash=sha1:..., verified=false
  - symbols.before=[...], symbols.after=[...]
  - refs_find.oldNameCount=0
  - toolError: better-sqlite3: not found（発生時は skip（TOOL_ERROR）で継続）

リトライ/バックオフ（必須）
- API 呼び出しは最大3回までリトライし、待機は 250ms → 500ms → 1000ms の指数バックオフ。
- 復元（restore）が `applied=false` などで失敗した場合も同様にリトライを行い、それでも復元できない場合は当該ケースを `fail（RESTORE_FAILED）` とし、S90 での原状回復を直ちに実施する。
  - expectation: applied=true / guard=no-change など

BLOCKED_ENV の記録ルール（必須）
- チェックリスト行に「原因」を短い語句で必ず併記してください（例: `blocked（Missing .sln）`, `blocked（UnityMCP tools unavailable）`, `blocked（index coverage < 50%）`）。
- 併せて「環境詳細」の details セクションを追加し、前提チェック結果を箇条書きで明示します。
  - 例: `.sln: present / UnityMCP: reachable / code index: 32%` のように可視化。
  - S00 でのブロック時は、以降カテゴリの見出しは作らず、グローバルサマリの BLOCKED_ENV を増分してください。

fail / skip の記録ルール（必須）
- fail の場合:
  - チェックリスト行に「短い原因」を括弧付きで必ず併記（例: `fail（expectation mismatch: applied=false）`、`fail（validation: invalid path）`）。
  - details に最小限の根拠を箇条書きで明示（例: 入力値、期待、観測、主要診断コード上位3件）。
- skip の場合:
  - チェックリスト行に「スキップ理由」を括弧付きで併記（例: `skip（Input アセット無し）`、`skip（UI 無し）`）。
  - details は任意ですが、依存 testId があるときはその ID と結果を1行で示す（例: `depends: U60-01=skip`）。
  - 注意: 「期待不一致」は skip ではなく fail に分類する（例: 期待したトリム/エラーが発生しなかった → fail（FAIL_EXPECTATION））。

実行ポリシー（必須）
- 変更前の状態を取得・保存し、各テストケースの終了時に必ず復元する（チェックリスト行に restored:true を明記）
- 破壊的操作はテストで新規作成した `LLMTEST_` 系資産に限定し、テスト末尾で削除する
- プロジェクト設定は必ず元の値へ戻す。既存アセット/Prefab/シーンへ加えた変更はすべてロールバックする
- Git のコミット/プッシュ、`npm version` などのバージョン変更は行わない

完走ポリシー（必須）
- 各カテゴリは「必ず完走」する。各テスト項目は pass/fail/skip のいずれかで記録し、中断しない。
- 単一ケースの失敗や適用拒否（安全側）によりカテゴリを停止しない。理由を併記して次項目へ進む。
- 例外: グローバル前提（S00-00）で BLOCKED_ENV となった場合のみ、当該カテゴリはそこで終了する（他カテゴリは独立に実行してよい）。

ToDo 管理（エージェント内運用）
- ファイル出力は不要。エージェント（LLM）の ToDo/プラン機能（update_plan 等）に、各カテゴリの全テストを登録して進捗更新する。
- 登録例: 1) S00 ラン初期化 → pending、2) 実行時に in_progress、3) 完了で completed。

テスト仕様・操作対象の記録（必須）
- Run ヘッダに `- テスト仕様:` を記載すること（tests/ 配下の仕様ファイル相対パス）。
- Run ヘッダに `- 所感:` を1行で記載（任意だが推奨）。
- 各カテゴリ見出し直後にも `- テスト仕様:` を1行で記載（当該カテゴリの仕様ファイル）。
- 各カテゴリ見出し直後に `- 操作対象ファイル:` を任意で記載（当該カテゴリで読み書きや解析対象となったファイル）。
- 各ケースの details には `targetPaths: [ ... ]` を付記する（単一でも配列形式）。
- パスはワークスペースルート基準の相対パスで統一し、`tests/`（仕様）と `Assets/`/`Packages/`（操作対象）を明確に分けて表記する。
