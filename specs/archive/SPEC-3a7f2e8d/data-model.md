# データモデル: Unity Editor内ターミナル

**機能ID**: `SPEC-3a7f2e8d` | **日付**: 2025-10-29

## 概要

Unity Editor内ターミナルで使用するデータモデルを定義します。エンティティは最小限に保ち、シンプルさを優先します。

## エンティティ一覧

### 1. TerminalSession

ターミナルの1つのセッション（シェルプロセスインスタンス）を表します。

**属性**:

| 属性名 | 型 | 説明 | 必須 | バリデーション |
|--------|---|------|------|---------------|
| sessionId | string (GUID) | 一意のセッション識別子 | Yes | GUID形式 |
| workingDirectory | string | 初期作業ディレクトリ（絶対パス） | Yes | 絶対パス、存在するディレクトリ |
| shellType | enum | シェルタイプ | Yes | `wsl`, `bash`, `zsh`, `pwsh`, `powershell`, `cmd` |
| shellPath | string | シェル実行ファイルの絶対パス | Yes | 絶対パス、実行可能ファイル |
| process | Process | System.Diagnostics.Process インスタンス | Yes | null不可 |
| outputBuffer | TerminalOutputBuffer | 出力バッファ | Yes | null不可 |
| isRunning | boolean | プロセスが実行中か | Yes | - |
| createdAt | DateTime | セッション作成日時 | Yes | UTC |
| environmentVariables | Dictionary<string, string> | 環境変数のコピー | Yes | null不可 |

**ライフサイクル**:

```
[作成] → [実行中] → [終了]
   ↓         ↓         ↓
sessionId  isRunning process.HasExited
生成       = true    = true
```

**責務**:

- シェルプロセスの起動と管理
- 標準入力への書き込み
- 出力バッファへのデータ蓄積
- プロセスの終了処理

---

### 2. TerminalOutputBuffer

ターミナルの出力行を保持するバッファです。

**属性**:

| 属性名 | 型 | 説明 | 必須 | バリデーション |
|--------|---|------|------|---------------|
| lines | List<TerminalLine> | 出力行のリスト | Yes | null不可 |
| maxLines | int | 最大保持行数 | Yes | 100-10000、デフォルト1000 |

**操作**:

- `Add(text: string, isError: boolean)`: 新しい行を追加。maxLinesを超えたら古い行を削除（FIFO）
- `GetLines(maxLines: int)`: 最新のN行を取得（UIに表示するため）
- `Clear()`: すべての行をクリア

**責務**:

- 出力行の蓄積と管理
- 古い行の自動削除（メモリ節約）
- スレッドセーフなアクセス（lock使用）

---

### 3. TerminalLine

ターミナルの1行の出力を表します。

**属性**:

| 属性名 | 型 | 説明 | 必須 | バリデーション |
|--------|---|------|------|---------------|
| text | string | 出力テキスト | Yes | null可（空行） |
| isError | boolean | エラー出力（stderr）か | Yes | - |
| timestamp | DateTime | 出力日時 | Yes | UTC |
| ansiColor | Color | ANSI カラーコード（基本8色のみ） | No | Unity Color構造体 |

**責務**:

- 1行の出力データを保持
- ANSI カラー情報を保持（Unity GUIでの色表示用）

---

### 4. TerminalSessionManager

すべてのターミナルセッションを管理する静的クラスです。

**属性**:

| 属性名 | 型 | 説明 |
|--------|---|------|
| sessions | Dictionary<string, TerminalSession> | sessionId → TerminalSession のマップ |

**操作**:

- `CreateSession(sessionId: string, workingDirectory: string, shellType: string): TerminalSession`: 新しいセッションを作成
- `GetSession(sessionId: string): TerminalSession`: セッションを取得
- `CloseSession(sessionId: string)`: セッションを終了・削除
- `GetAllSessions(): List<TerminalSession>`: すべてのセッションを取得

**責務**:

- セッションのライフサイクル管理
- セッションの一元管理
- Unity Editor再起動時のクリーンアップ

---

## エンティティ関係図

```
TerminalSessionManager (Static)
    |
    | manages
    ↓
TerminalSession (1..*)
    |
    | has
    ↓
TerminalOutputBuffer (1)
    |
    | contains
    ↓
TerminalLine (0..*)
```

