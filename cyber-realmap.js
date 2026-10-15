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
let thsrLayerGroup = null;
let traLayerGroup = null;
let mrtLayerGroup = null;
let ebusLayerGroup = null;
let ebusDynamicBusesGroup = null;
let highlightedBusRouteGroup = null;
let storeMarkerGroups = {};
let casesLayerGroup = null;
let sectorsLayerGroup = null;

let isStreetsVisible = true;
let isThsrVisible = true;
let isTraVisible = true;
let isMrtVisible = true;
let isBusVisible = true;
let isEBusPanelOpen = false;
let currentStoreFilter = 'all';


// 初始化地圖主函式
function initCyberRealMap() {
  console.log('🚀 啟動 NEO-TAIPEI 1:1 真實網路地圖 (純實體 Leaflet GIS 引擎)...');

  if (typeof L === 'undefined') {
    console.error('❌ Leaflet 腳本尚未載入，請確認網路連線或 vendor 本地路徑。');
    return;
  }

  // 1. 建立地圖實例 (預設聚焦台北車站站前核心，直接以 15.2x 街廓特寫展現每條街道與巷弄門牌)
  map = L.map('map', {
    center: [25.0465, 121.5170],
    zoom: 15.2,
    minZoom: 9,
    maxZoom: 19,
    zoomControl: false
  });

  // 縮放控制面板 (置於右下角，避免遮蔽頂部導航)
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // 2. 建立 1:1 真實網路地圖瓦片服務 (OpenStreetMap 預設、CARTO Voyager、CARTO Dark、Esri Satellite)
  baseLayers = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 繁體中文真實街道'
    }),
    voyager: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    })
  };

  // 預設載入 OpenStreetMap Standard (路名、巷弄、門牌、綠地 100% 清晰可見)
  activeBaseLayer = baseLayers.osm;
  activeBaseLayer.addTo(map);

  // 3. 建立各圖層群組
  streetsLayerGroup = L.layerGroup().addTo(map);
  thsrLayerGroup = L.layerGroup().addTo(map);
  traLayerGroup = L.layerGroup().addTo(map);
  mrtLayerGroup = L.layerGroup().addTo(map);
  ebusLayerGroup = L.layerGroup().addTo(map);
  ebusDynamicBusesGroup = L.layerGroup().addTo(map);
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
  addThsrLayer();
  addTraLayer();
  addMrtLayer();
  addEBusLayer();
  renderEBusPanel();
  initBusMotionSimulation();
  addSectorsLayer();
  addAllStoreMarkers();
  addDemoCasesMarkers();
  setupTelemetryListeners();

  console.log('✅ 1:1 真實雙北網路街道全景圖與四軌大眾運輸已全數載入完成！');
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

    // 繪製端點站與主要轉乘站 Marker
    line.stations.forEach((st, idx) => {
      // 僅標記關鍵樞紐與端點站，避免密集遮蔽
      const isHub = (idx === 0 || idx === line.stations.length - 1 || 
                     ['台北車站', '板橋', '府中', '西門', '中正紀念堂', '忠孝復興', '松江南京', '南京復興', '大安', '古亭', '大坪林', '新北產業園區'].includes(st.name));
      if (!isHub) return;

      const icon = L.divIcon({
        html: `<div class="transit-badge-pin pin-mrt" style="border-color:${line.color};">🚇 ${st.name}</div>`,
        className: 'transit-pin-wrap',
        iconAnchor: [30, 10]
      });

      const marker = L.marker([st.lat, st.lon], { icon }).addTo(mrtLayerGroup);
      marker.bindPopup(`
        <div style="font-family:sans-serif; color:#f8fafc;">
          <div style="font-size:12px; font-weight:900; color:${line.glowColor};">🚇 捷運 ${st.name}站</div>
          <div style="font-size:10px; color:#94a3b8; margin-top:2px;">所屬：${line.name}</div>
          <div style="font-size:10px; color:#cbd5e1; margin-top:4px;">雙北捷運核心轉運樞紐，各線互通直達。</div>
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

// (5) 動態巡邏公車車輛物理模擬 (Simulated Real-time Moving Buses)
let dynamicBusInterval = null;
const movingBusesState = [
  { id: 'sim_307', name: '307 幹線公車', route: 'bus_307', color: '#10b981', step: 0, marker: null },
  { id: 'sim_299', name: '299 幹線公車', route: 'bus_299', color: '#0284c7', step: 2, marker: null },
  { id: 'sim_99', name: '99 學府路專線', route: 'bus_99', color: '#059669', step: 1, marker: null }
];

function initBusMotionSimulation() {
  if (dynamicBusInterval) clearInterval(dynamicBusInterval);
  ebusDynamicBusesGroup.clearLayers();

  movingBusesState.forEach(b => {
    const r = EBUS_KEY_ROUTES.find(x => x.id === b.route);
    if (!r || !r.path || r.path.length === 0) return;

    const initialPt = r.path[b.step % r.path.length];
    const icon = L.divIcon({
      html: `<div style="background:${b.color}; color:#fff; font-size:10px; font-weight:900; padding:2px 6px; border-radius:10px; border:2px solid #fff; box-shadow:0 0 10px ${b.color}; white-space:nowrap; cursor:pointer;">🚌 ${b.name}</div>`,
      className: 'moving-bus-icon',
      iconAnchor: [35, 12]
    });

    b.marker = L.marker(initialPt, { icon }).addTo(ebusDynamicBusesGroup);
    b.marker.bindPopup(`<b>🚌 ${b.name} (即時行駛中)</b><br>遵行 TDX 交通部規範道路軌跡巡航中。`);
  });

  dynamicBusInterval = setInterval(() => {
    movingBusesState.forEach(b => {
      const r = EBUS_KEY_ROUTES.find(x => x.id === b.route);
      if (!r || !r.path || !b.marker) return;

      b.step = (b.step + 1) % r.path.length;
      const nextPt = r.path[b.step];
      b.marker.setLatLng(nextPt);
    });
  }, 3500);
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

function toggleBusLayer() {
  isBusVisible = !isBusVisible;
  const btn = document.getElementById('btnToggleBus');
  if (isBusVisible) {
    map.addLayer(ebusLayerGroup);
    map.addLayer(ebusDynamicBusesGroup);
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
  let pinClass = 'pin-wanjiafu';
  let badgeGlyph = '🏪';

  switch (brand) {
    case 'wanjiafu':
      pinClass = 'pin-wanjiafu';
      badgeGlyph = '萬';
      break;
    case 'lejiakang':
      pinClass = 'pin-lejiakang';
      badgeGlyph = '樂';
      break;
    case 'seven':
      pinClass = 'pin-seven';
      badgeGlyph = '7';
      break;
    case 'familymart':
      pinClass = 'pin-familymart';
      badgeGlyph = '全';
      break;
    case 'coco':
      pinClass = 'pin-coco';
      badgeGlyph = '🧋';
      break;
    case 'market':
      pinClass = 'pin-market';
      badgeGlyph = '市';
      break;
    case 'transport':
      pinClass = 'pin-transport';
      badgeGlyph = store.name.includes('公車') ? '🚏' : '🚇';
      break;
    case 'landmark':
      pinClass = 'pin-landmark';
      badgeGlyph = '🏛️';
      break;
    default:
      pinClass = 'pin-lejiakang';
      badgeGlyph = '📍';
  }

  return `<div class="store-holo-pin ${pinClass}" title="${store.name}">${badgeGlyph}</div>`;
}

// 建立門市詳細彈窗內容
function buildStorePopupContent(store) {
  let brandPillClass = 'type-lejiakang';
  let brandLabel = '樂家康生鮮';

  switch (store.brand) {
    case 'wanjiafu': brandPillClass = 'type-wanjiafu'; brandLabel = '萬家福旗艦'; break;
    case 'lejiakang': brandPillClass = 'type-lejiakang'; brandLabel = '樂家康生鮮'; break;
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
    // 顯示所有門市與案件
    Object.keys(storeMarkerGroups).forEach(k => {
      map.addLayer(storeMarkerGroups[k]);
    });
    map.addLayer(casesLayerGroup);
    visibleCount = STORES_DATA.length;
  } else if (brandKey === 'cases') {
    // 僅顯示案件
    Object.keys(storeMarkerGroups).forEach(k => {
      map.removeLayer(storeMarkerGroups[k]);
    });
    map.addLayer(casesLayerGroup);
    visibleCount = CASES_DATA.length;
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
function setupTelemetryListeners() {
  map.on('move', () => {
    const center = map.getCenter();
    const zoom = map.getZoom();

    const hudLon = document.getElementById('hudLon');
    const hudLat = document.getElementById('hudLat');
    const hudZoom = document.getElementById('hudZoom');

    if (hudLon) hudLon.innerText = center.lng.toFixed(5) + '°';
    if (hudLat) hudLat.innerText = center.lat.toFixed(5) + '°';
    if (hudZoom) hudZoom.innerText = zoom.toFixed(1) + 'x';

    detectNearestSector(center.lng, center.lat);
  });
}

function detectNearestSector(lon, lat) {
  let closest = null;
  let minDist = Infinity;

  SECTORS_DATA.forEach(s => {
    const d = Math.hypot(s.lon - lon, s.lat - lat);
    if (d < minDist) {
      minDist = d;
      closest = s;
    }
  });

  if (closest) {
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
