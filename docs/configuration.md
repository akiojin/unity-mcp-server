# Configuration

English | [日本語](#日本語)

Configuration is optional; defaults work out of the box.

This project uses:

- **Unity side**: environment variables (Unity process)
- **Node side**: environment variables (Node process)

Note: `.unity/config.json` is not used.

## Unity (Environment Variables)

Set environment variables before launching the Unity Editor.

### Minimal Example

```bash
export UNITY_MCP_UNITY_HOST=localhost
export UNITY_MCP_PORT=6400
```

### Unity Variables

| Env | Default | Notes |
|---|---:|---|
| `UNITY_MCP_UNITY_HOST` | `localhost` | Bind/listen host for the Unity TCP listener |
| `UNITY_MCP_PORT` | `6400` | Unity TCP port (must match Node) |

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

---

## 日本語

設定は任意です（デフォルトで動きます）。

このプロジェクトは次の方式で設定します。

- **Unity側**: 環境変数（Unityプロセス）
- **Node側**: 環境変数（Nodeプロセス）

※ `.unity/config.json` は使用しません。

## Unity（環境変数）

Unity Editor 起動前に環境変数を設定してください。

### 最小例

```bash
export UNITY_MCP_UNITY_HOST=localhost
export UNITY_MCP_PORT=6400
```

### Unity 側の環境変数

| 環境変数 | デフォルト | 補足 |
|---|---:|---|
| `UNITY_MCP_UNITY_HOST` | `localhost` | Unity TCP リスナーの待ち受けホスト |
| `UNITY_MCP_PORT` | `6400` | Unity TCPポート（Nodeと一致） |

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
