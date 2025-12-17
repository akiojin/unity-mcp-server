---
name: unity-scene-management
description: Unityシーンとゲームオブジェクトの作成・管理・分析を支援。ヒエラルキー操作、コンポーネント設定、シーン分析を効率的に実行。使用タイミング: シーン作成、シーン読み込み、GameObject作成、コンポーネント追加、ヒエラルキー取得、シーン分析
allowed-tools: Read, Grep, Glob
---

# Unity Scene & GameObject Management

Unityシーン、ゲームオブジェクト、コンポーネントの作成・管理・分析ガイド。

## Quick Start

### 1. 現在のシーン状態を確認

```javascript
// 読み込み済みシーン一覧
mcp__unity-mcp-server__list_scenes({ includeLoadedOnly: true })

// 現在のシーン情報
mcp__unity-mcp-server__get_scene_info({ includeGameObjects: true })

// ヒエラルキー取得（軽量版）
mcp__unity-mcp-server__get_hierarchy({
  nameOnly: true,
  maxObjects: 100
})
```

### 2. GameObjectを作成

```javascript
// 空のGameObject
mcp__unity-mcp-server__create_gameobject({
  name: "GameManager"
})

// プリミティブ
mcp__unity-mcp-server__create_gameobject({
  name: "Floor",
  primitiveType: "plane",
  position: { x: 0, y: 0, z: 0 },
  scale: { x: 10, y: 1, z: 10 }
})
```

### 3. コンポーネントを追加

```javascript
// Rigidbodyを追加
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Player",
  componentType: "Rigidbody",
  properties: { mass: 1.5, useGravity: true }
})
```

## Scene Operations

### シーン作成

```javascript
// 新規シーンを作成して読み込み
mcp__unity-mcp-server__create_scene({
  sceneName: "Level01",
  path: "Assets/Scenes/",
  loadScene: true,
  addToBuildSettings: true
})
```

### シーン読み込み

```javascript
// 単一シーン読み込み（現在のシーンを置き換え）
mcp__unity-mcp-server__load_scene({
  scenePath: "Assets/Scenes/MainMenu.unity",
  loadMode: "Single"
})

// 追加読み込み（現在のシーンに追加）
mcp__unity-mcp-server__load_scene({
  scenePath: "Assets/Scenes/UI.unity",
  loadMode: "Additive"
})
```

### シーン保存

```javascript
// 現在のシーンを保存
mcp__unity-mcp-server__save_scene()

// 別名で保存
mcp__unity-mcp-server__save_scene({
  scenePath: "Assets/Scenes/Level01_backup.unity",
  saveAs: true
})
```

### シーン一覧・情報

```javascript
// プロジェクト内の全シーン
mcp__unity-mcp-server__list_scenes()

// ビルド設定に含まれるシーンのみ
mcp__unity-mcp-server__list_scenes({ includeBuildScenesOnly: true })

// 特定シーンの詳細情報
mcp__unity-mcp-server__get_scene_info({
  scenePath: "Assets/Scenes/Main.unity",
  includeGameObjects: true
})
```

## GameObject Management

### 作成オプション

```javascript
// フル指定での作成
mcp__unity-mcp-server__create_gameobject({
  name: "Enemy",
  primitiveType: "cube",
  parentPath: "/Enemies",
  position: { x: 5, y: 1, z: 0 },
  rotation: { x: 0, y: 45, z: 0 },
  scale: { x: 1, y: 2, z: 1 },
  tag: "Enemy",
  layer: 8
})
```

### プリミティブタイプ

| タイプ | 説明 |
|--------|------|
| `cube` | 立方体 |
| `sphere` | 球体 |
| `cylinder` | 円柱 |
| `capsule` | カプセル |
| `plane` | 平面 |
| `quad` | クアッド（2D平面） |

### 検索

```javascript
// 名前で検索
mcp__unity-mcp-server__find_gameobject({
  name: "Player",
  exactMatch: true
})

// タグで検索
mcp__unity-mcp-server__find_gameobject({
  tag: "Enemy"
})

// レイヤーで検索
mcp__unity-mcp-server__find_gameobject({
  layer: 8  // 0-31
})

// 部分一致検索
mcp__unity-mcp-server__find_gameobject({
  name: "Spawn",
  exactMatch: false
})
```

### 修正

```javascript
// Transform変更
mcp__unity-mcp-server__modify_gameobject({
  path: "/Player",
  position: { x: 0, y: 1, z: 0 },
  rotation: { x: 0, y: 90, z: 0 }
})

// 名前・タグ・レイヤー変更
mcp__unity-mcp-server__modify_gameobject({
  path: "/OldName",
  name: "NewName",
  tag: "Player",
  layer: 3
})

// 親オブジェクト変更
mcp__unity-mcp-server__modify_gameobject({
  path: "/Player",
  parentPath: "/Characters"
})

// 親から外す
mcp__unity-mcp-server__modify_gameobject({
  path: "/Characters/Player",
  parentPath: null
})

// アクティブ状態変更
mcp__unity-mcp-server__modify_gameobject({
  path: "/Player",
  active: false
})
```

### 削除

