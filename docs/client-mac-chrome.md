# Mac Chrome 擴充

右鍵存連結 / 選取 / 圖片 / 整頁到 anynote。

## 安裝

1. Chrome 開 `chrome://extensions/`
2. 右上 **開發人員模式** 打開（必須一直開著，不然擴充會被停用）
3. 左上 **載入未封裝項目** → 選 `~/aidaris/anynote/chrome` 目錄
4. 應出現 anynote 在擴充列表（圖示是藍色方塊）

> **開發人員模式風險評估**：開著風險很低（只是「允許從本地載入未封裝擴充」），不會降低 Chrome 其他安全機制。最大風險是「被騙拖陌生資料夾進 Chrome」——只要不做這事就沒事。

## 第一次設定

1. 點擴充列表的 anynote → **詳細資料** → **擴充功能選項**（也可右鍵擴充圖示 → 選項）
2. **Web App URL**：貼後端 URL
3. **Secret**：貼 secret
4. 按 **Save**
5. 按 **Test connection** → 應顯示綠色「OK — wrote row N」
6. 開副帳號 Sheet 確認多一列 `device=mac-chrome-test`（可手動刪掉）

## 用法

任何網頁右鍵 → 看到 4 個選項（依當下 context 自動顯示）：

| 選項 | 何時顯示 | 存什麼 |
|---|---|---|
| anynote: save link | 在 `<a>` 上 | 連結 URL + 頁面 title |
| anynote: save highlight | 選了一段文字 | 完整選取（**不會被 1024 字截斷**） + 來源 URL + title |
| anynote: save image | 在 `<img>` 上 | 圖片下載到 Drive + 來源頁 |
| anynote: save page | 任何空白處 | 當前頁 URL + title |

成功會跳系統通知 `saved ✓ (row N)`。

## Debug

擴充壞掉時看 service worker console：

1. `chrome://extensions/` 找 anynote
2. **檢查視圖：service worker** ← 點下去開 DevTools
3. 切到 **Console** 分頁
4. 重做一次右鍵動作 → 看 console 紅字錯誤

常見錯誤對照 `docs/troubleshooting.md`。

## 改了 Code.gs 之後

如果 redeploy 後 URL 變了：
1. 擴充選項頁更新 Web App URL
2. Save → Test connection 確認

擴充程式碼本身沒改的話**不需要重新載入擴充**。

## 改了擴充本身（chrome/ 目錄裡）

改 `background.js` / `manifest.json` 之後：
1. `chrome://extensions/` → anynote → ↻ 重新載入
2. 如果加了新 permissions（例如增加 host_permissions），Chrome 可能跳「需要新權限」提示，按確定
3. 同時關掉舊的 service worker DevTools 視窗，重開新的（綁到新 worker）

## 擴充更新（之後想加新功能時）

寫完 → reload 擴充 → 測試。沒上 Chrome Web Store 就不需要打包。

## 不裝在 Chrome Web Store 的代價

- 每次 Chrome 重啟可能會看到「停用未檢查的擴充功能」橫幅 → 點 X 關掉即可，下次重啟才會再出現
- 沒有自動更新（你改 code 了要自己 reload）

想消除這些煩擾可以 $5 申請 Chrome Web Store 開發者帳號上架成 unlisted。對個人用 over-engineered，跳過。
