# MCP Script Tools テスト計画（Agent向け実行チェックリスト）

本ドキュメントのチェックリストに従い、MCPツールを用いて動作検証を行ってください。各項目は上から順に実施し、結果を記録してください。

## 前提・共通ルール

- [ ] roslyn-cli serve は最新バイナリで起動済み（serve再起動は人間側で実施）
- [ ] C#関連ツールのパス指定は必ず `Assets/` もしくは `Packages/` 起点の相対パスを使用
- [ ] `namePath`/`symbolName` は `Outer/Nested/Member` 形式（例: `FinalTestClass/TestMethod12`）を優先
- [ ] 大量診断（CS0234 等）は想定内。適用可否は `applied` で判断し、実ファイルは `script_read` で確認
- [ ] テスト対象ファイルは大きいファイル: `Assets/Scripts/GigaTestFile.cs`

補足: `preview=true` は診断確認時のみ使用。適用時は `preview=false` を使用（診断があっても適用は進む設計）。

---

## 1) シンボル特定（symbol discovery）

- [ ] `script_symbols_get` で `Assets/Scripts/GigaTestFile.cs` のシンボル一覧を取得し、`FinalTestClass` とそのメソッド（例: `TestMethod11` / `TestMethod12`）を確認
- [ ] 以降で用いる `namePath` を `FinalTestClass/TestMethod11`・`FinalTestClass/TestMethod12` として確定

期待: `symbols` にコンテナ（container）・開始行（startLine）が含まれる

---

## 2) replace_body の整形検証（script_edit_structured）

- [ ] `script_edit_structured` を以下で実行
  - `operation=replace_body`
  - `path=Assets/Scripts/GigaTestFile.cs`
  - `symbolName=FinalTestClass/TestMethod12`
  - `newText={ return 99; }`
  - `preview=false`
- [ ] 直後に `script_read` で対象メソッド周辺（目安: 30–40行）を読み、インデントが自然に整形されていることを確認

期待: `applied=true` かつ メソッド本体に `return 99;` が入り、インデント崩れがない

---

## 3) rename の一括置換検証（script_refactor_rename）

- [ ] `script_refactor_rename` を以下で実行
  - `relative=Assets/Scripts/GigaTestFile.cs`
  - `namePath=FinalTestClass/TestMethod11`
  - `newName=TestMethod11_Renamed`
  - `preview=false`
- [ ] `script_read` で `FinalTestClass` 内の該当メソッドが `TestMethod11_Renamed` に変わっていることを確認
- [ ] `script_refs_find` で旧名 `TestMethod11` の残存参照が 0 件であることを確認（`pageSize=20,maxBytes=65536,maxMatchesPerFile=3`）

期待: `applied=true` かつ 旧名の参照無し（文字列/コメント内は対象外）

---

## 4) remove_symbol の挙動検証（参照有無）

- [ ] `script_remove_symbol` を以下で実行（参照があっても削除）
  - `path=Assets/Scripts/GigaTestFile.cs`
  - `namePath=FinalTestClass/TestMethod12`
  - `apply=true`
  - `failOnReferences=false`
  - `removeEmptyFile=false`
- [ ] `script_read` で `TestMethod12` が削除されたこと、ファイルの整形が維持されていることを確認

期待: `applied=true` かつ 該当シンボルが削除

（オプション）
- [ ] 事前に `script_refs_find` で `TestMethod12` の参照を確認し、`failOnReferences=true` の場合に `applied=false` でブロックされることも確認

---

## 5) refs_find のページング/要約（script_refs_find）

- [ ] `script_refs_find` を以下で実行
  - `name=FinalTestClass`
  - `pageSize=20`
  - `maxBytes=65536`
  - `maxMatchesPerFile=3`
- [ ] `truncated` フラグやスニペットの 400 文字トリム（`snippetTruncated`）が動作していることを確認

期待: `results` が上限内でカットされ、`truncated`/`snippetTruncated` のフラグが適切

---

## 6) 要約応答の上限検証（すべての script_* 共通）

- [ ] いずれかの大出力操作（例: `script_edit_structured` の preview など）を実行し、以下を確認
  - `errors` が最大 30 件に制限
  - 各 `message` が 200 文字以内
  - `preview`/`diff`/`text`/`content` が 1000 文字以内＋ `Truncated` フラグ付与

期待: 要約仕様に従った応答

---

## 7) 誤用防止とエラー時の挙動

- [ ] `path`/`relative` を `Assets/` もしくは `Packages/` 以外（例: `UnityEditorMCP/…`）にすると、正しく拒否/正規化されるか確認
- [ ] `namePath` を曖昧な短い名前だけにした場合、意図しない対象を編集しない（可能なら事前に `script_symbols_get` で補正）

期待: 誤用入力での不必要な編集が発生しない

---

## 8) 大きなファイルの読み取り最小化（script_read）

- [ ] `script_read` で `Assets/Scripts/GigaTestFile.cs` の対象メソッド周辺のみ（例: `startLine=シンボル開始行-15`, `endLine=開始行+15`）を読み、全ファイルではなく最小範囲で読めていることを確認
- [ ] `maxBytes` 設定で出力がカットされることを確認

期待: 節約された抜粋が返る

---

## 9) 後片付け（任意）

- [ ] 必要に応じ、rename/remove/replace を元に戻す（別途スクリプトや差分ツールで）

---

## 実行ログの保存（任意）

- [ ] 主要ステップのツール呼び出し結果（成功/失敗・`applied`・主要エラー要約）を記録

