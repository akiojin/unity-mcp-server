---
description: 現在の要件に対して、要件品質を検証するチェックリスト（requirements writingのユニットテスト）を生成します。
scripts:
  sh: .specify/scripts/bash/check-prerequisites.sh --json
  ps: .specify/scripts/powershell/check-prerequisites.ps1 -Json
---

## 重要: チェックリストは「要件文章のユニットテスト」

チェックリストは「実装が動くか」を検証するものではなく、**要件が十分に書かれているか**を検証します。

## ユーザー入力

```text
$ARGUMENTS
```

空でない場合、続行する前にユーザー入力を考慮する**必要があります**。

## 実行手順

1. `{SCRIPT}` を実行し、`FEATURE_DIR` を取得します（パスはすべて絶対パス）。

2. spec.md / plan.md / tasks.md を参照しつつ、ユーザー入力の観点（例: UX/セキュリティ/運用）に合わせたチェック項目を設計します。

3. `FEATURE_DIR/checklists/<short-name>.md` を作成します（ファイル書き込みあり）:
   - `.specify/templates/checklist-template.md` に従う
   - CHK001.. の連番
   - 可能な限り参照（Spec/Plan/Tasks）または `[Gap]` `[Ambiguity]` を付与
   - 実装テストにならないよう、要件品質の問いにする

4. 完了報告:
   - 作成したファイルパス
   - 項目数
   - 選択した観点
