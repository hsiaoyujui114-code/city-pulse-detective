# 🌐《雙北漫遊：都會行蹤》跨電腦 AI 開發操作指南 (3 大任務切換手冊)
> **Master Cross-Device AI Instructions & Task Dispatcher**  
> **適用場景**：委託人在任何其他電腦（學校、家裡筆電、公用電腦）使用任何 AI（Claude, ChatGPT, Gemini, Cursor, Copilot, Antigravity 等）進行開發時使用。  
> **全案統一試玩遊戲網址**：https://hsiaoyujui114-code.github.io/city-pulse-detective/cyber-realmap.html

---

## 🎯 一、 使用者「一鍵給其他電腦 AI」的提示詞範本 (複製即用)

你在其他電腦打開任何 AI 助手時，**直接複製這段話給它**：

```text
你好！我是《雙北漫遊：都會行蹤》的專題負責人。
本專案為六年級獨立研究專題，包含「地圖」、「故事」、「偵探代碼」三大核心領域。
請你嚴格遵循本專案的「四大憲法禁忌」與開發規範。

今天我想要修改的是：【請填寫：1. 地圖 / 2. 故事 / 3. 偵探代碼】
我的具體修改需求如下：
[在此貼上你想叫它修改的具體內容]

請閱讀本專案的 REMOTE_AI_INSTRUCTIONS.md，找到對應的倉庫與檔案進行修改。
修改完成後，請執行驗證並提交至 GitHub main 分支！
```

---

## 🗺️ 二、 3 大模組對應倉庫與核心檔案速查表

當你告訴其他電腦的 AI「我要改哪一個」時，它應該修改以下對應的檔案與倉庫：

| 任務分類 | 委託人口令 | 對應 GitHub 倉庫 | 核心修改檔案 | 測試與驗收方式 |
| :--- | :--- | :--- | :--- | :--- |
| **1. 地圖** | **「我要改地圖」** | `https://github.com/hsiaoyujui114-code/city-pulse-detective.git`<br>`https://github.com/hsiaoyujui114-code/taipei-metro-detective-rpg.git` | • `cyber-realmap.html`<br>• `cyber-realmap.js`<br>• `cyber-realmap.css` | 瀏覽器開啟 `cyber-realmap.html` 或訪問線上試玩網址 |
| **2. Story（故事）** | **「我要改故事」** | `https://github.com/hsiaoyujui114-code/taipei-detective-rpg.git` | • `CASES_50_FULL_SPEC.md` (50案完整設定)<br>• `cases.json` (案件資料結構)<br>• `cases.html` (50案展示頁面)<br>• `proposal.html` (企劃書互動頁) | 瀏覽器檢視 `cases.html`、`proposal.html`，檢查文字與科學邏輯 |
| **3. 偵探代碼** | **「我要改偵探代碼」** | `https://github.com/hsiaoyujui114-code/taipei-detective-core.git` | • `src/core/EvidenceEngine.js` (生活科學鑑識)<br>• `src/core/CaseManager.js` (接案與狀態)<br>• `src/core/DeductionBoard.js` (思維導圖網)<br>• `src/data/cases/fifty_cases.json`<br>• `src/data/cases/demo_cases.json`<br>• `test/detective.test.js` (單元測試) | 在終端機執行 `npm test`，確保 10 大階段 100% 通過 |

---

## 💻 三、 在其他電腦上操作的具體方法 (2 種情境)

### 情境 A：其他電腦有安裝終端環境或 AI IDE（例如 Cursor / VS Code / Claude Code / Antigravity）
1. **第一次使用（下載倉庫）**：
   在終端機執行 git clone 下載你想改的倉庫：
   ```bash
   # 改地圖
   git clone https://github.com/hsiaoyujui114-code/city-pulse-detective.git
   # 改故事
   git clone https://github.com/hsiaoyujui114-code/taipei-detective-rpg.git
   # 改代碼
   git clone https://github.com/hsiaoyujui114-code/taipei-detective-core.git
   ```
2. **每次修改前（獲取最新進度）**：
   ```bash
   git pull origin main
   ```
3. **交代 AI 修改**：
   把上面的提示詞貼給 AI，讓它修改對應檔案。
4. **修改後推送到網站**：
   ```bash
   git add .
   git commit -m "feat: [描述你的修改]"
   git push origin main
   ```
   推送後約 1~2 分鐘，GitHub Pages 就會自動更新完成！

---

### 情境 B：其他電腦完全沒有安裝任何軟體（例如學校電腦、只有瀏覽器）
這是**最簡單也最推薦的免安裝密技**：
1. 用瀏覽器打開任何一個 GitHub 倉庫：
   - 地圖：`https://github.com/hsiaoyujui114-code/city-pulse-detective`
   - 故事：`https://github.com/hsiaoyujui114-code/taipei-detective-rpg`
   - 代碼：`https://github.com/hsiaoyujui114-code/taipei-detective-core`
2. **直接按下鍵盤上的 `.` (句號鍵)**！
   - 網頁會直接瞬間變成**線上版 VS Code (`github.dev`)**！
3. 在網頁版 VS Code 裡：
   - 你可以直接編輯檔案，或叫該瀏覽器上的 AI 幫你寫。
   - 也可以把檔案內容複製給 ChatGPT / Claude 改好後貼回來。
   - 點擊左側第三個圖示（Source Control 分支圖示），輸入 Commit 訊息並點擊 **「Commit & Push」**，網站就立刻生效更新！

---

## 🚫 四、 跨電腦開發必須嚴守的「四大憲法紅線」

任何電腦的 AI 進行修改時，必須遵守這四條紅線，絕不能違反：
1. **🈲 0 少年偵探**：委託人極度反感此稱呼！全域一律稱為「**都會調查員**」或「**市民**」。
2. **🈲 0 藝碩／益碩**：委託人下達永久最高禁忌！無論 NPC、市民、教授、變數名、文檔，全域 100% 禁止使用「藝碩／益碩」這個名字。
3. **🈲 0 瞬移**：都會調查員嚴禁隔空傳送或在地圖上點擊瞬移，必須真實步行或搭乘大眾運輸。
4. **🈲 0 歷史廢除職稱**：嚴禁使用歷史廢除之公務員職級。
5. **🈲 統一試玩網址**：所有試玩遊戲對外連結統一為 `https://hsiaoyujui114-code.github.io/city-pulse-detective/cyber-realmap.html`。
