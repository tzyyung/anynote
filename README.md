# anynote

跨裝置擷取網頁、句子、圖片到 Google Sheets 的個人收藏系統。

```
[Mac Chrome 擴充] ──┐
[iPad Shortcut]   ─┼──POST──> [Apps Script Web App] ──> [Google Sheet]
[Android 原生 app] ─┘                                 └─> [Google Drive (圖片)]
```

## 目錄結構

```
anynote/
├── apps-script/      Apps Script 後端 (Google Sheets/Drive)
├── chrome/           Mac Chrome 擴充 (Manifest V3) — 寫入入口
├── android/          Android 原生 app (Kotlin + Gradle) — 寫入入口
├── pwa/              PWA dashboard — 瀏覽用網頁介面
├── scripts/          開發 / 部署小工具
└── docs/             ↓ 看這裡
    ├── architecture.md       資料模型 + 整體架構
    ├── backend-setup.md      從零設定 Apps Script + Sheet
    ├── redeploy.md           改後端 code 後如何重部署 ⚠ URL 會變
    ├── client-mac-chrome.md  Mac Chrome 擴充安裝
    ├── client-android.md     Android app build + install
    ├── client-ipad.md        iPad / iPhone Shortcut 設定
    ├── pwa.md                PWA dashboard 設計決策
    └── troubleshooting.md    踩過的坑與解法
```

## 第一次設定的順序

1. `docs/backend-setup.md` — 建副帳號、建 Sheet、部署 Apps Script
2. `docs/client-mac-chrome.md`
3. `docs/client-android.md`
4. `docs/client-ipad.md`

之後改 code → `docs/redeploy.md`。
