# PWA Dashboard

瀏覽 anynote 內容的網頁介面。卡片牆、搜尋、篩選、可裝為 home screen app。

詳細安裝/部署/用法看 `pwa/README.md`。本檔只列**這個 dashboard 的設計決策與整體位置**。

## 為什麼有這個

`docs/architecture.md` 建立的系統只有「保存」入口。Sheet 雖然能直接看，但行動裝置上瀏覽體驗弱（欄位太多、圖片不會顯示縮圖、長文字截斷）。PWA 補這個缺。

## 設計選擇

| 議題 | 決定 | 理由 |
|---|---|---|
| 框架 | Vanilla JS（無框架） | 跟 chrome/icon-forge 一致；無 build step；總共 < 600 行 |
| 後端 | 沿用 Apps Script，加 `action=list` | 不再多一個服務 |
| 認證 | 一樣 secret，存在 localStorage | 跟 Chrome 擴充一致 |
| 寫入功能 | 不做 | 寫入有 Chrome 擴充 / Android / iPad，不重複輪子 |
| 排序 | 最新在最上，後端 reverse | client-side sorting 對 500 筆 OK，但既然查整段就一次處理掉 |
| 一次載多少 | 500 筆預設，最多 2000 | 個人用累積很慢，500 筆已涵蓋幾個月 |
| 儲存設定 | localStorage（每裝置/瀏覽器各設一次） | 不想在 query string 帶 secret |

## 檔案位置

```
~/aidaris/anynote/
├── apps-script/Code.gs   ← 加了 listEntries() 函式 + action=list 路由
└── pwa/
    ├── index.html        ← 入口
    ├── app.js            ← 主邏輯
    ├── styles.css        ← UI
    ├── manifest.json     ← PWA 設定
    ├── service-worker.js ← 離線快取
    └── icons/            ← icon PNGs
```

## 部署 PWA 的兩條路

**Mac 個人用**：直接 `open ~/aidaris/anynote/pwa/index.html`，file:// 即可瀏覽（service worker 不會啟動但不影響功能）。

**iPad/Android 要安裝為 PWA**：必須 HTTPS。最簡單兩條路：
- **GitHub Pages**：建 repo，pwa/ 內容當 site root（注意 GitHub Pages 不支援子目錄當 root，要拆 repo 或 rename 成 docs/）
- **Netlify Drop**：拖 `pwa/` 資料夾到 https://app.netlify.com/drop，1 分鐘拿到 HTTPS URL（不需 CLI）

詳細步驟看 `pwa/README.md`。

## 對應後端版本

- 後端必須是 **v5-list** 或更新（curl GET 看 `version` 欄位確認）
- 如果是 v4 或更舊：`docs/redeploy.md` 走一次重部署流程
