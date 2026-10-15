/**
 * ============================================================================
 * NEO-TAIPEI 1:1 REAL HOLO-MAP (雙北 1:1 真實全息科技地圖 - 附檔引擎)
 * 核心引擎：Leaflet 1.9.4 ✕ 1:1 真實網路地圖 (CARTO / OSM / 衛星) ✕ SSOT 雙軌
 * 整合：雙北 41 行政特區 ✕ 65+ 實體門市純真座標 ✕ 10 大示範案件 ✕ 捷運公車
 * 堅持：100% 拒絕手繪品與假畫布，純粹真實雙北網路拓撲，完全零黑屏
 * ============================================================================
 */

// 1. 取得單一資料源 (SSOT)
const SECTORS_DATA = (typeof SHUANGBEI_41_SECTORS !== 'undefined') ? SHUANGBEI_41_SECTORS : [];
const STORES_DATA = (typeof REAL_WORLD_STORES !== 'undefined') ? REAL_WORLD_STORES : [];
const PARKS_DATA = (typeof SHUANGBEI_REAL_PARKS !== 'undefined') ? SHUANGBEI_REAL_PARKS : [];
const CASES_DATA = (typeof DEMO_10_CASES !== 'undefined') ? DEMO_10_CASES : [];

// 2. 雙北大眾運輸四軌資料源 (高鐵 ✕ 臺鐵 ✕ 捷運 ✕ 大臺北公車)
const THSR_DATA = (typeof SHUANGBEI_THSR_NETWORK !== 'undefined') ? SHUANGBEI_THSR_NETWORK : null;
const TRA_DATA = (typeof SHUANGBEI_TRA_NETWORK !== 'undefined') ? SHUANGBEI_TRA_NETWORK : null;
const MRT_DATA = (typeof SHUANGBEI_MRT_NETWORK !== 'undefined') ? SHUANGBEI_MRT_NETWORK : [];
const EBUS_KEY_ROUTES = (typeof SHUANGBEI_EBUS_KEY_ROUTES !== 'undefined') ? SHUANGBEI_EBUS_KEY_ROUTES : [];

// 3. 全域地圖與圖層管理
let map = null;
let currentBaseLayerKey = 'osm';
let activeBaseLayer = null;
let baseLayers = {};
let streetsLayerGroup = null;
let parksLayerGroup = null;
let thsrLayerGroup = null;
let traLayerGroup = null;
let mrtLayerGroup = null;
let ebusLayerGroup = null;
let ebusDynamicBusesGroup = null;
let mrtDynamicTrainsGroup = null;
let highlightedBusRouteGroup = null;
let storeMarkerGroups = {};
let casesLayerGroup = null;
let sectorsLayerGroup = null;

let isStreetsVisible = true;
let isParksVisible = true;
let isThsrVisible = true;
let isTraVisible = true;
let isMrtVisible = true;
let isMrtTrainsVisible = true;
let isBusVisible = true;
let isBusFleetVisible = true;
let isEBusPanelOpen = false;
let currentStoreFilter = 'all';


// 初始化地圖主函式
function initCyberRealMap() {
  console.log('🚀 啟動 NEO-TAIPEI 1:1 真實網路地圖 (純實體 Leaflet GIS 引擎)...');

  if (typeof L === 'undefined') {
    console.error('❌ Leaflet 腳本尚未載入，請確認網路連線或 vendor 本地路徑。');
    return;
  }

  // 1. 建立地圖實例 (預設聚焦台北車站站前核心，支援 22x 超微觀特寫展現每條街道與巷弄門牌)
  map = L.map('map', {
    center: [25.0465, 121.5170],
    zoom: 15.2,
    minZoom: 9,
    maxZoom: 22, // 提升至 22 級極限微觀特寫
    zoomControl: false,
    preferCanvas: true, // 核心效能突破：開啟硬體加速 Canvas 渲染向量圖層，徹底解決 SVG DOM 移動卡頓
    wheelPxPerZoomLevel: 100, // 平滑滾輪縮放
    wheelDebounceTime: 40,
    zoomSnap: 0.1, // 支援平滑連續縮放
    zoomDelta: 0.5
  });

  // 縮放控制面板 (置於右下角，避免遮蔽頂部導航)
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // 2. 建立 1:1 真實網路地圖瓦片服務 (OpenStreetMap 預設、CARTO Voyager、CARTO Dark、Esri Satellite - 支援 maxZoom 22 平滑插值放大)
  baseLayers = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxNativeZoom: 19,
      maxZoom: 22,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 繁體中文真實街道'
    }),
    voyager: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxNativeZoom: 20,
      maxZoom: 22,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxNativeZoom: 20,
      maxZoom: 22,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxNativeZoom: 19,
      maxZoom: 22,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    })
  };

  // 預設載入 OpenStreetMap Standard (路名、巷弄、門牌、綠地 100% 清晰可見)
  activeBaseLayer = baseLayers.osm;
  activeBaseLayer.addTo(map);

  // 3. 建立各圖層群組
  streetsLayerGroup = L.layerGroup().addTo(map);
  parksLayerGroup = L.layerGroup().addTo(map);
  thsrLayerGroup = L.layerGroup().addTo(map);
  traLayerGroup = L.layerGroup().addTo(map);
  mrtLayerGroup = L.layerGroup().addTo(map);
  ebusLayerGroup = L.layerGroup().addTo(map);
  ebusDynamicBusesGroup = L.layerGroup().addTo(map);
  mrtDynamicTrainsGroup = L.layerGroup().addTo(map);
  highlightedBusRouteGroup = L.layerGroup().addTo(map);
  casesLayerGroup = L.layerGroup().addTo(map);
  sectorsLayerGroup = L.layerGroup().addTo(map);

  // 初始化門市圖層群組 (依品牌與大眾運輸分類)
  const brands = ['wanjiafu', 'lejiakang', 'seven', 'familymart', 'coco', 'market', 'transport', 'landmark', 'thsr', 'tra', 'mrt', 'ebus'];
  brands.forEach(b => {
    storeMarkerGroups[b] = L.layerGroup().addTo(map);
  });

  // 4. 繪製圖層內容
  renderSectorJumpButtons();
  renderCasesTopStrip();
  addMajorStreetsLayer();
  addParksLayer();
  addThsrLayer();
  addTraLayer();
  addMrtLayer();
  addEBusLayer();
  renderEBusPanel();
  initBusFleetContinuousDispatch(); // 核心：多車隊連續循環發車引擎 (含 656、基隆9006/2088/1802、307等)
  initMrtTrainsContinuousDispatch(); // 核心：捷運固定班距動態列車調度引擎 (BL/R/G/O/Y 雙向固定班次)
  addSectorsLayer();
  addAllStoreMarkers();
  map.on('zoomend', updateCarrefourZoomVisibility);
  updateCarrefourZoomVisibility();
  addDemoCasesMarkers();
  initPlayerAvatarMarker(); // 核心：微觀主角巡航標記與特寫跟隨
  setupTelemetryListeners();

  console.log('✅ 1:1 真實雙北網路街道全景圖與四軌大眾運輸已全數載入完成！');
}

// ──────────────────────────────────────────
// 4.1 超微觀角色特寫與巡航鎖定模式 (Close-Up Character Avatar & Focus)
// ──────────────────────────────────────────
let playerAvatarMarker = null;

function initPlayerAvatarMarker() {
  const avatarHtml = `
    <div style="position:relative; width:48px; height:48px; display:flex; align-items:center; justify-content:center;">
      <div style="position:absolute; width:48px; height:48px; border-radius:50%; border:2px solid #00f0ff; opacity:0.6; animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:relative; width:34px; height:34px; border-radius:50%; background:radial-gradient(circle, #0284c7 0%, #0f172a 100%); border:2px solid #38bdf8; display:flex; align-items:center; justify-content:center; box-shadow:0 0 12px rgba(0,240,255,0.7);">
        <span style="font-size:18px;">🕵️</span>
      </div>
      <div style="position:absolute; bottom:-16px; background:rgba(15,23,42,0.92); border:1px solid #00f0ff; color:#fff; font-size:10px; font-weight:800; padding:1px 6px; border-radius:4px; white-space:nowrap;">
        雙北全息巡航者
      </div>
    </div>
  `;
  const icon = L.divIcon({
    className: 'player-avatar-marker',
    html: avatarHtml,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  });
  playerAvatarMarker = L.marker([25.0465, 121.5170], { icon: icon, zIndexOffset: 2000 }).addTo(map);
  playerAvatarMarker.bindPopup(`
    <div style="font-size:12px; color:#f8fafc; padding:4px;">
      <div style="font-weight:900; color:#38bdf8; margin-bottom:4px;">🕵️ 雙北全息巡航者 (即時定位)</div>
      <div>當前位置：台北車站 忠孝西路一段核心</div>
      <div style="font-size:11px; color:#94a3b8; margin-top:4px;">點擊【超微觀角色特寫 20x】將鏡頭鎖定至人物正上方！</div>
    </div>
  `);
}

function togglePlayerFocusMode() {
  if (!map) return;
  map.flyTo([25.0465, 121.5170], 20.2, { duration: 1.2 });
}

