---
name: unity-game-ugui-design
description: UnityのuGUI（Canvas/RectTransform/Anchors）を使用したゲームUIデザイン。HUD、ヘルスバー、インベントリ、スキルバー等のゲームUI要素、モバイルレスポンシブ対応、Safe Area対応を含む。使用タイミング: ゲームUI設計、HUD作成、Canvas設定、モバイルUI、Anchors設定
allowed-tools:
  - mcp__unity-mcp-server__find_ui_elements
  - mcp__unity-mcp-server__click_ui_element
  - mcp__unity-mcp-server__get_ui_element_state
  - mcp__unity-mcp-server__set_ui_element_value
  - mcp__unity-mcp-server__simulate_ui_input
  - mcp__unity-mcp-server__add_component
  - mcp__unity-mcp-server__modify_component
  - mcp__unity-mcp-server__set_component_field
  - mcp__unity-mcp-server__list_components
  - mcp__unity-mcp-server__get_component_types
  - mcp__unity-mcp-server__create_gameobject
  - mcp__unity-mcp-server__modify_gameobject
  - mcp__unity-mcp-server__find_gameobject
  - mcp__unity-mcp-server__get_hierarchy
  - mcp__unity-mcp-server__edit_script_structured
  - mcp__unity-mcp-server__create_script_class
  - mcp__unity-mcp-server__read_script
  - mcp__unity-mcp-server__get_script_symbols
---

# Unity Game uGUI Design Skill

UnityのuGUI（Unity GUI）システムを使用したゲームUIデザインのスキルです。HUD、ヘルスバー、インベントリ、ダイアログ等のゲームUI要素の実装パターン、モバイルレスポンシブ対応、Safe Area対応を含む包括的なゲームUIデザインガイドを提供します。

## Quick Start

### 基本的なCanvas構成

```javascript
// 1. Canvasを作成
mcp__unity-mcp-server__create_gameobject({
  name: "Canvas"
})

// 2. Canvasコンポーネントを追加
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas",
  componentType: "Canvas",
  properties: {
    renderMode: 0  // ScreenSpaceOverlay
  }
})

// 3. CanvasScalerを追加（レスポンシブ対応）
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas",
  componentType: "CanvasScaler",
  properties: {
    uiScaleMode: 1,  // ScaleWithScreenSize
    referenceResolution: { x: 1080, y: 1920 },  // 基準解像度
    screenMatchMode: 0,  // MatchWidthOrHeight
    matchWidthOrHeight: 0  // 0=縦向き優先, 1=横向き優先
  }
})

// 4. GraphicRaycasterを追加（インタラクション用）
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas",
  componentType: "GraphicRaycaster"
})
```

## Game UI Types（ゲームUI分類）

ゲームUIは配置・表現方法によって4種類に分類されます。

### 1. Diegetic UI（ダイエジェティック）

ゲーム世界内に存在するUI。キャラクターも認識できる。

- **例**: 敵頭上のHPバー、車のダッシュボード、ゲーム内の看板
- **Canvas設定**: World Space
- **特徴**: 没入感が高い、3D空間での表示

```javascript
// ワールドスペースCanvas（敵頭上HPバー）
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Enemy/HealthCanvas",
  componentType: "Canvas",
  properties: { renderMode: 2 }  // WorldSpace
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Enemy/HealthCanvas",
  componentType: "RectTransform",
  fieldPath: "sizeDelta",
  value: { x: 100, y: 20 }
})
```

### 2. Non-Diegetic UI（ノンダイエジェティック）

プレイヤーだけが見えるオーバーレイUI。

- **例**: HUD、スコア表示、ミニマップ、スキルバー
- **Canvas設定**: Screen Space - Overlay
- **特徴**: 常に最前面、画面固定

```javascript
// HUD用オーバーレイCanvas
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/HUDCanvas",
  componentType: "Canvas",
  properties: { renderMode: 0 }  // ScreenSpaceOverlay
})
```

### 3. Spatial UI（スペーシャル）

3D空間に存在するが、ゲーム世界の一部ではないUI。

- **例**: 目的地マーカー、インタラクトアイコン、クエストマーカー
- **Canvas設定**: Screen Space - Camera または World Space
- **特徴**: ビルボード（常にカメラを向く）

```javascript
// ビルボードマーカー
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/QuestMarker/Canvas",
  componentType: "Canvas",
  properties: { renderMode: 2 }  // WorldSpace
})

// ビルボードスクリプト追加
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/QuestMarker/Canvas",
  componentType: "BillboardUI"
})
```

### 4. Meta UI（メタ）

画面全体を使った演出系UI。

- **例**: 被ダメージ時の画面赤フラッシュ、スタミナ切れビネット、ステータス異常エフェクト
- **Canvas設定**: Screen Space - Overlay（最前面ソート順）
- **特徴**: 全画面、透明度アニメーション

```javascript
// 被ダメージフラッシュ用Canvas
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/EffectCanvas",
  componentType: "Canvas",
  properties: {
    renderMode: 0,
    sortingOrder: 100  // 最前面
  }
})

// フラッシュImage（全画面）
mcp__unity-mcp-server__create_gameobject({
  name: "DamageFlash",
  parentPath: "/EffectCanvas"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/EffectCanvas/DamageFlash",
  componentType: "Image",
  properties: {
    color: { r: 1, g: 0, b: 0, a: 0 }  // 透明な赤
  }
})
```

---

## HUD Screen Layout（HUD画面配置）

ゲームHUDには業界標準の配置規則があります。

