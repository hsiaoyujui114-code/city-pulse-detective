# 🗺️ 雙北漫遊：都會行蹤 —— 地圖問題欄最高執行協議 (Map Issue Board Protocol)

> **最高委託人指令確立日**：2026-10-28
> **執行單位**：ai-engineer (`project`) ✕ 專案總協同與任務調度長 Leader (`manager`)

---

## 📌 一、 問題欄（地圖問題欄）唯一定義與專屬 URL

每當委託人（總指揮）在對話中提及：
- **「問題欄」**
- **「地圖問題欄」**
- **「去看那個問題欄」**
- **「看問題欄裡面的東西」**

`ai-engineer` (`project`) 與全體協同 AI 必須在第一時間直覺、明確理解此為**地圖品質稽核與問題修改指令專屬網址**：

🔗 **專屬網址**：`https://files.instinct.com/ju4sf6hj7efj-agy`

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
