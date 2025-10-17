# タスク分解: Unity接続設定の分離

**機能ID**: `SPEC-er035v7o`
**作成日**: 2025-10-17

## Setup
- [ ] `.unity/config.json` の現状を確認し、更新方針を明確化

## Test
- [ ] `mcpHost` / `unityHost` の読み込みと旧キーからのフォールバック挙動を検証するユニットテストを追加 (RED)

## Core
- [ ] 設定モジュールを `unity.mcpHost` / `unity.unityHost` ベースに更新 (GREEN)
- [ ] Unity 接続処理で新プロパティを使用するよう更新 (GREEN)

## Integration
- [ ] README（英/日）を更新し設定の分離と移行例を反映 (REFACTOR)

## Polish
- [ ] `.unity/config.json` サンプル値とコードコメントの整合性を確認
