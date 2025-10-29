# リサーチ成果: Unity Editor内ターミナル

**機能ID**: `SPEC-3a7f2e8d` | **日付**: 2025-10-29

## 概要

Unity Editor内ターミナル実装のための技術リサーチ成果をまとめます。6つの主要技術トピックについて調査し、実装方針を決定しました。

## 1. WSL2パス変換ベストプラクティス

### 決定: 単純な文字列置換ベースの変換

**理由**:

- WSL2のパス変換ルールは明確で予測可能
- `wslpath`コマンド呼び出しはオーバーヘッドが大きい
- エッジケースは限定的で対応可能

**実装方針**:

```csharp
// Windowsパス → WSL2パス
C:\Users\username\project → /mnt/c/Users/username/project

変換ロジック:
1. ドライブレター抽出 (C:)
2. 小文字化 → /mnt/c
3. バックスラッシュ → スラッシュ
4. 連結: /mnt/{drive}/{path}
```

**エッジケース対応**:

- **スペース**: そのまま保持（WSL2は自動エスケープ）
- **日本語**: UTF-8エンコーディングで正常動作
- **特殊文字**: シェルエスケープが必要な場合は`'`で囲む
- **UNCパス** (`\\server\share`): WSL2未対応のため警告表示

**検討した代替案**:

- `wslpath` コマンド呼び出し: 遅い、Process起動のオーバーヘッド
- Windows API (P/Invoke): 複雑、.NET Standard互換性の問題

---

## 2. C# System.Diagnostics.Process 非同期I/O

### 決定: BeginOutputReadLine/BeginErrorReadLine イベント駆動モデル

**理由**:

- Unity Editor環境でスレッド安全
- 標準出力/エラー出力を個別にキャプチャ可能
- バッファリングが自動処理される

**実装方針**:

```csharp
var process = new Process
{
    StartInfo = new ProcessStartInfo
    {
        FileName = shellPath,
        UseShellExecute = false,
        RedirectStandardInput = true,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        CreateNoWindow = true
    }
};

process.OutputDataReceived += (sender, e) =>
{
    if (e.Data != null)
    {
        // バッファに追加（スレッドセーフ）
        lock (_outputBuffer)
        {
            _outputBuffer.Add(e.Data, isError: false);
        }
    }
};

process.ErrorDataReceived += (sender, e) =>
{
    if (e.Data != null)
    {
        lock (_outputBuffer)
        {
            _outputBuffer.Add(e.Data, isError: true);
        }
    }
};

process.Start();
process.BeginOutputReadLine();
process.BeginErrorReadLine();
```

**Unity EditorUpdateループとの統合**:

```csharp
// TerminalWindow.OnGUI()
// ロック内で最新の出力を取得してUI描画
lock (_session.OutputBuffer)
{
    foreach (var line in _session.OutputBuffer.GetLines(maxLines: 1000))
    {
        DrawLine(line);
    }
}
```

**バッファリング戦略**:

- **最大行数**: 1000行（設定可能）
- **古い行の削除**: FIFO方式で自動削除
- **メモリ使用量**: 約1MB（1000行 × 1KB/行）

**検討した代替案**:

- `ReadLine()` ループ: Unity Editorをブロックする
- `ReadAsync()` + async/await: Unity Editor環境で不安定
- カスタムスレッド: 複雑、Unity APIとの相互作用に問題

---

## 3. Unity EditorWindow 複数インスタンス対応

### 決定: CreateInstance() + Show() パターン

**理由**:

- 複数の独立したウィンドウを開ける
- 各ウィンドウが独自のセッション状態を持てる
- ドッキング可能

**実装方針**:

