/**
 * ============================================================================
 * NEO-TAIPEI 1:1 REAL HOLO-MAP (雙北 1:1 真實全息科技地圖 - 附檔引擎)
 * 核心引擎：MapLibre GL JS ✕ 雙北 41 行政特區 ✕ 10 大示範案件 ✕ 雙軌 SSOT
 * 具備：WebGL 硬體加速 + 2D Canvas 全息自動降級備援 (100% 絕不黑屏)
 * ============================================================================
 */

// 取得單一資料源 (SSOT)
const SECTORS_DATA = (typeof SHUANGBEI_41_SECTORS !== 'undefined') ? SHUANGBEI_41_SECTORS : [];
const STORES_DATA = (typeof REAL_WORLD_STORES !== 'undefined') ? REAL_WORLD_STORES : [];
const CASES_DATA = (typeof DEMO_10_CASES !== 'undefined') ? DEMO_10_CASES : [];

// 3. 台北捷運主要路線經緯度 (Taipei Metro Glowing Vector Lines)
const MRT_GEOJSON_LINES = {
  type: 'FeatureCollection',
  features: [
    // 板南線 (藍線)
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
    // 淡水信義線 (紅線)
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
    // 松山新店線 (綠線)
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

// 4. 雙北 307 幹線公車真實 GPS 經緯度路徑
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

// 全域狀態
let mapInstance = null;
let is3DMode = true;
let isRadarScanning = false;
let activePopup = null;
let isUsingFallbackCanvas = false;

// 檢查瀏覽器 WebGL 支援度
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

// 初始化地圖主函式
function initCyberRealMap() {
  console.log('🚀 啟動 NEO-TAIPEI 1:1 真實全息科技地圖 (附檔引擎)...');

  renderSectorJumpButtons();
  renderCasesTopStrip();

  // 若不支援 WebGL 或 MapLibre 未載入，無縫切換為高科技 2D Canvas 全息畫布
  if (!isWebGLAvailable() || typeof maplibregl === 'undefined') {
    console.warn('⚠️ 偵測到環境不支援 WebGL 或腳本受限，無縫啟動高科技全息 2D Canvas 降級畫布！');
    initFallbackCanvasMap();
    return;
  }

  try {
    // 建立 MapLibre 地圖實例
    mapInstance = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap, © CARTO'
          }
        },
        layers: [
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 20
          }
        ]
      },
      center: [121.517, 25.045], // 站前核心
      zoom: 12.5,
      pitch: 45,
      bearing: -12,
      maxBounds: [[121.10, 24.50], [122.20, 25.50]]
    });

    let mapLoaded = false;
    const fallbackTimer = setTimeout(() => {
      if (!mapLoaded && !isUsingFallbackCanvas) {
        console.warn('⚡ MapLibre 載入逾時或 WebGL 渲染受限，自動啟動 2D Canvas 全息備援畫布！');
        initFallbackCanvasMap();
      }
    }, 800);

    mapInstance.on('load', () => {
      mapLoaded = true;
      clearTimeout(fallbackTimer);
      console.log('✅ MapLibre 畫布載入完成，實裝雙北全息向量圖層...');
      addMrtLayers();
      addBus307Layer();
      addSectorsLayer();
      addStoreMarkers();
      addDemoCasesMarkers();
      setupTelemetryListeners();
    });

    mapInstance.on('error', (err) => {
      console.error('MapLibre runtime error, switching to fallback canvas:', err);
      if (!isUsingFallbackCanvas) initFallbackCanvasMap();
    });

  } catch (err) {
    console.error('MapLibre init failed:', err);
    initFallbackCanvasMap();
  }
}

