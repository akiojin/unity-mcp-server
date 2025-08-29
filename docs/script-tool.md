# Unity Editor MCP — Script Tool (Hub)

LLM向けの最小ドキュメントに分割しました。用途別に参照してください。

- 読み取り・探索: `docs/script-read.md`
- 編集・リファクタ: `docs/script-edit.md`
- APIインデックス（機械可読）: `docs/api-index.json`

設定（任意）
- `ProjectSettings/UnityMCPSettings.json` が存在しない場合は安全な既定値が適用されます。
- 書き込みは既存`.cs`のみ（Assets/Embedded）。Packages配下に補助ファイルは作成しません。

補足
- 返却は既定でトークン節約（metadata/snippets、maxBytes、ページング）。
- 正規表現は `i/m/s` フラグ明示、タイムアウト付き。
