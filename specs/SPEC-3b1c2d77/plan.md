# 実装計画: Unity TCP Listener のリロード耐性強化（SPEC-3b1c2d77）

## 方針
1. **RED**: Editor テストで reloadPending フラグの設定/消費を固定する。  
2. **GREEN**: UnityMCPServer の静的初期化に beforeAssemblyReload フックと遅延起動を追加。  
3. **REFACTOR**: 既存 Stop/Start の待機挙動を整理し、ログを調整。

## 変更点（予定）
- `UnityMCPServer/.../Editor/Core/UnityMCPServer.cs`
  - `beforeAssemblyReload` フック追加
  - `reloadPending` の consume と delayCall 起動
  - StopTcpListener の wait オプション化
- `UnityMCPServer/.../Tests/Editor/*`
  - reloadPending のユニットテスト追加
