---
description: 自然言語の要件説明から、機能仕様（spec.md）を作成または更新します（ブランチ作成なし）。
handoffs: 
  - label: 実装計画を作成
    agent: speckit.plan
    prompt: plan.md を作成してください。技術スタックは…
  - label: 仕様の曖昧点を解消
    agent: speckit.clarify
    prompt: 仕様の曖昧点を明確化してください
    send: true
scripts:
  sh: .specify/scripts/bash/create-new-feature.sh --json "{ARGS}"
  ps: .specify/scripts/powershell/create-new-feature.ps1 -Json "{ARGS}"
---

## ユーザー入力

```text
$ARGUMENTS
```

空でない場合、続行する前にユーザー入力を考慮する**必要があります**。

## 実行手順

1. `{SCRIPT}` をリポジトリルートから実行し、JSON出力から `FEATURE_ID` / `FEATURE_DIR` / `SPEC_FILE` を取得します（パスはすべて絶対パス）。

2. `.specify/templates/spec-template.md` を読み、必須セクションと見出し構造を理解します。

3. `SPEC_FILE` をテンプレート構造に沿って埋めます:
   - 「何を」「なぜ」を中心に書く（実装方法・技術スタック・API・コード構造は書かない）
   - ユーザーストーリーは優先度順（P1→P2→P3）で、**独立してテスト可能**にする
   - `[要明確化]` は最大3つまで

4. 仕様品質チェックリストを `FEATURE_DIR/checklists/requirements.md` に作成します（`.specify/templates/checklist-template.md` をベースにする）。

5. 完了報告:
   - `FEATURE_ID` と `SPEC_FILE`
   - `specs/README.md`（要件一覧）が更新されている旨
   - 次ステップ `/speckit.plan`

## 注意

- 要件IDは `specs/SPEC-xxxxxxxx/` で管理します（Speckitはブランチを作成しません）。
