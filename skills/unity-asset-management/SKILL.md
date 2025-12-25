---
name: unity-asset-management
description: Unityアセット（プレハブ、マテリアル、アセットデータベース、Addressables）の作成・編集・管理を支援。依存関係分析とインポート設定も含む。使用タイミング: プレハブ作成、マテリアル編集、アセット検索、依存関係分析、Addressables
allowed-tools: Read, Grep, Glob
---

# Unity Asset Management

プレハブ、マテリアル、アセットデータベース、Addressablesの管理ガイド。

## Quick Start

### 1. プレハブ作成・配置

```javascript
// GameObjectからプレハブ作成
mcp__unity-mcp-server__create_prefab({
  prefabPath: "Assets/Prefabs/Enemy.prefab",
  gameObjectPath: "/Enemy"
})

// プレハブをシーンにインスタンス化
mcp__unity-mcp-server__instantiate_prefab({
  prefabPath: "Assets/Prefabs/Enemy.prefab",
  position: { x: 5, y: 0, z: 0 },
  name: "Enemy_01"
})
```

### 2. マテリアル作成

```javascript
// 基本マテリアル作成
mcp__unity-mcp-server__create_material({
  materialPath: "Assets/Materials/RedMetal.mat",
  shader: "Standard",
  properties: {
    "_Color": [1, 0, 0, 1],
    "_Metallic": 0.8,
    "_Glossiness": 0.6
  }
})
```

### 3. アセット検索

```javascript
// テクスチャを検索
mcp__unity-mcp-server__manage_asset_database({
  action: "find_assets",
  filter: "t:Texture2D"
})
```

## Prefab Management

### プレハブ作成

```javascript
// シーンのGameObjectからプレハブ作成
mcp__unity-mcp-server__create_prefab({
  prefabPath: "Assets/Prefabs/Player.prefab",
  gameObjectPath: "/Player"
})

// 空のプレハブを作成
mcp__unity-mcp-server__create_prefab({
  prefabPath: "Assets/Prefabs/Empty.prefab",
  createFromTemplate: true
})

// 上書き許可
mcp__unity-mcp-server__create_prefab({
  prefabPath: "Assets/Prefabs/Player.prefab",
  gameObjectPath: "/Player",
  overwrite: true
})
```

### プレハブモード（編集）

```javascript
// プレハブを開く
mcp__unity-mcp-server__open_prefab({
  prefabPath: "Assets/Prefabs/Player.prefab"
})

// 特定のオブジェクトにフォーカス
mcp__unity-mcp-server__open_prefab({
  prefabPath: "Assets/Prefabs/Player.prefab",
  focusObject: "Weapon",  // プレハブルート相対パス
  isolateObject: true
})

// プレハブモード中の編集（コンポーネント操作等）
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Player",  // プレハブモード中はプレハブルートがルート
  componentType: "AudioSource"
})

// 保存してプレハブモード終了
mcp__unity-mcp-server__save_prefab()
mcp__unity-mcp-server__exit_prefab_mode({ saveChanges: true })

// 保存せずに終了
mcp__unity-mcp-server__exit_prefab_mode({ saveChanges: false })
```

### プレハブインスタンス化

```javascript
// 基本インスタンス化
mcp__unity-mcp-server__instantiate_prefab({
  prefabPath: "Assets/Prefabs/Enemy.prefab"
})

// Transform指定
mcp__unity-mcp-server__instantiate_prefab({
  prefabPath: "Assets/Prefabs/Enemy.prefab",
  position: { x: 10, y: 0, z: 5 },
  rotation: { x: 0, y: 90, z: 0 },
  name: "Enemy_Guard"
})

// 親オブジェクト指定
mcp__unity-mcp-server__instantiate_prefab({
  prefabPath: "Assets/Prefabs/Coin.prefab",
  parent: "/Collectibles",
  position: { x: 0, y: 1, z: 0 }
})
```

### プレハブ修正