// 實裝台北捷運光纖向量圖層
function addMrtLayers() {
  if (!mapInstance) return;
  mapInstance.addSource('mrt-lines', {
    type: 'geojson',
    data: MRT_GEOJSON_LINES
  });

  mapInstance.addLayer({
    id: 'mrt-glow',
    type: 'line',
    source: 'mrt-lines',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 6,
      'line-opacity': 0.6,
      'line-blur': 3
    }
  });

  mapInstance.addLayer({
    id: 'mrt-core',
    type: 'line',
    source: 'mrt-lines',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#ffffff',
      'line-width': 2.5,
      'line-opacity': 0.95
    }
  });
}

// 實裝 307 幹線公車動態路網
function addBus307Layer() {
  if (!mapInstance) return;
  mapInstance.addSource('bus-307', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: { name: '307 幹線公車真實路網' },
      geometry: { type: 'LineString', coordinates: BUS_307_ROUTE }
    }
  });

  mapInstance.addLayer({
    id: 'bus-307-glow',
    type: 'line',
    source: 'bus-307',
    paint: {
      'line-color': '#00f0ff',
      'line-width': 5,
      'line-opacity': 0.75,
      'line-dasharray': [2, 2]
    }
  });
}

// 實裝雙北 41 行政特區圖層
function addSectorsLayer() {
  if (!mapInstance) return;
  const sectorsGeoJSON = {
    type: 'FeatureCollection',
    features: SECTORS_DATA.map(s => ({
      type: 'Feature',
      properties: {
        id: s.id,
        name: s.name,
        code: s.code,
        tier: s.tier,
        desc: s.desc
      },
      geometry: {
        type: 'Point',
        coordinates: [s.lon, s.lat]
      }
    }))
  };

  mapInstance.addSource('sectors-source', {
    type: 'geojson',
    data: sectorsGeoJSON
  });

  mapInstance.addLayer({
    id: 'sectors-circle',
    type: 'circle',
    source: 'sectors-source',
    paint: {
      'circle-radius': 9,
      'circle-color': '#0284c7',
      'circle-stroke-width': 2.5,
      'circle-stroke-color': '#00f0ff',
      'circle-opacity': 0.8
    }
  });
}

// 實裝真實門市標記 (萬家福、樂家康、便利超商)
function addStoreMarkers() {
  if (!mapInstance) return;
  STORES_DATA.forEach(store => {
    const el = document.createElement('div');
    el.className = 'custom-holo-marker';
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.borderRadius = '50%';
    el.style.cursor = 'pointer';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.fontSize = '12px';
    el.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.6)';

    if (store.brand === 'wanjiafu') {
      el.style.background = 'linear-gradient(135deg, #ef4444, #3b82f6)';
      el.style.border = '2px solid #ffffff';
      el.innerText = '萬';
      el.title = store.name;
    } else if (store.brand === 'lejiakang') {
      el.style.background = 'linear-gradient(135deg, #0284c7, #00f0ff)';
      el.style.border = '2px solid #38bdf8';
      el.innerText = '康';
      el.title = store.name;
    } else if (store.brand === 'cvs_711') {
      el.style.background = '#ea580c';
      el.style.border = '1px solid #ffffff';
      el.innerText = '7';
    } else if (store.brand === 'cvs_fm') {
      el.style.background = '#10b981';
      el.style.border = '1px solid #ffffff';
      el.innerText = '全';
    } else {
      el.style.background = '#f59e0b';
      el.style.border = '1px solid #ffffff';
      el.innerText = '茶';
    }

    el.addEventListener('click', () => {
      const typeBadgeClass = store.brand === 'wanjiafu' ? 'type-wanjiafu' :
                             (store.brand === 'lejiakang' ? 'type-lejiakang' : 'type-cvs');
      const brandLabel = store.brand === 'wanjiafu' ? '萬家福旗艦量販' :
                         (store.brand === 'lejiakang' ? '樂家康便利購' : '連鎖超商');

      const popupHtml = `
        <div class="store-popup-header">
          <span>🏪 ${store.name}</span>
          <span class="store-popup-type ${typeBadgeClass}">${brandLabel}</span>
        </div>
        <div class="store-popup-address">📍 地址：${store.addr}</div>
        <div class="store-popup-address">🛰️ 經緯：E ${store.lon.toFixed(4)}°, N ${store.lat.toFixed(4)}°</div>
        <div class="store-popup-supplies">
          <strong>📦 科技物資補給：</strong><br>
          <span class="supply-tag">${store.supply}</span>
        </div>
      `;

      if (activePopup) activePopup.remove();
      activePopup = new maplibregl.Popup({ offset: 15 })
        .setLngLat([store.lon, store.lat])
        .setHTML(popupHtml)
        .addTo(mapInstance);
    });

    new maplibregl.Marker({ element: el })
      .setLngLat([store.lon, store.lat])
      .addTo(mapInstance);
  });
}

