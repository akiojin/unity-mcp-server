# 実装計画: Unity TCP セッション識別（SPEC-6f34b9d2）

## 方針
1. **RED**: UnityConnection の「sessionId一致時のみ解決」「不一致時は無視」「fallback解決無し」をテストで固定。  
2. **GREEN**: Node 側で sessionId 生成・付与・検証を実装。Unity 側で Command.SessionId を追加し、応答に反映。  
3. **REFACTOR**: ログ/互換性/エッジケースを整理。

## 変更点（予定）
- Node:
  - `mcp-server/src/core/unityConnection.js`: sessionId管理、送信payloadへ付与、受信検証、fallback解決削除。
  - `mcp-server/tests/unit/core/unityConnection.test.js`: sessionId安全化テスト追加。
- Unity:
  - `UnityMCPServer/.../Models/Command.cs`: `sessionId` フィールド追加（optional）。
  - `UnityMCPServer/.../Editor/Core/UnityMCPServer.cs`: 応答 JSON へ sessionId 付与（中心部で一括付与）。
