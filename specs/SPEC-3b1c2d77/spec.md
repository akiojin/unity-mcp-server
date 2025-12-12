# 機能仕様書: Unity TCP Listener のリロード耐性強化

**機能ID**: `SPEC-3b1c2d77`  
**作成日**: 2025-12-12  
**ステータス**: 下書き  
**入力**: issue #222（Unity側TCP listenerが再起動/リロードで不安定）

## 背景

Unity Editor はスクリプト再コンパイルやドメインリロードのたびに静的状態が破棄される。現行 UnityMCPServer は静的コンストラクタで TCP listener を即時起動するだけで、**リロード直前のソケット解放が保証されていない**。その結果、再ロード後の起動タイミングでポートが残り `AddressAlreadyInUse` となり listener が立たないことがある。

## 目的

- ドメインリロード境界で TCP listener を確実に停止/再起動し、ポート競合による起動失敗を防ぐ。

## ユーザーシナリオ＆テスト *(必須)*

### ユーザーストーリー1 - リロード後も listener が確実に復帰してほしい (優先度: P1)
Unity がスクリプト再コンパイル/ドメインリロードしても、MCP の TCP listener が確実に復帰し、Node 側が再接続できる状態を維持してほしい。

**独立テスト**: `beforeAssemblyReload` で停止フラグが立ち、次ドメイン初期化時に遅延起動がスケジュールされれば価値成立。

**受け入れシナリオ**:
1. **前提** listener 起動中、**実行** `beforeAssemblyReload` 発火、**結果** listener を停止し「再起動待ち」フラグを永続化する。
2. **前提** 直前のフラグが存在する状態でドメイン初期化、**実行** 初期化処理、**結果** listener 起動を短時間遅延して実行し、フラグをクリアする。

## 要件 *(必須)*

### 機能要件
- **FR-001**: `AssemblyReloadEvents.beforeAssemblyReload` で TCP listener を停止し、`EditorPrefs` に `reloadPending` を永続化する。
- **FR-002**: ドメイン初期化時に `reloadPending` が立っていた場合、listener 起動を `EditorApplication.delayCall` で遅延スケジュールし、その後フラグをクリアする。
- **FR-003**: 通常の起動（初回ロード）では遅延せず従来通り即時起動する。

### 非機能要件
- **NFR-001**: `beforeAssemblyReload` 内でメインスレッドを長時間ブロックしない（listener停止は軽量/非待機）。
- **NFR-002**: フラグはドメインを跨いで確実に伝播する（EditorPrefs 使用）。

### 設定
- 遅延時間は内部定数（暫定 0.5s）。将来必要なら設定化する。

## スコープ外
- PlayMode/コンパイル中のコマンド軽量拒否、複数クライアント制御などの更なる transport 改善は別SPEC。
