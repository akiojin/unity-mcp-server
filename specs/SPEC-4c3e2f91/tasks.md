# タスク: Unity接続の安定化（SPEC-4c3e2f91）

**入力**: spec.md, plan.md, 既存 transport 実装

## Phase 1: テストファースト (RED)
- [ ] T401 `UnityConnection.connect()` の host 正規化ユニットテスト追加
- [ ] T402 Heartbeat 連続失敗で `disconnected` → `scheduleReconnect()` が走るテスト追加

## Phase 2: 実装 (GREEN)
- [ ] T403 `config.unity` に heartbeat 設定キー追加
- [ ] T404 `UnityConnection` に host 正規化を実装
- [ ] T405 `UnityConnection` に Heartbeat 送受信/失敗カウントを実装

## Phase 3: 仕上げ (REFACTOR)
- [ ] T406 ログメッセージ・READMEの関連項目を整理
- [ ] T407 手動スモーク: `0.0.0.0` 設定での接続確認、アイドル切断復旧確認

## 依存関係
- T401,T402 → T404,T405
- T403 → T405
