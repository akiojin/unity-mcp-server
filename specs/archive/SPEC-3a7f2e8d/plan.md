# 実装計画: Unity Editor内ターミナル

**機能ID**: `SPEC-3a7f2e8d` | **日付**: 2025-10-29 | **仕様**: [spec.md](./spec.md)
**入力**: `/specs/SPEC-3a7f2e8d/spec.md`の機能仕様

## 実行フロー (/speckit.plan コマンドのスコープ)

```
1. 入力パスから機能仕様を読み込み ✓
2. 技術コンテキストを記入 ← 現在ここ
3. 憲章チェックセクションを評価
4. Phase 0 を実行 → research.md
5. Phase 1 を実行 → contracts, data-model.md, quickstart.md
6. 憲章チェックセクションを再評価
7. Phase 2 を計画 → タスク生成アプローチを記述
8. 停止 - /speckit.tasks コマンドの準備完了
```

## 概要

Unity Editor内でクロスプラットフォーム対応のターミナルウィンドウを実装します。開発者がエディタを離れずにgit、npm、ビルド、テストなどのコマンドライン操作を実行できるようにします。

**主要要件**:

- Workspace Root / Project Root の2種類の起動方法
- Windows (WSL2優先)、macOS、Linux対応
- 複数ターミナル同時起動
- MCP経由でのターミナル制御API
- システム環境変数PATH完全継承

**技術アプローチ**:

- Node側: BaseToolHandler継承で4つのMCPツール実装
- Unity側: EditorWindow + System.Diagnostics.Process管理
- TDD必須: Contract → Integration → Unit の順

## 技術コンテキスト

**言語/バージョン**:

- Node.js: 18-20（既存プロジェクト準拠）
- C#: Unity Editor API（.NET Standard 2.1互換）

**主要依存関係**:

- Node側: @modelcontextprotocol/sdk ^0.6.1, BaseToolHandler（既存）
- Unity側: UnityEditor, System.Diagnostics.Process, System.IO

**ストレージ**: N/A（インメモリセッション管理のみ）

**テスト**:

- Node: Node.js built-in test runner (`node --test`)
- カバレッジ: c8
- Unity: Unity Test Framework (PlayMode/EditMode)

**対象プラットフォーム**:

- Windows 10/11 (WSL2対応)
- macOS 10.15+
- Linux (Ubuntu 20.04+推奨)

**プロジェクトタイプ**: single（既存Unity MCP Serverプロジェクト内に統合）

**パフォーマンス目標**:

- コマンド出力表示: <1秒（通常出力量）
- ターミナル起動: <3秒
- 同時セッション: 5+個対応

**制約**:

- PTY/疑似ターミナル未対応（インタラクティブプログラム制限）
- Unity EditorのメインスレッドUpdateループでI/O処理
- ANSIエスケープコードは基本色のみ対応

**スケール/スコープ**:

- 想定ユーザー: Unity開発者（個人〜チーム）
- 同時ターミナル: 5-10個
- セッション寿命: Unity Editor起動中のみ

## 憲章チェック

*ゲート: Phase 0 research前に合格必須。Phase 1 design後に再チェック。*

**シンプルさ**:

- プロジェクト数: 1（既存Unity MCP Serverプロジェクト内に統合）✓
- フレームワークを直接使用? YES - UnityEditor API、System.Diagnostics.Process直接使用 ✓
- 単一データモデル? YES - TerminalSessionエンティティのみ ✓
- パターン回避? YES - Repository/UoWパターン不使用、シンプルなセッション管理 ✓

**アーキテクチャ**:

- すべての機能をライブラリとして? N/A（Unity Editor拡張のため）
- ライブラリリスト: N/A
- ライブラリごとのCLI: N/A（MCPツール経由のみ）
- ライブラリドキュメント: README.md + CLAUDE.md更新予定 ✓

**テスト (妥協不可)**:

- RED-GREEN-Refactorサイクルを強制? YES - TDD厳守 ✓
- Gitコミットはテストが実装より先に表示? YES - テストコミット → 実装コミット ✓
- 順序: Contract→Integration→E2E→Unitを厳密に遵守? YES ✓
- 実依存関係を使用? YES - 実Unity接続、実プロセス起動 ✓
- Integration testの対象: Unity-Node通信、プロセス起動、パス解決 ✓
- 禁止: テスト前の実装、REDフェーズのスキップ ✓

**可観測性**:

- 構造化ロギング含む? YES - 既存ログシステム活用 ✓
- フロントエンドログ → バックエンド? N/A（Unity Editor拡張）
- エラーコンテキスト十分? YES - セッションID、コマンド、エラー原因を含む ✓

**バージョニング**:

- バージョン番号割り当て済み? 現在2.16.3 → 2.17.0（新機能追加）
- 変更ごとにBUILDインクリメント? YES - npm version使用 ✓
- 破壊的変更を処理? N/A（後方互換性保持）

**憲章チェック結果**: ✅ **合格** - すべての要件を満たしています

## プロジェクト構造

### ドキュメント (この機能)

```
specs/SPEC-3a7f2e8d/
├── spec.md              # 機能仕様書（完成）
├── plan.md              # このファイル (/speckit.plan 出力)
├── research.md          # Phase 0 出力
├── data-model.md        # Phase 1 出力
├── quickstart.md        # Phase 1 出力
├── contracts/           # Phase 1 出力
│   ├── terminal_open.json
│   ├── terminal_execute.json
│   ├── terminal_read.json
│   └── terminal_close.json
└── tasks.md             # Phase 2 出力 (/speckit.tasks)
```

### ソースコード (既存構造に統合)

```
mcp-server/
├── src/
│   └── handlers/
│       └── terminal/              # 新規
│           ├── TerminalOpenToolHandler.js
│           ├── TerminalExecuteToolHandler.js
│           ├── TerminalReadToolHandler.js
│           └── TerminalCloseToolHandler.js
└── tests/
    ├── unit/
    │   └── handlers/
    │       └── terminal/          # 新規
    ├── integration/
    │   └── terminal.test.js       # 新規
    └── e2e/
        └── terminal-workflow.test.js  # 新規

UnityMCPServer/Packages/unity-mcp-server/
├── Editor/
│   ├── Terminal/                  # 新規
│   │   ├── TerminalWindow.cs
│   │   ├── TerminalSession.cs
│   │   ├── TerminalOutputBuffer.cs
│   │   ├── TerminalSessionManager.cs
│   │   ├── ShellDetector.cs
│   │   ├── WSLPathConverter.cs
│   │   └── PathResolver.cs
│   ├── Handlers/
│   │   └── TerminalHandler.cs     # 新規
│   ├── GuidDb/
│   │   ├── GuidDbWindow.cs        # 修正（MenuItem変更）
│   │   └── GuidDbManager.cs       # 修正（MenuItem変更）
│   └── Core/
│       └── UnityMCPServer.cs      # 修正（コマンドルーティング追加）
└── Tests/
    └── Editor/
        └── Terminal/              # 新規
            ├── TerminalSessionTests.cs
            ├── ShellDetectorTests.cs
            ├── WSLPathConverterTests.cs
            └── PathResolverTests.cs
```

**構造決定**: 既存の単一プロジェクト構造に統合（オプション1準拠）

## Phase 0: アウトライン＆リサーチ

### リサーチタスク

1. **WSL2パス変換ベストプラクティス**
   - Windowsパス → WSL2パス (`/mnt/c/...`) 変換ロジック
   - エッジケース: スペース、日本語、特殊文字
   - 参考: WSL公式ドキュメント、wslpath コマンド

2. **C# System.Diagnostics.Process 非同期I/O**
   - OutputDataReceived/ErrorDataReceived イベント処理
   - Unity EditorUpdateループとの統合
   - バッファリング戦略

3. **Unity EditorWindow 複数インスタンス対応**
   - CreateInstance() vs GetWindow() の違い
   - セッション状態管理
   - OnDestroy時のクリーンアップ

4. **クロスプラットフォームシェル検出**
   - Windows: wsl.exe → pwsh.exe → powershell.exe 優先順位
   - macOS: zsh → bash
   - Linux: bash
   - File.Exists() vs Process.Start() でのバリデーション

5. **ANSI エスケープコード処理**
   - 基本8色のパース
   - Unity GUIStyleでの色適用
   - 軽量ライブラリまたは自作パーサ

6. **環境変数継承**
   - ProcessStartInfo.EnvironmentVariables の正しい使用方法
   - PATHを含むすべての環境変数のコピー
   - Unity Editor環境での特殊ケース

**出力**: `research.md` - すべてのリサーチ結果と技術選択を文書化

## Phase 1: 設計＆契約

*前提条件: research.md完了*

### 1. データモデル設計 (`data-model.md`)

**エンティティ: TerminalSession**

```
TerminalSession:
  - sessionId: string (GUID)
  - workingDirectory: string (絶対パス)
  - shellType: enum (wsl/bash/zsh/pwsh/powershell/cmd)
  - shellPath: string (実行ファイルの絶対パス)
  - process: Process (System.Diagnostics.Process)
  - outputBuffer: TerminalOutputBuffer
  - isRunning: boolean
  - createdAt: DateTime
  - environmentVariables: Dictionary<string, string>
```

**エンティティ: TerminalOutputBuffer**

