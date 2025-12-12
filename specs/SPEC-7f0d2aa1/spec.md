# 機能仕様書: Unity TCP Listener のポート競合自動リトライ

**機能ID**: `SPEC-7f0d2aa1`  
**作成日**: 2025-12-12  
**ステータス**: 下書き  
**入力**: issue #222 / SPEC-3b1c2d77 の補完（AddressAlreadyInUseでlistenerが立たない）

## 背景

ドメインリロード直後や OS のソケット解放遅延により、`StartTcpListener()` が `SocketError.AddressAlreadyInUse` で失敗することがある。現行はログを出すのみで復旧しないため、ユーザーが Unity メニューから Restart するまで Node 側が再接続できず不安定になる。

## 目的

- ポート競合が一時的な場合に **自動で短時間リトライして復旧**させる。

## ユーザーシナリオ＆テスト *(必須)*

### ユーザーストーリー1 - 一時的なポート競合なら自動で復旧してほしい (優先度: P2)
リロード直後にポートが一時的に占有されていても、数回のリトライで listener が立て直されれば手動介入は不要になる。

**独立テスト**: リトライ遅延計算が期待通り（増加・上限）なら価値成立。

**受け入れシナリオ**:
1. **前提** Start が AddressAlreadyInUse で失敗、**実行** 自動リトライ待機、**結果** 規定回数以内に Start が成功し Status が Disconnected/Connected に復帰する。
2. **前提** Start が連続で失敗、**実行** 最大回数までリトライ、**結果** Status が Error になり「手動でポート変更/再起動して下さい」のガイドログが出る。

## 要件 *(必須)*

### 機能要件
- **FR-001**: `SocketError.AddressAlreadyInUse` の場合、`maxStartRetries` 回まで `StartTcpListener()` を自動リトライする。
- **FR-002**: リトライはメインスレッドをブロックしない形で、`EditorApplication.delayCall` + 非同期遅延で実行する。
- **FR-003**: リトライ間隔は `baseRetryDelayMs * attempt`（もしくは指数バックオフ）で増加し、`maxRetryDelayMs` を上限とする。
- **FR-004**: Start 成功時にリトライ回数をリセットする。
- **FR-005**: 最大回数超過時は Status を Error にし、手動対応のガイドをログに残す。

### 非機能要件
- **NFR-001**: リトライ処理によりドメインリロードやエディタUIをブロックしない。

### 設定
- 遅延/回数は内部定数（暫定: `base=500ms`, `max=2000ms`, `maxRetries=3`）。必要なら将来設定化する。

## スコープ外

- ポート自動切替や別ポート検出（マルチインスタンス）は別SPEC。
