---
name: unity-game-ui-toolkit-design
description: UnityのUI Toolkit（USS/UXML/Flexbox）を使用したゲームUIデザイン。HUD、ヘルスバー、インベントリ、スキルバー等のゲームUI要素、PanelSettingsによるスケーリング、Safe Area対応を含む。使用タイミング: ゲームUI設計、HUD作成、USS/UXMLスタイリング、Flexboxレイアウト、PanelSettings設定
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
  - mcp__unity-mcp-server__create_gameobject
  - mcp__unity-mcp-server__modify_gameobject
  - mcp__unity-mcp-server__find_gameobject
  - mcp__unity-mcp-server__manage_asset_database
  - mcp__unity-mcp-server__edit_script_structured
  - mcp__unity-mcp-server__create_script_class
  - mcp__unity-mcp-server__read_script
  - mcp__unity-mcp-server__get_script_symbols
---

# Unity Game UI Toolkit Design Skill

Unity UI Toolkit（USS/UXML/Flexbox）を使用したゲームUIデザインのスキルです。HUD、ヘルスバー、インベントリ、ダイアログ等のゲームUI要素の実装パターン、PanelSettingsによる画面スケーリング、Safe Area対応を含む包括的なゲームUIデザインガイドを提供します。

## Overview

UI Toolkitは、Webの技術（HTML/CSS）に近いアプローチでUIを構築するUnityの次世代UIシステムです。

| 特徴 | 詳細 |
|------|------|
| レイアウトエンジン | Yoga（CSS Flexboxのサブセット実装） |
| スタイリング | USS（Unity Style Sheets、CSSライク） |
| マークアップ | UXML（HTMLライク） |
| 対応バージョン | Unity 2021.2+（Unity 6.0+推奨） |
| 用途 | ゲームUI、エディタ拡張 |

## Game UI Types（ゲームUI分類）

ゲームUIは目的と表現方法によって4種類に分類されます。UIデザイン時には、どのタイプに該当するかを明確にしてから実装を開始してください。

### 1. Diegetic（ダイエジェティック）

ゲーム世界内に物理的に存在するUI。キャラクターも認識できる。

| 例 | ゲーム |
|----|--------|
| スーツ背面のHPバー | Dead Space |
| 車のダッシュボード | Racing Games |
| 武器の弾数表示 | Metro Exodus |
| 手持ちの地図 | Far Cry 2 |

```xml
<!-- UXML - ダイエジェティックUI（3D空間に配置） -->
<ui:VisualElement class="diegetic-display">
    <ui:VisualElement class="diegetic-display__screen">
        <ui:Label class="diegetic-display__value" text="87" />
        <ui:Label class="diegetic-display__unit" text="%" />
    </ui:VisualElement>
</ui:VisualElement>
```

### 2. Non-Diegetic（ノンダイエジェティック）

画面上のオーバーレイ。キャラクターは認識できない純粋なプレイヤー向け情報。

| 例 | 配置 |
|----|------|
| HPバー | 左上 |
| ミニマップ | 右上 |
| スキルバー | 下部中央 |
| クエスト目標 | 右側 |

```xml
<!-- UXML - Non-Diegetic HUD構成 -->
<ui:VisualElement class="hud">
    <!-- 左上: プレイヤーステータス -->
    <ui:VisualElement class="hud__top-left">
        <ui:VisualElement class="health-bar" />
        <ui:VisualElement class="mana-bar" />
    </ui:VisualElement>

    <!-- 右上: ミニマップ -->
    <ui:VisualElement class="hud__top-right">
        <ui:VisualElement class="minimap" />
    </ui:VisualElement>

    <!-- 下部中央: アクションバー -->
    <ui:VisualElement class="hud__bottom-center">
        <ui:VisualElement class="action-bar" />
    </ui:VisualElement>
</ui:VisualElement>
```

### 3. Spatial（スペーシャル）

ゲーム世界内に存在するが、キャラクターは認識できないUI。

| 例 |
|----|
| 敵の頭上HPバー |
| NPCの名前表示 |
| インタラクト可能オブジェクトのアイコン |
| 経路ガイドライン |

### 4. Meta（メタ）

ゲーム状態を画面エフェクトで表現。直接的なUI要素ではない。

| 例 | 表現 |
|----|------|
| ダメージ | 画面端の赤いビネット |
| 低HP | 画面全体の赤点滅 |
| 状態異常 | 画面の歪み/色変化 |
| 水中 | 青いオーバーレイ |

