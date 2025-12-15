---
description: tasks.md に定義されたタスクを順に実行し、実装を進めます（チェックリストが未完了なら確認して停止）。
scripts:
  sh: .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
  ps: .specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
---

## ユーザー入力

```text
$ARGUMENTS
```

空でない場合、続行する前にユーザー入力を考慮する**必要があります**。

## 実行手順

1. `{SCRIPT}` を実行し、`FEATURE_DIR` と `AVAILABLE_DOCS` を取得します（パスはすべて絶対パス）。

2. `FEATURE_DIR/checklists/` が存在する場合、各チェックリストの未完了数を集計します。
   - 未完了があれば停止して確認: 「未完了です。続行しますか？ (yes/no)」

3. `tasks.md`（必須）と `plan.md`（必須）を読み込み、必要なら `data-model.md` / `contracts/` / `research.md` / `quickstart.md` を参照します。

4. tasks.md に従ってタスクを順次実行します（TDDや憲章の禁止事項を尊重）。

5. 完了報告:
   - 完了したタスクID
   - 残タスク
   - 次の推奨アクション