```javascript
// 単一削除
mcp__unity-mcp-server__delete_gameobject({
  path: "/OldObject"
})

// 複数削除
mcp__unity-mcp-server__delete_gameobject({
  paths: ["/Object1", "/Object2", "/Object3"]
})

// 子オブジェクトを残す
mcp__unity-mcp-server__delete_gameobject({
  path: "/Parent",
  includeChildren: false
})
```

### ヒエラルキー取得

```javascript
// 軽量版（名前とパスのみ）- 大規模シーン向け
mcp__unity-mcp-server__get_hierarchy({
  nameOnly: true,
  maxObjects: 500
})

// 詳細版（コンポーネント・Transform含む）- 小規模向け
mcp__unity-mcp-server__get_hierarchy({
  includeComponents: true,
  includeTransform: true,
  maxObjects: 50
})

// 特定オブジェクト配下のみ
mcp__unity-mcp-server__get_hierarchy({
  rootPath: "/Enemies",
  maxDepth: 2
})

// 非アクティブオブジェクトを除外
mcp__unity-mcp-server__get_hierarchy({
  includeInactive: false
})
```

## Component System

### コンポーネント追加

```javascript
// 基本追加
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Player",
  componentType: "Rigidbody"
})

// プロパティ付き
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Player",
  componentType: "BoxCollider",
  properties: {
    size: { x: 1, y: 2, z: 1 },
    center: { x: 0, y: 1, z: 0 },
    isTrigger: false
  }
})

// カスタムスクリプト
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Player",
  componentType: "PlayerController"
})
```

### コンポーネント修正

#### `modify_component` - 複数プロパティを一括変更

```javascript
mcp__unity-mcp-server__modify_component({
  gameObjectPath: "/Player",
  componentType: "Rigidbody",
  properties: {
    mass: 2.0,
    drag: 0.5,
    useGravity: true
  }
})
```

#### `set_component_field` - 単一フィールドを精密に変更

```javascript
// シリアライズドフィールド（プライベートも可）
mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Player",
  componentType: "PlayerController",
  fieldPath: "_moveSpeed",
  value: 5.0
})

// ネストしたフィールド
mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Player",
  componentType: "PlayerController",
  fieldPath: "settings.jumpHeight",
  value: 3.0
})

// 配列要素
mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Player",
  componentType: "Inventory",
  fieldPath: "items[0].count",
  value: 10
})

// オブジェクト参照
mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Player",
  componentType: "PlayerController",
  fieldPath: "targetTransform",
  objectReference: { assetPath: "Assets/Prefabs/Target.prefab" }
})

// Enum値
mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Player",
  componentType: "PlayerController",
  fieldPath: "state",
  enumValue: "Running"
})
```

### `modify_component` vs `set_component_field`

| 項目 | modify_component | set_component_field |
|------|------------------|---------------------|
| 用途 | 複数プロパティ一括 | 単一フィールド精密 |
| ネスト対応 | ❌ トップレベルのみ | ✅ ドット記法対応 |
| 配列要素 | ❌ | ✅ `[index]`対応 |
| プライベート | △ シリアライズ時のみ | ✅ シリアライズ全対応 |
| オブジェクト参照 | △ | ✅ assetPath/guid対応 |

### コンポーネント一覧・削除

```javascript
// コンポーネント一覧
mcp__unity-mcp-server__list_components({
  gameObjectPath: "/Player"
})

// コンポーネント削除
mcp__unity-mcp-server__remove_component({
  gameObjectPath: "/Player",
  componentType: "OldScript"
})

// 同じ型が複数ある場合
mcp__unity-mcp-server__remove_component({
  gameObjectPath: "/Player",
  componentType: "AudioSource",
  componentIndex: 1  // 2番目のAudioSource
})
```

### 利用可能なコンポーネント型

```javascript
// カテゴリで検索
mcp__unity-mcp-server__get_component_types({
  category: "Physics"  // Physics, Rendering, UI, etc.
})

// 名前で検索
mcp__unity-mcp-server__get_component_types({
  search: "Collider"
})

// AddComponentで追加可能なもののみ
mcp__unity-mcp-server__get_component_types({
  onlyAddable: true
})
```

## Scene Analysis

### シーン全体分析

```javascript
// オブジェクト統計
mcp__unity-mcp-server__analyze_scene_contents({
  groupByType: true,
  includePrefabInfo: true
})

// メモリ情報付き
mcp__unity-mcp-server__analyze_scene_contents({
  includeMemoryInfo: true
})
```

### コンポーネント検索

```javascript
// 特定コンポーネントを持つオブジェクトを検索
mcp__unity-mcp-server__find_by_component({
  componentType: "Light",
  searchScope: "scene"
})

// プレハブも含めて検索
mcp__unity-mcp-server__find_by_component({
  componentType: "AudioSource",
  searchScope: "all",
  includeInactive: true
})
```

### 詳細インスペクション

