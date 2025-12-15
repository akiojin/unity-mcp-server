# Troubleshooting

English | [日本語](#日本語)

## Quick Checks

1. Unity Editor is running and the Unity package is installed
2. The Unity package started the TCP listener (default: port `6400`)
3. The MCP client is launching the server correctly (usually via `npx`)
4. If needed, set `UNITY_MCP_LOG_LEVEL=debug` and retry

## Connection Issues

| Symptom | Cause | Fix |
|---|---|---|
| `Connection timeout` | Unity not running | Start Unity Editor |
| `ECONNREFUSED` | Unity not listening (or port blocked) | Start Unity Editor, verify the Unity TCP listener/port, check firewall |
| `Unity TCP disconnected` | Protocol mismatch | Check Unity Console for errors |

## npx Issues

**ENOTEMPTY error**:

```bash
rm -rf ~/.npm/_npx
```

**First-run delay**: pre-cache the package:

```bash
npx @akiojin/unity-mcp-server@latest --version
```

## Debug Logging

Set `UNITY_MCP_LOG_LEVEL=debug` and retry.

## WSL2/Docker → Windows Unity

Set `UNITY_MCP_MCP_HOST=host.docker.internal` (Node → Unity connection host).

If your MCP client launches the server with a working directory outside your workspace, set `UNITY_PROJECT_ROOT` to an absolute path (or ensure the process runs inside your workspace).

## Known Issues

- **MCP client shows “Capabilities: none”**: see `docs/troubleshooting/capabilities-none.md`

---

## 日本語

## まず確認すること

1. Unity Editor が起動していて、Unityパッケージが導入済み
2. UnityパッケージがTCPリスナーを起動している（デフォルト: `6400`）
3. MCPクライアントがサーバーを正しく起動している（通常は `npx`）
4. 必要なら `UNITY_MCP_LOG_LEVEL=debug` にして再試行

## 接続の問題

| 症状 | 原因 | 対処 |
|---|---|---|
| `Connection timeout` | Unity未起動 | Unity Editorを起動 |
| `ECONNREFUSED` | Unity側がlistenしていない（またはポートブロック） | Unity Editor起動、TCPリスナー/ポート確認、ファイアウォール確認 |
| `Unity TCP disconnected` | プロトコル不一致 | Unity Consoleでエラー確認 |

## npxの問題

**ENOTEMPTYエラー**:

```bash
rm -rf ~/.npm/_npx
```

**初回実行の遅延**: 事前キャッシュ:

```bash
npx @akiojin/unity-mcp-server@latest --version
```

## デバッグログ

`UNITY_MCP_LOG_LEVEL=debug` にして再試行してください。

## WSL2/Docker → Windows上のUnity

`UNITY_MCP_MCP_HOST=host.docker.internal` にしてください（Node → Unity の接続先）。

MCPクライアントがワークスペース外のCWDでサーバーを起動する場合は、`UNITY_PROJECT_ROOT` を絶対パスで指定してください（またはワークスペース内で起動するようにしてください）。

## 既知の問題

- **Capabilities: none が出てツールが見えない**: `docs/troubleshooting/capabilities-none.md`
