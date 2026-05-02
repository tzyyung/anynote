# iPad / iPhone Shortcut

從 Safari 分享選單把網頁 URL POST 到 anynote。

> **iCloud 同步**：在 iPad 建好的 Shortcut 會自動同步到同 Apple ID 的 iPhone，不用做兩次。

## 你需要的兩個值

| 值 | 從哪取得 |
|---|---|
| ANYNOTE_URL | `/exec` 結尾的後端 URL |
| ANYNOTE_SECRET | `setSecret()` 用的字串 |

## 建立步驟（憑記憶複現）

### 1. 開捷徑 app，新增空白捷徑

- 開 **捷徑** app（圖示是兩個彩色方塊斜疊）
- 右上 **＋** 新增
- 命名 `anynote`

### 2. 設定接受分享輸入

捷徑編輯畫面預設第一行就有 `從 [分享表單] 接收 [App 和其他 18 個]`。

- **點藍色「App 和其他 18 個」** → 跳出類型清單
- 取消「全選」 → 只勾 **URL** 與 **Safari 網頁**
- 完成

第一行應變成 `從 分享表單 接收 Safari 網頁和 URL`。

### 3. 加入「取得 URL 的內容」動作

- 右側搜尋列輸入 `取得 URL`
- 點「取得 URL 的內容」加入
- 加入後動作會自動帶 `取得 [捷徑輸入] 內容`，**這個 URL 用錯變數**——要改成 anynote endpoint

### 4. 改 URL 為 anynote endpoint

- 點藍色「捷徑輸入」變數標籤
- 跳出選單 → 選 **清除變數** 或類似選項
- 欄位變空 → 直接打 anynote URL（`https://script.google.com/macros/s/.../exec`）

### 5. 改 Method 為 POST

- 點 `方式` 那行的 `GET`
- 選單選 `POST`
- 選 POST 後動作自動展開「**標題**」「**要求內文**」兩個欄位

### 6. 設要求內文 = 表單

- 點 `要求內文` → 應該預設或選擇「**表單**」

### 7. 加 secret 欄位

- 點 **加入新欄位**
- 鍵 (Key)：`secret`
- 文字 (Value)：直接打 secret 字串

### 8. 加 payload 欄位

- 點 **加入新欄位**
- 鍵 (Key)：`payload`
- 文字 (Value)：先打字面字串
  ```
  {"type":"url","source_url":"X","device":"ipad"}
  ```

### 9. 把 X 替換成「捷徑輸入」變數

⚠ **這步是最常踩坑的**：變數插入後**雙引號要保留**，不然後端會拒絕 JSON 解析。

- 點 payload 那行的值（會跳鍵盤跟工具列）
- 把字面字串中的 `X` 刪掉（**只刪 X，不要刪左右的 `"`**）
- cursor 停在 `"<這裡>"` 兩個引號之間
- 鍵盤上方工具列找「**捷徑輸入**」按鈕（藍色變數標籤，或先按 `+` 再選）
- 點下去插入變數

最終 payload 值看起來：
```
{"type":"url","source_url":"[捷徑輸入]","device":"ipad"}
```
（中括號是變數膠囊）

### 10. 完成 & 測試

- 左上 ◀ 退出（自動存）
- 開 Safari 隨便逛網頁 → 分享 → 找 **anynote** → 點下去
- 應跑一個小動畫然後消失
- 開副帳號 Sheet 確認多一列、device=ipad

## 加通知（可選但推薦）

預設沒任何視覺回饋，無聲執行。加個通知比較安心：

1. 編輯 anynote 捷徑
2. 在「取得 URL 的內容」動作後加 **顯示通知**
3. 標題：`anynote`
4. 內文：可以用變數插「取得 URL 的內容」結果（會顯示 server 回的 JSON），或固定打 `已儲存`

## Debug

跑一次失敗時想看 server 回應：

1. 編輯捷徑 → 在 POST 動作後**暫時加 `快速查看`**（Quick Look）動作
2. 從 Safari 分享 → 會跳出視窗顯示後端 JSON 回應
3. 看到的東西對應：

| 看到 | 意思 |
|---|---|
| `{"ok":true,"row":N,...}` | 成功 |
| `{"ok":false,"error":"auth"}` | secret 不對 |
| `{"ok":false,"error":"missing type"}` | payload 沒插變數，跑成字面字串 |
| `{"error":"Unexpected token... is not valid JSON"}` | payload 變數沒包引號（最常見） |
| HTML 一坨 | URL 寫錯，POST 沒到 server |

debug 完記得拿掉「快速查看」（不然每次分享都會跳視窗中斷）。

## 改了 Code.gs URL 變了之後

iCloud 沒辦法自動同步——只能手動：

1. 開捷徑 app → 編輯 anynote
2. 找「取得 URL 內容」動作 → 點 URL 欄位 → 改新值
3. 完成（iCloud 同步到 iPhone 約 1 分鐘）

## 想做 highlight（保存選取的句子）

建第二個捷徑 `anynote: save highlight`：
- 接受類型勾「文字」（不勾 URL）
- payload 改：`{"type":"highlight","content":"[捷徑輸入]","device":"ipad"}`

⚠ **限制**：iOS Shortcut 從分享選單拿不到「文字所在頁的 URL」——選文字分享時 source_url 會是空的。

## 想做圖片

iOS Shortcut base64 編碼圖片很麻煩，建議跳過——圖片從 iPad 看到想存就存到相機膠卷，之後在 Mac/Android 補存。