### 標準配置図

```
┌─────────────────────────────────────────────────────┐
│  [HP/MP Bar]              [Mini Map] [Settings]     │  ← 上部
│  ★ 左上: HP/MP/スタミナ    右上: ミニマップ、設定    │
│                                                     │
│                                                     │
│  [Quest]                               [Buff Icons] │  ← 中上部
│  ★ クエスト目標            バフ/デバフアイコン       │
│                                                     │
│                      [中央]                         │
│                   照準/インタラクト                  │
│                                                     │
│  [Chat]                              [Inventory]    │  ← 中下部
│                                                     │
│                                                     │
│          [Skill Bar]    [Action Buttons]            │  ← 下部
│          ★ スキル/アイテム  アクションボタン         │
└─────────────────────────────────────────────────────┘
```

### 配置原則

| 位置 | アンカー | 配置するUI | 理由 |
|------|---------|-----------|------|
| 左上 | (0,1) | HP/MP/スタミナ | 最重要情報、視線移動最小 |
| 右上 | (1,1) | ミニマップ、設定 | 補助情報、邪魔にならない |
| 左下 | (0,0) | チャット、ログ | 頻繁に見ない情報 |
| 右下 | (1,0) | インベントリ、ボタン | 右手操作しやすい |
| 下部中央 | (0.5,0) | スキルバー | 両手アクセス、重要度高 |
| 中央 | (0.5,0.5) | 照準、インタラクト | 視線の中心 |

### uGUI実装例

```javascript
// HP バー（左上配置）
mcp__unity-mcp-server__create_gameobject({
  name: "HPBar",
  parentPath: "/HUDCanvas/SafeArea"
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/HPBar",
  componentType: "RectTransform",
  fieldPath: "anchorMin",
  value: { x: 0, y: 1 }
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/HPBar",
  componentType: "RectTransform",
  fieldPath: "anchorMax",
  value: { x: 0, y: 1 }
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/HPBar",
  componentType: "RectTransform",
  fieldPath: "pivot",
  value: { x: 0, y: 1 }
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/HPBar",
  componentType: "RectTransform",
  fieldPath: "anchoredPosition",
  value: { x: 20, y: -20 }  // 左上から20pxマージン
})

// ミニマップ（右上配置）
mcp__unity-mcp-server__create_gameobject({
  name: "Minimap",
  parentPath: "/HUDCanvas/SafeArea"
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/Minimap",
  componentType: "RectTransform",
  fieldPath: "anchorMin",
  value: { x: 1, y: 1 }
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/Minimap",
  componentType: "RectTransform",
  fieldPath: "anchorMax",
  value: { x: 1, y: 1 }
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/Minimap",
  componentType: "RectTransform",
  fieldPath: "pivot",
  value: { x: 1, y: 1 }
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/Minimap",
  componentType: "RectTransform",
  fieldPath: "anchoredPosition",
  value: { x: -20, y: -20 }  // 右上から20pxマージン
})

// スキルバー（下部中央配置）
mcp__unity-mcp-server__create_gameobject({
  name: "SkillBar",
  parentPath: "/HUDCanvas/SafeArea"
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/SkillBar",
  componentType: "RectTransform",
  fieldPath: "anchorMin",
  value: { x: 0.5, y: 0 }
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/SkillBar",
  componentType: "RectTransform",
  fieldPath: "anchorMax",
  value: { x: 0.5, y: 0 }
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/SkillBar",
  componentType: "RectTransform",
  fieldPath: "pivot",
  value: { x: 0.5, y: 0 }
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/SkillBar",
  componentType: "RectTransform",
  fieldPath: "anchoredPosition",
  value: { x: 0, y: 20 }  // 下端から20pxマージン
})
```

---

## Game UI Elements（ゲームUI要素）

### 1. ヘルスバー / リソースバー

遅延ダメージ表示（ダメージを受けると赤ゲージが徐々に減少）を実装。

#### Prefab構造

```
HealthBar (RectTransform)
├── Background (Image) - 背景
├── DelayedFill (Image) - 遅延ゲージ（赤）
├── Fill (Image) - 現在値ゲージ（緑）
└── Text (TextMeshProUGUI) - "100/100"
```

#### MCP実装

```javascript
// ヘルスバー作成
mcp__unity-mcp-server__create_gameobject({
  name: "HealthBar",
  parentPath: "/HUDCanvas/SafeArea"
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/HealthBar",
  componentType: "RectTransform",
  fieldPath: "sizeDelta",
  value: { x: 200, y: 24 }
})

// 背景
mcp__unity-mcp-server__create_gameobject({
  name: "Background",
  parentPath: "/HUDCanvas/SafeArea/HealthBar"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/HUDCanvas/SafeArea/HealthBar/Background",
  componentType: "Image",
  properties: {
    color: { r: 0.1, g: 0.1, b: 0.1, a: 0.8 }
  }
})

// 遅延ゲージ（Filled Image）
mcp__unity-mcp-server__create_gameobject({
  name: "DelayedFill",
  parentPath: "/HUDCanvas/SafeArea/HealthBar"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/HUDCanvas/SafeArea/HealthBar/DelayedFill",
  componentType: "Image",
  properties: {
    color: { r: 0.8, g: 0.2, b: 0.2, a: 1 },
    type: 3,  // Filled
    fillMethod: 0,  // Horizontal
    fillAmount: 1.0
  }
})

// 現在値ゲージ
mcp__unity-mcp-server__create_gameobject({
  name: "Fill",
  parentPath: "/HUDCanvas/SafeArea/HealthBar"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/HUDCanvas/SafeArea/HealthBar/Fill",
  componentType: "Image",
  properties: {
    color: { r: 0.2, g: 0.8, b: 0.2, a: 1 },
    type: 3,  // Filled
    fillMethod: 0,  // Horizontal
    fillAmount: 1.0
  }
})

// テキスト
mcp__unity-mcp-server__create_gameobject({
  name: "Text",
  parentPath: "/HUDCanvas/SafeArea/HealthBar"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/HUDCanvas/SafeArea/HealthBar/Text",
  componentType: "TextMeshProUGUI",
  properties: {
    text: "100/100",
    fontSize: 14,
    alignment: 514  // Center
  }
})
```

