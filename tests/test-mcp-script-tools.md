# MCP Script ツール テスト計画（カテゴリ: Script系）

本ドキュメントは、UnityMCP の Script 系ツール（`script_*`）を「テスターが迷わず実行・判定・復元できる」ように記述した実行仕様です。結果のレポートは Markdown 形式とし、`tests/RESULTS_FORMAT.md` のテンプレートに準拠します。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

完走ポリシー（Fail-Safe）
- 本カテゴリは必ず完走する。各項目は pass/fail/skip のいずれかで記録し、途中で停止しない。
- 適用系 API が安全側で拒否される場合（例: 参照あり削除、曖昧 namePath、パスガード）は「skip（理由）」で続行。
- 破壊的操作は `apply=false` のプレビューを優先し、適用不能なら skip として次へ進む。
- 復元の検証では、改行差などでハッシュ不一致でも「機能等価（元の挙動へ復帰）」であれば restored:true とし、details に根拠を記す。

チェックリスト（Markdown）
- [ ] S00-00: ラン初期化（事前 .sln チェックは行わない）
 - [ ] S00-X01: LSP 自動ダウンロード/復旧（バイナリ未配置→自動取得、破損→再取得、英語エラー）
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
 - [ ] S30-X01: using エイリアス経由の型参照（終端一致時のみ更新）
 - [ ] S30-X02: ネスト型のリネーム（親コンテナ一致のみ）
 - [ ] S30-X03: ジェネリック型/メソッドの識別子更新（型は横断、メンバーは宣言ファイル内）
 - [ ] S30-X04: オーバーロードの一部のみリネーム（他は未変更）
 - [ ] S30-X05: プロパティ/イベントのメンバーリネーム（宣言ファイル内のみ）
- [ ] S40-01: remove_symbol（TestMethod12）→ 欠落確認
- [ ] S40-E01: failOnReferences=true でブロック
- [ ] S40-E02: 存在しないシンボルで fail
 - [ ] S40-X01: 部分クラス内の私有メソッド削除（構文維持）
 - [ ] S40-X02: 属性の削除（影響なし）
 - [ ] S40-X03: インターフェース明示実装メソッド削除は拒否（参照あり）
 - [ ] S40-X04: イベントフィールド削除（参照有無で挙動差）
 - [ ] S40-X05: 未使用 enum メンバー削除
- [ ] S50-01: refs_find ページング/トリム（truncated, snippetTruncated）
- [ ] S50-E01: 極端な上限設定での挙動
 - [ ] S50-X01: コメント/文字列の誤検出抑制とスニペット可読性
- [ ] S60-01: 要約上限（errors<=30, message<=200, 1000文字+Truncated）
- [ ] S60-02: preview/diff/text/content が 1000 文字以内＋ Truncated フラグ
- [ ] S60-E01: 要約不能データで fail
- [ ] S70-01: パス/曖昧 namePath のガード動作
- [ ] S70-02: 曖昧 namePath で非破壊・未適用（安全側）
- [ ] S70-E01: 破壊的誤用（型/名前空間削除）で fail
- [ ] S80-01: 部分読み取り（開始行±）が抜粋で返る
- [ ] S80-02: maxBytes 指定でカット
- [ ] S80-E01: 不正範囲で fail
- [ ] S90-01: 後片付け（元状態へ完全復元）

 出力フォーマット要約（Script系の例: Markdown レポート）
 - 追記先: `tests/.reports/.current-run` のパスを必ず参照し、同一レポートへ追記（新規ファイル作成禁止）
 - チェックリスト行（PASS 例）: `- [x] S20-01 置換適用 — pass (250 ms) restored:true`
 - テスト仕様・所感・操作対象の明記（必須）:
   - Run ヘッダ: `- テスト仕様: tests/test-mcp-script-tools.md`、`- 所感: <短文>`
   - 本カテゴリ見出し直後: `- テスト仕様: tests/test-mcp-script-tools.md`、任意で `- 操作対象ファイル: Assets/Scripts/GigaTestFile.cs`
   - 各ケース details: `targetPaths: [Assets/Scripts/GigaTestFile.cs]`（単一でも配列）
  
  サマリはレポート先頭のテーブルで集計（`tests/RESULTS_FORMAT.md` 参照）。

