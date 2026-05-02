# anynote PWA

瀏覽你存進 anynote 的所有東西。卡片牆 + 搜尋 + 篩選。

## 結構

```
pwa/
├── index.html
├── app.js              ← 應用主邏輯（vanilla JS）
├── styles.css          ← 含 dark mode（自動跟系統）
├── manifest.json       ← PWA 安裝設定
├── service-worker.js   ← 離線 shell 快取
└── icons/              ← 192/512 PNG icons
```

## 跑起來（最快路徑）

**A. 本機 file:// 直接開**（Mac 上看夠用，**iOS/Android 不能裝為 PWA**）：
```bash
open ~/aidaris/anynote/pwa/index.html
```
首次開啟會跳設定 → 填 URL + secret → 看到資料。

**B. 本機 HTTP 伺服器**（讓 service worker / PWA install 完整運作）：
```bash
cd ~/aidaris/anynote/pwa
python3 -m http.server 8000
```
然後 Mac 瀏覽器開 http://localhost:8000

**C. GitHub Pages（推薦，能在手機裝）**：
1. `cd ~/aidaris/anynote && git init && git add . && git commit -m "init"`
2. 在 GitHub 建一個 private repo `anynote`
3. `git remote add origin git@github.com:你的-username/anynote.git && git push -u origin main`
4. repo Settings → Pages → Source: `main` branch, folder: `/pwa`（這樣會把 pwa 子資料夾當 site root）
5. 等 1–2 分鐘，拿到 `https://<user>.github.io/anynote/` URL
6. 手機瀏覽器開這個 URL → 加到主畫面

> 注意：GitHub Pages 預設**只支援 root 或 `/docs`** 不支援自訂子資料夾。**簡單做法**：repo 結構保持原樣，root level 加一個 `index.html` 重導到 `pwa/`，或把 `pwa/` 改名成 `docs/`（GitHub Pages 認的目錄）。
> **更簡單**：另外建一個只放 `pwa/` 內容的 repo（例如 `anynote-pwa`），整個當 site root。

**D. Vercel / Netlify**：拖整個 `pwa/` 資料夾到 https://app.netlify.com/drop 即可拿到 HTTPS URL，免 CLI。

## 安裝為 PWA（手機）

需求：必須是 HTTPS（`localhost` 也算）—— file:// 不行。

- **Chrome / Edge**：網址列旁邊會出現「安裝」icon，點即可
- **Safari (iOS)**：分享 → 加入主畫面
- **Android Chrome**：選單三點 → 安裝 anynote

裝完之後從主畫面打開像 native app，offline 也能用（看快取資料）。

## 設定

第一次開會跳設定 dialog：
- **Web App URL**：`/exec` 結尾的 URL
- **Secret**：anynote secret

存在瀏覽器 localStorage，**不會**送到任何第三方。每個瀏覽器 / 裝置要各設一次。

## 用法

| 操作 | 行為 |
|---|---|
| 點卡片 (type=url) | 在新分頁開連結 |
| 點卡片 (type=highlight) | 複製內容到剪貼板 + 開來源 URL |
| 點卡片 (type=image) | 開圖片放大 |
| ↻ 按鈕 | 重新從後端 fetch |
| ⚙ 按鈕 | 改 URL/secret |
| 搜尋框 | 即時 filter（標題、內容、URL、tag） |
| Type chips | 全部 / url / highlight / image |
| Device chips | 自動從資料動態產生 |

## 限制 / 已知行為

- **一次最多載 500 筆**（後端 `params.limit` 可調，最多 2000）
- **Drive 圖片需要登入副帳號**才看得到——現階段你必須在同瀏覽器登入過副帳號 Google
- **沒有編輯/刪除功能**——只讀。要刪請去 Sheet 直接刪
- **沒有狀態切換 UI**（inbox → read → archived）——之後可加

## 後端依賴

PWA 透過 `action=list` 讀資料，需要 backend 是 **v5-list** 以上版本：

```bash
curl -sL '<your-url>'
# 應看到 "version":"v5-list"
```

如果還是 v4-hardened，去 `docs/redeploy.md` 重部署。

## Debug

開瀏覽器 DevTools console，看 `[anynote]` 開頭的訊息。

常見：
- `auth` 錯誤 → secret 不對
- `non-JSON response` → URL 寫錯，POST 沒到 server
- 空白卡片牆 → Sheet 真的沒資料、或 device 篩選沒重置

## 之後可加（不急）

- 按 row 刪除（POST `action=delete` + 後端對應 handler）
- 標記 status (inbox/read/archived) 切換
- 全文搜尋 client-side fuzzy
- 匯出選定筆 → markdown / Notion
