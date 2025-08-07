# /FixUnityConsole

Unityエディタのコンソール出力を確認し、エラーや警告を自動的に解決するコマンド

## 概要

このコマンドは、UnityMCPを利用してUnityエディタのコンソールログを取得・分析し、unity-architectが複数の専門サブエージェントに作業を分配して問題を並列で解決します。エラーの種類に応じて適切なサブエージェントが専門的な修正を実行します。

## 処理フロー

1. **Unity Editor接続確認**
   - UnityMCPへの接続確認
   - エディタの実行状態確認
   - 接続エラー時の診断と対処法の提示

2. **コンソールログ収集**
   - エラー、警告、アサートを取得
   - タイムスタンプ順にソート
   - 重複するエラーをグループ化

3. **Unity側での再検証**
   - アセットの再インポート
   - スクリプトの再コンパイル
   - エラーが解消されたことを確認

4. **作業完了報告**
   - 修正内容のサマリー
   - 残存する問題の報告
   - 手動対応が必要な項目の提示

## エラータイプ別の対処法

### コンパイルエラー
```csharp
// エラー例: CS0246: 型または名前空間の名前 'Vector3' が見つかりませんでした
// 修正: using UnityEngine; を追加
```

### Null参照例外
```csharp
// エラー例: NullReferenceException: Object reference not set to an instance of an object
// 修正: null チェックの追加
if (component != null) {
    component.DoSomething();
}
```

### Missing参照
```csharp
// エラー例: The referenced script on this Behaviour is missing!
// 修正:
// 1. スクリプトファイルを検索
// 2. GameObjectのコンポーネントを更新
// 3. プレハブを再保存
```

### 非推奨API
```csharp
// エラー例: 'Application.LoadLevel' is obsolete
// 修正: SceneManager.LoadScene に置換
```

## 実装詳細

### Unity接続確認
```bash
# UnityMCPの接続テスト
mcp__UnityMCP__ping

# エディタ状態の確認
mcp__UnityMCP__get_editor_state
```

### ログ取得と分析
```bash
# エラーログの取得
mcp__UnityMCP__enhanced_read_logs --logTypes Error --count 100

# コンパイル状態の確認
mcp__UnityMCP__get_compilation_state
```

### 修正できない問題の処理
- プロジェクト設定の問題
- 外部アセットの互換性
- プラットフォーム固有の問題
- ライセンス関連のエラー

## 出力例

### 成功時の出力：
```
/FixUnityConsole

🔍 Unity Editorに接続中...
  ✅ 接続成功
  📊 エディタ状態: Play Mode

📋 コンソールログを取得中...
  ⚠️ 警告: 15件
  ❌ エラー: 8件
  🔴 アサート: 2件

🏗️ unity-architectが問題を分析中...
  コンパイルエラー: 3件
  Null参照例外: 2件
  Missing参照: 3件

🔄 Unityで再コンパイル中...
  ✅ コンパイル成功

📊 最終結果:
  修正済み: 8/8 エラー（5つのサブエージェントによる並列処理）
  処理時間: 通常の1/5に短縮
  残存エラー: 0件

✅ すべてのエラーが解決されました！
```

### エラー時の出力：
```
/FixUnityConsole

🔍 Unity Editorに接続中...
  ❌ 接続失敗

⚠️ Unity Editorが起動していないか、UnityMCPが正しく設定されていません。

🔧 対処法:
  1. Unity Editorが起動していることを確認
  2. UnityMCPの設定を確認:
     - .mcp.jsonでUnityMCPが有効になっているか
     - ポート番号が正しいか（デフォルト: 5001）
  3. Unity側でMCPパッケージがインポートされているか確認

📖 詳細なセットアップ手順:
  https://github.com/your-repo/unity-mcp-setup
```

## 注意事項

- Unity Editorが起動している必要があります
- UnityMCPが正しく設定されている必要があります
- 大規模な変更を行う前に、プロジェクトのバックアップを推奨
- 外部アセットの修正は行いません
- プラットフォーム固有の問題は手動対応が必要な場合があります
- VContainer、UniTaskなどプロジェクト要件に準拠した修正を実施

## トラブルシューティング

### UnityMCP接続エラー
1. Unity Editorが起動しているか確認
2. .mcp.jsonの設定を確認
3. ファイアウォールやセキュリティソフトの設定を確認

### 修正後もエラーが残る場合
1. Unity Editorでクリーンビルドを実行
2. Library/フォルダを削除して再インポート
3. プロジェクト設定の確認

### パフォーマンスの問題
- `--limit`オプションで処理するログ数を制限
- `--errors-only`で警告を除外
- 特定のファイルパターンのみを対象にする
