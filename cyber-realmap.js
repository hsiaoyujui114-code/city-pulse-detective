/**
 * ============================================================================
 * NEO-TAIPEI 1:1 REAL HOLO-MAP (雙北 1:1 真實全息科技地圖 - 附檔引擎)
 * 核心引擎：MapLibre GL JS ✕ 雙北 41 行政特區向量圖資 ✕ 3D 建築群 ✕ 真實門市
 * ============================================================================
 */

// 1. 雙北 41 行政特區實體經緯度坐標中樞 (Centroids & Holographic Specs)
const SHUANGBEI_41_SECTORS = [
  // 臺北市 12 核心行政區
  { id: 'tpe_01', name: '中正核心樞紐', code: 'TPE-CC', lon: 121.518, lat: 25.032, tier: 'A', desc: '政治中樞・台北車站・站前商圈' },
  { id: 'tpe_02', name: '萬華西門特區', code: 'TPE-WH', lon: 121.498, lat: 25.035, tier: 'A', desc: '西門町徒步區・龍山寺・華江跨河中繼' },
  { id: 'tpe_03', name: '大同大稻埕港', code: 'TPE-DT', lon: 121.513, lat: 25.063, tier: 'B', desc: '大稻埕碼頭・迪化老街・寧夏夜市' },
  { id: 'tpe_04', name: '中山金融廊道', code: 'TPE-ZS', lon: 121.533, lat: 25.068, tier: 'A', desc: '南京中山商圈・晴光市場・林森條通' },
  { id: 'tpe_05', name: '大安森林穹頂', code: 'TPE-DA', lon: 121.543, lat: 25.026, tier: 'A', desc: '大安森林公園・台大公館・敦南林蔭' },
  { id: 'tpe_06', name: '信義101星港', code: 'TPE-XY', lon: 121.568, lat: 25.033, tier: 'S', desc: '台北101高塔・世貿展館・微風商圈' },
  { id: 'tpe_07', name: '松山光子核心', code: 'TPE-SS', lon: 121.558, lat: 25.059, tier: 'B', desc: '松山機場・南京復興金融・饒河夜市' },
  { id: 'tpe_08', name: '內湖科技園區', code: 'TPE-NH', lon: 121.589, lat: 25.083, tier: 'A', desc: '內科運算總部・碧湖水岸・大賣場聚落' },
  { id: 'tpe_09', name: '南港生技光谷', code: 'TPE-NG', lon: 121.606, lat: 25.055, tier: 'A', desc: '南港展覽館・軟體園區・三鐵共構' },
  { id: 'tpe_10', name: '士林夜市矩陣', code: 'TPE-SL', lon: 121.524, lat: 25.093, tier: 'B', desc: '士林夜市・故宮博物院・陽明山引道' },
  { id: 'tpe_11', name: '北投地熱能量', code: 'TPE-BT', lon: 121.501, lat: 25.132, tier: 'B', desc: '北投溫泉生態・關渡水鳥平原' },
  { id: 'tpe_12', name: '文山貓空生態', code: 'TPE-WS', lon: 121.570, lat: 24.998, tier: 'C', desc: '木柵動物園・貓空茶園・景美夜市' },

  // 新北市 29 全境行政特區
  { id: 'ntpc_01', name: '板橋新北總部 (學府1:1)', code: 'NTP-BQ', lon: 121.459, lat: 25.011, tier: 'S', desc: '新北市政府・板橋車站・學府路真實商圈' },
  { id: 'ntpc_02', name: '三重重新工坊', code: 'NTP-SC', lon: 121.498, lat: 25.062, tier: 'A', desc: '三重重新路・台北橋水岸・三和夜市' },
  { id: 'ntpc_03', name: '蘆洲微風水岸', code: 'NTP-LZ', lon: 121.473, lat: 25.084, tier: 'B', desc: '湧蓮寺商圈・蘆洲重劃區・微風運河' },
  { id: 'ntpc_04', name: '新莊創新高地', code: 'NTP-XZ', lon: 121.442, lat: 25.036, tier: 'A', desc: '副都心高塔群・新莊廟街・副都心機廠' },
  { id: 'ntpc_05', name: '中和高密量子', code: 'NTP-ZH', lon: 121.499, lat: 24.999, tier: 'A', desc: '中和遠東世紀廣場・景安樞紐・南勢角' },
  { id: 'ntpc_06', name: '永和迷宮水岸', code: 'NTP-YH', lon: 121.513, lat: 25.008, tier: 'A', desc: '頂溪商圈・樂華夜市・仁愛公園' },
  { id: 'ntpc_07', name: '土城能源晶谷', code: 'NTP-TC', lon: 121.443, lat: 24.972, tier: 'B', desc: '土城科技園區・頂埔高科技・承天禪寺' },
  { id: 'ntpc_08', name: '樹林鐵道機廠', code: 'NTP-SL', lon: 121.425, lat: 24.991, tier: 'C', desc: '樹林車站調車場・大同山步道' },
  { id: 'ntpc_09', name: '鶯歌奈米陶瓷', code: 'NTP-YG', lon: 121.354, lat: 24.954, tier: 'C', desc: '鶯歌陶瓷老街・新北美術館水岸' },
  { id: 'ntpc_10', name: '三峽古風光谷', code: 'NTP-SX', lon: 121.369, lat: 24.934, tier: 'C', desc: '三峽祖師廟・民權老街・北大特區' },
  { id: 'ntpc_11', name: '新店碧潭水電', code: 'NTP-XD', lon: 121.541, lat: 24.968, tier: 'A', desc: '碧潭水能水岸・大坪林科技・安坑輕軌' },
  { id: 'ntpc_12', name: '淡水數位水能港', code: 'NTP-TS', lon: 121.441, lat: 25.169, tier: 'B', desc: '淡水老街・漁人碼頭・淡海新市鎮' },
  { id: 'ntpc_13', name: '八里光能左岸', code: 'NTP-BL', lon: 121.398, lat: 25.147, tier: 'C', desc: '八里左岸水岸公園・十三行博物館' },
  { id: 'ntpc_14', name: '五股綠能樞紐', code: 'NTP-WG', lon: 121.438, lat: 25.083, tier: 'B', desc: '新北產業園區・五股夏綠地' },
  { id: 'ntpc_15', name: '泰山貴子光軌', code: 'NTP-TS2', lon: 121.431, lat: 25.059, tier: 'C', desc: '明志科技廊帶・貴子坑溪親水' },
  { id: 'ntpc_16', name: '林口台地星雲', code: 'NTP-LK', lon: 121.391, lat: 25.077, tier: 'A', desc: '三井媒體園區・林口新創園・長庚樞紐' },
  { id: 'ntpc_17', name: '汐止雲端運算', code: 'NTP-XZ2', lon: 121.655, lat: 25.064, tier: 'A', desc: '大同路軟體科技廊道・汐科三鐵共構' },
  { id: 'ntpc_18', name: '深坑豆腐光廊', code: 'NTP-SK', lon: 121.616, lat: 25.002, tier: 'C', desc: '深坑老街・木柵動物園後山' },
  { id: 'ntpc_19', name: '石碇高嶺中繼', code: 'NTP-SD', lon: 121.658, lat: 24.991, tier: 'C', desc: '石碇吊腳樓老街・千島湖中繼' },
  { id: 'ntpc_20', name: '坪林包種光學', code: 'NTP-PL', lon: 121.711, lat: 24.937, tier: 'C', desc: '坪林茶業博物館・北勢溪水源保護' },
  { id: 'ntpc_21', name: '三芝櫻色光廊', code: 'NTP-SZ', lon: 121.501, lat: 25.258, tier: 'C', desc: '三芝淺水灣海景・北海岸櫻花' },
  { id: 'ntpc_22', name: '石門極北風能', code: 'NTP-SM', lon: 121.568, lat: 25.290, tier: 'C', desc: '富貴角燈塔極北點・老梅綠石槽' },
  { id: 'ntpc_23', name: '金山北海巨浪', code: 'NTP-JS', lon: 121.642, lat: 25.222, tier: 'C', desc: '金山老街・獅頭山公園・燭臺雙峙' },
  { id: 'ntpc_24', name: '萬里野柳光岩', code: 'NTP-WL', lon: 121.689, lat: 25.176, tier: 'C', desc: '野柳女王頭地質公園・翡翠灣' },
  { id: 'ntpc_25', name: '瑞芳黃金礦嶺', code: 'NTP-RF', lon: 121.810, lat: 25.108, tier: 'B', desc: '九份黃金老街・金瓜石黃金博物館' },
  { id: 'ntpc_26', name: '平溪天燈光子', code: 'NTP-PX', lon: 121.738, lat: 25.025, tier: 'C', desc: '平溪鐵道天燈・十分大瀑布' },
  { id: 'ntpc_27', name: '雙溪清流綠境', code: 'NTP-SX2', lon: 121.865, lat: 25.034, tier: 'C', desc: '牡丹山城・平林溪自行車道' },
  { id: 'ntpc_28', name: '貢寮極東海洋', code: 'NTP-GL', lon: 121.908, lat: 25.014, tier: 'C', desc: '三貂角燈塔極東點・福隆海水浴場' },
  { id: 'ntpc_29', name: '烏來地熱深境', code: 'NTP-UL', lon: 121.550, lat: 24.865, tier: 'C', desc: '烏來溫泉部落・烏來瀑布・桶後溪' }
];

