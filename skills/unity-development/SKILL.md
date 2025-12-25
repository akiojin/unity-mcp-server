---
name: unity-development
description: Unity開発の包括的ガイド。アーキテクチャパターン、MCPツール選択、複合タスクワークフローを提供。Unity関連タスクで常時参照される親スキル。詳細な実装は子スキルを参照。使用タイミング: Unity開発全般、C#編集、シーン操作、UI実装、アセット管理、PlayModeテスト
allowed-tools: Read, Grep, Glob
---

# Unity Development Guide

Unity開発における包括的なガイド。このスキルは**常時参照される親スキル**として、共通パターンとツール選択の指針を提供する。

## Architecture Patterns

### Fail-Fast原則

**nullチェックは書かない。存在が前提のオブジェクトは直接使用する。**

```csharp
// NG: 禁止パターン
if (component != null) { component.DoSomething(); }
if (gameObject != null) { gameObject.SetActive(false); }
if (service != null) { service.Execute(); }

// OK: 正しいパターン - 直接使用
GetComponent<Rigidbody>().velocity = Vector3.zero;
GameService.Initialize();
target.position = Vector3.zero;
```

**適用対象**:
- `GetComponent<T>()` 後のnullチェック
- `Find*()` 後のnullチェック
- `[Inject]` 後のnullチェック

### Update内GetComponent禁止

**毎フレームのGetComponentはGC発生・パフォーマンス悪化の原因。Awakeでキャッシュする。**

```csharp
// NG: 毎フレームGC発生
void Update()
{
    GetComponent<Rigidbody>().velocity = input;
}

// OK: Awakeでキャッシュ
private Rigidbody _rb;

void Awake()
{
    _rb = GetComponent<Rigidbody>();
}

void Update()
{
    _rb.velocity = input;
}
```

### UniTaskパターン

**コルーチンの代わりにUniTaskを使用。async voidは禁止。**

```csharp
using Cysharp.Threading.Tasks;

// NG: async void
async void Start()
{
    await DoWorkAsync();
}

// OK: UniTaskVoid + destroyCancellationToken
async UniTaskVoid Start()
{
    await DoWorkAsync(destroyCancellationToken);
}

// OK: 戻り値がある場合
async UniTask<int> CalculateAsync(CancellationToken ct)
{
    await UniTask.Delay(1000, cancellationToken: ct);
    return 42;
}
```

**ベストプラクティス**:
- `destroyCancellationToken`でGameObject破棄時に自動キャンセル
- `UniTask.Delay` > `Task.Delay`（ゼロアロケーション）
- `UniTask.WhenAll` で並列実行

### VContainer DI

**依存性注入にはVContainerを使用。コンストラクタインジェクション推奨。**

```csharp
// インターフェース定義
public interface IPlayerService
{
    void Initialize();
}

// 実装クラス
public class PlayerService : IPlayerService
{
    public void Initialize() { /* ... */ }
}

// コンシューマー（MonoBehaviour）
public class GameManager : MonoBehaviour
{
    [Inject] private readonly IPlayerService _playerService;

    void Start()
    {
        _playerService.Initialize();
    }
}

// LifetimeScope設定
public class GameLifetimeScope : LifetimeScope
{
    protected override void Configure(IContainerBuilder builder)
    {
        builder.Register<IPlayerService, PlayerService>(Lifetime.Singleton);
        builder.RegisterComponentInHierarchy<GameManager>();
    }
}
```

**Lifetime選択**:
- `Lifetime.Singleton` - アプリ全体で1インスタンス
- `Lifetime.Scoped` - シーン単位で1インスタンス
- `Lifetime.Transient` - 毎回新規インスタンス

---

## MCP Tool Categories

### C# Code Editing

