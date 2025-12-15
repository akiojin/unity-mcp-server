---
description: 利用可能な設計アーティファクトに基づいて、実行可能で依存関係順に並んだ tasks.md を生成します。
handoffs: 
  - label: 整合性分析
    agent: speckit.analyze
    prompt: 実装前に整合性分析を実行してください
    send: true
  - label: 実装開始
    agent: speckit.implement
    prompt: tasksに従って実装を開始してください
    send: true
scripts:
  sh: .specify/scripts/bash/check-prerequisites.sh --json
  ps: .specify/scripts/powershell/check-prerequisites.ps1 -Json
---

## ユーザー入力

```text
$ARGUMENTS
```

空でない場合、続行する前にユーザー入力を考慮する**必要があります**。

## 実行手順

1. `{SCRIPT}` をリポジトリルートから実行し、JSON出力から `FEATURE_DIR` と `AVAILABLE_DOCS` を取得します（パスはすべて絶対パス）。

2. `FEATURE_DIR` から以下を読み込みます:
   - **必須**: plan.md, spec.md
   - **任意**: data-model.md, contracts/, research.md, quickstart.md, tasks.md（既存がある場合）

3. `.specify/templates/tasks-template.md` の構造に従って `FEATURE_DIR/tasks.md` を生成します（ファイル書き込みあり）:
   - タスクはユーザーストーリー単位で整理
   - すべてのタスクにID（T001..）とファイルパスを付与
   - 依存関係と並列化（[P]）を明確化

4. 完了報告:
   - tasks.md のパス
   - タスク数、ストーリー別内訳、並列化ポイント
   - 次ステップ `/speckit.analyze` または `/speckit.implement`