```javascript
// プロパティ変更（インスタンスにも適用）
mcp__unity-mcp-server__modify_prefab({
  prefabPath: "Assets/Prefabs/Enemy.prefab",
  modifications: {
    "health": 150,
    "speed": 3.5
  },
  applyToInstances: true
})

// インスタンスには適用しない
mcp__unity-mcp-server__modify_prefab({
  prefabPath: "Assets/Prefabs/Enemy.prefab",
  modifications: { "debugMode": true },
  applyToInstances: false
})
```

## Material Management

### マテリアル作成

```javascript
// Standardシェーダー
mcp__unity-mcp-server__create_material({
  materialPath: "Assets/Materials/Metal.mat",
  shader: "Standard",
  properties: {
    "_Color": [0.8, 0.8, 0.8, 1],
    "_Metallic": 1.0,
    "_Glossiness": 0.9
  }
})

// Unlitシェーダー
mcp__unity-mcp-server__create_material({
  materialPath: "Assets/Materials/Unlit.mat",
  shader: "Unlit/Color",
  properties: {
    "_Color": [1, 0, 0, 1]
  }
})

// URPシェーダー
mcp__unity-mcp-server__create_material({
  materialPath: "Assets/Materials/URPLit.mat",
  shader: "Universal Render Pipeline/Lit",
  properties: {
    "_BaseColor": [1, 1, 1, 1],
    "_Smoothness": 0.5
  }
})

// 既存マテリアルをコピー
mcp__unity-mcp-server__create_material({
  materialPath: "Assets/Materials/MetalRed.mat",
  copyFrom: "Assets/Materials/Metal.mat",
  properties: {
    "_Color": [1, 0, 0, 1]
  }
})
```

### マテリアル修正

```javascript
// プロパティ変更
mcp__unity-mcp-server__modify_material({
  materialPath: "Assets/Materials/Metal.mat",
  properties: {
    "_Color": [0, 0, 1, 1],
    "_Metallic": 0.5
  }
})

// シェーダー変更
mcp__unity-mcp-server__modify_material({
  materialPath: "Assets/Materials/Debug.mat",
  shader: "Unlit/Color",
  properties: {
    "_Color": [1, 0, 1, 1]
  }
})
```

### 主要なシェーダープロパティ

| シェーダー | プロパティ | 説明 |
|-----------|-----------|------|
| Standard | `_Color` | アルベドカラー [R,G,B,A] |
| Standard | `_Metallic` | メタリック度 0-1 |
| Standard | `_Glossiness` | 滑らかさ 0-1 |
| Standard | `_MainTex` | アルベドテクスチャ |
| Standard | `_BumpMap` | ノーマルマップ |
| Standard | `_EmissionColor` | エミッションカラー |
| URP/Lit | `_BaseColor` | ベースカラー |
| URP/Lit | `_Smoothness` | 滑らかさ |
| URP/Lit | `_BaseMap` | ベーステクスチャ |

## Asset Database Operations

### アセット検索

```javascript
// 型フィルタ
mcp__unity-mcp-server__manage_asset_database({
  action: "find_assets",
  filter: "t:Texture2D"
})

// 名前フィルタ
mcp__unity-mcp-server__manage_asset_database({
  action: "find_assets",
  filter: "Player"
})

// ラベルフィルタ
mcp__unity-mcp-server__manage_asset_database({
  action: "find_assets",
  filter: "l:UI"
})

// 複合フィルタ
mcp__unity-mcp-server__manage_asset_database({
  action: "find_assets",
  filter: "t:Material Player"
})

// フォルダ指定
mcp__unity-mcp-server__manage_asset_database({
  action: "find_assets",
  filter: "t:Prefab",
  searchInFolders: ["Assets/Prefabs", "Assets/Characters"]
})
```

### フィルタ構文

| フィルタ | 説明 | 例 |
|----------|------|-----|
| `t:Type` | 型で検索 | `t:Texture2D`, `t:Material`, `t:Prefab` |
| `l:Label` | ラベルで検索 | `l:UI`, `l:Environment` |
| `name` | 名前で検索 | `Player`, `Enemy*` |
| 複合 | スペースでAND | `t:Material Red` |