ToDo 登録（エージェント内）
- 実行開始前に、本ファイルのすべてのケース（S00, S10, S20, S30, S40, S50, S60, S70, S80, S90）を、エージェントの ToDo/プラン機能（update_plan 等）に登録してください。
- 例（概念）:
  - S00-00: ラン初期化（.sln 事前チェックは行わない） → pending
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
- fail / skip 時は「理由」を必ず併記（例: `fail（expectation mismatch: applied=false）`、`skip（Input アセット無し）`）。必要に応じ details に根拠（入力・期待・観測・主要診断上位）を箇条書きで記載。
- 返却が `id` のみ等で詳細診断が取得できない場合は、観測不能として `skip（診断未返却）` を明記し、details にツール応答の主要フィールド（例: `success/applied/errorCount`）を記録する。
- ただし、可能な限り以下のエビデンス・エスカレーションで再判定を試みる（RESULTS_FORMAT.md 参照）。
  - 差分検証: `script_read` で before/after を取り `beforeHash/afterHash/verified` を記録。期待に照らして pass/fail を再判定。
  - 構造検証: `script_symbols_get` によりシンボル有無/開始行の変化を確認。
  - 参照検証: `script_refs_find` により参照件数の期待を確認。
  - なお判定不能時のみ最終的に `skip（OBSERVATION_GAP）` とする。
- 失敗時は `reasonCode`（例: FAIL_EXPECTATION/BLOCKED_ENV/TOOL_ERROR/TIMEOUT）と上位診断の要約（`diagnosticsTopN`）を記載してよい。
- リトライは最大3回。実施回数は `retries` に記録。

フィクスチャ準備（S00-10, 条件付き）:
- 目的: 環境差（対象メソッド不在/戻り値型不一致）で `fail/skip` が発生しないように、最小限の補助メソッド（LLMTEST_）を用意して検証可能状態を整える（必ず S90 で削除）。
- 追加シンボル定義（FinalTestClass 内、必要時のみ挿入）:
  - LLMTEST_TestMethod12（void）: `private void LLMTEST_TestMethod12() { UnityEngine.Debug.Log("LLMTEST 12"); }`
  - LLMTEST_ReturnInt（int）: `private int LLMTEST_ReturnInt() { return 0; }`
  - LLMTEST_RenameMe（void）: `private void LLMTEST_RenameMe() { }`
  - LLMTEST_RemoveMe（void）: `private void LLMTEST_RemoveMe() { }`
- 挿入手順: `script_edit_structured(operation=insert_after, path=Assets/Scripts/GigaTestFile.cs, symbolName=FinalTestClass, newText=\"        <定義>\\n\")`
- 利用方針:
  - S10-01: `TestMethod12` 不在時は `LLMTEST_TestMethod12` を代替として可。
  - S20-01: `LLMTEST_ReturnInt` をターゲットとする（戻り値検証のため）。
  - S30-01: `LLMTEST_RenameMe` をターゲットとする（参照非依存）。
  - S40-01: `LLMTEST_RemoveMe` をターゲットとする（欠落確認と復元が容易）。
  - 以降のケースは既存対象で成立する限り LLMTEST_* は作成しない（最小編集）。
  - S90 で LLMTEST_* をすべて削除する。

S00) ラン初期化（.sln 事前チェックは行わない）

目的: レポート初期化と最低限の到達性確認のみを行う。`.sln` の存在判定は行わず、以降の Script ツール呼び出し内部のチェックに委譲する。

チェックリスト（順に実施）:
1. レポート/ポインタ初期化（必須）: `tests/.reports/.current-run` へランファイルのパスを書き出す。
2. UnityMCP ツール到達性: `UnityMCP__script_symbols_get` など最小呼び出しが応答することを確認（0件でも可）。
3. パス制約: 以降の `path`/`relative` は必ず `Assets/` または `Packages/` 起点で指定する。
4. インデックス状況: `script_index_status` でカバレッジを確認し、低ければ（任意）`UnityMCP__build_code_index` を実行して再確認する。
5. 到達性確認: 最小ファイルに対して `script_symbols_get` が成功することを確認（0件でも可）。

ブロック方針:
- `.sln` の有無は個別に判定しない。Script ツール呼び出し内部のチェックで失敗した場合に限り、`blocked（<短い原因>）` として記録し、details に根拠を記す。

## 前提・共通ルール

