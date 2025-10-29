# タスク: Unity Editor内ターミナル

**入力**: `/specs/SPEC-3a7f2e8d/`の設計ドキュメント
**前提条件**: plan.md, research.md, data-model.md, contracts/

## 概要

Unity Editor内でクロスプラットフォーム対応のターミナルウィンドウを実装します。

**主要コンポーネント**:
- Node側: 4つのMCPツール (terminal_open, terminal_execute, terminal_read, terminal_close)
- Unity側: TerminalWindow, TerminalSession, 出力バッファ、シェル検出、パス解決

**技術スタック**:
- Node.js: 18-20, @modelcontextprotocol/sdk
- C#: Unity Editor API, System.Diagnostics.Process
- テスト: Node test runner, Unity Test Framework

## フォーマット: `[ID] [P?] 説明`
- **[P]**: 並列実行可能 (異なるファイル、依存関係なし)
- 説明には正確なファイルパスを含める

## Phase 3.1: セットアップ

- [ ] T001 [P] プロジェクト構造を確認 (mcp-server/src/handlers/terminal/, UnityMCPServer/Packages/unity-mcp-server/Editor/Terminal/)
- [ ] T002 [P] Node.js依存関係を確認 (@modelcontextprotocol/sdk ^0.6.1, BaseToolHandler)
- [ ] T003 [P] Unity Test Framework セットアップを確認 (EditMode tests)

## Phase 3.2: Contract Tests (TDD) ⚠️ Phase 3.3の前に完了必須

**重要: これらのテストは記述され、実装前に失敗する必要がある**

- [ ] T004 [P] mcp-server/tests/integration/terminal-contract.test.js に terminal_open の contract test
- [ ] T005 mcp-server/src/handlers/terminal/TerminalOpenToolHandler.js に terminal_open 実装
- [ ] T006 [P] mcp-server/tests/integration/terminal-contract.test.js に terminal_execute の contract test
- [ ] T007 mcp-server/src/handlers/terminal/TerminalExecuteToolHandler.js に terminal_execute 実装
- [ ] T008 [P] mcp-server/tests/integration/terminal-contract.test.js に terminal_read の contract test
- [ ] T009 mcp-server/src/handlers/terminal/TerminalReadToolHandler.js に terminal_read 実装
- [ ] T010 [P] mcp-server/tests/integration/terminal-contract.test.js に terminal_close の contract test
- [ ] T011 mcp-server/src/handlers/terminal/TerminalCloseToolHandler.js に terminal_close 実装

## Phase 3.3: Core Models - Unity側 (TDD)

**TerminalLine**
- [ ] T012 [P] UnityMCPServer/Packages/unity-mcp-server/Tests/Editor/Terminal/TerminalLineTests.cs にテスト
- [ ] T013 UnityMCPServer/Packages/unity-mcp-server/Editor/Terminal/TerminalLine.cs に実装

**TerminalOutputBuffer**
- [ ] T014 [P] UnityMCPServer/Packages/unity-mcp-server/Tests/Editor/Terminal/TerminalOutputBufferTests.cs にテスト
- [ ] T015 UnityMCPServer/Packages/unity-mcp-server/Editor/Terminal/TerminalOutputBuffer.cs に実装 (Add, GetLines, Clear, FIFO)

**ShellDetector**
- [ ] T016 [P] UnityMCPServer/Packages/unity-mcp-server/Tests/Editor/Terminal/ShellDetectorTests.cs にテスト
- [ ] T017 UnityMCPServer/Packages/unity-mcp-server/Editor/Terminal/ShellDetector.cs に実装 (OS判定, File.Exists()チェーン)

**WSLPathConverter**
- [ ] T018 [P] UnityMCPServer/Packages/unity-mcp-server/Tests/Editor/Terminal/WSLPathConverterTests.cs にテスト (スペース, 日本語, 特殊文字)
- [ ] T019 UnityMCPServer/Packages/unity-mcp-server/Editor/Terminal/WSLPathConverter.cs に実装 (C:\... → /mnt/c/...)

**PathResolver**
- [ ] T020 [P] UnityMCPServer/Packages/unity-mcp-server/Tests/Editor/Terminal/PathResolverTests.cs にテスト
- [ ] T021 UnityMCPServer/Packages/unity-mcp-server/Editor/Terminal/PathResolver.cs に実装 (workspace root, project root解決)