#### C#コントローラー

```csharp
// HealthBarController.cs
using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class HealthBarController : MonoBehaviour
{
    [SerializeField] private Image fillImage;
    [SerializeField] private Image delayedFillImage;
    [SerializeField] private TextMeshProUGUI text;

    [SerializeField] private float delayedFillSpeed = 0.5f;

    private float currentHealth = 100f;
    private float maxHealth = 100f;
    private float delayedHealth = 100f;

    public void SetHealth(float health, float max)
    {
        currentHealth = Mathf.Clamp(health, 0, max);
        maxHealth = max;

        float ratio = currentHealth / maxHealth;
        fillImage.fillAmount = ratio;
        text.text = $"{(int)currentHealth}/{(int)maxHealth}";

        // ダメージを受けた場合、遅延ゲージはそのまま
        // 回復の場合は即座に更新
        if (delayedHealth < currentHealth)
        {
            delayedHealth = currentHealth;
            delayedFillImage.fillAmount = ratio;
        }
    }

    void Update()
    {
        // 遅延ゲージを徐々に減少
        if (delayedHealth > currentHealth)
        {
            delayedHealth = Mathf.MoveTowards(
                delayedHealth,
                currentHealth,
                maxHealth * delayedFillSpeed * Time.deltaTime
            );
            delayedFillImage.fillAmount = delayedHealth / maxHealth;
        }
    }
}
```

---

### 2. スキルクールダウン

クールダウン中は暗転＋回転マスクで残り時間を表示。

#### Prefab構造

```
SkillSlot (RectTransform)
├── Icon (Image) - スキルアイコン
├── CooldownOverlay (Image) - 暗転オーバーレイ（Radial Fill）
├── CooldownText (TextMeshProUGUI) - 残り秒数
└── KeyHint (TextMeshProUGUI) - "Q"
```

#### MCP実装

```javascript
// スキルスロット作成
mcp__unity-mcp-server__create_gameobject({
  name: "SkillSlot",
  parentPath: "/HUDCanvas/SafeArea/SkillBar"
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/SkillBar/SkillSlot",
  componentType: "RectTransform",
  fieldPath: "sizeDelta",
  value: { x: 64, y: 64 }
})

// アイコン
mcp__unity-mcp-server__create_gameobject({
  name: "Icon",
  parentPath: "/HUDCanvas/SafeArea/SkillBar/SkillSlot"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/HUDCanvas/SafeArea/SkillBar/SkillSlot/Icon",
  componentType: "Image"
})

// クールダウンオーバーレイ（Radial Fill）
mcp__unity-mcp-server__create_gameobject({
  name: "CooldownOverlay",
  parentPath: "/HUDCanvas/SafeArea/SkillBar/SkillSlot"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/HUDCanvas/SafeArea/SkillBar/SkillSlot/CooldownOverlay",
  componentType: "Image",
  properties: {
    color: { r: 0, g: 0, b: 0, a: 0.7 },
    type: 3,  // Filled
    fillMethod: 4,  // Radial360
    fillOrigin: 2,  // Top
    fillClockwise: false,
    fillAmount: 0
  }
})

// クールダウンテキスト
mcp__unity-mcp-server__create_gameobject({
  name: "CooldownText",
  parentPath: "/HUDCanvas/SafeArea/SkillBar/SkillSlot"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/HUDCanvas/SafeArea/SkillBar/SkillSlot/CooldownText",
  componentType: "TextMeshProUGUI",
  properties: {
    text: "",
    fontSize: 20,
    alignment: 514,  // Center
    fontStyle: 1  // Bold
  }
})

// キーヒント
mcp__unity-mcp-server__create_gameobject({
  name: "KeyHint",
  parentPath: "/HUDCanvas/SafeArea/SkillBar/SkillSlot"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/HUDCanvas/SafeArea/SkillBar/SkillSlot/KeyHint",
  componentType: "TextMeshProUGUI",
  properties: {
    text: "Q",
    fontSize: 12,
    alignment: 257  // BottomLeft
  }
})
```

#### C#コントローラー

```csharp
// SkillSlotController.cs
using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class SkillSlotController : MonoBehaviour
{
    [SerializeField] private Image icon;
    [SerializeField] private Image cooldownOverlay;
    [SerializeField] private TextMeshProUGUI cooldownText;

    private float cooldownDuration;
    private float cooldownRemaining;

    public void SetIcon(Sprite sprite)
    {
        icon.sprite = sprite;
    }

    public void StartCooldown(float duration)
    {
        cooldownDuration = duration;
        cooldownRemaining = duration;
    }

    public bool IsOnCooldown => cooldownRemaining > 0;

    void Update()
    {
        if (cooldownRemaining > 0)
        {
            cooldownRemaining -= Time.deltaTime;

            float ratio = cooldownRemaining / cooldownDuration;
            cooldownOverlay.fillAmount = ratio;

            if (cooldownRemaining > 1)
                cooldownText.text = Mathf.CeilToInt(cooldownRemaining).ToString();
            else if (cooldownRemaining > 0)
                cooldownText.text = cooldownRemaining.ToString("F1");
            else
            {
                cooldownText.text = "";
                cooldownOverlay.fillAmount = 0;
            }
        }
    }
}
```

