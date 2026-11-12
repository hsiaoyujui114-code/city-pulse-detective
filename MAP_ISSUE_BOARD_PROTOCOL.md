# 🗺️ 雙北漫遊：都會行蹤 —— 地圖問題欄最高執行協議 (Map Issue Board Protocol)

> **最高委託人指令確立日**：2026-10-28（第 134 回合擴充雙問題欄聯防與離線對帳機制）  
> **執行單位**：ai-engineer (`project`) ✕ 專案總協同與任務調度長 Leader (`manager`)

---

## 📌 一、 問題欄（地圖問題欄）唯一定義與專屬 URL

每當委託人（總指揮）在對話中提及「問題欄」、「地圖問題欄」、「去看那個問題欄」，`ai-engineer` 與全體協同 AI 須同步檢核以下**雙問題欄來源**：

1. 🔗 **Muse 問題欄（最新公開問題追蹤總覽）**：`https://hsiaoyujui114-code.github.io/detective-issue-list/`
2. 🔗 **Instinct 問題欄（地圖品質稽核卷宗）**：`https://files.instinct.com/ju4sf6hj7efj-agy`

> 📌 **雙問題欄對照結論（ISSUE-13 已結案對帳）**：本協議已完整擷取 Instinct 問題欄（2026-10-29 修訂卷宗：公車/捷運/台鐵/高鐵資料來源新鮮度 `sourceLastOkMs`、Zoom 15/16 LOD 隱藏、`map-zoom-mid`、`.jump-scroll-wrap min-width: 0`、嚴禁無 GPS 即時字樣、公車點選不顯示第幾站/即將到哪一站）並與 Muse 問題欄（`REVIEW-133` ISSUE-01~25 與 P-01~P-16）逐條比對：**兩份清單完全相容、無互相矛盾**（均不更改玩法、均不重寫 Canvas/`ws` 引擎），已合併執行完畢。

---

## 🛠️ 二、 標準作業程序 (SOP)

1. **獲取最新卷宗**：
   - 存取該網址並透過 Instinct GraphQL API (`hostedFile` / `hostedFileContentLease`) 取得最新發布修訂版本號（`publishedRevisionId`）。
   - 解析其中記載的所有「已確認存在的問題」、「資料來源標示」與「體驗改善建議」。

2. **雙軌倉庫鏡像修復**：
   - 同步修正以下兩大 GitHub 倉庫，確保代碼與功能 100% 鏡像對齊：
     - `taipei-metro-detective-rpg`
     - `city-pulse-detective`
   - 恪守四大憲法紅線（0 少年偵探、0 益碩/藝碩、0 瞬移、0 歷史廢除職稱）。

3. **落實最高永久鐵則**：
   - **每次修改完成後，100% 自動執行 `git add`、`commit` 並 `push` 到 GitHub 遠端倉庫！**
   - 絕不遺留本地未提交變更。

4. **精準回報**：
   - 條列各項驗收條件（「通過／未通過／未測到」），附帶具體測試指令、截圖與驗證步驟。
