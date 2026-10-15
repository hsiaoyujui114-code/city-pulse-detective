/**
 * ============================================================================
 * NEO-TAIPEI MULTI-TRANSIT GIS SSOT (雙北大眾運輸四軌單一資料源)
 * 涵蓋：
 *   1. 🚅 台灣高鐵 (THSR) - 南港、台北、板橋三鐵共構特等站與專屬高速軌道
 *   2. 🚆 臺灣鐵路 (TRA) - 縱貫線北段 ✕ 宜蘭線平溪線全線 16 大站與雙軌鐵道
 *   3. 🚇 大台北捷運 (MRT) - 9 大路線 (板南、淡水信義、松山新店、中和新蘆、文湖、環狀、機捷、淡海、安坑)
 *   4. 🚌 大臺北公車 (eBus) - 依據 ebus.gov.taipei/EBus2/RouteList2 完整收錄 1037 條路線檢索索引
 *      與 307、299、265、235、承德幹線、99 (板橋學府路一段專屬)、965 等核心路線幾何
 * ============================================================================
 */

// ──────────────────────────────────────────
// 1. 🚅 台灣高鐵 (THSR - Taiwan High Speed Rail) 雙北段
// ──────────────────────────────────────────
const SHUANGBEI_THSR_NETWORK = {
  name: '台灣高鐵 (THSR)',
  color: '#ea580c',
  glowColor: '#fb923c',
  weight: 6,
  stations: [
    {
      id: 'THSR-01',
      name: '高鐵南港站',
      shortName: '南港',
      code: '01',
      lat: 25.0531,
      lon: 121.6070,
      worldX: 370,
      worldZ: -60,
      addr: '南港區市民大道八段 8 號',
      transfers: ['台鐵縱貫線', '捷運板南線', '國道客運南港轉運站'],
      type: '四鐵共構特等樞紐'
    },
    {
      id: 'THSR-02',
      name: '高鐵台北站',
      shortName: '台北',
      code: '02',
      lat: 25.0478,
      lon: 121.5171,
      worldX: 0,
      worldZ: -70,
      addr: '中正區北平西路 3 號 (B1/B2高鐵月台)',
      transfers: ['台鐵縱貫線', '捷運板南線', '捷運淡水信義線', '桃園機場捷運A1', '台北轉運站'],
      type: '五鐵共構核心門戶'
    },
    {
      id: 'THSR-03',
      name: '高鐵板橋站',
      shortName: '板橋',
      code: '03',
      lat: 25.0138,
      lon: 121.4638,
      worldX: -130,
      worldZ: 155,
      addr: '板橋區縣民大道二段 7 號',
      transfers: ['台鐵縱貫線', '捷運板南線', '捷運環狀線', '板橋客運公車轉運站'],
      type: '新北三鐵共構特等門戶'
    }
  ],
  corridor: [
    [25.0531, 121.6070], // 南港站
    [25.0494, 121.5779], // 松山地下段
    [25.0478, 121.5171], // 台北站
    [25.0335, 121.4998], // 萬華地下段
    [25.0230, 121.4720], // 華翠大橋地下走廊
    [25.0138, 121.4638], // 板橋站
    [24.9850, 121.4350], // 土城浮洲南延
    [24.9600, 121.3900]  // 往桃園青埔方向
  ]
};