- 禁止: LSPサーバを直接起動・操作しない。必ず UnityMCP の `script_*` ツールで検証する（例: `UnityMCP__script_symbols_get`, `UnityMCP__script_edit_structured`）。
- パスは必ず `Assets/` または `Packages/` 起点の相対パス
- `namePath`/`symbolName` は `Outer/Nested/Member` 形式（例: `FinalTestClass/TestMethod12`）を優先
- 大量診断（CS0234 等）は想定内。適用可否は `applied` で判断し、実ファイルは `script_read` で確認
- テスト対象大ファイル: `Assets/Scripts/GigaTestFile.cs`
- `preview=true` は診断確認時のみ。適用時は `preview=false`

---

## S10) シンボル特定（script_symbols_get / script_symbol_find）

正常系:
- S10-01: `script_symbols_get` で `FinalTestClass` と `TestMethod11`、および `TestMethod12`（不在時は `LLMTEST_TestMethod12` 可）を確認（開始行・コンテナ含む）
- S10-02: 必要に応じ `script_symbol_find` で namePath を補助確定

異常系:
- S10-E01: `Assets/Nope.cs` で `script_symbols_get` → `fail`
- S10-E02: 極端に大きいファイルでの完了性確認（本APIは上限/ページ指定無し）
  - 期待: `script_symbols_get` が正常完了し、`symbols` が非空。完了時間が実用範囲（目安 ≤ 10s）。
  - 観測: タイムアウト/エラー → `fail`。空結果 → `fail（FAIL_EXPECTATION）`。
  - 観測不能（診断未返却 等）やツール依存不足 → `skip（OBSERVATION_GAP or TOOL_ERROR）`

判定条件・復元:
- 判定: 期待どおりのシンボルが列挙され、`startLine` と `container` が取得できること。
- 復元: 非破壊（読み取りのみ）のため不要（`restored=true` を出力）。

---

## S20) 置換（script_edit_structured）整形検証

正常系:
- S20-01: `replace_body`（`symbolName=FinalTestClass/LLMTEST_ReturnInt`, `newText={ return 99; }`）→ `applied=true`。`script_read` の 30–40 行でインデント自然

異常系:
- S20-E01: 不正シンボル → `fail`
- S20-E02: 構文不正 `newText` → 診断最大 30 件、`applied=false`

判定条件・復元:
- 判定: 応答 `applied=true` かつ `script_read` 抜粋に `return 99;` が反映。インデント崩れがない。
- 復元: 実行前に `script_read` で本体スニペットを保存。終了時に `replace_body` で元本体に戻し、`beforeHash==afterHash` を確認。
  備考: 既存 `TestMethod12` は戻り値 `void` のため、本ケースは LLMTEST_ReturnInt を用いる。
  備考: 改行差等でハッシュ不一致でも動作が等価なら restored:true とし、details に理由を記載。
  復元失敗時のフォールバック:
  - 即時復元が `applied=false` となる場合は、以下を順に実施し、それでも復元不能なら当該ケースは `fail（RESTORE_FAILED）` とする。
    1) リトライ（3回、250→500→1000ms バックオフ）
    2) 差分検証で対象スニペットを再特定して `replace_body` 再適用
    3) `insert_after/before` による復元スニペット再挿入（重複時は重複除去）
    4) S90 での原状回復を直ちに実施（ケースは fail として記録し、以降を継続）

---

## S30) リネーム（script_refactor_rename）＋参照確認

正常系:
- S30-01: `namePath=FinalTestClass/LLMTEST_RenameMe` → `newName=LLMTEST_RenameMe_Renamed` → `applied=true`
- S30-02: `script_read` で宣言が更新済み
- S30-03: `script_refs_find`（`name=TestMethod11`）でコード参照 0（文字列/コメント除外）

異常系:
- S30-E01: 既存名への衝突 → `fail` or `errors` 記録
- S30-E02: 曖昧 `namePath` → 安全側で `applied=false`

実行手順（エッジケース例）:
- S30-X01: using エイリアス終端一致
  - `script_refactor_rename(relative=Assets/Scripts/DiceController.cs, namePath=DiceController, newName=DiceControllerV3, preview=false)`
  - 期待: `using DC = <...>.DiceController;` のような別名が `...DiceControllerV3` に更新（終端一致時のみ）。
- S30-X02: ネスト型
  - `script_refactor_rename(relative=Assets/Scripts/GigaTestFile.cs, namePath=Outer/Inner, newName=InnerX, preview=false)`
  - 期待: `Outer` 直下の `Inner` のみ更新（他 `Inner` は未変更）。
