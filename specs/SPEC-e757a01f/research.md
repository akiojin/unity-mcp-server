# Phase 0: リサーチ結果

**機能ID**: `SPEC-e757a01f` (US-7: 軽量スニペット編集)
**実施日**: 2025-10-24
**ステータス**: ✅ 完了

## 概要

軽量スニペット編集ツール（`script_edit_snippet`）の実装に先立ち、技術的な実現可能性と既存インフラの利用可能性を調査しました。

## 調査結果

### R-001: Roslyn LSP側で構文診断を得る最適なリクエスト

**結論**: ✅ `mcp/validateTextEdits` メソッドを使用

**詳細**:
- **実装場所**: `LspRpcClient.validateText()` (src/lsp/LspRpcClient.js:102-114)
- **メソッド**: `mcp/validateTextEdits`
- **パラメータ**:
  - `relative`: ファイルパス（Assets/またはPackages/からの相対パス）
  - `newText`: 編集後のテキスト全体
- **レスポンス**: 診断結果の配列
  ```javascript
  {
    severity: number,  // 1=Error, 2=Warning, 3=Info, 4=Hint
    message: string,
    id: string,
    line: number,
    column: number
  }
  ```
- **エラー検出**: `severity === 1` でエラーを判定

**実装済み**: すでにLspRpcClientに実装されており、そのまま利用可能。

---

### R-002: LspRpcClientに複数テキストEditを適用するAPI

**結論**: ✅ 専用APIは不要（現在の実装で十分）

**詳細**:
- `ScriptEditSnippetToolHandler` は複数編集をテキストレベルで順次適用（ループ処理）
- 各編集は単純な文字列操作（`indexOf` + スライス＋結合）
- 最終的なテキストを一度だけ `validateText` で検証
- この方式で以下を実現：
  - 最大10箇所の編集を1回のリクエストで処理
  - 中間状態の検証は不要（最終結果のみ検証）
  - シンプルで効率的

**既存メソッド**:
- `LspRpcClient.request(method, params)`: 汎用リクエストメソッド
- `LspRpcClient.validateText(relative, newText)`: テキスト検証専用

**結論**: 拡張不要。現在のアプローチで要件を満たす。

---

### R-003: script_search のレスポンス構造とアンカー解決への再利用

**結論**: ✅ script_search は不要（単純な indexOf で十分）

**詳細**:
- **script_search の用途**: 大規模ファイル横断検索
  - glob/regex パターンマッチング
  - ページング対応
  - セマンティックフィルタ（namespace, container, identifier）
  - 3つの出力モード（metadata/snippets/full）

- **軽量スニペット編集のアンカー解決**:
  - 単一ファイル内の正確な文字列一致
  - `text.indexOf(target)` で実現（ScriptEditSnippetToolHandler:171）
  - 一意性チェック: 複数マッチ時はエラー（179-181行目）

**理由**:
- アンカーは正確な文字列一致が必須
- ファイル横断検索は不要
- indexOf で O(n) の高速検索
- script_search はオーバーエンジニアリング

**結論**: 既存実装の indexOf 方式が最適。

---

### R-004: フォーマッタ（dotnet-format等）呼び出しの必要性

**結論**: ✅ フォーマッタ呼び出しは不要

**詳細**:
- **構文診断で十分な理由**:
  - `validateText` は括弧・波括弧の整合性を検出
  - 構文エラー（severity === 1）があれば即座に失敗
  - 軽量編集（1-2行、80文字以内）なのでフォーマット破綻リスクは最小限

- **Unity側での自動フォーマット**:
  - Unity Editor は C# ファイル保存時に自動フォーマット可能
  - IDE（Rider、VS Code）もフォーマット機能あり
  - 開発者が手動でフォーマット可能

- **フォーマッタ不要の根拠**:
  - 小規模編集（最大80文字）
  - 主な用途: ガード削除、条件式変更、ログ挿入
  - これらは既存コードのフォーマットを大きく崩さない

**LSP調査結果**:
- `/unity-mcp-server/mcp-server/src/lsp/` にフォーマット関連コードなし
- Roslyn LSP 側にフォーマット機能があっても、現時点で統合不要

**結論**: 構文診断のみで品質保証は十分。フォーマット機能は将来の拡張として保留。

---

## 総合評価

### ✅ 実装可能性: 高

すべてのリサーチ項目で実装可能な結論を得ました：

1. **構文診断**: `LspRpcClient.validateText` がそのまま利用可能
2. **複数編集**: 既存のテキストレベル処理で十分
3. **アンカー解決**: indexOf による正確な文字列一致で最適
4. **品質保証**: 構文診断のみで十分（フォーマッタ不要）

### 既存実装の発見

**重要**: `ScriptEditSnippetToolHandler.js` はすでに実装済み！

- **実装場所**: `mcp-server/src/handlers/script/ScriptEditSnippetToolHandler.js`
- **実装内容**:
  - ✅ アンカーマッチング（indexOf + 一意性検証）
  - ✅ 80文字制限チェック
  - ✅ 複数編集（最大10箇所）
  - ✅ 構文検証（LspRpcClient.validateText）
  - ✅ プレビューモード
  - ✅ ハッシュ値生成（重複適用防止）
  - ✅ delete/replace/insert 操作
  - ✅ before/after 挿入位置指定

### 次フェーズへの推奨事項

**Phase 1（設計）をスキップ可能**:
- 既存実装がすでに要件を満たしている
- JSONスキーマ、アルゴリズム、エラーハンドリングが実装済み

**次のステップ**:
1. ハンドラ登録確認（src/handlers/index.js）
2. ユニットテスト作成（Phase 3）
3. 統合テスト作成（Phase 3）
4. ドキュメント更新（Phase 4）

---

## 参考実装

- `LspRpcClient`: src/lsp/LspRpcClient.js
- `ScriptEditSnippetToolHandler`: src/handlers/script/ScriptEditSnippetToolHandler.js
- `ScriptSearchToolHandler`: src/handlers/script/ScriptSearchToolHandler.js (比較用)

---

*実施担当: Claude*
*レビュー: 未実施（実装者による自己調査）*
