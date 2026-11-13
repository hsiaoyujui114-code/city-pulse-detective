# 📦 第三方前端套件說明 (Vendor Assets Specification)

> **遵循規範**：P-02 / ISSUE-04 套件純淨化鐵則  
> **現行架構**：採用極速原生 HTML5 Canvas 2D ＋ Leaflet 1.9.4 ＋ Node.js `ws` 原生 WebSocket。

### 套件清理與留存說明：
1. **已移除之閒置套件**：
   - `pixi.min.js`：已於 Round 137 依 P-02 規範徹底移除。現行遊戲地圖與 2.5D 沙盤已全數由原生 Canvas API 繪製，無須引入 PixiJS。
   - `socket.io.min.js`：已於 Round 137 依 P-02 規範徹底移除。現行多人即時通訊採用輕量無依賴之原生 WebSocket (`ws`) 協定。
2. **Phase 2+ 擴充規劃**：
   - 如未來升級大型 WebGL 著色器或跨伺服器房間廣播時，將依需求透過 npm 模組化打包引入，不於靜態根目錄殘留未使用的預載檔案。