// 2. 雙北萬家福 ✕ 樂家康 ✕ 真實門市經緯度
const REAL_WORLD_STORES = [
  // 萬家福 (WanJiaFu Mega Mall) 大賣場旗艦
  { id: 'wjf_01', brand: 'wanjiafu', name: '萬家福 (桂林旗艦店)', lon: 121.506, lat: 25.038, addr: '萬華區桂林路 1 號', supply: '萬家福高能複合能量餐包 ($40)、離子電解水 ($30)' },
  { id: 'wjf_02', brand: 'wanjiafu', name: '萬家福 (重慶旗艦店)', lon: 121.513, lat: 25.059, addr: '大同區重慶北路二段 171 號', supply: '全像探測補給箱 ($120)、萬家福能量麵包 ($35)' },
  { id: 'wjf_03', brand: 'wanjiafu', name: '萬家福 (新店旗艦店)', lon: 121.545, lat: 24.978, addr: '新店區中興路三段 1 號', supply: '高容量離子電池 ($80)、複合軍規水瓶 ($50)' },
  { id: 'wjf_04', brand: 'wanjiafu', name: '萬家福 (內湖旗艦店)', lon: 121.574, lat: 25.061, addr: '內湖區舊宗路一段 128 號', supply: '全像通訊增幅卡 ($95)、生鮮熱能餐包 ($45)' },
  { id: 'wjf_05', brand: 'wanjiafu', name: '萬家福 (淡新旗艦店)', lon: 121.442, lat: 25.188, addr: '淡水區中山北路二段 383 號', supply: '極地防寒機能餐包 ($50)、淡新水能補給瓶 ($30)' },
  { id: 'wjf_06', brand: 'wanjiafu', name: '萬家福 (板橋三民旗艦店)', lon: 121.467, lat: 25.016, addr: '板橋區三民路二段 31 號', supply: '板橋科技儲能包 ($110)、特製能量三明治 ($38)' },

  // 樂家康 (LeJiaKang Express Mart) 超市便利購
  { id: 'ljk_01', brand: 'lejiakang', name: '樂家康超市便利購 (板橋學府店)', lon: 121.458, lat: 25.010, addr: '板橋區學府路一段 146 號 (1:1真實門牌)', supply: '樂家康量子熱量棒 ($25)、1500ml 離子水 ($30)' },
  { id: 'ljk_02', brand: 'lejiakang', name: '樂家康超市便利購 (站前開封店)', lon: 121.513, lat: 25.045, addr: '中正區開封街一段 18 號', supply: '站前極速補給餐 ($42)、全像解碼透鏡 ($60)' },
  { id: 'ljk_03', brand: 'lejiakang', name: '樂家康超市便利購 (中山松江店)', lon: 121.533, lat: 25.055, addr: '中山區松江路 168 號', supply: '金融快遞能量飲 ($35)、樂家康維他命膠囊 ($40)' },
  { id: 'ljk_04', brand: 'lejiakang', name: '樂家康超市便利購 (永和福和店)', lon: 121.518, lat: 25.006, addr: '永和區福和路 102 號', supply: '永和水岸營養穀物 ($30)、電解水充填罐 ($28)' },
  { id: 'ljk_05', brand: 'lejiakang', name: '樂家康超市便利購 (三重正義店)', lon: 121.497, lat: 25.067, addr: '三重區正義北路 88 號', supply: '重新工坊應急包 ($65)、微風電解能量棒 ($25)' },
  { id: 'ljk_06', brand: 'lejiakang', name: '樂家康超市便利購 (新莊幸福店)', lon: 121.450, lat: 25.050, addr: '新莊區幸福路 720 號', supply: '副都心高能濃縮液 ($45)、樂家康鮮果凍 ($25)' },
  { id: 'ljk_07', brand: 'lejiakang', name: '樂家康超市便利購 (中和景平店)', lon: 121.502, lat: 24.993, addr: '中和區景平路 182 號', supply: '捷運快衝機能水 ($28)、高纖能量球 ($30)' },
  { id: 'ljk_08', brand: 'lejiakang', name: '樂家康超市便利購 (淡水老街店)', lon: 121.440, lat: 25.172, addr: '淡水區中正路 55 號', supply: '鐵蛋風味能量膠 ($25)、淡水海風電解水 ($30)' },

  // 代表性便利超商 (7-Eleven / 全家)
  { id: 'cvs_01', brand: 'cvs_711', name: '7-Eleven 統一超商 (學府門市)', lon: 121.457, lat: 25.012, addr: '板橋區學府路一段 62 號', supply: '御飯糰 ($30)、CITY CAFE 拿鐵 ($45)' },
  { id: 'cvs_02', brand: 'cvs_fm', name: '全家 FamilyMart (學府二店)', lon: 121.459, lat: 25.009, addr: '板橋區學府路一段 98 號', supply: '超柔土司 ($32)、Let\'s Café 經典美式 ($35)' },
  { id: 'cvs_03', brand: 'cvs_711', name: '7-Eleven 統一超商 (站前館前店)', lon: 121.515, lat: 25.046, addr: '中正區館前路 6 號', supply: '茶裏王 ($25)、能量補給凍 ($38)' },
  { id: 'cvs_04', brand: 'cvs_fm', name: '全家 FamilyMart (西門武昌店)', lon: 121.505, lat: 25.044, addr: '萬華區武昌街二段 77 號', supply: '烤地瓜 ($35)、Fami霜淇淋 ($49)' },
  { id: 'cvs_05', brand: 'coco', name: 'CoCo 都可 (站前南陽店)', lon: 121.516, lat: 25.044, addr: '中正區南陽街 15 號', supply: '百香雙響炮 ($55)、珍珠奶茶 ($50)' }
];

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
          [121.533, 25.043], // 忠孝新生
          [121.523, 25.045], // 善導寺
          [121.517, 25.046], // 台北車站
          [121.508, 25.042], // 西門
          [121.500, 25.035], // 龍山寺
          [121.472, 25.025], // 江子翠
          [121.465, 25.022], // 新埔
          [121.459, 25.013], // 板橋
          [121.457, 25.008], // 府中
          [121.453, 24.998], // 亞東醫院
          [121.442, 24.972]  // 頂埔
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
          [121.464, 25.137], // 關渡
          [121.498, 25.132], // 北投
          [121.524, 25.093], // 士林
          [121.521, 25.080], // 劍潭
          [121.520, 25.062], // 民權西路
          [121.521, 25.053], // 中山
          [121.517, 25.046], // 台北車站
          [121.518, 25.033], // 中正紀念堂
          [121.529, 25.034], // 東門
          [121.544, 25.033], // 大安
          [121.565, 25.033], // 台北101/世貿
          [121.571, 25.032]  // 象山
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
          [121.564, 25.052], // 南京三民
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

