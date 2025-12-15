---
description: 現在の spec.md の曖昧点を最大5問の高優先度質問で解消し、回答をspecへ反映します。
handoffs: 
  - label: 実装計画へ進む
    agent: speckit.plan
    prompt: 明確化済みspecに基づいてplanを作成してください。技術スタックは…
scripts:
  sh: .specify/scripts/bash/check-prerequisites.sh --json --paths-only
  ps: .specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly
---

## ユーザー入力

```text
$ARGUMENTS
```

空でない場合、続行する前にユーザー入力を考慮する**必要があります**。

## 実行手順

1. `{SCRIPT}` を**1回だけ**実行し、`FEATURE_SPEC`（spec.mdの絶対パス）と `FEATURE_DIR` を取得します。

2. spec.md を読み込み、曖昧点/未決定事項を抽出します。

3. 質問を最大5問に絞り、1問ずつ提示して回答を得ます。

4. 回答は spec.md に反映します（ファイル書き込みあり）:
   - `## Clarifications` / `### Session YYYY-MM-DD` を作成/追記
   - 関連セクション（要件/ストーリー/成功基準/エッジケース等）へ反映

5. 完了報告:
   - 質問数（≤5）
   - 更新した spec.md のパス
   - 次ステップ `/speckit.plan`