- S30-X03: ジェネリック
  - 型: `script_refactor_rename(relative=Assets/Scripts/GigaTestFile.cs, namePath=FinalTestClass, newName=FinalTestClass2, preview=false)`
  - メンバー: `script_refactor_rename(relative=Assets/Scripts/GigaTestFile.cs, namePath=FinalTestClass/GenericMethod, newName=GenericMethod2, preview=false)`
  - 期待: 型は横断更新、メンバーは宣言ファイル内のみ。
- S30-X04: オーバーロード
  - `script_refactor_rename(relative=Assets/Scripts/GigaTestFile.cs, namePath=FinalTestClass/Roll, newName=RollFast, preview=false)`（パラメータ無し版を対象）
  - 期待: 他の `Roll(int)` は未変更。
- S30-X05: プロパティ/イベント
  - `script_refactor_rename(relative=Assets/Scripts/GigaTestFile.cs, namePath=FinalTestClass/Score, newName=Score2, preview=false)`
  - `script_refactor_rename(relative=Assets/Scripts/GigaTestFile.cs, namePath=FinalTestClass/OnRolled, newName=OnRolled2, preview=false)`
  - 期待: 宣言ファイル内のみ更新。

判定条件・復元:
- 判定: `applied=true`、宣言が新名に更新、`script_refs_find(name=旧名)` のコード参照 0。
- 復元: `script_refactor_rename` で元名へ戻す（実行前に旧名を保存）。
  環境制約: 適用不可（dry-run/参照未解決など）で `applied=false` の場合は `skip（環境制約）` とし、details に `success/applied/errorCount` 等を記録。

---

## S40) シンボル削除（script_remove_symbol）

正常系:
- S40-01: `failOnReferences=false` で削除適用（対象: `FinalTestClass/LLMTEST_RemoveMe`。存在すれば `TestMethod12` を用いても可）→ `applied=true`、`script_read` で欠落確認

異常系:
- S40-E01: `failOnReferences=true` かつ参照あり → `applied=false` でブロック
- S40-E02: 存在しないシンボル → `fail`

実行手順（エッジケース例）:
- S40-X01: 部分クラスの私有メソッド
  - `script_remove_symbol(path=Assets/Scripts/GigaTestFile.cs, namePath=PartialClass/LLMTEST_Helper, apply=true, failOnReferences=true)`
  - 期待: 参照が無ければ削除成功／あればブロック。
- S40-X02: 属性
  - `script_remove_symbol(path=Assets/Scripts/GigaTestFile.cs, namePath=FinalTestClass/LLMTEST_Attr, apply=true, failOnReferences=true)`
  - 期待: 削除適用（構文維持）。
- S40-X03: 明示実装
  - `script_remove_symbol(path=Assets/Scripts/GigaTestFile.cs, namePath=IFoo/Bar, apply=true, failOnReferences=true)`
  - 期待: 参照ありでブロック。
- S40-X04: イベント
  - `script_remove_symbol(path=Assets/Scripts/GigaTestFile.cs, namePath=FinalTestClass/OnRolled, apply=true, failOnReferences=true)`
  - 期待: 参照があればブロック、無ければ成功。
- S40-X05: enum メンバー
  - `script_remove_symbol(path=Assets/Scripts/GigaTestFile.cs, namePath=SomeEnum/MemberX, apply=true, failOnReferences=true)`
  - 期待: 未使用なら成功。

判定条件・復元:
- 判定: `applied=true` かつ `script_read` で該当メソッドが欠落。
- 復元: 実行前に「完全スニペット（宣言＋本体）」を保存し、`script_edit_structured` の `insert_after`（または `insert_before`）で `FinalTestClass` 内に再挿入。`beforeHash==afterHash` を確認。

実行手順（例示・パラメータ完全指定）:
- 事前取得: `script_read(path=Assets/Scripts/GigaTestFile.cs, startLine=対象周辺, endLine=対象周辺)` で対象スニペットを保存（宣言行含む）。
- S40-01 実行: `script_remove_symbol(path=Assets/Scripts/GigaTestFile.cs, namePath=FinalTestClass/LLMTEST_RemoveMe, apply=true, failOnReferences=false, removeEmptyFile=false)`
  - 期待: `success:true, applied:true`。続けて `script_read` で対象行の欠落を確認。
  - 復元: `script_edit_structured(operation=insert_after, path=Assets/Scripts/GigaTestFile.cs, symbolName=FinalTestClass, newText="        private void LLMTEST_RemoveMe() { }\n")`
