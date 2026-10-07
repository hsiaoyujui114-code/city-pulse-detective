# 🌐 專屬多人伺服器 ✕ 雙北真實地理道路 (GIS/OSM) 完整實作指南

> **本文件專門解答使用者之核心提問：**  
> 1. 如何做一個真正**「所有人都在同一個虛擬世界」**的連線 Server？  
> 2. 如何讓這個虛擬世界中的**「道路與地景，跟雙北真實世界一模一樣」**？  

---

## 🗺️ 一、 整體架構願景 (High-Level Architecture)

```mermaid
flowchart TD
    subgraph 玩家前端 Client
        P1["玩家 A (筆電/手機)"]
        P2["玩家 B (教室平板)"]
        P3["玩家 C (在家遊玩)"]
    end

    subgraph 雲端專屬伺服器 Dedicated Cloud Server
        WS["WebSocket 多人伺服器<br>(Node.js / ws)"]
        AOI["空間分區管理 (AOI)<br>依捷運站與行政區廣播"]
        STATE["世界狀態快取 (Redis/記憶體)<br>玩家座標、委託案件、公佈欄"]
    end

    subgraph 雙北真實地理數據庫 Real Taipei GIS Data
        OSM["OpenStreetMap (OSM) 道路網<br>(忠孝東路、中山北路、信義路)"]
        GOV["台北市政府開放資料平台<br>(捷運出入口、公車站、全家超商POI)"]
    end

    P1 <-->|WebSocket 實時同步| WS
    P2 <-->|WebSocket 實時同步| WS
    P3 <-->|WebSocket 實時同步| WS
    WS <--> AOI
    WS <--> STATE
    OSM -->|向量坐標轉換 (墨卡托投影)| P1
    GOV -->|實體店家與設施定位| P1
```

---

## 🖥️ 二、 如何做一個「所有人都在同一個世界」的 Server？

### 1. 為什麼不能只用 GitHub Pages？
- **GitHub Pages** 只是「靜態網頁主機」，它只負責把 HTML、CSS、JS 下載到玩家的手機或電腦上，**無法在背景運行 Node.js 程式碼，也無法維持連線**。
- 要讓所有人同屏看見彼此，必須有一個**隨時開著、能接收所有人訊息並轉發給其他人的「雲端伺服器（Dedicated Server）」**。

### 2. 伺服器運作的核心原理：狀態同步 (State Synchronization)
伺服器（即本專案的 `server.js`）每秒進行 10~20 次的運算循環（Tick）：
1. **玩家連線**：玩家打開網頁時，瀏覽器發送 `ws.send({ type: 'join', nickname: '小偵探' })`。
2. **座標廣播**：玩家移動時，傳送自己的座標 `(x, y, z)` 與朝向給 Server。
3. **分區廣播 (AOI - Area of Interest)**：
   - 雙北地圖非常大（淡水到新店十幾公里），如果 100 個人在不同地方，不需要把淡水玩家的一舉一動發給信義區的玩家。
   - 伺服器會依照**「當前捷運站/行政區」**分組，只有在附近的同學才會收到即時步行動畫，大幅降低延遲與手機耗電！
4. **全服事件**：當有人在台北車站破案時，Server 發送 `type: 'breaking_news'` 給**所有人**，大家的畫面上都會同時跳出破案號外！

### 3. 如何把 Server 部署到網路上？（推薦免費且穩定的方案）

不用自己花錢買主機，目前有以下推薦的免費雲端主機：

| 平台名稱 | 優點 | 適合對象 | 操作簡介 |
| :--- | :--- | :--- | :--- |
| **Render.com** (⭐ 最推薦) | 免費、支援 WebSocket、直接連動 GitHub | 國小同學、個人專案 | 註冊後點擊「New Web Service」，選你的 GitHub 倉庫，命令填 `npm start`，即獲得免費的 `wss://your-game.onrender.com` 網址！ |
| **Railway.app** | 速度快、延遲低 | 競技/多人遊戲 | 支援 GitHub 一鍵部署。 |
| **Cloudflare Tunnel / Ngrok** | 將你自己的電腦變成公網 Server | 學校發表會、展示用 | 在自己的 Mac 終端機執行 `cloudflared tunnel`，立即產生一組外部網址讓全班同學連進你的 Mac！ |

---

## 🛣️ 三、 如何讓虛擬世界的道路「跟雙北一模一樣」？

