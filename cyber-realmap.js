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
let currentBaseLayerKey = 'nlsc';
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
let isTrafficLightsVisible = true;
let isUnderConstructionVisible = true;
let isExpresswaysVisible = true;
let isCoachHubsVisible = true;
let isEBusPanelOpen = false;
let currentStoreFilter = 'all';

let trafficLightsLayerGroup = null;
let underConstructionLayerGroup = null;
let expresswaysLayerGroup = null;
let coachHubsLayerGroup = null;
let trafficLightMarkers = new Map();
let trafficLightsTimer = null;


// 初始化地圖主函式
function initCyberRealMap() {
  console.log('🚀 啟動 NEO-TAIPEI 1:1 真實網路地圖 (純實體 Leaflet GIS 引擎)...');

  if (typeof L === 'undefined') {
    console.error('❌ Leaflet 腳本尚未載入，請確認網路連線或 vendor 本地路徑。');
    return;
  }

  // 1. 建立地圖實例 (採用整數 ZoomSnap 徹底杜絕浮點縮放卡頓與瓦片撕裂)
  map = L.map('map', {
    center: [25.0465, 121.5170],
    zoom: 14,
    minZoom: 9,
    maxZoom: 22,
    zoomControl: false,
    preferCanvas: true, // 開啟 Canvas 硬體加速向量渲染
    zoomSnap: 1, // 整數級別吸附，極限消除重繪負擔與圖層模糊
    zoomDelta: 1,
    wheelPxPerZoomLevel: 120,
    wheelDebounceTime: 60
  });

  // 縮放控制面板
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // 2. 建立精確座標換算備援機制 (依照層級比例縮放座標，杜絕 404/403 導致的黑屏或街道缺失)
  function enableResilientTileFallback(layer, fallbackUrlTemplate) {
    layer.on('tileerror', function(e) {
      if (e && e.tile && !e.tile._hasFallback) {
        e.tile._hasFallback = true;
        const c = e.coords;
        if (c) {
          const nativeMax = layer.options.maxNativeZoom || 19;
          const targetZ = Math.min(Math.max(0, c.z), nativeMax);
          const dz = Math.max(0, c.z - targetZ);
          const scale = Math.pow(2, dz);
          const x = Math.floor(c.x / scale);
          const y = Math.floor(c.y / scale);
          if (fallbackUrlTemplate) {
            e.tile.src = fallbackUrlTemplate.replace('{z}', targetZ).replace('{x}', x).replace('{y}', y);
          } else {
            // 預設備援至臺灣通用電子地圖 (NLSC)，保證 100% 繁中街道路名永遠可見
            e.tile.src = `https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/${targetZ}/${y}/${x}`;
          }
        }
      }
    });
    return layer;
  }

  // (1) 臺灣通用電子地圖 (內政部國土測繪中心 NLSC 繁中官方街道全圖・最權威最詳實)
  const nlscBaseLayer = enableResilientTileFallback(L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    maxNativeZoom: 20,
    maxZoom: 22,
    detectRetina: false,
    attribution: '&copy; 內政部國土測繪中心 (NLSC) 臺灣通用電子地圖'
  }));

  // (2) Esri 真實街道全景圖 (高對比暖色街廓・黑字中文路名清楚標註・Google Maps 同級清晰度)
  const esriStreetBaseLayer = enableResilientTileFallback(L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 19,
    maxZoom: 22,
    detectRetina: false,
    attribution: 'Tiles &copy; Esri &mdash; World Street Map'
  }));

  // (3) OpenStreetMap 繁體中文標準街道 (由高速開源鏡像提供，覆蓋雙北全部巷弄、街區、地標)
  const osmBaseLayer = enableResilientTileFallback(L.tileLayer('https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png', {
    subdomains: 'abc',
    maxNativeZoom: 19,
    maxZoom: 22,
    detectRetina: false,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 繁體中文街道巷弄全網'
  }), 'https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png');

  // (4) 賽博暗黑夜間圖 (黑曜石深邃底圖 ✕ 高對比道路向量網 ✕ 地名路牌全息複合圖層)
  const cyberDarkHybridLayer = L.layerGroup([
    enableResilientTileFallback(L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxNativeZoom: 19,
      maxZoom: 22,
      detectRetina: false,
      attribution: 'Tiles &copy; Esri &mdash; Dark Canvas'
    })),
    enableResilientTileFallback(L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
      maxNativeZoom: 19,
      maxZoom: 22,
      opacity: 1.0
    })),
    enableResilientTileFallback(L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxNativeZoom: 19,
      maxZoom: 22,
      opacity: 1.0
    }))
  ]);

  // (5) 1:1 實體高空衛星 ✕ 真實街道路網全息複合圖層 (NLSC 正射空拍 ✕ 橙白道路向量雙線 ✕ 繁中路標)
  const satelliteHybridLayer = L.layerGroup([
    enableResilientTileFallback(L.tileLayer('https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/{z}/{y}/{x}', {
      maxNativeZoom: 20,
      maxZoom: 22,
      detectRetina: false,
      attribution: '&copy; 內政部國土測繪中心 (NLSC) 正射影像'
    }), 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'),
    enableResilientTileFallback(L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
      maxNativeZoom: 19,
      maxZoom: 22,
      opacity: 1.0
    })),
    enableResilientTileFallback(L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxNativeZoom: 19,
      maxZoom: 22,
      opacity: 1.0
    }))
  ]);

  baseLayers = {
    nlsc: nlscBaseLayer,
    esri_street: esriStreetBaseLayer,
    osm: osmBaseLayer,
    dark: cyberDarkHybridLayer,
    satellite: satelliteHybridLayer
  };

  // 預設載入最權威、最詳實清晰之臺灣通用電子地圖 (NLSC 繁中街道全圖)
  currentBaseLayerKey = 'nlsc';
  activeBaseLayer = baseLayers.nlsc;
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
  trafficLightsLayerGroup = L.layerGroup().addTo(map);
  underConstructionLayerGroup = L.layerGroup().addTo(map);
  expresswaysLayerGroup = L.layerGroup().addTo(map);
  coachHubsLayerGroup = L.layerGroup().addTo(map);

  // 初始化門市圖層群組 (涵蓋全雙北 14 大真實連鎖品牌與地標)
  const brands = [
    'wanjiafu', 'lejiakang', 'carrefour', 'seven', 'familymart',
    'pxmart', 'mcdonalds', 'starbucks', 'mosburger', 'watsons', 'cosmed',
    'coco', 'market', 'transport', 'landmark', 'thsr', 'tra', 'mrt', 'ebus'
  ];
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
  addTrafficLightsLayer();
  addUnderConstructionLayer();
  addExpresswaysLayer();
  addCoachHubsLayer();
  renderEBusPanel();
  initBusFleetContinuousDispatch(); // 多車隊連續循環發車 (遵守紅綠燈號誌強制停等)
  initMrtTrainsContinuousDispatch(); // 捷運真實加減速、站距高速動態巡航
  addSectorsLayer();
  addAllStoreMarkers();
  map.on('zoomend', () => {
    updateStoreLODVisibility();
    updateMrtLODVisibility();
  });
  updateStoreLODVisibility();
  addDemoCasesMarkers();
  initPlayerAvatarMarker();
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
  },
  // ── 雙北核心高快速公路路網 (Highways & Expressways) ──
  {
    name: '台64線快速公路 (八里新店線)',
    shortName: '台64八里新店快',
    color: '#dc2626',
    coreColor: '#f87171',
    width: 9,
    center: [25.0450, 121.4650],
    coords: [
      [25.1580, 121.3980],
      [25.1050, 121.4350],
      [25.0720, 121.4480],
      [25.0550, 121.4580],
      [25.0380, 121.4650],
      [25.0180, 121.4720],
      [25.0020, 121.4920],
      [24.9920, 121.5050],
      [24.9780, 121.5350],
      [24.9650, 121.5420]
    ]
  },
  {
    name: '台65線快速公路 (五股土城線)',
    shortName: '台65五股土城快',
    color: '#ea580c',
    coreColor: '#fb923c',
    width: 9,
    center: [25.0320, 121.4450],
    coords: [
      [25.0680, 121.4420],
      [25.0550, 121.4420],
      [25.0380, 121.4430],
      [25.0180, 121.4480],
      [24.9950, 121.4420],
      [24.9720, 121.4380],
      [24.9620, 121.4320]
    ]
  },
  {
    name: '新北環河快速道路 (新北環快)',
    shortName: '新北環快',
    color: '#0891b2',
    coreColor: '#22d3ee',
    width: 8,
    center: [25.0250, 121.4950],
    coords: [
      [25.0750, 121.4950],
      [25.0580, 121.4980],
      [25.0420, 121.4920],
      [25.0250, 121.4850],
      [25.0050, 121.5050],
      [24.9950, 121.5150],
      [24.9820, 121.5350]
    ]
  },
  {
    name: '市民大道高架道路 ✕ 環東大道',
    shortName: '市民高架/環東',
    color: '#7c3aed',
    coreColor: '#a78bfa',
    width: 8,
    center: [25.0460, 121.5550],
    coords: [
      [25.0494, 121.5106],
      [25.0470, 121.5250],
      [25.0450, 121.5380],
      [25.0450, 121.5580],
      [25.0480, 121.5780],
      [25.0530, 121.6050],
      [25.0580, 121.6250]
    ]
  },
  {
    name: '建國南北路高架道路',
    shortName: '建國高架道路',
    color: '#059669',
    coreColor: '#34d399',
    width: 8,
    center: [25.0450, 121.5380],
    coords: [
      [25.0750, 121.5360],
      [25.0600, 121.5370],
      [25.0520, 121.5380],
      [25.0420, 121.5380],
      [25.0330, 121.5380],
      [25.0240, 121.5390],
      [25.0180, 121.5420]
    ]
  },
  {
    name: '新生高架道路',
    shortName: '新生高架道路',
    color: '#2563eb',
    coreColor: '#60a5fa',
    width: 8,
    center: [25.0600, 121.5280],
    coords: [
      [25.0850, 121.5260],
      [25.0720, 121.5280],
      [25.0620, 121.5280],
      [25.0520, 121.5290],
      [25.0440, 121.5290]
    ]
  },
  {
    name: '水源快速道路',
    shortName: '水源快速道路',
    color: '#0284c7',
    coreColor: '#38bdf8',
    width: 8,
    center: [25.0150, 121.5180],
    coords: [
      [25.0320, 121.4920],
      [25.0220, 121.5050],
      [25.0150, 121.5180],
      [25.0050, 121.5300],
      [24.9920, 121.5380]
    ]
  },
  {
    name: '環河南北路快速道路',
    shortName: '環河南北快速',
    color: '#d97706',
    coreColor: '#fbbf24',
    width: 8,
    center: [25.0500, 121.5050],
    coords: [
      [25.0750, 121.5100],
      [25.0600, 121.5080],
      [25.0480, 121.5050],
      [25.0350, 121.4980],
      [25.0220, 121.4920]
    ]
  },
  {
    name: '洲美快速道路',
    shortName: '洲美快速道路',
    color: '#4f46e5',
    coreColor: '#818cf8',
    width: 8,
    center: [25.1050, 121.5050],
    coords: [
      [25.1250, 121.4950],
      [25.1100, 121.5050],
      [25.0920, 121.5150],
      [25.0850, 121.5180]
    ]
  },
  {
    name: '信義快速道路',
    shortName: '信義快速道路',
    color: '#c026d3',
    coreColor: '#e879f9',
    width: 8,
    center: [25.0150, 121.5720],
    coords: [
      [25.0330, 121.5700],
      [25.0220, 121.5720],
      [25.0100, 121.5740],
      [25.0020, 121.5680]
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

// (2) 🚆 臺灣鐵路 (TRA 縱貫線北段 ✕ 宜蘭線平溪線 ✕ 深澳線 雙北 28 站全覆蓋)
function addTraLayer() {
  traLayerGroup.clearLayers();
  if (!TRA_DATA) return;

  // 鐵道枕木雙軌視覺 (黑底實線 + 藍白鐵道交替虛線)
  const corridors = TRA_DATA.corridors || (TRA_DATA.corridor ? [TRA_DATA.corridor] : []);
  corridors.forEach(c => {
    L.polyline(c, {
      color: '#0f172a',
      weight: 8,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(traLayerGroup);

    const traLine = L.polyline(c, {
      color: '#38bdf8',
      weight: 3.5,
      opacity: 1.0,
      dashArray: '8, 8'
    }).addTo(traLayerGroup);

    traLine.bindTooltip('🚆 臺灣鐵路 (TRA) 雙軌電氣化主幹線 / 支線 (雙北 28 站全線貫通)', { sticky: true });
  });

  // 台鐵 28 大站點標記
  TRA_DATA.stations.forEach(st => {
    const icon = L.divIcon({
      html: `<div class="transit-badge-pin pin-tra">🚆 ${st.name}</div>`,
      className: 'transit-pin-wrap',
      iconAnchor: [35, 12]
    });

    const marker = L.marker([st.lat, st.lon], { icon }).addTo(traLayerGroup);

    const popupHtml = `
      <div style="font-family:sans-serif; min-width:230px; color:#f8fafc;">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
          <strong style="font-size:13px; color:#38bdf8;">🚆 臺灣鐵路 ${st.name}</strong>
        </div>
        <div style="font-size:10px; color:#94a3b8; margin-bottom:6px;">路線: <b>${st.line}</b> ｜ 區域: ${st.zone}</div>
        <div style="font-size:11px; color:#cbd5e1; line-height:1.4;">
          雙北都會通勤與城際鐵路主力，自強號、莒光號、區間快車高頻次靠泊。<br>
          💳 全程支援悠遊卡、一卡通、TPASS 基北北桃 1200 通勤月票感應進出站。
        </div>
      </div>
    `;
    marker.bindPopup(popupHtml);
  });
}

// (3) 🚇 大台北捷運 9 大完整路網 (Taipei Metro & New Taipei Metro)
// 包含 9 大路線全線 131+ 站點 (無閹割 1:1 實裝)
function addMrtLayer() {
  mrtLayerGroup.clearLayers();
  if (!MRT_DATA || MRT_DATA.length === 0) return;

  const currentZoom = (typeof map !== 'undefined' && map) ? map.getZoom() : 13;

  MRT_DATA.forEach(line => {
    // 依分支獨立繪製軌道線 (徹底修復中和新蘆線 15 公里雷射線、淡水線新北投折返、新店線小碧潭折返、淡海輕軌跨海直連)
    if (line.branches && line.branches.length > 0) {
      line.branches.forEach(branch => {
        const branchCoords = branch.stations.map(st => [st.lat, st.lon]);

        // 外層光暈底線
        L.polyline(branchCoords, {
          color: line.color,
          weight: 7,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(mrtLayerGroup);

        // 核心發光亮線
        const poly = L.polyline(branchCoords, {
          color: line.glowColor || line.color,
          weight: 3.5,
          opacity: 0.95
        }).addTo(mrtLayerGroup);

        poly.bindTooltip(`🚇 ${line.name} (${branch.name})`, { sticky: true });
      });
    } else {
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
    }

    // 繪製捷運站點標籤 Marker (雙層 DOM 內嵌，縮放切換純靠 CSS，0ms 重繪卡頓)
    line.stations.forEach((st, idx) => {
      const isHub = (idx === 0 || idx === line.stations.length - 1 || 
                     ['台北車站', '板橋', '府中', '西門', '中正紀念堂', '忠孝復興', '松江南京', '南京復興', '大安', '古亭', '大坪林', '新北產業園區', '動物園', '南港展覽館', '淡水', '頂埔', '新店', '南勢角', '蘆洲', '迴龍'].includes(st.name));

      const metroSvg = `<svg class="metro-official-logo" viewBox="-50 -50 100 100" width="16" height="16">
        <path d="M -26,10 C -28,-14 -12,-36 14,-36 C 26,-36 36,-30 42,-20 L 46,-30 L 46,-6 L 22,-10 L 32,-17 C 27,-23 21,-27 14,-27 C -6,-27 -18,-11 -17,10 Z" fill="#0070bc" />
        <path d="M 26,-10 C 28,14 12,36 -14,36 C -26,36 -36,30 -42,20 L -46,30 L -46,6 L -22,10 L -32,17 C -27,23 -21,27 -14,27 C 6,27 18,11 17,-10 Z" fill="#00a650" />
      </svg>`;

      const lineCode = st.code || line.lineCode || 'MRT';

      const html = `
        <div class="mrt-pin-hybrid ${isHub ? 'is-hub' : ''}">
          <div class="pin-mrt-vector" style="border-color:${line.color};">
            <span class="mrt-logo-box">${metroSvg}</span>
            <span class="mrt-line-pill" style="background:${line.color};">${lineCode}</span>
            <span class="mrt-station-title">${st.name}</span>
          </div>
          <div class="pin-mrt-compact-dot" style="background:${line.color}; border:1.5px solid #ffffff;" title="🚇 ${st.name} (${lineCode})"></div>
        </div>
      `;

      const icon = L.divIcon({
        html: html,
        className: 'transit-pin-wrap station-marker-wrap' + (isHub ? ' is-hub' : ''),
        iconAnchor: [48, 14]
      });

      const marker = L.marker([st.lat, st.lon], { icon }).addTo(mrtLayerGroup);
      marker.bindPopup(`
        <div style="font-family:sans-serif; color:#f8fafc; min-width:210px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${line.color};"></span>
            <strong style="font-size:13px; color:#ffffff;">捷運 ${st.name} 站 ${st.code ? '(' + st.code + ')' : ''}</strong>
          </div>
          <div style="font-size:11px; color:#38bdf8; font-weight:700;">官方標誌：科技藍 (#0070bc) ✕ 生機綠 (#00a650)</div>
          <div style="font-size:10px; color:#94a3b8; margin-top:2px;">所屬路線：${line.name} [代表色 ${lineCode}：${line.color}]</div>
          <div style="font-size:10px; color:#cbd5e1; margin-top:4px;">雙北都會捷運高運量/中運量主幹道，全線固定班距發車。</div>
        </div>
      `);
    });
  });
}

function updateMrtLODVisibility() {
  if (typeof map === 'undefined' || !map) return;
  const isNear = map.getZoom() >= 14.0;
  document.body.classList.toggle('map-zoom-near', isNear);
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


// ──────────────────────────────────────────
// 🚦 雙北規律三色交通號誌圖層 (Traffic Lights Layer & Dynamic Signal Engine)
// 包含 10 大關鍵樞紐十字路口，綠燈 ➔ 黃燈 ➔ 紅燈循序循環，強制公車遵守停等
// ──────────────────────────────────────────
function addTrafficLightsLayer() {
  trafficLightsLayerGroup.clearLayers();
  trafficLightMarkers.clear();
  if (trafficLightsTimer) clearInterval(trafficLightsTimer);

  const lights = (typeof SHUANGBEI_TRAFFIC_LIGHTS !== 'undefined') ? SHUANGBEI_TRAFFIC_LIGHTS : [];
  if (lights.length === 0) return;

  const nowSec = Date.now() / 1000;

  lights.forEach(tl => {
    const state = getTrafficLightState(tl, nowSec);

    const iconHtml = `
      <div class="traffic-light-signal-box" id="tl_box_${tl.id}">
        <div class="tl-housing">
          <span class="tl-lamp tl-red ${state.state === 'RED' ? 'active' : ''}"></span>
          <span class="tl-lamp tl-yellow ${state.state === 'YELLOW' ? 'active' : ''}"></span>
          <span class="tl-lamp tl-green ${state.state === 'GREEN' ? 'active' : ''}"></span>
        </div>
        <div class="tl-countdown-pill" id="tl_pill_${tl.id}" style="border-color:${state.color}; color:${state.color};">
          ${state.icon} ${state.remaining}s
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: 'traffic-light-icon-wrap',
      iconAnchor: [38, 14]
    });

    const marker = L.marker([tl.lat, tl.lon], { icon }).addTo(trafficLightsLayerGroup);

    const updatePopup = (s) => `
      <div style="font-family:sans-serif; color:#f8fafc; min-width:230px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <span style="font-size:12px; font-weight:900; color:#38bdf8;">🚦 台灣標準三色交通號誌</span>
          <span style="font-size:10px; background:${s.color}; color:#fff; padding:1px 5px; border-radius:4px; font-weight:700;">${s.label}</span>
        </div>
        <strong style="font-size:12px; color:#ffffff;">${tl.name}</strong>
        <div style="font-size:11px; color:#cbd5e1; margin-top:6px; line-height:1.5;">
          即時週期：<b style="color:${s.color};">${s.icon} ${s.label} (剩餘 ${s.remaining} 秒)</b><br>
          完整秒數：綠燈 ${tl.greenSec}s ➔ 黃燈 ${tl.yellowSec}s ➔ 紅燈 ${tl.redSec}s<br>
          監控行駛公車：${tl.routes.join(', ')}<br>
          <span style="color:#ef4444; font-weight:700;">★ 交通法規：紅燈亮起時，公車與巡航車隊強制停駛於停止線前。</span>
        </div>
      </div>
    `;

    marker.bindPopup(updatePopup(state));
    trafficLightMarkers.set(tl.id, { tl, marker, updatePopup });
  });

  // 每 1000ms 更新號誌燈狀態與倒數秒數
  trafficLightsTimer = setInterval(() => {
    if (!isTrafficLightsVisible) return;
    const curSec = Date.now() / 1000;
    trafficLightMarkers.forEach(({ tl, marker, updatePopup }) => {
      const s = getTrafficLightState(tl, curSec);
      const box = document.getElementById(`tl_box_${tl.id}`);
      if (box) {
        const r = box.querySelector('.tl-red');
        const y = box.querySelector('.tl-yellow');
        const g = box.querySelector('.tl-green');
        if (r && y && g) {
          r.className = 'tl-lamp tl-red' + (s.state === 'RED' ? ' active' : '');
          y.className = 'tl-lamp tl-yellow' + (s.state === 'YELLOW' ? ' active' : '');
          g.className = 'tl-lamp tl-green' + (s.state === 'GREEN' ? ' active' : '');
        }
        const pill = document.getElementById(`tl_pill_${tl.id}`);
        if (pill) {
          pill.style.borderColor = s.color;
          pill.style.color = s.color;
          pill.innerHTML = `${s.icon} ${s.remaining}s`;
        }
      }
      if (marker.isPopupOpen()) {
        marker.setPopupContent(updatePopup(s));
      }
    });
  }, 1000);
}

// ──────────────────────────────────────────
// 🚧 雙北興建中捷運網絡圖層 (Under-Construction Transit Lines)
// 包含三鶯線 (LB01-LB12)、萬大-中和-樹林線一期 (LG01-LG09)
// ──────────────────────────────────────────
function addUnderConstructionLayer() {
  underConstructionLayerGroup.clearLayers();
  const ucLines = (typeof SHUANGBEI_UNDER_CONSTRUCTION_MRT !== 'undefined') ? SHUANGBEI_UNDER_CONSTRUCTION_MRT : [];

  ucLines.forEach(line => {
    const coords = line.stations.map(st => [st.lat, st.lon]);

    // 外層光暈底線
    L.polyline(coords, {
      color: line.color,
      weight: 6,
      opacity: 0.35,
      dashArray: '10, 8'
    }).addTo(underConstructionLayerGroup);

    // 核心發光虛線
    const poly = L.polyline(coords, {
      color: line.glowColor || line.color,
      weight: 3.5,
      opacity: 0.95,
      dashArray: '8, 8'
    }).addTo(underConstructionLayerGroup);

    poly.bindTooltip(`🚧 ${line.name} [${line.status}]`, { sticky: true });

    // 興建中站點
    line.stations.forEach(st => {
      const icon = L.divIcon({
        html: `<div class="pin-uc-station" style="border-color:${line.color};" title="${line.name} ${st.name}站 (${st.code})">🚧 ${st.name}</div>`,
        className: 'uc-pin-wrap',
        iconAnchor: [30, 10]
      });

      const marker = L.marker([st.lat, st.lon], { icon }).addTo(underConstructionLayerGroup);
      marker.bindPopup(`
        <div style="font-family:sans-serif; color:#f8fafc; min-width:220px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${line.color};"></span>
            <strong style="font-size:13px; color:${line.color};">🚧 興建中捷運：${st.name} 站 (${st.code})</strong>
          </div>
          <div style="font-size:11px; color:#38bdf8; font-weight:700;">路線：${line.name}</div>
          <div style="font-size:10px; color:#cbd5e1; margin-top:4px; line-height:1.5;">
            進度概況：${line.status}<br>
            雙北捷運下一代都會外環與中運量走廊，完工後將直接串聯新北三鶯與雙北生活圈。
          </div>
        </div>
      `);
    });
  });
}

// ──────────────────────────────────────────
// 🛣️ 雙北核心國道高速公路圖層 (Freeway Expressways Layer)
// ──────────────────────────────────────────
function addExpresswaysLayer() {
  expresswaysLayerGroup.clearLayers();
  const expressways = (typeof SHUANGBEI_EXPRESSWAYS !== 'undefined') ? SHUANGBEI_EXPRESSWAYS : [];

  expressways.forEach(hwy => {
    // 外層光暈底線
    L.polyline(hwy.coords, {
      color: hwy.color,
      weight: hwy.width + 4,
      opacity: 0.40,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(expresswaysLayerGroup);

    // 核心高速公路亮線
    const line = L.polyline(hwy.coords, {
      color: hwy.glowColor || hwy.color,
      weight: hwy.width,
      opacity: 0.95
    }).addTo(expresswaysLayerGroup);

    line.bindTooltip(`🛣️ ${hwy.name}`, { sticky: true });

    // 標示國道編號盾牌
    if (hwy.coords.length > 2) {
      const midIdx = Math.floor(hwy.coords.length / 2);
      const centerPt = hwy.coords[midIdx];
      const icon = L.divIcon({
        html: `<div class="hwy-shield-badge" style="border-color:${hwy.color};">🛣️ ${hwy.shortName}</div>`,
        className: 'hwy-badge-wrap',
        iconAnchor: [35, 10]
      });
      L.marker(centerPt, { icon, interactive: false }).addTo(expresswaysLayerGroup);
    }
  });
}

// ──────────────────────────────────────────
// 🏢 雙北三大特等長途國道客運轉運中樞 (Coach Hubs Layer)
// ──────────────────────────────────────────
function addCoachHubsLayer() {
  coachHubsLayerGroup.clearLayers();
  const hubs = (typeof SHUANGBEI_HIGHWAY_COACH_HUBS !== 'undefined') ? SHUANGBEI_HIGHWAY_COACH_HUBS : [];

  hubs.forEach(hub => {
    const icon = L.divIcon({
      html: `<div class="coach-hub-pin">🏢 ${hub.name.split(' (')[0]}</div>`,
      className: 'coach-hub-pin-wrap',
      iconAnchor: [45, 12]
    });

    const marker = L.marker([hub.lat, hub.lon], { icon }).addTo(coachHubsLayerGroup);
    marker.bindPopup(`
      <div style="font-family:sans-serif; color:#f8fafc; min-width:240px;">
        <strong style="font-size:13px; color:#f59e0b;">🏢 ${hub.name}</strong>
        <div style="font-size:11px; color:#cbd5e1; margin-top:4px; line-height:1.5;">
          ${hub.desc}
        </div>
        <div style="font-size:10px; color:#38bdf8; margin-top:6px; font-weight:700;">主要國道客運路線：</div>
        <ul style="font-size:10px; color:#94a3b8; margin:2px 0 0 16px; padding:0;">
          ${hub.coaches.map(c => `<li>${c}</li>`).join('')}
        </ul>
      </div>
    `);
  });
}

function toggleTrafficLightsLayer() {
  isTrafficLightsVisible = !isTrafficLightsVisible;
  if (isTrafficLightsVisible) map.addLayer(trafficLightsLayerGroup);
  else map.removeLayer(trafficLightsLayerGroup);
  const btn = document.getElementById('btnToggleTrafficLights');
  if (btn) {
    btn.classList.toggle('active', isTrafficLightsVisible);
    const badge = btn.querySelector('span:last-child');
    if (badge) badge.innerText = isTrafficLightsVisible ? 'ON' : 'OFF';
  }
}

function toggleUnderConstructionLayer() {
  isUnderConstructionVisible = !isUnderConstructionVisible;
  if (isUnderConstructionVisible) map.addLayer(underConstructionLayerGroup);
  else map.removeLayer(underConstructionLayerGroup);
  const btn = document.getElementById('btnToggleUnderConstruction');
  if (btn) {
    btn.classList.toggle('active', isUnderConstructionVisible);
    const badge = btn.querySelector('span:last-child');
    if (badge) badge.innerText = isUnderConstructionVisible ? 'ON' : 'OFF';
  }
}

function toggleExpresswaysLayer() {
  isExpresswaysVisible = !isExpresswaysVisible;
  if (isExpresswaysVisible) map.addLayer(expresswaysLayerGroup);
  else map.removeLayer(expresswaysLayerGroup);
  const btn = document.getElementById('btnToggleExpressways');
  if (btn) {
    btn.classList.toggle('active', isExpresswaysVisible);
    const badge = btn.querySelector('span:last-child');
    if (badge) badge.innerText = isExpresswaysVisible ? 'ON' : 'OFF';
  }
}

function toggleCoachHubsLayer() {
  isCoachHubsVisible = !isCoachHubsVisible;
  if (isCoachHubsVisible) map.addLayer(coachHubsLayerGroup);
  else map.removeLayer(coachHubsLayerGroup);
  const btn = document.getElementById('btnToggleCoachHubs');
  if (btn) {
    btn.classList.toggle('active', isCoachHubsVisible);
    const badge = btn.querySelector('span:last-child');
    if (badge) badge.innerText = isCoachHubsVisible ? 'ON' : 'OFF';
  }
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
      <div class="moving-fleet-bus" id="bus_icon_${spec.id}" style="background:${spec.color}; color:#fff; font-size:10px; font-weight:800; padding:2px 7px; border-radius:12px; border:2px solid #ffffff; box-shadow:0 0 10px ${spec.color}; white-space:nowrap; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
        <span style="font-size:11px;">🚍</span>
        <span>${spec.name}</span>
        <span class="bus-live-speed-tag" style="background:rgba(0,0,0,0.4); padding:1px 4px; border-radius:6px; font-size:9px;">32 km/h</span>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: 'bus-fleet-div-icon',
      iconAnchor: [45, 12]
    });

    const marker = L.marker(initPt, { icon }).addTo(ebusDynamicBusesGroup);
    busFleetMarkers.set(spec.id, {
      spec,
      route,
      path,
      marker,
      isStoppedAtRed: false,
      lastPt: initPt,
      holdProgress: 0,
      activeTl: null
    });
  });

  // 2. 高頻連續平滑推進 (每 600ms 平滑計算，遵守雙北規律交通號誌，紅燈強制停駛)
  busFleetAnimationTimer = setInterval(() => {
    if (!isBusFleetVisible) return;
    const nowSec = Date.now() / 1000;
    const lights = (typeof SHUANGBEI_TRAFFIC_LIGHTS !== 'undefined') ? SHUANGBEI_TRAFFIC_LIGHTS : [];

    busFleetMarkers.forEach(item => {
      const { spec, route, path, marker } = item;
      
      // 計算預設時間驅動前進進度
      const elapsed = (nowSec + spec.offsetSec) % spec.cycleSec;
      const nominalProgress = elapsed / spec.cycleSec;
      const nominalPt = interpolatePolyline(path, nominalProgress);

      // 號誌偵測：公車前方 65 公尺內是否存在紅燈或即將轉紅的黃燈
      let shouldStopAtRed = false;
      let activeTrafficLight = null;
      let activeState = null;

      for (let i = 0; i < lights.length; i++) {
        const tl = lights[i];
        const dLat = (item.lastPt ? item.lastPt[0] : nominalPt[0]) - tl.lat;
        const dLon = (item.lastPt ? item.lastPt[1] : nominalPt[1]) - tl.lon;
        const distSq = dLat * dLat + dLon * dLon;

        // 判定距離路口小於 0.00065 度 (約 65 公尺)
        if (distSq < 0.00065 * 0.00065) {
          const s = getTrafficLightState(tl, nowSec);
          if (s.state === 'RED' || (s.state === 'YELLOW' && s.remaining <= 2)) {
            shouldStopAtRed = true;
            activeTrafficLight = tl;
            activeState = s;
            break;
          }
        }
      }

      let speed = 0;
      let statusText = '';
      let currentPt = nominalPt;

      if (shouldStopAtRed && activeTrafficLight) {
        // ★ 核心交通法規落實：遇紅燈強制停下，車速降為 0，保持在路口停止線
        item.isStoppedAtRed = true;
        speed = 0;
        statusText = `🚦 遵行號誌：【紅燈】停等中 (${activeTrafficLight.name.split(' (')[0]} 倒數 ${activeState.remaining}s)`;
        currentPt = item.lastPt || nominalPt;
      } else {
        item.isStoppedAtRed = false;
        item.lastPt = nominalPt;
        currentPt = nominalPt;
        speed = Math.round(36 + Math.sin(nowSec + spec.offsetSec) * 8);
        statusText = `🚍 綠燈通暢・巡航行駛中 (${speed} km/h)`;
      }

      marker.setLatLng(currentPt);

      // 更新車身即時車速標籤
      const busDom = document.getElementById(`bus_icon_${spec.id}`);
      if (busDom) {
        const tag = busDom.querySelector('.bus-live-speed-tag');
        if (tag) {
          tag.innerText = item.isStoppedAtRed ? '🛑 0 km/h' : `${speed} km/h`;
          tag.style.color = item.isStoppedAtRed ? '#f87171' : '#4ade80';
        }
      }

      // 繫結即時資訊彈窗
      const nextBusCountdown = Math.round(spec.cycleSec - elapsed);
      const popupHtml = `
        <div style="font-family:sans-serif; min-width:250px; color:#f8fafc;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:13px; font-weight:900; color:${spec.color};">🚍 ${spec.name}</span>
            <span style="font-size:10px; background:${item.isStoppedAtRed ? '#ef4444' : spec.color}; color:#fff; padding:1px 6px; border-radius:4px; font-weight:700;">
              ${item.isStoppedAtRed ? '🚦 遵行紅燈' : '即時巡航中'}
            </span>
          </div>
          <div style="font-size:11px; font-weight:700; color:#38bdf8;">行駛方向：${spec.headsign}</div>
          <div style="font-size:10px; color:#cbd5e1; margin-top:6px; line-height:1.5;">
            所屬路線：${route.name}<br>
            營運業者：${route.operator}<br>
            行駛狀態：<b style="color:${item.isStoppedAtRed ? '#f87171' : '#4ade80'};">${statusText}</b><br>
            即時車速：<b style="color:${item.isStoppedAtRed ? '#f87171' : '#4ade80'}; font-size:13px;">${speed} km/h</b><br>
            連續發車狀態：<b style="color:#f59e0b;">接續巡航 (次班出發倒數 ${nextBusCountdown}s)</b><br>
            嚴格遵守真實世界雙北交通號誌與交通部 TDX 座標規範。
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
  }, 600);
}

// ──────────────────────────────────────────
// (5.5) 🚇 台北捷運真實速度動態列車調度系統 (MRT Realistic Speed & Physics Simulation)
// 包含板南線 BL、淡水信義線 R、松山新店線 G、中和新蘆線 O (迴龍/蘆洲雙分支)、環狀線 Y
// 依真實物理：起步平滑加速、巡航高速 (依站距自動匹配 48~84 km/h)、到站前平滑減速，月台靠泊停等 5 秒
// ──────────────────────────────────────────
const ACTIVE_MRT_TRAIN_SPEC = [
  // 板南線 (BL) - 雙向行駛
  { id: 'mrt_BL_01', lineCode: 'BL', branchCode: 'BL_main', name: '板南線 BL-101', headsign: '往 南港展覽館', dir: 0, offsetSec: 0, color: '#0070bd' },
  { id: 'mrt_BL_02', lineCode: 'BL', branchCode: 'BL_main', name: '板南線 BL-103 (次班)', headsign: '往 南港展覽館', dir: 0, offsetSec: 32, color: '#0070bd' },
  { id: 'mrt_BL_03', lineCode: 'BL', branchCode: 'BL_main', name: '板南線 BL-102', headsign: '往 頂埔/板橋/海山', dir: 1, offsetSec: 16, color: '#0284c7' },
  { id: 'mrt_BL_04', lineCode: 'BL', branchCode: 'BL_main', name: '板南線 BL-104 (次班)', headsign: '往 頂埔/板橋/海山', dir: 1, offsetSec: 48, color: '#0284c7' },

  // 淡水信義線 (R) - 雙向行駛 (使用 R_main 主線，不穿新北投死胡同)
  { id: 'mrt_R_01', lineCode: 'R', branchCode: 'R_main', name: '淡水信義線 R-201', headsign: '往 象山/台北101', dir: 0, offsetSec: 0, color: '#e3002c' },
  { id: 'mrt_R_02', lineCode: 'R', branchCode: 'R_main', name: '淡水信義線 R-203 (次班)', headsign: '往 象山/台北101', dir: 0, offsetSec: 35, color: '#e3002c' },
  { id: 'mrt_R_03', lineCode: 'R', branchCode: 'R_main', name: '淡水信義線 R-202', headsign: '往 淡水/士林/北投', dir: 1, offsetSec: 18, color: '#ef4444' },
  { id: 'mrt_R_04', lineCode: 'R', branchCode: 'R_main', name: '淡水信義線 R-204 (次班)', headsign: '往 淡水/士林/北投', dir: 1, offsetSec: 53, color: '#ef4444' },

  // 松山新店線 (G) - 雙向行駛 (使用 G_main 主線)
  { id: 'mrt_G_01', lineCode: 'G', branchCode: 'G_main', name: '松山新店線 G-301', headsign: '往 松山車站', dir: 0, offsetSec: 5, color: '#008659' },
  { id: 'mrt_G_02', lineCode: 'G', branchCode: 'G_main', name: '松山新店線 G-302', headsign: '往 新店碧潭', dir: 1, offsetSec: 35, color: '#10b981' },

  // 中和新蘆線 (O) - 迴龍主線與蘆洲支線各循獨立分歧，絕無 15 公里跨城射線！
  { id: 'mrt_O_01', lineCode: 'O', branchCode: 'O_main', name: '中和新蘆線 O-401 (迴龍主線)', headsign: '往 迴龍/新莊', dir: 0, offsetSec: 10, color: '#f39800' },
  { id: 'mrt_O_02', lineCode: 'O', branchCode: 'O_main', name: '中和新蘆線 O-402 (迴龍主線)', headsign: '往 南勢角/中和', dir: 1, offsetSec: 45, color: '#fb923c' },
  { id: 'mrt_O_03', lineCode: 'O', branchCode: 'O_luzhou', name: '中和新蘆線 O-403 (蘆洲支線)', headsign: '往 蘆洲/徐匯中學', dir: 0, offsetSec: 22, color: '#f59e0b' },

  // 環狀線 (Y) - 雙向行駛
  { id: 'mrt_Y_01', lineCode: 'Y', branchCode: 'Y_main', name: '環狀線 Y-501', headsign: '往 新北產業園區', dir: 0, offsetSec: 8, color: '#ffd100' },
  { id: 'mrt_Y_02', lineCode: 'Y', branchCode: 'Y_main', name: '環狀線 Y-502', headsign: '往 大坪林', dir: 1, offsetSec: 38, color: '#facc15' },

  // 文湖線 (BR) - 雙向行駛
  { id: 'mrt_BR_01', lineCode: 'BR', branchCode: 'BR_main', name: '文湖線 BR-01', headsign: '往 南港展覽館/內科', dir: 0, offsetSec: 12, color: '#c48c31' },
  { id: 'mrt_BR_02', lineCode: 'BR', branchCode: 'BR_main', name: '文湖線 BR-02', headsign: '往 動物園/木柵', dir: 1, offsetSec: 42, color: '#b45309' }
];

const mrtTrainMarkers = new Map();

// 計算兩經緯度距離 (公里)
function calcDistanceKm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * 111.32;
  const dLon = (lon2 - lon1) * 111.32 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

function initMrtTrainsContinuousDispatch() {
  if (mrtTrainAnimationTimer) clearInterval(mrtTrainAnimationTimer);
  mrtDynamicTrainsGroup.clearLayers();
  mrtTrainMarkers.clear();

  // 1. 初始化各捷運列車，建立站間物理區間數據庫
  ACTIVE_MRT_TRAIN_SPEC.forEach(spec => {
    const line = MRT_DATA.find(x => x.lineCode === spec.lineCode);
    if (!line) return;

    let stations = line.stations;
    if (line.branches && line.branches.length > 0) {
      const br = line.branches.find(b => b.branchCode === spec.branchCode);
      if (br && br.stations && br.stations.length > 0) {
        stations = br.stations;
      }
    }
    if (!stations || stations.length < 2) return;

    const orderedStations = spec.dir === 0 ? stations : [...stations].reverse();

    // 建立相鄰站間物理區間
    const segments = [];
    let totalLoopTime = 0;

    for (let i = 0; i < orderedStations.length - 1; i++) {
      const fromSt = orderedStations[i];
      const toSt = orderedStations[i + 1];
      const distKm = calcDistanceKm(fromSt.lat, fromSt.lon, toSt.lat, toSt.lon);

      // 依站距決定極速：短站距 (<0.75km) 48km/h，中等站距 (0.75-1.3km) 66km/h，長站距 (>1.3km) 84km/h
      let topSpeed = 65;
      if (distKm < 0.75) topSpeed = 48;
      else if (distKm < 1.3) topSpeed = 66;
      else topSpeed = 84;

      const dwellSec = 4.5; // 月台停等 4.5 秒上下客
      const travelSec = Math.max(12, Math.round(distKm * 20)); // 依站距計算行駛時間
      const segDuration = dwellSec + travelSec;

      segments.push({
        from: fromSt,
        to: toSt,
        distKm,
        topSpeed,
        dwellSec,
        travelSec,
        duration: segDuration,
        startTime: totalLoopTime
      });

      totalLoopTime += segDuration;
    }

    const initPt = [orderedStations[0].lat, orderedStations[0].lon];

    const iconHtml = `
      <div class="moving-mrt-train" id="mrt_icon_${spec.id}" style="background:#0f172a; color:#fff; font-size:10px; font-weight:900; padding:2px 8px; border-radius:14px; border:2px solid ${spec.color}; box-shadow:0 0 12px ${spec.color}; white-space:nowrap; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${spec.color};"></span>
        <span style="color:#fff;">🚇 ${spec.name}</span>
        <span class="mrt-live-speed-tag" style="background:${spec.color}; color:#fff; padding:1px 5px; border-radius:8px; font-size:9px; font-weight:700;">45 km/h</span>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: 'mrt-train-div-icon',
      iconAnchor: [55, 12]
    });

    const marker = L.marker(initPt, { icon }).addTo(mrtDynamicTrainsGroup);
    mrtTrainMarkers.set(spec.id, {
      spec,
      line,
      orderedStations,
      segments,
      totalLoopTime,
      marker
    });
  });

  // 2. 高頻連續平滑物理運算 (每 400ms，平滑呈現加速、極速巡航、進站減速與停等)
  mrtTrainAnimationTimer = setInterval(() => {
    if (!isMrtTrainsVisible) return;
    const nowSec = Date.now() / 1000;

    mrtTrainMarkers.forEach(item => {
      const { spec, line, segments, totalLoopTime, marker } = item;
      if (!segments || segments.length === 0 || totalLoopTime <= 0) return;

      const t = (nowSec + spec.offsetSec) % totalLoopTime;

      // 尋找當前所在的站間區間
      let currentSeg = segments[0];
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (t >= seg.startTime && t < seg.startTime + seg.duration) {
          currentSeg = seg;
          break;
        }
      }

      const segT = t - currentSeg.startTime;
      let currentLat = currentSeg.from.lat;
      let currentLon = currentSeg.from.lon;
      let speed = 0;
      let phaseText = '';
      let isAtStation = false;

      if (segT < currentSeg.dwellSec) {
        // ★ 階段 1：月台靠泊停等中 (Speed = 0，乘客上下車)
        isAtStation = true;
        speed = 0;
        currentLat = currentSeg.from.lat;
        currentLon = currentSeg.from.lon;
        const dwellRem = Math.ceil(currentSeg.dwellSec - segT);
        phaseText = `🚉 【${currentSeg.from.name}站】月台停靠中 (停等剩 ${dwellRem}s)`;
      } else {
        // 行駛階段
        const runT = segT - currentSeg.dwellSec;
        const u = Math.min(0.99999, runT / currentSeg.travelSec);

        // ★ 核心物理曲線：起步加速 ➔ 依站距高速巡航 ➔ 進站減速
        if (u < 0.25) {
          // 起步加速：正弦平滑由 0 飆升至 topSpeed
          const progressInAccel = u / 0.25;
          speed = Math.round(currentSeg.topSpeed * Math.sin(progressInAccel * Math.PI / 2));
          phaseText = `🚄 出站加速中 (${speed} km/h) ➔ 往 ${currentSeg.to.name}`;
        } else if (u < 0.75) {
          // 區間最高速巡航 (依站距 ${currentSeg.distKm.toFixed(2)}km 自動匹配極速)
          speed = Math.round(currentSeg.topSpeed + Math.sin(nowSec * 3) * 1.5);
          phaseText = `🚅 區間最高速巡航 (${speed} km/h) [站距 ${currentSeg.distKm.toFixed(2)}km]`;
        } else {
          // 進站平滑煞車減速：餘弦平滑由 topSpeed 降至 0
          const progressInDecel = (u - 0.75) / 0.25;
          speed = Math.round(currentSeg.topSpeed * Math.cos(progressInDecel * Math.PI / 2));
          phaseText = `🛑 進站減速煞車中 (${speed} km/h) ➔ 即將抵達 ${currentSeg.to.name}`;
        }

        // 站間位置平滑插值 (採用 EaseInOut 餘弦過渡，徹底消除瞬移頓挫)
        const eased = (1 - Math.cos(u * Math.PI)) / 2;
        currentLat = currentSeg.from.lat + (currentSeg.to.lat - currentSeg.from.lat) * eased;
        currentLon = currentSeg.from.lon + (currentSeg.to.lon - currentSeg.from.lon) * eased;
      }

      marker.setLatLng([currentLat, currentLon]);

      // 更新車頂即時時速徽章
      const mrtDom = document.getElementById(`mrt_icon_${spec.id}`);
      if (mrtDom) {
        const speedTag = mrtDom.querySelector('.mrt-live-speed-tag');
        if (speedTag) {
          speedTag.innerText = isAtStation ? '停靠 0 km/h' : `${speed} km/h`;
          speedTag.style.background = isAtStation ? '#f59e0b' : spec.color;
        }
      }

      // 彈出詳細即時物理動力學遙測資訊
      const popupHtml = `
        <div style="font-family:sans-serif; min-width:260px; color:#f8fafc;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:13px; font-weight:900; color:${spec.color};">🚇 ${spec.name}</span>
            <span style="font-size:10px; background:${isAtStation ? '#f59e0b' : '#10b981'}; color:#fff; padding:1px 6px; border-radius:4px; font-weight:700;">
              ${isAtStation ? '月台停靠中' : '即時巡航運轉'}
            </span>
          </div>
          <div style="font-size:11px; font-weight:700; color:#38bdf8;">運轉方向：${spec.headsign}</div>
          <div style="font-size:10px; color:#cbd5e1; margin-top:6px; line-height:1.5;">
            所屬路網：${line.name}<br>
            動力學狀態：<b style="color:${isAtStation ? '#f59e0b' : '#38bdf8'};">${phaseText}</b><br>
            即時行駛時速：<b style="color:${isAtStation ? '#f59e0b' : '#4ade80'}; font-size:13px;">${speed} km/h</b> (區間設計極速: ${currentSeg.topSpeed} km/h)<br>
            當前區間站距：<b>${currentSeg.distKm.toFixed(2)} 公里</b> (${currentSeg.from.name} ➔ ${currentSeg.to.name})<br>
            ★ 完全遵照真實捷運加速、長距離高巡航速、進站減速煞車物理法則。
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    });
  }, 400);
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

// 根據品牌返回純粹官方標準樣式 Pin HTML (【落實委託人指示：我要的是它的樣式，而不是在下面寫個它的名字】)
function getStoreIconHtml(brand, store) {
  let pinClass = 'pin-seven';
  let badgeContent = '';

  // 1. 7-Eleven 正統官方綠框白底橘綠紅三色標誌 SVG
  const sevenSvg = `
    <svg viewBox="0 0 70 50" width="28" height="20" style="display:block;">
      <rect width="70" height="50" rx="6" fill="#ffffff" stroke="#008054" stroke-width="2.5"/>
      <rect x="5" y="5" width="60" height="7" fill="#ea580c"/>
      <rect x="5" y="12" width="60" height="5" fill="#008054"/>
      <rect x="5" y="17" width="60" height="5" fill="#dc2626"/>
      <path d="M 24 24 L 46 24 L 33 45 L 26 45 L 37 28 L 24 28 Z" fill="#ea580c"/>
      <rect x="18" y="32" width="34" height="6.5" rx="2" fill="#008054"/>
      <text x="35" y="37" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="5" fill="#ffffff" text-anchor="middle">ELEVEN</text>
    </svg>`;

  // 2. FamilyMart 全家便利商店 官方藍綠雙色橫條招牌 SVG
  const familyMartSvg = `
    <svg viewBox="0 0 70 46" width="30" height="20" style="display:block;">
      <rect width="70" height="46" rx="6" fill="#ffffff" stroke="#009944" stroke-width="2"/>
      <rect x="4" y="4" width="62" height="18" fill="#0068b7" rx="3"/>
      <rect x="4" y="24" width="62" height="18" fill="#009944" rx="3"/>
      <circle cx="16" cy="13" r="6" fill="#ffffff"/>
      <polygon points="16,8 17.8,11.5 21.8,12.1 18.9,14.9 19.6,18.9 16,17 12.4,18.9 13.1,14.9 10.2,12.1 14.2,11.5" fill="#0068b7"/>
      <text x="44" y="16" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="8" fill="#ffffff" text-anchor="middle">Family</text>
      <text x="44" y="36" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="8" fill="#ffffff" text-anchor="middle">Mart</text>
    </svg>`;

  // 3. 🛒 正統家樂福官方向量圖標 (Carrefour Dual-Color Diamond with Negative White 'C')
  const carrefourSvg = `
    <svg viewBox="0 0 61 40" width="24" height="16" style="display:block; overflow:visible;">
      <path d="M18.0334,1.6 C18.142,1.49 18.244,1.45 18.332,1.45 C18.489,1.45 18.6,1.59 18.595,1.76 C18.59,1.86 18.546,1.97 18.449,2.06 C14.535,6.83 11.689,12.39 11.689,20.12 C11.689,27.84 14.535,33.3 18.449,38.06 C18.546,38.16 18.59,38.27 18.595,38.37 C18.6,38.53 18.489,38.67 18.332,38.67 C18.244,38.67 18.142,38.63 18.033,38.52 L1.363,22.73 C0.531,22.04 0,21.22 0,20.06 C0,18.9 0.531,18.09 1.363,17.39 L18.033,1.6 Z" fill="#C20016"/>
      <path d="M9.084,0.14 C2.557,0.14 0.006,9.2 0.006,20 C0.006,30.8 2.557,39.74 9.084,39.74 C13.001,39.74 16.339,37.49 16.351,35.64 C16.352,35.24 16.194,34.85 15.847,34.51 C13.992,32.76 13.265,31 13.258,29.45 C13.248,26.5 15.868,24.29 18.282,24.29 C21.603,24.29 23.562,26.85 23.562,30.16 C23.562,33.29 22.195,35.91 20.712,38 C20.654,38.08 20.628,38.18 20.628,38.26 C20.63,38.43 20.727,38.56 20.875,38.56 C20.965,38.56 21.071,38.51 21.185,38.4 L37.86,22.61 C38.693,21.92 39.224,21.1 39.224,19.94 C39.224,18.78 38.693,17.97 37.86,17.27 L21.185,1.48 C21.071,1.37 20.965,1.32 20.875,1.32 C20.726,1.32 20.63,1.46 20.628,1.62 C20.628,1.7 20.654,1.8 20.712,1.89 C22.195,3.97 23.562,6.59 23.562,9.72 C23.562,13.03 21.603,15.59 18.282,15.59 C15.868,15.59 13.248,13.39 13.258,10.43 C13.265,8.88 13.992,7.12 15.847,5.37 C16.194,5.03 16.352,4.64 16.351,4.24 C16.339,2.39 13.001,0.14 9.084,0.14 Z" transform="translate(21.766520, 0.121053)" fill="#254F9B"/>
    </svg>`;

  // 4. 全聯福利中心 PX-Mart 經典深藍底雙環彩帶標誌 SVG
  const pxmartSvg = `
    <svg viewBox="0 0 60 40" width="28" height="18" style="display:block;">
      <rect width="60" height="40" rx="6" fill="#003da5"/>
      <circle cx="30" cy="20" r="14" fill="#ffffff"/>
      <circle cx="23" cy="20" r="9" fill="#003da5"/>
      <circle cx="37" cy="20" r="9" fill="#e4002b"/>
      <path d="M 23 15 A 5 5 0 0 1 37 25 A 5 5 0 0 1 23 15" fill="#ffffff"/>
      <text x="30" y="38" font-family="Arial, sans-serif" font-weight="900" font-size="5" fill="#ffffff" text-anchor="middle">PX MART</text>
    </svg>`;

  // 5. 麥當勞 McDonald's 經典紅底金黃雙拱門 M 標誌 SVG
  const mcdonaldsSvg = `
    <svg viewBox="0 0 60 44" width="26" height="18" style="display:block;">
      <rect width="60" height="44" rx="6" fill="#da291c"/>
      <path d="M 12 36 C 12 20 20 10 27 24 C 29 28 30 30 30 30 C 30 30 31 28 33 24 C 40 10 48 20 48 36 L 43 36 C 43 24 37 16 33 28 L 27 28 C 23 16 17 24 17 36 Z" fill="#ffc72c"/>
    </svg>`;

  // 6. 星巴克 Starbucks 經典深綠圓形海妖雙尾賽蓮標誌 SVG
  const starbucksSvg = `
    <svg viewBox="0 0 50 50" width="22" height="22" style="display:block;">
      <circle cx="25" cy="25" r="24" fill="#006241"/>
      <circle cx="25" cy="25" r="21" fill="none" stroke="#ffffff" stroke-width="1.5"/>
      <path d="M 25 10 L 26.5 14 L 30.5 14 L 27.5 16.5 L 29 20.5 L 25 18 L 21 20.5 L 22.5 16.5 L 19.5 14 L 23.5 14 Z" fill="#ffffff"/>
      <circle cx="25" cy="27" r="7" fill="#ffffff"/>
      <path d="M 14 36 C 16 28 20 30 25 35 C 30 30 34 28 36 36" fill="none" stroke="#ffffff" stroke-width="2"/>
    </svg>`;

  // 7. 摩斯漢堡 MOS Burger 官方紅底純白流線 M 標誌 SVG
  const mosBurgerSvg = `
    <svg viewBox="0 0 60 42" width="26" height="18" style="display:block;">
      <rect width="60" height="42" rx="6" fill="#d9251d"/>
      <path d="M 14 30 C 14 18 22 14 28 22 C 30 25 32 25 34 22 C 40 14 46 18 46 30" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/>
      <text x="30" y="38" font-family="Arial, sans-serif" font-weight="900" font-size="6" fill="#ffffff" text-anchor="middle">MOS</text>
    </svg>`;

  // 8. 屈臣氏 Watsons 官方湖水青綠底純白字樣招牌 SVG
  const watsonsSvg = `
    <svg viewBox="0 0 70 38" width="30" height="16" style="display:block;">
      <rect width="70" height="38" rx="5" fill="#009aa6"/>
      <text x="35" y="24" font-family="Arial, sans-serif" font-weight="900" font-size="13" fill="#ffffff" text-anchor="middle" letter-spacing="-0.5">watsons</text>
    </svg>`;

  // 9. 康是美 Cosmed 官方鮮橘底白紅蝶花十字標誌 SVG
  const cosmedSvg = `
    <svg viewBox="0 0 50 50" width="22" height="22" style="display:block;">
      <rect width="50" height="50" rx="8" fill="#ff6600"/>
      <path d="M 25 10 C 27 18 33 18 40 25 C 33 32 27 32 25 40 C 23 32 17 32 10 25 C 17 18 23 18 25 10 Z" fill="#ffffff"/>
      <circle cx="25" cy="25" r="5" fill="#dc2626"/>
    </svg>`;

  // 10. CoCo 都可手搖飲 官方溫暖亮橘圓角笑臉標誌 SVG
  const cocoSvg = `
    <svg viewBox="0 0 64 42" width="28" height="18" style="display:block;">
      <rect width="64" height="42" rx="6" fill="#f97316"/>
      <circle cx="20" cy="21" r="11" fill="#ffffff"/>
      <circle cx="17" cy="18" r="1.5" fill="#ea580c"/>
      <circle cx="23" cy="18" r="1.5" fill="#ea580c"/>
      <path d="M 16 23 Q 20 28 24 23" fill="none" stroke="#ea580c" stroke-width="1.8" stroke-linecap="round"/>
      <text x="44" y="26" font-family="Arial, sans-serif" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">CoCo</text>
    </svg>`;

  // 11. 雙北傳統市場與觀光夜市 經典金木牌樓與大紅燈籠樣式 SVG
  const marketSvg = `
    <svg viewBox="0 0 60 48" width="26" height="20" style="display:block;">
      <path d="M 10 16 L 30 8 L 50 16 L 46 22 L 14 22 Z" fill="#f59e0b" stroke="#78350f" stroke-width="1.5"/>
      <rect x="16" y="22" width="5" height="22" fill="#92400e"/>
      <rect x="39" y="22" width="5" height="22" fill="#92400e"/>
      <rect x="21" y="24" width="18" height="12" rx="2" fill="#dc2626"/>
      <circle cx="10" cy="26" r="5" fill="#ef4444"/>
      <circle cx="50" cy="26" r="5" fill="#ef4444"/>
      <text x="30" y="32" font-family="sans-serif" font-weight="900" font-size="7" fill="#fef08a" text-anchor="middle">市集</text>
    </svg>`;

  // 12. 大眾運輸捷運/公車/臺鐵/高鐵 官方代表色標誌 SVG
  const transportSvg = `
    <svg viewBox="0 0 50 50" width="22" height="22" style="display:block;">
      <circle cx="25" cy="25" r="23" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
      <path d="M 14 22 C 16 12 32 10 38 18 L 33 19 C 30 14 18 16 17 23 Z" fill="#0070bc"/>
      <path d="M 36 28 C 34 38 18 40 12 32 L 17 31 C 20 36 32 34 33 27 Z" fill="#00a650"/>
    </svg>`;

  // 13. 文化歷史古蹟與名勝 SVG
  const landmarkSvg = `
    <svg viewBox="0 0 50 50" width="22" height="22" style="display:block;">
      <circle cx="25" cy="25" r="23" fill="#1e293b" stroke="#c084fc" stroke-width="2"/>
      <path d="M 12 16 L 25 10 L 38 16 Z" fill="#c084fc"/>
      <rect x="15" y="18" width="4" height="18" fill="#e2e8f0"/>
      <rect x="23" y="18" width="4" height="18" fill="#e2e8f0"/>
      <rect x="31" y="18" width="4" height="18" fill="#e2e8f0"/>
      <rect x="10" y="36" width="30" height="4" fill="#c084fc"/>
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
      badgeContent = sevenSvg;
      break;
    case 'familymart':
      pinClass = 'pin-familymart';
      badgeContent = familyMartSvg;
      break;
    case 'pxmart':
      pinClass = 'pin-pxmart';
      badgeContent = pxmartSvg;
      break;
    case 'mcdonalds':
      pinClass = 'pin-mcdonalds';
      badgeContent = mcdonaldsSvg;
      break;
    case 'starbucks':
      pinClass = 'pin-starbucks';
      badgeContent = starbucksSvg;
      break;
    case 'mosburger':
      pinClass = 'pin-mosburger';
      badgeContent = mosBurgerSvg;
      break;
    case 'watsons':
      pinClass = 'pin-watsons';
      badgeContent = watsonsSvg;
      break;
    case 'cosmed':
      pinClass = 'pin-cosmed';
      badgeContent = cosmedSvg;
      break;
    case 'coco':
      pinClass = 'pin-coco';
      badgeContent = cocoSvg;
      break;
    case 'market':
      pinClass = 'pin-market';
      badgeContent = marketSvg;
      break;
    case 'transport':
      pinClass = 'pin-transport';
      badgeContent = transportSvg;
      break;
    case 'landmark':
      pinClass = 'pin-landmark';
      badgeContent = landmarkSvg;
      break;
    default:
      pinClass = 'pin-seven';
      badgeContent = sevenSvg;
  }

  // 純粹官方品牌標誌樣式，絕不於下方附加雜亂文字，乾淨典雅！
  return `<div class="store-holo-pin ${pinClass}" title="${store.name}">${badgeContent}</div>`;
}

// 建立門市詳細彈窗內容
function buildStorePopupContent(store) {
  let brandPillClass = 'type-cvs';
  let brandLabel = '品牌門市';

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
    case 'seven': brandPillClass = 'type-cvs'; brandLabel = '7-Eleven 統一超商'; break;
    case 'familymart': brandPillClass = 'type-cvs'; brandLabel = '全家 FamilyMart'; break;
    case 'pxmart': brandPillClass = 'type-wanjiafu'; brandLabel = '全聯福利中心 PX-Mart'; break;
    case 'mcdonalds': brandPillClass = 'type-cvs'; brandLabel = '麥當勞 McDonald\'s'; break;
    case 'starbucks': brandPillClass = 'type-cvs'; brandLabel = '星巴克 Starbucks'; break;
    case 'mosburger': brandPillClass = 'type-cvs'; brandLabel = '摩斯漢堡 MOS Burger'; break;
    case 'watsons': brandPillClass = 'type-cvs'; brandLabel = '屈臣氏 Watsons'; break;
    case 'cosmed': brandPillClass = 'type-cvs'; brandLabel = '康是美 Cosmed'; break;
    case 'coco': brandPillClass = 'type-cvs'; brandLabel = 'CoCo 都可手搖飲'; break;
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
// ──────────────────────────────────────────
// 9. 門市品牌篩選器 (落實委託人指示：依品牌聚焦巡航，放縮自如)
// ──────────────────────────────────────────
function filterStoreMarkers(brandKey, btnElement) {
  currentStoreFilter = brandKey;

  // 更新按鈕樣式
  document.querySelectorAll('#storeFilterStrip .filter-chip-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  if (btnElement) btnElement.classList.add('active');

  const brandFlagships = {
    wanjiafu: { coords: [25.0381, 121.5064], zoom: 15.5, name: '家樂福 桂林量販旗艦店' },
    carrefour: { coords: [25.0381, 121.5064], zoom: 15.5, name: '家樂福 桂林量販旗艦店' },
    pxmart: { coords: [25.0410, 121.5200], zoom: 15.5, name: '全聯福利中心 中正旗艦門市' },
    seven: { coords: [25.0450, 121.5160], zoom: 15.5, name: '7-Eleven 博漢科技門市' },
    familymart: { coords: [25.0440, 121.5180], zoom: 15.5, name: '全家 FamilyMart 重慶概念店' },
    mcdonalds: { coords: [25.0455, 121.5140], zoom: 15.5, name: '麥當勞 台北館前旗艦店' },
    starbucks: { coords: [25.0435, 121.5130], zoom: 15.5, name: '星巴克 重慶門市' },
    mosburger: { coords: [25.0445, 121.5150], zoom: 15.5, name: '摩斯漢堡 許昌旗艦門市' },
    watsons: { coords: [25.0460, 121.5155], zoom: 15.5, name: '屈臣氏 台北站前旗艦店' },
    cosmed: { coords: [25.0452, 121.5165], zoom: 15.5, name: '康是美 博愛旗艦門市' },
    coco: { coords: [25.0448, 121.5145], zoom: 15.5, name: 'CoCo 都可 南陽旗艦店' },
    market: { coords: [25.0360, 121.5200], zoom: 15.5, name: '南門市場 綠建築旗艦' }
  };

  if (brandKey === 'all') {
    // 顯示所有門市與案件 (受 LOD 縮放過濾保護：zoom >= 15.0 才顯示精美標示，縮小不壅塞)
    updateStoreLODVisibility();
  } else if (brandKey === 'cases') {
    // 僅顯示案件
    Object.keys(storeMarkerGroups).forEach(k => {
      map.removeLayer(storeMarkerGroups[k]);
    });
    map.addLayer(casesLayerGroup);
    updateVisibleStoreCountHUD(false);
  } else if (brandFlagships[brandKey]) {
    // 聚焦至特定品牌的示範旗艦門市，縮放設定為 15.5 (高清晰呈現官方向量樣式)
    const target = brandFlagships[brandKey];
    map.flyTo(target.coords, target.zoom, { duration: 1.2 });
    updateStoreLODVisibility();
  } else if (['thsr', 'tra', 'mrt', 'ebus', 'transport'].includes(brandKey)) {
    // 大眾運輸快捷過濾
    if (brandKey === 'thsr') {
      if (!isThsrVisible) toggleThsrLayer();
      map.flyTo([25.0478, 121.5171], 14, { duration: 1.2 });
    } else if (brandKey === 'tra') {
      if (!isTraVisible) toggleTraLayer();
      map.flyTo([25.0478, 121.5171], 13.5, { duration: 1.2 });
    } else if (brandKey === 'mrt') {
      if (!isMrtVisible) toggleMrtLayer();
      map.flyTo([25.0465, 121.5170], 13.8, { duration: 1.2 });
    } else if (brandKey === 'ebus') {
      if (!isBusVisible) toggleBusLayer();
      if (!isEBusPanelOpen) toggleEBusNavigator();
    } else {
      map.flyTo([25.0465, 121.5170], 15.0, { duration: 1.2 });
    }
    updateStoreLODVisibility();
  } else if (brandKey === 'parks') {
    // 雙北 41 行政特區 1:1 真實公園綠地過濾
    if (!isParksVisible) toggleParksLayer();
    map.flyTo([25.035, 121.530], 13, { duration: 1.2 });
    updateStoreLODVisibility();
  } else {
    updateStoreLODVisibility();
  }
}

// ──────────────────────────────────────────
// 9.1 全門市層級細節 (LOD) 控制器：落實委託人指示
// 「那些只要出現的商店，我要的是它的樣式，而不是在下面寫個它的名字。我要的是它的樣式，並且要放大到一定程度我才會看得到。不然畫面會很擠」
// ──────────────────────────────────────────
function updateStoreLODVisibility() {
  const currentZoom = map.getZoom();
  // 核心：放大至 >= 15.0 (街道/街廓等級) 才浮現商店官方樣式標示；縮小至雙北廣域概覽時完全隱藏，保持視界純淨清爽！
  const showStores = currentZoom >= 15.0;

  const commercialBrands = [
    'wanjiafu', 'lejiakang', 'carrefour', 'seven', 'familymart',
    'pxmart', 'mcdonalds', 'starbucks', 'mosburger', 'watsons',
    'cosmed', 'coco', 'market', 'transport', 'landmark'
  ];

  if (currentStoreFilter === 'all') {
    commercialBrands.forEach(b => {
      const group = storeMarkerGroups[b];
      if (!group) return;
      if (showStores) {
        if (!map.hasLayer(group)) map.addLayer(group);
      } else {
        if (map.hasLayer(group)) map.removeLayer(group);
      }
    });
    if (!map.hasLayer(casesLayerGroup)) map.addLayer(casesLayerGroup);
  } else if (currentStoreFilter === 'cases') {
    commercialBrands.forEach(b => {
      const group = storeMarkerGroups[b];
      if (group && map.hasLayer(group)) map.removeLayer(group);
    });
    if (!map.hasLayer(casesLayerGroup)) map.addLayer(casesLayerGroup);
  } else {
    // 特定品牌篩選模式
    commercialBrands.forEach(b => {
      const group = storeMarkerGroups[b];
      if (!group) return;
      const isTarget = (b === currentStoreFilter) ||
        ((currentStoreFilter === 'wanjiafu' || currentStoreFilter === 'carrefour') && (b === 'wanjiafu' || b === 'lejiakang' || b === 'carrefour'));

      if (isTarget) {
        // 若使用者指定篩選該品牌，在 zoom >= 14.0 即可呈現
        if (currentZoom >= 14.0) {
          if (!map.hasLayer(group)) map.addLayer(group);
        } else {
          if (map.hasLayer(group)) map.removeLayer(group);
        }
      } else {
        if (map.hasLayer(group)) map.removeLayer(group);
      }
    });
    if (map.hasLayer(casesLayerGroup)) map.removeLayer(casesLayerGroup);
  }

  updateVisibleStoreCountHUD(showStores);
}

function updateVisibleStoreCountHUD(showStores) {
  const countEl = document.getElementById('hudStoreCount');
  if (!countEl) return;

  if (currentStoreFilter === 'all') {
    countEl.innerText = showStores ? `${STORES_DATA.length} 處 (已放大呈現樣式)` : '0 處 (縮小隱藏避擠)';
  } else if (currentStoreFilter === 'cases') {
    countEl.innerText = `${CASES_DATA.length} 案`;
  } else {
    const isTargetBrand = (b) => (b === currentStoreFilter) ||
      ((currentStoreFilter === 'wanjiafu' || currentStoreFilter === 'carrefour') && (b === 'wanjiafu' || b === 'lejiakang' || b === 'carrefour'));
    const cnt = STORES_DATA.filter(s => isTargetBrand(s.brand)).length;
    countEl.innerText = `${cnt} 處`;
  }
}

// ──────────────────────────────────────────
// 10. 切換 1:1 真實網路底圖 (NLSC / Esri / OSM / 賽博暗黑 / 衛星)
// ──────────────────────────────────────────
function switchBaseLayer(layerKey) {
  if (!baseLayers[layerKey] || layerKey === currentBaseLayerKey) return;

  map.removeLayer(activeBaseLayer);
  activeBaseLayer = baseLayers[layerKey];
  activeBaseLayer.addTo(map);
  currentBaseLayerKey = layerKey;

  // 確保街道高光圖層、路牌標籤始終置頂於底圖之上，街道 100% 清楚可辨
  if (streetsLayerGroup && map.hasLayer(streetsLayerGroup)) {
    streetsLayerGroup.eachLayer(l => { if (l.bringToFront) l.bringToFront(); });
  }

  const names = {
    nlsc: '臺灣通用電子地圖 (NLSC 繁中街道全圖)',
    esri_street: 'Esri 真實街道全景圖 (高對比導航版)',
    osm: 'OpenStreetMap (繁體中文街道全網)',
    dark: '賽博暗黑夜間圖 (黑曜石霓虹街道複合)',
    satellite: '實體高空衛星 ✕ 1:1 真實街道複合圖層'
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
