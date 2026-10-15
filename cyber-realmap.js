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

// 2. 台北捷運主要路線真實座標 (Taipei Metro Glowing Vector Lines)
const MRT_GEOJSON_LINES = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: '板南線 (藍線)', color: '#0070bd' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [121.617, 25.056], // 南港展覽館
          [121.606, 25.053], // 南港
          [121.587, 25.047], // 昆陽
          [121.578, 25.042], // 後山埤
          [121.568, 25.040], // 市政府
          [121.558, 25.041], // 國父紀念館
          [121.544, 25.042], // 忠孝復興
          [121.527, 25.043], // 善導寺
          [121.517, 25.046], // 台北車站
          [121.508, 25.042], // 西門
          [121.499, 25.035], // 龍山寺
          [121.472, 25.027], // 江子翠
          [121.464, 25.021], // 新埔
          [121.459, 25.013], // 板橋
          [121.455, 25.008], // 府中
          [121.444, 24.972]  // 頂埔
        ]
      }
    },
    {
      type: 'Feature',
      properties: { name: '淡水信義線 (紅線)', color: '#e3002c' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [121.445, 25.168], // 淡水
          [121.469, 25.137], // 關渡
          [121.498, 25.132], // 北投
          [121.524, 25.093], // 士林
          [121.522, 25.071], // 圓山
          [121.521, 25.061], // 民權西路
          [121.521, 25.053], // 中山
          [121.517, 25.046], // 台北車站
          [121.518, 25.033], // 中正紀念堂
          [121.533, 25.033], // 東門
          [121.543, 25.033], // 大安
          [121.567, 25.033], // 台北101/世貿
          [121.571, 25.033]  // 象山
        ]
      }
    },
    {
      type: 'Feature',
      properties: { name: '松山新店線 (綠線)', color: '#008659' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [121.578, 25.050], // 松山
          [121.558, 25.052], // 南京三民
          [121.544, 25.052], // 南京復興
          [121.533, 25.052], // 松江南京
          [121.521, 25.053], // 中山
          [121.511, 25.051], // 北門
          [121.508, 25.042], // 西門
          [121.513, 25.036], // 小南門
          [121.518, 25.033], // 中正紀念堂
          [121.521, 25.027], // 古亭
          [121.522, 25.019], // 台電大樓
          [121.536, 25.014], // 公館
          [121.541, 24.978], // 大坪林
          [121.542, 24.968]  // 新店
        ]
      }
    }
  ]
};

// 3. 雙北 307 幹線公車真實 GPS 經緯度路徑
const BUS_307_ROUTE = [
  [121.457, 25.008], // 板橋府中站
  [121.458, 25.010], // 學府路一段真實商圈
  [121.461, 25.014], // 新板特區縣民大道
  [121.472, 25.023], // 華翠大橋引道
  [121.492, 25.032], // 萬華西園路
  [121.505, 25.042], // 中華路西門町
  [121.514, 25.045], // 忠孝西路中央專用道
  [121.517, 25.046], // 台北車站(忠孝專用道站牌)
  [121.522, 25.046], // 行政院/中山北路口
  [121.522, 25.052], // 中山市場站
  [121.533, 25.052], // 南京東路松江南京
  [121.544, 25.052]  // 南京復興 (折返)
];

// 4. 全域地圖與圖層管理
let map = null;
let currentBaseLayerKey = 'dark';
let activeBaseLayer = null;
let baseLayers = {};
let transitLayerGroup = null;
let storeMarkerGroups = {};
let casesLayerGroup = null;
let sectorsLayerGroup = null;
let isTransitVisible = true;
let currentStoreFilter = 'all';

