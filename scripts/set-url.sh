#!/bin/bash
# 把新的 Apps Script Web App URL 寫進三個 client 設定。
# 用法: ./scripts/set-url.sh 'https://script.google.com/macros/s/.../exec'

set -e
URL="$1"

if [ -z "$URL" ]; then
  echo "Usage: $0 <web-app-url>"
  exit 1
fi

if [[ "$URL" != https://script.google.com/macros/s/*/exec ]]; then
  echo "URL doesn't look right (expected https://script.google.com/macros/s/.../exec)"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 1. scripts/.env (test-backend.sh 從這個檔讀)
if [ -f "$ROOT/scripts/.env" ]; then
  sed -i '' "s|^ANYNOTE_URL=.*|ANYNOTE_URL='$URL'|" "$ROOT/scripts/.env"
  echo "✓ scripts/.env"
else
  echo "  scripts/.env 不存在 — 從 scripts/.env.example 複製並編輯"
fi

# 2. android local.properties (only if exists; never touches example)
if [ -f "$ROOT/android/local.properties" ]; then
  if grep -q '^ANYNOTE_URL=' "$ROOT/android/local.properties"; then
    sed -i '' "s|^ANYNOTE_URL=.*|ANYNOTE_URL=$URL|" "$ROOT/android/local.properties"
  else
    echo "ANYNOTE_URL=$URL" >> "$ROOT/android/local.properties"
  fi
  echo "✓ android/local.properties (rebuild needed: cd android && ./gradlew installDebug)"
else
  echo "  android/local.properties not found — copy local.properties.example first"
fi

# 3. Chrome extension stores URL in chrome.storage at runtime.
#    Cannot patch from disk; user must update via Options page.
echo ""
echo "⚠ Chrome extension: open 'options' page and replace URL there"
echo "   (chrome.storage values can't be edited from disk)"

# Verify GET response
echo ""
echo "── Verifying URL responds ──"
RESP=$(curl -sL "$URL")
echo "$RESP"
if echo "$RESP" | grep -q '"ok":true'; then
  VER=$(echo "$RESP" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')
  echo ""
  echo "✓ Live, version=${VER:-unknown}"
else
  echo "✗ Endpoint did not return ok:true — check deployment"
fi