這是本遊戲最酷的核心技術：**利用開放地理資訊系統 (GIS) 與 OpenStreetMap (OSM) 自動生成 3D/2.5D 道路！**

### 1. 資料從哪裡來？
- **OpenStreetMap (OSM)**：全世界最詳盡的開源地圖，雙北的每一條幹道（市民大道、忠孝西路、中山北路）、人行道、甚至是斑馬線與巷弄，都有精確的 GPS 經緯度節點（Nodes & Ways）。
- **台北市政府開放資料平台 (data.taipei)**：提供雙北捷運站出入口、全家便利商店登記地址、派出所位置的開放坐標 (GeoJSON)。

### 2. 核心數學原理：GPS 經緯度 ➔ 遊戲 3D 坐標轉換
以 **台北車站大廳**（經度：`121.5170`，緯度：`25.0478`）為遊戲世界的原點 `(x: 0, z: 0)`：

```javascript
// GPS 經緯度轉 3D / 2.5D 世界公尺座標 (墨卡托投影演算法)
const ORIGIN_LON = 121.5170; // 台北車站經度
const ORIGIN_LAT = 25.0478;  // 台北車站緯度

function gpsToWorld(lon, lat) {
  // 1 緯度約為 110.574 公里，1 經度在台北約為 100.950 公里 (111.320 * cos(lat))
  const x = (lon - ORIGIN_LON) * 100950;
  const z = -(lat - ORIGIN_LAT) * 110574; // 3D 中北方通常為 -Z
  return { x, z };
}
```

### 3. 如何在遊戲中自動畫出「忠孝西路」與「中山北路」？
從 OSM 下載雙北道路的 GeoJSON 向量檔案，其格式為一連串的坐標清單：
```json
{
  "name": "忠孝西路一段",
  "lanes": 6,
  "coordinates": [
    [121.5135, 25.0465],
    [121.5170, 25.0468],
    [121.5200, 25.0471]
  ]
}
```
前端程式碼會遍歷這些坐標：
- **在 2.5D Canvas 模式**：直接以 `ctx.moveTo(p1.x, p1.z)` 搭配 `ctx.lineTo(p2.x, p2.z)`，依道路等級（幹道 24 米、巷弄 6 米）繪製雙向線與斑馬線。
- **在 3D Three.js 模式**：使用 `THREE.ExtrudeGeometry` 或 `THREE.PlaneGeometry`，將道路點連成 3D 柏油路面多邊形。

**成果**：小偵探在遊戲裡往北走，走到的就是真實的「中山北路」；往東走就是真實的「忠孝東路」，路幅寬度、十字路口與捷運站出口**與真實雙北完全一致**！

---

## 🚀 四、 具體落地執行四步驟 (Step-by-Step Implementation)

### 第一步：匯入雙北核心幹道 GeoJSON 模組
- 先從精簡版核心路網開始：
  - 台北車站前廣場（忠孝西路、館前路、重慶南路）。
  - 中山商圈（中山北路、南京西路、捷運帶狀公園）。
  - 信義商圈（信義路五段、市府路、台北101周邊）。
  - 淡水八里（淡水老街中正路、八里渡船頭棧橋）。

### 第二步：部署專屬 WebSocket 伺服器至 Render.com
1. 登入 [Render.com](https://render.com)（免費註冊）。
2. 點擊 **New +** ➔ **Web Service**。
3. 連結你的 GitHub 倉庫：`hsiaoyujui114-code/taipei-metro-detective-rpg`。
4. 設定：
   - **Environment**：`Node`
   - **Build Command**：`npm install`
   - **Start Command**：`npm start`
5. 點擊部署，Render 會為你產生專屬公開網址（例如：`https://taipei-detective-server.onrender.com`）。
6. 其對應的 WebSocket 即為 `wss://taipei-detective-server.onrender.com`！

### 第三步：在遊戲前端填入該伺服器網址
- 在遊戲中打開 `[⚙️ 設定]` 彈窗，將 `ws://localhost:3000` 改為 Render 提供的 `wss://...` 網址，點擊「重新連線」。
- 任何人在任何手機或筆電打開網頁，大家就會同時出現在這個雙北世界裡！

### 第四步：加入全家便利商店與真實 POI
- 利用台北市 Open Data 的便利商店經緯度清單，使用 `gpsToWorld(lon, lat)` 直接在遊戲真實經緯度上生成全家綠白藍發光門市！
