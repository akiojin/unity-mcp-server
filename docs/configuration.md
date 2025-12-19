# Configuration

English | [日本語](#日本語)

Configuration is optional; defaults work out of the box.

This project uses:

- **Node side**: environment variables
- **Unity side**: Project Settings (host/port)

## Node (Environment Variables)

Set environment variables when launching the Node MCP server process.

### Minimal Example

```bash
export UNITY_MCP_MCP_HOST=localhost
export UNITY_MCP_PORT=6400
export UNITY_PROJECT_ROOT=.
```

### Common Variables

| Env | Default | Notes |
|---|---:|---|
| `UNITY_PROJECT_ROOT` | auto-detect | Unity project root (directory containing `Assets/` and `Packages/`) |
| `UNITY_MCP_MCP_HOST` | `localhost` | Host where the Node server connects to Unity |
| `UNITY_MCP_PORT` | `6400` | Unity Editor TCP port |
| `UNITY_MCP_LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `UNITY_MCP_VERSION_MISMATCH` | `warn` | `warn` (default), `error`, `off` |
| `UNITY_MCP_HTTP_ENABLED` | `false` | Enable HTTP transport (`/healthz` exposed) |
| `UNITY_MCP_HTTP_PORT` | `6401` | HTTP port (when enabled) |
| `UNITY_MCP_TELEMETRY_ENABLED` | `false` | Can also be controlled by command flags |
| `UNITY_MCP_LSP_REQUEST_TIMEOUT_MS` | `60000` | LSP request timeout (ms) |

## Unity (Project Settings)

Unity: **Edit → Project Settings → Unity MCP Server**

- `Host`: bind/listen host for the Unity-side TCP listener (`localhost`, `0.0.0.0`, etc.)
- `Port`: TCP port (must match `UNITY_MCP_PORT`)

Click **Apply & Restart** to restart the Unity listener (and trigger a reimport).

---

## 日本語

設定は任意です（デフォルトで動きます）。

このプロジェクトは次の方式で設定します。

- **Node側**: 環境変数
- **Unity側**: Project Settings（host/port）

## Node（環境変数）

Node MCP サーバープロセス起動時に環境変数を設定してください。

### 最小例

```bash
export UNITY_MCP_MCP_HOST=localhost
export UNITY_MCP_PORT=6400
export UNITY_PROJECT_ROOT=.
```

### よく使う環境変数

| 環境変数 | デフォルト | 補足 |
|---|---:|---|
| `UNITY_PROJECT_ROOT` | 自動検出 | Unityプロジェクトルート（`Assets/` と `Packages/` を含む） |
| `UNITY_MCP_MCP_HOST` | `localhost` | Node が Unity に接続するホスト |
| `UNITY_MCP_PORT` | `6400` | Unity Editor TCPポート |
| `UNITY_MCP_LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `UNITY_MCP_VERSION_MISMATCH` | `warn` | `warn`（デフォルト）, `error`, `off` |
| `UNITY_MCP_HTTP_ENABLED` | `false` | HTTPトランスポート有効化（`/healthz`） |
| `UNITY_MCP_HTTP_PORT` | `6401` | HTTPポート |
| `UNITY_MCP_TELEMETRY_ENABLED` | `false` | コマンドフラグでも切替可能 |
| `UNITY_MCP_LSP_REQUEST_TIMEOUT_MS` | `60000` | LSP リクエストタイムアウト（ms） |

## Unity（Project Settings）

Unity: **Edit → Project Settings → Unity MCP Server**

- `Host`: Unity 側 TCP リスナーの待ち受けホスト（`localhost`, `0.0.0.0` など）
- `Port`: TCP ポート（`UNITY_MCP_PORT` と一致させる）

**Apply & Restart** を押すと Unity 側のリスナーを再起動します（Reimport も実行）。
