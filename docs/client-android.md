# Android Client

從手機分享選單把 URL / 文字 / 圖片送到 anynote。

## 環境需求

- Android Studio (任何近期版本，2024+ 都行)
- Android SDK（Android Studio 安裝會帶）
- Android 手機 + USB 偵錯打開
- 手機作業系統 Android 8.0+ (API 26+)

## 第一次設定

1. **複製 local.properties**：
   ```bash
   cd ~/aidaris/anynote/android
   cp local.properties.example local.properties
   ```

2. **編輯 local.properties**，填三個值：
   ```
   sdk.dir=/Users/<your-username>/Library/Android/sdk
   ANYNOTE_URL=https://script.google.com/macros/s/.../exec
   ANYNOTE_SECRET=你的-secret
   ```

   `local.properties` 已在 `.gitignore`，不會 commit。

3. **Android Studio 開專案**：
   - File → Open → 選 `~/aidaris/anynote/android` 目錄
   - 第一次 Gradle sync 要下載依賴（5–10 分鐘）

## Build + Install

**從命令列**（最快）：
```bash
cd ~/aidaris/anynote/android
./gradlew installDebug
```

**從 Android Studio**：右上工具列選裝置 → ▶ Run

> 第一次 build 會 download Gradle 8.x，要約 5 分鐘。之後增量 build 約 20 秒。

## 用法

裝完之後**手機桌面不會有 anynote 圖示**——這是設計的（無 launcher icon）。anynote 只在分享選單出現。

1. 任何 app（Chrome、新聞 app、相簿、Twitter…）→ 找到要存的東西 → 分享
2. 分享選單往下滑 → 找 **anynote**
3. 點下去 → Toast 顯示：
   - `anynote: sending…` → `anynote: saved ✓ (row N)` ← 成功
   - `anynote: failed: <reason>` ← 後端拒絕
   - `anynote: image too large or unreadable` ← 圖片 > 8 MB
   - `anynote: error: <message>` ← 網路或其他錯誤

## 行為

| 分享什麼 | type 欄位 | 細節 |
|---|---|---|
| 純 URL（例如 Chrome 分享網址） | `url` | source_url = URL |
| 文字含 URL（例如 Twitter 分享） | `highlight` | content = 整段 + 用 regex 抽出的 source_url |
| 純文字 | `highlight` | content = 整段，source_url = 空 |
| 圖片 | `image` | 圖片 base64 上傳，存到 Drive；source_url = `android-share` |

## Debug

Toast 顯示 fail 時看 logcat：
```bash
adb logcat | grep anynote
```

會看到：
```
D/anynote: code=200 resp={"ok":true,"row":42,"image":"","image_error":""}
```
如果 code 是 200 但 ok:false，看 resp 裡的 error 欄位。

## 改了 Code.gs 之後

如果 redeploy URL 變了：
```bash
~/aidaris/anynote/scripts/set-url.sh '<新URL>'   # 自動更新 local.properties
cd ~/aidaris/anynote/android
./gradlew installDebug   # 重 build + 重灌
```

## 改了 Android 程式（android/ 目錄）

```bash
cd ~/aidaris/anynote/android
./gradlew installDebug
```

Android Studio 也行（▶ Run）。

## 安全注意

- `local.properties` **永遠不要 commit**（`.gitignore` 已排除）
- secret 透過 BuildConfig 編進 APK 裡，理論上反組譯能看到
- 對個人用（不上 Play Store、只裝自己手機）影響微小
- 想更嚴可以改成從 Android Keystore / EncryptedSharedPreferences 讀，過度設計

## 已知限制

- targetSdk = 34，沒測 Android 15+ 的 partial photo permission（API 35+ 新行為），需要時再說
- 沒處理 ACTION_SEND_MULTIPLE（一次分享多張圖會只取第一張）
- 圖片 > 8 MB 直接拒絕（避免 OOM），不做壓縮
