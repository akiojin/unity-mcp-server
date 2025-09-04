#!/usr/bin/env bash
set -euo pipefail

# install-roslyn-cli.sh
# Downloads a prebuilt roslyn-cli binary from GitHub Releases and places it under
#   ./.tools/roslyn-cli/<rid>/roslyn-cli
#
# Usage:
#   ./scripts/install-roslyn-cli.sh [--version <ver>] [--rid <rid>] [--dest <dir>] [--yes] [--token <gh_token>]
#
# Defaults:
#   --version    : read from mcp-server/package.json; fallback to latest release
#   --rid        : auto-detected (linux-x64 | osx-x64 | osx-arm64 | win-x64)
#   --dest       : ./.tools/roslyn-cli
#   --yes        : non-interactive
#   --token      : GitHub token for higher rate limits (optional)

VERSION=""
RID=""
DEST=".tools/roslyn-cli"
YES=false
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) VERSION="$2"; shift 2;;
    --rid) RID="$2"; shift 2;;
    --dest) DEST="$2"; shift 2;;
    --yes|-y) YES=true; shift;;
    --token) GITHUB_TOKEN="$2"; shift 2;;
    -h|--help)
      sed -n '1,60p' "$0" | sed -n '1,40p'; exit 0;;
    *) echo "Unknown arg: $1" >&2; exit 1;;
  esac
done

detect_rid() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"
  case "$os" in
    Linux) echo linux-x64;;
    Darwin)
      if [[ "$arch" == "arm64" || "$arch" == "aarch64" ]]; then echo osx-arm64; else echo osx-x64; fi
      ;;
    CYGWIN*|MINGW*|MSYS*) echo win-x64;;
    *) echo "Unsupported OS: $os" >&2; exit 1;;
  esac
}

detect_version_from_pkg() {
  # Try Node first, then grep fallback
  if command -v node >/dev/null 2>&1 && [[ -f mcp-server/package.json ]]; then
    node -p "require('./mcp-server/package.json').version" 2>/dev/null || true
  elif [[ -f mcp-server/package.json ]]; then
    grep -o '"version"\s*:\s*"[^"]\+"' mcp-server/package.json | head -n1 | sed 's/.*"\([^"]\+\)"/\1/' || true
  else
    echo ""
  fi
}

http_get() {
  local url="$1"
  local out
  if [[ -n "$GITHUB_TOKEN" ]]; then
    out=$(curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" -H 'User-Agent: unity-editor-mcp' "$url")
  else
    out=$(curl -fsSL -H 'User-Agent: unity-editor-mcp' "$url")
  fi
  echo "$out"
}

download_to() {
  local url="$1" dest="$2"
  if [[ -n "$GITHUB_TOKEN" ]]; then
    curl -fL --retry 3 --retry-all-errors -H "Authorization: Bearer $GITHUB_TOKEN" -H 'User-Agent: unity-editor-mcp' -o "$dest" "$url"
  else
    curl -fL --retry 3 --retry-all-errors -H 'User-Agent: unity-editor-mcp' -o "$dest" "$url"
  fi
}

sha256_of() {
  local f="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$f" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$f" | awk '{print $1}'
  else
    echo ""  # no hasher; skip verification
  fi
}

confirm() {
  $YES && return 0
  read -r -p "$1 [y/N] " ans || true
  [[ "$ans" == "y" || "$ans" == "Y" ]]
}

main() {
  if [[ -z "$RID" ]]; then RID="$(detect_rid)"; fi
  if [[ -z "$VERSION" ]]; then VERSION="$(detect_version_from_pkg)"; fi

  local tag_url asset_name exe_name
  exe_name="roslyn-cli"
  if [[ "$RID" == win-x64 ]]; then exe_name="roslyn-cli.exe"; fi

  if [[ -n "$VERSION" ]]; then
    tag_url="https://api.github.com/repos/akiojin/unity-editor-mcp/releases/tags/roslyn-cli-v${VERSION}"
  else
    tag_url="https://api.github.com/repos/akiojin/unity-editor-mcp/releases/latest"
  fi

  echo "[install] Resolving release info (${tag_url})"
  local json
  json="$(http_get "$tag_url")"
  if [[ -z "$json" ]]; then echo "Failed to fetch release info" >&2; exit 1; fi

  # Find asset URL that contains rid
  local url
  url="$(printf '%s' "$json" | grep -E '"browser_download_url"' | grep -i "${RID}" | sed -E 's/.*"browser_download_url"\s*:\s*"([^"]+)".*/\1/' | head -n1)"
  if [[ -z "$url" ]]; then echo "No asset found for RID ${RID}" >&2; exit 1; fi

  # Optional checksum file URL
  local sum_url
  sum_url="$(printf '%s' "$json" | grep -E '"browser_download_url"' | grep -i 'checksum\|sha256\|SUM' | sed -E 's/.*"browser_download_url"\s*:\s*"([^"]+)".*/\1/' | head -n1 || true)"

  local dest_dir="${DEST}/${RID}"
  mkdir -p "$dest_dir"
  local tmpfile
  tmpfile="${dest_dir}/${exe_name}.download"
  echo "[install] Downloading asset -> $tmpfile"
  download_to "$url" "$tmpfile"

  if [[ -n "$sum_url" ]]; then
    echo "[install] Downloading checksums"
    local sums
    sums="$(http_get "$sum_url" || true)"
    if [[ -n "$sums" ]]; then
      local expected
      expected="$(printf '%s' "$sums" | grep -i "$(basename "$url")" | awk '{print $1}' | head -n1 || true)"
      if [[ -n "$expected" ]]; then
        local actual
        actual="$(sha256_of "$tmpfile")"
        if [[ -n "$actual" && "$expected" != "$actual" ]]; then
          rm -f "$tmpfile"
          echo "Checksum mismatch: expected=$expected actual=$actual" >&2
          exit 1
        fi
      fi
    fi
  fi

  local final="${dest_dir}/${exe_name}"
  if [[ -f "$final" ]]; then
    if ! confirm "Replace existing ${final}?"; then
      echo "[install] Aborted by user"
      rm -f "$tmpfile"
      exit 0
    fi
  fi

  mv -f "$tmpfile" "$final"
  if [[ "$RID" != win-x64 ]]; then chmod 0755 "$final"; fi
  echo "[install] Installed: $final"
}

main "$@"

