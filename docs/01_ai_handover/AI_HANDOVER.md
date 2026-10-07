# 🤖 AI 接續協作與交接總綱手冊 (Master AI Handover Guide)

> **本文件專供接續本專案之 AI Agent / AI Engineer 閱讀。**  
> 請完整研讀本手冊、[`PROJECT_SPEC.md`](../02_project_spec/PROJECT_SPEC.md)、[`DISCUSSION_LOG.md`](../03_discussion_history/DISCUSSION_LOG.md)、[`ART_STYLE_GUIDE.md`](../04_art_and_style/ART_STYLE_GUIDE.md) 與 [`SERVER_AND_GIS_GUIDE.md`](../05_multiplayer_and_real_map/SERVER_AND_GIS_GUIDE.md)，確保對專案背景、核心玩法哲學與使用者嚴格要求維持 100% 的一致性。

---

## 📌 一、 專案核心背景與使用者初衷

1. **專案名稱**：
   - 《雙北漫遊：都會行蹤》✕《城市脈動：通勤偵探》
   - 英文名稱：Taipei Metro Detective RPG
2. **原始企劃書來源**：
   - 網址：[https://hsiaoyujui114-code.github.io/taipei-detective-rpg/proposal.html](https://hsiaoyujui114-code.github.io/taipei-detective-rpg/proposal.html)
   - 核心特色：
     - **六年級獨立研究主題**：結合「環保減塑政策」（例如超商自備購物袋、不隨意索取一次性塑膠與衛生紙）與「雙北都會自然科學/交通大數據推理」。
     - **都會交通時空大數據 (TIB 交通情報局)**：以悠遊卡刷卡時序（進出站時間、扣款金額、307公車路線）、CCTV 監視器軌跡比對，作為拆穿嫌疑人不在場謊言的關鍵鐵證。
3. **美術風格與場景靈感來源**：
   - Google Drive 資料夾：`https://drive.google.com/drive/folders/1SnzLvIdg_gka7gzFH_RlC9eoZLboZ0J9`
   - 資料夾名稱：`遊戲圖片~待處理`（共計 41 張 AI 概念參考圖）。
   - **重要使用者誡命（嚴格遵守！）**：
     > **這些圖片只是呈現使用者希望這款遊戲呈現的「動漫都會風格與情境氛圍」，絕不是生硬貼圖！**  
     > **使用者要的是真正可操作、流暢、有探索深度的現代 2D/2.5D 動漫都會冒險 RPG！**

---

## 🚫 二、 使用者痛點與核心設計禁忌 (CRITICAL RULES)

接續的 AI 在開發新功能時，**必須恪守以下 6 大鐵則**：

### 1. 🈲 嚴格禁用「少年偵探」稱號
- 使用者明確表達**非常不喜歡**這個稱呼！
- 所有程式碼、介面標籤、NPC 暱稱、伺服器廣播、對話框與文檔，**一律稱呼為「都會調查員」或「市民」**。

### 2. 🈲 地圖嚴禁點擊直接傳送（真實交通法則）
- 地圖僅供查閱全雙北路網、站牌位置與轉乘路線規劃。
- **嚴格禁止點擊地圖直接瞬移！** 玩家必須親自走到忠孝專用道或中山路邊站牌搭乘公車，或走進捷運出入口。

### 3. 🚌 公車通勤為主軸 ✕ 快轉自由選配（可快轉、亦可隨車慢活觀光、自由下車）
- 以台北市運量之王 **307 幹線公車** 為通勤主軸。
- 登上公車或捷運後，出現交通 HUD，提供兩大彈性模式：
  - **⏩ 快轉過場**：點擊 `[⏩ 快轉過場動畫 (空拍鳥瞰)]`，鏡頭平滑拉高至高空衛星全景快速穿梭於雙北真實路網，抵達目的地後平滑降回地面完成下車。
  - **🚶 隨車漫遊與自由下車**：不點快轉時，玩家隨車平穩漫遊欣賞雙北街景；任何時候皆可點擊 `[🚶 到站下車]` 隨時下車至路側人行道，恢復自由步行。

### 4. 🏃 雙速移動衝刺系統 (走路 ✕ 奔跑)
- **🚶 走路 (Walk)**：速度 0.38，動作自然平滑。
- **🏃 奔跑 (Run / Sprint)**：速度 0.75！支援鍵盤按住 **[Shift]** 或點擊畫面 **`[🏃 奔跑模式]`** 衝刺，腳底伴隨白色氣流特效。
- **🛹 電動滑板 (Skateboard)**：超商購買後速度提升至 1.10，疾馳全地圖。

### 5. 🏪 連鎖品牌實體門市（多據點分佈，全場絕非單一孤店）
- **絕非全場僅有一間門市**！依循雙北真實繁榮商圈，配置完整的連鎖門市網路：
  - **CoCo 都可 (3處)**：中山北路門市、站前南陽店、重慶書店街店（亮橘波浪招牌、微笑標誌、木吧檯茶桶）。
  - **全家 FamilyMart (3處)**：中山北路店、站前館前店、建成圓環店（藍綠雙色燈箱、自動門、茶葉蛋蒸煮）。
  - **7-Eleven 統一超商 (3處)**：站前忠孝店、重慶南路店、中山南京店（經典橘綠紅三色條紋燈箱、御飯糰、CITY CAFE 拿鐵）。

### 6. 🛡️ 現代 2D ✕ 2.5D 動漫都會冒險引擎 (零白屏保證)
- 採用 HTML5 Canvas 向量渲染配合 **Y-Sorting 深度排序**，人物經過建築與路樹前方或後方時具有精確的遮蔽感與地面陰影。
- 頂部懸浮市民大道高架橋，投射立體陰影。
- **100% 跨裝置相容**，在任何老舊電腦、Chromebook、iPad、手機皆保證零白屏、60FPS 秒開！

---

## 🏗️ 三、 系統架構一覽

```
taipei-metro-detective-rpg/
├── index.html              # 主遊戲畫面 (HUD、雙北地圖 Modal、CCTV 監控台、背包、長椅休息、淡水渡輪)
├── style.css               # 視覺樣式庫 (Cyberpunk 動漫都會美學、霓虹光暈、響應式佈局)
├── game.js                 # 現代 2D/2.5D 動漫都會冒險引擎核心 (Y-Sorting、雙速衝刺、公車通勤、多人同步)
├── server.js               # Node.js + WebSocket 專屬私服器 (支援多人同屏、破案全服號外)
├── package.json            # 專案依賴與腳本 (npm start)
├── README.md               # 專案簡介與快速開始
├── docs/                   # 【AI 協作文檔專屬目錄】
│   ├── README.md           # 文檔總覽導航與推薦閱讀順序
│   ├── 01_ai_handover/     # 🤖 AI_HANDOVER.md (本文件)
│   ├── 02_project_spec/    # 📋 PROJECT_SPEC.md (系統功能規格書)
│   ├── 03_discussion_history/ # 📜 DISCUSSION_LOG.md (第 1~7 回合歷次使用者討論紀錄)
│   ├── 04_art_and_style/   # 🎨 ART_STYLE_GUIDE.md (美術情境指導手冊)
│   └── 05_multiplayer_and_real_map/ # 🌐 SERVER_AND_GIS_GUIDE.md (私服器架構與雙北路網演算法)
└── assets/
    ├── three.min.js        # 本地封裝 Three.js (零外部 CDN 依賴)
    └── images/
        ├── avatar_detective.png   # 正宗都會調查員頭像 (來自 Drive 截圖)
        └── radar_map.png          # 正宗圓形雷達小地圖 (來自 Drive 截圖)
```

---

## 🔄 四、 接續 AI 的 Review 與工作流程指南

當新的 AI Agent 取得此倉庫時，請遵循以下標準作業程序：

1. **環境檢查與啟動**：
   ```bash
   git status
   npm start # 啟動 local WebSocket 私服器與 HTTP (http://localhost:3000)
   ```
2. **語法與相容性檢查**：
   ```bash
   node -c game.js && node -c server.js
   ```
3. **驗證核心玩法運作**：
   - 開啟 `http://localhost:3000` 或 GitHub Pages。
   - 測試鍵盤 [WASD] 移動與按住 [Shift] / 點擊 `[🏃 奔跑]` 按鈕，確認流暢雙速奔跑。
   - 走至忠孝西路中央專用道，登上 307 幹線公車，測試高空空拍鳥瞰快轉過場動畫。
   - 走訪中山北路 CoCo 手搖飲與全家便利商店，確認門市外觀與購物流程。
   - 走訪北投分局調閱 4 分割 CCTV 監視器時序，出示 307 刷卡紀錄進行筆錄對質逮捕。
4. **程式碼修改與 Push 規範**：
   - 任何改動前請先執行語法檢查。
   - 完成修改後使用 git 提交並 push 至 `origin main`，GitHub Pages 會自動觸發部署。
   - 保持 `docs/` 內文件的最新更新。