### アセット情報取得

```javascript
mcp__unity-mcp-server__manage_asset_database({
  action: "get_asset_info",
  assetPath: "Assets/Textures/Player.png"
})
// 戻り値: 型、サイズ、依存関係、ラベル等
```

### フォルダ操作

```javascript
// フォルダ作成
mcp__unity-mcp-server__manage_asset_database({
  action: "create_folder",
  folderPath: "Assets/NewFeature/Prefabs"
})
```

### アセット移動・コピー・削除

```javascript
// 移動
mcp__unity-mcp-server__manage_asset_database({
  action: "move_asset",
  fromPath: "Assets/Old/Player.prefab",
  toPath: "Assets/New/Player.prefab"
})

// コピー
mcp__unity-mcp-server__manage_asset_database({
  action: "copy_asset",
  fromPath: "Assets/Templates/Enemy.prefab",
  toPath: "Assets/Enemies/Enemy_01.prefab"
})

// 削除
mcp__unity-mcp-server__manage_asset_database({
  action: "delete_asset",
  assetPath: "Assets/Unused/OldPrefab.prefab"
})
```

### リフレッシュ・保存

```javascript
// アセットデータベースをリフレッシュ
mcp__unity-mcp-server__manage_asset_database({
  action: "refresh"
})

// 全アセットを保存
mcp__unity-mcp-server__manage_asset_database({
  action: "save"
})
```

## Dependency Analysis

### 依存関係取得

```javascript
// アセットの依存先を取得
mcp__unity-mcp-server__analyze_asset_dependencies({
  action: "get_dependencies",
  assetPath: "Assets/Prefabs/Player.prefab",
  recursive: true  // 間接依存も含む
})
```

### 被依存関係取得

```javascript
// このアセットを参照しているアセットを検索
mcp__unity-mcp-server__analyze_asset_dependencies({
  action: "get_dependents",
  assetPath: "Assets/Materials/PlayerMat.mat"
})
```

### 循環依存検出

```javascript
mcp__unity-mcp-server__analyze_asset_dependencies({
  action: "analyze_circular"
})
```

### 未使用アセット検出

```javascript
mcp__unity-mcp-server__analyze_asset_dependencies({
  action: "find_unused",
  includeBuiltIn: false
})
```

### サイズ影響分析

```javascript
// アセットとその依存関係の合計サイズ
mcp__unity-mcp-server__analyze_asset_dependencies({
  action: "analyze_size_impact",
  assetPath: "Assets/Prefabs/Boss.prefab"
})
```

### 参照検証

```javascript
// 壊れた参照を検出
mcp__unity-mcp-server__analyze_asset_dependencies({
  action: "validate_references"
})
```

## Addressables System

### エントリ管理

```javascript
// エントリ追加
mcp__unity-mcp-server__addressables_manage({
  action: "add_entry",
  assetPath: "Assets/Prefabs/Enemy.prefab",
  groupName: "Enemies",
  address: "enemy_basic",
  labels: ["combat", "spawn"]
})

// エントリ削除
mcp__unity-mcp-server__addressables_manage({
  action: "remove_entry",
  assetPath: "Assets/Prefabs/OldEnemy.prefab"
})

// アドレス変更
mcp__unity-mcp-server__addressables_manage({
  action: "set_address",
  assetPath: "Assets/Prefabs/Enemy.prefab",
  newAddress: "enemy_soldier"
})

// ラベル追加
mcp__unity-mcp-server__addressables_manage({
  action: "add_label",
  assetPath: "Assets/Prefabs/Enemy.prefab",
  label: "boss"
})

// ラベル削除
mcp__unity-mcp-server__addressables_manage({
  action: "remove_label",
  assetPath: "Assets/Prefabs/Enemy.prefab",
  label: "combat"
})

// エントリを別グループに移動
mcp__unity-mcp-server__addressables_manage({
  action: "move_entry",
  assetPath: "Assets/Prefabs/Enemy.prefab",
  targetGroupName: "BossEnemies"
})
```