// 初始化地圖
function initCyberRealMap() {
  console.log('🚀 初始化 NEO-TAIPEI 1:1 真實全息科技地圖 (附檔引擎)...');

  // 檢查 MapLibre 是否載入
  if (typeof maplibregl === 'undefined') {
    console.error('MapLibre GL JS 未正確載入，請確認 script 標籤！');
    return;
  }

  // 建立地圖實例 (採用黑曜石賽博科技底圖樣式)
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
    center: [121.535, 25.045], // 雙北盆地核心座標
    zoom: 12.0,                 // 1:1 完整呈現雙北 41 特區全貌
    pitch: 45,                  // 預設 45° 3D 俯仰視角
    bearing: -12,               // -12° 賽博航向角
    maxBounds: [[121.15, 24.60], [122.10, 25.40]] // 鎖定大雙北 41 特區完整經緯圈
  });

  // 地圖就緒事件
  mapInstance.on('load', () => {
    console.log('✅ MapLibre 畫布載入完成，實裝雙北全息向量圖層...');
    addMrtLayers();
    addBus307Layer();
    addSectorsLayer();
    addStoreMarkers();
    setupTelemetryListeners();
    renderSectorJumpButtons();
  });
}

// 實裝台北捷運光纖向量圖層
function addMrtLayers() {
  mapInstance.addSource('mrt-lines', {
    type: 'geojson',
    data: MRT_GEOJSON_LINES
  });

  // 捷運光暈層 (外層霓虹光暈)
  mapInstance.addLayer({
    id: 'mrt-glow',
    type: 'line',
    source: 'mrt-lines',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 6,
      'line-opacity': 0.5,
      'line-blur': 3
    }
  });

  // 捷運核心層 (內層高亮實線)
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
  const busGeoJSON = {
    type: 'Feature',
    properties: { name: '307 幹線公車真實路網' },
    geometry: {
      type: 'LineString',
      coordinates: BUS_307_ROUTE
    }
  };

  mapInstance.addSource('bus-307', {
    type: 'geojson',
    data: busGeoJSON
  });

  mapInstance.addLayer({
    id: 'bus-307-glow',
    type: 'line',
    source: 'bus-307',
    paint: {
      'line-color': '#00f0ff',
      'line-width': 5,
      'line-opacity': 0.7,
      'line-dasharray': [2, 2]
    }
  });
}

