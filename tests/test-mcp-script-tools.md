# MCP Script ツール テスト計画（カテゴリ: Script系）

本ドキュメントは、roslyn-cli 連携の Script 系 MCP ツール（`script_*`）を「テスターが迷わず実行・判定・復元できる」ように記述した実行仕様です。結果のレポートは Markdown 形式とし、`tests/RESULTS_FORMAT.md` のテンプレートに準拠します。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

チェックリスト（Markdown）
- [ ] S00-00: 前提チェック（.sln 必須・無ければ即終了）
- [ ] S10-01: script_symbols_get で FinalTestClass/TestMethod11/12 確認
- [ ] S10-02: script_symbol_find で namePath 補助確定
- [ ] S10-E01: 存在しないファイルで script_symbols_get は fail
- [ ] S10-E02: 極端な大ファイルで上限越え時の挙動確認
- [ ] S20-01: replace_body（TestMethod12 を `{ return 99; }`）→ 整形確認
- [ ] S20-E01: 不正シンボルで fail
- [ ] S20-E02: 構文不正 newText で診断要約・未適用
- [ ] S30-01: rename（TestMethod11→Renamed）→ 宣言更新確認
- [ ] S30-02: 旧名 refs=0 確認
- [ ] S30-E01: 既存名への衝突で fail
- [ ] S30-E02: 曖昧 namePath で applied=false
- [ ] S40-01: remove_symbol（TestMethod12）→ 欠落確認
- [ ] S40-E01: failOnReferences=true でブロック
- [ ] S40-E02: 存在しないシンボルで fail
- [ ] S50-01: refs_find ページング/トリム（truncated, snippetTruncated）
- [ ] S50-E01: 極端な上限設定での挙動
- [ ] S60-01: 要約上限（errors<=30, message<=200, 1000文字+Truncated）
- [ ] S60-E01: 要約不能データで fail
- [ ] S70-01: パス/曖昧 namePath のガード動作
- [ ] S70-E01: 破壊的誤用（型/名前空間削除）で fail
- [ ] S80-01: 部分読み取り（開始行±）が抜粋で返る
- [ ] S80-02: maxBytes 指定でカット
- [ ] S80-E01: 不正範囲で fail
- [ ] S90-01: 後片付け（元状態へ完全復元）

出力フォーマット要約（Script系の例: Markdown レポート）
- 追記先: `tests/.reports/.current-run` のパスを必ず参照し、同一レポートへ追記（新規ファイル作成禁止）
- チェックリスト行（PASS 例）: `- [x] S20-01 置換適用 — pass (250 ms) restored:true`
- 前提未充足（S00）例: `- [ ] S00-00 前提チェック — blocked（Missing .sln） restored:true`
  サマリはレポート先頭のテーブルで集計（`tests/RESULTS_FORMAT.md` 参照）。

ToDo 登録（エージェント内）
- 実行開始前に、本ファイルのすべてのケース（S00, S10, S20, S30, S40, S50, S60, S70, S80, S90）を、エージェントの ToDo/プラン機能（update_plan 等）に登録してください。
- 例（概念）:
  - S00-00: 前提チェック（.sln 必須） → pending
  - S10-01: script_symbols_get で FinalTestClass 確認 → pending
  - S20-01: replace_body（TestMethod12 を 99 に） → pending
  …（以降同様）

原状回復（必須）・禁止事項（全ケース共通）:
- 各ケース開始時に対象の「変更前状態」を取得・保存（例: 本体スニペットとハッシュ、宣言名、開始行）。
- 各ケース終了時に必ず復元（リネームは元名へ、`replace_body` は元本体へ戻す、削除は `insert_*` で復元）。
- 新規作成・挿入は `LLMTEST_` 名で行い、テスト末尾に削除する。
- Git へのコミット/プッシュや `npm version` 等は行わない。

