#!/bin/bash
# Backend smoke test.
#
# 用法：
#   1. cp scripts/.env.example scripts/.env
#   2. 編輯 scripts/.env 填入 ANYNOTE_URL + ANYNOTE_SECRET
#   3. chmod +x scripts/test-backend.sh
#   4. ./scripts/test-backend.sh
#
# 也可從環境變數直接帶（會覆蓋 .env）：
#   ANYNOTE_URL='...' ANYNOTE_SECRET='...' ./scripts/test-backend.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 讀 .env（如果環境變數沒帶）
if [ -z "$ANYNOTE_URL" ] || [ -z "$ANYNOTE_SECRET" ]; then
  if [ -f "$ROOT/scripts/.env" ]; then
    # shellcheck disable=SC1091
    source "$ROOT/scripts/.env"
  fi
fi

if [ -z "$ANYNOTE_URL" ] || [ -z "$ANYNOTE_SECRET" ]; then
  echo "❌ 請先設定 ANYNOTE_URL 與 ANYNOTE_SECRET" >&2
  echo "   cp scripts/.env.example scripts/.env  → 編輯後再跑" >&2
  exit 1
fi

echo "── 測試 1：純 URL（自動抓 title + favicon）──"
curl -sL "$ANYNOTE_URL" \
  --data-urlencode "secret=$ANYNOTE_SECRET" \
  --data-urlencode 'payload={"type":"url","source_url":"https://news.ycombinator.com","device":"curl"}'
echo
echo

echo "── 測試 2：highlight（URL + 句子 + tags）──"
curl -sL "$ANYNOTE_URL" \
  --data-urlencode "secret=$ANYNOTE_SECRET" \
  --data-urlencode 'payload={"type":"highlight","source_url":"https://news.ycombinator.com/item?id=1","content":"This is a sentence worth remembering.","tags":["test","ai"],"device":"curl"}'
echo
echo

echo "── 測試 3：image_url（server 抓圖存 Drive）──"
curl -sL "$ANYNOTE_URL" \
  --data-urlencode "secret=$ANYNOTE_SECRET" \
  --data-urlencode 'payload={"type":"image","source_url":"https://www.google.com","image_url":"https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png","device":"curl"}'
echo
echo

echo "── 測試 4：認證錯誤（應拒絕）──"
curl -sL "$ANYNOTE_URL" \
  --data-urlencode 'secret=wrong-secret' \
  --data-urlencode 'payload={"type":"url","source_url":"https://example.com"}'
echo
echo

echo "✓ 跑完後請檢查："
echo "  - 副帳號 Drive 的 anynote sheet 應多 3 列"
echo "  - 副帳號 Drive 的 anynote-images 資料夾應多 1 張 google logo"