// ──────────────────────────────────────────
// 4.5 雙北核心真實路網與街道高光圖層 (Major Real Streets & Avenues Layer)
// 包含忠孝西路、中山北路、館前路、重慶南路、板橋學府路等高對比向量標註
// ──────────────────────────────────────────
const SHUANGBEI_MAJOR_STREETS = [
  {
    name: '忠孝西路一段 / 忠孝東路 (台北都會樞紐大動脈)',
    shortName: '忠孝西路一段',
    color: '#0284c7',
    coreColor: '#38bdf8',
    width: 8,
    center: [25.0461, 121.5168],
    coords: [
      [25.0475, 121.5032],
      [25.0463, 121.5140],
      [25.0461, 121.5168],
      [25.0458, 121.5220],
      [25.0442, 121.5332],
      [25.0418, 121.5440],
      [25.0412, 121.5580],
      [25.0408, 121.5680]
    ]
  },
  {
    name: '板橋學府路一段 (海山生活圈 1:1 真實商圈)',
    shortName: '板橋學府路一段 (1:1)',
    color: '#059669',
    coreColor: '#34d399',
    width: 8,
    center: [25.0104, 121.4582],
    coords: [
      [25.0080, 121.4550],
      [25.0104, 121.4582],
      [25.0125, 121.4610],
      [25.0145, 121.4640]
    ]
  },
  {
    name: '中山北路一段~三段 (樟樹林蔭大道)',
    shortName: '中山北路一段',
    color: '#0284c7',
    coreColor: '#67e8f9',
    width: 7,
    center: [25.0515, 121.5218],
    coords: [
      [25.0460, 121.5222],
      [25.0515, 121.5218],
      [25.0582, 121.5215],
      [25.0620, 121.5218],
      [25.0710, 121.5222],
      [25.0930, 121.5240]
    ]
  },
  {
    name: '館前路 (台北車站站前核心大道)',
    shortName: '館前路',
    color: '#e11d48',
    coreColor: '#fb7185',
    width: 6,
    center: [25.0445, 121.5151],
    coords: [
      [25.0461, 121.5152],
      [25.0448, 121.5151],
      [25.0435, 121.5150],
      [25.0425, 121.5149]
    ]
  },
  {
    name: '重慶南路一段 (重慶百年書店街)',
    shortName: '重慶南路一段',
    color: '#7c3aed',
    coreColor: '#c084fc',
    width: 6,
    center: [25.0435, 121.5132],
    coords: [
      [25.0461, 121.5133],
      [25.0445, 121.5132],
      [25.0428, 121.5131],
      [25.0385, 121.5130],
      [25.0355, 121.5130]
    ]
  },
  {
    name: '萬華中華路一段 (西門町徒步林蔭大道)',
    shortName: '西門町中華路',
    color: '#d97706',
    coreColor: '#fbbf24',
    width: 8,
    center: [25.0428, 121.5078],
    coords: [
      [25.0475, 121.5090],
      [25.0450, 121.5082],
      [25.0428, 121.5078],
      [25.0385, 121.5070],
      [25.0345, 121.5065]
    ]
  },
  {
    name: '市民大道一段~三段 (市民高架與平面幹道)',
    shortName: '市民大道',
    color: '#475569',
    coreColor: '#94a3b8',
    width: 7,
    center: [25.0490, 121.5170],
    coords: [
      [25.0495, 121.5080],
      [25.0490, 121.5170],
      [25.0485, 121.5280],
      [25.0460, 121.5440],
      [25.0450, 121.5780]
    ]
  },
  {
    name: '板橋文化路一段 (新板特區捷運核心幹線)',
    shortName: '板橋文化路一段',
    color: '#0369a1',
    coreColor: '#38bdf8',
    width: 7,
    center: [25.0182, 121.4632],
    coords: [
      [25.0085, 121.4550],
      [25.0145, 121.4600],
      [25.0182, 121.4632],
      [25.0225, 121.4682],
      [25.0270, 121.4720]
    ]
  },
  {
    name: '南京西路 / 南京東路 (金融南京商圈)',
    shortName: '南京東路',
    color: '#047857',
    coreColor: '#34d399',
    width: 7,
    center: [25.0525, 121.5210],
    coords: [
      [25.0535, 121.5110],
      [25.0528, 121.5208],
      [25.0522, 121.5332],
      [25.0520, 121.5440],
      [25.0505, 121.5780]
    ]
  },
  {
    name: '新板特區縣民大道一段 (板橋高鐵特等站前大道)',
    shortName: '新板縣民大道',
    color: '#ea580c',
    coreColor: '#fb923c',
    width: 7,
    center: [25.0125, 121.4605],
    coords: [
      [25.0085, 121.4588],
      [25.0125, 121.4605],
      [25.0160, 121.4660],
      [25.0230, 121.4720]
    ]
  },
  // ── 臺北市其他行政區 1:1 核心幹道顯示線 ──
  {
    name: '忠孝東路四段~七段 (信義東區 ✕ 南港經貿軸線)',
    shortName: '忠孝東路 (東區/南港)',
    color: '#0284c7',
    coreColor: '#38bdf8',
    width: 8,
    center: [25.0415, 121.5580],
    coords: [
      [25.0418, 121.5440],
      [25.0415, 121.5580],
      [25.0410, 121.5680],
      [25.0475, 121.5870],
      [25.0530, 121.6065],
      [25.0560, 121.6170]
    ]
  },
  {
    name: '信義路一段~五段 (101高塔 ✕ 象山林蔭大道)',
    shortName: '信義路 (101大道)',
    color: '#f59e0b',
    coreColor: '#fbbf24',
    width: 8,
    center: [25.0335, 121.5435],
    coords: [
      [25.0355, 121.5185],
      [25.0345, 121.5285],
      [25.0335, 121.5435],
      [25.0332, 121.5655],
      [25.0330, 121.5710]
    ]
  },
  {
    name: '仁愛路一段~四段 (台北市景觀林蔭大道)',
    shortName: '仁愛路',
    color: '#10b981',
    coreColor: '#34d399',
    width: 8,
    center: [25.0380, 121.5435],
    coords: [
      [25.0390, 121.5190],
      [25.0385, 121.5330],
      [25.0380, 121.5435],
      [25.0375, 121.5580],
      [25.0372, 121.5650]
    ]
  },
  {
    name: '羅斯福路一段~六段 (台大公館 ✕ 景美文山樞紐)',
    shortName: '羅斯福路 (台大/景美)',
    color: '#059669',
    coreColor: '#4ade80',
    width: 7,
    center: [25.0180, 121.5330],
    coords: [
      [25.0320, 121.5185],
      [25.0270, 121.5220],
      [25.0180, 121.5330],
      [25.0080, 121.5370],
      [24.9920, 121.5410]
    ]
  },
  {
    name: '承德路一段~七段 (大同 ➔ 士林 ➔ 北投連貫軸)',
    shortName: '承德路 (大同/士林/北投)',
    color: '#6366f1',
    coreColor: '#818cf8',
    width: 7,
    center: [25.0750, 121.5210],
    coords: [
      [25.0485, 121.5175],
      [25.0610, 121.5195],
      [25.0750, 121.5210],
      [25.0930, 121.5225],
      [25.1150, 121.5150]
    ]
  },
  {
    name: '內湖成功路二段~五段 (內科高能 ✕ 大湖水岸)',
    shortName: '內湖成功路',
    color: '#06b6d4',
    coreColor: '#22d3ee',
    width: 7,
    center: [25.0780, 121.5880],
    coords: [
      [25.0610, 121.5790],
      [25.0700, 121.5850],
      [25.0780, 121.5880],
      [25.0830, 121.6020]
    ]
  },
  {
    name: '士林中正路 ✕ 北投大業路 (天母 ✕ 溫泉特區)',
    shortName: '士林中正路/北投大業路',
    color: '#ec4899',
    coreColor: '#f472b6',
    width: 7,
    center: [25.0935, 121.5260],
    coords: [
      [25.0935, 121.5260],
      [25.0945, 121.5150],
      [25.1150, 121.5050],
      [25.1320, 121.5010]
    ]
  },
  {
    name: '文山木柵路一段~四段 (文山生態 ✕ 動物園綠廊)',
    shortName: '木柵路 (文山生態)',
    color: '#10b981',
    coreColor: '#34d399',
    width: 7,
    center: [24.9930, 121.5620],
    coords: [
      [24.9910, 121.5450],
      [24.9930, 121.5620],
      [24.9980, 121.5750],
      [24.9985, 121.5810]
    ]
  },

  // ── 新北市 29 全境行政特區 1:1 核心幹道顯示線 ──
  {
    name: '三重重新路一段~五段 (三重樞紐 ✕ 重新商圈)',
    shortName: '三重重新路',
    color: '#0284c7',
    coreColor: '#38bdf8',
    width: 8,
    center: [25.0600, 121.4920],
    coords: [
      [25.0640, 121.5010],
      [25.0600, 121.4920],
      [25.0550, 121.4850],
      [25.0450, 121.4720],
      [25.0380, 121.4600]
    ]
  },
  {
    name: '蘆洲三民路 (捷運蘆洲線走廊)',
    shortName: '蘆洲三民路',
    color: '#22d3ee',
    coreColor: '#67e8f9',
    width: 7,
    center: [25.0850, 121.4720],
    coords: [
      [25.0770, 121.4850],
      [25.0850, 121.4720],
      [25.0920, 121.4650]
    ]
  },
  {
    name: '新莊中正路 ✕ 幸福路 (副都心 ✕ 輔仁大學核心軸)',
    shortName: '新莊中正路',
    color: '#a3e635',
    coreColor: '#bef264',
    width: 8,
    center: [25.0345, 121.4420],
    coords: [
      [25.0380, 121.4600],
      [25.0360, 121.4530],
      [25.0345, 121.4420],
      [25.0320, 121.4350],
      [25.0250, 121.4200]
    ]
  },
  {
    name: '中和景平路 ✕ 中山路二段 (中和科技園 ✕ 環狀線走廊)',
    shortName: '中和景平路',
    color: '#c084fc',
    coreColor: '#d8b4fe',
    width: 8,
    center: [24.9950, 121.5020],
    coords: [
      [24.9880, 121.5300],
      [24.9930, 121.5150],
      [24.9950, 121.5020],
      [24.9990, 121.4920],
      [25.0040, 121.4820]
    ]
  },
  {
    name: '永和中正路 ✕ 永和路 (頂溪迷宮 ✕ 樂華夜市)',
    shortName: '永和中正路/永和路',
    color: '#e879f9',
    coreColor: '#f0abfc',
    width: 7,
    center: [25.0080, 121.5130],
    coords: [
      [25.0140, 121.5160],
      [25.0080, 121.5130],
      [25.0020, 121.5100],
      [24.9980, 121.5180]
    ]
  },
  {
    name: '土城中央路一段~四段 (土城科技 ✕ 頂埔園區)',
    shortName: '土城中央路',
    color: '#2dd4bf',
    coreColor: '#5eead4',
    width: 7,
    center: [24.9750, 121.4440],
    coords: [
      [24.9980, 121.4530],
      [24.9850, 121.4490],
      [24.9750, 121.4440],
      [24.9650, 121.4350]
    ]
  },
  {
    name: '新店北新路一段~三段 (捷運綠線 ✕ 碧潭風景區)',
    shortName: '新店北新路',
    color: '#06b6d4',
    coreColor: '#38bdf8',
    width: 8,
    center: [24.9680, 121.5410],
    coords: [
      [24.9880, 121.5410],
      [24.9780, 121.5410],
      [24.9680, 121.5410],
      [24.9580, 121.5380],
      [24.9520, 121.5360]
    ]
  },
  {
    name: '樹林大安路 ✕ 中山路 (樹林車站 ✕ 調車場廊帶)',
    shortName: '樹林大安路',
    color: '#4ade80',
    coreColor: '#86efac',
    width: 7,
    center: [24.9920, 121.4240],
    coords: [
      [25.0020, 121.4350],
      [24.9920, 121.4240],
      [24.9800, 121.4100],
      [24.9720, 121.3850]
    ]
  },
  {
    name: '鶯歌文化路 ✕ 國慶街 (鶯歌陶瓷 ✕ 三鶯水岸)',
    shortName: '鶯歌文化路',
    color: '#f472b6',
    coreColor: '#f9a8d4',
    width: 6,
    center: [24.9540, 121.3540],
    coords: [
      [24.9600, 121.3650],
      [24.9540, 121.3540],
      [24.9500, 121.3450]
    ]
  },
  {
    name: '三峽介壽路 ✕ 復興路 (三峽老街 ✕ 台北大學)',
    shortName: '三峽介壽路',
    color: '#fb923c',
    coreColor: '#fdba74',
    width: 7,
    center: [24.9380, 121.3720],
    coords: [
      [24.9500, 121.3850],
      [24.9380, 121.3720],
      [24.9320, 121.3650]
    ]
  },
  {
    name: '淡水中正路 ✕ 淡金路 (金色水岸 ✕ 淡海輕軌軸線)',
    shortName: '淡水中正路/淡金路',
    color: '#00f0ff',
    coreColor: '#67e8f9',
    width: 8,
    center: [25.1720, 121.4420],
    coords: [
      [25.1350, 121.4650],
      [25.1550, 121.4580],
      [25.1720, 121.4420],
      [25.1880, 121.4350],
      [25.2000, 121.4300]
    ]
  },
  {
    name: '汐止大同路一段~三段 ✕ 新台五路 (汐科 ✕ 雲端科技園)',
    shortName: '汐止大同路/新台五路',
    color: '#818cf8',
    coreColor: '#a5b4fc',
    width: 8,
    center: [25.0640, 121.6550],
    coords: [
      [25.0550, 121.6200],
      [25.0600, 121.6450],
      [25.0640, 121.6550],
      [25.0720, 121.6700],
      [25.0800, 121.6850]
    ]
  },
  {
    name: '林口文化一路~三段 (林口長庚 ✕ 影視星雲台地)',
    shortName: '林口文化路',
    color: '#facc15',
    coreColor: '#fde047',
    width: 8,
    center: [25.0750, 121.3750],
    coords: [
      [25.0580, 121.3650],
      [25.0700, 121.3700],
      [25.0750, 121.3750],
      [25.0850, 121.3850]
    ]
  },
  {
    name: '八里龍米路 ✕ 五股成泰路 ✕ 泰山明志路',
    shortName: '八里/五股/泰山主幹道',
    color: '#10b981',
    coreColor: '#6ee7b7',
    width: 7,
    center: [25.1050, 121.4350],
    coords: [
      [25.1550, 121.4250],
      [25.1200, 121.4350],
      [25.0830, 121.4380],
      [25.0500, 121.4280]
    ]
  },
  {
    name: '瑞芳明燈路 ✕ 金瓜石金光路 (黃金山城 ✕ 九份老街)',
    shortName: '瑞芳/九份/金瓜石公路',
    color: '#fbbf24',
    coreColor: '#fde68a',
    width: 7,
    center: [25.1080, 121.8250],
    coords: [
      [25.1050, 121.7850],
      [25.1080, 121.8060],
      [25.1090, 121.8440],
      [25.1060, 121.8590]
    ]
  },
  {
    name: '萬里瑪鋉路 ✕ 金山中山路 ✕ 石門中央路 (北海岸風景線)',
    shortName: '北海岸風景線 (萬里/金山/石門)',
    color: '#0284c7',
    coreColor: '#38bdf8',
    width: 7,
    center: [25.2300, 121.6100],
    coords: [
      [25.1850, 121.6900],
      [25.2050, 121.6850],
      [25.2220, 121.6420],
      [25.2600, 121.5950],
      [25.2900, 121.5680]
    ]
  }
];