// 實裝 10 大生活科學探究示範案件警戒標記 (🚨 Crime Beacons)
function addDemoCasesMarkers() {
  if (!mapInstance) return;
  CASES_DATA.forEach(c => {
    const el = document.createElement('div');
    el.className = 'crime-beacon-marker';
    el.title = `${c.id}: ${c.title}`;
    el.innerHTML = `🚨<div class="crime-beacon-label">${c.id}</div>`;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openCaseBriefModal(c.id);
    });

    new maplibregl.Marker({ element: el })
      .setLngLat([c.lon, c.lat])
      .addTo(mapInstance);
  });
}

// 頂部 10 大示範案件快速跳轉欄產生器
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

      if (mapInstance && !isUsingFallbackCanvas) {
        mapInstance.flyTo({
          center: [c.lon, c.lat],
          zoom: 15.5,
          pitch: 50,
          bearing: -15,
          duration: 1600
        });
      } else if (fallbackState) {
        fallbackState.targetLon = c.lon;
        fallbackState.targetLat = c.lat;
        fallbackState.targetZoom = 15.0;
      }
      openCaseBriefModal(c.id);
    });
    wrap.appendChild(btn);
  });
}

// 打開案件戰術詳情彈窗
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

      <!-- 校園安全無害替代教具 (消除評審疑慮) -->
      <div class="safe-kit-box">
        <div class="safe-kit-title">🛡️ 評審亮點：校園教學安全無毒替代教具</div>
        <div style="font-size:12px; color:#a7f3d0; line-height:1.5;">${c.safeClassroomKit}</div>
      </div>

      <div class="case-section-box">
        <div class="case-section-title">🔍 案件前情提要</div>
        <p style="font-size:12.5px; color:#e2e8f0;">${c.brief}</p>
      </div>

      <div class="case-section-box">
        <div class="case-section-title">👥 涉案嫌疑人調查網</div>
        ${suspectsHtml}
      </div>

      <div class="case-section-box">
        <div class="case-section-title">🔬 實地自然探究三步驟</div>
        <ol style="padding-left:18px; font-size:12.5px;">${stepsHtml}</ol>
      </div>

      <div class="case-section-box" style="border-left:4px solid #00f0ff; background:rgba(0,240,255,0.06);">
        <div class="case-section-title" style="color:#00f0ff;">⚖️ 破案科學邏輯打臉依據</div>
        <p style="font-size:12.5px; color:#cbd5e1;">${c.conclusion}</p>
      </div>
    </div>

    <div class="case-card-footer">
      <button class="btn-fly-to-scene" onclick="flyToCaseCoordinates(${c.lon}, ${c.lat})">
        🎯 鎖定現場 3D 俯視
      </button>
      <button class="btn-fly-to-scene" style="background:#334155; color:#f8fafc;" onclick="closeCaseModal()">
        關閉視窗
      </button>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeCaseModal() {
  const modal = document.getElementById('caseBriefModal');
  if (modal) modal.style.display = 'none';
}

function flyToCaseCoordinates(lon, lat) {
  closeCaseModal();
  if (mapInstance && !isUsingFallbackCanvas) {
    mapInstance.flyTo({
      center: [lon, lat],
      zoom: 16.0,
      pitch: 55,
      bearing: -20,
      duration: 1800
    });
  } else if (fallbackState) {
    fallbackState.targetLon = lon;
    fallbackState.targetLat = lat;
    fallbackState.targetZoom = 15.0;
  }
}