```css
/* USS - Metaエフェクト */
.meta-overlay {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 0, 0, 0);
    transition-duration: 0.3s;
}

.meta-overlay--damage {
    background-color: rgba(255, 0, 0, 0.3);
}

.meta-overlay--low-health {
    /* アニメーションでパルス */
}
```

## HUD Screen Layout（画面配置規則）

ゲームHUDには確立された配置規則があります。プレイヤーは無意識にこの配置を期待しています。

```
┌─────────────────────────────────────────────────────┐
│ [HP/MP/ステータス]              [ミニマップ/コンパス] │
│ [バフ/デバフアイコン]               [クエスト目標]   │
│                                                     │
│                     ゲーム画面                       │
│                    （視線集中域）                     │
│                                                     │
│ [チャット]                                          │
│ [ログ/通知]        [スキルバー/アイテム]  [クイックスロット] │
└─────────────────────────────────────────────────────┘
```

### 配置の原則

| 領域 | 要素 | 理由 |
|------|------|------|
| **左上** | HP、MP、スタミナ | 最も重要なステータス、視線が自然に向く |
| **右上** | ミニマップ、コンパス | ナビゲーション情報、頻繁に確認 |
| **下部中央** | スキルバー、アクションバー | 手元に近い感覚、キーボード配置と対応 |
| **右下** | インベントリ、クイックスロット | サブ情報、マウス操作との親和性 |
| **左下** | チャット、ログ | テキスト情報、ソーシャル要素 |
| **右側縦** | クエスト目標、通知 | 追加情報、一時的な表示 |
| **画面中央** | 避ける | ゲームプレイの視界を遮らない |

```css
/* USS - HUDグリッドレイアウト */
.hud {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
}

.hud__top-left {
    position: absolute;
    left: 16px;
    top: 16px;
}

.hud__top-right {
    position: absolute;
    right: 16px;
    top: 16px;
}

.hud__bottom-center {
    position: absolute;
    left: 50%;
    bottom: 16px;
    translate: -50% 0;
}

.hud__bottom-left {
    position: absolute;
    left: 16px;
    bottom: 16px;
}

.hud__bottom-right {
    position: absolute;
    right: 16px;
    bottom: 80px; /* アクションバーの上 */
}

.hud__right-side {
    position: absolute;
    right: 16px;
    top: 200px;
    width: 250px;
}
```

## Quick Start

### 基本的なUIDocument構成

```javascript
// 1. UIDocumentを持つGameObject作成
mcp__unity-mcp-server__create_gameobject({
  name: "UIManager"
})

// 2. UIDocumentコンポーネントを追加
mcp__unity-mcp-server__add_component({
  gameObjectPath: "/UIManager",
  componentType: "UIDocument"
})

// 3. PanelSettingsを設定
mcp__unity-mcp-server__set_component_field({
  gameObjectPath: "/UIManager",
  componentType: "UIDocument",
  fieldPath: "panelSettings",
  valueType: "objectReference",
  objectReference: {
    assetPath: "Assets/UI/PanelSettings.asset"
  }
})
```

## Core Concepts

### 1. PanelSettings（画面スケーリング）

PanelSettingsはuGUIのCanvas Scalerに相当し、画面サイズに応じたUIスケーリングを制御します。

#### Scale Mode一覧

| Mode | 用途 | 特徴 |
|------|------|------|
| Constant Pixel Size | デスクトップ | 1:1ピクセル対応（デフォルト） |
| Constant Physical Size | マルチDPI | DPI非依存、物理サイズ一定 |
| Scale With Screen Size | モバイル | 基準解像度に対してスケール |

#### Scale With Screen Size設定

```csharp
// PanelSettings設定例
[CreateAssetMenu(menuName = "UI/Panel Settings")]
public class ResponsivePanelSettings : ScriptableObject
{
    // PanelSettingsアセットを作成し、以下を設定:
    // Scale Mode: Scale With Screen Size
    // Reference Resolution: 1080 x 1920 (Portrait) or 1920 x 1080 (Landscape)
    // Screen Match Mode: Match Width Or Height
    // Match: 0 (Width priority for Portrait) / 1 (Height priority for Landscape)
}
```

#### ランタイムでのMatch切り替え

```csharp
// OrientationScaleHandler.cs
using UnityEngine;
using UnityEngine.UIElements;

public class OrientationScaleHandler : MonoBehaviour
{
    [SerializeField] private PanelSettings panelSettings;
    private ScreenOrientation lastOrientation;

    void Update()
    {
        if (Screen.orientation != lastOrientation)
        {
            bool isPortrait = Screen.height > Screen.width;
            panelSettings.match = isPortrait ? 0f : 1f;
            lastOrientation = Screen.orientation;
        }
    }
}
```