```
TerminalOutputBuffer:
  - lines: List<TerminalLine>
  - maxLines: int (デフォルト1000)
  - Add(text, isError): void
  - GetLines(maxLines): List<TerminalLine>
  - Clear(): void
```

**エンティティ: TerminalLine**

```
TerminalLine:
  - text: string
  - isError: boolean
  - timestamp: DateTime
  - ansiColor: Color (基本8色のみ)
```

### 2. API契約生成 (`contracts/`)

#### `terminal_open.json` (Contract Test)

```json
{
  "tool": "terminal_open",
  "description": "Open terminal window in Unity Editor",
  "inputSchema": {
    "type": "object",
    "properties": {
      "workingDirectory": {
        "type": "string",
        "enum": ["workspace", "project"],
        "description": "Initial directory (workspace root or project root)"
      },
      "shell": {
        "type": "string",
        "enum": ["auto", "wsl", "bash", "zsh", "pwsh", "powershell", "cmd"],
        "description": "Shell type (auto: OS detection)"
      },
      "title": {
        "type": "string",
        "description": "Window title (optional)"
      }
    },
    "required": ["workingDirectory"]
  },
  "responseSchema": {
    "type": "object",
    "properties": {
      "sessionId": {
        "type": "string",
        "description": "Unique session identifier (GUID)"
      },
      "shellType": {
        "type": "string",
        "description": "Detected/selected shell type"
      },
      "shellPath": {
        "type": "string",
        "description": "Absolute path to shell executable"
      },
      "workingDirectory": {
        "type": "string",
        "description": "Resolved absolute working directory path"
      }
    },
    "required": ["sessionId", "shellType", "shellPath", "workingDirectory"]
  }
}
```

#### `terminal_execute.json` (Contract Test)

```json
{
  "tool": "terminal_execute",
  "description": "Execute command in terminal session",
  "inputSchema": {
    "type": "object",
    "properties": {
      "sessionId": {
        "type": "string",
        "description": "Session identifier"
      },
      "command": {
        "type": "string",
        "description": "Command to execute"
      }
    },
    "required": ["sessionId", "command"]
  },
  "responseSchema": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean"
      },
      "message": {
        "type": "string",
        "description": "Status message"
      }
    },
    "required": ["success"]
  }
}
```

#### `terminal_read.json` (Contract Test)

```json
{
  "tool": "terminal_read",
  "description": "Read terminal output",
  "inputSchema": {
    "type": "object",
    "properties": {
      "sessionId": {
        "type": "string"
      },
      "maxLines": {
        "type": "number",
        "description": "Maximum lines to return (default: 100)"
      }
    },
    "required": ["sessionId"]
  },
  "responseSchema": {
    "type": "object",
    "properties": {
      "lines": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "text": {"type": "string"},
            "isError": {"type": "boolean"},
            "timestamp": {"type": "string"}
          }
        }
      },
      "hasMore": {
        "type": "boolean",
        "description": "True if more lines available"
      }
    },
    "required": ["lines", "hasMore"]
  }
}
```

#### `terminal_close.json` (Contract Test)

```json
{
  "tool": "terminal_close",
  "description": "Close terminal session",
  "inputSchema": {
    "type": "object",
    "properties": {
      "sessionId": {
        "type": "string"
      }
    },
    "required": ["sessionId"]
  },
  "responseSchema": {
    "type": "object",
    "properties": {
      "success": {
        "type": "boolean"
      }
    },
    "required": ["success"]
  }
}
```

### 3. 契約テスト生成

**tests/integration/terminal-contract.test.js**:

- `terminal_open` 契約テスト（workspace/project両方）
- `terminal_execute` 契約テスト
- `terminal_read` 契約テスト
- `terminal_close` 契約テスト
- エラーケース（無効なsessionId、存在しないシェル等）

**初期状態**: すべてのテストは失敗（実装前のRED状態）

### 4. Integration Testシナリオ

**ユーザーストーリーからのテストシナリオ**:

1. **Workspace Rootでgit操作**
   - ターミナル開く（workspace） → `git status` 実行 → 出力確認

2. **Project Rootでの作業**
   - ターミナル開く（project） → `pwd` 実行 → パス確認

3. **クロスプラットフォーム対応**
   - OS検出 → 適切なシェル起動 → `echo $SHELL` 確認

4. **複数ターミナル起動**
   - 2つのターミナル開く → 独立したコマンド実行

5. **MCP経由制御**
   - open → execute → read → close フルフロー

### 5. クイックスタート (`quickstart.md`)

ユーザーが5分以内に動作確認できる手順:

```markdown
# クイックスタート

## 前提条件
- Unity Editor 2021.3+
- Node.js 18-20
- git, npm がPATH上に存在

## ステップ1: Unity Editorでメニューから起動
1. Unity Editorで `Window > Unity MCP Server > Terminal (Workspace Root)` を選択
2. ターミナルウィンドウが開くことを確認

## ステップ2: コマンド実行
1. ターミナルに `git status` と入力
2. 現在のgitステータスが表示されることを確認

## ステップ3: MCP経由制御
1. MCPクライアント（Claude Code等）から以下を実行:
   ```javascript
   // terminal_open
   { workingDirectory: "workspace", shell: "auto" }
   ```
2. sessionIdが返却されることを確認
3. `terminal_execute` でコマンド実行
4. `terminal_read` で出力取得

## 期待される結果
- ターミナルが起動し、gitコマンドが実行できる
- システムPATH上のコマンドが利用可能
- MCP経由でもターミナル制御が可能
```

### 6. エージェントファイル更新

CLAUDE.md更新（漸進的・O(1)操作）:

- 「プロジェクト構成」セクションにターミナル機能を追加
- 「開発ガイドライン」にターミナルテスト実行方法を追加
- 最近の変更履歴に本機能を追加
- 150行制限内に収める

**出力**: data-model.md, contracts/*.json, 失敗するcontract tests, quickstart.md, CLAUDE.md更新

## Phase 2: タスク計画アプローチ

*このセクションは/speckit.tasksコマンドが実行することを記述 - /speckit.plan中は実行しない*

**タスク生成戦略**:

1. **契約からタスク生成**:
   - 各contract.json → contract testタスク [P] （並列実行可能）
   - 4つのcontract × 2 (test + 実装) = 8タスク

2. **データモデルからタスク生成**:
   - 各エンティティ → unit testタスク [P]
   - TerminalSession, TerminalOutputBuffer, ShellDetector等
   - 7クラス × 2 (test + 実装) = 14タスク

3. **ユーザーストーリーからタスク生成**:
   - 各ストーリー → integration testタスク
   - 5ストーリー × 2 (test + 実装) = 10タスク

4. **UIタスク**:
   - TerminalWindow実装
   - MenuItem変更（既存ファイル修正）

5. **統合タスク**:
   - ハンドラ登録
   - E2Eテスト

**順序戦略**:

- **Phase 0: Setup** - テスト環境セットアップ、依存関係確認
- **Phase 1: Contract Tests** - 4つのcontract test作成 [P]
- **Phase 2: Core Models** - TerminalSession, Buffer等のunit test+実装 [P]
- **Phase 3: Platform Support** - ShellDetector, WSLPathConverter [P]
- **Phase 4: Unity Integration** - Handler, Window実装
- **Phase 5: MCP Integration** - Node側Handler実装 [P]
- **Phase 6: Integration Tests** - ユーザーストーリー検証
- **Phase 7: E2E Tests** - フルワークフローテスト
- **Phase 8: Polish** - エラーハンドリング、ログ、ドキュメント

**推定出力**: tasks.mdに40-45個の番号付き、順序付きタスク

**TDD順序厳守**:

- 各タスクペア: テストタスク（N） → 実装タスク（N+1）
- テストコミットが実装コミットより先
- RED → GREEN → Refactor サイクル

**重要**: このフェーズは/speckit.tasksコマンドで実行、/speckit.planではない

## Phase 3+: 今後の実装

*これらのフェーズは/planコマンドのスコープ外*

**Phase 3**: タスク実行 (/speckit.tasksコマンドがtasks.mdを作成)
**Phase 4**: 実装 (tasks.mdを実行、TDD厳守)
**Phase 5**: 検証 (テスト実行、quickstart.md実行、クロスプラットフォーム検証)

## 複雑さトラッキング

*憲章チェックに正当化が必要な違反がある場合のみ記入*

該当なし - すべての憲章要件を満たしています。

## 進捗トラッキング

*このチェックリストは実行フロー中に更新される*

**フェーズステータス**:

- [ ] Phase 0: Research完了 (/speckit.plan コマンド)
- [ ] Phase 1: Design完了 (/speckit.plan コマンド)
- [ ] Phase 2: Task planning完了 (/speckit.plan コマンド - アプローチのみ記述)
- [ ] Phase 3: Tasks生成済み (/speckit.tasks コマンド)
- [ ] Phase 4: 実装完了
- [ ] Phase 5: 検証合格

**ゲートステータス**:

- [x] 初期憲章チェック: 合格
- [ ] 設計後憲章チェック: 合格
- [ ] すべての要明確化解決済み
- [x] 複雑さの逸脱を文書化済み（該当なし）

---

*憲章 v1.0.0 に基づく - `/.specify/memory/constitution.md` 参照*