- S40-E01 実行: 参照が存在するシンボル例 `BaseProcessor/GetProcessorName` を対象
  - `script_remove_symbol(path=Assets/Scripts/GigaTestFile.cs, namePath=BaseProcessor/GetProcessorName, apply=true, failOnReferences=true)`
  - 期待: `applied:false`（ブロック）。`errors` に参照あり旨の診断が要約される。
  - 観測不能時の再判定: 差分検証でファイル変更が「無い」ことが取れれば pass／「有る」なら fail（FAIL_EXPECTATION）。
    - なお差分も取れない場合に限り `skip（OBSERVATION_GAP）`。
- S40-E02 実行: `script_remove_symbol(path=Assets/Scripts/GigaTestFile.cs, namePath=FinalTestClass/ThisDoesNotExist, apply=true, failOnReferences=false)`
  - 期待: `success:false` または `applied:false` とエラーメッセージ。
  - 観測不能時の扱いは E01 と同様に `skip（診断未返却）`。

---

## S50) 参照検索（script_refs_find）ページング/要約

正常系:
- S50-01: `name=FinalTestClass`, `pageSize=20`, `maxBytes=65536`, `maxMatchesPerFile=3` → `truncated`/`snippetTruncated` の挙動確認

異常系:
- S50-E01: 極端な上限（`maxBytes=1` 等）→ `fail` または最小限応答

実行手順（品質確認）:
- S50-X01: コメント/文字列の誤検出抑制
  - `script_refs_find(name=FinalTestClass, scope=assets, pageSize=50, maxBytes=65536, maxMatchesPerFile=5, snippetContext=2)`
  - 期待: コード位置のみヒット（コメント/文字列は除外が望ましい）。

判定条件・復元:
- 判定: `truncated` と各スニペットの `snippetTruncated` の有無が期待値通り（最大400文字トリム）。件数・上限は実行パラメータに合致。
  - 極端上限（S50-E01）で `truncated:true` にならない等の期待不一致は `fail（FAIL_EXPECTATION）`。
- 復元: 非破壊のため不要（`restored=true`）。

実行手順（パラメータ完全指定）:
- S50-01: `script_refs_find(name=FinalTestClass, namespace=, container=, kind=, scope=assets, pageSize=20, maxBytes=65536, maxMatchesPerFile=3, snippetContext=1)`
  - 期待: `success:true`。対象が少ない場合は `truncated:false` でも可。ヒットが多い場合は `truncated:true` 且つ各 `snippetTruncated` が最大400文字トリムに従う。
- S50-E01: `script_refs_find(name=FinalTestClass, scope=assets, pageSize=1, maxBytes=1, maxMatchesPerFile=1, snippetContext=0)`
  - 期待: `success:true` かつ `truncated:true`（最小限応答）。`results` が空でも可（観測値を記録）。

---

## S60) 要約応答の上限検証（全 script_* 共通）

正常系:
- S60-01: `preview=true` で大量診断 → `errors<=30`、`message<=200` 文字（満たさない場合は `fail（FAIL_EXPECTATION）`）
- S60-02: `preview`/`diff`/`text`/`content` が 1000 文字以内＋ `Truncated` フラグ（満たさない場合は `fail（FAIL_EXPECTATION）`）

異常系:
- S60-E01: 要約不能データ → 安全に `fail`

判定条件・復元:
- 判定: `errors`<=30、各 `message`<=200 文字、`preview/diff/text/content`<=1000 文字＋ `Truncated` フラグ。満たさない場合は `fail（FAIL_EXPECTATION）`。
- 復元: 非破壊（`preview=true`）を優先。適用した場合は必ず復元。
  - 観測不能時の観測性向上策: `newText` を意図的に難読化（複数行・未終了ブロック等）して診断量を増やす／`snippetContext` や対象を増やす等で生応答を得やすくする。
  - それでも診断やペイロードが得られない場合のみ `skip（OBSERVATION_GAP）`。

実行手順（テストドライバの例）:
- S60-01: `script_edit_structured(operation=replace_body, path=Assets/Scripts/GigaTestFile.cs, symbolName=FinalTestClass/TestMethod11, newText="{\n    this is not valid C#;\n}\n", preview=true)`
  - 期待: `applied:false`。`errors` が多数でも要約されて `<=30`、各 `message` は `<=200` 文字。
  - 乖離時: `fail（errors>30 など）` とし details に上位診断の ID/件数を記録。