```csharp
// MenuItem から呼び出し
[MenuItem("Window/Unity MCP Server/Terminal (Workspace Root)")]
public static void OpenAtWorkspaceRoot()
{
    var window = CreateInstance<TerminalWindow>();
    window._initialWorkingDirectory = PathResolver.GetWorkspaceRoot();
    window.titleContent = new GUIContent("Terminal (workspace)");
    window.Show(); // ShowUtility()ではなくShow()
}

// OnEnable で初期化
private void OnEnable()
{
    if (string.IsNullOrEmpty(_sessionId))
    {
        _sessionId = System.Guid.NewGuid().ToString();
        _session = TerminalSessionManager.CreateSession(
            _sessionId,
            _initialWorkingDirectory
        );
    }
}

// OnDestroy でクリーンアップ
private void OnDestroy()
{
    if (_session != null)
    {
        TerminalSessionManager.CloseSession(_sessionId);
        _session = null;
    }
}
```

**GetWindow() との違い**:

| 方式 | CreateInstance() | GetWindow() |
|------|------------------|-------------|
| インスタンス | 新規作成 | シングルトン |
| 複数ウィンドウ | 可能 | 不可（1つのみ） |
| 用途 | 複数セッション | 設定ウィンドウ等 |

**検討した代替案**:

- `GetWindow<TerminalWindow>()`: シングルトンのため複数開けない
- `ShowUtility()`: ユーティリティウィンドウ（ドッキング不可）

---

## 4. クロスプラットフォームシェル検出

### 決定: OS判定 + File.Exists() チェーンによる優先順位検出

**理由**:

- シンプルで予測可能
- ファイルシステムレベルでの存在確認
- Process.Start()失敗前に検証可能

**実装方針**:

```csharp
public static class ShellDetector
{
    public static (string shellType, string shellPath) DetectShell(string requestedShell = "auto")
    {
        if (requestedShell != "auto")
        {
            return FindShellPath(requestedShell);
        }

        if (Application.platform == RuntimePlatform.WindowsEditor)
        {
            // Windows: WSL2 → PowerShell Core → Windows PowerShell
            if (File.Exists("C:\\Windows\\System32\\wsl.exe"))
                return ("wsl", "C:\\Windows\\System32\\wsl.exe");

            if (File.Exists("C:\\Program Files\\PowerShell\\7\\pwsh.exe"))
                return ("pwsh", "C:\\Program Files\\PowerShell\\7\\pwsh.exe");

            if (File.Exists("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"))
                return ("powershell", "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");

            throw new System.Exception("No shell found on Windows");
        }
        else if (Application.platform == RuntimePlatform.OSXEditor)
        {
            // macOS: Zsh → Bash
            if (File.Exists("/bin/zsh"))
                return ("zsh", "/bin/zsh");

            if (File.Exists("/bin/bash"))
                return ("bash", "/bin/bash");

            throw new System.Exception("No shell found on macOS");
        }
        else // Linux
        {
            // Linux: Bash
            if (File.Exists("/bin/bash"))
                return ("bash", "/bin/bash");

            throw new System.Exception("No shell found on Linux");
        }
    }
}
```

**優先順位の理由**:

- **Windows WSL2優先**: 開発者の多くがWSL2環境を利用
- **macOS Zsh優先**: macOS 10.15以降のデフォルトシェル
- **PowerShell Core > Windows PowerShell**: 新しいバージョンを優先

**検討した代替案**:

- `which`/`where`コマンド呼び出し: Process起動のオーバーヘッド
- レジストリ読み取り (Windows): 複雑、信頼性が低い
- `Process.Start()` で試行: 失敗時のエラーハンドリングが複雑

---

## 5. ANSI エスケープコード処理

### 決定: 基本8色のみサポート、簡易パーサ自作

**理由**:

- Unity GUIでは複雑なANSI制御シーケンスは不要
- 256色やRGBは Unity GUIStyle で表現困難
- カーソル移動・画面クリアは PTY未対応のため不要

**実装方針**:

```csharp
public static class ANSIParser
{
    // 基本8色のみサポート
    private static readonly Dictionary<int, Color> ColorMap = new Dictionary<int, Color>
    {
        {30, Color.black},    // 黒
        {31, Color.red},      // 赤
        {32, Color.green},    // 緑
        {33, Color.yellow},   // 黄
        {34, Color.blue},     // 青
        {35, Color.magenta},  // マゼンタ
        {36, Color.cyan},     // シアン
        {37, Color.white}     // 白
    };

    public static (string text, Color color) Parse(string input)
    {
        // \e[31m のような ANSI エスケープコードを検出
        var regex = new Regex(@"\x1B\[(\d+)m");
        var match = regex.Match(input);

        if (match.Success)
        {
            int code = int.Parse(match.Groups[1].Value);
            if (ColorMap.ContainsKey(code))
            {
                string cleanText = regex.Replace(input, "");
                return (cleanText, ColorMap[code]);
            }
        }

        // ANSI コードなし or 未対応コード
        return (input, Color.white);
    }
}
```

