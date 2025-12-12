# タスク: Unity TCP Listener のポート競合自動リトライ（SPEC-7f0d2aa1）

## Phase 1: テストファースト (RED)
- [ ] T701 retry delay helper の Editor テスト追加

## Phase 2: 実装 (GREEN)
- [ ] T702 AddressAlreadyInUse 時の retry スケジュール追加
- [ ] T703 成功/失敗時のリトライ回数リセット/Status遷移

## Phase 3: 仕上げ (REFACTOR)
- [ ] T704 ログ/ドキュメント整理、手動スモーク