### 2. Flexboxレイアウト

UI ToolkitはYoga（Flexbox）レイアウトエンジンを使用します。Web開発者には馴染みのあるCSSレイアウトモデルです。

#### flex-direction

```css
/* USS - 縦方向レイアウト（デフォルト） */
.vertical-container {
    flex-direction: column;
}

/* USS - 横方向レイアウト */
.horizontal-container {
    flex-direction: row;
}
```

#### flex-grow / flex-shrink / flex-basis

```css
/* USS - 均等分割 */
.equal-child {
    flex-grow: 1;
    flex-basis: 0;  /* コンテンツサイズを無視して均等分割 */
}

/* USS - 固定サイズ + 可変 */
.fixed-header {
    flex-grow: 0;
    flex-shrink: 0;
    height: 60px;
}

.flexible-content {
    flex-grow: 1;
    flex-shrink: 1;
}
```

#### パーセンテージベースのサイズ

```css
/* USS - レスポンシブサイズ */
.responsive-panel {
    width: 80%;
    height: 100%;
    max-width: 600px;
}

.half-width {
    width: 50%;
}
```

#### align-items / justify-content

```css
/* USS - 中央配置 */
.center-container {
    align-items: center;      /* Cross-axis中央 */
    justify-content: center;  /* Main-axis中央 */
}

/* USS - 両端揃え + 間隔均等 */
.space-between-container {
    justify-content: space-between;
}

/* USS - 末尾揃え */
.end-aligned {
    align-items: flex-end;
    justify-content: flex-end;
}
```

### 3. USS（Unity Style Sheets）

CSSに似た構文でスタイルを定義します。

#### 基本構文

```css
/* USS - セレクタ種別 */
.class-selector { }      /* クラスセレクタ */
#name-selector { }       /* 名前セレクタ */
Button { }               /* 型セレクタ */
.parent > .child { }     /* 直接子セレクタ */
.parent .descendant { }  /* 子孫セレクタ */
.element:hover { }       /* 擬似クラス */
```

#### BEM命名規則

```css
/* Block */
.menu { }

/* Element */
.menu__item { }
.menu__title { }

/* Modifier */
.menu--horizontal { }
.menu__item--active { }
.menu__item--disabled { }
```

### 4. UXML（UI Markup Language）

HTMLに似た構文でUI構造を定義します。

```xml
<?xml version="1.0" encoding="utf-8"?>
<ui:UXML xmlns:ui="UnityEngine.UIElements">
    <ui:VisualElement class="root">
        <ui:VisualElement class="header">
            <ui:Label text="Title" class="header__title" />
        </ui:VisualElement>

        <ui:VisualElement class="content">
            <ui:ScrollView class="content__scroll">
                <ui:VisualElement class="content__list">
                    <!-- Dynamic items -->
                </ui:VisualElement>
            </ui:ScrollView>
        </ui:VisualElement>

        <ui:VisualElement class="footer">
            <ui:Button text="Action" class="footer__button" />
        </ui:VisualElement>
    </ui:VisualElement>
</ui:UXML>
```

## Mobile Responsive Design

### レスポンシブレイアウト構成

```css
/* USS - モバイルレスポンシブ基本構成 */
.root {
    flex-grow: 1;
    flex-direction: column;
}

.header {
    flex-shrink: 0;
    height: 60px;
    flex-direction: row;
    align-items: center;
    padding: 0 16px;
}

.content {
    flex-grow: 1;
    flex-shrink: 1;
}

.footer {
    flex-shrink: 0;
    height: 80px;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    padding: 0 16px;
}
```

### Safe Area対応

UI Toolkitでは座標系の変換が必要です（Screen.safeAreaは左下原点、UI Toolkitは左上原点）。

```csharp
// SafeAreaController.cs
using UnityEngine;
using UnityEngine.UIElements;

public class SafeAreaController : MonoBehaviour
{
    private UIDocument uiDocument;
    private VisualElement safeAreaContainer;
    private Rect lastSafeArea;

    void Start()
    {
        uiDocument = GetComponent<UIDocument>();
        safeAreaContainer = uiDocument.rootVisualElement.Q<VisualElement>("safe-area");
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

        // UI Toolkit座標系に変換（左上原点）
        float left = safeArea.x;
        float right = Screen.width - (safeArea.x + safeArea.width);
        float top = Screen.height - (safeArea.y + safeArea.height);
        float bottom = safeArea.y;

        // PanelSettingsのスケールを考慮
        var panelSettings = uiDocument.panelSettings;
        float scale = GetCurrentScale(panelSettings);

        safeAreaContainer.style.paddingLeft = left / scale;
        safeAreaContainer.style.paddingRight = right / scale;
        safeAreaContainer.style.paddingTop = top / scale;
        safeAreaContainer.style.paddingBottom = bottom / scale;
    }

    float GetCurrentScale(PanelSettings settings)
    {
        // Scale With Screen Sizeの場合のスケール計算
        if (settings.scaleMode == PanelScaleMode.ScaleWithScreenSize)
        {
            var refRes = settings.referenceResolution;
            float widthRatio = Screen.width / refRes.x;
            float heightRatio = Screen.height / refRes.y;
            return Mathf.Lerp(widthRatio, heightRatio, settings.match);
        }
        return 1f;
    }
}
```