**Unity GUIStyleでの色適用**:

```csharp
GUIStyle style = new GUIStyle(GUI.skin.label);
style.normal.textColor = line.ansiColor;
GUILayout.Label(line.text, style);
```

**対応範囲**:

- **対応**: 基本8色（30-37）
- **未対応**: 256色、RGB、太字、下線、カーソル移動、画面クリア

**検討した代替案**:

- 完全ANSIパーサライブラリ: 過剰機能、Unity環境で動作保証なし
- ANSI完全除去: 色情報を失う、視認性低下
- RichTextフォーマット変換: Unity GUIでは限定的なサポート

---

## 6. 環境変数継承

### 決定: Environment.GetEnvironmentVariables() で全環境変数コピー

**理由**:

- Unity Editorが持つすべての環境変数を継承
- PATH、HOME、USERなど開発に必要な変数を確実に引き継ぐ
- Unity Editor環境固有の変数も継承される

**実装方針**:

```csharp
var startInfo = new ProcessStartInfo
{
    FileName = shellPath,
    UseShellExecute = false,
    // ... その他の設定
};

// 環境変数を完全コピー
startInfo.EnvironmentVariables.Clear();
foreach (DictionaryEntry entry in Environment.GetEnvironmentVariables())
{
    string key = entry.Key.ToString();
    string value = entry.Value.ToString();

    // 既存キーは上書き
    if (startInfo.EnvironmentVariables.ContainsKey(key))
    {
        startInfo.EnvironmentVariables[key] = value;
    }
    else
    {
        startInfo.EnvironmentVariables.Add(key, value);
    }
}

// オプション: ターミナル固有の環境変数を追加
startInfo.EnvironmentVariables["TERM"] = "xterm-256color";
startInfo.EnvironmentVariables["UNITY_MCP_SESSION_ID"] = sessionId;
```

**継承される主要環境変数**:

- `PATH`: コマンド検索パス（最重要）
- `HOME` / `USERPROFILE`: ホームディレクトリ
- `USER` / `USERNAME`: ユーザー名
- `LANG` / `LC_ALL`: ロケール設定
- `NODE_PATH`: Node.js パッケージパス
- `GIT_*`: Git設定

**Unity Editor環境での特殊ケース**:

- Unity Editorが起動時に持つPATHには、システムPATH + Unity固有のパスが含まれる
- `Process.StartInfo.EnvironmentVariables.Clear()` を呼ぶと、デフォルトの環境変数がクリアされるため、明示的にコピーが必要

**検討した代替案**:

- `UseShellExecute = true`: 環境変数は自動継承されるが、標準入出力リダイレクト不可
- 特定の環境変数のみコピー: PATHのみでは不十分（HOME等も必要）
- 環境変数を一切設定しない: シェルが起動しない、コマンドが見つからない

---

## まとめ

すべてのリサーチタスクが完了し、実装方針が確定しました。

**技術選択の要約**:

1. **WSL2パス変換**: 文字列置換ベース（シンプル、高速）
2. **Process非同期I/O**: `BeginOutputReadLine` イベント駆動（安定、スレッドセーフ）
3. **複数ウィンドウ**: `CreateInstance()` + `Show()`（複数インスタンス対応）
4. **シェル検出**: OS判定 + `File.Exists()` チェーン（予測可能）
5. **ANSIパース**: 基本8色のみ自作パーサ（必要十分）
6. **環境変数**: 全変数コピー（完全な開発環境再現）

**不明点解決状況**: ✅ すべて解決済み

**Phase 1 設計フェーズへの準備完了**: ✅
