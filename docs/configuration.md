# Configuration

English | [日本語](#日本語)

Configuration is optional; defaults work out of the box. Use it when you need to:

- Point the server at a specific Unity project root
- Change Unity connection host/port (WSL2/Docker, remote Unity, multiple instances)
- Adjust logging or HTTP transport

## Config File Resolution

The only supported config file is:

- `.unity/config.json` (workspace-local)

The server discovers it by walking up from the current working directory until it finds `.unity/config.json`.

## Notes

- Keep all configuration in `.unity/config.json` (workspace-local).
- Ensure the server process runs inside the workspace that contains `.unity/config.json` (working directory matters).
- This project intentionally avoids environment-variable overrides for config keys to prevent configuration drift.
- If you see `UNITY_MCP_PORT` in older snippets, it is **not supported**. Use `unity.port` in the config file instead.

## Minimal Example

```json
{
  "project": { "root": "." },
  "unity": { "mcpHost": "localhost", "port": 6400 },
  "logging": { "level": "info" }
}
```

## Common Keys

| Key | Default | Notes |
|---|---:|---|
| `project.root` | auto-detect | Unity project root (directory containing `Assets/`) |
| `project.codeIndexRoot` | `<workspace>/.unity/cache/code-index` | Where `code-index.db` lives |
| `unity.mcpHost` | `localhost` | Host where the Node server connects to Unity |
| `unity.unityHost` | `localhost` | Bind/target host for Unity-side listener (legacy/compat) |
| `unity.port` | `6400` | Unity Editor TCP port |
| `logging.level` | `info` | `debug`, `info`, `warn`, `error` |
| `http.enabled` | `false` | Enable HTTP transport (`/healthz` exposed) |
| `http.port` | `6401` | HTTP port (when enabled) |
| `telemetry.enabled` | `false` | Can also be controlled by CLI flags |

## Environment Variables

None (configuration lives in `.unity/config.json`).

---

## 日本語

設定は任意です（デフォルトで動きます）。以下が必要なときだけ設定してください。

- Unityプロジェクトのルートを明示したい
- Unity接続先のホスト/ポートを変えたい（WSL2/Docker/リモートUnity/複数起動）
- ログやHTTPモードを調整したい

## 設定ファイルの探索順

設定ファイルは **`.unity/config.json` のみ** です（ワークスペースローカル）。

サーバーはカレントディレクトリから上位へ探索して `.unity/config.json` を見つけます。

## メモ

- 設定は `.unity/config.json`（ワークスペース）に集約してください。
- サーバープロセスは `.unity/config.json` を含むワークスペース内で起動してください（CWDが重要）。
- 設定のズレを防ぐため、このプロジェクトは設定キーの環境変数オーバーライドを避けています。
- 古いスニペットに `UNITY_MCP_PORT` が出てくることがありますが、**非対応**です。設定ファイルの `unity.port` を使ってください。

## 最小設定例

```json
{
  "project": { "root": "." },
  "unity": { "mcpHost": "localhost", "port": 6400 },
  "logging": { "level": "info" }
}
```

## よく使うキー

| キー | デフォルト | 補足 |
|---|---:|---|
| `project.root` | 自動検出 | `Assets/` を含むディレクトリ |
| `project.codeIndexRoot` | `<workspace>/.unity/cache/code-index` | `code-index.db` の場所 |
| `unity.mcpHost` | `localhost` | NodeがUnityに接続するホスト |
| `unity.unityHost` | `localhost` | 互換用（通常は触らない） |
| `unity.port` | `6400` | Unity Editor TCPポート |
| `logging.level` | `info` | `debug`, `info`, `warn`, `error` |
| `http.enabled` | `false` | HTTPトランスポート有効化 |
| `http.port` | `6401` | HTTPポート |
| `telemetry.enabled` | `false` | CLIでも切替可能 |

## 環境変数

なし（設定は `.unity/config.json` に集約）。
