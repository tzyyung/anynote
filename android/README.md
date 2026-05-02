# anynote Android client

從手機分享選單把 URL / 文字 / 圖片送到 anynote 後端。

## 設定

1. 複製 `local.properties.example` 成 `local.properties`
2. 編輯 `local.properties` 填三個值：
   - `sdk.dir` = Android SDK 路徑（Android Studio 通常自動填）
   - `ANYNOTE_URL` = 你的 Apps Script Web App URL
   - `ANYNOTE_SECRET` = Script Properties 裡那組 secret

## 用 Android Studio 開

```
File → Open → 選 ~/aidaris/anynote/android 目錄
```

第一次 sync 會下載 Gradle/dependencies，等它跑完。

## 跑到手機

1. 開發者選項 → USB 偵錯打開
2. 接 USB 到 Mac，授權
3. Android Studio 右上裝置選單應出現你的手機
4. 按綠色 ▶ Run
5. 第一次會在手機上裝 anynote app（沒有 launcher 圖示，只在分享選單出現）

## 測試

1. 開 Chrome（手機）→ 任何網頁 → 三點選單 → 分享 → 找 **anynote**
2. 應跳出 Toast：`anynote: sending…` → `anynote: saved ✓`
3. 開 Sheet 確認多一列、device 欄是 `android`

## 行為

| 分享什麼 | type 欄位 | content 欄位 | source_url 欄位 |
|---|---|---|---|
| 純 URL | `url` | (空) | URL |
| 文字+URL | `highlight` | 整段文字 | URL（regex 抽出） |
| 純文字 | `highlight` | 整段文字 | (空) |
| 圖片 | `image` | (空) | `android-share` |

## Debug

Toast 顯示 `failed ✗` 時：
```
adb logcat | grep anynote
```
會看到 HTTP code 跟 server 回應內容。常見錯誤：
- `code=200 resp={"ok":false,"error":"auth"}` → secret 不對
- 連線失敗 → URL 拼錯或網路問題
