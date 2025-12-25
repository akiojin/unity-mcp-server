---
name: unity-status
description: Unity Editorの接続状態、シーン情報、コンパイル状態を一括確認するコマンド
---

# Unity Status Check

Unity Editorの現在の状態を包括的に確認します。

## 実行内容

以下の情報を順番に取得して報告します：

### 1. 接続状態の確認

```javascript
mcp__unity-mcp-server__ping()
```

Unity Editorとの接続が正常かどうかを確認します。

### 2. エディタ状態の確認

```javascript
mcp__unity-mcp-server__get_editor_state()
```

現在のエディタ状態（Play/Edit モード、一時停止状態など）を取得します。

### 3. シーン情報の確認

```javascript
mcp__unity-mcp-server__get_scene_info()
```

現在ロードされているシーンの情報を取得します。

### 4. コンパイル状態の確認

```javascript
mcp__unity-mcp-server__get_compilation_state({ includeMessages: true })
```

コンパイルエラーや警告があれば表示します。

### 5. コンソールログの確認（エラーのみ）

```javascript
mcp__unity-mcp-server__read_console({ logTypes: ["Error"], count: 10 })
```

直近のエラーログを確認します。

## 出力形式

```
## Unity Status Report

### 接続状態
✅ Unity Editor と接続中

### エディタ状態
- モード: Edit Mode
- 一時停止: false

### 現在のシーン
- 名前: SampleScene
- パス: Assets/Scenes/SampleScene.unity
- 保存済み: true

### コンパイル状態
✅ コンパイル成功（エラーなし）

### 直近のエラー
（エラーなし）
```

## 使用例

```
/unity-status
```

このコマンドを実行すると、Unity開発を開始する前の状態確認や、問題発生時のデバッグに役立ちます。
