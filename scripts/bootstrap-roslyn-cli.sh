#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
pushd "$ROOT_DIR" >/dev/null

if ! command -v dotnet >/dev/null 2>&1; then
  echo "dotnet SDK is required. Attempting to install local .NET 9 SDK..." >&2
fi

# Ensure .NET 9 SDK is available (install locally under .tools/dotnet if missing)
NEED_DOTNET9=1
if command -v dotnet >/dev/null 2>&1; then
  if dotnet --list-sdks | grep -E '^9\.' >/dev/null 2>&1; then
    NEED_DOTNET9=0
  fi
fi

if [ "$NEED_DOTNET9" -eq 1 ]; then
  DOTNET_DIR="$ROOT_DIR/.tools/dotnet"
  mkdir -p "$DOTNET_DIR"
  if [ ! -f "$DOTNET_DIR/dotnet" ] && [ ! -f "$DOTNET_DIR/dotnet.exe" ]; then
    echo "Installing .NET 9 SDK locally to $DOTNET_DIR ..."
    curl -sSL https://dot.net/v1/dotnet-install.sh -o "$DOTNET_DIR/dotnet-install.sh"
    bash "$DOTNET_DIR/dotnet-install.sh" --channel 9.0 --install-dir "$DOTNET_DIR"
  fi
  export DOTNET_ROOT="$DOTNET_DIR"
  export PATH="$DOTNET_DIR:$PATH"
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
dotnet --info | sed -n '1,40p' || true
# Publish framework-dependent (requires system .NET 9 runtime), avoids assembly resolution issues on some environments
dotnet publish roslyn-cli/roslyn-cli.csproj -c Release -r "$RID" --self-contained false -o "$OUT_DIR"

echo "Done. Binary at $OUT_DIR"
popd >/dev/null
