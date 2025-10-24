# タスク: C# LSP統合機能

**機能ID**: `SPEC-e757a01f` | **ステータス**: 部分完了（軽量スニペット編集は未着手）

## 実装状況

### 完了済み機能

- [x] US-1: シンボル検索
- [x] US-2: 参照検索
- [x] US-3: 構造化編集
- [x] US-4: リネーム
- [x] US-5: シンボル定義取得
- [x] US-6: コードインデックス管理

### 新規機能（US-7: 軽量スニペット編集）

#### Phase 0: リサーチ ✅

- [x] R-001: Roslyn LSP側で任意テキスト編集後に即時構文診断を得る最適なリクエストを特定
  - 結果: `LspRpcClient.validateText()` (mcp/validateTextEdits) が利用可能
- [x] R-002: LspRpcClientに複数テキストEditを適用するAPIの存在確認と拡張方法検討
  - 結果: 専用API不要、テキストレベルの順次適用で十分
- [x] R-003: 既存 script_search のレスポンス構造確認、アンカー解像度への再利用可能性検証
  - 結果: script_search 不要、indexOf で十分
- [x] R-004: フォーマッタ（dotnet-format等）呼び出しの必要性評価
  - 結果: 構文診断のみで十分、フォーマッタ不要

#### Phase 1: 設計 ✅ スキップ（実装済み）

Phase 0 リサーチにて ScriptEditSnippetToolHandler.js が既に実装済みと判明。
設計フェーズは完了済みとみなしスキップ。

#### Phase 2: 実装 ✅ スキップ（実装済み）

Phase 0 リサーチにて以下が確認済み：
- [x] ScriptEditSnippetToolHandler.js が実装済み（src/handlers/script/）
- [x] ハンドラ登録済み（src/handlers/index.js:130,227,333）
- [x] 全機能実装済み：
  - アンカーマッチング（indexOf + 一意性検証）
  - 3種類の操作（delete/replace/insert）
  - before/after 位置指定
  - バッチ編集（最大10件）
  - 80文字制限
  - LSP構文検証（validateText）
  - Preview/Applyモード
  - ロールバック機構
  - ハッシュ値生成

#### Phase 3: テスト ✅

**Unit Tests** (2025-10-24 完了)
- [x] T-001: 複数ガード削除のプレビュー生成
- [x] T-002: 80文字制限の拒否
- [x] T-003: 括弧不整合時のロールバック
- [x] T-004: アンカー一意性検証（複数マッチ時エラー）
- [x] T-005: replace操作
- [x] T-006: insert操作（position=after/before）
- [x] T-007: バッチ編集（3件の順次適用）
- [x] T-008: Applyモード（ファイル書き込み）

**テストファイル**: `/unity-mcp-server/mcp-server/tests/unit/handlers/script/ScriptEditSnippetToolHandler.test.js`
**テスト結果**: 9/9 成功

**Integration Tests** (スキップ)
既存ユニットテストでカバー済み：
- ガード削除: T-001, T-003
- 条件式置換: T-005
- ログ挿入: T-006
- バッチ編集: T-007
- プレビューモード: T-001～T-007
- ロールバック: T-003

**E2E Tests** (後回し)
実プロジェクトでの手動検証は Phase 4 完了後に実施予定

#### Phase 4: ドキュメント ✅

- [x] DOC-001: CLAUDE.md更新（script_edit_snippet使用ガイドライン）
  - 用途と必須条件の明記
  - script_edit_structured との使い分け
- [x] DOC-002: 使用例追加
  - delete/replace/insert 操作の具体例
  - before/after 位置指定の例
- [x] DOC-003: トラブルシューティング追加
  - よくあるエラー4種（anchor_not_unique, anchor_not_found, 80文字超, 構文エラー）
  - Q&A形式のトラブルシューティング
  - ベストプラクティス（アンカー指定、バッチ編集、検証）

**更新箇所**: `CLAUDE.md` 137-308行目（新規セクション「C#スクリプト編集ツールの使い分け」）

## 参考

実装詳細については `spec.md` および `plan.md` を参照してください。

---
*本ドキュメントは実装完了後に作成され、軽量スニペット編集タスクの追加に伴い更新されました（2025-10-24）*
