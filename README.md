# 🕵️‍♂️ 《雙北漫遊偵探：都會行蹤》✕《城市脈動：通勤偵探》
### Taipei Metro Detective RPG - 雙核心動漫偵探網頁遊戲 ✕ 專屬私服器多人同步

> 🌐 **【跨電腦 AI 開發必讀】如果你是在其他電腦接手本專案的 AI**：  
> 請立即閱讀 [REMOTE_AI_INSTRUCTIONS.md](REMOTE_AI_INSTRUCTIONS.md)，內含 3 大模組（1. 地圖、2. 故事、3. 偵探代碼）之核心檔案速查表、四大憲法紅線與一鍵調度規範！


[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-brightgreen)](https://hsiaoyujui114-code.github.io/city-pulse-detective/cyber-realmap.html)
[![Multiplayer](https://img.shields.io/badge/Multiplayer-ws%20WebSocket-blue)](#-專屬多人私服器)
[![Current Stack](https://img.shields.io/badge/Engine-Canvas%20%2B%20Leaflet%201.9.4-orange)](#-核心特色)

---

## 📦 四倉庫分工定位與 SSOT 權威來源對照表

| GitHub 倉庫 | 定位與職責 | 權威維護內容 (SSOT) |
| :--- | :--- | :--- |
| **`city-pulse-detective`** | **線上試玩與地圖主站（本倉為 SSOT）** | `cyber-realmap.*`、`index.html`、`game.js`、`shared-data.js`、`server.js`（GitHub Pages 主入口） |
| **`taipei-metro-detective-rpg`** | **地圖／多人在線鏡像倉** | 鏡像同步主站雙軌地圖、`shared-data.js`、`cases.json`、`PROPOSAL.md` 與 `server.js` |
| **`taipei-detective-rpg`** | **故事劇本與 50 案件展示倉** | 50 案件資料、`cases.html`、`PROPOSAL.md`、`proposal.html` 靜態展示與雙軌地圖同步 |
| **`taipei-detective-core`** | **獨立偵探系統核心引擎** | JSON 驅動案件／NPC／對話樹、`EcoWallet` 真實運價、`MapBridge`、`/detective` 工作台（Port 3001） |

> ⚙️ **現行實作 vs 未來規劃 (`ISSUE-09`)**：現行網頁與私服器採用 **HTML5 Canvas 2D ＋ Leaflet 1.9.4（Canvas 模式）＋ Node.js ＋ `ws`**；`PixiJS` 與 `Socket.io` 屬於 Phase 2+ 未來擴充規劃，不作為當前執行依賴（請勿重寫切換引擎）。  
> 📋 **共用檔案同步鐵則 (`ISSUE-11`)**：`cyber-realmap.*`、`shared-data.js`、`game.js`、`index.html` 以 **`city-pulse-detective`為主倉庫**（其他倉庫為鏡像，勿直接單邊修改）；`cases.json`、`cases.html`、`CASES_50_FULL_SPEC.md`、`PROPOSAL.md`、`PROJECT_PROPOSAL.md`、`proposal.html` 以 **`taipei-detective-rpg` 為主倉庫**（其他倉庫為鏡像，勿直接單邊修改）；`AI_HANDOFF_PROJECT_SPEC.md`、`COMPLETE_CONVERSATION_CHRONICLE.md`、`MAP_ISSUE_BOARD_PROTOCOL.md` 由四倉同步維持一致。  
> 🚀 **GitHub Pages 部署 (`ISSUE-07`)**：所有靜態網站皆直接由 **`main` 分支根目錄 (`/`)** 透過 GitHub Pages Deploy from branch 發布，不使用 `.github/workflows/deploy.yml`。

---

## 🤖 給接續開發的 AI Agent / AI Engineer（必讀入口與工作指南）

> **如果你是被指派接續本專案的 AI，請務必先閱讀以下核心文件，以 100% 掌握委託人的真實要求與絕對禁忌：**
> 
> 1. 📜 **[【歷次對話全誌大典】COMPLETE_CONVERSATION_CHRONICLE.md](./COMPLETE_CONVERSATION_CHRONICLE.md)**（收錄第 1~42 回合全部原始對話對白（每回合即時更新）、時間戳記、技術交付成果與決策歷程）
> 2. 📋 **[【AI 接手開發規格手冊】AI_HANDOFF_PROJECT_SPEC.md](./AI_HANDOFF_PROJECT_SPEC.md)**（含 15 大核心禁忌、1:1 雙北地圖規範、50% 剪裁法則、公車循徑系統與工作 SOP）
> 3. 💎 **[【完整企劃書官方 Markdown 版】PROJECT_PROPOSAL.md](./PROJECT_PROPOSAL.md)**（六年級獨立研究完整專案企劃書全文，含 50 宗大案、10 示範案、交通脈動戰略與三軌道具）
> 5. 🗺️ **[【全案技術實作規劃書】TECH_IMPLEMENTATION_PLAN.md](./TECH_IMPLEMENTATION_PLAN.md)**（企劃書每項功能 ✕ 圖資 ✕ 套件對照、16 週分期、需辦手續）
> 4. 🌐 **[線上獨立研究企劃書 (HTML 互動版)](https://hsiaoyujui114-code.github.io/taipei-detective-rpg/proposal.html)**：頂部按鈕「🤖 其他 AI 繼續製作」可一鍵複製最新交接提示詞！
> 
> ⚠️ **【委託人最高鐵則（絕不可違背）】**：
> - 🈲 **嚴格禁用「少年偵探」稱號**：一律稱呼「都會調查員」或「市民」。
> - 🈲 **嚴禁點地圖直接瞬移**：必須親自走到站牌搭公車或進捷運。
> - 🈲 **嚴禁商店連續並排**：每間店各自獨立座落於街角，物理間距 $\ge 38\text{m}$。
> - 🈲 **公車嚴禁死板來回**：公車必須依照交通部 TDX / OSM 之真實 Shape 節點循徑行駛。
> - 🛑 **「先不要做修改代碼」**：動工前必須先提出完整規劃與委託人討論確認！
> - 🔄 **「每指令改動必上 GitHub ✕ 交接提示詞必同步更新 ✕ 對話紀錄每回合必滾動更新」**：委託人每對話一次，做完後必須立即將最新對話追加至對話全誌，連同代碼與文件 commit & push 至 GitHub 遠端倉庫，並同步更新交接手冊與企劃書按鈕！

---

## 📖 專案簡介

本專案融合**國小六年級獨立研究主題（環保減塑政策、雙北都會生活考據）**與**都市交通大數據推理玩法（TIB 交通情報局、悠遊卡刷卡時序、CCTV 監視器軌跡追蹤）**。

玩家扮演穿梭雙北街頭的都會調查員，透過雙北路網穿梭於中山商圈、台北車站、寧夏夜市、淡水碼頭、信義巷弄與北投分局，實際探索街區、補充超商體力，並以精密時空物證拆穿嫌疑人的不在場謊言！

---

## ⚡ 核心特色

1. **雙軌地圖渲染架構 (Dual-Track Map Architecture)**：
   - **2.5D Canvas 主沙盤 (`index.html` / `game.js`)**：純 HTML5 Canvas 2D 高相容等角街廓沙盤，免 WebGL 依賴、任何裝置秒開絕不黑屏。
   - **1:1 真實網路科技地圖 (`cyber-realmap.html`)**：基於 Leaflet 1.9.4（Canvas 加速模式）與國土測繪 NLSC 圖資，100% 呈現雙北真實道路、門牌與四軌動態。（註：PixiJS WebGL 與 Socket.io 列入 Phase 2+ 未來擴充規劃）
2. **雙北捷運路網自由探索 (地圖探索機制)**：
   - 拒絕死板的 HUD 直達按鈕！玩家必須打開 `[📍 地圖]` 刷悠遊卡搭乘捷運至各站點。
   - 走出閘門後，必須在街區中親自走動尋找全家便利商店、CoCo手搖飲、夜市美食小吃與線索！
3. **情境化情報站 (TIB / CCTV)**：
   - 只有親自抵達北投分局與林巡官會面交談，方可解鎖四分割 CCTV 監控與悠遊卡進出站時序分析。
4. **專屬私服器多人同屏同步**：
   - 基於 Node.js + WebSocket，支援局域網同學與線上玩家同屏可見、步行動畫同步、頭頂對話氣泡與全服破案號外推播。
5. **完整 AI 接續協作手冊與對話全誌**：
   - 根目錄附帶 `COMPLETE_CONVERSATION_CHRONICLE.md`、`AI_HANDOFF_PROJECT_SPEC.md` 與 `PROJECT_PROPOSAL.md`，任何接續的 AI Agent / 工程師可 100% 無縫接軌。

---

## 📂 專案文檔目錄 (AI 協作專用分類文檔庫)

完整文檔已統一整理於 [`docs/`](./docs/README.md) 資料夾中並進行結構化分類：

| 分類項目 | 文件路徑 | 重點說明 |
| :--- | :--- | :--- |
| **完整企劃書** | [💎 `PROJECT_PROPOSAL.md`](./PROJECT_PROPOSAL.md) | **【企劃全覽】** 官方 Markdown 完整版（16週研發、50案、10示範案、三軌道具） |
| **對話全誌** | [📜 `COMPLETE_CONVERSATION_CHRONICLE.md`](./COMPLETE_CONVERSATION_CHRONICLE.md) | **【歷史大典】** 1~32 回合 100% 原始對話全文、時間戳與技術成果 |
| **規格手冊** | [📋 `AI_HANDOFF_PROJECT_SPEC.md`](./AI_HANDOFF_PROJECT_SPEC.md) | **【交接首選】** 15 大核心禁忌、1:1 雙北地圖規範、50% 剪裁法則 |
| **導航總覽** | [📚 `docs/README.md`](./docs/README.md) | AI 協作文檔導航中樞與推薦閱讀順序 |
| **01. AI 交接** | [🤖 `docs/01_ai_handover/AI_HANDOVER.md`](./docs/01_ai_handover/AI_HANDOVER.md) | **【最重要】** 核心痛點、雙引擎切換、設計誡命與工作流 |
| **02. 系統規格** | [📋 `docs/02_project_spec/PROJECT_SPEC.md`](./docs/02_project_spec/PROJECT_SPEC.md) | 遊戲循環、數值體系、捷運站點配置、道具規格 |
| **03. 討論紀錄** | [📜 `docs/03_discussion_history/DISCUSSION_LOG.md`](./docs/03_discussion_history/DISCUSSION_LOG.md) | 第 1 ~ 18 回合歷次使用者對話、需求與修改決策摘要 |
| **04. 美術情境** | [🎨 `docs/04_art_and_style/ART_STYLE_GUIDE.md`](./docs/04_art_and_style/ART_STYLE_GUIDE.md) | 雲端 41 張概念圖分析、視覺基調（非彈窗貼圖） |
| **05. 真實地圖與Server** | [🌐 `docs/05_multiplayer_and_real_map/SERVER_AND_GIS_GUIDE.md`](./docs/05_multiplayer_and_real_map/SERVER_AND_GIS_GUIDE.md) | 所有人同服 Server 架構、免費部署、雙北真實道路 (OSM) 轉換 |

---

## 🚀 快速啟動（雙倉庫並排協作與測試）

### 1. 本地啟動專屬多人私服器與 `/detective` 偵探核心工作台
`server.js` 會嘗試掛載同層兄弟目錄的 `../taipei-detective-core`（提供 `/detective` 與 `/api/detective/*`）。若只需要地圖模式可單倉啟動；若需啟用偵探核心工作台，請將兩個倉庫並排 clone 在同一個父目錄下：
```bash
# 於父目錄並排取得地圖主站與偵探核心
git clone https://github.com/hsiaoyujui114-code/city-pulse-detective.git
git clone https://github.com/hsiaoyujui114-code/taipei-detective-core.git

# 啟動地圖＋私服器 (Port 3000)
cd city-pulse-detective
npm ci && npm start

# 執行資料與地圖完整性自動化驗證測試
npm test
```
開啟瀏覽器前往：`http://localhost:3000/cyber-realmap.html`（若已並排核心倉庫，亦可訪問 `http://localhost:3000/detective`；若未並排，`/detective` 將顯示友善引導頁）。

### 2. GitHub Pages 線上試玩
直接造訪（全倉庫統一官方試玩）：[https://hsiaoyujui114-code.github.io/city-pulse-detective/cyber-realmap.html](https://hsiaoyujui114-code.github.io/city-pulse-detective/cyber-realmap.html)  
*(GitHub Pages 自動啟用離線/直連雙通道模式，免架設後台即可單人/展示遊玩)*