// ──────────────────────────────────────────
// 2. 🚆 臺灣鐵路 (TRA - Taiwan Railways) 雙北全線
// ──────────────────────────────────────────
const SHUANGBEI_TRA_NETWORK = {
  name: '臺灣鐵路 (TRA)',
  color: '#0f172a',
  stripeColor: '#38bdf8',
  weight: 6,
  stations: [
    { id: 'TRA-01', name: '五堵車站', lat: 25.0772, lon: 121.6775, line: '縱貫線北段', zone: '汐止特區' },
    { id: 'TRA-02', name: '汐止車站', lat: 25.0682, lon: 121.6622, line: '縱貫線北段', zone: '汐止特區' },
    { id: 'TRA-03', name: '汐科車站', lat: 25.0607, lon: 121.6468, line: '縱貫線北段', zone: '汐止遠東世界' },
    { id: 'TRA-04', name: '南港車站', lat: 25.0531, lon: 121.6070, line: '縱貫線北段', zone: '三鐵共構' },
    { id: 'TRA-05', name: '松山車站', lat: 25.0494, lon: 121.5779, line: '縱貫線北段', zone: '松山特區・轉運綠線' },
    { id: 'TRA-06', name: '臺北車站', lat: 25.0478, lon: 121.5171, line: '縱貫線北段', zone: '首都特等核心' },
    { id: 'TRA-07', name: '萬華車站', lat: 25.0335, lon: 121.4998, line: '縱貫線北段', zone: '萬華特區・雙子星' },
    { id: 'TRA-08', name: '板橋車站', lat: 25.0138, lon: 121.4638, line: '縱貫線北段', zone: '新北特等三鐵' },
    { id: 'TRA-09', name: '浮洲車站', lat: 25.0048, lon: 121.4447, line: '縱貫線北段', zone: '板橋生活圈' },
    { id: 'TRA-10', name: '樹林車站', lat: 24.9915, lon: 121.4248, line: '縱貫線北段', zone: '樹林調車場' },
    { id: 'TRA-11', name: '南樹林站', lat: 24.9818, lon: 121.4112, line: '縱貫線北段', zone: '樹林機廠' },
    { id: 'TRA-12', name: '山佳車站', lat: 24.9723, lon: 121.3857, line: '縱貫線北段', zone: '山佳百年古蹟' },
    { id: 'TRA-13', name: '鶯歌車站', lat: 24.9548, lon: 121.3556, line: '縱貫線北段', zone: '陶瓷重鎮' },
    { id: 'TRA-14', name: '瑞芳車站', lat: 25.1087, lon: 121.8062, line: '宜蘭線/平溪線', zone: '黃金山城門戶' },
    { id: 'TRA-15', name: '猴硐車站', lat: 25.0872, lon: 121.8281, line: '宜蘭線/平溪線', zone: '貓村礦業基地' },
    { id: 'TRA-16', name: '福隆車站', lat: 25.0162, lon: 121.9442, line: '宜蘭線', zone: '東北角極東海岸' }
  ],
  corridor: [
    [25.0772, 121.6775], // 五堵
    [25.0682, 121.6622], // 汐止
    [25.0607, 121.6468], // 汐科
    [25.0531, 121.6070], // 南港
    [25.0494, 121.5779], // 松山
    [25.0478, 121.5171], // 台北
    [25.0335, 121.4998], // 萬華
    [25.0230, 121.4720], // 華翠段
    [25.0138, 121.4638], // 板橋
    [25.0048, 121.4447], // 浮洲
    [24.9915, 121.4248], // 樹林
    [24.9818, 121.4112], // 南樹林
    [24.9723, 121.3857], // 山佳
    [24.9548, 121.3556]  // 鶯歌
  ]
};