---

### 3. インベントリグリッド

レアリティによる枠色、スタック数表示、ドラッグ&ドロップ対応。

#### Prefab構造

```
InventoryGrid (RectTransform + GridLayoutGroup)
└── ItemSlot (複数)
    ├── Background (Image) - レアリティ枠
    ├── Icon (Image) - アイテムアイコン
    ├── StackCount (TextMeshProUGUI) - "x99"
    └── SelectionHighlight (Image) - 選択時ハイライト
```

#### MCP実装

```javascript
// インベントリグリッド作成
mcp__unity-mcp-server__create_gameobject({
  name: "InventoryGrid",
  parentPath: "/InventoryCanvas/Panel"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/InventoryCanvas/Panel/InventoryGrid",
  componentType: "GridLayoutGroup",
  properties: {
    cellSize: { x: 64, y: 64 },
    spacing: { x: 4, y: 4 },
    startCorner: 0,  // UpperLeft
    startAxis: 0,    // Horizontal
    childAlignment: 0,  // UpperLeft
    constraint: 1,  // FixedColumnCount
    constraintCount: 6  // 6列
  }
})

// アイテムスロット作成
mcp__unity-mcp-server__create_gameobject({
  name: "ItemSlot",
  parentPath: "/InventoryCanvas/Panel/InventoryGrid"
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/InventoryCanvas/Panel/InventoryGrid/ItemSlot",
  componentType: "RectTransform",
  fieldPath: "sizeDelta",
  value: { x: 64, y: 64 }
})

// 背景（レアリティ枠）
mcp__unity-mcp-server__create_gameobject({
  name: "Background",
  parentPath: "/InventoryCanvas/Panel/InventoryGrid/ItemSlot"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/InventoryCanvas/Panel/InventoryGrid/ItemSlot/Background",
  componentType: "Image",
  properties: {
    color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }  // デフォルト（コモン）
  }
})

// アイコン
mcp__unity-mcp-server__create_gameobject({
  name: "Icon",
  parentPath: "/InventoryCanvas/Panel/InventoryGrid/ItemSlot"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/InventoryCanvas/Panel/InventoryGrid/ItemSlot/Icon",
  componentType: "Image"
})

// スタック数
mcp__unity-mcp-server__create_gameobject({
  name: "StackCount",
  parentPath: "/InventoryCanvas/Panel/InventoryGrid/ItemSlot"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/InventoryCanvas/Panel/InventoryGrid/ItemSlot/StackCount",
  componentType: "TextMeshProUGUI",
  properties: {
    text: "",
    fontSize: 12,
    alignment: 260  // BottomRight
  }
})

// 選択ハイライト
mcp__unity-mcp-server__create_gameobject({
  name: "SelectionHighlight",
  parentPath: "/InventoryCanvas/Panel/InventoryGrid/ItemSlot"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/InventoryCanvas/Panel/InventoryGrid/ItemSlot/SelectionHighlight",
  componentType: "Image",
  properties: {
    color: { r: 1, g: 1, b: 1, a: 0.3 },
    raycastTarget: false
  }
})
```

#### レアリティカラー定義

```csharp
// ItemRarity.cs
using UnityEngine;

public enum ItemRarity
{
    Common,    // 灰色
    Uncommon,  // 緑
    Rare,      // 青
    Epic,      // 紫
    Legendary  // オレンジ
}

public static class RarityColors
{
    public static Color GetColor(ItemRarity rarity) => rarity switch
    {
        ItemRarity.Common => new Color(0.6f, 0.6f, 0.6f),
        ItemRarity.Uncommon => new Color(0.2f, 0.8f, 0.2f),
        ItemRarity.Rare => new Color(0.2f, 0.4f, 0.9f),
        ItemRarity.Epic => new Color(0.6f, 0.2f, 0.9f),
        ItemRarity.Legendary => new Color(1.0f, 0.5f, 0.0f),
        _ => Color.white
    };
}
```

---

### 4. ダメージ数値（Floating Text）

ダメージを受けた位置から数値が浮き上がって消えるエフェクト。

#### Prefab構造

```
DamageNumber (RectTransform)
└── Text (TextMeshProUGUI) - ダメージ数値
```

#### MCP実装

```javascript
// ダメージ数値Prefab作成
mcp__unity-mcp-server__create_gameobject({
  name: "DamageNumber",
  parentPath: "/WorldCanvas"
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/WorldCanvas/DamageNumber",
  componentType: "RectTransform",
  fieldPath: "sizeDelta",
  value: { x: 100, y: 40 }
})

// テキスト
mcp__unity-mcp-server__create_gameobject({
  name: "Text",
  parentPath: "/WorldCanvas/DamageNumber"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/WorldCanvas/DamageNumber/Text",
  componentType: "TextMeshProUGUI",
  properties: {
    text: "999",
    fontSize: 24,
    alignment: 514,  // Center
    fontStyle: 1,    // Bold
    color: { r: 1, g: 0.2, b: 0.2, a: 1 }
  }
})
```

#### C#コントローラー（アニメーション付き）