```css
/* USS - Safe Areaコンテナ */
#safe-area {
    flex-grow: 1;
    /* paddingはC#から動的に設定 */
}
```

### 動的レイアウト切り替え（Media Query代替）

UI ToolkitはCSS @media queriesをサポートしていないため、C#で動的にスタイルを切り替えます。

```csharp
// ResponsiveLayoutController.cs
using UnityEngine;
using UnityEngine.UIElements;

public class ResponsiveLayoutController : MonoBehaviour
{
    private UIDocument uiDocument;
    private VisualElement root;
    private bool wasPortrait;

    void Start()
    {
        uiDocument = GetComponent<UIDocument>();
        root = uiDocument.rootVisualElement;
        ApplyOrientationLayout();
    }

    void Update()
    {
        bool isPortrait = Screen.height > Screen.width;
        if (isPortrait != wasPortrait)
        {
            ApplyOrientationLayout();
            wasPortrait = isPortrait;
        }
    }

    void ApplyOrientationLayout()
    {
        bool isPortrait = Screen.height > Screen.width;

        root.RemoveFromClassList("landscape");
        root.RemoveFromClassList("portrait");
        root.AddToClassList(isPortrait ? "portrait" : "landscape");

        // 画面幅に応じたレイアウト
        float screenWidth = Screen.width;
        root.RemoveFromClassList("narrow");
        root.RemoveFromClassList("wide");

        if (screenWidth < 600)
        {
            root.AddToClassList("narrow");
        }
        else
        {
            root.AddToClassList("wide");
        }
    }
}
```

```css
/* USS - 向き別スタイル */
.portrait .sidebar {
    display: none;
}

.landscape .sidebar {
    display: flex;
    width: 250px;
}

/* USS - 画面幅別スタイル */
.narrow .content__grid {
    flex-direction: column;
}

.wide .content__grid {
    flex-direction: row;
    flex-wrap: wrap;
}

.narrow .card {
    width: 100%;
}

.wide .card {
    width: 48%;
    margin: 1%;
}
```

## Game UI Elements（ゲームUI要素の実装）

### 1. ヘルスバー / リソースバー

```xml
<!-- UXML - ヘルスバー -->
<ui:VisualElement class="resource-bar health-bar">
    <ui:VisualElement class="resource-bar__background">
        <ui:VisualElement class="resource-bar__fill" name="health-fill" />
        <ui:VisualElement class="resource-bar__delayed-fill" name="health-delayed" />
    </ui:VisualElement>
    <ui:Label class="resource-bar__text" name="health-text" text="100/100" />
</ui:VisualElement>
```

```css
/* USS - リソースバー */
.resource-bar {
    width: 200px;
    height: 24px;
    flex-direction: row;
    align-items: center;
}

.resource-bar__background {
    flex-grow: 1;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 4px;
    overflow: hidden;
}

.resource-bar__fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 100%;
    background-color: #e74c3c;
    transition-duration: 0.2s;
}

.resource-bar__delayed-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 100%;
    background-color: #c0392b;
    transition-duration: 0.5s;
    transition-delay: 0.3s;
}

.resource-bar__text {
    position: absolute;
    left: 0;
    right: 0;
    -unity-text-align: middle-center;
    color: white;
    font-size: 12px;
    text-shadow: 1px 1px 2px black;
}

/* バリエーション */
.mana-bar .resource-bar__fill {
    background-color: #3498db;
}

.stamina-bar .resource-bar__fill {
    background-color: #2ecc71;
}

.xp-bar .resource-bar__fill {
    background-color: #9b59b6;
}
```

```csharp
// ResourceBarController.cs
public class ResourceBarController
{
    private VisualElement fill;
    private VisualElement delayedFill;
    private Label text;

    public void SetValue(float current, float max)
    {
        float percent = current / max;
        fill.style.width = Length.Percent(percent * 100);
        delayedFill.style.width = Length.Percent(percent * 100);
        text.text = $"{(int)current}/{(int)max}";
    }
}
```

