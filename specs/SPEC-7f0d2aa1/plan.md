# 実装計画: Unity TCP Listener のポート競合自動リトライ（SPEC-7f0d2aa1）

## 方針
1. **RED**: リトライ遅延計算/上限を internal helper でテスト固定。  
2. **GREEN**: AddressAlreadyInUse 時に retry をスケジュール。  
3. **REFACTOR**: ログ/ステータス遷移を整理。

## 変更点（予定）
- `UnityMCPServer/.../Editor/Core/UnityMCPServer.cs`
  - リトライ用 static state と delay helper
  - StartTcpListener の AddressAlreadyInUse 分岐に retry を追加
- `UnityMCPServer/.../Tests/Editor/*`
  - retry delay helper のテスト追加