```csharp
// DamageNumberController.cs
using UnityEngine;
using TMPro;

public class DamageNumberController : MonoBehaviour
{
    [SerializeField] private TextMeshProUGUI text;
    [SerializeField] private float floatSpeed = 50f;
    [SerializeField] private float fadeSpeed = 2f;
    [SerializeField] private float lifetime = 1.5f;

    private float elapsed;
    private Color originalColor;
    private Vector3 randomOffset;

    public void Setup(int damage, bool isCritical = false)
    {
        text.text = damage.ToString();

        if (isCritical)
        {
            text.fontSize *= 1.5f;
            text.color = new Color(1f, 0.8f, 0f);  // 黄色
        }

        originalColor = text.color;
        randomOffset = new Vector3(Random.Range(-20f, 20f), 0, 0);
    }

    void Update()
    {
        elapsed += Time.deltaTime;

        // 上に浮く
        transform.localPosition += (Vector3.up * floatSpeed + randomOffset) * Time.deltaTime;
        randomOffset *= 0.95f;  // 横移動を減衰

        // フェードアウト
        if (elapsed > lifetime * 0.5f)
        {
            float alpha = Mathf.Lerp(originalColor.a, 0,
                (elapsed - lifetime * 0.5f) / (lifetime * 0.5f));
            text.color = new Color(originalColor.r, originalColor.g, originalColor.b, alpha);
        }

        if (elapsed >= lifetime)
        {
            Destroy(gameObject);
        }
    }
}
```

---

### 5. ミニマップ

RawImageとRenderTextureを使用した俯瞰ミニマップ。

#### 構造

```
MinimapContainer (RectTransform)
├── MapImage (RawImage + Mask) - マップ表示
├── PlayerIcon (Image) - プレイヤーアイコン
├── Border (Image) - 枠
└── CompassText (TextMeshProUGUI) - "N"
```

#### MCP実装

```javascript
// ミニマップコンテナ
mcp__unity-mcp-server__create_gameobject({
  name: "MinimapContainer",
  parentPath: "/HUDCanvas/SafeArea"
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/MinimapContainer",
  componentType: "RectTransform",
  fieldPath: "sizeDelta",
  value: { x: 150, y: 150 }
})

// マップ表示（RawImage）
mcp__unity-mcp-server__create_gameobject({
  name: "MapImage",
  parentPath: "/HUDCanvas/SafeArea/MinimapContainer"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/HUDCanvas/SafeArea/MinimapContainer/MapImage",
  componentType: "RawImage"
})

// 円形マスク用
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/HUDCanvas/SafeArea/MinimapContainer/MapImage",
  componentType: "Mask",
  properties: {
    showMaskGraphic: false
  }
})

// プレイヤーアイコン（中央固定）
mcp__unity-mcp-server__create_gameobject({
  name: "PlayerIcon",
  parentPath: "/HUDCanvas/SafeArea/MinimapContainer"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/HUDCanvas/SafeArea/MinimapContainer/PlayerIcon",
  componentType: "Image"
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/HUDCanvas/SafeArea/MinimapContainer/PlayerIcon",
  componentType: "RectTransform",
  fieldPath: "sizeDelta",
  value: { x: 16, y: 16 }
})

// 枠
mcp__unity-mcp-server__create_gameobject({
  name: "Border",
  parentPath: "/HUDCanvas/SafeArea/MinimapContainer"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/HUDCanvas/SafeArea/MinimapContainer/Border",
  componentType: "Image",
  properties: {
    raycastTarget: false
  }
})
```

---

### 6. ダイアログシステム

RPG風の会話ウィンドウ。話者名、テキスト、選択肢を表示。

#### Prefab構造

```
DialogPanel (RectTransform + CanvasGroup)
├── SpeakerName (TextMeshProUGUI)
├── Portrait (Image) - 話者の顔アイコン
├── DialogText (TextMeshProUGUI) - 会話テキスト
├── ChoicesContainer (VerticalLayoutGroup)
│   └── ChoiceButton (Button + TextMeshProUGUI)
└── ContinueIndicator (Image) - 次へ矢印
```

#### MCP実装

```javascript
// ダイアログパネル
mcp__unity-mcp-server__create_gameobject({
  name: "DialogPanel",
  parentPath: "/DialogCanvas"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/DialogCanvas/DialogPanel",
  componentType: "Image",
  properties: {
    color: { r: 0, g: 0, b: 0, a: 0.85 }
  }
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/DialogCanvas/DialogPanel",
  componentType: "CanvasGroup"
})

// 下部ストレッチ配置
mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/DialogCanvas/DialogPanel",
  componentType: "RectTransform",
  fieldPath: "anchorMin",
  value: { x: 0, y: 0 }
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/DialogCanvas/DialogPanel",
  componentType: "RectTransform",
  fieldPath: "anchorMax",
  value: { x: 1, y: 0.3 }
})

// 話者名
mcp__unity-mcp-server__create_gameobject({
  name: "SpeakerName",
  parentPath: "/DialogCanvas/DialogPanel"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/DialogCanvas/DialogPanel/SpeakerName",
  componentType: "TextMeshProUGUI",
  properties: {
    text: "村人A",
    fontSize: 20,
    fontStyle: 1,  // Bold
    color: { r: 1, g: 0.9, b: 0.4, a: 1 }
  }
})

// 顔アイコン
mcp__unity-mcp-server__create_gameobject({
  name: "Portrait",
  parentPath: "/DialogCanvas/DialogPanel"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/DialogCanvas/DialogPanel/Portrait",
  componentType: "Image"
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/DialogCanvas/DialogPanel/Portrait",
  componentType: "RectTransform",
  fieldPath: "sizeDelta",
  value: { x: 100, y: 100 }
})

// ダイアログテキスト
mcp__unity-mcp-server__create_gameobject({
  name: "DialogText",
  parentPath: "/DialogCanvas/DialogPanel"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/DialogCanvas/DialogPanel/DialogText",
  componentType: "TextMeshProUGUI",
  properties: {
    text: "こんにちは、旅人さん。",
    fontSize: 18,
    alignment: 257  // TopLeft
  }
})

// 選択肢コンテナ
mcp__unity-mcp-server__create_gameobject({
  name: "ChoicesContainer",
  parentPath: "/DialogCanvas/DialogPanel"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/DialogCanvas/DialogPanel/ChoicesContainer",
  componentType: "VerticalLayoutGroup",
  properties: {
    spacing: 8,
    childAlignment: 4  // MiddleCenter
  }
})

// 次へインジケーター
mcp__unity-mcp-server__create_gameobject({
  name: "ContinueIndicator",
  parentPath: "/DialogCanvas/DialogPanel"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/DialogCanvas/DialogPanel/ContinueIndicator",
  componentType: "Image"
})
```