### 2. スキルクールダウン

```xml
<!-- UXML - スキルスロット -->
<ui:VisualElement class="skill-slot">
    <ui:VisualElement class="skill-slot__icon" />
    <ui:VisualElement class="skill-slot__cooldown-overlay" name="cooldown-overlay" />
    <ui:Label class="skill-slot__cooldown-text" name="cooldown-text" />
    <ui:Label class="skill-slot__keybind" text="Q" />
</ui:VisualElement>
```

```css
/* USS - スキルスロット */
.skill-slot {
    width: 64px;
    height: 64px;
    margin: 4px;
    background-color: rgba(0, 0, 0, 0.6);
    border-width: 2px;
    border-color: #555;
    border-radius: 8px;
}

.skill-slot__icon {
    position: absolute;
    left: 4px;
    top: 4px;
    right: 4px;
    bottom: 4px;
    background-image: resource("Icons/skill_placeholder");
}

.skill-slot__cooldown-overlay {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    /* 円形マスクはシェーダーで実装 */
}

.skill-slot__cooldown-text {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    translate: 0 -50%;
    -unity-text-align: middle-center;
    font-size: 20px;
    color: white;
    -unity-font-style: bold;
}

.skill-slot__keybind {
    position: absolute;
    right: 2px;
    bottom: 2px;
    font-size: 12px;
    color: #aaa;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 2px 4px;
    border-radius: 2px;
}

.skill-slot--ready {
    border-color: #f39c12;
}

.skill-slot--active {
    border-color: #2ecc71;
    border-width: 3px;
}
```

### 3. インベントリグリッド

```xml
<!-- UXML - インベントリ -->
<ui:VisualElement class="inventory-panel">
    <ui:VisualElement class="inventory-panel__header">
        <ui:Label text="インベントリ" class="inventory-panel__title" />
        <ui:Button class="inventory-panel__close" text="×" />
    </ui:VisualElement>
    <ui:VisualElement class="inventory-panel__grid" name="inventory-grid">
        <!-- 動的に生成 -->
    </ui:VisualElement>
    <ui:VisualElement class="inventory-panel__footer">
        <ui:Label name="gold-label" text="Gold: 0" />
        <ui:Label name="weight-label" text="Weight: 0/100" />
    </ui:VisualElement>
</ui:VisualElement>
```

```css
/* USS - インベントリ */
.inventory-panel {
    width: 400px;
    background-color: rgba(20, 20, 30, 0.95);
    border-width: 2px;
    border-color: #444;
    border-radius: 8px;
}

.inventory-panel__header {
    height: 40px;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    background-color: rgba(0, 0, 0, 0.3);
    border-bottom-width: 1px;
    border-bottom-color: #333;
}

.inventory-panel__grid {
    flex-direction: row;
    flex-wrap: wrap;
    padding: 8px;
}

.inventory-slot {
    width: 48px;
    height: 48px;
    margin: 2px;
    background-color: rgba(0, 0, 0, 0.4);
    border-width: 1px;
    border-color: #333;
    border-radius: 4px;
}

.inventory-slot:hover {
    border-color: #666;
    background-color: rgba(255, 255, 255, 0.1);
}

.inventory-slot--selected {
    border-color: #f39c12;
    border-width: 2px;
}

.inventory-slot__icon {
    position: absolute;
    left: 4px;
    top: 4px;
    right: 4px;
    bottom: 12px;
}

.inventory-slot__count {
    position: absolute;
    right: 2px;
    bottom: 2px;
    font-size: 10px;
    color: white;
    background-color: rgba(0, 0, 0, 0.6);
    padding: 1px 3px;
    border-radius: 2px;
}

/* アイテムレアリティ */
.inventory-slot--common { border-color: #aaa; }
.inventory-slot--uncommon { border-color: #2ecc71; }
.inventory-slot--rare { border-color: #3498db; }
.inventory-slot--epic { border-color: #9b59b6; }
.inventory-slot--legendary { border-color: #f39c12; }
```

### 4. ダメージ数字（フローティングテキスト）

