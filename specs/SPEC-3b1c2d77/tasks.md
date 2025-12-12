# タスク: Unity TCP Listener のリロード耐性強化（SPEC-3b1c2d77）

## Phase 1: テストファースト (RED)
- [ ] T601 reloadPending フラグ設定/消費の Editor テスト追加

## Phase 2: 実装 (GREEN)
- [ ] T602 beforeAssemblyReload フック＋停止処理追加
- [ ] T603 ドメイン初期化時の遅延起動追加
- [ ] T604 StopTcpListener の wait オプション化

## Phase 3: 仕上げ (REFACTOR)
- [ ] T605 ログ/ドキュメント整理、手動スモーク