#### テキスト送り（タイプライター効果）

```csharp
// DialogController.cs
using System.Collections;
using UnityEngine;
using TMPro;

public class DialogController : MonoBehaviour
{
    [SerializeField] private TextMeshProUGUI dialogText;
    [SerializeField] private GameObject continueIndicator;
    [SerializeField] private float charactersPerSecond = 30f;

    private string fullText;
    private bool isTyping;
    private bool skipRequested;

    public void ShowDialog(string text)
    {
        fullText = text;
        StartCoroutine(TypeText());
    }

    IEnumerator TypeText()
    {
        isTyping = true;
        continueIndicator.SetActive(false);
        dialogText.text = "";

        foreach (char c in fullText)
        {
            if (skipRequested)
            {
                dialogText.text = fullText;
                break;
            }

            dialogText.text += c;
            yield return new WaitForSeconds(1f / charactersPerSecond);
        }

        isTyping = false;
        skipRequested = false;
        continueIndicator.SetActive(true);
    }

    public void OnClick()
    {
        if (isTyping)
            skipRequested = true;
        else
            // 次のダイアログへ
            OnDialogComplete();
    }

    void OnDialogComplete()
    {
        // 実装: 次のセリフ表示または終了
    }
}
```

---

## Core Concepts

### 1. Canvas Render Mode

| Mode | 用途 | 特徴 |
|------|------|------|
| Screen Space - Overlay | 一般的なUI | 最前面に描画、カメラ不要 |
| Screen Space - Camera | 3D効果付きUI | カメラ参照、深度ソート可能 |
| World Space | 3D空間内UI | VR/AR、ゲーム内看板 |

### 2. RectTransform

RectTransformはUI要素の位置・サイズを制御するコンポーネントです。

```javascript
// RectTransformの主要プロパティ
mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Canvas/Button",
  componentType: "RectTransform",
  fieldPath: "anchoredPosition",
  value: { x: 0, y: 100 }  // アンカー基準の位置
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Canvas/Button",
  componentType: "RectTransform",
  fieldPath: "sizeDelta",
  value: { x: 200, y: 60 }  // サイズ
})
```

### 3. Anchors（アンカー）

アンカーはレスポンシブデザインの核心です。0〜1の正規化された値で親要素に対する相対位置を指定します。

#### アンカープリセット一覧

| プリセット | anchorMin | anchorMax | 用途 |
|-----------|-----------|-----------|------|
| 中央 | (0.5, 0.5) | (0.5, 0.5) | ポップアップ、ダイアログ |
| 左上 | (0, 1) | (0, 1) | ステータス表示 |
| 右上 | (1, 1) | (1, 1) | 設定ボタン |
| 左下 | (0, 0) | (0, 0) | チャット入力 |
| 右下 | (1, 0) | (1, 0) | アクションボタン |
| 上部ストレッチ | (0, 1) | (1, 1) | ヘッダー |
| 下部ストレッチ | (0, 0) | (1, 0) | フッター |
| 左側ストレッチ | (0, 0) | (0, 1) | サイドメニュー |
| 全画面ストレッチ | (0, 0) | (1, 1) | 背景 |

```javascript
// 全画面ストレッチの例
mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Canvas/Background",
  componentType: "RectTransform",
  fieldPath: "anchorMin",
  value: { x: 0, y: 0 }
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Canvas/Background",
  componentType: "RectTransform",
  fieldPath: "anchorMax",
  value: { x: 1, y: 1 }
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Canvas/Background",
  componentType: "RectTransform",
  fieldPath: "offsetMin",
  value: { x: 0, y: 0 }
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Canvas/Background",
  componentType: "RectTransform",
  fieldPath: "offsetMax",
  value: { x: 0, y: 0 }
})
```

## Mobile Responsive Design

### Canvas Scaler設定

モバイルレスポンシブの鍵は`CanvasScaler`の適切な設定です。

#### 縦向き（Portrait）優先

```javascript
mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Canvas",
  componentType: "CanvasScaler",
  fieldPath: "uiScaleMode",
  value: 1  // ScaleWithScreenSize
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Canvas",
  componentType: "CanvasScaler",
  fieldPath: "referenceResolution",
  value: { x: 1080, y: 1920 }  // 9:16 縦向き基準
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Canvas",
  componentType: "CanvasScaler",
  fieldPath: "matchWidthOrHeight",
  value: 0  // 0 = 幅に合わせる（縦向き最適）
})
```

