# Troubleshooting

按症狀找。每條都是真的踩過的坑。

## 後端

### `{"ok":false,"error":"auth"}`
- `test-backend.sh` 的 `ANYNOTE_SECRET` 跟 Apps Script `setSecret()` 寫進去的不一致
- 在 Apps Script 編輯器跑 `showProps`，看執行記錄印出的 SECRET 跟 client 用的對齊

### Apps Script 跑 setup() 報「Specified permissions are not sufficient to call DriveApp.createFolder」
- `appsscript.json` 用了 `drive.file` scope（只能存取 app 自建檔案）
- 改回 `https://www.googleapis.com/auth/drive`，存檔，再跑 setup

### `{"ok":false,"error":"missing type"}`
- POST 沒帶 `payload` 欄位，或 payload 不是 JSON 字串
- iPad Shortcut 最常見：把 `payload` 欄位的值忘記放整個 JSON template

### `{"error":"Unexpected token..., is not valid JSON","ok":false}`
- payload 裡某個欄位沒被引號包起來。例如：
  ```
  {"source_url":https://...}    ← 錯
  {"source_url":"https://..."}  ← 對
  ```
- iPad Shortcut 99% 是這個——「捷徑輸入」變數插入時左右的引號被一起刪掉了

### curl 測試回 Google Drive 「找不到網頁」HTML
- curl 用了 `-X POST` 加 `--post30x` 強制 redirect 仍 POST
- Apps Script 流程：POST `/exec` → 302 redirect → `/echo` (這段必須 GET)
- 修法：用 `curl -sL "$URL" --data-urlencode ...`，不要 `-X POST`

### 改完 Code.gs 部署完，curl 看不到改動
- 99% 是 client 在打舊 deployment URL
- 在 doGet 加 version 標籤，每次部署 bump 一下（v3 → v4 → v5）
- curl GET 看 version 對不對得上 Code.gs 裡寫的字串
- 對不上 = client 端 URL 還沒更新到最新部署

### 部署選「原來版本」結果新 code 沒生效
- 「原來版本」只是重新發行同一個快照
- 改 code 必選 **建立新版本**

### 圖片寫進 Sheet 的 image_url 是原網址，不是 Drive 連結
- `saveImageFromUrl` throw 了，被 try/catch 接住 fallback 成原 URL
- 看回應的 `image_error` 欄位（v4+ 才有）會印錯誤原因
- 常見：目標站需要 cookie / 有 referer 檢查 / 回 403

## Mac Chrome 擴充

### 通知都沒跳出來但 Sheet 有寫入
- 通知 iconUrl 失敗（最早的版本用 SVG data URL，Chrome macOS 不收）
- v0.1+ 已修，用實體 `icon48.png`
- 若還壞掉，Console 看是不是 `Unable to download all specified images`

### Console 出現 btoa 錯誤 `Failed to execute 'btoa' on 'WorkerGlobalScope'`
- code 裡某處 btoa() 一個含 emoji / CJK 的字串（btoa 只認 Latin1）
- 修法：那個位置不用 btoa，或字串先 `unescape(encodeURIComponent(s))` 再 btoa
- 我們的版本已經沒這問題

### Console 出現 `Unable to download all specified images`
- iconUrl 用了 SVG data URL → 改用實體 PNG（`chrome.runtime.getURL("icon48.png")`）

### 改了 background.js 但行為沒變
- 沒重新載入擴充：`chrome://extensions/` → anynote → ↻
- 同時要重開 service worker DevTools（舊的綁在舊 worker 上）

### Test connection 顯示 `failed: ...`
- 看顯示的錯誤訊息，對照後端那段

## Android

### Toast 顯示 `failed: auth`
- `local.properties` 的 ANYNOTE_SECRET 跟後端不一致
- 改完要重 build：`./gradlew installDebug`

### Toast 顯示 `image too large or unreadable`
- 圖 > 8 MB 限制（`MAX_IMAGE_BYTES`）→ 預期行為
- 或 ContentResolver 開不了 uri（罕見：source app 沒給 read permission）

### 分享進來的圖被當文字傳
- intent type 是 `text/plain` 而非 `image/*`
- 確認在 source app 那邊真的選的是「分享圖片」而非「分享連結」

### Build 失敗：`SDK location not found`
- `local.properties` 沒設 `sdk.dir`
- macOS 預設路徑：`/Users/<your-username>/Library/Android/sdk`（Android Studio Settings → System Settings → Android SDK 看實際值）

### Build 失敗：Gradle 下載卡住
- 第一次 download Gradle 8.x 要 5+ 分鐘
- 中文網路下載慢，多等
- 真的 timeout 就 `./gradlew --refresh-dependencies installDebug`

### 改了 Code.gs URL 變了，Android 還用舊 URL
- BuildConfig 是編進 APK 的，URL 改了必須重 build
- `./gradlew installDebug` 之後就會用新 URL

## iPad Shortcut

### Shortcut 出現在分享選單但點下去無聲消失，Sheet 沒新列
- payload JSON 格式錯誤（最常見）
- 加「快速查看」動作 debug，看 server 回應

### Shortcut 不出現在分享選單
- 在編輯器頂端 `從 分享表單 接收 ...` 那行的接受類型沒勾 URL
- 或 Shortcut 設定的 ⓘ 裡「在分享頁面中顯示」沒打開（新版預設打開）

### 從 Safari 分享 OK，從 Chrome 分享有問題
- Chrome on iOS 對「分享文字選取」的處理跟 Safari 不一致
- 純 URL 分享通常都 OK，文字分享建議在 Safari 操作

## 通用：誰在打哪個 URL？

當你不確定 client 在打哪個 URL：

```bash
# Mac Chrome 擴充
# chrome://extensions/ → anynote → 詳細資料 → 擴充功能選項 → 看 URL 欄

# Android
grep ANYNOTE_URL ~/aidaris/anynote/android/local.properties

# 命令列測試
grep ANYNOTE_URL ~/aidaris/anynote/scripts/test-backend.sh

# iPad
# 編輯器打開 anynote shortcut → 看 取得 URL 內容 那個動作的 URL 欄

# 後端目前最新部署的 URL
# Apps Script 編輯器 → 部署 → 管理部署作業 → 看每個 deployment 的 URL
```

對齊四個 URL 都一致，問題通常就消失了。
