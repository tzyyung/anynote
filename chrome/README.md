# anynote Chrome extension

Right-click → save links, highlighted text, images, or whole pages to anynote.

## 安裝（unpacked）

1. Chrome 開 `chrome://extensions/`
2. 右上 **開發人員模式** 打開
3. 左上 **載入未封裝項目**
4. 選 `~/aidaris/anynote/chrome` 目錄
5. 應出現 **anynote** 在擴充列表

## 設定

第一次裝完，點擴充圖示 → 選項（或從擴充列表點 **詳細資料 → 擴充功能選項**）：
- **Web App URL**：你的 `/exec` URL
- **Secret**：setSecret() 用的那串

按 **Save**，然後按 **Test connection**——成功會在 Sheet 寫一列 `anynote test ping`，可進去刪掉。

## 用法

任何網頁右鍵 → 看到 4 個選項：

| 選項 | 觸發情境 | 存什麼 |
|---|---|---|
| **anynote: save link** | 在 `<a>` 上右鍵 | 該連結 URL + 頁面 title |
| **anynote: save highlight** | 選一段文字右鍵 | 選取的句子 + 來源 URL + title |
| **anynote: save image** | 在 `<img>` 上右鍵 | 圖片 URL（server 會下載到 Drive） + 來源頁 |
| **anynote: save page** | 任何空白處右鍵 | 當前頁 URL + title |

成功會跳系統通知 `saved ✓ (row N)`。

## Debug

擴充背景 service worker 的 console：
1. `chrome://extensions/` 找到 anynote
2. 點 **檢查視圖：service worker**
3. console 會看到 `[anynote] ...` log

常見問題：
- 通知顯示 `failed: auth` → secret 不對
- 通知說 missing config → 還沒設 URL/secret，去選項頁
- 圖片有時抓不到 → server 端 `UrlFetchApp` 對某些網站（要 cookie 的、CORS 限制的）會失敗，fallback 會把原 URL 寫進 `image_url` 欄。第一版接受。

## 之後可能補的

- icon（目前用通知裡的 inline SVG，擴充列表會顯示預設拼圖圖示）
- 圖片 fallback：server 抓不到時 client 端 fetch + base64 上傳
- popup UI：用「擴充圖示一鍵存當前頁」（不用右鍵）
