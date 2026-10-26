# 🎖️《雙北漫遊：都會行蹤》獨立研究 AI 總指揮交接全卷 (Leader Handover Dossier)

> **本文件專供 `leader` 總管參考。委託人已正式指示：未來所有獨立研究 AI（ai-engineer、code、story 等）均由 leader 全權管控與調度。委託人將直接與 leader 溝通，由 leader 指揮各端執行。**

- **交接時間**：2026-10-23 15:26 (Round 102)
- **交接發起方**：`ai-engineer`（地圖與系統整合工程師）
- **接收方**：`leader`（獨立研究專案總協同與任務調度長，CWD: `~/crew-deck-role/manager`）

---

## 🎯 一、專案核心願景與背景

1. **專案定位**：
   - 國小六年級獨立研究專題：《雙北漫遊：都會行蹤》（Taipei Mystery RPG）。
   - 融合雙北真實地理圖資（OSM/TDX）、古典偵探機關（《名偵探柯南》與《福爾摩斯》細節人物誌）、大眾運輸動態（307 幹線公車、捷運 9 大路網、高鐵、台鐵）與 108 課綱生活自然科學。
2. **多 Agent 協同分工**：
   - 👤 **委託人（學生創作者 / 總企劃）**：直接向 leader 提出需求與方向。
   - 👔 **`leader`（你）**：負責統籌管控所有 AI、任務拆解、派發 handoff、驗收各端成果、定期向委託人回報。
   - 🗺️ **`ai-engineer`（本機）**：負責雙北 Leaflet / WebGL 地圖系統、大眾運輸即時出入境走廊引擎、本地私服守護進程與系統聯調。
   - 💻 **`code`（Claude CLI）**：負責獨立偵探核心引擎 [`taipei-detective-core`](https://github.com/hsiaoyujui114-code/taipei-detective-core)，包含鑑識判定、口供筆錄、推理解謎與 MapPairingCoordinator。
   - 📜 **`story`（劇本與企劃）**：負責案件庫劇本設計、歷史風情調研、靜態 GitHub 網站維護。

---

## 🔒 二、四大最高憲法級絕對禁忌（不可違背的紅線）

全專案代碼、文件、劇本、API 與對話必須嚴格遵守以下四項最高憲法禁忌，任何違規視為重大故障：
1. 🈲 **嚴格禁用「少年偵探」**：全專案一律使用「都會調查員」或「市民」（0 違規）。
2. 🈲 **嚴格禁用「藝碩/益碩」**：稱謂絕對禁止出現（0 違規）。
3. 🈲 **嚴格禁用瞬移**：都會調查員嚴禁瞬移！所有空間位移必須透過實體步行或搭乘大眾運輸完成（0 違規）。
4. 🈲 **嚴禁歷史廢除職稱**：所有歷史官稱與公務名冊符合史實規範。

---

## 🌐 三、四大核心 GitHub 倉庫與即時伺服器

| 倉庫名稱 | 本地路徑 | 遠端倉庫 URL | 當前最新 Commit / 說明 |
| :--- | :--- | :--- | :--- |
| **企劃與 50 大案倉庫** | `~/crew-deck-role/planner` | [`taipei-detective-rpg`](https://github.com/hsiaoyujui114-code/taipei-detective-rpg) | Commit: `8119ca0`<br>• 50 案網頁：`https://hsiaoyujui114-code.github.io/taipei-detective-rpg/cases.html`<br>• 完整企劃書：`proposal.html`<br>• 資料集：`cases.json` |
| **主地圖系統倉庫** | `~/crew-deck-role/ai-engineer/taipei-metro-detective-rpg` | [`taipei-metro-detective-rpg`](https://github.com/hsiaoyujui114-code/taipei-metro-detective-rpg) | Commit: `849fea8`<br>• 台北捷運官方 WebCorner 真實 64+ 列在線列車即時動態<br>• 即時出入境軌道引擎<br>• 掛載偵探核心 REST 路由器 |
| **鏡像地圖倉庫** | `~/crew-deck-role/ai-engineer/city-pulse-detective` | [`city-pulse-detective`](https://github.com/hsiaoyujui114-code/city-pulse-detective) | Commit: `01d5834`<br>• 雙向鏡像同步，備援部署 |
| **獨立偵探核心** | `~/crew-deck-role/ai-engineer/taipei-detective-core` | [`taipei-detective-core`](https://github.com/hsiaoyujui114-code/taipei-detective-core) | Commit: `e470af6`<br>• `npm test` 10 大階段 100% 通過<br>• MapPairingCoordinator 雙向調度 |

### 本地私服狀態：
- **主伺服器**：`http://localhost:3000`（守護進程，Task `task-10482` on `taipei-metro-detective-rpg`）
  - 前端地圖：`http://localhost:3000` / `/cyber-realmap.html`
  - 50 大案檢視器：`http://localhost:3000/cases.html`
  - 偵探工作台：`http://localhost:3000/detective`
  - 即時交通 API：`http://localhost:3000/api/transit/live`（捷運在線 64+ 列真實運轉中）
  - 偵探核心 REST API：`http://localhost:3000/api/detective/*`
- **獨立偵探服務**：`http://localhost:3001`（`cd taipei-detective-core && npm start`）

---

## 👥 四、與各 AI 對話協同歷史與完工現況

### 1. 與 `code`（Claude CLI，獨立偵探系統開發者）
* **任務目標**：重構 `taipei-detective-core` 模組、提供清晰 JSDoc、並與地圖系統原生直通，實作親赴驗證機制。
* **協同過程**：
  * 指示 `code` 在 `server.js` 導出 `handleDetectiveRequest`，使地圖伺服器可直接無縫引用，消除兩套 API 的不一致風險。
  * 在 `MapPairingCoordinator.js` 中實裝：
    - `dispatchPerimeter`：主動向地圖派發 80m 桃紅警戒圈。
    - `purchaseAtStoreFromMap`：門市親赴（<= 60m）85 折購買結算。
    - `borrowFromVenueFromMap`：4 大微型科普學習場館親赴（<= 60m）借用專業儀器。
    - `pickEasterEggFromMap`：案發生活圈 50~100m 巷弄親赴拾獲彩蛋（< 50m 或 > 100m 阻擋）。
    - `enterBuildingFromMap` / `exitBuildingFromMap`：可進建築 25m/45m 大門光圈進入/退出切換；不可進建築無圖案標記盲探阻擋。
    - `syncSuspectInterrogationState`：嫌疑人口供筆錄雙向狀態綁定。
  * **驗收結果**：執行 `npm test`，10 大測試階段 100% PASS，全域掃描 0 違規。已 Commit 並 Push 至 GitHub。

### 2. 與 `story`（企劃與 50 大案作者）
* **任務目標**：創作 50 個雙北歷史風情大案，每個案件具備詳細起因、經過、最後推導細節，並建置靜態 GitHub 網站附帶一鍵複製。
* **協同過程**：
  * 指示 `story` 依據《柯南》與《福爾摩斯》細節人物誌（身分、與他人關係、與被害人關係、作案動機）撰寫。
  * 案件全面融合雙北歷史風情（艋舺、大稻埕、淡水、北投、板橋、三峽、鶯歌、瑞芳等）與 108 課綱高年級生活自然科學。
  * `story` 產出 Chunks 1~4（CASE-01 ~ CASE-40），第 5 批（CASE-41 ~ CASE-50）由我們無縫補齊，達成完整 50 案。
  * 編譯為 `cases.html` 與 `cases.json`，在網頁上實作即時檢索、50 案目錄、以及每案獨立的「📋 一鍵複製案件文本」按鈕與 Markdown 文字框。已 Commit 並 Push 至 GitHub。

---

## 🚄 五、地圖系統已實裝之關鍵物理規則

1. **大眾運輸單向出入境機制**：
   - **高鐵**：南下班次駛經新北西南境界線後立即出境消失（「一直往南跑，我們就看不到了」）；北上班次自邊界入境出現往北開至南港收班。徹底消滅折返乒乓球假動畫。
   - **台鐵**：南下過鶯歌南端邊界即離境消失；北上班次自鶯歌西南入境。
   - **捷運**：依當前 UTC+8 台灣時鐘即時解算站點、運行時速、月台靠站倒數與收班時間。
2. **親自抵達現場驗證機制（杜絕隔空瞬發）**：
   - 點擊商店/場館/彩蛋/建築，遠處點擊會明確彈窗提示「❌ 無法隔空操作，請親自前往現場」；只有調查員步行或搭車抵達現場範圍內，才會解鎖購買、借用、拾獲與進門。

---

## 📋 六、Leader 後續接管指南與工作建議

1. **與委託人溝通**：
   - 委託人接下來會直接對 leader 發號施令。leader 作為總指揮，需傾聽委託人的修改要求與新功能想法。
2. **調度各 Agent**：
   - 地圖圖資與大眾運輸需求 ➔ 調度 `ai-engineer`。
   - 偵探邏輯、推理解謎、API 規格 ➔ 調度 `code`（在 `~/crew-deck-role/ai-engineer/taipei-detective-core`）。
   - 劇本擴充、案件修改、企劃書微調 ➔ 調度 `story`（在 `~/crew-deck-role/planner`）。
   - 全面驗收與防呆稽核 ➔ 調度 `reviewer`。
3. **工作鐵律（最高憲法級永久鐵則）**：
   - 🔴 **【委託人最高永久鐵則】每次都要將最新的資料推到 GitHub**：未來任何代碼修改、Bug 修復、檔案變更、企劃更新、劇本創作或對話記錄更新，必須在當次任務結束前 100% 自動完成 `git add`、`git commit`、`git push origin main`，確保 GitHub 遠端倉庫永遠保持在最新狀態，絕對不允許留在本地未推送！
   - 每次完成功能改動，務必執行測試、憲法禁忌稽核（0 少年偵探、0 藝碩/益碩、0 瞬移、0 歷史廢除職稱）。
   - 更新交接記錄以保持團隊透明。

========================================================