```csharp
// DamageNumberController.cs
using UnityEngine;
using UnityEngine.UIElements;

public class DamageNumberController : MonoBehaviour
{
    [SerializeField] private UIDocument uiDocument;
    [SerializeField] private VisualTreeAsset damageNumberTemplate;

    public void SpawnDamageNumber(Vector3 worldPos, int damage, DamageType type)
    {
        var root = uiDocument.rootVisualElement;
        var damageLabel = damageNumberTemplate.Instantiate();

        var label = damageLabel.Q<Label>("damage-text");
        label.text = damage.ToString();

        // ダメージタイプに応じたスタイル
        switch (type)
        {
            case DamageType.Critical:
                label.AddToClassList("damage-number--critical");
                label.text = damage.ToString() + "!";
                break;
            case DamageType.Heal:
                label.AddToClassList("damage-number--heal");
                label.text = "+" + damage.ToString();
                break;
        }

        // ワールド座標をスクリーン座標に変換
        Vector2 screenPos = Camera.main.WorldToScreenPoint(worldPos);
        // UI Toolkit座標系に変換（Y軸反転）
        float uiY = Screen.height - screenPos.y;

        damageLabel.style.position = Position.Absolute;
        damageLabel.style.left = screenPos.x;
        damageLabel.style.top = uiY;

        root.Add(damageLabel);

        // アニメーション後に削除
        damageLabel.schedule.Execute(() => {
            damageLabel.RemoveFromHierarchy();
        }).ExecuteLater(1000);
    }
}
```

```css
/* USS - ダメージ数字 */
.damage-number {
    position: absolute;
    font-size: 24px;
    color: white;
    -unity-font-style: bold;
    text-shadow: 2px 2px 4px black;
    transition-property: translate, opacity;
    transition-duration: 1s;
    translate: 0 0;
    opacity: 1;
}

.damage-number--animate {
    translate: 0 -50px;
    opacity: 0;
}

.damage-number--critical {
    font-size: 36px;
    color: #e74c3c;
}

.damage-number--heal {
    color: #2ecc71;
}

.damage-number--miss {
    color: #888;
    font-size: 18px;
}
```

### 5. ミニマップ

```xml
<!-- UXML - ミニマップ -->
<ui:VisualElement class="minimap">
    <ui:VisualElement class="minimap__frame">
        <ui:VisualElement class="minimap__content" name="minimap-content">
            <!-- RenderTextureを背景に設定 -->
        </ui:VisualElement>
        <ui:VisualElement class="minimap__player-icon" />
        <ui:VisualElement class="minimap__markers" name="minimap-markers">
            <!-- 動的マーカー -->
        </ui:VisualElement>
    </ui:VisualElement>
    <ui:VisualElement class="minimap__compass">
        <ui:Label text="N" class="minimap__compass-label" />
    </ui:VisualElement>
</ui:VisualElement>
```

```css
/* USS - ミニマップ */
.minimap {
    width: 180px;
    height: 180px;
}

.minimap__frame {
    width: 100%;
    height: 100%;
    border-radius: 90px; /* 円形 */
    border-width: 3px;
    border-color: rgba(0, 0, 0, 0.8);
    overflow: hidden;
}

.minimap__content {
    width: 100%;
    height: 100%;
    /* RenderTextureはC#から設定 */
}

.minimap__player-icon {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 12px;
    height: 12px;
    translate: -50% -50%;
    background-color: #3498db;
    border-radius: 6px;
    border-width: 2px;
    border-color: white;
}

.minimap__marker {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 4px;
}

.minimap__marker--enemy {
    background-color: #e74c3c;
}

.minimap__marker--quest {
    background-color: #f39c12;
}

.minimap__marker--poi {
    background-color: #2ecc71;
}
```

### 6. ダイアログシステム

```xml
<!-- UXML - ダイアログボックス -->
<ui:VisualElement class="dialog-box">
    <ui:VisualElement class="dialog-box__portrait" name="portrait" />
    <ui:VisualElement class="dialog-box__content">
        <ui:Label class="dialog-box__speaker" name="speaker-name" />
        <ui:Label class="dialog-box__text" name="dialog-text" />
    </ui:VisualElement>
    <ui:VisualElement class="dialog-box__choices" name="choices-container">
        <!-- 動的選択肢 -->
    </ui:VisualElement>
    <ui:VisualElement class="dialog-box__continue-indicator" />
</ui:VisualElement>
```

