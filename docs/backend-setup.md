# Backend Setup（從零）

從零部署 Apps Script Web App + Sheet + Drive 資料夾。需要 ~15 分鐘。

## 1. 準備一個專屬 Google 帳號（強烈建議）

> **為什麼**：Apps Script 拿不到細粒度 scope（不能限定特定 Sheet/Folder），授權後 script 理論上能動 Drive/Sheets 全部檔案。用副帳號可以縮小爆炸半徑。

切到副帳號（無痕視窗或 Chrome 不同 profile 最乾淨）。後續所有步驟都在副帳號操作。

## 2. 建 Apps Script 專案

1. 開 https://script.google.com → **新增專案**
2. 左側齒輪 ⚙ → 勾「**在編輯器中顯示 appsscript.json 資訊清單檔案**」
3. 把 `apps-script/Code.gs` 內容貼到編輯器的 `Code.gs`（覆蓋預設）
4. 把 `apps-script/appsscript.json` 內容貼到 `appsscript.json`（覆蓋預設）
5. 專案改名 → 左上「未命名專案」改 `anynote`

## 3. 跑 setup() 建 Sheet + 資料夾

1. 函式選單選 **`setup`** → **執行**
2. 第一次跑會跳授權：選副帳號 → 進階 → 前往 anynote (不安全) → 全選三個 scope → 允許
3. 看執行記錄應印：
   ```
   Sheet:  https://docs.google.com/spreadsheets/d/.../edit
   Folder: https://drive.google.com/drive/folders/...
   Next: edit setSecret() with your secret and run it
   ```
4. 點 Sheet URL 確認 header row 已寫入；點 Folder URL 確認資料夾已建

## 4. 設 secret

**4a. 終端產生隨機 secret**：
```bash
openssl rand -base64 24
```
複製輸出（一串約 32 字元）。

**4b. Apps Script 編輯器**：
- 找到 `setSecret()` 函式（檔案末段）
- 把第 129 行 `const SECRET = 'PASTE_YOUR_SECRET_HERE';` 改成 `const SECRET = '剛複製的字串';`
- **Cmd+S 存檔**
- 函式選單選 `setSecret` → **執行** → 應印 `Secret stored`

**4c. 把 SECRET 改回 placeholder**（避免 secret 留在 source）：
- 第 129 行改回 `'PASTE_YOUR_SECRET_HERE'`
- Cmd+S 存檔
- 跑 `showProps` 確認 SECRET 仍在 Script Properties 裡（properties 跟 source 是分開的）

## 5. 部署成 Web App

1. 右上 **部署** → **新增部署作業**
2. 左上齒輪選 **網頁應用程式**
3. 設定：
   - 說明：`v1`
   - 執行身分：**我**（your-account@gmail.com）
   - 誰可以存取：**任何人**（注意：是清單最下面那個，不是「擁有 Google 帳戶的任何人」）
4. 按 **部署** → 第一次會再跳一次授權（接受）
5. 拿到 **Web 應用程式 URL**：`https://script.google.com/macros/s/AKfycb.../exec`
   ⚠ 複製這個 URL，後續每個 client 都要用

## 6. 驗證後端

```bash
# 換成你的 URL
curl -sL 'https://script.google.com/macros/s/AKfycb.../exec'
```

預期回應：
```json
{"ok":true,"service":"anynote","version":"v4-hardened","message":"POST only"}
```

如果 `version` 對得上 Code.gs 裡 `doGet()` 寫的字串 → 部署成功。

## 7. 跑完整 smoke test

```bash
# 編輯 scripts/test-backend.sh，把 ANYNOTE_URL + ANYNOTE_SECRET 兩個變數填入
chmod +x ~/aidaris/anynote/scripts/test-backend.sh
~/aidaris/anynote/scripts/test-backend.sh
```

預期 4 個測試：URL、highlight、image_url、auth fail 全綠。失敗時看 `docs/troubleshooting.md`。

## 完成檢查清單

- [ ] Apps Script 專案 `anynote` 在副帳號的 https://script.google.com
- [ ] 副帳號 Drive 有 `anynote` Sheet 跟 `anynote-images` 資料夾
- [ ] Script Properties 有 `SHEET_ID` / `FOLDER_ID` / `SECRET` 三個 key（用 `showProps` 確認）
- [ ] `Code.gs` 第 129 行的 SECRET 已改回 placeholder
- [ ] curl GET 端點回應 `version: v4-hardened`
- [ ] `scripts/test-backend.sh` 跑全綠

下一步：
- `docs/client-mac-chrome.md`
- `docs/client-android.md`
- `docs/client-ipad.md`
