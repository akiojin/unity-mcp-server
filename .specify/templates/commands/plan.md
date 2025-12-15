---
description: planテンプレートに従って実装計画（plan.md）と設計アーティファクトを作成します。
handoffs: 
  - label: タスク生成
    agent: speckit.tasks
    prompt: planをtasksに分解してください
    send: true
scripts:
  sh: .specify/scripts/bash/setup-plan.sh --json
  ps: .specify/scripts/powershell/setup-plan.ps1 -Json
---

## ユーザー入力

```text
$ARGUMENTS
```

空でない場合、続行する前にユーザー入力を考慮する**必要があります**。

## 実行手順

1. `{SCRIPT}` をリポジトリルートから実行し、JSON出力から `FEATURE_DIR` / `FEATURE_SPEC` / `IMPL_PLAN` を取得します（パスはすべて絶対パス）。

2. `FEATURE_SPEC` と憲章（`docs/constitution.md` または `.specify/memory/constitution.md`）を読み込みます。

3. `IMPL_PLAN`（plan.md）を `.specify/templates/plan-template.md` の構造に沿って埋めます:
   - 技術コンテキスト（不明点は `要明確化`）
   - 憲章チェック
   - プロジェクト構造（実パス）

4. 必要に応じて設計アーティファクトを作成します:
   - `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

5. 完了報告:
   - `IMPL_PLAN` のパス
   - 生成したアーティファクト一覧
   - 次ステップ `/speckit.tasks`
