# 実装計画: ポート競合時の次アクション提示ログ（SPEC-8f4a2d0c）

## 方針
1. **RED**: 候補ポート生成 helper をテストで固定。  
2. **GREEN**: リトライ上限到達時のエラーログに候補と設定パスを追加。  
3. **REFACTOR**: 既存ログと重複しないよう整理。

## 変更点（予定）
- `UnityMCPServer/.../Editor/Core/UnityMCPServer.cs`
  - 選択された config path を保存
  - Suggested ports helper 追加
  - 上限到達時ログを改善
- `UnityMCPServer/.../Tests/Editor/*`
  - Suggested ports helper テスト追加