**ANSIParser**
- [ ] T022 [P] UnityMCPServer/Packages/unity-mcp-server/Tests/Editor/Terminal/ANSIParserTests.cs にテスト (基本8色のみ)
- [ ] T023 UnityMCPServer/Packages/unity-mcp-server/Editor/Terminal/ANSIParser.cs に実装 (正規表現パース)

**TerminalSession**
- [ ] T024 [P] UnityMCPServer/Packages/unity-mcp-server/Tests/Editor/Terminal/TerminalSessionTests.cs にテスト (Process起動, 環境変数継承)
- [ ] T025 UnityMCPServer/Packages/unity-mcp-server/Editor/Terminal/TerminalSession.cs に実装 (BeginOutputReadLine, BeginErrorReadLine)

**TerminalSessionManager**
- [ ] T026 [P] UnityMCPServer/Packages/unity-mcp-server/Tests/Editor/Terminal/TerminalSessionManagerTests.cs にテスト
- [ ] T027 UnityMCPServer/Packages/unity-mcp-server/Editor/Terminal/TerminalSessionManager.cs に実装 (CreateSession, GetSession, CloseSession)

## Phase 3.4: Unity Integration

**TerminalHandler**
- [ ] T028 [P] UnityMCPServer/Packages/unity-mcp-server/Tests/Editor/Handlers/TerminalHandlerTests.cs にテスト
- [ ] T029 UnityMCPServer/Packages/unity-mcp-server/Editor/Handlers/TerminalHandler.cs に実装 (terminal_open, terminal_execute, terminal_read, terminal_close コマンドルーティング)

**TerminalWindow**
- [ ] T030 UnityMCPServer/Packages/unity-mcp-server/Editor/Terminal/TerminalWindow.cs に実装 (CreateInstance, OnEnable, OnGUI, OnDestroy)
- [ ] T031 UnityMCPServer/Packages/unity-mcp-server/Editor/Handlers/TerminalHandler.cs に MenuItem追加 (Window/Unity MCP Server/Terminal (Workspace Root), Terminal (Project Root))

**コマンドルーティング**
- [ ] T032 UnityMCPServer/Packages/unity-mcp-server/Editor/Core/UnityMCPServer.cs に terminal_* コマンドルーティング追加

## Phase 3.5: MCP Integration - Node側

**ハンドラ登録**
- [ ] T033 mcp-server/src/handlers/index.js に 4つのハンドラ登録

**TerminalOpenToolHandler**
- [ ] T034 [P] mcp-server/tests/unit/handlers/terminal/TerminalOpenToolHandler.test.js にテスト
- [ ] T035 mcp-server/src/handlers/terminal/TerminalOpenToolHandler.js に実装 (workingDirectory解決, Unity通信)

**TerminalExecuteToolHandler**
- [ ] T036 [P] mcp-server/tests/unit/handlers/terminal/TerminalExecuteToolHandler.test.js にテスト
- [ ] T037 mcp-server/src/handlers/terminal/TerminalExecuteToolHandler.js に実装

**TerminalReadToolHandler**
- [ ] T038 [P] mcp-server/tests/unit/handlers/terminal/TerminalReadToolHandler.test.js にテスト
- [ ] T039 mcp-server/src/handlers/terminal/TerminalReadToolHandler.js に実装

**TerminalCloseToolHandler**
- [ ] T040 [P] mcp-server/tests/unit/handlers/terminal/TerminalCloseToolHandler.test.js にテスト
- [ ] T041 mcp-server/src/handlers/terminal/TerminalCloseToolHandler.js に実装

## Phase 3.6: Integration Tests (TDD)

**Workspace Root git操作**
- [ ] T042 [P] mcp-server/tests/integration/terminal-workflow.test.js にテスト (open workspace → git status → read)
- [ ] T043 エラー修正・リファクタリング (T042のテストが合格するまで)

**Project Root作業**
- [ ] T044 [P] mcp-server/tests/integration/terminal-workflow.test.js にテスト (open project → pwd → パス確認)
- [ ] T045 エラー修正・リファクタリング (T044のテストが合格するまで)

**クロスプラットフォーム対応**
- [ ] T046 [P] mcp-server/tests/integration/terminal-workflow.test.js にテスト (auto shell detection)
- [ ] T047 エラー修正・リファクタリング (T046のテストが合格するまで)

