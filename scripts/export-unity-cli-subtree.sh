#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/export-unity-cli-subtree.sh <remote-or-url> [dest-branch] [release-tag]

Arguments:
  remote-or-url   Git remote name or repository URL.
  dest-branch     Destination branch name (default: main).
  release-tag     Optional tag name to push after branch sync.

Examples:
  ./scripts/export-unity-cli-subtree.sh origin main
  ./scripts/export-unity-cli-subtree.sh git@github.com:akiojin/unity-cli.git main unity-cli-v0.1.0
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

TARGET="${1}"
DEST_BRANCH="${2:-main}"
RELEASE_TAG="${3:-}"
TMP_BRANCH="tmp/unity-cli-export-$(date +%s)"
TEMP_REMOTE="unity-cli-export-temp"
ADDED_REMOTE=0

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree must be clean before export." >&2
  exit 1
fi

if git remote get-url "${TARGET}" >/dev/null 2>&1; then
  REMOTE_NAME="${TARGET}"
else
  REMOTE_NAME="${TEMP_REMOTE}"
  git remote add "${REMOTE_NAME}" "${TARGET}"
  ADDED_REMOTE=1
fi

cleanup() {
  git branch -D "${TMP_BRANCH}" >/dev/null 2>&1 || true
  if [[ ${ADDED_REMOTE} -eq 1 ]]; then
    git remote remove "${REMOTE_NAME}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

git subtree split --prefix unity-cli --branch "${TMP_BRANCH}" >/dev/null
git push "${REMOTE_NAME}" "${TMP_BRANCH}:${DEST_BRANCH}"

if [[ -n "${RELEASE_TAG}" ]]; then
  git push "${REMOTE_NAME}" "${TMP_BRANCH}:refs/tags/${RELEASE_TAG}"
fi

echo "unity-cli subtree exported to ${REMOTE_NAME}:${DEST_BRANCH}"
if [[ -n "${RELEASE_TAG}" ]]; then
  echo "tag pushed: ${RELEASE_TAG}"
fi