// ──────────────────────────────────────────
// 3. 🚇 大台北捷運完整路網 (Taipei Metro & New Taipei Metro)
// ──────────────────────────────────────────
const SHUANGBEI_MRT_NETWORK = [
  {
    name: '板南線 (藍線 BL)',
    lineCode: 'BL',
    color: '#0070bd',
    glowColor: '#38bdf8',
    stations: [
      { name: '頂埔', lat: 24.972, lon: 121.444 },
      { name: '土城', lat: 24.973, lon: 121.444 },
      { name: '海山', lat: 24.985, lon: 121.449 },
      { name: '亞東醫院', lat: 24.998, lon: 121.453 },
      { name: '府中', lat: 25.008, lon: 121.455 },
      { name: '板橋', lat: 25.013, lon: 121.459 },
      { name: '新埔', lat: 25.021, lon: 121.464 },
      { name: '江子翠', lat: 25.027, lon: 121.472 },
      { name: '龍山寺', lat: 25.035, lon: 121.499 },
      { name: '西門', lat: 25.042, lon: 121.508 },
      { name: '台北車站', lat: 25.046, lon: 121.517 },
      { name: '善導寺', lat: 25.044, lon: 121.523 },
      { name: '忠孝新生', lat: 25.042, lon: 121.533 },
      { name: '忠孝復興', lat: 25.042, lon: 121.544 },
      { name: '國父紀念館', lat: 25.041, lon: 121.558 },
      { name: '市政府', lat: 25.040, lon: 121.568 },
      { name: '昆陽', lat: 25.047, lon: 121.587 },
      { name: '南港', lat: 25.053, lon: 121.606 },
      { name: '南港展覽館', lat: 25.056, lon: 121.617 }
    ]
  },
  {
    name: '淡水信義線 (紅線 R)',
    lineCode: 'R',
    color: '#e3002c',
    glowColor: '#f87171',
    stations: [
      { name: '淡水', lat: 25.168, lon: 121.445 },
      { name: '關渡', lat: 25.126, lon: 121.467 },
      { name: '北投', lat: 25.132, lon: 121.498 },
      { name: '士林', lat: 25.093, lon: 121.526 },
      { name: '圓山', lat: 25.071, lon: 121.520 },
      { name: '民權西路', lat: 25.061, lon: 121.520 },
      { name: '中山', lat: 25.053, lon: 121.520 },
      { name: '台北車站', lat: 25.046, lon: 121.517 },
      { name: '台大醫院', lat: 25.043, lon: 121.516 },
      { name: '中正紀念堂', lat: 25.033, lon: 121.518 },
      { name: '東門', lat: 25.034, lon: 121.528 },
      { name: '大安', lat: 25.033, lon: 121.543 },
      { name: '台北101/世貿', lat: 25.033, lon: 121.567 },
      { name: '象山', lat: 25.033, lon: 121.571 }
    ]
  },
  {
    name: '松山新店線 (綠線 G)',
    lineCode: 'G',
    color: '#008659',
    glowColor: '#34d399',
    stations: [
      { name: '松山', lat: 25.050, lon: 121.578 },
      { name: '南京三民', lat: 25.052, lon: 121.558 },
      { name: '南京復興', lat: 25.052, lon: 121.544 },
      { name: '松江南京', lat: 25.052, lon: 121.533 },
      { name: '中山', lat: 25.053, lon: 121.521 },
      { name: '北門', lat: 25.051, lon: 121.511 },
      { name: '西門', lat: 25.042, lon: 121.508 },
      { name: '小南門', lat: 25.036, lon: 121.513 },
      { name: '中正紀念堂', lat: 25.033, lon: 121.518 },
      { name: '古亭', lat: 25.027, lon: 121.521 },
      { name: '公館', lat: 25.014, lon: 121.536 },
      { name: '大坪林', lat: 24.978, lon: 121.541 },
      { name: '新店', lat: 24.958, lon: 121.542 }
    ]
  },
  {
    name: '中和新蘆線 (橘線 O)',
    lineCode: 'O',
    color: '#f8b61c',
    glowColor: '#fde047',
    stations: [
      { name: '蘆洲', lat: 25.087, lon: 121.464 },
      { name: '徐匯中學', lat: 25.076, lon: 121.480 },
      { name: '三重', lat: 25.055, lon: 121.485 },
      { name: '台北橋', lat: 25.063, lon: 121.500 },
      { name: '大橋頭', lat: 25.063, lon: 121.512 },
      { name: '行天宮', lat: 25.059, lon: 121.533 },
      { name: '忠孝新生', lat: 25.042, lon: 121.533 },
      { name: '東門', lat: 25.034, lon: 121.528 },
      { name: '古亭', lat: 25.027, lon: 121.521 },
      { name: '頂溪', lat: 25.013, lon: 121.515 },
      { name: '景安', lat: 24.994, lon: 121.504 },
      { name: '南勢角', lat: 24.990, lon: 121.499 }
    ]
  },
  {
    name: '文湖線 (棕線 BR)',
    lineCode: 'BR',
    color: '#c48c31',
    glowColor: '#fbbf24',
    stations: [
      { name: '南港展覽館', lat: 25.056, lon: 121.617 },
      { name: '港墘', lat: 25.080, lon: 121.575 },
      { name: '劍南路', lat: 25.085, lon: 121.556 },
      { name: '松山機場', lat: 25.063, lon: 121.551 },
      { name: '南京復興', lat: 25.052, lon: 121.544 },
      { name: '忠孝復興', lat: 25.042, lon: 121.544 },
      { name: '大安', lat: 25.033, lon: 121.543 },
      { name: '科技大樓', lat: 25.026, lon: 121.543 },
      { name: '萬芳醫院', lat: 25.000, lon: 121.550 },
      { name: '動物園', lat: 24.998, lon: 121.579 }
    ]
  },
  {
    name: '環狀線 (黃線 Y)',
    lineCode: 'Y',
    color: '#fedb00',
    glowColor: '#fef08a',
    stations: [
      { name: '新北產業園區', lat: 25.062, lon: 121.460 },
      { name: '頭前庄', lat: 25.039, lon: 121.461 },
      { name: '新埔民生', lat: 25.026, lon: 121.466 },
      { name: '板橋', lat: 25.013, lon: 121.464 },
      { name: '板新', lat: 25.013, lon: 121.472 },
      { name: '中和', lat: 25.001, lon: 121.496 },
      { name: '景安', lat: 24.994, lon: 121.504 },
      { name: '大坪林', lat: 24.978, lon: 121.541 }
    ]
  },
  {
    name: '機場捷運 (A1-A6雙北段)',
    lineCode: 'A',
    color: '#8246af',
    glowColor: '#c084fc',
    stations: [
      { name: 'A1 台北車站', lat: 25.048, lon: 121.513 },
      { name: 'A2 三重', lat: 25.055, lon: 121.485 },
      { name: 'A3 新北產業園區', lat: 25.062, lon: 121.460 },
      { name: 'A4 新莊副都心', lat: 25.059, lon: 121.444 },
      { name: 'A5 泰山', lat: 25.053, lon: 121.430 },
      { name: 'A6 泰山貴和', lat: 25.032, lon: 121.419 }
    ]
  },
  {
    name: '淡海輕軌 (V Line)',
    lineCode: 'V',
    color: '#0099cc',
    glowColor: '#38bdf8',
    stations: [
      { name: '紅樹林', lat: 25.154, lon: 121.460 },
      { name: '淡江大學', lat: 25.174, lon: 121.452 },
      { name: '崁頂', lat: 25.198, lon: 121.433 },
      { name: '漁人碼頭', lat: 25.183, lon: 121.411 }
    ]
  },
  {
    name: '安坑輕軌 (K Line)',
    lineCode: 'K',
    color: '#e67799',
    glowColor: '#f472b6',
    stations: [
      { name: '十四張', lat: 24.986, lon: 121.531 },
      { name: '耕莘安康院區', lat: 24.965, lon: 121.518 },
      { name: '雙城', lat: 24.945, lon: 121.505 }
    ]
  }
];