// 遙測 HUD 監聽器
function setupTelemetryListeners() {
  mapInstance.on('move', () => {
    const center = mapInstance.getCenter();
    const zoom = mapInstance.getZoom();
    const pitch = mapInstance.getPitch();
    const bearing = mapInstance.getBearing();

    document.getElementById('hudLon').innerText = center.lng.toFixed(5) + '°';
    document.getElementById('hudLat').innerText = center.lat.toFixed(5) + '°';
    document.getElementById('hudZoom').innerText = zoom.toFixed(1) + 'x';
    document.getElementById('hudPitch').innerText = Math.round(pitch) + '°';
    document.getElementById('hudBearing').innerText = Math.round((bearing + 360) % 360) + '°';

    detectNearestSector(center.lng, center.lat);
  });

  mapInstance.on('mousemove', (e) => {
    document.getElementById('hudLon').innerText = e.lngLat.lng.toFixed(5) + '°';
    document.getElementById('hudLat').innerText = e.lngLat.lat.toFixed(5) + '°';
    detectNearestSector(e.lngLat.lng, e.lngLat.lat);
  });
}

// 判定最鄰近的特區
function detectNearestSector(lon, lat) {
  let nearest = null;
  let minD = 999999;

  SECTORS_DATA.forEach(s => {
    const d = Math.hypot(s.lon - lon, s.lat - lat);
    if (d < minD) {
      minD = d;
      nearest = s;
    }
  });

  if (nearest) {
    const titleEl = document.getElementById('currentSectorTitle');
    const subEl = document.getElementById('currentSectorSub');
    if (titleEl) titleEl.innerText = `${nearest.code}｜${nearest.name}`;
    if (subEl) subEl.innerText = nearest.desc;
  }
}

// 動態生成特區跳轉標籤
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
    if (mapInstance && !isUsingFallbackCanvas) {
      mapInstance.flyTo({ center: [121.535, 25.045], zoom: 11.2, pitch: 35, bearing: -12, duration: 1800 });
    } else if (fallbackState) {
      fallbackState.targetLon = 121.535;
      fallbackState.targetLat = 25.045;
      fallbackState.targetZoom = 11.2;
    }
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
      if (mapInstance && !isUsingFallbackCanvas) {
        mapInstance.flyTo({ center: [s.lon, s.lat], zoom: 14.8, pitch: 48, bearing: -10, duration: 1600 });
      } else if (fallbackState) {
        fallbackState.targetLon = s.lon;
        fallbackState.targetLat = s.lat;
        fallbackState.targetZoom = 14.8;
      }
    };
    container.appendChild(btn);
  });
}

// 切換 3D 視角與頂視角
function toggle3DMode() {
  is3DMode = !is3DMode;
  const btn = document.getElementById('btnToggle3D');
  if (mapInstance && !isUsingFallbackCanvas) {
    mapInstance.easeTo({
      pitch: is3DMode ? 50 : 0,
      bearing: is3DMode ? -15 : 0,
      duration: 1200
    });
  }
  if (btn) {
    btn.className = `tactical-tool-btn ${is3DMode ? 'active' : ''}`;
    btn.innerHTML = `<span>🏙️ 3D 傾斜視角</span><span style="color:${is3DMode ? '#4ade80' : '#94a3b8'};">${is3DMode ? 'ON' : 'OFF'}</span>`;
  }
}

// 觸發全息雷達波紋
function triggerRadarScan() {
  const wave = document.getElementById('radarScanWave');
  if (!wave) return;
  isRadarScanning = !isRadarScanning;
  const btn = document.getElementById('btnRadarScan');

  if (isRadarScanning) {
    wave.classList.add('active');
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = '<span>📡 全息雷達掃描</span><span style="color:#4ade80;">SCANNING</span>';
    }
  } else {
    wave.classList.remove('active');
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '<span>📡 全息雷達掃描</span><span style="color:#94a3b8;">STANDBY</span>';
    }
  }
}