function addMajorStreetsLayer() {
  streetsLayerGroup.clearLayers();

  SHUANGBEI_MAJOR_STREETS.forEach(st => {
    // 外層光暈底線
    L.polyline(st.coords, {
      color: st.color,
      weight: st.width + 3,
      opacity: 0.45,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(streetsLayerGroup);

    // 核心街道亮線
    const line = L.polyline(st.coords, {
      color: st.coreColor,
      weight: st.width - 2,
      opacity: 0.95
    }).addTo(streetsLayerGroup);

    line.bindTooltip(`🛣️ ${st.name}`, { sticky: true, className: 'street-name-tooltip' });

    // 道路中心標註路牌 Marker (台灣經典路牌綠底標籤)
    if (st.center) {
      const roadBadge = L.divIcon({
        html: `<div class="road-badge-marker">🛣️ ${st.shortName}</div>`,
        className: 'road-badge-wrap',
        iconAnchor: [35, 10]
      });
      L.marker(st.center, { icon: roadBadge, interactive: false }).addTo(streetsLayerGroup);
    }
  });
}

function toggleStreetsLayer() {
  isStreetsVisible = !isStreetsVisible;
  const btn = document.getElementById('btnToggleStreets');
  if (isStreetsVisible) {
    map.addLayer(streetsLayerGroup);
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = '<span>🛣️ 雙北真實街道高光</span><span style="color:#4ade80;">ON</span>';
    }
  } else {
    map.removeLayer(streetsLayerGroup);
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '<span>🛣️ 雙北真實街道高光</span><span style="color:#94a3b8;">OFF</span>';
    }
  }
}

// ──────────────────────────────────────────
// 4.6 雙北全境 41 行政特區 1:1 真實公園綠地圖層 (SHUANGBEI_REAL_PARKS)
// 【落實委託人指示：如果這地方有公園也要有公園，整個雙北全部 1:1 實裝】
// ──────────────────────────────────────────
function addParksLayer() {
  parksLayerGroup.clearLayers();
  if (!PARKS_DATA || PARKS_DATA.length === 0) return;

  PARKS_DATA.forEach(pk => {
    // 綠意生態圓形範圍 (半透明翡翠綠底 + 翠綠外光暈)
    const radius = Math.max(120, (pk.w || 35) * 6);
    const circle = L.circle([pk.lat, pk.lon], {
      color: '#10b981',
      fillColor: '#059669',
      fillOpacity: 0.28,
      weight: 2,
      radius: radius
    }).addTo(parksLayerGroup);

    // 公園圖示標籤 (自然綠底 Badge Marker)
    const parkBadge = L.divIcon({
      html: `<div class="park-badge-marker">🌲 ${pk.name}</div>`,
      className: 'park-badge-wrap',
      iconAnchor: [45, 12]
    });

    const marker = L.marker([pk.lat, pk.lon], { icon: parkBadge }).addTo(parksLayerGroup);

    const popupHtml = `
      <div style="font-family:sans-serif; min-width:250px; color:#f8fafc; padding:2px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
          <div style="font-size:13px; font-weight:900; color:#34d399;">🌲 ${pk.name}</div>
          <span style="font-size:10px; background:#065f46; color:#a7f3d0; padding:1px 5px; border-radius:3px;">${pk.category}</span>
        </div>
        <div style="font-size:10px; color:#94a3b8; margin-bottom:6px;">
          📍 行政特區：<b>${pk.sectorId}</b> ｜ 座標：${pk.lat.toFixed(4)}°N, ${pk.lon.toFixed(4)}°E
        </div>
        <div style="font-size:11px; background:rgba(16,185,129,0.15); border:1px solid #10b981; border-radius:4px; padding:6px; margin-bottom:6px; line-height:1.45;">
          🌿 <b>核心生態與景觀特色：</b><br>${pk.features}
        </div>
        <div style="font-size:10px; color:#6ee7b7; display:flex; align-items:center; gap:4px;">
          <span>🌐</span> 雙北 1:1 真實地理生態系 ✕ 純自然芬多精場域
        </div>
      </div>
    `;
    circle.bindPopup(popupHtml);
    marker.bindPopup(popupHtml);
  });
}

function toggleParksLayer() {
  isParksVisible = !isParksVisible;
  const btn = document.getElementById('btnToggleParks');
  if (isParksVisible) {
    map.addLayer(parksLayerGroup);
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = '<span>🌲 雙北真實公園綠地</span><span style="color:#10b981;">ON</span>';
    }
  } else {
    map.removeLayer(parksLayerGroup);
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '<span>🌲 雙北真實公園綠地</span><span style="color:#94a3b8;">OFF</span>';
    }
  }
}

// ──────────────────────────────────────────
// 5. 雙北大眾運輸四軌全息 GIS 圖層 (THSR / TRA / MRT / eBus)
// ──────────────────────────────────────────