| ツール | 用途 | 使用条件 |
|--------|------|----------|
| `edit_snippet` | 軽量編集 | 差分80文字以内 |
| `edit_structured` | 構造化編集 | メソッド本体置換、メンバー追加 |
| `get_symbols` | シンボル一覧 | 編集前に必須 |
| `find_symbol` | シンボル検索 | 名前でシンボル特定 |
| `find_refs` | 参照検索 | リファクタリング前 |
| `read` | コード読み取り | ファイル内容確認 |
| `search` | パターン検索 | 正規表現検索 |
| `create_class` | クラス作成 | 新規ファイル |
| `rename_symbol` | リネーム | プロジェクト全体 |
| `remove_symbol` | シンボル削除 | 未使用コード削除 |

### Scene & GameObject

| ツール | 用途 |
|--------|------|
| `get_hierarchy` | ヒエラルキー取得 |
| `create_gameobject` | GameObject作成 |
| `modify_gameobject` | GameObject変更 |
| `delete_gameobject` | GameObject削除 |
| `find_gameobject` | GameObject検索 |
| `add_component` | コンポーネント追加 |
| `modify_component` | コンポーネント変更 |
| `remove_component` | コンポーネント削除 |
| `list_components` | コンポーネント一覧 |

### Asset Management

| ツール | 用途 |
|--------|------|
| `create_prefab` | プレハブ作成 |
| `modify_prefab` | プレハブ変更 |
| `instantiate_prefab` | プレハブ配置 |
| `create_material` | マテリアル作成 |
| `modify_material` | マテリアル変更 |
| `manage_asset_database` | アセット操作 |
| `addressables_manage` | Addressables管理 |

### PlayMode & Testing

| ツール | 用途 |
|--------|------|
| `play_game` | PlayMode開始 |
| `stop_game` | PlayMode終了 |
| `pause_game` | 一時停止 |
| `input_keyboard` | キーボード入力 |
| `input_mouse` | マウス入力 |
| `input_gamepad` | ゲームパッド入力 |
| `capture_screenshot` | スクリーンショット |
| `run_tests` | テスト実行 |

### UI Systems

| システム | 用途 | 詳細スキル |
|----------|------|------------|
| uGUI | ゲームUI（Canvas/EventSystem） | `unity-game-ugui-design` |
| UI Toolkit | モダンUI（Runtime/Editor） | `unity-game-ui-toolkit-design` |
| IMGUI | エディタ拡張のみ | `unity-editor-imgui-design` |

---

## Composite Workflow Examples

### Example 1: UIボタンでシーン切り替え

**必要な操作**: UI作成 + シーン管理 + C#スクリプト

```javascript
// 1. ボタンGameObject作成
mcp__unity-mcp-server__create_gameobject({
  name: "StartButton",
  parentPath: "/Canvas"
})

// 2. Buttonコンポーネント追加
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas/StartButton",
  componentType: "Button"
})

// 3. クリックハンドラースクリプト作成
mcp__unity-mcp-server__create_class({
  path: "Assets/Scripts/UI/StartButtonHandler.cs",
  className: "StartButtonHandler",
  baseType: "MonoBehaviour",
  namespace: "Game.UI"
})

// 4. OnClick実装追加
mcp__unity-mcp-server__edit_structured({
  path: "Assets/Scripts/UI/StartButtonHandler.cs",
  symbolName: "StartButtonHandler",
  operation: "insert_after",
  newText: `
    public void OnStartClicked()
    {
        SceneManager.LoadScene("GameScene");
    }
`
})
```

### Example 2: 敵キャラクター作成

**必要な操作**: GameObject + コンポーネント + C#スクリプト + プレハブ化