// ──────────────────────────────────────────
// 5. 2D Canvas 全息自動降級備援引擎 (100% 杜絕黑屏問題)
// 當環境無 WebGL 支援時，自動以高性能 2D Canvas 繪製全息拓撲
// ──────────────────────────────────────────
let fallbackState = null;

function initFallbackCanvasMap() {
  isUsingFallbackCanvas = true;
  const container = document.getElementById('map');
  if (!container) return;
  container.innerHTML = '';

  const canvas = document.createElement('canvas');
  canvas.id = 'fallback-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  fallbackState = {
    lon: 121.525,
    lat: 25.045,
    targetLon: 121.525,
    targetLat: 25.045,
    zoom: 12.2,
    targetZoom: 12.2,
    isDragging: false,
    dragStartMouseX: 0,
    dragStartMouseY: 0,
    dragStartLon: 121.525,
    dragStartLat: 25.045
  };

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  canvas.addEventListener('mousedown', (e) => {
    fallbackState.isDragging = true;
    fallbackState.dragStartMouseX = e.clientX;
    fallbackState.dragStartMouseY = e.clientY;
    fallbackState.dragStartLon = fallbackState.lon;
    fallbackState.dragStartLat = fallbackState.lat;
  });

  window.addEventListener('mousemove', (e) => {
    if (fallbackState.isDragging) {
      const dx = e.clientX - fallbackState.dragStartMouseX;
      const dy = e.clientY - fallbackState.dragStartMouseY;
      const degPerPx = 0.00035 / (fallbackState.zoom / 12);
      fallbackState.targetLon = fallbackState.dragStartLon - dx * degPerPx;
      fallbackState.targetLat = fallbackState.dragStartLat + dy * degPerPx;
    }
    // 更新 HUD
    const centerLon = fallbackState.lon;
    const centerLat = fallbackState.lat;
    const hudLon = document.getElementById('hudLon');
    const hudLat = document.getElementById('hudLat');
    const hudZoom = document.getElementById('hudZoom');
    if (hudLon) hudLon.innerText = centerLon.toFixed(5) + '°';
    if (hudLat) hudLat.innerText = centerLat.toFixed(5) + '°';
    if (hudZoom) hudZoom.innerText = fallbackState.zoom.toFixed(1) + 'x';
    detectNearestSector(centerLon, centerLat);
  });

  window.addEventListener('mouseup', () => {
    fallbackState.isDragging = false;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.4 : -0.4;
    fallbackState.targetZoom = Math.max(9.5, Math.min(18.0, fallbackState.targetZoom + delta));
  }, { passive: false });

  // 點擊事件：案件與門市
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cw = canvas.width;
    const ch = canvas.height;
    const pxPerDeg = 2400 * (fallbackState.zoom / 12);

    // 檢查案件點擊
    for (const c of CASES_DATA) {
      const sx = cw / 2 + (c.lon - fallbackState.lon) * pxPerDeg * 1.1;
      const sy = ch / 2 - (c.lat - fallbackState.lat) * pxPerDeg;
      if (Math.hypot(mx - sx, my - sy) < 18) {
        openCaseBriefModal(c.id);
        return;
      }
    }
  });

  // 動態渲染迴圈
  function renderFallback() {
    fallbackState.lon += (fallbackState.targetLon - fallbackState.lon) * 0.12;
    fallbackState.lat += (fallbackState.targetLat - fallbackState.lat) * 0.12;
    fallbackState.zoom += (fallbackState.targetZoom - fallbackState.zoom) * 0.12;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const pxPerDeg = 2400 * (fallbackState.zoom / 12);

    const toScreenX = (lon) => cx + (lon - fallbackState.lon) * pxPerDeg * 1.1;
    const toScreenY = (lat) => cy - (lat - fallbackState.lat) * pxPerDeg;

    // 1. 深邃星空賽博漸層底色 (絕不黑屏)
    const bgGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, Math.max(w, h));
    bgGrad.addColorStop(0, '#0c1a3b');
    bgGrad.addColorStop(0.7, '#070e24');
    bgGrad.addColorStop(1, '#030714');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. 全息賽博動態網格
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gridSpacing = 40 * (fallbackState.zoom / 12);
    for (let x = (cx % gridSpacing); x < w; x += gridSpacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = (cy % gridSpacing); y < h; y += gridSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // 3. 雙北淡水河水系 (Tamsui & Keelung River)
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = Math.max(5, fallbackState.zoom * 1.5);
    ctx.beginPath();
    ctx.moveTo(toScreenX(121.439), toScreenY(25.175)); // 淡水出海口
    ctx.quadraticCurveTo(toScreenX(121.469), toScreenY(25.137), toScreenX(121.505), toScreenY(25.070));
    ctx.quadraticCurveTo(toScreenX(121.498), toScreenY(25.035), toScreenX(121.458), toScreenY(25.010)); // 板橋大漢溪
    ctx.stroke();

    // 基隆河分支
    ctx.beginPath();
    ctx.moveTo(toScreenX(121.505), toScreenY(25.070));
    ctx.quadraticCurveTo(toScreenX(121.558), toScreenY(25.075), toScreenX(121.655), toScreenY(25.064));
    ctx.stroke();

    // 4. 捷運發光路網
    MRT_GEOJSON_LINES.features.forEach(f => {
      const coords = f.geometry.coordinates;
      ctx.strokeStyle = f.properties.color;
      ctx.lineWidth = Math.max(3, fallbackState.zoom * 0.4);
      ctx.beginPath();
      coords.forEach((pt, i) => {
        const sx = toScreenX(pt[0]);
        const sy = toScreenY(pt[1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
    });

    // 5. 雙北 41 行政特區銘牌與範圍
    SECTORS_DATA.forEach(s => {
      const sx = toScreenX(s.lon);
      const sy = toScreenY(s.lat);

      // 特區霓虹節點
      ctx.fillStyle = s.col;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(5, fallbackState.zoom * 0.6), 0, Math.PI * 2);
      ctx.fill();

      // 特區文字銘牌
      ctx.fillStyle = 'rgba(7, 13, 36, 0.85)';
      ctx.strokeStyle = s.col;
      ctx.lineWidth = 1;
      const tagW = 100;
      const tagH = 20;
      ctx.fillRect(sx - tagW / 2, sy - 24, tagW, tagH);
      ctx.strokeRect(sx - tagW / 2, sy - 24, tagW, tagH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(s.name.split('・')[0], sx, sy - 10);
    });

    // 6. 萬家福與樂家康門市
    STORES_DATA.forEach(st => {
      const sx = toScreenX(st.lon);
      const sy = toScreenY(st.lat);

      ctx.fillStyle = st.brand === 'wanjiafu' ? '#ef4444' : '#0284c7';
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 7. 🚨 10 大示範案件警報點
    CASES_DATA.forEach(c => {
      const sx = toScreenX(c.lon);
      const sy = toScreenY(c.lat);
      const pulse = (Math.sin(Date.now() / 250) + 1) / 2;

      // 發光光環
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 10 + pulse * 8, 0, Math.PI * 2);
      ctx.stroke();

      // 警報圓點
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 警報標籤
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1;
      ctx.fillRect(sx - 35, sy + 12, 70, 16);
      ctx.strokeRect(sx - 35, sy + 12, 70, 16);

      ctx.fillStyle = '#fecdd3';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c.id, sx, sy + 23);
    });

    requestAnimationFrame(renderFallback);
  }

  requestAnimationFrame(renderFallback);
}

// 頁面載入完成時執行
window.addEventListener('DOMContentLoaded', () => {
  initCyberRealMap();
});