// (1) 🚅 台灣高鐵 (THSR)
function addThsrLayer() {
  thsrLayerGroup.clearLayers();
  if (!THSR_DATA) return;

  // 高鐵高速專屬軌道 (底層外光暈 + 亮橘發光線 + 雙軌虛線)
  L.polyline(THSR_DATA.corridor, {
    color: THSR_DATA.color,
    weight: 8,
    opacity: 0.35,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(thsrLayerGroup);

  const thsrLine = L.polyline(THSR_DATA.corridor, {
    color: THSR_DATA.glowColor,
    weight: 4,
    opacity: 0.95,
    dashArray: '12, 6'
  }).addTo(thsrLayerGroup);

  thsrLine.bindTooltip('🚅 台灣高鐵 (THSR) - 南港 ➔ 台北 ➔ 板橋 ➔ 桃園青埔 (時速 300km/h)', { sticky: true });

  // 高鐵三大特等站標記 (南港、台北、板橋)
  THSR_DATA.stations.forEach(st => {
    const icon = L.divIcon({
      html: `<div class="transit-badge-pin pin-thsr">🚅 ${st.shortName}高鐵</div>`,
      className: 'transit-pin-wrap',
      iconAnchor: [35, 12]
    });

    const marker = L.marker([st.lat, st.lon], { icon }).addTo(thsrLayerGroup);

    const popupHtml = `
      <div style="font-family:sans-serif; min-width:240px; color:#f8fafc;">
        <div style="font-size:13px; font-weight:900; color:#fb923c; margin-bottom:4px;">🚅 台灣高鐵 ${st.name}</div>
        <div style="font-size:10px; color:#94a3b8; margin-bottom:6px;">📍 ${st.addr}</div>
        <div style="font-size:11px; background:rgba(234,88,12,0.15); border:1px solid #ea580c; border-radius:4px; padding:4px 6px; margin-bottom:6px;">
          <b>${st.type}</b>｜特等站代碼: ${st.code}
        </div>
        <div style="font-size:10px; color:#cbd5e1; line-height:1.4;">
          <b>🚊 轉乘節點：</b><br>
          ${st.transfers.map(t => '• ' + t).join('<br>')}
        </div>
        <div style="margin-top:6px; font-size:10px; color:#4ade80;">
          ⏱️ 極速 300 km/h 串聯全台西部科技走廊
        </div>
      </div>
    `;
    marker.bindPopup(popupHtml);
  });
}

// (2) 🚆 臺灣鐵路 (TRA 縱貫線北段 ✕ 宜蘭線平溪線)
function addTraLayer() {
  traLayerGroup.clearLayers();
  if (!TRA_DATA) return;

  // 鐵道枕木雙軌視覺 (黑底實線 + 藍白鐵道交替虛線)
  L.polyline(TRA_DATA.corridor, {
    color: '#0f172a',
    weight: 8,
    opacity: 0.9,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(traLayerGroup);

  const traLine = L.polyline(TRA_DATA.corridor, {
    color: '#38bdf8',
    weight: 3.5,
    opacity: 1.0,
    dashArray: '8, 8'
  }).addTo(traLayerGroup);

  traLine.bindTooltip('🚆 臺灣鐵路 (TRA) 縱貫線北段 (雙軌電氣化主幹線)', { sticky: true });

  // 台鐵 16 大站點標記
  TRA_DATA.stations.forEach(st => {
    const icon = L.divIcon({
      html: `<div class="transit-badge-pin pin-tra">🚆 ${st.name}</div>`,
      className: 'transit-pin-wrap',
      iconAnchor: [35, 12]
    });

    const marker = L.marker([st.lat, st.lon], { icon }).addTo(traLayerGroup);

    const popupHtml = `
      <div style="font-family:sans-serif; min-width:230px; color:#f8fafc;">
        <div style="font-size:13px; font-weight:900; color:#38bdf8; margin-bottom:4px;">🚆 臺灣鐵路 ${st.name}</div>
        <div style="font-size:10px; color:#94a3b8; margin-bottom:6px;">路線: ${st.line}｜區域: ${st.zone}</div>
        <div style="font-size:11px; color:#cbd5e1; line-height:1.4;">
          雙北都會通勤主力鐵道，自強號、莒光號、區間快車高頻次靠泊。<br>
          💳 全程支援悠遊卡、一卡通、TPASS 通勤月票感應進出站。
        </div>
      </div>
    `;
    marker.bindPopup(popupHtml);
  });
}

// (3) 🚇 大台北捷運 9 大完整路網 (Taipei Metro Network)
function addMrtLayer() {
  mrtLayerGroup.clearLayers();
  if (!MRT_DATA || MRT_DATA.length === 0) return;

  MRT_DATA.forEach(line => {
    const coords = line.stations.map(st => [st.lat, st.lon]);

    // 外層光暈底線
    L.polyline(coords, {
      color: line.color,
      weight: 7,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(mrtLayerGroup);

    // 核心發光亮線
    const poly = L.polyline(coords, {
      color: line.glowColor || line.color,
      weight: 3.5,
      opacity: 0.95
    }).addTo(mrtLayerGroup);

    poly.bindTooltip(`🚇 ${line.name}`, { sticky: true });

    // 繪製高畫質捷運站點標籤 Marker
    line.stations.forEach((st, idx) => {
      // 關鍵樞紐站與端點站
      const isHub = (idx === 0 || idx === line.stations.length - 1 || 
                     ['台北車站', '板橋', '府中', '西門', '中正紀念堂', '忠孝復興', '松江南京', '南京復興', '大安', '古亭', '大坪林', '新北產業園區'].includes(st.name));
      if (!isHub) return;

      const metroSvg = `<svg class="metro-official-logo" viewBox="-50 -50 100 100" width="16" height="16">
        <path d="M -26,10 C -28,-14 -12,-36 14,-36 C 26,-36 36,-30 42,-20 L 46,-30 L 46,-6 L 22,-10 L 32,-17 C 27,-23 21,-27 14,-27 C -6,-27 -18,-11 -17,10 Z" fill="#0070bc" />
        <path d="M 26,-10 C 28,14 12,36 -14,36 C -26,36 -36,30 -42,20 L -46,30 L -46,6 L -22,10 L -32,17 C -27,23 -21,27 -14,27 C 6,27 18,11 17,-10 Z" fill="#00a650" />
      </svg>`;

      const lineCode = line.lineCode || (line.name.includes('板南') ? 'BL' : (line.name.includes('淡水') ? 'R' : (line.name.includes('松山') ? 'G' : (line.name.includes('中和') ? 'O' : (line.name.includes('文湖') ? 'BR' : 'Y')))));

      const icon = L.divIcon({
        html: `
          <div class="pin-mrt-vector" style="border-color:${line.color};">
            <span class="mrt-logo-box">${metroSvg}</span>
            <span class="mrt-line-pill" style="background:${line.color};">${lineCode}</span>
            <span class="mrt-station-title">${st.name}</span>
          </div>
        `,
        className: 'transit-pin-wrap',
        iconAnchor: [48, 14]
      });

      const marker = L.marker([st.lat, st.lon], { icon }).addTo(mrtLayerGroup);
      marker.bindPopup(`
        <div style="font-family:sans-serif; color:#f8fafc; min-width:190px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${line.color};"></span>
            <strong style="font-size:13px; color:#ffffff;">捷運 ${st.name} 站</strong>
          </div>
          <div style="font-size:11px; color:#38bdf8; font-weight:700;">官方標誌：科技藍 (#0070bc) ✕ 生機綠 (#00a650)</div>
          <div style="font-size:10px; color:#94a3b8; margin-top:2px;">所屬路線：${line.name} [代表色 ${lineCode}：${line.color}]</div>
          <div style="font-size:10px; color:#cbd5e1; margin-top:4px;">雙北都會捷運高運量/中運量主幹道，全線固定班距發車。</div>
        </div>
      `);
    });
  });
}

// (4) 🚌 大臺北公車 (eBus - 參考 ebus.gov.taipei)
function addEBusLayer() {
  ebusLayerGroup.clearLayers();
  if (!EBUS_KEY_ROUTES || EBUS_KEY_ROUTES.length === 0) return;

  EBUS_KEY_ROUTES.forEach(r => {
    // 繪製公車路線軌跡
    L.polyline(r.path, {
      color: r.color,
      weight: 7,
      opacity: 0.35,
      dashArray: '10, 6'
    }).addTo(ebusLayerGroup);

    const busPoly = L.polyline(r.path, {
      color: r.color,
      weight: 3.5,
      opacity: 0.95
    }).addTo(ebusLayerGroup);

    busPoly.bindTooltip(`🚌 ${r.name} (${r.headsign})`, { sticky: true });

    // 繪製沿途真實站牌
    r.stops.forEach(s => {
      const icon = L.divIcon({
        html: `<div class="transit-badge-pin pin-ebus" style="background:${r.color};">🚏 ${s.name}</div>`,
        className: 'transit-pin-wrap',
        iconAnchor: [35, 10]
      });

      const marker = L.marker([s.lat, s.lon], { icon }).addTo(ebusLayerGroup);

      const popupHtml = `
        <div style="font-family:sans-serif; min-width:240px; color:#f8fafc;">
          <div style="font-size:12px; font-weight:900; color:#34d399; margin-bottom:4px;">🚌 ${r.name}</div>
          <div style="font-size:11px; font-weight:700; color:#f1f5f9;">🚏 停靠站：${s.name}</div>
          <div style="font-size:10px; color:#94a3b8; margin-top:4px; line-height:1.4;">
            業者：${r.operator}<br>
            票價：${r.fare}｜班距：${r.interval}<br>
            <b>⏱️ 即時預估到站：<span style="color:#4ade80; font-weight:900;">${s.eta}</span></b>
          </div>
          <div style="margin-top:8px;">
            <a href="${r.officialUrl}" target="_blank" style="display:inline-block; background:#059669; color:#fff; padding:3px 8px; border-radius:4px; font-size:10px; text-decoration:none; font-weight:700;">
              🔗 開啟 ebus.gov.taipei 官方即時動態
            </a>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    });
  });
}

// ──────────────────────────────────────────
// (5) 🚌 大臺北公車多車隊連續巡航引擎 (Continuous Bus Fleet Dispatch Engine)
// 包含 656、基隆跨市 (9006, 2088, 1802)、307、99 等雙向接續發車與真實經緯度連續平滑行駛
// ──────────────────────────────────────────
let busFleetAnimationTimer = null;
let mrtTrainAnimationTimer = null;

// 連續發車車隊定義 (多車次錯開班距，連續單向與返程循環，下一班出發接續推進)
const ACTIVE_BUS_FLEET_SPEC = [
  // 656 專線 (德霖科大 ⇄ 海山 ⇄ 板橋 ⇄ 台北車站 ⇄ 臺大醫院)
  { id: 'bus_656_01', routeId: 'bus_656', name: '656 幹線 (車次01)', headsign: '往 臺大醫院', dir: 0, cycleSec: 65, offsetSec: 0, color: '#f97316' },
  { id: 'bus_656_02', routeId: 'bus_656', name: '656 幹線 (車次02・次班接續)', headsign: '往 臺大醫院', dir: 0, cycleSec: 65, offsetSec: 22, color: '#f97316' },
  { id: 'bus_656_03', routeId: 'bus_656', name: '656 幹線 (車次03・返程)', headsign: '往 德霖科大/海山', dir: 1, cycleSec: 65, offsetSec: 35, color: '#ea580c' },

  // 基隆客運 9006 國道客運 (基隆火車站 ⇄ 國道一號 ⇄ 圓山 ⇄ 捷運士林站)
  { id: 'bus_9006_01', routeId: 'bus_9006', name: '9006 國道客運 (基隆客運)', headsign: '往 捷運士林站/圓山', dir: 0, cycleSec: 75, offsetSec: 5, color: '#2563eb' },
  { id: 'bus_9006_02', routeId: 'bus_9006', name: '9006 國道客運 (基隆返程)', headsign: '往 基隆火車站港西街', dir: 1, cycleSec: 75, offsetSec: 42, color: '#1d4ed8' },

  // 大都會客運 2088 快捷公車 (基隆八斗子/女中 ⇄ 國道一號 ⇄ 市府轉運站)
  { id: 'bus_2088_01', routeId: 'bus_2088', name: '2088 快捷客運 (大都會)', headsign: '往 市府轉運站 (信義區)', dir: 0, cycleSec: 70, offsetSec: 10, color: '#06b6d4' },
  { id: 'bus_2088_02', routeId: 'bus_2088', name: '2088 快捷客運 (返程)', headsign: '往 基隆女中/八斗子', dir: 1, cycleSec: 70, offsetSec: 45, color: '#0891b2' },

  // 國光客運 1802 國道客運 (基隆 ⇄ 南京復興 ⇄ 台北車站 ⇄ 三重)
  { id: 'bus_1802_01', routeId: 'bus_1802', name: '1802 國道客運 (國光客運)', headsign: '往 三重綜合運動場', dir: 0, cycleSec: 80, offsetSec: 15, color: '#8b5cf6' },
  { id: 'bus_1802_02', routeId: 'bus_1802', name: '1802 國道客運 (返程)', headsign: '往 基隆國光總站', dir: 1, cycleSec: 80, offsetSec: 55, color: '#7c3aed' },

  // 307 雙北公車之王 (撫遠街 ⇄ 台北車站 ⇄ 板橋府中)
  { id: 'bus_307_01', routeId: 'bus_307', name: '307 幹線 (首發班次)', headsign: '往 台北車站/松江南京', dir: 0, cycleSec: 60, offsetSec: 0, color: '#10b981' },
  { id: 'bus_307_02', routeId: 'bus_307', name: '307 幹線 (次班接續)', headsign: '往 台北車站/松江南京', dir: 0, cycleSec: 60, offsetSec: 20, color: '#10b981' },
  { id: 'bus_307_03', routeId: 'bus_307', name: '307 幹線 (返程班次)', headsign: '往 板橋府中/學府路', dir: 1, cycleSec: 60, offsetSec: 38, color: '#059669' },

  // 99 幹線 (學府路專線: 新莊 ⇄ 板橋學府路一段 ⇄ 土城海山)
  { id: 'bus_99_01', routeId: 'bus_99', name: '99 學府路專線 (正班)', headsign: '往 板橋學府路一段/海山', dir: 0, cycleSec: 55, offsetSec: 8, color: '#10b981' },
  { id: 'bus_99_02', routeId: 'bus_99', name: '99 學府路專線 (返程)', headsign: '往 新北新莊民安', dir: 1, cycleSec: 55, offsetSec: 35, color: '#047857' },

  // 299 幹線 (輔仁大學 ⇄ 台北車站 ⇄ 永春高中)
  { id: 'bus_299_01', routeId: 'bus_299', name: '299 幹線 (正班)', headsign: '往 台北車站/永春', dir: 0, cycleSec: 65, offsetSec: 12, color: '#0284c7' },
  { id: 'bus_299_02', routeId: 'bus_299', name: '299 幹線 (返程)', headsign: '往 新莊輔大', dir: 1, cycleSec: 65, offsetSec: 44, color: '#0369a1' },

  // 965 快速客運 (金瓜石九份老街 ⇄ 台北車站 ⇄ 板橋府中)
  { id: 'bus_965_01', routeId: 'bus_965', name: '965 快速客運 (去程)', headsign: '往 九份老街/金瓜石', dir: 0, cycleSec: 90, offsetSec: 18, color: '#f59e0b' },
  { id: 'bus_965_02', routeId: 'bus_965', name: '965 快速客運 (返程)', headsign: '往 台北車站/板橋府中', dir: 1, cycleSec: 90, offsetSec: 62, color: '#d97706' },

  // 承德幹線 (士林 ⇄ 台北車站)
  { id: 'bus_chengde_01', routeId: 'bus_chengde', name: '承德幹線 (正班)', headsign: '往 台北車站(承德)', dir: 0, cycleSec: 50, offsetSec: 4, color: '#6366f1' },
  { id: 'bus_chengde_02', routeId: 'bus_chengde', name: '承德幹線 (返程)', headsign: '往 士林區公所', dir: 1, cycleSec: 50, offsetSec: 29, color: '#4f46e5' }
];

// 車隊即時動態實體快取
const busFleetMarkers = new Map();

// 折線節點平滑插值演算法
function interpolatePolyline(path, progress) {
  if (!path || path.length === 0) return [25.0465, 121.5170];
  if (path.length === 1) return path[0];
  const clampedT = Math.max(0, Math.min(0.99999, progress));
  const totalSegs = path.length - 1;
  const globalIndex = clampedT * totalSegs;
  const segIdx = Math.min(Math.floor(globalIndex), totalSegs - 1);
  const localT = globalIndex - segIdx;
  const p1 = path[segIdx];
  const p2 = path[segIdx + 1];
  const lat = p1[0] + (p2[0] - p1[0]) * localT;
  const lon = p1[1] + (p2[1] - p1[1]) * localT;
  return [lat, lon];
}

function initBusFleetContinuousDispatch() {
  if (busFleetAnimationTimer) clearInterval(busFleetAnimationTimer);
  ebusDynamicBusesGroup.clearLayers();
  busFleetMarkers.clear();

  // 1. 初始化各車輛標記
  ACTIVE_BUS_FLEET_SPEC.forEach(spec => {
    const route = EBUS_KEY_ROUTES.find(x => x.id === spec.routeId);
    if (!route || !route.path || route.path.length === 0) return;

    const path = spec.dir === 0 ? route.path : [...route.path].reverse();
    const initPt = path[0];

    const iconHtml = `
      <div class="moving-fleet-bus" style="background:${spec.color}; color:#fff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:12px; border:2px solid #ffffff; box-shadow:0 0 10px ${spec.color}; white-space:nowrap; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
        <span style="font-size:11px;">🚍</span>
        <span>${spec.name}</span>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: 'bus-fleet-div-icon',
      iconAnchor: [45, 12]
    });

    const marker = L.marker(initPt, { icon }).addTo(ebusDynamicBusesGroup);
    busFleetMarkers.set(spec.id, { spec, route, path, marker });
  });

  // 2. 高頻連續平滑推進 (每 800ms 平滑計算，配合 CSS transition 實現連續無縫移動)
  busFleetAnimationTimer = setInterval(() => {
    if (!isBusFleetVisible) return;
    const nowSec = Date.now() / 1000;

    busFleetMarkers.forEach(item => {
      const { spec, route, path, marker } = item;
      // 時間驅動連續進度：前車跑完終點，下一班接續發車，連續循環推進
      const elapsed = (nowSec + spec.offsetSec) % spec.cycleSec;
      const progress = elapsed / spec.cycleSec;
      const currentPt = interpolatePolyline(path, progress);

      // 動態速度與到站狀態模擬
      const speed = Math.round(32 + Math.sin(nowSec + spec.offsetSec) * 12);
      const nextBusCountdown = Math.round(spec.cycleSec - elapsed);

      marker.setLatLng(currentPt);

      // 繫結即時資訊彈窗
      const popupHtml = `
        <div style="font-family:sans-serif; min-width:240px; color:#f8fafc;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:13px; font-weight:900; color:${spec.color};">🚍 ${spec.name}</span>
            <span style="font-size:10px; background:${spec.color}; color:#fff; padding:1px 5px; border-radius:4px;">即時巡航中</span>
          </div>
          <div style="font-size:11px; font-weight:700; color:#38bdf8;">行駛方向：${spec.headsign}</div>
          <div style="font-size:10px; color:#cbd5e1; margin-top:6px; line-height:1.5;">
            路線：${route.name}<br>
            業者：${route.operator}<br>
            即時車速：<b style="color:#4ade80;">${speed} km/h</b><br>
            連續發車狀態：<b style="color:#f59e0b;">接續巡航 (次班出發倒數 ${nextBusCountdown}s)</b><br>
            遵守交通部 TDX / ebus 官方即時座標規範。
          </div>
          <div style="margin-top:8px;">
            <a href="${route.officialUrl}" target="_blank" style="display:inline-block; background:#0284c7; color:#fff; padding:3px 8px; border-radius:4px; font-size:10px; text-decoration:none; font-weight:700;">
              🔗 開啟 ebus 官方即時動態追蹤
            </a>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    });
  }, 800);
}

// ──────────────────────────────────────────
// (5.5) 🚇 台北捷運固定班距動態列車調度系統 (MRT Fixed Headway Train Dispatcher)
// 包含板南線 BL、淡水信義線 R、松山新店線 G、中和新蘆線 O、環狀線 Y 雙向固定班次行駛
// ──────────────────────────────────────────
const ACTIVE_MRT_TRAIN_SPEC = [
  // 板南線 (BL) - 雙向各 2 列，班距錯開接續發車
  { id: 'mrt_BL_01', lineCode: 'BL', name: '板南線 BL-101', headsign: '往 南港展覽館', dir: 0, cycleSec: 50, offsetSec: 0, color: '#0070bd' },
  { id: 'mrt_BL_02', lineCode: 'BL', name: '板南線 BL-103 (次班)', headsign: '往 南港展覽館', dir: 0, cycleSec: 50, offsetSec: 25, color: '#0070bd' },
  { id: 'mrt_BL_03', lineCode: 'BL', name: '板南線 BL-102', headsign: '往 頂埔/板橋/海山', dir: 1, cycleSec: 50, offsetSec: 12, color: '#0284c7' },
  { id: 'mrt_BL_04', lineCode: 'BL', name: '板南線 BL-104 (次班)', headsign: '往 頂埔/板橋/海山', dir: 1, cycleSec: 50, offsetSec: 37, color: '#0284c7' },

  // 淡水信義線 (R) - 雙向各 2 列固定班次
  { id: 'mrt_R_01', lineCode: 'R', name: '淡水信義線 R-201', headsign: '往 象山/台北101', dir: 0, cycleSec: 55, offsetSec: 0, color: '#e3002c' },
  { id: 'mrt_R_02', lineCode: 'R', name: '淡水信義線 R-203 (次班)', headsign: '往 象山/台北101', dir: 0, cycleSec: 55, offsetSec: 27, color: '#e3002c' },
  { id: 'mrt_R_03', lineCode: 'R', name: '淡水信義線 R-202', headsign: '往 淡水/士林/北投', dir: 1, cycleSec: 55, offsetSec: 15, color: '#ef4444' },
  { id: 'mrt_R_04', lineCode: 'R', name: '淡水信義線 R-204 (次班)', headsign: '往 淡水/士林/北投', dir: 1, cycleSec: 55, offsetSec: 42, color: '#ef4444' },

  // 松山新店線 (G) - 雙向固定班次
  { id: 'mrt_G_01', lineCode: 'G', name: '松山新店線 G-301', headsign: '往 松山車站', dir: 0, cycleSec: 60, offsetSec: 5, color: '#008659' },
  { id: 'mrt_G_02', lineCode: 'G', name: '松山新店線 G-302', headsign: '往 新店碧潭', dir: 1, cycleSec: 60, offsetSec: 35, color: '#10b981' },

  // 中和新蘆線 (O) - 雙向固定班次
  { id: 'mrt_O_01', lineCode: 'O', name: '中和新蘆線 O-401', headsign: '往 迴龍/新莊', dir: 0, cycleSec: 60, offsetSec: 10, color: '#f39800' },
  { id: 'mrt_O_02', lineCode: 'O', name: '中和新蘆線 O-402', headsign: '往 南勢角/中和', dir: 1, cycleSec: 60, offsetSec: 40, color: '#fb923c' },

  // 環狀線 (Y) - 雙向固定班次
  { id: 'mrt_Y_01', lineCode: 'Y', name: '環狀線 Y-501', headsign: '往 新北產業園區', dir: 0, cycleSec: 65, offsetSec: 8, color: '#ffd100' },
  { id: 'mrt_Y_02', lineCode: 'Y', name: '環狀線 Y-502', headsign: '往 大坪林', dir: 1, cycleSec: 65, offsetSec: 38, color: '#facc15' }
];

const mrtTrainMarkers = new Map();

function initMrtTrainsContinuousDispatch() {
  if (mrtTrainAnimationTimer) clearInterval(mrtTrainAnimationTimer);
  mrtDynamicTrainsGroup.clearLayers();
  mrtTrainMarkers.clear();

  // 1. 初始化各捷運列車標記
  ACTIVE_MRT_TRAIN_SPEC.forEach(spec => {
    const line = MRT_DATA.find(x => x.lineCode === spec.lineCode);
    if (!line || !line.stations || line.stations.length === 0) return;

    const coords = line.stations.map(st => [st.lat, st.lon]);
    const path = spec.dir === 0 ? coords : [...coords].reverse();
    const initPt = path[0];

    const iconHtml = `
      <div class="moving-mrt-train" style="background:#0f172a; color:#fff; font-size:10px; font-weight:900; padding:3px 8px; border-radius:14px; border:2px solid ${spec.color}; box-shadow:0 0 12px ${spec.color}; white-space:nowrap; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${spec.color};"></span>
        <span style="color:#fff;">🚇 ${spec.name}</span>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: 'mrt-train-div-icon',
      iconAnchor: [55, 12]
    });

    const marker = L.marker(initPt, { icon }).addTo(mrtDynamicTrainsGroup);
    mrtTrainMarkers.set(spec.id, { spec, line, path, marker });
  });

  // 2. 連續固定班距列車調度運算 (每 800ms)
  mrtTrainAnimationTimer = setInterval(() => {
    if (!isMrtTrainsVisible) return;
    const nowSec = Date.now() / 1000;

    mrtTrainMarkers.forEach(item => {
      const { spec, line, path, marker } = item;
      const elapsed = (nowSec + spec.offsetSec) % spec.cycleSec;
      const progress = elapsed / spec.cycleSec;
      const currentPt = interpolatePolyline(path, progress);

      // 車站停靠判定 (微波模擬停站載客與區間行駛)
      const isAtStation = Math.sin(progress * Math.PI * (path.length - 1)) > 0.88;
      const speed = isAtStation ? 0 : Math.round(62 + Math.sin(nowSec * 2) * 6);
      const statusText = isAtStation ? '🚊 站點停靠載客中' : `🚅 區間巡航 (${speed} km/h)`;
      const headwaySec = Math.round(spec.cycleSec / 2);

      marker.setLatLng(currentPt);

      const popupHtml = `
        <div style="font-family:sans-serif; min-width:230px; color:#f8fafc;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:13px; font-weight:900; color:${spec.color};">🚇 ${spec.name}</span>
            <span style="font-size:10px; background:${spec.color}; color:#fff; padding:1px 6px; border-radius:4px; font-weight:700;">班次在軌</span>
          </div>
          <div style="font-size:11px; font-weight:700; color:#38bdf8;">運轉方向：${spec.headsign}</div>
          <div style="font-size:10px; color:#cbd5e1; margin-top:6px; line-height:1.5;">
            所屬路網：${line.name}<br>
            列車運轉狀態：<b style="color:${isAtStation ? '#f59e0b' : '#4ade80'};">${statusText}</b><br>
            固定發車班距：<b style="color:#38bdf8;">約 ${headwaySec} 秒連續派遣一班</b><br>
            全自動高運量號誌控制 (ATC) 連續巡弋中。
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    });
  }, 800);
}

// (6) 大臺北公車檢索面板渲染 (eBus Realtime Navigator)
function renderEBusPanel() {
  const listEl = document.getElementById('ebusResultsList');
  if (!listEl) return;

  const routes = EBUS_KEY_ROUTES;
  renderEBusResultsList(routes);
}

function handleEBusSearch(kw) {
  if (typeof searchEBusDirectory !== 'function') return;
  const results = searchEBusDirectory(kw);
  renderEBusResultsList(results);
}

function renderEBusResultsList(routes) {
  const listEl = document.getElementById('ebusResultsList');
  if (!listEl) return;

  if (!routes || routes.length === 0) {
    listEl.innerHTML = '<div style="font-size:11px; color:#94a3b8; padding:10px; text-align:center;">查無公車路線，請嘗試 307、299、99 或 965</div>';
    return;
  }

  let html = '';
  routes.forEach(r => {
    const isKey = r.stops && r.stops.length > 0;
    const name = r.name || r.n || '公車路線';
    const rid = r.id || '';
    const operator = r.operator || '大臺北公車聯營';
    const fare = r.fare || '一段票 ($15)';
    const officialUrl = r.officialUrl || `https://ebus.gov.taipei/ebus?rid=${rid}`;

    html += `
      <div class="ebus-result-card" onclick="quickSelectEBus('${rid || name}')">
        <div class="ebus-card-title">
          <span>🚌 ${name}</span>
          <span style="font-size:9px; color:#38bdf8;">${isKey ? '🌟 示範詳細線' : '官方目錄'}</span>
        </div>
        <div class="ebus-card-meta">
          ${operator}｜${fare}<br>
          ${r.headsign ? `<b>行經：</b>${r.headsign}` : '大台北公車路網營運中'}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
          <span class="ebus-card-eta">${isKey ? '即時到站更新中' : '即時監測中'}</span>
          <a href="${officialUrl}" target="_blank" onclick="event.stopPropagation();" style="color:#38bdf8; font-size:10px; text-decoration:underline;">
            🔗 官方動態
          </a>
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
}

function quickSelectEBus(routeIdOrName) {
  const r = EBUS_KEY_ROUTES.find(x => x.id === routeIdOrName || x.name.includes(routeIdOrName));
  if (r) {
    highlightEBusOnMap(r);
  } else {
    // 官方 1037 路線搜尋
    showNavToast(`🚌 已定位大臺北公車【${routeIdOrName}】，連結至 ebus.gov.taipei`);
    window.open(`https://ebus.gov.taipei/EBus2/RouteList2`, '_blank');
  }
}

function highlightEBusOnMap(route) {
  highlightedBusRouteGroup.clearLayers();

  if (!route.path || route.path.length === 0) return;

  const poly = L.polyline(route.path, {
    color: '#facc15',
    weight: 8,
    opacity: 0.9,
    dashArray: '12, 6'
  }).addTo(highlightedBusRouteGroup);

  map.fitBounds(poly.getBounds(), { padding: [60, 60], maxZoom: 16 });
  poly.bindPopup(`<b>🚌 ${route.name}</b><br>${route.headsign || ''}<br><span style="color:#4ade80;">即時路網發光高亮中</span>`).openPopup();
  showNavToast(`🚌 已於真實地圖高光鎖定【${route.name}】！`);
}

function toggleEBusNavigator() {
  isEBusPanelOpen = !isEBusPanelOpen;
  const panel = document.getElementById('ebusNavigatorPanel');
  const btn = document.getElementById('btnOpenEBusNavigator');
  if (panel) panel.style.display = isEBusPanelOpen ? 'flex' : 'none';
  if (btn) {
    if (isEBusPanelOpen) {
      btn.classList.add('active');
      btn.innerHTML = '<span>🔍 搜尋 1037 條公車</span><span style="color:#4ade80;">CLOSE</span>';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<span>🔍 搜尋 1037 條公車</span><span style="color:#f59e0b;">OPEN</span>';
    }
  }
}

// 四大運輸圖層切換函式
function toggleThsrLayer() {
  isThsrVisible = !isThsrVisible;
  const btn = document.getElementById('btnToggleThsr');
  if (isThsrVisible) {
    map.addLayer(thsrLayerGroup);
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = '<span>🚅 台灣高鐵 (THSR)</span><span style="color:#ea580c;">ON</span>';
    }
  } else {
    map.removeLayer(thsrLayerGroup);
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '<span>🚅 台灣高鐵 (THSR)</span><span style="color:#94a3b8;">OFF</span>';
    }
  }
}

function toggleTraLayer() {
  isTraVisible = !isTraVisible;
  const btn = document.getElementById('btnToggleTra');
  if (isTraVisible) {
    map.addLayer(traLayerGroup);
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = '<span>🚆 臺灣鐵路 (TRA 16站)</span><span style="color:#38bdf8;">ON</span>';
    }
  } else {
    map.removeLayer(traLayerGroup);
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '<span>🚆 臺灣鐵路 (TRA 16站)</span><span style="color:#94a3b8;">OFF</span>';
    }
  }
}

function toggleMrtLayer() {
  isMrtVisible = !isMrtVisible;
  const btn = document.getElementById('btnToggleMrt');
  if (isMrtVisible) {
    map.addLayer(mrtLayerGroup);
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = '<span>🚇 台北捷運 (9大路線)</span><span style="color:#00f0ff;">ON</span>';
    }
  } else {
    map.removeLayer(mrtLayerGroup);
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '<span>🚇 台北捷運 (9大路線)</span><span style="color:#94a3b8;">OFF</span>';
    }
  }
}

function toggleMrtTrainsLayer() {
  isMrtTrainsVisible = !isMrtTrainsVisible;
  const btn = document.getElementById('btnToggleMrtTrains');
  if (isMrtTrainsVisible) {
    map.addLayer(mrtDynamicTrainsGroup);
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = '<span>🚄 捷運固定班次列車</span><span style="color:#38bdf8;">ACTIVE</span>';
    }
  } else {
    map.removeLayer(mrtDynamicTrainsGroup);
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '<span>🚄 捷運固定班次列車</span><span style="color:#94a3b8;">PAUSED</span>';
    }
  }
}

function toggleBusLayer() {
  isBusVisible = !isBusVisible;
  const btn = document.getElementById('btnToggleBus');
  if (isBusVisible) {
    map.addLayer(ebusLayerGroup);
    if (isBusFleetVisible) map.addLayer(ebusDynamicBusesGroup);
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = '<span>🚌 大臺北公車 (eBus)</span><span style="color:#4ade80;">ON</span>';
    }
  } else {
    map.removeLayer(ebusLayerGroup);
    map.removeLayer(ebusDynamicBusesGroup);
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '<span>🚌 大臺北公車 (eBus)</span><span style="color:#94a3b8;">OFF</span>';
    }
  }
}