---

## データフロー

### 1. セッション作成フロー

```
1. TerminalWindow.OnEnable()
   → TerminalSessionManager.CreateSession()
      → ShellDetector.DetectShell()
      → PathResolver.ResolveWorkingDirectory()
      → new TerminalSession(sessionId, workingDir, shellType)
         → Process.Start()
         → BeginOutputReadLine()
         → BeginErrorReadLine()
```

### 2. コマンド実行フロー

```
1. TerminalWindow.OnGUI() でコマンド入力
   → TerminalSession.ExecuteCommand(command)
      → Process.StandardInput.WriteLine(command)
```

### 3. 出力表示フロー

```
1. Process.OutputDataReceived イベント
   → TerminalOutputBuffer.Add(text, isError: false)
      → ANSIParser.Parse(text)
      → new TerminalLine(text, isError, timestamp, ansiColor)
      → lines.Add(line)

2. TerminalWindow.OnGUI()
   → TerminalSession.OutputBuffer.GetLines(maxLines: 1000)
      → UI描画（GUILayout.Label with GUIStyle.textColor）
```

### 4. セッション終了フロー

```
1. TerminalWindow.OnDestroy()
   → TerminalSessionManager.CloseSession(sessionId)
      → TerminalSession.Close()
         → Process.Kill() (if still running)
         → Process.Dispose()
         → sessions.Remove(sessionId)
```

---

## 状態遷移

### TerminalSessionの状態遷移

```
[初期化] --Start()--> [実行中] --Close()--> [終了]
                          |
                          | Process.HasExited
                          ↓
                       [自然終了]
```

**状態**:

- **初期化**: Process未起動、sessionId割り当て済み
- **実行中**: Process起動済み、isRunning = true
- **自然終了**: Processが自然に終了（exit、エラー等）
- **終了**: Close()呼び出しまたは自然終了後、sessionId削除済み

---

## バリデーションルール

### TerminalSession作成時

1. `sessionId`: 必須、GUID形式、重複不可
2. `workingDirectory`: 必須、絶対パス、存在するディレクトリ
3. `shellType`: 必須、有効なenum値
4. `shellPath`: 必須、絶対パス、実行可能ファイル

### TerminalOutputBuffer追加時

1. `maxLines`: 100-10000の範囲内
2. `text`: null可（空行として扱う）

### コマンド実行時

1. `sessionId`: 存在するセッション
2. `isRunning`: true（実行中のセッションのみ）

---

## メモリ管理

### TerminalOutputBuffer

- **最大行数**: デフォルト1000行
- **1行あたりの推定サイズ**: ~1KB
- **最大メモリ使用量**: ~1MB/セッション

### セッション数

- **想定最大同時セッション**: 10個
- **総メモリ使用量**: ~10MB（バッファのみ）

### クリーンアップ

- Unity Editor再起動時: すべてのセッションを自動終了
- ウィンドウ閉鎖時: 対応するセッションを自動終了
- Process終了時: 自動的にバッファをクリーンアップ

---

## スレッドセーフティ

### ロック戦略

```csharp
// TerminalOutputBuffer.Add()
lock (_lock)
{
    lines.Add(line);
    if (lines.Count > maxLines)
    {
        lines.RemoveAt(0); // FIFO
    }
}

// TerminalOutputBuffer.GetLines()
lock (_lock)
{
    return lines.GetRange(Math.Max(0, lines.Count - maxLines), Math.Min(maxLines, lines.Count));
}
```

### スレッド間の通信

- **Process.OutputDataReceived**: バックグラウンドスレッドで実行
- **TerminalWindow.OnGUI()**: Unity EditorのメインスレッドでUI描画
- **ロック**: `lock (_lock)` でバッファへのアクセスを保護

---

## まとめ

データモデルは4つのエンティティで構成され、シンプルさを優先しました：

1. **TerminalSession**: セッションとプロセス管理
2. **TerminalOutputBuffer**: 出力バッファ管理
3. **TerminalLine**: 1行の出力データ
4. **TerminalSessionManager**: 全セッションの管理

すべてのエンティティは明確な責務を持ち、Repository/UoWパターンなどの複雑な抽象化は避けています。