### グループ管理

```javascript
// グループ一覧
mcp__unity-mcp-server__addressables_manage({
  action: "list_groups"
})

// グループ内のエントリ一覧
mcp__unity-mcp-server__addressables_manage({
  action: "list_entries",
  groupName: "Enemies",
  pageSize: 50,
  offset: 0
})

// グループ作成
mcp__unity-mcp-server__addressables_manage({
  action: "create_group",
  groupName: "DLC_01"
})

// グループ削除
mcp__unity-mcp-server__addressables_manage({
  action: "remove_group",
  groupName: "OldGroup"
})
```

### Addressablesビルド

```javascript
// ビルド
mcp__unity-mcp-server__addressables_build({
  action: "build",
  buildTarget: "StandaloneWindows64"
})

// クリーンビルド（キャッシュ削除後にビルド）
mcp__unity-mcp-server__addressables_build({
  action: "clean_build"
})
```

### Addressables分析

```javascript
// 重複アセット検出
mcp__unity-mcp-server__addressables_analyze({
  action: "analyze_duplicates",
  pageSize: 20
})

// 依存関係分析
mcp__unity-mcp-server__addressables_analyze({
  action: "analyze_dependencies",
  assetPath: "Assets/Prefabs/Player.prefab"
})

// 未使用アセット検出
mcp__unity-mcp-server__addressables_analyze({
  action: "analyze_unused",
  pageSize: 50
})
```

## Import Settings

### インポート設定取得

```javascript
mcp__unity-mcp-server__manage_asset_import_settings({
  action: "get",
  assetPath: "Assets/Textures/Player.png"
})
```

### テクスチャ設定

```javascript
mcp__unity-mcp-server__manage_asset_import_settings({
  action: "modify",
  assetPath: "Assets/Textures/Player.png",
  settings: {
    maxTextureSize: 1024,
    textureCompression: "Compressed",
    filterMode: "Bilinear",
    generateMipMaps: true,
    sRGBTexture: true
  }
})
```

### オーディオ設定

```javascript
mcp__unity-mcp-server__manage_asset_import_settings({
  action: "modify",
  assetPath: "Assets/Audio/BGM.mp3",
  settings: {
    loadType: "Streaming",
    compressionFormat: "Vorbis",
    quality: 0.7,
    sampleRateSetting: "PreserveSampleRate"
  }
})
```

### プリセット適用

```javascript
// 保存済みプリセットを適用
mcp__unity-mcp-server__manage_asset_import_settings({
  action: "apply_preset",
  assetPath: "Assets/Textures/UI_Icon.png",
  preset: "UISprite"
})
```

### 再インポート

```javascript
mcp__unity-mcp-server__manage_asset_import_settings({
  action: "reimport",
  assetPath: "Assets/Textures/Player.png"
})
```

## Common Workflows

### プレハブワークフロー

```javascript
// 1. シーンでGameObjectを構築
mcp__unity-mcp-server__create_gameobject({
  name: "NewEnemy",
  primitiveType: "capsule"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/NewEnemy",
  componentType: "Rigidbody"
})

// 2. プレハブ化
mcp__unity-mcp-server__create_prefab({
  prefabPath: "Assets/Prefabs/Enemies/NewEnemy.prefab",
  gameObjectPath: "/NewEnemy"
})

// 3. シーンのオリジナルを削除
mcp__unity-mcp-server__delete_gameobject({
  path: "/NewEnemy"
})

// 4. プレハブからインスタンス化
mcp__unity-mcp-server__instantiate_prefab({
  prefabPath: "Assets/Prefabs/Enemies/NewEnemy.prefab",
  position: { x: 0, y: 0, z: 0 }
})
```

### マテリアルバリエーション