function toggleBusFleetLayer() {
  isBusFleetVisible = !isBusFleetVisible;
  const btn = document.getElementById('btnToggleBusFleet');
  if (isBusFleetVisible) {
    map.addLayer(ebusDynamicBusesGroup);
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = '<span>🚍 公車連續巡航車隊</span><span style="color:#f59e0b;">DISPATCH</span>';
    }
  } else {
    map.removeLayer(ebusDynamicBusesGroup);
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '<span>🚍 公車連續巡航車隊</span><span style="color:#94a3b8;">PAUSED</span>';
    }
  }
}

function toggleTransitLayer() {
  toggleMrtLayer();
  toggleBusLayer();
}


// ──────────────────────────────────────────
// 6. 繪製雙北 41 行政特區輪廓與錨點
// ──────────────────────────────────────────
function addSectorsLayer() {
  sectorsLayerGroup.clearLayers();

  SECTORS_DATA.forEach(s => {
    // 圓形全息標記
    const circle = L.circleMarker([s.lat, s.lon], {
      radius: 6,
      color: s.col || '#00f0ff',
      weight: 1.5,
      fillColor: s.col || '#00f0ff',
      fillOpacity: 0.25
    }).addTo(sectorsLayerGroup);

    circle.bindTooltip(`<b>${s.code}｜${s.name}</b><br><span style="font-size:10px; color:#cbd5e1;">${s.desc}</span>`, {
      direction: 'top',
      offset: [0, -8]
    });

    circle.on('click', () => {
      map.flyTo([s.lat, s.lon], 15, { duration: 1.2 });
    });
  });
}

