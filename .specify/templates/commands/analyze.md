---
description: tasks生成後に、spec/plan/tasks の整合性と品質を横断分析します（読み取り専用・非破壊）。
scripts:
  sh: .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
  ps: .specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
---

## ユーザー入力

```text
$ARGUMENTS
```

空でない場合、続行する前にユーザー入力を考慮する**必要があります**。

## 重要な制約

- **厳密に読み取り専用**: ファイルを編集しない。分析レポートのみ出力する。
- **憲章優先**: 憲章（docs/constitution.md / .specify/memory/constitution.md）と矛盾する場合は最優先で指摘する。

## 実行手順

1. `{SCRIPT}` を実行し、`FEATURE_DIR` を取得します（パスはすべて絶対パス）。

2. `FEATURE_DIR` の `spec.md` / `plan.md` / `tasks.md` を読み込み、矛盾・重複・曖昧さ・カバレッジ不足を検出します。

3. Markdownの分析レポートを出力します（ファイル書き込みなし）:
   - 指摘ID、カテゴリ、深刻度、場所、要約、推奨対応
   - 要件→タスクのカバレッジ要約
   - 次の推奨アクション（CRITICALがあれば実装前修正）