```css
/* USS - ダイアログボックス */
.dialog-box {
    position: absolute;
    left: 10%;
    right: 10%;
    bottom: 10%;
    min-height: 150px;
    background-color: rgba(0, 0, 0, 0.85);
    border-width: 2px;
    border-color: #444;
    border-radius: 8px;
    flex-direction: row;
    padding: 16px;
}

.dialog-box__portrait {
    width: 120px;
    height: 120px;
    border-width: 2px;
    border-color: #666;
    border-radius: 4px;
    margin-right: 16px;
    flex-shrink: 0;
}

.dialog-box__content {
    flex-grow: 1;
    flex-direction: column;
}

.dialog-box__speaker {
    font-size: 18px;
    color: #f39c12;
    -unity-font-style: bold;
    margin-bottom: 8px;
}

.dialog-box__text {
    font-size: 16px;
    color: white;
    white-space: normal;
    flex-grow: 1;
}

.dialog-box__choices {
    flex-direction: column;
    margin-top: 12px;
}

.dialog-choice {
    padding: 8px 16px;
    margin: 4px 0;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: white;
}

.dialog-choice:hover {
    background-color: rgba(255, 255, 255, 0.2);
}

.dialog-choice--selected {
    background-color: rgba(243, 156, 18, 0.3);
    border-left-width: 3px;
    border-left-color: #f39c12;
}

.dialog-box__continue-indicator {
    position: absolute;
    right: 16px;
    bottom: 16px;
    width: 16px;
    height: 16px;
    /* 点滅アニメーション用 */
}
```

## Performance Best Practices

### 1. インラインスタイルを避ける

```csharp
// NG - パフォーマンス低下
element.style.backgroundColor = Color.red;
element.style.width = 100;
element.style.height = 50;

// OK - USSクラスを使用
element.AddToClassList("highlighted-button");
```

### 2. :hover擬似クラスの最適化

```css
/* NG - 全要素に:hoverはパフォーマンス低下 */
.button:hover {
    background-color: #444;
}

/* OK - 必要な場合のみ使用、または:focusを併用 */
.interactive-button:hover,
.interactive-button:focus {
    background-color: #444;
}
```

### 3. 深いネストを避ける

```xml
<!-- NG - 深すぎるネスト -->
<ui:VisualElement>
    <ui:VisualElement>
        <ui:VisualElement>
            <ui:VisualElement>
                <ui:Label text="Deep" />
            </ui:VisualElement>
        </ui:VisualElement>
    </ui:VisualElement>
</ui:VisualElement>

<!-- OK - フラットな構造 -->
<ui:VisualElement class="container">
    <ui:Label text="Flat" />
</ui:VisualElement>
```

### 4. VisualElementのプール

```csharp
// 大量の動的要素はプールを使用
private Queue<VisualElement> elementPool = new Queue<VisualElement>();

VisualElement GetPooledElement()
{
    if (elementPool.Count > 0)
    {
        return elementPool.Dequeue();
    }
    return new VisualElement();
}

void ReturnToPool(VisualElement element)
{
    element.RemoveFromHierarchy();
    element.ClearClassList();
    elementPool.Enqueue(element);
}
```

## Tool Selection Guide

| 目的 | 推奨ツール |
|------|-----------|
| UIDocument GameObject作成 | `create_gameobject` + `add_component` |
| PanelSettings設定 | `set_component_field` |
| C#コントローラー作成 | `create_script_class` |
| UXML/USSファイル作成 | `manage_asset_database` |
| UI要素検索 | `find_ui_elements` |
| UIテスト | `click_ui_element`, `simulate_ui_input` |
| UI状態確認 | `get_ui_element_state` |

## Common Workflows

### 1. モバイルレスポンシブUIの作成

```javascript
// Step 1: UIDocument用GameObjectを作成
mcp__unity-mcp-server__create_gameobject({
  name: "ResponsiveUI"
})

mcp__unity-mcp-server__add_component({
  gameObjectPath: "/ResponsiveUI",
  componentType: "UIDocument"
})

// Step 2: レスポンシブコントローラーを追加
mcp__unity-mcp-server__create_script_class({
  path: "Assets/Scripts/UI/ResponsiveLayoutController.cs",
  className: "ResponsiveLayoutController",
  baseType: "MonoBehaviour",
  namespace: "Game.UI",
  apply: true
})

// Step 3: Safe Areaコントローラーを追加
mcp__unity-mcp-server__create_script_class({
  path: "Assets/Scripts/UI/SafeAreaController.cs",
  className: "SafeAreaController",
  baseType: "MonoBehaviour",
  namespace: "Game.UI",
  apply: true
})
```

### 2. スクロールビューの作成

```xml
<!-- UXML -->
<ui:ScrollView class="scroll-view" mode="Vertical">
    <ui:VisualElement class="scroll-content">
        <!-- Content items -->
    </ui:VisualElement>
</ui:ScrollView>
```

```css
/* USS */
.scroll-view {
    flex-grow: 1;
}

.scroll-content {
    flex-direction: column;
    padding: 16px;
}
```

### 3. データバインディング

