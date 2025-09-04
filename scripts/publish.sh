#!/usr/bin/env bash
set -euo pipefail

# publish.sh <major|minor|patch>
# 一括処理: 版上げ → バージョン同期（C#/UPM）→ コミット → タグ作成 → プッシュ
# 期待値: GitHub Actions が自動で
#  - Release: roslyn-cli（各RIDビルド＋manifest公開）
#  - Publish: mcp-server (npm)
# を実行。

usage() { echo "Usage: $0 <major|minor|patch>"; exit 1; }

LEVEL=${1-}
[[ "$LEVEL" =~ ^(major|minor|patch)$ ]] || usage

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "[error] node not found" >&2
  exit 2
fi

# 事前情報
CUR_VER=$(node -p "require('./mcp-server/package.json').version")
echo "[info] current version: $CUR_VER"

# npm version を実行（mcp-server/scripts/sync-roslyn-version.js が C#/UPM を同期更新）
echo "[step] bump mcp-server version ($LEVEL)"
pushd mcp-server >/dev/null
npm version "$LEVEL" -m "chore(release): v%s" >/dev/null
popd >/dev/null

NEW_VER=$(node -p "require('./mcp-server/package.json').version")
TAG="v$NEW_VER"
echo "[info] new version: $NEW_VER (tag: $TAG)"

# 変更ファイルをコミット（npmが自動コミットしない場合の保険）
git add mcp-server/package.json mcp-server/package-lock.json \
        UnityEditorMCP/Packages/unity-editor-mcp/package.json \
        roslyn-cli/Directory.Build.props || true
if ! git diff --cached --quiet; then
  git commit -m "chore(release): $TAG — バージョン同期（MCP/UPM/roslyn-cli）"
fi

# タグ作成（存在しない場合）
if git rev-parse -q --verify "$TAG" >/dev/null; then
  echo "[info] tag exists: $TAG"
else
  git tag -a "$TAG" -m "$TAG"
fi

# プッシュ（本体＋タグ）
echo "[step] push commits and tag"
git push
git push origin "$TAG"

echo "[done] v$NEW_VER pushed. Check GitHub Actions: Release: roslyn-cli / Publish: mcp-server (npm)"
echo "- Release URL (runs): https://github.com/akiojin/unity-editor-mcp/actions/workflows/roslyn-cli-release.yml"
echo "- Publish URL (runs): https://github.com/akiojin/unity-editor-mcp/actions/workflows/mcp-server-publish.yml"