```javascript
// ベースマテリアル作成
mcp__unity-mcp-server__create_material({
  materialPath: "Assets/Materials/Enemy_Base.mat",
  shader: "Standard",
  properties: {
    "_Metallic": 0.2,
    "_Glossiness": 0.5
  }
})

// バリエーション作成
const colors = [
  { name: "Red", color: [1, 0, 0, 1] },
  { name: "Blue", color: [0, 0, 1, 1] },
  { name: "Green", color: [0, 1, 0, 1] }
]

for (const variant of colors) {
  mcp__unity-mcp-server__create_material({
    materialPath: `Assets/Materials/Enemy_${variant.name}.mat`,
    copyFrom: "Assets/Materials/Enemy_Base.mat",
    properties: { "_Color": variant.color }
  })
}
```

### Addressablesセットアップ

```javascript
// 1. グループ作成
mcp__unity-mcp-server__addressables_manage({
  action: "create_group",
  groupName: "Characters"
})

// 2. アセットを追加
mcp__unity-mcp-server__addressables_manage({
  action: "add_entry",
  assetPath: "Assets/Prefabs/Player.prefab",
  groupName: "Characters",
  address: "player",
  labels: ["player", "controllable"]
})

mcp__unity-mcp-server__addressables_manage({
  action: "add_entry",
  assetPath: "Assets/Prefabs/NPC.prefab",
  groupName: "Characters",
  address: "npc_villager",
  labels: ["npc", "friendly"]
})

// 3. ビルド
mcp__unity-mcp-server__addressables_build({
  action: "build"
})

// 4. 分析
mcp__unity-mcp-server__addressables_analyze({
  action: "analyze_duplicates"
})
```

## Common Mistakes

### 1. プレハブパスの形式

```javascript
// ❌ 拡張子なし
prefabPath: "Assets/Prefabs/Player"

// ✅ .prefab拡張子必須
prefabPath: "Assets/Prefabs/Player.prefab"

// ❌ Assetsから始まらない
prefabPath: "Prefabs/Player.prefab"

// ✅ Assets/から始める
prefabPath: "Assets/Prefabs/Player.prefab"
```

### 2. マテリアルパスの形式

```javascript
// ❌ 拡張子なし
materialPath: "Assets/Materials/Red"

// ✅ .mat拡張子必須
materialPath: "Assets/Materials/Red.mat"
```

### 3. プレハブモードの終了忘れ

```javascript
// ✅ 必ずプレハブモードを終了
mcp__unity-mcp-server__open_prefab({ prefabPath: "..." })
// ... 編集 ...
mcp__unity-mcp-server__exit_prefab_mode({ saveChanges: true })
```

### 4. リフレッシュ忘れ

```javascript
// 外部でファイルを変更した後
// ✅ リフレッシュで変更を反映
mcp__unity-mcp-server__manage_asset_database({
  action: "refresh"
})
```

### 5. Addressablesグループ未作成

```javascript
// ❌ 存在しないグループにエントリ追加
mcp__unity-mcp-server__addressables_manage({
  action: "add_entry",
  groupName: "NonExistent",  // エラー
  ...
})

// ✅ 先にグループを作成
mcp__unity-mcp-server__addressables_manage({
  action: "create_group",
  groupName: "NewGroup"
})

mcp__unity-mcp-server__addressables_manage({
  action: "add_entry",
  groupName: "NewGroup",
  ...
})
```

## Tool Reference

| ツール | 用途 |
|--------|------|
| `create_prefab` | プレハブ作成 |
| `open_prefab` | プレハブモード開始 |
| `exit_prefab_mode` | プレハブモード終了 |
| `save_prefab` | プレハブ保存 |
| `instantiate_prefab` | プレハブ配置 |
| `modify_prefab` | プレハブ修正 |
| `create_material` | マテリアル作成 |
| `modify_material` | マテリアル修正 |
| `manage_asset_database` | アセットDB操作 |
| `analyze_asset_dependencies` | 依存関係分析 |
| `manage_asset_import_settings` | インポート設定 |
| `addressables_manage` | Addressables管理 |
| `addressables_build` | Addressablesビルド |
| `addressables_analyze` | Addressables分析 |