```csharp
// DataBindingController.cs
using UnityEngine;
using UnityEngine.UIElements;

public class DataBindingController : MonoBehaviour
{
    [SerializeField] private UIDocument uiDocument;

    void Start()
    {
        var root = uiDocument.rootVisualElement;

        // ラベルへのバインディング
        var scoreLabel = root.Q<Label>("score-label");
        scoreLabel.text = "Score: 0";

        // ボタンイベント
        var button = root.Q<Button>("action-button");
        button.clicked += OnButtonClicked;

        // リストビュー
        var listView = root.Q<ListView>("item-list");
        listView.makeItem = () => new Label();
        listView.bindItem = (element, index) =>
        {
            (element as Label).text = $"Item {index}";
        };
        listView.itemsSource = new List<string> { "A", "B", "C" };
    }
}
```

## Common Mistakes

### 1. PanelSettings未設定

**NG**: UIDocumentのPanelSettingsが未設定
- UIが表示されない
- スケーリングが効かない

**OK**: PanelSettingsアセットを作成して設定
- Scale With Screen Sizeを選択
- Reference Resolutionを設定

### 2. flex-grow: 0のまま

**NG**: 子要素が親を埋めない
```css
.container { }  /* flex-grow: 0 がデフォルト */
```

**OK**: 明示的にflex-growを設定
```css
.container {
    flex-grow: 1;
}
```

### 3. Safe Area座標系の混同

**NG**: Screen.safeAreaをそのまま使用
```csharp
// 座標系が異なるため位置がずれる
element.style.top = Screen.safeArea.y;
```

**OK**: UI Toolkit座標系に変換
```csharp
float top = Screen.height - (Screen.safeArea.y + Screen.safeArea.height);
element.style.paddingTop = top / scale;
```

### 4. @media queriesの使用

**NG**: CSSのmedia queriesを記述
```css
/* UI Toolkitでは動作しない */
@media screen and (max-width: 600px) { }
```

**OK**: C#で動的にクラスを切り替え
```csharp
root.AddToClassList(isNarrow ? "narrow" : "wide");
```

### 5. パフォーマンスを考慮しないスタイル

**NG**: 頻繁なインラインスタイル変更
```csharp
void Update()
{
    element.style.left = Mathf.Sin(Time.time) * 100;
}
```

**OK**: transformを使用
```csharp
void Update()
{
    element.transform.position = new Vector3(Mathf.Sin(Time.time) * 100, 0, 0);
}
```

## Tool Reference

### PanelSettings Scale Modes

| Property | Type | Description |
|----------|------|-------------|
| scaleMode | PanelScaleMode | Constant Pixel Size / Constant Physical Size / Scale With Screen Size |
| referenceResolution | Vector2Int | 基準解像度（Scale With Screen Size時） |
| screenMatchMode | PanelScreenMatchMode | Match Width Or Height / Expand / Shrink |
| match | float | 0 = Width優先, 1 = Height優先 |
| referenceDpi | float | 基準DPI（Constant Physical Size時） |

### USS Flexbox Properties

| Property | Values | Default |
|----------|--------|---------|
| display | flex, none | flex |
| flex-direction | row, column, row-reverse, column-reverse | column |
| flex-grow | number | 0 |
| flex-shrink | number | 1 |
| flex-basis | length, auto | auto |
| align-items | flex-start, flex-end, center, stretch | stretch |
| justify-content | flex-start, flex-end, center, space-between, space-around | flex-start |
| flex-wrap | nowrap, wrap, wrap-reverse | nowrap |

### USS Size Properties

| Property | Values |
|----------|--------|
| width | length, %, auto |
| height | length, %, auto |
| min-width | length, % |
| max-width | length, % |
| min-height | length, % |
| max-height | length, % |

### C# VisualElement API

```csharp
// クラス操作
element.AddToClassList("class-name");
element.RemoveFromClassList("class-name");
element.ToggleInClassList("class-name");
element.EnableInClassList("class-name", enabled);

// スタイル操作
element.style.display = DisplayStyle.Flex;
element.style.flexGrow = 1;
element.style.width = Length.Percent(100);

// クエリ
root.Q<Button>("button-name");
root.Q<VisualElement>(className: "class-name");
root.Query<Label>().ToList();
```

## References

- [Unity Manual: Panel Settings](https://docs.unity3d.com/Manual/UIE-Runtime-Panel-Settings.html)
- [Unity Manual: USS Properties](https://docs.unity3d.com/Manual/UIE-USS-SupportedProperties.html)
- [Unity Manual: Layout Engine](https://docs.unity3d.com/Manual/UIE-LayoutEngine.html)
- [CSS Tricks: Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [2024 Guide to UI Toolkit](https://flexbuilder.ninja/2024/04/12/2024-guide-to-uitoolkit-for-unity-games/)