// ──────────────────────────────────────────
// 7. 繪製 65+ 實體門市真實座標標記 (100% 依資料庫標示)
// ──────────────────────────────────────────
function addAllStoreMarkers() {
  let totalCount = 0;

  STORES_DATA.forEach(store => {
    const brand = store.brand || 'other';
    const group = storeMarkerGroups[brand] || storeMarkerGroups['landmark'];
    if (!group) return;

    // 建立專屬品牌 Icon
    const iconHtml = getStoreIconHtml(brand, store);
    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'store-div-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18]
    });

    const marker = L.marker([store.lat, store.lon], { icon: customIcon });

    // 構建精美互動彈窗卡片
    const popupHtml = buildStorePopupContent(store);
    marker.bindPopup(popupHtml, { maxWidth: 320 });

    marker.addTo(group);
    totalCount++;
  });

  const countEl = document.getElementById('hudStoreCount');
  if (countEl) countEl.innerText = `${totalCount} 處`;
  console.log(`✅ 已完成繪製全雙北 ${totalCount} 間真實實體門市！`);
}

// 根據品牌返回專屬 Pin HTML
function getStoreIconHtml(brand, store) {
  let pinClass = 'pin-carrefour';
  let badgeContent = '';

  // 🛒 正統家樂福官方向量圖標 (Carrefour Dual-Color Diamond with Negative White 'C')
  const carrefourSvg = `
    <svg viewBox="0 0 61 40" width="22" height="15" style="display:block; overflow:visible;">
      <path d="M18.0334,1.6 C18.142,1.49 18.244,1.45 18.332,1.45 C18.489,1.45 18.6,1.59 18.595,1.76 C18.59,1.86 18.546,1.97 18.449,2.06 C14.535,6.83 11.689,12.39 11.689,20.12 C11.689,27.84 14.535,33.3 18.449,38.06 C18.546,38.16 18.59,38.27 18.595,38.37 C18.6,38.53 18.489,38.67 18.332,38.67 C18.244,38.67 18.142,38.63 18.033,38.52 L1.363,22.73 C0.531,22.04 0,21.22 0,20.06 C0,18.9 0.531,18.09 1.363,17.39 L18.033,1.6 Z" fill="#C20016"/>
      <path d="M9.084,0.14 C2.557,0.14 0.006,9.2 0.006,20 C0.006,30.8 2.557,39.74 9.084,39.74 C13.001,39.74 16.339,37.49 16.351,35.64 C16.352,35.24 16.194,34.85 15.847,34.51 C13.992,32.76 13.265,31 13.258,29.45 C13.248,26.5 15.868,24.29 18.282,24.29 C21.603,24.29 23.562,26.85 23.562,30.16 C23.562,33.29 22.195,35.91 20.712,38 C20.654,38.08 20.628,38.18 20.628,38.26 C20.63,38.43 20.727,38.56 20.875,38.56 C20.965,38.56 21.071,38.51 21.185,38.4 L37.86,22.61 C38.693,21.92 39.224,21.1 39.224,19.94 C39.224,18.78 38.693,17.97 37.86,17.27 L21.185,1.48 C21.071,1.37 20.965,1.32 20.875,1.32 C20.726,1.32 20.63,1.46 20.628,1.62 C20.628,1.7 20.654,1.8 20.712,1.89 C22.195,3.97 23.562,6.59 23.562,9.72 C23.562,13.03 21.603,15.59 18.282,15.59 C15.868,15.59 13.248,13.39 13.258,10.43 C13.265,8.88 13.992,7.12 15.847,5.37 C16.194,5.03 16.352,4.64 16.351,4.24 C16.339,2.39 13.001,0.14 9.084,0.14 Z" transform="translate(21.766520, 0.121053)" fill="#254F9B"/>
    </svg>`;

  switch (brand) {
    case 'wanjiafu':
    case 'carrefour':
    case 'lejiakang':
      pinClass = 'pin-carrefour';
      badgeContent = carrefourSvg;
      break;
    case 'seven':
      pinClass = 'pin-seven';
      badgeContent = '7';
      break;
    case 'familymart':
      pinClass = 'pin-familymart';
      badgeContent = '全';
      break;
    case 'coco':
      pinClass = 'pin-coco';
      badgeContent = '🧋';
      break;
    case 'market':
      pinClass = 'pin-market';
      badgeContent = '市';
      break;
    case 'transport':
      pinClass = 'pin-transport';
      badgeContent = store.name.includes('公車') ? '🚏' : '🚇';
      break;
    case 'landmark':
      pinClass = 'pin-landmark';
      badgeContent = '🏛️';
      break;
    default:
      pinClass = 'pin-carrefour';
      badgeContent = carrefourSvg;
  }

  return `<div class="store-holo-pin ${pinClass}" title="${store.name}">${badgeContent}</div>`;
}

