#!/usr/bin/env bash
set -euo pipefail
# デバッグ: 環境変数で有効化（例: PUBLISH_DEBUG=1）
[ "${PUBLISH_DEBUG:-0}" = "1" ] && set -x

# publish.sh <major|minor|patch> [--tags-only|--no-push] [--remote <name>]
# 一括処理: 版上げ → バージョン同期（C#/UPM）→ コミット → タグ作成 → プッシュ
# 期待値: GitHub Actions が自動で
#  - Release: roslyn-cli（各RIDビルド＋manifest公開）
#  - Publish: mcp-server (npm)
# を実行。

usage() { echo "Usage: $0 <major|minor|patch> [--tags-only|--no-push] [--remote <name>]"; exit 1; }

LEVEL=${1-}
[[ "$LEVEL" =~ ^(major|minor|patch)$ ]] || usage
shift || true

# push 動作: all(既定)/tags/none
PUSH_MODE=${PUBLISH_PUSH:-all}

# オプション解析
while [ $# -gt 0 ]; do
  case "$1" in
    --tags-only)
      PUSH_MODE=tags
      ;;
    --no-push)
      PUSH_MODE=none
      ;;
    --remote)
      shift
      [ $# -gt 0 ] || { echo "[error] --remote requires a value" >&2; exit 1; }
      REMOTE="$1"
      ;;
    *)
      echo "[warn] unknown option: $1" >&2
      ;;
  esac
  shift || true
done

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
REMOTE=${REMOTE:-origin}
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

# リモート接続確認
if ! git ls-remote --exit-code "$REMOTE" >/dev/null 2>&1; then
  echo "[error] remote not accessible: $REMOTE" >&2
  exit 2
fi

case "$PUSH_MODE" in
  all)
    # プッシュ（本体＋タグ）: follow-tags で関連タグも送信、その後明示的にタグ送信
    echo "[step] push commits and tag (mode=all)"
    git push --follow-tags "$REMOTE" || echo "[warn] git push --follow-tags failed; will try explicit tag push"
    git push "$REMOTE" "$TAG" || true
    ;;
  tags)
    echo "[step] push tag only (mode=tags)"
    git push "$REMOTE" "$TAG" || true
    ;;
  none)
    echo "[step] skip push (mode=none)"
    ;;
  *)
    echo "[error] unknown PUSH_MODE: $PUSH_MODE" >&2
    exit 2
    ;;
esac

# タグがリモートに存在するか検証し、必要に応じて再試行
echo "[step] verify tag on remote: $TAG"
if [ "$PUSH_MODE" = "none" ]; then
  echo "[skip] verification skipped (no push)"
elif git ls-remote --tags "$REMOTE" | awk '{print $2}' | grep -qx "refs/tags/$TAG"; then
  echo "[ok] tag exists on remote: $TAG"
else
  echo "[warn] tag not found on remote; retrying explicit push"
  for i in 1 2 3; do
    sleep $((i*2))
    git push "$REMOTE" "$TAG" && break || true
  done
  if git ls-remote --tags "$REMOTE" | awk '{print $2}' | grep -qx "refs/tags/$TAG"; then
    echo "[ok] tag exists on remote after retry: $TAG"
  else
    echo "[error] failed to push tag $TAG to $REMOTE" >&2
    exit 3
  fi
fi

echo "[done] v$NEW_VER pushed. Check GitHub Actions: Release: roslyn-cli / Publish: mcp-server (npm)"
echo "- Release URL (runs): https://github.com/akiojin/unity-editor-mcp/actions/workflows/roslyn-cli-release.yml"
echo "- Publish URL (runs): https://github.com/akiojin/unity-editor-mcp/actions/workflows/mcp-server-publish.yml"
