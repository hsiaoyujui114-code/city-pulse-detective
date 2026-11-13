# 🗺️ 地圖核心第三方套件 (Map Vendor Specification)

> **遵循規範**：P-02 / ISSUE-04 / 雙北 1:1 全息地圖規範  
> **現行架構**：Leaflet 1.9.4（Canvas 渲染模式）＋ NLSC 國土測繪圖資 ＋ OSM 路網資料。

### 套件清理與留存說明：
1. **`vendor/leaflet/`**：保留完整離線版 Leaflet 1.9.4（`leaflet.js`, `leaflet.css`, images），供應離線與無外部 CDN 環境下之 1:1 地圖與微觀 20.5x 街道俯視模式。
2. **`vendor/maplibre/`**：已於 Round 137 依 P-02 規範徹底移除。專案現行不採用向量瓦片引擎，徹底消除未調用套件之空間佔用。