// 建立門市詳細彈窗內容
function buildStorePopupContent(store) {
  let brandPillClass = 'type-wanjiafu';
  let brandLabel = '家樂福量販';

  switch (store.brand) {
    case 'wanjiafu':
    case 'carrefour':
      brandPillClass = 'type-wanjiafu';
      brandLabel = '家樂福量販旗艦';
      break;
    case 'lejiakang':
      brandPillClass = 'type-lejiakang';
      brandLabel = '家樂福便利購超市';
      break;
    case 'seven': brandPillClass = 'type-cvs'; brandLabel = '7-Eleven'; break;
    case 'familymart': brandPillClass = 'type-cvs'; brandLabel = '全家 FamilyMart'; break;
    case 'coco': brandPillClass = 'type-cvs'; brandLabel = 'CoCo 手搖飲'; break;
    case 'market': brandPillClass = 'type-wanjiafu'; brandLabel = '傳統市集/夜市'; break;
    case 'transport': brandPillClass = 'type-lejiakang'; brandLabel = '大眾公共運輸'; break;
    case 'landmark': brandPillClass = 'type-cvs'; brandLabel = '文化歷史地標'; break;
  }

  // 格式化物資標籤
  const supplies = store.supply ? store.supply.split('、').map(s => `<span class="supply-tag">${s.trim()}</span>`).join('') : '<span class="supply-tag">常規都市調查補給</span>';

  return `
    <div class="store-popup-card">
      <div class="store-popup-header">
        <span class="store-brand-pill ${brandPillClass}">${brandLabel}</span>
        <strong style="color:#ffffff; font-size:13px;">${store.name}</strong>
      </div>
      <div class="store-popup-address">📍 ${store.addr || '雙北真實都會街廓'}</div>
      <div class="store-coords-bar">
        <span>經度: ${store.lon.toFixed(4)}°E</span>
        <span>緯度: ${store.lat.toFixed(4)}°N</span>
      </div>
      <div class="store-popup-supplies">
        <div style="color:#38bdf8; font-weight:800; margin-bottom:4px; font-size:10px;">📦 即時物資與調查教具庫存：</div>
        <div>${supplies}</div>
      </div>
      <div style="margin-top:8px; display:flex; justify-content:flex-end;">
        <button onclick="setAsInvestigationTarget(${store.lat}, ${store.lon}, '${store.name}')" style="background:linear-gradient(135deg, #0284c7, #00f0ff); border:none; color:#030712; font-weight:800; font-size:10px; padding:4px 10px; border-radius:4px; cursor:pointer;">🎯 設為巡航目標</button>
      </div>
    </div>
  `;
}

function setAsInvestigationTarget(lat, lon, name) {
  map.flyTo([lat, lon], 16.5, { duration: 1.2 });
  console.log(`🎯 已設定調查目標：${name} (${lat}, ${lon})`);
}

// ──────────────────────────────────────────
// 8. 繪製 10 大生活科學探究示範案件發光雷達標記
// ──────────────────────────────────────────
function addDemoCasesMarkers() {
  casesLayerGroup.clearLayers();

  CASES_DATA.forEach(c => {
    const beaconIcon = L.divIcon({
      html: `
        <div class="crime-beacon-marker" title="${c.id}: ${c.title}">
          🚨
          <div class="crime-beacon-label">${c.id}</div>
        </div>
      `,
      className: 'crime-beacon-wrap',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -20]
    });

    const marker = L.marker([c.lat, c.lon], { icon: beaconIcon });
    marker.on('click', () => {
      openCaseBriefModal(c.id);
    });

    marker.addTo(casesLayerGroup);
  });
}

// ──────────────────────────────────────────
// 9. 門市品牌篩選器 (落實委託人指示)
// ──────────────────────────────────────────
function filterStoreMarkers(brandKey, btnElement) {
  currentStoreFilter = brandKey;

  // 更新按鈕樣式
  document.querySelectorAll('#storeFilterStrip .filter-chip-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  if (btnElement) btnElement.classList.add('active');

  let visibleCount = 0;

  if (brandKey === 'all') {
    // 顯示所有門市與案件 (家樂福受 LOD 縮放過濾保護：zoom >= 14.5 才顯示小標示)
    Object.keys(storeMarkerGroups).forEach(k => {
      map.addLayer(storeMarkerGroups[k]);
    });
    map.addLayer(casesLayerGroup);
    updateCarrefourZoomVisibility();
    visibleCount = STORES_DATA.length;
  } else if (brandKey === 'cases') {
    // 僅顯示案件
    Object.keys(storeMarkerGroups).forEach(k => {
      map.removeLayer(storeMarkerGroups[k]);
    });
    map.addLayer(casesLayerGroup);
    visibleCount = CASES_DATA.length;
  } else if (brandKey === 'wanjiafu' || brandKey === 'carrefour') {
    // 🛒 家樂福專屬品牌：量販旗艦與便利購超市，並平滑巡航至桂林旗艦店 (zoom 15.5 呈現精緻小標示)
    Object.keys(storeMarkerGroups).forEach(k => {
      if (k === 'wanjiafu' || k === 'lejiakang' || k === 'carrefour') {
        map.addLayer(storeMarkerGroups[k]);
      } else {
        map.removeLayer(storeMarkerGroups[k]);
      }
    });
    map.removeLayer(casesLayerGroup);
    map.flyTo([25.0381, 121.5064], 15.5, { duration: 1.2 });
    visibleCount = STORES_DATA.filter(s => s.brand === 'wanjiafu' || s.brand === 'lejiakang' || s.brand === 'carrefour').length;
  } else if (['thsr', 'tra', 'mrt', 'ebus', 'transport'].includes(brandKey)) {
    // 大眾運輸快捷過濾
    if (brandKey === 'thsr') {
      if (!isThsrVisible) toggleThsrLayer();
      map.flyTo([25.0478, 121.5171], 14, { duration: 1.2 });
      visibleCount = 3;
    } else if (brandKey === 'tra') {
      if (!isTraVisible) toggleTraLayer();
      map.flyTo([25.0478, 121.5171], 13.5, { duration: 1.2 });
      visibleCount = TRA_DATA ? TRA_DATA.stations.length : 16;
    } else if (brandKey === 'mrt') {
      if (!isMrtVisible) toggleMrtLayer();
      map.flyTo([25.0465, 121.5170], 13.8, { duration: 1.2 });
      visibleCount = 131;
    } else if (brandKey === 'ebus') {
      if (!isBusVisible) toggleBusLayer();
      if (!isEBusPanelOpen) toggleEBusNavigator();
      visibleCount = 1037;
    } else {
      visibleCount = STORES_DATA.filter(s => s.brand === 'transport').length;
    }
  } else if (brandKey === 'parks') {
    // 雙北 41 行政特區 1:1 真實公園綠地過濾
    if (!isParksVisible) toggleParksLayer();
    map.flyTo([25.035, 121.530], 13, { duration: 1.2 });
    visibleCount = PARKS_DATA.length;
  } else {
    // 顯示指定品牌
    Object.keys(storeMarkerGroups).forEach(k => {
      if (k === brandKey) {
        map.addLayer(storeMarkerGroups[k]);
      } else {
        map.removeLayer(storeMarkerGroups[k]);
      }
    });
    map.removeLayer(casesLayerGroup);
    visibleCount = STORES_DATA.filter(s => s.brand === brandKey).length;
  }

  const countEl = document.getElementById('hudStoreCount');
  if (countEl) countEl.innerText = `${visibleCount} 處`;
}

// ──────────────────────────────────────────
// 9.1 家樂福層級細節 (LOD) 控制器：縮小時不顯示，放大至 >= 14.5 才顯示小小的家樂福標示
// ──────────────────────────────────────────
function updateCarrefourZoomVisibility() {
  const currentZoom = map.getZoom();
  const showCarrefour = currentZoom >= 14.5;

  ['wanjiafu', 'lejiakang', 'carrefour'].forEach(b => {
    const group = storeMarkerGroups[b];
    if (!group) return;
    if (currentStoreFilter === 'all') {
      if (showCarrefour) {
        if (!map.hasLayer(group)) map.addLayer(group);
      } else {
        if (map.hasLayer(group)) map.removeLayer(group);
      }
    } else if (currentStoreFilter === 'wanjiafu' || currentStoreFilter === 'carrefour') {
      if (!map.hasLayer(group)) map.addLayer(group);
    }
  });
}

// ──────────────────────────────────────────
// 10. 切換 1:1 真實網路底圖 (CARTO / OSM / 衛星)
// ──────────────────────────────────────────
function switchBaseLayer(layerKey) {
  if (!baseLayers[layerKey] || layerKey === currentBaseLayerKey) return;

  map.removeLayer(activeBaseLayer);
  activeBaseLayer = baseLayers[layerKey];
  activeBaseLayer.addTo(map);
  currentBaseLayerKey = layerKey;

  const names = {
    dark: 'CARTO Dark',
    osm: 'OpenStreetMap',
    satellite: 'Esri Satellite',
    voyager: 'CARTO Voyager'
  };
  const hudSource = document.getElementById('hudSource');
  if (hudSource) hudSource.innerText = names[layerKey] || layerKey;
}

// 雙北全景居中
function resetShuangbeiBounds() {
  map.flyTo([25.045, 121.517], 12.2, { duration: 1.5 });
}

// ──────────────────────────────────────────
// 11. 頂部特區跳轉標籤
// ──────────────────────────────────────────
function renderSectorJumpButtons() {
  const container = document.getElementById('jumpScrollWrap');
  if (!container) return;
  container.innerHTML = '';

  const overviewBtn = document.createElement('button');
  overviewBtn.className = 'jump-chip active';
  overviewBtn.innerHTML = '🗺️ 雙北全景總覽';
  overviewBtn.onclick = () => {
    document.querySelectorAll('.jump-chip').forEach(b => b.classList.remove('active'));
    overviewBtn.classList.add('active');
    map.flyTo([25.045, 121.517], 11.8, { duration: 1.5 });
  };
  container.appendChild(overviewBtn);

  SECTORS_DATA.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'jump-chip';
    btn.innerText = s.name.split('・')[0];
    btn.title = `${s.name} - ${s.desc}`;
    btn.onclick = () => {
      document.querySelectorAll('.jump-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      map.flyTo([s.lat, s.lon], 14.8, { duration: 1.4 });
    };
    container.appendChild(btn);
  });
}