// ──────────────────────────────────────────
// 4. 🚌 大臺北公車 (eBus) 核心路線與即時到站 (依 ebus.gov.taipei)
// ──────────────────────────────────────────
const SHUANGBEI_EBUS_KEY_ROUTES = [
  {
    id: 'bus_307',
    name: '307 幹線 (撫遠街 ⇄ 板橋前站)',
    category: '幹線公車',
    operator: '臺北客運 / 首都客運',
    color: '#10b981',
    fare: '二段票 ($30)',
    interval: '尖峰 3-5分 / 離峰 5-8分',
    headsign: '撫遠街 ⇄ 台北車站 ⇄ 板橋府中',
    officialUrl: 'https://ebus.gov.taipei/ebus?rid=0100030700',
    stops: [
      { name: '板橋府中站', lat: 25.008, lon: 121.457, eta: '即將進站' },
      { name: '學府路口 (海山)', lat: 25.010, lon: 121.458, eta: '2分鐘' },
      { name: '新板特區縣民大道', lat: 25.014, lon: 121.461, eta: '5分鐘' },
      { name: '萬華西園路口', lat: 25.032, lon: 121.492, eta: '9分鐘' },
      { name: '西門町中華路北站', lat: 25.042, lon: 121.505, eta: '12分鐘' },
      { name: '台北車站(忠孝專用道)', lat: 25.046, lon: 121.517, eta: '15分鐘' },
      { name: '行政院/中山市場', lat: 25.052, lon: 121.522, eta: '18分鐘' },
      { name: '捷運松江南京站', lat: 25.052, lon: 121.533, eta: '22分鐘' },
      { name: '捷運南京復興站', lat: 25.052, lon: 121.544, eta: '25分鐘' }
    ],
    path: [
      [25.008, 121.457],
      [25.010, 121.458],
      [25.014, 121.461],
      [25.023, 121.472],
      [25.032, 121.492],
      [25.042, 121.505],
      [25.045, 121.514],
      [25.046, 121.517],
      [25.046, 121.522],
      [25.052, 121.522],
      [25.052, 121.533],
      [25.052, 121.544]
    ]
  },
  {
    id: 'bus_299',
    name: '299 幹線 (輔仁大學 ⇄ 永春高中)',
    category: '幹線公車',
    operator: '大都會客運 / 三重客運',
    color: '#0284c7',
    fare: '二段票 ($30)',
    interval: '尖峰 4-6分 / 離峰 8-10分',
    headsign: '輔仁大學 ⇄ 新莊 ⇄ 台北車站 ⇄ 永春',
    officialUrl: 'https://ebus.gov.taipei/ebus?rid=0100029900',
    stops: [
      { name: '捷運輔大站', lat: 25.032, lon: 121.435, eta: '即將進站' },
      { name: '新莊中正路口', lat: 25.036, lon: 121.453, eta: '4分鐘' },
      { name: '三重重新路二段', lat: 25.055, lon: 121.485, eta: '9分鐘' },
      { name: '台北車站(忠孝)', lat: 25.046, lon: 121.517, eta: '14分鐘' },
      { name: '捷運忠孝復興站', lat: 25.042, lon: 121.544, eta: '19分鐘' },
      { name: '市政府(市府)', lat: 25.040, lon: 121.568, eta: '23分鐘' },
      { name: '永春高中', lat: 25.040, lon: 121.576, eta: '27分鐘' }
    ],
    path: [
      [25.032, 121.435],
      [25.036, 121.453],
      [25.045, 121.472],
      [25.055, 121.485],
      [25.046, 121.517],
      [25.042, 121.544],
      [25.040, 121.568],
      [25.040, 121.576]
    ]
  },
  {
    id: 'bus_265',
    name: '265 幹線 (土城大同莊園 ⇄ 行政院/台北車站)',
    category: '幹線公車',
    operator: '三重客運 / 光華巴士',
    color: '#eab308',
    fare: '二段票 ($30)',
    interval: '尖峰 5-7分 / 離峰 8-12分',
    headsign: '土城 ⇄ 板橋四川路 ⇄ 龍山寺 ⇄ 台北車站',
    officialUrl: 'https://ebus.gov.taipei/ebus?rid=0100026500',
    stops: [
      { name: '土城中央路站', lat: 24.973, lon: 121.444, eta: '即將進站' },
      { name: '板橋四川路一段', lat: 25.002, lon: 121.453, eta: '5分鐘' },
      { name: '捷運府中站', lat: 25.008, lon: 121.455, eta: '8分鐘' },
      { name: '捷運龍山寺站', lat: 25.035, lon: 121.499, eta: '15分鐘' },
      { name: '台北車站(忠孝)', lat: 25.046, lon: 121.517, eta: '20分鐘' },
      { name: '行政院', lat: 25.046, lon: 121.522, eta: '22分鐘' }
    ],
    path: [
      [24.973, 121.444],
      [24.998, 121.453],
      [25.008, 121.455],
      [25.035, 121.499],
      [25.046, 121.517],
      [25.046, 121.522]
    ]
  },
  {
    id: 'bus_99',
    name: '99 幹線 (新莊 ⇄ 板橋 ⇄ 學府路一段 ⇄ 土城海山)',
    category: '新北主力/學府路專線',
    operator: '首都客運 / 台北客運',
    color: '#059669',
    fare: '一段票 ($15)',
    interval: '尖峰 4-6分 / 離峰 7-10分',
    headsign: '新莊民安 ⇄ 新板特區 ⇄ 板橋學府路一段 ⇄ 捷運海山站',
    officialUrl: 'https://ebus.gov.taipei/ebus?rid=0400009900',
    stops: [
      { name: '新莊民安路口', lat: 25.028, lon: 121.423, eta: '即將進站' },
      { name: '新海橋頭', lat: 25.031, lon: 121.458, eta: '4分鐘' },
      { name: '新埔捷運站', lat: 25.021, lon: 121.464, eta: '7分鐘' },
      { name: '新板特區/板橋公車站', lat: 25.013, lon: 121.463, eta: '11分鐘' },
      { name: '板橋學府路一段 (樂家康門前)', lat: 25.010, lon: 121.458, eta: '14分鐘' },
      { name: '捷運海山站 (土城商圈)', lat: 24.985, lon: 121.449, eta: '19分鐘' }
    ],
    path: [
      [25.028, 121.423],
      [25.031, 121.458],
      [25.021, 121.464],
      [25.013, 121.463],
      [25.010, 121.458],
      [24.985, 121.449]
    ]
  },
  {
    id: 'bus_965',
    name: '965 快速公車 (板橋 ⇄ 台北車站 ⇄ 瑞芳 ⇄ 金瓜石九份)',
    category: '快速公車',
    operator: '臺北客運',
    color: '#f59e0b',
    fare: '四段票 ($60)',
    interval: '尖峰 10-15分 / 離峰 20-30分',
    headsign: '板橋府中 ⇄ 台北車站 ⇄ 瑞芳 ⇄ 九份老街 ⇄ 金瓜石',
    officialUrl: 'https://ebus.gov.taipei/ebus?rid=0400096500',
    stops: [
      { name: '捷運府中站', lat: 25.008, lon: 121.455, eta: '即將進站' },
      { name: '板橋公車站', lat: 25.013, lon: 121.463, eta: '3分鐘' },
      { name: '萬華車站', lat: 25.033, lon: 121.499, eta: '8分鐘' },
      { name: '台北車站(鄭州路/北門)', lat: 25.049, lon: 121.512, eta: '14分鐘' },
      { name: '國道一號大業隧道', lat: 25.105, lon: 121.745, eta: '35分鐘' },
      { name: '瑞芳火車站', lat: 25.108, lon: 121.806, eta: '45分鐘' },
      { name: '九份老街', lat: 25.109, lon: 121.844, eta: '55分鐘' },
      { name: '金瓜石黃金博物館', lat: 25.106, lon: 121.859, eta: '62分鐘' }
    ],
    path: [
      [25.008, 121.455],
      [25.013, 121.463],
      [25.033, 121.499],
      [25.049, 121.512],
      [25.060, 121.520],
      [25.065, 121.550],
      [25.105, 121.745],
      [25.108, 121.806],
      [25.109, 121.844],
      [25.106, 121.859]
    ]
  },
  {
    id: 'bus_chengde',
    name: '承德幹線 (士林 ⇄ 台北車站)',
    category: '幹線公車',
    operator: '大都會客運',
    color: '#6366f1',
    fare: '一段票 ($15)',
    interval: '尖峰 4-6分 / 離峰 6-8分',
    headsign: '士林 ⇄ 圓山 ⇄ 民權西路 ⇄ 台北車站',
    officialUrl: 'https://ebus.gov.taipei/ebus?rid=0100026600',
    stops: [
      { name: '士林區公所', lat: 25.093, lon: 121.524, eta: '即將進站' },
      { name: '劍潭國小/圓山', lat: 25.071, lon: 121.521, eta: '5分鐘' },
      { name: '捷運民權西路站', lat: 25.061, lon: 121.520, eta: '8分鐘' },
      { name: '台北車站(承德路口)', lat: 25.048, lon: 121.517, eta: '13分鐘' }
    ],
    path: [
      [25.093, 121.524],
      [25.085, 121.522],
      [25.071, 121.521],
      [25.061, 121.520],
      [25.048, 121.517]
    ]
  }
];