- S60-02: 同 API 応答の `preview/diff/text/content` を 1000 文字以内へサマライズしていることを確認（`Truncated:true`）。
  - 観測不能時: `skip（診断未返却 or payload 無し）` とする。
- S60-E01: `symbolName` に存在しないシンボル（例: `FinalTestClass/NoSuchMethod`）を指定し `preview=true` で実施
  - 期待: `success:false` または適切なエラー。
  - 応答が `id` のみ等で不十分な場合は `skip（診断未返却）`。

---

## S70) 誤用防止/ガード

正常系（ガード動作確認）:
- S70-01: `path`/`relative` が `Assets/`/`Packages/` 外（例: `UnityMCPServer/...`）→ 拒否/正規化
- S70-02: 曖昧 `namePath` で不必要な編集が発生しない

異常系:
- S70-E01: ルート型/名前空間削除など破壊的誤用 → `fail`

判定条件・復元:
- 判定: `Assets/`/`Packages/` 外パスや曖昧 namePath では適用されない/拒否されること。
- 復元: 非破壊のため不要（`restored=true`）。

実行手順（具体例）:
- S70-01: パス正規化/拒否（安全側）
  - `script_symbols_get(path=UnityMCPServer/Assets/Scripts/GigaTestFile.cs)`（冗長/不正確パス）
  - 期待: 非破壊で安全側（正規化して成功 または 拒否）。どちらでも pass とし、応答の挙動を details に記録。
- S70-02: 曖昧 `namePath` の安全側動作（非破壊）
  - `script_edit_structured(operation=replace_body, path=Assets/Scripts/GigaTestFile.cs, symbolName=FinalTestClass/*, newText="{ return 0; }", preview=true)`
  - 期待: 適用されない（`applied:false`）か、複数一致のため拒否。コード変更が発生しないこと。
- S70-E01: 破壊的誤用の拒否
  - `script_remove_symbol(path=Assets/Scripts/GigaTestFile.cs, namePath=FinalTestClass, apply=false, failOnReferences=true)`
  - 期待: `success:false` または `applied:false` と妥当なエラーが返る。
  - 診断が返らない場合は `skip（プレビュー診断未返却）`。

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

## S82) 軽量スニペット編集（script_edit_snippet）

正常系:
- S82-01: `preview=true` で `if (foo == null) return;` と `if (bar == null) return;` の2箇所削除 → `results[].status=applied`、`preview` に diff を含む
- S82-02: `operation=replace` で比較演算子のみを `==`→`!=` に変更（差分≤80文字）→ 適用成功
- S82-03: `operation=insert` と `anchor.position=before` で `return` 直前にログを挿入 → 重複ログ検知で二重挿入しない

異常系:
- S82-E01: `instructions` が11件（上限10超過）→ `fail（validation: instruction limit exceeded）`
- S82-E02: `anchor.target` 差分が80文字超 → `fail（validation: diff>80 chars）`
- S82-E03: アンカーが複数箇所一致 → `fail（anchor_not_unique）`
- S82-E04: LSP診断に `Expected }` 等の構文エラー → 全編集ロールバック `fail（syntax_error）`

実行手順（例: nullガード削除）:
1. `script_read` で対象メソッドを取得し、削除対象のスニペットを正確にコピー
2. `script_edit_snippet` を以下のように呼び出す
   ```json
   {
     "path": "Assets/Scripts/GigaTestFile.cs",
     "preview": true,
     "instructions": [
       {
         "operation": "delete",
         "anchor": {
           "type": "text",
           "target": "        if (first == null) return;\\n"
         }
       },
       {
         "operation": "delete",
         "anchor": {
           "type": "text",
           "target": "        if (second == null) return;\\n"
         }
       }
     ]
   }
   ```
3. `preview` で差分を確認し安全なら `preview=false` で適用

備考:
- 適用前に LSP (`mcp/validateTextEdits`) で括弧整合を検証。診断が返された場合はファイルが書き換わらないことを確認する。
- `anchor.target` は改行を含めて正確に指定する。曖昧なターゲットは `anchor_not_unique` で拒否される。

---

## S90) 後片付け（任意）

正常系:
- S90-01: リネーム/置換を元に戻す

異常系:
- S90-E01: 不在対象のロールバック → `skip` または `fail`

判定条件・復元:
- 判定: すべての変更が元に戻っており、`beforeHash==afterHash`。残存差分なし。
- 復元: 本ケース自体が最終復元の確認となる。