```javascript
// 1. 敵GameObject作成
mcp__unity-mcp-server__create_gameobject({
  name: "Enemy",
  primitiveType: "capsule",
  position: { x: 0, y: 1, z: 0 }
})

// 2. コンポーネント追加
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Enemy",
  componentType: "Rigidbody"
})

// 3. 敵スクリプト作成
mcp__unity-mcp-server__create_class({
  path: "Assets/Scripts/Enemies/EnemyController.cs",
  className: "EnemyController",
  baseType: "MonoBehaviour"
})

// 4. AI実装
mcp__unity-mcp-server__edit_structured({
  path: "Assets/Scripts/Enemies/EnemyController.cs",
  symbolName: "EnemyController",
  operation: "insert_after",
  newText: `
    [SerializeField] private float _speed = 3f;
    private Transform _target;

    void Update()
    {
        if (_target != null)
            transform.position = Vector3.MoveTowards(
                transform.position,
                _target.position,
                _speed * Time.deltaTime
            );
    }
`
})

// 5. プレハブ化
mcp__unity-mcp-server__create_prefab({
  gameObjectPath: "/Enemy",
  prefabPath: "Assets/Prefabs/Enemies/Enemy.prefab"
})
```

### Example 3: PlayModeテスト

**必要な操作**: テスト作成 + PlayMode制御 + 入力シミュレーション

```javascript
// 1. テストクラス作成
mcp__unity-mcp-server__create_class({
  path: "Assets/Tests/PlayMode/PlayerMovementTests.cs",
  className: "PlayerMovementTests",
  namespace: "Tests.PlayMode",
  usings: "NUnit.Framework,UnityEngine.TestTools,System.Collections"
})

// 2. PlayModeテスト実装
mcp__unity-mcp-server__edit_structured({
  path: "Assets/Tests/PlayMode/PlayerMovementTests.cs",
  symbolName: "PlayerMovementTests",
  operation: "insert_after",
  newText: `
    [UnityTest]
    public IEnumerator Player_MovesForward_WhenWPressed()
    {
        var player = Object.FindObjectOfType<PlayerController>();
        var startPos = player.transform.position;

        yield return null;

        // W キー入力をシミュレート
        // テスト実行時はinput_keyboardツールで実際に入力

        yield return new WaitForSeconds(0.5f);

        Assert.Greater(player.transform.position.z, startPos.z);
    }
`
})

// 3. テスト実行
mcp__unity-mcp-server__run_tests({
  testMode: "PlayMode",
  filter: "PlayerMovementTests"
})
```

---

## Child Skill Reference

詳細な実装パターンが必要な場合は、以下の子スキルを参照：

| スキル | 用途 | 参照タイミング |
|--------|------|----------------|
| `unity-csharp-editing` | C#編集・TDD・リファクタリング | コード編集時 |
| `unity-scene-management` | シーン・GameObject操作 | シーン構築時 |
| `unity-asset-management` | プレハブ・マテリアル・Addressables | アセット管理時 |
| `unity-playmode-testing` | PlayMode・入力シミュレーション | テスト実行時 |
| `unity-game-ugui-design` | uGUI（Canvas/EventSystem） | ゲームUI実装時 |
| `unity-game-ui-toolkit-design` | UI Toolkit（Runtime） | モダンUI実装時 |
| `unity-editor-imgui-design` | IMGUI（EditorWindow/Inspector） | エディタ拡張時 |

---

## Quick Decision Tree

```
Unity開発タスク
├─ コード編集が必要？
│   ├─ YES → edit_snippet / edit_structured
│   │         詳細: unity-csharp-editing
│   └─ NO → 次へ
├─ シーン/GameObject操作が必要？
│   ├─ YES → create_gameobject / add_component
│   │         詳細: unity-scene-management
│   └─ NO → 次へ
├─ アセット操作が必要？
│   ├─ YES → create_prefab / addressables_manage
│   │         詳細: unity-asset-management
│   └─ NO → 次へ
├─ UI実装が必要？
│   ├─ ゲームUI → unity-game-ugui-design or unity-game-ui-toolkit-design
│   └─ エディタUI → unity-editor-imgui-design
└─ テスト/動作確認が必要？
    └─ YES → play_game / run_tests
              詳細: unity-playmode-testing
```