#### 横向き（Landscape）優先

```javascript
mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Canvas",
  componentType: "CanvasScaler",
  fieldPath: "referenceResolution",
  value: { x: 1920, y: 1080 }  // 16:9 横向き基準
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Canvas",
  componentType: "CanvasScaler",
  fieldPath: "matchWidthOrHeight",
  value: 1  // 1 = 高さに合わせる（横向き最適）
})
```

#### 縦横両対応（動的Match）

縦横両方に対応する場合、ランタイムでMatchを切り替えます。

```csharp
// OrientationHandler.cs
using UnityEngine;
using UnityEngine.UI;

public class OrientationHandler : MonoBehaviour
{
    private CanvasScaler canvasScaler;
    private ScreenOrientation lastOrientation;

    void Start()
    {
        canvasScaler = GetComponent<CanvasScaler>();
        UpdateMatch();
    }

    void Update()
    {
        if (Screen.orientation != lastOrientation)
        {
            UpdateMatch();
            lastOrientation = Screen.orientation;
        }
    }

    void UpdateMatch()
    {
        bool isPortrait = Screen.height > Screen.width;
        canvasScaler.matchWidthOrHeight = isPortrait ? 0f : 1f;
    }
}
```

### Safe Area対応（ノッチ対応）

ノッチやパンチホールカメラを持つデバイス向けのSafe Area対応です。

```csharp
// SafeAreaHandler.cs
using UnityEngine;

public class SafeAreaHandler : MonoBehaviour
{
    private RectTransform panelRectTransform;
    private Rect lastSafeArea;

    void Start()
    {
        panelRectTransform = GetComponent<RectTransform>();
        ApplySafeArea();
    }

    void Update()
    {
        if (Screen.safeArea != lastSafeArea)
        {
            ApplySafeArea();
        }
    }

    void ApplySafeArea()
    {
        Rect safeArea = Screen.safeArea;
        lastSafeArea = safeArea;

        // 正規化された座標に変換
        Vector2 anchorMin = safeArea.position;
        Vector2 anchorMax = safeArea.position + safeArea.size;

        anchorMin.x /= Screen.width;
        anchorMin.y /= Screen.height;
        anchorMax.x /= Screen.width;
        anchorMax.y /= Screen.height;

        panelRectTransform.anchorMin = anchorMin;
        panelRectTransform.anchorMax = anchorMax;
    }
}
```

```javascript
// Safe Area用パネルを作成
mcp__unity-mcp-server__create_gameobject({
  name: "SafeAreaPanel",
  parentPath: "/Canvas"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas/SafeAreaPanel",
  componentType: "RectTransform"
})

// 全画面ストレッチに設定
mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Canvas/SafeAreaPanel",
  componentType: "RectTransform",
  fieldPath: "anchorMin",
  value: { x: 0, y: 0 }
})

mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Canvas/SafeAreaPanel",
  componentType: "RectTransform",
  fieldPath: "anchorMax",
  value: { x: 1, y: 1 }
})

// SafeAreaHandlerスクリプトを追加
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas/SafeAreaPanel",
  componentType: "SafeAreaHandler"
})
```

## Layout Groups

自動レイアウトを実現するLayout Groupコンポーネントです。

### Horizontal Layout Group

```javascript
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas/ButtonContainer",
  componentType: "HorizontalLayoutGroup",
  properties: {
    spacing: 10,
    childAlignment: 4,  // MiddleCenter
    childControlWidth: true,
    childControlHeight: true,
    childForceExpandWidth: false,
    childForceExpandHeight: false
  }
})
```

### Vertical Layout Group

```javascript
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas/MenuList",
  componentType: "VerticalLayoutGroup",
  properties: {
    spacing: 5,
    childAlignment: 1,  // UpperCenter
    padding: { left: 10, right: 10, top: 10, bottom: 10 }
  }
})
```

### Grid Layout Group

```javascript
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas/ItemGrid",
  componentType: "GridLayoutGroup",
  properties: {
    cellSize: { x: 100, y: 100 },
    spacing: { x: 10, y: 10 },
    startCorner: 0,  // UpperLeft
    startAxis: 0,    // Horizontal
    childAlignment: 4,  // MiddleCenter
    constraint: 1,  // FixedColumnCount
    constraintCount: 4
  }
})
```

### Content Size Fitter

子要素のサイズに合わせて親を自動調整します。

```javascript
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas/AutoSizePanel",
  componentType: "ContentSizeFitter",
  properties: {
    horizontalFit: 2,  // PreferredSize
    verticalFit: 2     // PreferredSize
  }
})
```

## Tool Selection Guide

| 目的 | 推奨ツール |
|------|-----------|
| Canvas作成 | `create_gameobject` + `add_component` |
| UI要素追加 | `create_gameobject` + `add_component` |
| アンカー設定 | `set_component_field` (RectTransform) |
| Canvas Scaler設定 | `set_component_field` (CanvasScaler) |
| Layout Group追加 | `add_component` |
| UI要素検索 | `find_ui_elements` |
| UIクリックテスト | `click_ui_element` |
| UI状態確認 | `get_ui_element_state` |
| スクリプト作成 | `create_script_class` |

## Common Workflows

### 1. モバイル縦向きUIの作成