```javascript
// GameObject詳細
mcp__unity-mcp-server__get_gameobject_details({
  gameObjectName: "Player",
  includeComponents: true,
  includeMaterials: true,
  includeChildren: true,
  maxDepth: 3
})

// コンポーネントの全プロパティ値
mcp__unity-mcp-server__get_component_values({
  gameObjectName: "Player",
  componentType: "Rigidbody",
  includePrivateFields: true
})

// オブジェクト参照関係
mcp__unity-mcp-server__get_object_references({
  gameObjectName: "Player",
  includeAssetReferences: true,
  includeHierarchyReferences: true
})
```

## Common Workflows

### シーンセットアップ

```javascript
// 1. 新規シーン作成
mcp__unity-mcp-server__create_scene({
  sceneName: "GameLevel",
  loadScene: true
})

// 2. 環境オブジェクト作成
mcp__unity-mcp-server__create_gameobject({
  name: "Environment"
})

mcp__unity-mcp-server__create_gameobject({
  name: "Ground",
  primitiveType: "plane",
  parentPath: "/Environment",
  scale: { x: 50, y: 1, z: 50 }
})

// 3. ライティング設定
mcp__unity-mcp-server__create_gameobject({
  name: "Sun"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Sun",
  componentType: "Light",
  properties: {
    type: "Directional",
    intensity: 1.0,
    color: { r: 1, g: 0.95, b: 0.8, a: 1 }
  }
})

// 4. 保存
mcp__unity-mcp-server__save_scene()
```

### UIキャンバス構築

```javascript
// Canvas作成
mcp__unity-mcp-server__create_gameobject({ name: "Canvas" })
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas",
  componentType: "Canvas",
  properties: { renderMode: "ScreenSpaceOverlay" }
})
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas",
  componentType: "CanvasScaler"
})
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas",
  componentType: "GraphicRaycaster"
})

// ボタン追加
mcp__unity-mcp-server__create_gameobject({
  name: "StartButton",
  parentPath: "/Canvas"
})
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas/StartButton",
  componentType: "Button"
})
```

### 物理オブジェクト配置

```javascript
// 物理オブジェクト作成
mcp__unity-mcp-server__create_gameobject({
  name: "PhysicsCube",
  primitiveType: "cube",
  position: { x: 0, y: 5, z: 0 }
})

// Rigidbody追加
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/PhysicsCube",
  componentType: "Rigidbody",
  properties: { mass: 1.0 }
})

// Colliderは自動追加済み（プリミティブの場合）
```

## Common Mistakes

### 1. パス形式の誤り

```javascript
// ❌ スラッシュなし
gameObjectPath: "Player"

// ✅ 先頭スラッシュ必須
gameObjectPath: "/Player"

// ✅ 階層パス
gameObjectPath: "/Parent/Child/GrandChild"
```

### 2. タグ・レイヤーの未定義

```javascript
// ❌ 存在しないタグを使用
tag: "CustomEnemy"  // エラー

// ✅ 事前にタグを追加
mcp__unity-mcp-server__manage_tags({
  action: "add",
  tagName: "CustomEnemy"
})
```

### 3. 非アクティブオブジェクトの見落とし

```javascript
// ❌ 非アクティブが見つからない
mcp__unity-mcp-server__find_gameobject({ name: "HiddenObject" })

// ✅ includeInactiveを明示
mcp__unity-mcp-server__get_hierarchy({
  includeInactive: true
})
```

### 4. 大規模ヒエラルキーでのパフォーマンス問題

```javascript
// ❌ 全情報を取得（トークン消費大）
mcp__unity-mcp-server__get_hierarchy({
  includeComponents: true,
  includeTransform: true,
  maxObjects: -1  // 無制限
})

// ✅ 軽量版で概要把握
mcp__unity-mcp-server__get_hierarchy({
  nameOnly: true,
  maxObjects: 100
})

// ✅ 必要な部分のみ詳細取得
mcp__unity-mcp-server__get_gameobject_details({
  gameObjectName: "SpecificObject",
  includeComponents: true
})
```

### 5. シーン未保存での変更消失

```javascript
// ✅ 重要な変更後は保存
mcp__unity-mcp-server__save_scene()
```

## Tool Reference

| ツール | 用途 |
|--------|------|
| `create_scene` | シーン作成 |
| `load_scene` | シーン読み込み |
| `save_scene` | シーン保存 |
| `list_scenes` | シーン一覧 |
| `get_scene_info` | シーン情報取得 |
| `create_gameobject` | GameObject作成 |
| `find_gameobject` | GameObject検索 |
| `modify_gameobject` | GameObject修正 |
| `delete_gameobject` | GameObject削除 |
| `get_hierarchy` | ヒエラルキー取得 |
| `add_component` | コンポーネント追加 |
| `modify_component` | コンポーネント修正（一括） |
| `set_component_field` | フィールド修正（精密） |
| `remove_component` | コンポーネント削除 |
| `list_components` | コンポーネント一覧 |
| `get_component_types` | 利用可能な型一覧 |
| `analyze_scene_contents` | シーン分析 |
| `find_by_component` | コンポーネント検索 |
| `get_gameobject_details` | 詳細情報取得 |
| `get_component_values` | プロパティ値取得 |
| `manage_tags` | タグ管理 |
| `manage_layers` | レイヤー管理 |