**複数ターミナル起動**
- [ ] T048 [P] mcp-server/tests/integration/terminal-workflow.test.js にテスト (2つのセッション同時起動)
- [ ] T049 エラー修正・リファクタリング (T048のテストが合格するまで)

**MCP経由制御**
- [ ] T050 [P] mcp-server/tests/integration/terminal-workflow.test.js にテスト (open → execute → read → close フルフロー)
- [ ] T051 エラー修正・リファクタリング (T050のテストが合格するまで)

## Phase 3.7: E2E Tests

- [ ] T052 [P] mcp-server/tests/e2e/terminal-e2e.test.js に E2Eテスト (実Unity接続, 実コマンド実行)
- [ ] T053 E2Eテストを実行して全体動作を検証

## Phase 3.8: Polish

**エラーハンドリング**
- [ ] T054 [P] すべてのハンドラにエラーケースを実装 (SESSION_NOT_FOUND, SHELL_NOT_FOUND等)

**ログ改善**
- [ ] T055 [P] 構造化ログを追加 (sessionId, command, error context含む)

**ドキュメント更新**
- [ ] T056 [P] README.md にターミナル機能の説明を追加
- [ ] T057 [P] CLAUDE.md にターミナルセクションを追加
- [ ] T058 specs/SPEC-3a7f2e8d/quickstart.md を作成 (5分で動作確認できる手順)

## 依存関係

**Phase順序**:
- Phase 3.1 (Setup) → Phase 3.2 (Contract Tests) → Phase 3.3-3.8

**Phase内依存関係**:
- Phase 3.2: T004→T005, T006→T007, T008→T009, T010→T011
- Phase 3.3: T012→T013, T014→T015, T016→T017, T018→T019, T020→T021, T022→T023, T024→T025, T026→T027
- Phase 3.4: T028→T029→T030→T031→T032
- Phase 3.5: T033→T034-T041, T034→T035, T036→T037, T038→T039, T040→T041
- Phase 3.6: T042→T043, T044→T045, T046→T047, T048→T049, T050→T051
- Phase 3.7: Phase 3.6完了 → T052→T053

**ブロック関係**:
- TerminalSession (T025) が TerminalSessionManager (T027) をブロック
- TerminalSessionManager (T027) が TerminalHandler (T029), TerminalWindow (T030) をブロック
- TerminalHandler (T029) が Node側ハンドラ (T035, T037, T039, T041) をブロック

## 並列実行例

```bash
# Phase 3.1: すべて並列実行可能
Task: T001, T002, T003

# Phase 3.2: Contract Tests (テストのみ並列)
Task: T004, T006, T008, T010

# Phase 3.3: Core Models (テストのみ並列)
Task: T012, T014, T016, T018, T020, T022, T024, T026

# Phase 3.5: Node側ハンドラ (テストのみ並列)
Task: T034, T036, T038, T040

# Phase 3.6: Integration Tests (テストのみ並列)
Task: T042, T044, T046, T048, T050

# Phase 3.8: Polish (すべて並列)
Task: T054, T055, T056, T057, T058
```

## 注意事項

- **TDD厳守**: すべてのテストが実装より先、RED→GREEN→Refactorサイクル必須
- **Git commit順序**: テストコミットが実装コミットより先に記録される
- **並列実行**: [P]タスクは異なるファイルを変更、依存関係なし
- **コミット**: 各タスク完了後に必ずコミット
- **エラー**: エラーが発生している状態で完了としない

## 検証チェックリスト

- [x] すべてのcontractsに対応するテストがある (T004-T011)
- [x] すべてのentitiesにmodelタスクがある (T012-T027)
- [x] すべてのテストが実装より先にある (TDD順序)
- [x] 並列タスクは本当に独立している ([P]マーク)
- [x] 各タスクは正確なファイルパスを指定
- [x] 同じファイルを変更する[P]タスクがない

## 推定工数

- **総タスク数**: 58タスク
- **推定時間**: 8-12時間 (TDD厳守、並列実行活用)
- **クリティカルパス**: Setup → Contract Tests → Core Models → Integration → E2E (最小6時間)

---

**実装準備完了** - `/speckit.implement` コマンドで実装を開始できます