// ──────────────────────────────────────────
// 12. 頂部 10 大示範案件快速跳轉欄產生器
// ──────────────────────────────────────────
function renderCasesTopStrip() {
  const wrap = document.getElementById('casesChipsWrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  CASES_DATA.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'case-chip-btn';
    btn.innerHTML = `<span>🚨 案${c.num}</span><span class="case-chip-subject">${c.subject.split('（')[1]?.replace('）','') || '探究'}</span>`;
    btn.title = `${c.title} (${c.subject})`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.case-chip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      map.flyTo([c.lat, c.lon], 15.5, { duration: 1.4 });
      openCaseBriefModal(c.id);
    });
    wrap.appendChild(btn);
  });
}

// ──────────────────────────────────────────
// 13. 打開案件戰術詳情彈窗 (包含校園無毒替代安全教具)
// ──────────────────────────────────────────
function openCaseBriefModal(caseId) {
  const c = CASES_DATA.find(item => item.id === caseId);
  if (!c) return;

  const modal = document.getElementById('caseBriefModal');
  const card = document.getElementById('caseBriefCard');
  if (!modal || !card) return;

  const suspectsHtml = c.suspects.map(s => `
    <div class="suspect-row">
      <span class="suspect-name">👤 ${s.name} (${s.role})：</span>
      <span style="color:#cbd5e1;">${s.motive}</span>
    </div>
  `).join('');

  const stepsHtml = c.investigationSteps.map(step => `
    <li style="margin-bottom:4px; color:#cbd5e1;">${step}</li>
  `).join('');

  card.innerHTML = `
    <div class="case-card-header">
      <div class="case-card-title-wrap">
        <div class="case-card-badge">🚨 示範案件 ${c.id} ｜ ${c.sectorName}</div>
        <div class="case-card-title">${c.title}</div>
        <div class="case-card-sub">探究核心：${c.subtitle}</div>
      </div>
      <button class="case-card-close" onclick="closeCaseModal()">×</button>
    </div>

    <div class="case-card-body">
      <div class="case-meta-grid">
        <div class="case-meta-item">
          <span class="case-meta-label">📍 案發現場門牌</span>
          <span class="case-meta-val">${c.location}</span>
        </div>
        <div class="case-meta-item">
          <span class="case-meta-label">🧪 課綱學門範疇</span>
          <span class="case-meta-val">${c.subject}</span>
        </div>
        <div class="case-meta-item">
          <span class="case-meta-label">📚 108課綱指標</span>
          <span class="case-meta-val">${c.curriculumMapping}</span>
        </div>
        <div class="case-meta-item">
          <span class="case-meta-label">🛰️ 實體 GPS 座標</span>
          <span class="case-meta-val">E ${c.lon.toFixed(4)}°, N ${c.lat.toFixed(4)}°</span>
        </div>
      </div>

      <!-- 校園無毒安全教具提示 -->
      <div class="case-safety-box" style="background:rgba(16,185,129,0.12); border:1px solid #10b981; border-radius:6px; padding:10px 12px;">
        <div style="color:#34d399; font-weight:900; font-size:12px; margin-bottom:4px;">🛡️ 評審顧問安全規範（杜絕校園毒物）：</div>
        <div style="font-size:11px; color:#a7f3d0; line-height:1.5;">${c.safeClassroomKit}</div>
      </div>

      <div class="case-section-box">
        <div class="case-section-title">🔍 案件情境簡述</div>
        <div style="font-size:12px; color:#cbd5e1; line-height:1.6;">${c.brief}</div>
      </div>

      <div class="case-section-box">
        <div class="case-section-title">👥 關係人與初步證言</div>
        ${suspectsHtml}
      </div>

      <div class="case-section-box">
        <div class="case-section-title">🔬 科學探究與實證檢驗流程</div>
        <ol style="padding-left:18px; font-size:12px; line-height:1.6;">
          ${stepsHtml}
        </ol>
      </div>

      <div class="case-section-box" style="border-left:3px solid #38bdf8;">
        <div class="case-section-title">💡 科學探究核心原理</div>
        <div style="font-size:12px; color:#93c5fd; line-height:1.5;">${c.scienceConcept}</div>
      </div>
    </div>

    <div class="case-card-footer">
      <button class="case-card-close-btn" onclick="closeCaseModal()" style="background:rgba(30,41,59,0.8); border:1px solid rgba(255,255,255,0.2); color:#cbd5e1; padding:6px 14px; border-radius:6px; cursor:pointer;">關閉簡報</button>
      <button class="btn-fly-to-scene" onclick="flyToCaseLocation(${c.lat}, ${c.lon})">🚀 俯衝案發現場門牌</button>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeCaseModal() {
  const modal = document.getElementById('caseBriefModal');
  if (modal) modal.style.display = 'none';
}

function flyToCaseLocation(lat, lon) {
  closeCaseModal();
  map.flyTo([lat, lon], 16.5, { duration: 1.4 });
}

// ──────────────────────────────────────────
// 14. 遙測 HUD 監聽與最近特區偵測
// ──────────────────────────────────────────
let isTelemetryPending = false;
let lastTelemetryLon = '', lastTelemetryLat = '', lastTelemetryZoom = '';
let lastSectorCode = '';

function setupTelemetryListeners() {
  map.on('move', () => {
    if (isTelemetryPending) return;
    isTelemetryPending = true;
    requestAnimationFrame(() => {
      const center = map.getCenter();
      const zoom = map.getZoom();

      const hudLon = document.getElementById('hudLon');
      const hudLat = document.getElementById('hudLat');
      const hudZoom = document.getElementById('hudZoom');

      const lonStr = center.lng.toFixed(5) + '°';
      const latStr = center.lat.toFixed(5) + '°';
      const zoomStr = zoom.toFixed(1) + 'x';

      if (hudLon && lonStr !== lastTelemetryLon) { hudLon.innerText = lonStr; lastTelemetryLon = lonStr; }
      if (hudLat && latStr !== lastTelemetryLat) { hudLat.innerText = latStr; lastTelemetryLat = latStr; }
      if (hudZoom && zoomStr !== lastTelemetryZoom) { hudZoom.innerText = zoomStr; lastTelemetryZoom = zoomStr; }

      detectNearestSector(center.lng, center.lat);
      isTelemetryPending = false;
    });
  });
}

function detectNearestSector(lon, lat) {
  let closest = null;
  let minDist = Infinity;

  for (let i = 0; i < SECTORS_DATA.length; i++) {
    const s = SECTORS_DATA[i];
    // 曼哈頓快速粗篩，避免大量平方根計算
    if (Math.abs(s.lon - lon) > 0.15 || Math.abs(s.lat - lat) > 0.15) continue;
    const d = Math.hypot(s.lon - lon, s.lat - lat);
    if (d < minDist) {
      minDist = d;
      closest = s;
    }
  }

  if (closest && closest.code !== lastSectorCode) {
    lastSectorCode = closest.code;
    const titleEl = document.getElementById('currentSectorTitle');
    const subEl = document.getElementById('currentSectorSub');
    if (titleEl) titleEl.innerText = `${closest.code}｜${closest.name}`;
    if (subEl) subEl.innerText = closest.desc;
  }
}

// 觸發全息雷達波紋
function triggerRadarScan() {
  const wave = document.getElementById('radarScanWave');
  const btn = document.getElementById('btnRadarScan');
  if (!wave) return;

  const isActive = wave.classList.toggle('active');
  if (btn) {
    if (isActive) {
      btn.classList.add('active');
      btn.innerHTML = '<span>📡 全息雷達掃描</span><span style="color:#4ade80;">SCANNING</span>';
      setTimeout(() => {
        wave.classList.remove('active');
        btn.classList.remove('active');
        btn.innerHTML = '<span>📡 全息雷達掃描</span><span style="color:#94a3b8;">STANDBY</span>';
      }, 4000);
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<span>📡 全息雷達掃描</span><span style="color:#94a3b8;">STANDBY</span>';
    }
  }
}

// ──────────────────────────────────────────
// 15. 頁面加載自動啟動
// ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initCyberRealMap();
});
