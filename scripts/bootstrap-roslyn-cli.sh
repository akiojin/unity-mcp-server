#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
pushd "$ROOT_DIR" >/dev/null

if ! command -v dotnet >/dev/null 2>&1; then
  echo "dotnet SDK is required. Please install .NET 8+" >&2
  exit 1
fi

RID=${1:-}
if [ -z "$RID" ]; then
  # try to guess RID
  UNAME_S=$(uname -s)
  UNAME_M=$(uname -m)
  if [[ "$UNAME_S" == "Linux" ]]; then RID="linux-x64"; fi
  if [[ "$UNAME_S" == "Darwin" ]]; then
    if [[ "$UNAME_M" == "arm64" ]]; then RID="osx-arm64"; else RID="osx-x64"; fi
  fi
  if [[ "$UNAME_S" == MINGW* || "$UNAME_S" == CYGWIN* ]]; then RID="win-x64"; fi
fi

OUT_DIR=".tools/roslyn-cli/${RID}"
mkdir -p "$OUT_DIR"

echo "Publishing roslyn-cli for RID=$RID ..."
dotnet publish roslyn-cli/roslyn-cli.csproj -c Release -r "$RID" --self-contained true -o "$OUT_DIR"

echo "Done. Binary at $OUT_DIR"
popd >/dev/null