// 初始化地圖主函式
function initCyberRealMap() {
  console.log('🚀 啟動 NEO-TAIPEI 1:1 真實網路地圖 (純實體 Leaflet GIS 引擎)...');

  if (typeof L === 'undefined') {
    console.error('❌ Leaflet 腳本尚未載入，請確認網路連線或 vendor 本地路徑。');
    return;
  }

  // 1. 建立地圖實例 (預設聚焦台北車站站前核心)
  map = L.map('map', {
    center: [25.045, 121.517],
    zoom: 13,
    minZoom: 9,
    maxZoom: 19,
    zoomControl: false
  });

  // 縮放控制面板 (置於右下角，避免遮蔽頂部導航)
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // 2. 建立 1:1 真實網路地圖瓦片服務 (CARTO Dark, OSM Standard, Esri Satellite, CARTO Voyager)
  baseLayers = {
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }),
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }),
    voyager: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    })
  };

  activeBaseLayer = baseLayers.dark;
  activeBaseLayer.addTo(map);

  // 3. 建立各圖層群組
  transitLayerGroup = L.layerGroup().addTo(map);
  casesLayerGroup = L.layerGroup().addTo(map);
  sectorsLayerGroup = L.layerGroup().addTo(map);

  // 初始化門市圖層群組 (依品牌分類)
  const brands = ['wanjiafu', 'lejiakang', 'seven', 'familymart', 'coco', 'market', 'transport', 'landmark'];
  brands.forEach(b => {
    storeMarkerGroups[b] = L.layerGroup().addTo(map);
  });

  // 4. 繪製圖層內容
  renderSectorJumpButtons();
  renderCasesTopStrip();
  addMrtAndBusLayers();
  addSectorsLayer();
  addAllStoreMarkers();
  addDemoCasesMarkers();
  setupTelemetryListeners();

  console.log('✅ 1:1 真實雙北網路地圖已全數載入完成，無手繪降級！');
}

// ──────────────────────────────────────────
// 5. 繪製捷運與 307 公車發光真實向量軌道
// ──────────────────────────────────────────
function addMrtAndBusLayers() {
  transitLayerGroup.clearLayers();

  // (1) 台北捷運發光路網
  MRT_GEOJSON_LINES.features.forEach(f => {
    const latLngs = f.geometry.coordinates.map(pt => [pt[1], pt[0]]);
    
    // 外層光暈底線
    L.polyline(latLngs, {
      color: f.properties.color,
      weight: 8,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(transitLayerGroup);

    // 核心亮線
    const line = L.polyline(latLngs, {
      color: f.properties.color,
      weight: 3.5,
      opacity: 0.95
    }).addTo(transitLayerGroup);

    line.bindTooltip(`🚇 ${f.properties.name}`, { sticky: true });
  });

  // (2) 307 幹線公車真實 GPS 巡航路徑
  const busLatLngs = BUS_307_ROUTE.map(pt => [pt[1], pt[0]]);
  
  // 外層金色光暈
  L.polyline(busLatLngs, {
    color: '#f59e0b',
    weight: 7,
    opacity: 0.4,
    dashArray: '10, 8'
  }).addTo(transitLayerGroup);

  // 核心發光線
  const busLine = L.polyline(busLatLngs, {
    color: '#fbbf24',
    weight: 3.5,
    opacity: 1.0
  }).addTo(transitLayerGroup);

  busLine.bindTooltip('🚌 307 幹線公車真實路徑 (板橋府中 ➔ 學府商圈 ➔ 台北車站 ➔ 中山松江南京)', { sticky: true });
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

// 切換捷運與 307 公車路網
function toggleTransitLayer() {
  isTransitVisible = !isTransitVisible;
  const btn = document.getElementById('btnToggleTransit');
  if (isTransitVisible) {
    map.addLayer(transitLayerGroup);
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = '<span>🚇 捷運與 307 公車</span><span style="color:#4ade80;">ON</span>';
    }
  } else {
    map.removeLayer(transitLayerGroup);
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '<span>🚇 捷運與 307 公車</span><span style="color:#94a3b8;">OFF</span>';
    }
  }
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
