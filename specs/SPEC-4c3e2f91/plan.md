# 実装計画: Unity接続の安定化（SPEC-4c3e2f91）

## 目的
- 接続先ホストの正規化で誤設定による再接続ループを防止。
- Heartbeat により半死に接続を早期検出して再接続。

## 方針
1. **RED**: Node側 `UnityConnection` のユニットテストで host 正規化・heartbeat 切断を先に失敗させる。  
2. **GREEN**: `config` と `UnityConnection` に最小実装を追加。  
3. **REFACTOR**: ログ/設定キー/テストの重複を整理。

## 変更点（予定）
- `mcp-server/src/core/config.js`  
  - `unity.heartbeatIntervalMs` / `heartbeatTimeoutMs` / `heartbeatMissThreshold` を追加。  
  - `unity.host` など旧キーのフォールバック時に bind-only 値が `mcpHost` へ流入しないよう正規化。
- `mcp-server/src/core/unityConnection.js`  
  - `targetHost` 決定時の正規化処理。  
  - Heartbeat タイマーと `"ping"`/`"pong"` 処理。
- `mcp-server/tests/unit/core/unityConnection.test.js`  
  - host 正規化テスト追加。  
  - heartbeat 失敗→切断/再接続テスト追加。

## リスクと対策
- Heartbeat が Unity ビルド中のメイン処理に影響する可能性  
  - `"ping"` をメインスレッド経由しない経路で送る。  
  - in-flight キューを尊重しアイドル時のみ送信。