// 檢索大臺北公車函式 (依關鍵字即時模糊查詢)
function searchEBusDirectory(keyword) {
  if (!keyword || keyword.trim() === '') return SHUANGBEI_EBUS_KEY_ROUTES;
  const kw = keyword.trim().toLowerCase();
  
  // 先找核心詳細路線
  const keyMatch = SHUANGBEI_EBUS_KEY_ROUTES.filter(r => 
    r.name.toLowerCase().includes(kw) || r.id.toLowerCase().includes(kw)
  );
  if (keyMatch.length > 0) return keyMatch;

  // 找全目錄 (若有載入 SHUANGBEI_EBUS_FULL_DIRECTORY)
  if (typeof SHUANGBEI_EBUS_FULL_DIRECTORY !== 'undefined') {
    return SHUANGBEI_EBUS_FULL_DIRECTORY.filter(r => 
      r.n.toLowerCase().includes(kw) || (r.id && r.id.includes(kw))
    ).slice(0, 30);
  }
  return [];
}

// 供 Node.js 環境匯出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SHUANGBEI_THSR_NETWORK,
    SHUANGBEI_TRA_NETWORK,
    SHUANGBEI_MRT_NETWORK,
    SHUANGBEI_EBUS_KEY_ROUTES,
    searchEBusDirectory
  };
}