#!/usr/bin/env bash
#
# Download the pinned PocketBase binary for the host OS/arch into the repo root.
# Idempotent: re-running is a no-op once the correct version is present.
set -euo pipefail

cd "$(dirname "$0")/.."

PB_VERSION="${PB_VERSION:-0.40.4}"

if [ -x ./pocketbase ] && ./pocketbase --version 2>/dev/null | grep -q "$PB_VERSION"; then
  echo "PocketBase $PB_VERSION already present."
  exit 0
fi

case "$(uname -s)" in
  Linux) os="linux" ;;
  Darwin) os="darwin" ;;
  *) echo "Unsupported OS: $(uname -s)" >&2; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64|amd64) arch="amd64" ;;
  aarch64|arm64) arch="arm64" ;;
  armv7l|armv7) arch="armv7" ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

zip="pocketbase_${PB_VERSION}_${os}_${arch}.zip"
url="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${zip}"

echo "Downloading ${url}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if command -v curl >/dev/null 2>&1; then
  curl -fL "$url" -o "$tmp/$zip"
elif command -v wget >/dev/null 2>&1; then
  wget -q "$url" -O "$tmp/$zip"
else
  echo "Need curl or wget to download PocketBase." >&2
  exit 1
fi

unzip -o -q "$tmp/$zip" pocketbase -d .
chmod +x ./pocketbase

echo "Installed $(./pocketbase --version)"