// 實裝雙北 41 行政特區圖層
function addSectorsLayer() {
  const sectorsGeoJSON = {
    type: 'FeatureCollection',
    features: SHUANGBEI_41_SECTORS.map(s => ({
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

  // 特區全息圓形節點
  mapInstance.addLayer({
    id: 'sectors-circle',
    type: 'circle',
    source: 'sectors-source',
    paint: {
      'circle-radius': 8,
      'circle-color': '#0284c7',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#00f0ff',
      'circle-opacity': 0.7
    }
  });
}

// 實裝真實門市標記 (萬家福、樂家康、便利超商)
function addStoreMarkers() {
  REAL_WORLD_STORES.forEach(store => {
    // 建立客製化高科技 DOM 標記
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

    // 點擊彈出高科技全息視窗
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

    // 自動匹配最接近的雙北行政特區
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

  SHUANGBEI_41_SECTORS.forEach(sec => {
    const d = Math.hypot(sec.lon - lon, sec.lat - lat);
    if (d < minD) {
      minD = d;
      nearest = sec;
    }
  });

  if (nearest) {
    document.getElementById('currentSectorTitle').innerText = `${nearest.code}｜${nearest.name}`;
    document.getElementById('currentSectorSub').innerText = nearest.desc;
  }
}

// 渲染特區快速跳轉按鈕
function renderSectorJumpButtons() {
  const container = document.getElementById('jumpScrollWrap');
  if (!container) return;

  container.innerHTML = `
    <button class="jump-chip active" onclick="flyToSector('overview')">🗺️ 雙北全景總覽</button>
    <button class="jump-chip" onclick="flyToSector('tpe_06')">🏙️ 信義101星港</button>
    <button class="jump-chip" onclick="flyToSector('tpe_01')">🏛️ 中正核心樞紐</button>
    <button class="jump-chip" onclick="flyToSector('ntpc_01')">🏫 板橋學府總部 (1:1)</button>
    <button class="jump-chip" onclick="flyToSector('ntpc_12')">🌊 淡水水能港</button>
    <button class="jump-chip" onclick="flyToSector('tpe_02')">🎮 萬華西門町</button>
    <button class="jump-chip" onclick="flyToSector('tpe_05')">🌲 大安森林穹頂</button>
    <button class="jump-chip" onclick="flyToSector('tpe_08')">⚡ 內湖科技園區</button>
    <button class="jump-chip" onclick="flyToSector('ntpc_11')">🚣 新店碧潭水電</button>
    <button class="jump-chip" onclick="flyToSector('ntpc_02')">🏭 三重新莊工坊</button>
    <button class="jump-chip" onclick="flyToSector('ntpc_16')">🛰️ 林口台地星雲</button>
    <button class="jump-chip" onclick="flyToSector('ntpc_25')">🏮 瑞芳九份礦嶺</button>
    <button class="jump-chip" onclick="flyToSector('ntpc_28')">⛵ 貢寮極東海角</button>
    <button class="jump-chip" onclick="flyToSector('ntpc_29')">♨️ 烏來地熱深境</button>
  `;
}

// 快速飛越特定特區
function flyToSector(sectorId) {
  // 更新按鈕高亮狀態
  document.querySelectorAll('.jump-chip').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  if (sectorId === 'overview') {
    mapInstance.flyTo({
      center: [121.535, 25.045],
      zoom: 12.0,
      pitch: 45,
      bearing: -12,
      speed: 1.2,
      curve: 1.4
    });
    return;
  }

  const target = SHUANGBEI_41_SECTORS.find(s => s.id === sectorId);
  if (!target) return;

  mapInstance.flyTo({
    center: [target.lon, target.lat],
    zoom: 15.5,
    pitch: 55,
    bearing: -18,
    speed: 1.3,
    curve: 1.4
  });
}

// 切換 3D 天際線 / 2D 平面測繪
function toggle3DMode() {
  is3DMode = !is3DMode;
  const btn = document.getElementById('btnToggle3D');

  if (is3DMode) {
    mapInstance.easeTo({ pitch: 55, duration: 1000 });
    btn.classList.add('active');
    btn.innerHTML = '<span>🏙️ 3D 傾斜視角</span><span style="color:#4ade80;">ON</span>';
  } else {
    mapInstance.easeTo({ pitch: 0, duration: 1000 });
    btn.classList.remove('active');
    btn.innerHTML = '<span>🗺️ 2D 俯視測繪</span><span style="color:#94a3b8;">OFF</span>';
  }
}

// 觸發全息雷達波掃描
function triggerRadarScan() {
  const wave = document.getElementById('radarScanWave');
  if (!wave) return;

  isRadarScanning = !isRadarScanning;
  const btn = document.getElementById('btnRadarScan');

  if (isRadarScanning) {
    wave.classList.add('active');
    btn.classList.add('active');
    btn.innerHTML = '<span>📡 全息雷達掃描</span><span style="color:#4ade80;">SCANNING</span>';
  } else {
    wave.classList.remove('active');
    btn.classList.remove('active');
    btn.innerHTML = '<span>📡 全息雷達掃描</span><span style="color:#94a3b8;">STANDBY</span>';
  }
}

// 頁面載入完成時執行
window.addEventListener('DOMContentLoaded', () => {
  initCyberRealMap();
});
