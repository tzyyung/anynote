# 重新部署（改 Code.gs 之後）

⚠ **核心警告**：Apps Script 的「部署」UI 看起來簡單，但有幾個不直觀的行為，踩過很多次。

## 三個重要事實

1. **「建立新版本」會產生新 URL**——即使你用「管理部署作業 → 編輯既有」也一樣。
   - Google 文件說 URL 應該不變，但實測在中文 UI / 2026 年的 Apps Script，每次新版本都拿到不同 URL
   - 不要假設舊 URL 會自動指向新版本
2. **「原來版本」不會發布新 code**——只是重新發行同一個快照。改完 code 必選「建立新版本」
3. **`/dev` 端點永遠是最新編輯器內容**，但要 OAuth token 才能呼叫，client 端用不了

## 標準重部署流程

每次改 `Code.gs` 之後：

1. 編輯器把 `~/aidaris/anynote/apps-script/Code.gs` 全段重貼（Cmd+A 全選 → 貼上）
2. **Cmd+S 存檔**，等左上顯示「全部已儲存到雲端硬碟」
3. **更新 `doGet()` 的 version 字串**——這是驗證部署是否生效的唯一可靠方法
   ```js
   function doGet() {
     return jsonResponse({ ok: true, service: 'anynote', version: 'v5-some-tag', message: 'POST only' });
   }
   ```
4. 右上 **部署** → **管理部署作業**
5. 既有 deployment 右上 ✏️ 編輯
6. **版本** 下拉 → 選 **建立新版本**（不是「原來版本」）
7. 描述：可寫 `v5 some change`（給自己看）
8. **部署**
9. 部署成功對話框會顯示**新的 Web 應用程式 URL** ← 複製這個

## 同步 URL 到所有 client

新 URL 拿到後：

```bash
# 一行同步到 test-backend.sh + Android local.properties
chmod +x ~/aidaris/anynote/scripts/set-url.sh   # 第一次跑
~/aidaris/anynote/scripts/set-url.sh 'https://script.google.com/macros/s/.../exec'
```

腳本會：
- 改 `scripts/test-backend.sh` 的 ANYNOTE_URL
- 改 `android/local.properties` 的 ANYNOTE_URL
- curl GET 驗證並印出 `version` 確認上線

**Chrome 擴充端要手動改**（因為 chrome.storage 在 runtime，不能從 disk 編輯）：
1. `chrome://extensions/` → anynote → 詳細資料 → 擴充功能選項
2. Web App URL 欄位貼新 URL
3. Save → Test connection 應顯示「OK — wrote row N」

**iPad Shortcut 要手動改**：
1. 開捷徑 app → 編輯 anynote 捷徑
2. 找「取得 URL 內容」動作 → URL 欄位換成新值
3. iCloud 會自動同步到 iPhone

**Android 要重 build 才會生效**：
```bash
cd ~/aidaris/anynote/android
./gradlew installDebug
```

## 驗證 4 處 client 都同步成功

```bash
# 1. 後端確認版本
curl -sL '<新URL>'  # 看 version 對

# 2. 命令列測試
~/aidaris/anynote/scripts/test-backend.sh   # 全綠

# 3. Chrome：選項頁按 Test connection → OK
# 4. Android：分享一個網頁進 anynote → Toast saved ✓
# 5. iPad：Safari 分享 → Sheet 多一列
```

## 為什麼用 version 標籤這麼重要

我們踩過的坑（記憶 `feedback_apps_script_deployment.md`）：

> 改 code → 部署 → curl → 看不到改動 → 以為 code 沒存 → 重貼 → 重部署 → 還是不行 → 罵髒話 5 分鐘 → 才發現 client 在打舊 URL

**有版本標籤就能在 30 秒內定位**：「new 部署 URL ↔ doGet version 對得上嗎？」對不上代表 client 端的 URL 還沒更新。

## 不要做的事

- ❌ 不要選「原來版本」想讓 URL 不變（不會發布新 code）
- ❌ 不要 deploy 完不更新 client URL（client 仍打舊 deployment、看不到新功能）
- ❌ 不要假設 `/dev` 端點可以給 client 用（要 OAuth）
- ❌ 不要新增多個 deployment（會越來越亂，找不到哪個是哪個）
- ❌ 不要把 SECRET 寫死在 `Code.gs` 然後 commit（每次改 code 重貼會把 secret 一起貼到編輯器，記得改回 placeholder）