```javascript
// Step 1: Canvas作成
mcp__unity-mcp-server__create_gameobject({ name: "MobileCanvas" })
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/MobileCanvas",
  componentType: "Canvas",
  properties: { renderMode: 0 }
})
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/MobileCanvas",
  componentType: "CanvasScaler",
  properties: {
    uiScaleMode: 1,
    referenceResolution: { x: 1080, y: 1920 },
    matchWidthOrHeight: 0
  }
})
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/MobileCanvas",
  componentType: "GraphicRaycaster"
})

// Step 2: Safe Areaパネル
mcp__unity-mcp-server__create_gameobject({
  name: "SafeArea",
  parentPath: "/MobileCanvas"
})

// Step 3: ヘッダー（上部ストレッチ）
mcp__unity-mcp-server__create_gameobject({
  name: "Header",
  parentPath: "/MobileCanvas/SafeArea"
})
// アンカーを上部ストレッチに設定...

// Step 4: コンテンツ（中央ストレッチ）
mcp__unity-mcp-server__create_gameobject({
  name: "Content",
  parentPath: "/MobileCanvas/SafeArea"
})

// Step 5: フッター（下部ストレッチ）
mcp__unity-mcp-server__create_gameobject({
  name: "Footer",
  parentPath: "/MobileCanvas/SafeArea"
})
```

### 2. スクロールビューの作成

```javascript
// ScrollView作成
mcp__unity-mcp-server__create_gameobject({
  name: "ScrollView",
  parentPath: "/Canvas"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas/ScrollView",
  componentType: "ScrollRect"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas/ScrollView",
  componentType: "Image"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas/ScrollView",
  componentType: "Mask"
})

// Content作成
mcp__unity-mcp-server__create_gameobject({
  name: "Content",
  parentPath: "/Canvas/ScrollView"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas/ScrollView/Content",
  componentType: "VerticalLayoutGroup",
  properties: {
    childControlHeight: false,
    childForceExpandHeight: false
  }
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/Canvas/ScrollView/Content",
  componentType: "ContentSizeFitter",
  properties: {
    verticalFit: 2  // PreferredSize
  }
})
```

## Common Mistakes

### 1. アンカーの誤設定

**NG**: 固定位置でのUI配置
```javascript
// 画面サイズが変わるとUIがはみ出す
anchoredPosition: { x: 500, y: 800 }
```

**OK**: アンカーを使用した相対配置
```javascript
// 親要素の右下に固定
anchorMin: { x: 1, y: 0 }
anchorMax: { x: 1, y: 0 }
anchoredPosition: { x: -50, y: 50 }  // 余白
```

### 2. Canvas Scalerの設定漏れ

**NG**: Constant Pixel Sizeのまま
```javascript
uiScaleMode: 0  // 解像度が変わるとUIサイズが不適切に
```

**OK**: Scale With Screen Size
```javascript
uiScaleMode: 1
referenceResolution: { x: 1080, y: 1920 }
matchWidthOrHeight: 0  // または1
```

### 3. Safe Area未対応

**NG**: Canvas直下に重要UIを配置
- ノッチ部分にUIが隠れる
- ホームインジケーター領域と重なる

**OK**: Safe Areaパネル内に配置
- SafeAreaHandlerスクリプトで動的調整
- 重要UIはSafe Area内に配置

### 4. Layout Groupの過度な使用

**NG**: すべてのUIにLayout Groupを適用
- パフォーマンス低下
- 意図しないレイアウト変更

**OK**: 動的に変化するリストにのみ使用
- 静的UIは手動配置
- スクロールビューのコンテンツに使用

### 5. アスペクト比の考慮不足

**NG**: 16:9のみを想定
```javascript
referenceResolution: { x: 1920, y: 1080 }
// 9:16, 18:9, 21:9などで崩れる
```

**OK**: 複数アスペクト比を考慮
- 主要なアスペクト比でテスト
- 極端な比率でも崩れないアンカー設定
- 必要に応じてAspect Ratio Fitterを使用

## Tool Reference

### find_ui_elements
```javascript
mcp__unity-mcp-server__find_ui_elements({
  elementType: "Button",      // UI component type
  tagFilter: "MainMenu",      // GameObject tag
  namePattern: "Btn_*",       // Name pattern
  includeInactive: false,     // Include inactive
  canvasFilter: "MainCanvas"  // Parent Canvas name
})
```

### click_ui_element
```javascript
mcp__unity-mcp-server__click_ui_element({
  elementPath: "/Canvas/Button",
  clickType: "left",     // left, right, middle
  holdDuration: 0,       // ms
  position: { x: 0.5, y: 0.5 }  // 0-1 normalized
})
```

### get_ui_element_state
```javascript
mcp__unity-mcp-server__get_ui_element_state({
  elementPath: "/Canvas/Button",
  includeChildren: false,
  includeInteractableInfo: true
})
```

### set_ui_element_value
```javascript
mcp__unity-mcp-server__set_ui_element_value({
  elementPath: "/Canvas/InputField",
  value: "Hello World",
  triggerEvents: true
})
```

### set_component_field (RectTransform)
```javascript
mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Canvas/Panel",
  componentType: "RectTransform",
  fieldPath: "anchorMin",  // anchorMin, anchorMax, pivot, anchoredPosition, sizeDelta, offsetMin, offsetMax
  value: { x: 0, y: 0 }
})
```

### set_component_field (CanvasScaler)
```javascript
mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/Canvas",
  componentType: "CanvasScaler",
  fieldPath: "matchWidthOrHeight",  // uiScaleMode, referenceResolution, screenMatchMode, matchWidthOrHeight
  value: 0.5
})
```
