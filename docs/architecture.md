# Architecture

## 整體流程

```
[Mac Chrome 擴充]   ┐
[iPad Shortcut]     ├── HTTPS POST (form-encoded) ──> [Apps Script Web App]
[Android 原生 app]   ┘                                       │
                                                            ├── append row ──> [Google Sheet]
                                                            └── upload     ──> [Google Drive 資料夾]
```

## 認證

- **Web App 設定**：執行身分 = 部署者本人 (USER_DEPLOYING)；存取權 = 任何人 (ANYONE_ANONYMOUS)
- **應用層 secret**：每個 POST 必須帶 `secret=<隨機字串>` 在 form body，server 對照 Script Properties 裡的 SECRET
- secret 由 `openssl rand -base64 24` 產生
- 所有 client（Chrome / iPad Shortcut / Android）都用同一個 URL + 同一個 secret

## POST 介面（form-encoded）

| 欄位 | 必要 | 說明 |
|---|---|---|
| `secret` | 必要 | 應用層密碼 |
| `payload` | 必要 | JSON 字串，欄位見下 |
| `image_b64` | 選 | base64 圖片資料（client 端 fetch 不到 URL 時 fallback 用） |
| `image_mime` | 選 | 配合 image_b64 |

`payload` JSON 欄位：

| 欄位 | 必要 | 範例 / 說明 |
|---|---|---|
| `type` | 必要 | `url` / `highlight` / `image` |
| `source_url` | 通常有 | 來源網頁 |
| `title` | 選 | 沒給時 server 自動抓 (`<title>`) |
| `content` | 選 | highlight 模式的選取文字 |
| `image_url` | 選 | image 模式：server 會 UrlFetchApp 抓回來存 Drive |
| `tags` | 選 | 字串或字串陣列 |
| `device` | 選 | `mac-chrome` / `android` / `ipad` (用於 Sheet 統計) |

## 回應 JSON

- 成功：`{"ok":true,"row":N,"image":"<drive url>","image_error":""}`
- 失敗：`{"ok":false,"error":"<reason>"}`
  - `auth` — secret 不對
  - `missing type` — payload 沒給 type
  - `busy` — 30 秒內拿不到 LockService（極罕見）
  - 其他訊息 — 後端 exception

## Sheet 欄位 (順序固定)

| # | 欄位 | 範例 |
|---|---|---|
| 1 | `created_at` | `2026-05-02T05:30:15.000Z` |
| 2 | `type` | `url` / `highlight` / `image` |
| 3 | `source_url` | `https://news.ycombinator.com` |
| 4 | `title` | `Hacker News` (自動抓) |
| 5 | `content` | 選取的句子（highlight 才有） |
| 6 | `image_url` | Drive 連結（image 才有） |
| 7 | `favicon` | `https://www.google.com/s2/favicons?domain=...` |
| 8 | `tags` | `ai,reading` (逗號分隔) |
| 9 | `device` | `mac-chrome` / `android` / `ipad` |
| 10 | `status` | `inbox` (固定，未來可手動改 read/archived) |

## 安全模型

- **副帳號隔離**：anynote 部署在乾淨的副 Google 帳號，即使 scope 廣也只影響這個沒其他資料的帳號
- **Drive scope = `drive`**（廣權限）：因為 `drive.file` scope 不允許 `DriveApp.createFolder()`
- **Sheets scope = `spreadsheets`**（廣權限）：standalone script 沒法縮成單表
- **External request scope**：必要，給 `UrlFetchApp` 抓 metadata + 圖片用
- **secret 不入 git**：
  - 後端：存在 Apps Script Script Properties，從 setSecret() 函式寫入後手動把 source code 字串改回 placeholder
  - Mac Chrome：存 chrome.storage.local，options 頁設定
  - Android：存 `local.properties`（`.gitignore` 已排除），透過 BuildConfig 注入
  - iPad：存在 Shortcut 的表單欄位裡（iCloud 同步到 iPhone 是預期行為）
  - 開發測試：`scripts/test-backend.sh` 直接寫 secret，不要 commit

## 為什麼選這個架構

| 替代方案 | 為什麼不選 |
|---|---|
| 直接呼叫 Sheets API + OAuth | iPad Shortcut 對 OAuth 很不友善（沒有 refresh token UX） |
| GitHub Issues 當資料表 | 沒有 server-side `UrlFetchApp` 能力，metadata 抓取要 client 做、CORS 處理麻煩 |
| Notion / Airtable | 想要資料完全在自己 Google 帳號內、可隨時匯出 CSV |
| 自架 (Linkding/Karakeep) | 要維護 Docker、VPS、SSL，個人用 over-engineered |

Apps Script 的好處：免費、跑在 Google 內網、`UrlFetchApp` 沒 CORS、跟 Sheets/Drive 原生整合、無需 OAuth。代價是 deployment URL 行為怪（見 redeploy.md）。