判定・報告（全ケース共通）:
- レポートは Markdown（`tests/RESULTS_FORMAT.md`）に準拠し、チェックリスト行に `pass/fail/skip/BLOCKED_ENV` と `restored:true/false` を明記する。
- 失敗時は `reasonCode`（例: FAIL_EXPECTATION/BLOCKED_ENV/TOOL_ERROR/TIMEOUT）と上位診断の要約（`diagnosticsTopN`）を記載してよい。
- リトライは最大3回。実施回数は `retries` に記録。

S00) 実行前準備（必須・sln 非存在時は即終了）

目的: 適用系（rename/remove/replace）が成立するための前提確認を行い、満たさない場合は「テスト続行不可」として即時終了する。

チェックリスト（順に実施）:
1. ソリューション確認（必須・生成禁止）: ワークスペース直下（または既定のプロジェクトルート）に Unity が生成した `.sln` が存在するか確認する。ここで Unity を起動して新規に `.sln` を生成しようとしてはならない（テスト設計側の前提）。
2. roslyn-cli serve 起動確認: 最新バイナリで serve が稼働し、上記 `.sln`（または代表 `.csproj`）を解決対象としていることを確認する。
3. パス制約: 以降の `path`/`relative` は必ず `Assets/` または `Packages/` 起点で指定する。
4. インデックス状況: `script_index_status` でカバレッジを確認し、低ければ（任意）`UnityMCP__build_code_index` を実行して再確認する（`.sln` が存在する場合のみ）。
5. 到達性確認: 最小ファイルに対して `script_symbols_get` が成功することを確認（0件でも可）。

即時終了ポリシー（厳守）:
- `.sln` が存在しない場合は、テストを続行不可とし、その時点で終了する。以降のケースは一切実行しない。
- この場合、Markdown レポートのチェックリストに `S00-00: 前提チェック — blocked（Missing .sln）` を1行追記し、サマリテーブルで `BLOCKED_ENV` を 1 にする。

## 前提・共通ルール

- roslyn-cli serve は最新バイナリで起動済み（再起動は人間側で実施）
- パスは必ず `Assets/` または `Packages/` 起点の相対パス
- `namePath`/`symbolName` は `Outer/Nested/Member` 形式（例: `FinalTestClass/TestMethod12`）を優先
- 大量診断（CS0234 等）は想定内。適用可否は `applied` で判断し、実ファイルは `script_read` で確認
- テスト対象大ファイル: `Assets/Scripts/GigaTestFile.cs`
- `preview=true` は診断確認時のみ。適用時は `preview=false`

---

## S10) シンボル特定（script_symbols_get / script_symbol_find）

正常系:
- S10-01: `script_symbols_get` で `FinalTestClass` と `TestMethod11/12` を確認（開始行・コンテナ含む）
- S10-02: 必要に応じ `script_symbol_find` で namePath を補助確定

異常系:
- S10-E01: `Assets/Nope.cs` で `script_symbols_get` → `fail`
- S10-E02: 極端に大きいファイルでの上限超過 → トリム/`fail` を記録

判定条件・復元:
- 判定: 期待どおりのシンボルが列挙され、`startLine` と `container` が取得できること。
- 復元: 非破壊（読み取りのみ）のため不要（`restored=true` を出力）。

---

## S20) 置換（script_edit_structured）整形検証

正常系:
- S20-01: `replace_body`（`symbolName=FinalTestClass/TestMethod12`, `newText={ return 99; }`）→ `applied=true`。`script_read` の 30–40 行でインデント自然

異常系:
- S20-E01: 不正シンボル → `fail`
- S20-E02: 構文不正 `newText` → 診断最大 30 件、`applied=false`

判定条件・復元:
- 判定: 応答 `applied=true` かつ `script_read` 抜粋に `return 99;` が反映。インデント崩れがない。
- 復元: 実行前に `script_read` で本体スニペットを保存。終了時に `replace_body` で元本体に戻し、`beforeHash==afterHash` を確認。

---

## S30) リネーム（script_refactor_rename）＋参照確認

