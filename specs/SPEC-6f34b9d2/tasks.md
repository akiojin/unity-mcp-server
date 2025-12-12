# タスク: Unity TCP セッション識別（SPEC-6f34b9d2）

## Phase 1: テストファースト (RED)
- [ ] T501 Node: sessionId一致/不一致・fallback無しのユニットテスト追加

## Phase 2: 実装 (GREEN)
- [ ] T502 Node: sessionId生成/送信payload付与/受信検証/フォールバック削除
- [ ] T503 Unity: Command に sessionId追加、レスポンスへ反映

## Phase 3: 仕上げ (REFACTOR)
- [ ] T504 互換性のログ/ドキュメント整理、簡易スモーク