正常系:
- S30-01: `namePath=FinalTestClass/TestMethod11` → `newName=TestMethod11_Renamed` → `applied=true`
- S30-02: `script_read` で宣言が更新済み
- S30-03: `script_refs_find`（`name=TestMethod11`）でコード参照 0（文字列/コメント除外）

異常系:
- S30-E01: 既存名への衝突 → `fail` or `errors` 記録
- S30-E02: 曖昧 `namePath` → 安全側で `applied=false`

判定条件・復元:
- 判定: `applied=true`、宣言が新名に更新、`script_refs_find(name=旧名)` のコード参照 0。
- 復元: `script_refactor_rename` で元名へ戻す（実行前に旧名を保存）。

---

## S40) シンボル削除（script_remove_symbol）

正常系:
- S40-01: `failOnReferences=false` で削除適用 → `applied=true`、`script_read` で欠落確認

異常系:
- S40-E01: `failOnReferences=true` かつ参照あり → `applied=false` でブロック
- S40-E02: 存在しないシンボル → `fail`

判定条件・復元:
- 判定: `applied=true` かつ `script_read` で該当メソッドが欠落。
- 復元: 実行前に「完全スニペット（宣言＋本体）」を保存し、`script_edit_structured` の `insert_after`（または `insert_before`）で `FinalTestClass` 内に再挿入。`beforeHash==afterHash` を確認。

---

## S50) 参照検索（script_refs_find）ページング/要約

正常系:
- S50-01: `name=FinalTestClass`, `pageSize=20`, `maxBytes=65536`, `maxMatchesPerFile=3` → `truncated`/`snippetTruncated` の挙動確認

異常系:
- S50-E01: 極端な上限（`maxBytes=1` 等）→ `fail` または最小限応答

判定条件・復元:
- 判定: `truncated` と各スニペットの `snippetTruncated` の有無が期待値通り（最大400文字トリム）。件数・上限は実行パラメータに合致。
- 復元: 非破壊のため不要（`restored=true`）。

---

## S60) 要約応答の上限検証（全 script_* 共通）

正常系:
- S60-01: `preview=true` で大量診断 → `errors<=30`、`message<=200` 文字
- S60-02: `preview`/`diff`/`text`/`content` が 1000 文字以内＋ `Truncated` フラグ

異常系:
- S60-E01: 要約不能データ → 安全に `fail`

判定条件・復元:
- 判定: `errors`<=30、各 `message`<=200 文字、`preview/diff/text/content`<=1000 文字＋ `Truncated` フラグ。
- 復元: 非破壊（`preview=true`）を優先。適用した場合は必ず復元。

---

## S70) 誤用防止/ガード

正常系（ガード動作確認）:
- S70-01: `path`/`relative` が `Assets/`/`Packages/` 外（例: `UnityEditorMCP/...`）→ 拒否/正規化
- S70-02: 曖昧 `namePath` で不必要な編集が発生しない

異常系:
- S70-E01: ルート型/名前空間削除など破壊的誤用 → `fail`

判定条件・復元:
- 判定: `Assets/`/`Packages/` 外パスや曖昧 namePath では適用されない/拒否されること。
- 復元: 非破壊のため不要（`restored=true`）。

---

## S80) 部分読み取り/サイズ制限（script_read）

正常系:
- S80-01: シンボル周辺のみ（開始行±15）を抜粋
- S80-02: `maxBytes` 指定でカット

異常系:
- S80-E01: 不正範囲（`startLine>endLine` 等）→ `fail`

判定条件・復元:
- 判定: 指定範囲のみの抜粋が返り、`maxBytes` 指定時に出力がカットされること。
- 復元: 非破壊のため不要（`restored=true`）。

---

## S90) 後片付け（任意）

正常系:
- S90-01: リネーム/置換を元に戻す

異常系:
- S90-E01: 不在対象のロールバック → `skip` または `fail`

判定条件・復元:
- 判定: すべての変更が元に戻っており、`beforeHash==afterHash`。残存差分なし。
- 復元: 本ケース自体が最終復元の確認となる。
