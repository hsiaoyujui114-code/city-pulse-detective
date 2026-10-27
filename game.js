/**
 * ==========================================================================
 * 《雙北漫遊：都會行蹤》- 現代 2D ✕ 2.5D 動漫都會冒險 RPG
 * 60FPS 現代平滑動態渲染 (Y-Sorting 深度分層 ✕ 動態陰影 ✕ 天候光影)
 * 雙速移動模式 (🚶 走路 ✕ 🏃 奔跑極速衝刺)
 * 完整倍增大雙北真實路網 (忠孝西路 ✕ 中山北路 ✕ 台北車站 ✕ 館前路 ✕ 重慶路 ✕ 市民大道)
 * 專屬私服器多人同步 ✕ 307 公車通勤 ✕ 空拍鳥瞰快轉過場
 * ==========================================================================
 */

// Canvas 圓角安全輔助函式
function drawSafeRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ─── 1. Web Audio API 音效引擎 ─── */
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq = 440, type = 'sine', duration = 0.08, gainVal = 0.1) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

function playStoreChime() {
  const notes = [659.25, 830.61, 739.99, 493.88];
  notes.forEach((freq, idx) => setTimeout(() => playTone(freq, 'triangle', 0.22, 0.18), idx * 160));
}

function playMrtChime() {
  const notes = [392, 493.88, 587.33, 783.99];
  notes.forEach((freq, idx) => setTimeout(() => playTone(freq, 'triangle', 0.26, 0.16), idx * 160));
}

function playBusChime() {
  playTone(523.25, 'triangle', 0.15, 0.2);
  setTimeout(() => playTone(659.25, 'triangle', 0.22, 0.2), 120);
}

function playVictoryFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, idx) => setTimeout(() => playTone(freq, 'sine', 0.2, 0.2), idx * 130));
}

function playSlapSound() {
  playTone(150, 'sawtooth', 0.15, 0.3);
  setTimeout(() => playTone(880, 'square', 0.25, 0.2), 80);
}

function playBuzzer() {
  playTone(180, 'sawtooth', 0.2, 0.25);
  setTimeout(() => playTone(150, 'sawtooth', 0.2, 0.25), 180);
}

/* ─── 2. 遊戲全局狀態與雙速移動核心 ─── */
const gameState = {
  money: 200,
  stamina: 85,
  mood: 90,
  hasSkateboard: false,
  // 雙速移動曲線 (大幅提速)
  walkSpeed: 0.65,       // 🚶 正常步行速度 (超快步伐)
  runSpeed: 1.40,        // 🏃 奔跑衝刺速度 (極速奔馳)
  isRunning: false,      // 當前是否處於跑步衝刺狀態
  speed: 0.65,
  // 幽靈天眼巡航核心狀態 (Ghost Spectator Drone View)
  isGhostMode: true,     // 預設為天眼幽靈自由巡航模式 (全域俯瞰，無死角巡視地圖)
  droneFlySpeed: 4.5,    // 天眼飛行平移速度 (極速平移無延遲)
  droneTurboSpeed: 10.5, // 極速巡航飛行速度 (Shift 鍵超光速巡視全城)
  activeBrandFilter: 'all', // 當前連鎖雷達篩選品牌: 'all'
  weather: 'sunny',
  mosaic: false,
  nickname: "全息戰術終端",
  currentBubble: "🛰️ 雙北全境科幻拓撲連線中",
  cluesFound: 0,
  hasBoba: false,
  hasTeaEgg: false,
  currentDistrict: 'overview',
  currentLocationName: "雙北全境全息拓撲 ✕ 大台北都會區總覽",
  inTransit: false,
  transitType: null,
  transitDest: null,
  fastForwarding: false,
  fastForwardProgress: 0,
  quests: {
    bus: false,
    coco: false,
    store: false,
    clues: false,
    tib: false,
    arrest: false
  },
  activeInteractTarget: null
};

// 主角位置與動態攝像機平滑追蹤 (Smooth Lerp Camera)
const playerPos = {
  x: 0,
  z: 14,
  facing: 'down', // 'down', 'up', 'left', 'right'
  walkCycle: 0,
  isMoving: false
};

const camera = {
  x: 0,
  z: 14,
  targetScale: 5.2, // 預設舒適街區視角：開局即見清晰街道、萬家福/樂家康、307公車與角色，徹底告別黑屏！
  currentScale: 5.2,
  minScale: 0.85,   // 支援宏觀雙北全景總覽
  maxScale: 160.0   // 核心突破：大幅提升至 160.0，支援超大微觀角色特寫！
};
let cameraLockToPlayer = true; // 視角嚴密鎖定於主角正上方，移動時無縫同步推進

// 🛣️ 道路路牌簡潔化控制 (預設隱藏「民權東路」等看板，按鈕按需啟用，符合企劃書視野規範)
window.showGameRoadSigns = false;
window.toggleGameRoadSigns = function() {
  window.showGameRoadSigns = !window.showGameRoadSigns;
  const btn = document.getElementById('btnToggleGameRoadSigns');
  if (btn) {
    btn.style.borderColor = window.showGameRoadSigns ? '#22c55e' : 'rgba(255,255,255,0.2)';
    btn.style.boxShadow = window.showGameRoadSigns ? '0 0 10px rgba(34, 197, 94, 0.6)' : 'none';
  }
  if (typeof addSystemChat === 'function') {
    addSystemChat(`🛣️ 2.5D沙盤道路名稱看板已【${window.showGameRoadSigns ? '開啟顯示' : '設為簡潔隱藏'}】`);
  }
};

// 奔跑腳底塵土/氣流粒子系統
const sprintParticles = [];

/* ─── 3. 2D/2.5D Canvas 現代動漫引擎容器初始化 (Retina HiDPI 超高畫質支援) ─── */
const container = document.getElementById("webgl-container");
container.innerHTML = '';
const canvas = document.createElement('canvas');
const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
canvas.width = Math.round(window.innerWidth * dpr);
canvas.height = Math.round(window.innerHeight * dpr);
canvas.style.width = window.innerWidth + 'px';
canvas.style.height = window.innerHeight + 'px';
container.appendChild(canvas);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

const engineLbl = document.getElementById("renderEngineLabel");
if (engineLbl) {
  engineLbl.innerText = '現代 2D ✕ 2.5D 高空俯瞰創新科技冒險引擎 (Retina HiDPI 高解析度・零模糊)';
}

// ──────────────────────────────────────────
// 雙北全境 29+12 行政特區賽博全息晶片板塊 (All 41 Greater Taipei Sectors)
// 【完整涵蓋：臺北市 12 區 ✕ 新北市全境 29 行政區，絕無遺漏！】
// ──────────────────────────────────────────
const shuangbeiSectors = [
  // ── 臺北市 12 核心行政特區 (Taipei Metropolis 12 Core Sectors) ──
  { id: 'TPE-01', name: '中正特區・核心樞紐', x: 0, z: 20, w: 95, h: 80, col: '#00f0ff', desc: '北車 ✕ 重慶書街 ✕ 古蹟群' },
  { id: 'TPE-02', name: '萬華特區・西門霓虹', x: -150, z: 45, w: 85, h: 80, col: '#f472b6', desc: '西門町 ✕ 龍山寺 ✕ 青年公園' },
  { id: 'TPE-03', name: '大同特區・大稻埕', x: -110, z: -110, w: 80, h: 95, col: '#fbbf24', desc: '迪化街 ✕ 寧夏夜市 ✕ 圓環' },
  { id: 'TPE-04', name: '中山特區・金融廊道', x: 90, z: -70, w: 95, h: 95, col: '#a78bfa', desc: '條通商圈 ✕ 松江南京 ✕ 美麗華' },
  { id: 'TPE-05', name: '大安特區・森林穹頂', x: 110, z: 80, w: 85, h: 90, col: '#34d399', desc: '大安森林 ✕ 師大夜市 ✕ 敦南' },
  { id: 'TPE-06', name: '信義特區・101星港', x: 235, z: 50, w: 90, h: 85, col: '#f59e0b', desc: '台北101 ✕ 市府 ✕ 象山星港' },
  { id: 'TPE-07', name: '松山特區・光子核心', x: 220, z: -85, w: 80, h: 75, col: '#fb7185', desc: '小巨蛋 ✕ 松山機場 ✕ 饒河夜市' },
  { id: 'TPE-08', name: '內湖特區・科技園區', x: 270, z: -160, w: 120, h: 90, col: '#38bdf8', desc: '內科高能園區 ✕ 碧湖 ✕ 大湖' },
  { id: 'TPE-09', name: '南港特區・生技光谷', x: 370, z: -60, w: 100, h: 85, col: '#818cf8', desc: '南港軟體港 ✕ 展覽館 ✕ 三鐵樞紐' },
  { id: 'TPE-10', name: '士林特區・夜市矩陣', x: -60, z: -210, w: 110, h: 90, col: '#f43f5e', desc: '士林夜市 ✕ 故宮 ✕ 天母國際特區' },
  { id: 'TPE-11', name: '北投特區・地熱能量', x: -160, z: -270, w: 105, h: 90, col: '#c084fc', desc: '溫泉能量谷 ✕ 關渡隘口 ✕ 大屯火山' },
  { id: 'TPE-12', name: '文山特區・貓空生態', x: 170, z: 230, w: 110, h: 100, col: '#10b981', desc: '木柵動物園 ✕ 貓空纜車 ✕ 仙跡岩' },

  // ── 新北市 29 全境行政特區 (New Taipei Metropolis 29 Full Sectors) ──
  { id: 'NTP-01', name: '板橋特區・新北總部 (學府1:1)', x: -130, z: 155, w: 100, h: 95, col: '#34d399', desc: '新板行政大樓 ✕ 學府路商圈 ✕ 府中' },
  { id: 'NTP-02', name: '三重特區・重新工坊', x: -260, z: -40, w: 90, h: 85, col: '#38bdf8', desc: '重新路幹道 ✕ 三和夜市 ✕ 忠孝橋頭' },
  { id: 'NTP-03', name: '蘆洲特區・微風水岸', x: -250, z: -160, w: 85, h: 80, col: '#22d3ee', desc: '湧蓮寺 ✕ 蘆洲捷運機廠 ✕ 水河綠帶' },
  { id: 'NTP-04', name: '新莊特區・創新高地', x: -310, z: 80, w: 100, h: 90, col: '#a3e635', desc: '新莊副都心 ✕ 輔大校區 ✕ 廟街夜市' },
  { id: 'NTP-05', name: '中和特區・高密量子', x: -35, z: 175, w: 80, h: 80, col: '#c084fc', desc: '景安雙捷運 ✕ 遠東科技園 ✕ 烘爐地' },
  { id: 'NTP-06', name: '永和特區・迷宮水岸', x: -65, z: 135, w: 65, h: 65, col: '#e879f9', desc: '樂華夜市 ✕ 頂溪水岸 ✕ 密集街廓' },
  { id: 'NTP-07', name: '土城特區・能源晶谷', x: -120, z: 250, w: 90, h: 90, col: '#2dd4bf', desc: '土城科技園區 ✕ 頂埔高科技 ✕ 廣明樂家康' },
  { id: 'NTP-08', name: '樹林特區・鐵道機廠', x: -220, z: 240, w: 85, h: 85, col: '#4ade80', desc: '樹林車站 ✕ 柑園生態園區 ✕ 大同山' },
  { id: 'NTP-09', name: '三峽特區・古風光谷', x: -260, z: 320, w: 95, h: 95, col: '#fb923c', desc: '三峽老街 ✕ 祖師廟 ✕ 鳶山能源陣列' },
  { id: 'NTP-10', name: '鶯歌特區・奈米陶瓷', x: -330, z: 310, w: 85, h: 85, col: '#f472b6', desc: '陶瓷博物館 ✕ 老街科技工坊 ✕ 三鶯線' },
  { id: 'NTP-11', name: '新店特區・碧潭水電', x: 80, z: 270, w: 110, h: 100, col: '#06b6d4', desc: '碧潭水能基地 ✕ 大坪林 ✕ 烏來隘口' },
  { id: 'NTP-12', name: '淡水特區・數位水能港', x: -230, z: -330, w: 105, h: 95, col: '#00f0ff', desc: '金色水岸 ✕ 漁人碼頭 ✕ 淡海輕軌' },
  { id: 'NTP-13', name: '八里特區・光能左岸', x: -310, z: -300, w: 90, h: 85, col: '#38bdf8', desc: '八里渡船頭 ✕ 台北港物流 ✕ 十三行' },
  { id: 'NTP-14', name: '五股特區・綠能樞紐', x: -310, z: -80, w: 85, h: 80, col: '#10b981', desc: '新北產業園區 ✕ 五股水碓 ✕ 觀音前緣' },
  { id: 'NTP-15', name: '泰山特區・貴子光軌', x: -340, z: 0, w: 80, h: 75, col: '#60a5fa', desc: '明志科技廊道 ✕ 機場捷運 ✕ 楓樹水脈' },
  { id: 'NTP-16', name: '汐止特區・雲端運算', x: 390, z: -30, w: 105, h: 90, col: '#818cf8', desc: '東方科學園區 ✕ 汐科站 ✕ 基隆河廊' },
  { id: 'NTP-17', name: '深坑特區・豆腐光廊', x: 250, z: 210, w: 80, h: 80, col: '#4ade80', desc: '深坑老街 ✕ 景美溪上游 ✕ 炮子崙' },
  { id: 'NTP-18', name: '石碇特區・高嶺中繼', x: 330, z: 260, w: 85, h: 85, col: '#a78bfa', desc: '千島湖 ✕ 皇帝殿岩稜 ✕ 北宜科技中繼' },
  { id: 'NTP-19', name: '坪林特區・包種光學', x: 370, z: 330, w: 90, h: 90, col: '#34d399', desc: '茶業生技博物館 ✕ 北勢溪水源 ✕ 雪山前哨' },
  { id: 'NTP-20', name: '烏來特區・地熱生態', x: 110, z: 380, w: 120, h: 100, col: '#2dd4bf', desc: '烏來瀑布 ✕ 地熱溫泉中樞 ✕ 泰雅高山生態' },
  { id: 'NTP-21', name: '林口特區・台地星雲', x: -380, z: -180, w: 110, h: 95, col: '#facc15', desc: '影視影城光谷 ✕ 三井聚落 ✕ 霧都台地' },
  { id: 'NTP-22', name: '瑞芳特區・黃金礦嶺', x: 480, z: -60, w: 95, h: 90, col: '#fbbf24', desc: '九份全息山城 ✕ 金瓜石 ✕ 猴硐貓村' },
  { id: 'NTP-23', name: '平溪特區・天燈光子', x: 430, z: 160, w: 85, h: 85, col: '#f472b6', desc: '十分瀑布 ✕ 平溪鐵道 ✕ 全息光子天燈' },
  { id: 'NTP-24', name: '雙溪特區・清流綠境', x: 490, z: 220, w: 85, h: 85, col: '#22c55e', desc: '雙溪低碳示範特區 ✕ 虎豹潭 ✕ 牡丹古道' },
  { id: 'NTP-25', name: '貢寮特區・極東海洋', x: 560, z: 210, w: 90, h: 90, col: '#38bdf8', desc: '三貂角燈塔 ✕ 福隆海水浴場 ✕ 洋流發電基地' },
  { id: 'NTP-26', name: '金山特區・北海巨浪', x: -150, z: -420, w: 95, h: 85, col: '#0284c7', desc: '金山老街 ✕ 燭臺雙嶼 ✕ 溫泉海岸' },
  { id: 'NTP-27', name: '萬里特區・野柳光岩', x: 70, z: -420, w: 95, h: 85, col: '#00f0ff', desc: '女王頭地質 ✕ 翡翠灣星港 ✕ 北海岸公路' },
  { id: 'NTP-28', name: '石門特區・極北風能', x: -220, z: -450, w: 90, h: 80, col: '#38bdf8', desc: '富貴角燈塔 ✕ 石門風力發電陣列 ✕ 老梅石槽' },
  { id: 'NTP-29', name: '三芝特區・櫻色光廊', x: -290, z: -410, w: 90, h: 80, col: '#06b6d4', desc: '淺水灣 ✕ 飛碟屋遺址 ✕ 北海岸藝術水岸' }
];

/* ─── 4. 1:1 還原真實雙北街廓拓撲 ✕ 連鎖品牌門市資料庫 (50% 剪裁法則) ─── */
// 互動地標點位 (留存店家與市場 100% 精確對齊現實路名、門牌號碼與街區相對位置，全圖超過 110+ 處真實點位)
const interactables = [
  {"id": "station_bldg", "x": 0, "z": -70, "w": 64, "d": 32, "r": 8.5, "type": "station", "name": "台北車站大樓", "label": "調查 台北車站大樓"},
  {"id": "bus_station_zx", "x": -20, "z": -5, "w": 20, "d": 8, "r": 8.5, "type": "bus_stop", "name": "台北車站(忠孝)公車專用道站牌", "dest": "zhongshan", "label": "搭乘 307 公車 (前往中山商圈 / 南京東路)"},
  {"id": "clue_flower", "x": 20, "z": 20, "w": 8, "d": 8, "r": 8.0, "type": "clue_ground", "name": "站前花圃神祕紙條", "label": "翻查站前花圃神祕紙條"},
  {"id": "mrt_escalator_m6", "x": 95, "z": 15, "w": 12, "d": 10, "r": 8.0, "type": "mrt_escalator", "name": "捷運出入口 M6", "label": "搭手扶梯進地下月台"},
  {"id": "rest_bench", "x": -45, "z": 30, "w": 10, "d": 6, "r": 8.0, "type": "rest", "name": "站前候車長椅", "label": "在長椅休息恢復體力"},
  {"id": "bus_station_zs", "x": 78, "z": -40, "w": 14, "d": 8, "r": 8.5, "type": "bus_stop", "name": "中山市場公車站牌", "dest": "station", "label": "搭乘 307 公車 (前往台北車站)"},
  {"id": "mrt_escalator_zs", "x": 78, "z": -95, "w": 12, "d": 10, "r": 8.0, "type": "mrt_escalator", "name": "捷運中山站出入口", "label": "搭手扶梯進地下月台"},
  {"id": "bus_station_xf", "x": -150, "z": 168, "w": 14, "d": 8, "r": 8.5, "type": "bus_stop", "name": "板橋學府路一段公車站牌", "dest": "station", "label": "搭乘 307 公車 (經板橋至台北車站)"},
  {"id": "bus_station_xm", "x": -152, "z": 25, "w": 14, "d": 8, "r": 8.5, "type": "bus_stop", "name": "捷運西門站公車站牌", "dest": "station", "label": "搭乘 307 公車 (前往台北車站 / 南京東路)"},
  {"id": "bus_station_sj", "x": 155, "z": -97, "w": 14, "d": 8, "r": 8.5, "type": "bus_stop", "name": "捷運松江南京站公車站牌", "dest": "banqiao", "label": "搭乘 307 公車 (前往台北車站 / 板橋府中)"},
  {"id": "rest_bench_xf", "x": -130, "z": 132, "w": 10, "d": 6, "r": 8.0, "type": "rest", "name": "板橋學府路候車休憩椅", "label": "在長椅休息恢復體力"},
  {"id": "mrt_escalator_fz", "x": -145, "z": 210, "w": 13, "d": 10, "r": 8.0, "type": "mrt_escalator", "name": "板橋府中捷運出入口", "label": "搭手扶梯進地下月台"},
  {"id": "police_cctv", "x": 195, "z": 135, "w": 18, "d": 14, "r": 8.5, "type": "police", "name": "北投分局刑事偵查隊", "label": "與林巡官調閱 CCTV 監控軌跡"},
  {"id": "ferry_tamsui", "x": -210, "z": -95, "w": 18, "d": 14, "r": 8.5, "type": "ferry", "name": "淡水河渡輪觀景棧道", "label": "欣賞淡水河風景"},
  {"id": "fmart_zx", "x": -65, "z": -20, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (站前忠孝店)", "address": "中正區忠孝西路一段 36 號", "label": "進入全家 (站前忠孝店)"},
  {"id": "seven_gq", "x": -20, "z": 65, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (站前館前店)", "address": "中正區館前路 59 號", "label": "進入 7-Eleven (站前館前店)"},
  {"id": "coco_ny", "x": 20, "z": 65, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (台北站前店)", "address": "中正區南陽街 13 號", "label": "購買 CoCo 手搖飲 (站前店)"},
  {"id": "seven_gy", "x": 60, "z": 35, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (站前公園店)", "address": "中正區公園路 20 號", "label": "進入 7-Eleven (站前公園店)"},
  {"id": "wanjiafu_kf", "x": 20, "z": 110, "w": 24, "d": 20, "r": 9.5, "type": "wanjiafu", "name": "樂家康 (站前開封店)", "address": "中正區開封街一段 38 號", "label": "進入樂家康 (站前開封店)"},
  {"id": "coco_cq", "x": -95, "z": 15, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (重慶書店街店)", "address": "中正區重慶南路一段 55 號", "label": "購買 CoCo 手搖飲 (重慶店)"},
  {"id": "market_cz", "x": -95, "z": 55, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "城中市場老市集", "address": "中正區武昌街一段 22 巷 (省城隍廟口)", "label": "進入 城中市場老市集 (老台北在地情報與小吃)"},
  {"id": "seven_hy", "x": -95, "z": 95, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (中正衡陽店)", "address": "中正區衡陽路 51 號", "label": "進入 7-Eleven (中正衡陽店)"},
  {"id": "fmart_hn", "x": -55, "z": 80, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (懷寧襄陽店)", "address": "中正區襄陽路 9 號", "label": "進入全家 (懷寧襄陽店)"},
  {"id": "seven_xm_zh", "x": -145, "z": 10, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (西門中華店)", "address": "萬華區中華路一段 144 號", "label": "進入 7-Eleven (西門中華店)"},
  {"id": "fmart_wc", "x": -205, "z": 15, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (西門武昌店)", "address": "萬華區武昌街二段 37 號", "label": "進入全家 (西門武昌店)"},
  {"id": "coco_xm", "x": -175, "z": 40, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (西門町店)", "address": "萬華區武昌街二段 4 號", "label": "購買 CoCo 手搖飲 (西門町店)"},
  {"id": "market_xm", "x": -135, "z": 52, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "西門市場 ✕ 紅樓文創市集", "address": "萬華區成都路 10 號", "label": "進入 西門市場/紅樓文創市集 (潮流古著與點心)"},
  {"id": "wanjiafu_cs", "x": -185, "z": 80, "w": 24, "d": 20, "r": 9.5, "type": "wanjiafu", "name": "樂家康 (萬華長沙店)", "address": "萬華區長沙街二段 110 號", "label": "進入樂家康 (萬華長沙店)"},
  {"id": "wanjiafu_gl_flagship", "x": -140, "z": 95, "w": 32, "d": 24, "r": 11.0, "type": "wanjiafu", "name": "萬家福 桂林旗艦店 (24H量販店)", "address": "萬華區桂林路 1 號", "isFlagship": true, "label": "進入萬家福桂林旗艦店 (24H量販店)"},
  {"id": "fmart_circle", "x": -95, "z": -45, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (建成圓環店)", "address": "大同區重慶北路二段 12 號", "label": "進入全家 (建成圓環店)"},
  {"id": "market_nx", "x": -55, "z": -95, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "建成圓環 ✕ 寧夏觀光夜市", "address": "大同區寧夏路民生西路口", "label": "進入 寧夏觀光夜市 (鹽酥雞 / 潤餅 / 章魚燒)"},
  {"id": "seven_circle", "x": -55, "z": -145, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (寧夏夜市店)", "address": "大同區民生西路 188 號", "label": "進入 7-Eleven (寧夏夜市店)"},
  {"id": "wanjiafu_cq_flagship", "x": -100, "z": -115, "w": 32, "d": 24, "r": 11.0, "type": "wanjiafu", "name": "萬家福 重慶旗艦店 (雙層大賣場)", "address": "大同區重慶北路二段 171 號", "isFlagship": true, "label": "進入萬家福重慶旗艦店 (大賣場)"},
  {"id": "wanjiafu_cq_store", "x": -95, "z": -175, "w": 24, "d": 20, "r": 9.5, "type": "wanjiafu", "name": "樂家康 (重慶北店)", "address": "大同區重慶北路三段 154 號", "label": "進入樂家康 (重慶北店)"},
  {"id": "coco_yp", "x": -145, "z": -45, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (延平北路店)", "address": "大同區延平北路二段 80 號", "label": "購買 CoCo 手搖飲 (延平店)"},
  {"id": "wanjiafu_dh", "x": -145, "z": -115, "w": 24, "d": 20, "r": 9.5, "type": "wanjiafu", "name": "樂家康 (大稻埕民生店)", "address": "大同區民生西路 230 號", "label": "進入樂家康 (大稻埕民生店)"},
  {"id": "market_yl", "x": -185, "z": -60, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "大稻埕永樂市場", "address": "大同區迪化街一段 21 號", "label": "進入 大稻埕永樂市場 (百年布行與油飯旗魚羹)"},
  {"id": "seven_dh", "x": -185, "z": -125, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (大稻埕迪化店)", "address": "大同區迪化街一段 54 號", "label": "進入 7-Eleven (大稻埕迪化店)"},
  {"id": "market_lz", "x": -145, "z": -185, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "大同蘭州傳統市場", "address": "大同區昌吉街 55 號", "label": "進入 大同蘭州傳統市場 (黑點雞肉 / 生鮮果菜市集)"},
  {"id": "market_zs", "x": 35, "z": -45, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "中山傳統市場", "address": "中山區長安西路 3 號 (中山北路口)", "label": "進入 中山傳統市場 (品嚐古早味切仔麵 / 潤餅)"},
  {"id": "fmart_zs", "x": 125, "z": -20, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (中山北路店)", "address": "中山區中山北路一段 105 號", "label": "進入全家 (中山北路店)"},
  {"id": "seven_ls", "x": 125, "z": -60, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (林森條通店)", "address": "中山區林森北路 119 號", "label": "進入 7-Eleven (林森條通店)"},
  {"id": "wanjiafu_nj", "x": 35, "z": -95, "w": 24, "d": 20, "r": 9.5, "type": "wanjiafu", "name": "樂家康 (中山南京店)", "address": "中山區南京西路 36 號", "label": "進入樂家康 (中山南京店)"},
  {"id": "coco_zs", "x": 115, "z": -105, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (中山北路門市)", "address": "中山區中山北路一段 92 號", "label": "購買 CoCo 手搖飲 (中山門市)"},
  {"id": "market_sl", "x": 45, "z": -145, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "雙連傳統市場", "address": "大同區民生西路 198 號 (文昌宮旁)", "label": "進入 雙連傳統市場 (品嚐文昌宮古早味美食)"},
  {"id": "fmart_sl", "x": 105, "z": -150, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (中山雙連店)", "address": "中山區民生西路 66 號", "label": "進入全家 (中山雙連店)"},
  {"id": "market_qg", "x": 85, "z": -195, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "晴光傳統商圈市場", "address": "中山區雙城街 12 巷 (晴光商圈)", "label": "進入 晴光商圈市場 (晴光紅豆餅 / 脆皮鮮奶甜甜圈)"},
  {"id": "seven_mq", "x": 35, "z": -195, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (中山民權店)", "address": "中山區中山北路二段 92 號", "label": "進入 7-Eleven (中山民權店)"},
  {"id": "wanjiafu_jl", "x": 165, "z": -55, "w": 24, "d": 20, "r": 9.5, "type": "wanjiafu", "name": "樂家康 (中山吉林店)", "address": "中山區吉林路 108 號", "label": "進入樂家康 (中山吉林店)"},
  {"id": "fmart_sj", "x": 165, "z": -105, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (松江南京店)", "address": "中山區松江路 102 號", "label": "進入全家 (松江南京店)"},
  {"id": "coco_sj", "x": 165, "z": -155, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (松江南京店)", "address": "中山區松江路 120 號", "label": "購買 CoCo 手搖飲 (松江店)"},
  {"id": "seven_fx", "x": 205, "z": -55, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (復興長安店)", "address": "中山區復興北路 88 號", "label": "進入 7-Eleven (復興長安店)"},
  {"id": "wanjiafu_sj", "x": 205, "z": -115, "w": 24, "d": 20, "r": 9.5, "type": "wanjiafu", "name": "樂家康 (中山松江店)", "address": "中山區松江路 168 號", "label": "進入樂家康 (中山松江店)"},
  {"id": "fmart_fx", "x": 205, "z": -175, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (復興南京店)", "address": "中山區復興北路 45 號", "label": "進入全家 (復興南京店)"},
  {"id": "seven_ms", "x": 80, "z": 75, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (中正紀念堂店)", "address": "中正區中山南路 21 號", "label": "進入 7-Eleven (中正紀念堂店)"},
  {"id": "wanjiafu_gt", "x": 55, "z": 135, "w": 24, "d": 20, "r": 9.5, "type": "wanjiafu", "name": "樂家康 (古亭和平店)", "address": "中正區和平西路一段 28 號", "label": "進入樂家康 (古亭和平店)"},
  {"id": "seven_rf", "x": 55, "z": 185, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (羅斯福師大店)", "address": "中正區羅斯福路二段 88 號", "label": "進入 7-Eleven (羅斯福師大店)"},
  {"id": "wanjiafu_sd", "x": 105, "z": 135, "w": 24, "d": 20, "r": 9.5, "type": "wanjiafu", "name": "樂家康 (師大龍泉店)", "address": "大安區師大路 39 號", "label": "進入樂家康 (師大店)"},
  {"id": "market_sd", "x": 105, "z": 185, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "師大夜市 ✕ 龍泉傳統市場", "address": "大安區師大路 49 巷", "label": "進入 師大夜市/龍泉市場 (生煎包 / 鹽水雞 / 滷味)"},
  {"id": "fmart_da", "x": 155, "z": 65, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (大安信義店)", "address": "大安區信義路三段 102 號", "label": "進入全家 (大安信義店)"},
  {"id": "coco_da", "x": 155, "z": 125, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (大安復興店)", "address": "大安區復興南路一段 150 號", "label": "購買 CoCo 手搖飲 (大安店)"},
  {"id": "seven_dh_south", "x": 155, "z": 185, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (敦南科技店)", "address": "大安區敦化南路二段 77 號", "label": "進入 7-Eleven (敦南科技店)"},
  {"id": "seven_xm_bd", "x": -185, "z": 130, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (府中縣民店)", "address": "板橋區縣民大道一段 88 號", "label": "進入 7-Eleven (府中縣民店)"},
  {"id": "fmart_xm_bq", "x": -65, "z": 125, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (板橋縣民店)", "address": "板橋區縣民大道一段 110 號", "label": "進入全家 (板橋縣民店)"},
  {"id": "market_ny", "x": -205, "z": 168, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "板橋湳雅觀光夜市", "address": "板橋區南雅東路 87 號", "label": "進入 板橋湳雅觀光夜市 (麻油雞 / 旗魚黑輪 / 烤肉串)"},
  {"id": "seven_xf", "x": -95, "z": 168, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (學城門市)", "address": "新北海山生活圈 學府路一段 118 號", "label": "進入 7-Eleven (學城門市)"},
  {"id": "coco_xf", "x": -40, "z": 168, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (板橋重慶店)", "address": "板橋生活圈 重慶路 179 號", "label": "購買 CoCo 手搖飲 (重慶店)"},
  {"id": "wanjiafu_xf", "x": 15, "z": 168, "w": 24, "d": 20, "r": 9.5, "type": "wanjiafu", "name": "樂家康 (土城廣明店)", "address": "新北海山生活圈 廣明街 63 號", "label": "進入樂家康 (廣明店)"},
  {"id": "market_hs", "x": -185, "z": 210, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "板橋黃石傳統市場", "address": "板橋區宮口街 37 號 (府中商圈)", "label": "進入 板橋黃石市場 (傳承老店高記生炒魷魚 / 蘿蔔糕)"},
  {"id": "fmart_fz", "x": -100, "z": 210, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (板橋府中店)", "address": "板橋區府中路 35 號", "label": "進入全家 (板橋府中店)"},
  {"id": "wanjiafu_wh", "x": -50, "z": 210, "w": 24, "d": 20, "r": 9.5, "type": "wanjiafu", "name": "樂家康 (板橋文化店)", "address": "板橋區文化路一段 145 號", "label": "進入樂家康 (板橋文化店)"},
  {"id": "seven_wh", "x": -5, "z": 210, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (板橋文化店)", "address": "板橋區文化路一段 136 號", "label": "進入 7-Eleven (板橋文化店)"},
  {"id": "seven_ag", "x": 55, "z": 110, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (中正愛國店)", "address": "中正區愛國西路 9 號", "label": "進入 7-Eleven (中正愛國店)"},
  {"id": "fmart_cd", "x": -185, "z": 45, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (西門成都店)", "address": "萬華區成都路 23 號", "label": "進入全家 (西門成都店)"},
  {"id": "coco_fz", "x": -140, "z": 210, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (板橋府中店)", "address": "板橋區中山路一段 50 號", "label": "購買 CoCo 手搖飲 (府中店)"},
  {"id": "wanjiafu_xp", "x": -185, "z": 168, "w": 24, "d": 20, "r": 9.5, "type": "wanjiafu", "name": "樂家康 (板橋新埔店)", "address": "板橋區文化路一段 360 號", "label": "進入樂家康 (板橋新埔店)"},
  {"id": "seven_dh_2", "x": -185, "z": -80, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (大稻埕迪化二店)", "address": "大同區迪化街一段 82 號", "label": "進入 7-Eleven (迪化二店)"},
  {"id": "fmart_sd_lq", "x": 105, "z": 155, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (師大龍泉店)", "address": "大安區師大路 59 號", "label": "進入全家 (師大龍泉店)"},
  {"id": "wanjiafu_cq_north", "x": -85, "z": -145, "w": 24, "d": 20, "r": 9.5, "type": "wanjiafu", "name": "樂家康 (大同重慶北店)", "address": "大同區重慶北路三段 88 號", "label": "進入樂家康 (重慶北店)"},
  {"id": "landmark_jf_gate", "x": 60, "z": 108, "w": 18, "d": 18, "r": 9.0, "type": "landmark", "name": "國定古蹟 景福門 (東門圓環)", "address": "中正區中山南路 ✕ 凱達格蘭大道口", "label": "瞻仰 景福門古蹟 (台北府城東門)"},
  {"id": "landmark_museum", "x": -67.5, "z": 66, "w": 24, "d": 16, "r": 9.0, "type": "landmark", "name": "國立臺灣博物館", "address": "中正區襄陽路 2 號 (二二八公園北側)", "label": "參觀 國立臺灣博物館 (希臘多立克式宮殿與百年銅頂)"},
  {"id": "landmark_lin_garden", "x": -195, "z": 210, "w": 24, "d": 20, "r": 9.0, "type": "landmark", "name": "國定古蹟 林本源園邸 (林家花園)", "address": "板橋區西門街 9 號 (府中生活圈)", "label": "漫遊 林家花園 (百年江南庭園與來青閣)"}
];

// ──────────────────────────────────────────
// 4.1 全雙北 41 行政特區 1:1 真實門市與公園綠地同步注入 (SSOT Integration)
// 【落實委託人指示：整個雙北都要一樣，這個地方有什麼就要有什麼，有公園也要有公園】
// ──────────────────────────────────────────
if (typeof REAL_WORLD_STORES !== 'undefined') {
  REAL_WORLD_STORES.forEach(s => {
    // 檢查是否已存在，並嚴守間距避免重疊
    const exists = interactables.some(it => it.id === s.id || (Math.hypot(it.x - s.x, it.z - s.z) < 8));
    if (!exists && s.x !== undefined && s.z !== undefined) {
      const isFlagship = s.brand === 'wanjiafu' && (s.name.includes('旗艦') || s.name.includes('量販'));
      interactables.push({
        id: s.id,
        x: s.x,
        z: s.z,
        w: isFlagship ? 34 : 24,
        d: isFlagship ? 24 : 20,
        r: isFlagship ? 11.0 : 8.5,
        type: s.brand,
        name: s.name,
        address: s.addr || '',
        isFlagship: isFlagship,
        label: `進入 ${s.name} (${s.category || '補給站'})`
      });
    }
  });
}

if (typeof SHUANGBEI_REAL_PARKS !== 'undefined') {
  SHUANGBEI_REAL_PARKS.forEach(pk => {
    const exists = interactables.some(it => it.id === pk.id || (Math.hypot(it.x - pk.x, it.z - pk.z) < 12));
    if (!exists && pk.x !== undefined && pk.z !== undefined) {
      interactables.push({
        id: pk.id,
        x: pk.x,
        z: pk.z,
        w: pk.w || 35,
        d: pk.d || 35,
        r: 10.0,
        type: 'park',
        name: pk.name,
        category: pk.category,
        features: pk.features,
        sectorId: pk.sectorId,
        label: `漫步 ${pk.name} (${pk.category})`
      });
    }
  });
}

// ─── 雙北真實路網幹線公車系統 (Real Route Bus Waypoint Network) ───
// 307 幹線公車真實路線 (板橋府中 ✕ 學府生活圈 ✕ 萬華西門町 ✕ 台北車站專用道 ✕ 中山市場 ✕ 松江南京 ✕ 南京復興)
const bus307Route = [
  // 1. 板橋府中商圈 (文化路一段 / 府中路)
  { x: -175, z: 195, stopName: '板橋府中站 (文化路一段)', street: '板橋・文化路一段 ✕ 府中商圈' },
  { x: -150, z: 195, street: '板橋・文化路一段' },
  // 2. 板橋學府路一段 (海山生活圈)
  { x: -150, z: 168, stopName: '學府路一段站 (海山生活圈)', street: '板橋・學府路一段 1:1商圈' },
  // 3. 新板特區縣民大道一段
  { x: -150, z: 130, stopName: '新板特區站 (縣民大道)', street: '板橋・縣民大道一段' },
  // 3.5 華翠大橋跨新店溪 (跨市大橋高架段)
  { x: -152, z: 108, street: '新店溪・華翠大橋 (跨新店溪 往萬華)' },
  // 4. 經華翠進入萬華中華路一段 (西門町商圈)
  { x: -152, z: 75,  street: '萬華・中華路一段林蔭道' },
  { x: -152, z: 25,  stopName: '捷運西門站 (中華路一段)', street: '萬華・西門町中華路' },
  // 5. 中華路左轉忠孝西路
  { x: -152, z: -2,  street: '萬華・中華路 ✕ 忠孝西路口' },
  // 6. 忠孝西路中央公車專用道 (東行)
  { x: -92,  z: -2,  street: '中正・忠孝西路 (重慶南路口)' },
  { x: -20,  z: -2,  stopName: '台北車站(忠孝)公車專用道', street: '中正・忠孝西路中央專用道' },
  { x: 35,   z: -2,  street: '中正・忠孝西路 (公園路口)' },
  // 7. 忠孝西路左轉中山北路 (行政院)
  { x: 72,   z: -2,  street: '中山・中山北路口 (行政院前)' },
  // 8. 中山北路一段林蔭大道 (北行)
  { x: 72,   z: -45, stopName: '中山市場站 (中山北路一段)', street: '中山・中山北路林蔭大道' },
  // 9. 中山北路右轉南京東路 (捷運中山站)
  { x: 72,   z: -97, stopName: '捷運中山站 (南京西路口)', street: '中山・南京西路商圈' },
  // 10. 南京東路金融商圈 (東行)
  { x: 120,  z: -97, street: '中山・南京東路一段 (林森商圈)' },
  { x: 155,  z: -97, stopName: '捷運松江南京站 (南京東路二段)', street: '中山・南京東路 ✕ 松江路' },
  { x: 185,  z: -97, stopName: '捷運南京復興站 (折返點)', street: '中山・南京東路三段 ✕ 復興北路' },

  // ─── 返程 (西向與南向車道，靠右行駛) ───
  // 11. 南京東路西行
  { x: 185, z: -92, street: '中山・南京東路三段 (返程西行)' },
  { x: 155, z: -92, stopName: '捷運松江南京站 (西行)', street: '中山・南京東路二段' },
  { x: 120, z: -92, street: '中山・南京東路一段' },
  // 12. 南京西路左轉中山北路 (南行)
  { x: 84,  z: -92, stopName: '捷運中山站 (南行)', street: '中山・中山北路一段' },
  { x: 84,  z: -45, stopName: '中山市場站 (南行)', street: '中山・中山北路林蔭大道' },
  // 13. 中山北路右轉忠孝西路
  { x: 84,  z: 2,   street: '中正・中山北路 ✕ 忠孝西路口' },
  // 14. 忠孝西路公車專用道西行
  { x: 35,   z: 2,   street: '中正・忠孝西路 (公園路口)' },
  { x: -20,  z: 2,   stopName: '台北車站(忠孝)公車專用道 (西行)', street: '中正・忠孝西路中央專用道' },
  { x: -92,  z: 2,   street: '中正・忠孝西路 (重慶南路口)' },
  // 15. 忠孝西路左轉中華路一段 (南行)
  { x: -142, z: 2,   street: '萬華・中華路 ✕ 忠孝西路口' },
  { x: -142, z: 25,  stopName: '捷運西門站 (南行)', street: '萬華・中華路一段' },
  { x: -142, z: 75,  street: '萬華・中華路一段 (西門町商圈)' },
  // 15.5 華翠大橋跨新店溪 (跨市大橋南行段)
  { x: -142, z: 108, street: '新店溪・華翠大橋 (跨新店溪 往板橋)' },
  // 16. 經華翠進入新板特區
  { x: -142, z: 130, stopName: '新板特區站 (縣民大道南行)', street: '板橋・縣民大道一段' },
  { x: -142, z: 168, stopName: '學府路一段站 (海山生活圈南行)', street: '板橋・學府路一段' },
  { x: -142, z: 195, street: '板橋・文化路一段' }
];

// 中山幹線公車真實路線 (晴光商圈 ✕ 雙連市場 ✕ 中山站 ✕ 台北車站公園路 ✕ 中正紀念堂 ✕ 師大夜市)
const busZhongshanRoute = [
  { x: 72, z: -195, stopName: '晴光商圈站 (雙城街口)', street: '中山・晴光商圈 ✕ 雙城街' },
  { x: 72, z: -140, stopName: '雙連傳統市場站 (民生西路口)', street: '中山・民生西路 ✕ 雙連市場' },
  { x: 72, z: -95,  stopName: '捷運中山站 (南京西路)', street: '中山・中山北路 ✕ 南京西路' },
  { x: 72, z: -45,  stopName: '中山市場站 (長安西路口)', street: '中山・長安西路 ✕ 中山市場' },
  { x: 72, z: 0,    street: '中正・忠孝西路口 (行政院)' },
  { x: 48, z: 25,   stopName: '台北車站 (公園路站)', street: '中正・公園路 ✕ 捷運 M8 出口' },
  { x: 48, z: 75,   stopName: '中正紀念堂 (中山南路)', street: '中正・中山南路 ✕ 紀念堂' },
  { x: 78, z: 135,  stopName: '古亭和平站 (和平西路口)', street: '中正・和平西路一段' },
  { x: 78, z: 185,  stopName: '師大夜市/龍泉站 (師大路口)', street: '大安・師大夜市 ✕ 龍泉市場' },
  // 返程 (北行)
  { x: 84, z: 185,  street: '大安・師大路 (北行)' },
  { x: 84, z: 135,  stopName: '古亭和平站 (北行)', street: '中正・和平西路一段' },
  { x: 54, z: 75,   stopName: '中正紀念堂 (北行)', street: '中正・中山南路' },
  { x: 54, z: 25,   stopName: '台北車站 (公園路北行)', street: '中正・公園路' },
  { x: 84, z: 0,    street: '中正・忠孝西路口' },
  { x: 84, z: -45,  stopName: '中山市場站 (北行)', street: '中山・中山北路一段' },
  { x: 84, z: -95,  stopName: '捷運中山站 (北行)', street: '中山・中山北路' },
  { x: 84, z: -140, stopName: '雙連市場站 (北行)', street: '中山・民生西路' },
  { x: 84, z: -195, stopName: '晴光商圈站 (北行終點)', street: '中山・雙城街口' }
];

// 99 幹線公車真實路線 (新莊 ⇄ 新埔 ⇄ 新板特區 ⇄ 板橋學府路一段 1:1 商圈 ⇄ 海山)
const bus99Route = [
  { x: -142, z: 195, stopName: '板橋・文化路一段站', street: '板橋・文化路一段' },
  { x: -148, z: 168, stopName: '板橋・學府路一段 (樂家康超市門前)', street: '板橋・學府路一段 (1:1真實商圈)' },
  { x: -142, z: 130, stopName: '新板特區站 (板橋公車站)', street: '板橋・縣民大道一段' },
  { x: -142, z: 108, stopName: '捷運新埔站 (民生路口)', street: '板橋・民生路三段' },
  { x: -160, z: 25,  stopName: '西門町中華路站 (轉乘樞紐)', street: '萬華・中華路一段' },
  // 返程 (南行)
  { x: -136, z: 25,  street: '萬華・中華路 (南行)' },
  { x: -136, z: 108, stopName: '捷運新埔站 (返程)', street: '板橋・民生路三段' },
  { x: -136, z: 130, stopName: '新板特區站 (返程)', street: '板橋・縣民大道一段' },
  { x: -144, z: 168, stopName: '學府路一段 (海山商圈返程)', street: '板橋・學府路一段' },
  { x: -136, z: 195, stopName: '板橋文化路 (終點站)', street: '板橋・文化路一段' }
];

// 299 幹線公車真實路線 (新莊輔大 ⇄ 三重重新路 ⇄ 忠孝西路 ⇄ 台北車站 ⇄ 忠孝復興)
const bus299Route = [
  { x: -142, z: 0,   street: '新莊・重新路走廊' },
  { x: -92,  z: 0,   street: '中正・忠孝西路二段' },
  { x: -20,  z: -4,  stopName: '台北車站(忠孝)299月台', street: '中正・忠孝西路公車專用道' },
  { x: 35,   z: -4,  street: '中正・忠孝西路一段' },
  { x: 120,  z: 0,   stopName: '捷運忠孝新生站', street: '大安・忠孝東路三段' },
  { x: 180,  z: 0,   stopName: '捷運忠孝復興站 (折返)', street: '大安・忠孝東路四段' },
  // 返程 (西行)
  { x: 180,  z: 4,   street: '大安・忠孝東路四段 (西行)' },
  { x: 120,  z: 4,   stopName: '捷運忠孝新生站 (西行)', street: '大安・忠孝東路三段' },
  { x: 35,   z: 4,   street: '中正・忠孝西路' },
  { x: -20,  z: 4,   stopName: '台北車站(忠孝西行月台)', street: '中正・忠孝西路專用道' },
  { x: -92,  z: 4,   street: '中正・忠孝西路 (往新莊)' },
  { x: -142, z: 4,   stopName: '西門町重慶路口 (西行)', street: '萬華・忠孝西路二段' }
];

// 656 幹線公車真實路線 (德霖科大 ⇄ 海山商圈 ⇄ 板橋學府路一段 1:1 商圈 ⇄ 府中 ⇄ 萬華西門 ⇄ 台北車站 ⇄ 臺大醫院)
const bus656Route = [
  // 1. 土城德霖科大端點總站
  { x: -160, z: 235, stopName: '德霖科技大學總站', street: '土城・青雲路 ✕ 德霖科大' },
  { x: -155, z: 215, stopName: '清水國小站', street: '土城・清水路' },
  // 2. 土城海山商圈
  { x: -150, z: 195, stopName: '捷運海山站 (裕民路)', street: '土城・裕民路 ✕ 學府路口' },
  // 3. 板橋學府路一段 (海山生活圈 1:1 核心商圈，樂家康超市門前)
  { x: -150, z: 168, stopName: '板橋學府路一段 (樂家康超市門前)', street: '板橋・學府路一段 (1:1商圈核心)' },
  // 4. 新板特區縣民大道
  { x: -150, z: 130, stopName: '新板特區站 (板橋公車站)', street: '板橋・縣民大道一段' },
  // 5. 跨新店溪華翠大橋
  { x: -152, z: 108, street: '新店溪・華翠大橋 (跨市高架段)' },
  // 6. 萬華西門町
  { x: -152, z: 75,  street: '萬華・中華路一段林蔭道' },
  { x: -152, z: 25,  stopName: '捷運西門站 (中華路)', street: '萬華・西門町中華路' },
  // 7. 忠孝西路中央公車專用道
  { x: -20,  z: -2,  stopName: '台北車站(忠孝專用道)', street: '中正・忠孝西路中央專用道' },
  { x: 35,   z: -2,  street: '中正・忠孝西路 (公園路口)' },
  // 8. 臺大醫院端點站
  { x: 48,   z: 35,  stopName: '捷運臺大醫院站 (常德街口)', street: '中正・公園路 ✕ 常德街' },

  // ─── 656 返程 (南向與西向車道，靠右行駛接續巡航) ───
  { x: 54,   z: 35,  stopName: '捷運臺大醫院站 (返程發車)', street: '中正・公園路' },
  { x: 35,   z: 2,   street: '中正・忠孝西路 (返程)' },
  { x: -20,  z: 2,   stopName: '台北車站(忠孝專用道西行)', street: '中正・忠孝西路' },
  { x: -142, z: 25,  stopName: '捷運西門站 (南行)', street: '萬華・中華路一段' },
  { x: -142, z: 108, street: '新店溪・華翠大橋 (南行往板橋)' },
  { x: -142, z: 130, stopName: '新板特區站 (返程)', street: '板橋・縣民大道' },
  { x: -142, z: 168, stopName: '板橋學府路一段 (海山商圈返程)', street: '板橋・學府路一段' },
  { x: -145, z: 195, stopName: '捷運海山站 (返程)', street: '土城・裕民路' },
  { x: -152, z: 215, street: '土城・清水路' },
  { x: -158, z: 235, stopName: '德霖科技大學 (終點調度整備)', street: '土城・德霖科大' }
];

// 基隆客運 9006 國道客運 (基隆火車站 ⇄ 國道一號 ⇄ 捷運圓山站 ⇄ 台北車站 ⇄ 西門町)
const bus9006Route = [
  { x: 185, z: -220, stopName: '基隆火車站 (港西街國道總站)', street: '基隆・港西街總站' },
  { x: 155, z: -175, street: '國道一號・大業隧道走廊' },
  { x: 110, z: -140, street: '國道一號・圓山交流道' },
  { x: 72,  z: -140, stopName: '圓山轉運站 (捷運圓山站)', street: '大同・庫倫街 ✕ 捷運圓山' },
  { x: 72,  z: -95,  stopName: '捷運民權西路站', street: '大同・承德路 ✕ 民權西路' },
  { x: 72,  z: -45,  stopName: '中山市場 (長安西路)', street: '中山・中山北路一段' },
  { x: 0,   z: -25,  stopName: '台北車站 (承德/鄭州路口)', street: '中正・鄭州路 ✕ 台北車站' },
  { x: -152, z: 25,  stopName: '捷運西門站 (西門端點)', street: '萬華・中華路一段' },

  // 返程 (往基隆)
  { x: -142, z: 25,  street: '萬華・中華路一段 (北行)' },
  { x: 15,   z: -25, stopName: '台北車站 (鄭州路北側)', street: '中正・鄭州路' },
  { x: 84,   z: -45, street: '中山・中山北路一段' },
  { x: 84,   z: -95, stopName: '捷運民權西路 (返程)', street: '大同・承德路' },
  { x: 84,   z: -140, stopName: '圓山轉運站 (往基隆發車)', street: '大同・捷運圓山站' },
  { x: 120,  z: -140, street: '國道一號・圓山交流道東行' },
  { x: 165,  z: -175, street: '國道一號・基隆路段' },
  { x: 185,  z: -220, stopName: '基隆火車站 (回場整備)', street: '基隆・港西街' }
];

// 雙北真實路網巡航車隊 (多車次連續循環發車，次班接續推進)
const cityBuses = [
  // 656 車隊 (大都會客運・海山學府路首選)
  {
    id: 'bus_656_a',
    lineName: '656 幹線 (大都會)',
    ledText: '656 ➔ 臺大醫院',
    themeColor: '#ea580c', // 大都會活力亮橘
    w: 18,
    d: 5.2,
    speed: 0.28,
    waypoints: bus656Route,
    currentWaypointIndex: 0,
    x: bus656Route[0].x,
    z: bus656Route[0].z,
    angle: 0,
    isStopped: false,
    stopTimer: 0,
    currentStreet: bus656Route[0].street,
    nextStopName: bus656Route[3].stopName
  },
  {
    id: 'bus_656_b',
    lineName: '656 幹線 (大都會次班)',
    ledText: '656 ➔ 板橋學府路 ➔ 臺大醫院',
    themeColor: '#f97316',
    w: 18,
    d: 5.2,
    speed: 0.28,
    waypoints: bus656Route,
    currentWaypointIndex: 3, // 錯開班距，已在板橋學府路一段前進
    x: bus656Route[3].x,
    z: bus656Route[3].z,
    angle: 0,
    isStopped: false,
    stopTimer: 0,
    currentStreet: bus656Route[3].street,
    nextStopName: bus656Route[6].stopName
  },
  {
    id: 'bus_656_c',
    lineName: '656 幹線 (返程班次)',
    ledText: '656 ➔ 捷運海山站 ➔ 德霖科大',
    themeColor: '#ea580c',
    w: 18,
    d: 5.2,
    speed: 0.28,
    waypoints: bus656Route,
    currentWaypointIndex: 11, // 返程段
    x: bus656Route[11].x,
    z: bus656Route[11].z,
    angle: Math.PI,
    isStopped: false,
    stopTimer: 0,
    currentStreet: bus656Route[11].street,
    nextStopName: bus656Route[13].stopName
  },

  // 基隆客運 9006 跨市國道客運車隊 (基隆開進雙北核心)
  {
    id: 'bus_9006_a',
    lineName: '9006 基隆客運',
    ledText: '9006 ➔ 基隆直達 ➔ 圓山 ➔ 台北車站',
    themeColor: '#2563eb', // 基隆客運經典深藍
    w: 18.5,
    d: 5.4,
    speed: 0.32,
    waypoints: bus9006Route,
    currentWaypointIndex: 0,
    x: bus9006Route[0].x,
    z: bus9006Route[0].z,
    angle: Math.PI / 2,
    isStopped: false,
    stopTimer: 0,
    currentStreet: bus9006Route[0].street,
    nextStopName: bus9006Route[3].stopName
  },
  {
    id: 'bus_9006_b',
    lineName: '9006 基隆客運 (返程)',
    ledText: '9006 ➔ 國道一號 ➔ 基隆火車站',
    themeColor: '#1d4ed8',
    w: 18.5,
    d: 5.4,
    speed: 0.32,
    waypoints: bus9006Route,
    currentWaypointIndex: 8, // 返程段
    x: bus9006Route[8].x,
    z: bus9006Route[8].z,
    angle: -Math.PI / 2,
    isStopped: false,
    stopTimer: 0,
    currentStreet: bus9006Route[8].street,
    nextStopName: bus9006Route[11].stopName
  },

  // 307 車隊 (雙北公車之王)
  {
    id: 'bus_307_a',
    lineName: '307 幹線',
    ledText: '307 ➔ 南京東路',
    themeColor: '#059669', // 經典首都/台北客運綠
    w: 18,
    d: 5.2,
    speed: 0.28,
    waypoints: bus307Route,
    currentWaypointIndex: 0,
    x: bus307Route[0].x,
    z: bus307Route[0].z,
    angle: 0,
    isStopped: false,
    stopTimer: 0,
    currentStreet: bus307Route[0].street,
    nextStopName: bus307Route[2].stopName
  },
  {
    id: 'bus_307_b',
    lineName: '307 幹線',
    ledText: '307 ➔ 板橋府中',
    themeColor: '#059669',
    w: 18,
    d: 5.2,
    speed: 0.28,
    waypoints: bus307Route,
    currentWaypointIndex: 16,
    x: bus307Route[16].x,
    z: bus307Route[16].z,
    angle: Math.PI,
    isStopped: false,
    stopTimer: 0,
    currentStreet: bus307Route[16].street,
    nextStopName: bus307Route[18].stopName
  },
  {
    id: 'bus_307_c',
    lineName: '307 幹線 (次班接續)',
    ledText: '307 ➔ 台北車站 ➔ 南京復興',
    themeColor: '#10b981',
    w: 18,
    d: 5.2,
    speed: 0.28,
    waypoints: bus307Route,
    currentWaypointIndex: 6,
    x: bus307Route[6].x,
    z: bus307Route[6].z,
    angle: 0,
    isStopped: false,
    stopTimer: 0,
    currentStreet: bus307Route[6].street,
    nextStopName: bus307Route[8].stopName
  },

  // 中山幹線
  {
    id: 'bus_zhongshan',
    lineName: '中山幹線',
    ledText: '中山幹線 ➔ 師大',
    themeColor: '#0284c7', // 綠能低底盤天藍
    w: 18,
    d: 5.2,
    speed: 0.26,
    waypoints: busZhongshanRoute,
    currentWaypointIndex: 0,
    x: busZhongshanRoute[0].x,
    z: busZhongshanRoute[0].z,
    angle: Math.PI / 2,
    isStopped: false,
    stopTimer: 0,
    currentStreet: busZhongshanRoute[0].street,
    nextStopName: busZhongshanRoute[1].stopName
  },

  // 99 幹線 (學府路專線)
  {
    id: 'bus_99',
    lineName: '99 幹線 (學府路專線)',
    ledText: '99 ➔ 板橋學府路一段 ➔ 海山',
    themeColor: '#10b981', // 翡翠翠綠
    w: 18,
    d: 5.2,
    speed: 0.27,
    waypoints: bus99Route,
    currentWaypointIndex: 0,
    x: bus99Route[0].x,
    z: bus99Route[0].z,
    angle: Math.PI / 2,
    isStopped: false,
    stopTimer: 0,
    currentStreet: bus99Route[0].street,
    nextStopName: bus99Route[1].stopName
  },

  // 299 幹線
  {
    id: 'bus_299',
    lineName: '299 幹線',
    ledText: '299 ➔ 台北車站 ➔ 永春',
    themeColor: '#0369a1', // 大都會天藍
    w: 18,
    d: 5.2,
    speed: 0.28,
    waypoints: bus299Route,
    currentWaypointIndex: 0,
    x: bus299Route[0].x,
    z: bus299Route[0].z,
    angle: 0,
    isStopped: false,
    stopTimer: 0,
    currentStreet: bus299Route[0].street,
    nextStopName: bus299Route[2].stopName
  }
];

// 向下相容物件 (供既有模組與全域狀態引用)
const bus307 = cityBuses[0];

// 幹線公車真實路網動態動力學與自動站點導航
// 2.5D 沙盤真實號誌節點 (忠孝館前、中山南京、西門中華、新板特區、土城學府)
const sandpitTrafficLights = [
  { id: 'stl_01', name: '忠孝館前路口', x: -5, z: 10, green: 700, yellow: 120, red: 500, offset: 0 },
  { id: 'stl_02', name: '中山南京路口', x: 80, z: -80, green: 650, yellow: 120, red: 520, offset: 150 },
  { id: 'stl_03', name: '西門中華路口', x: -140, z: 20, green: 700, yellow: 120, red: 500, offset: 350 },
  { id: 'stl_04', name: '新板縣民大道', x: -120, z: 140, green: 750, yellow: 120, red: 550, offset: 200 },
  { id: 'stl_05', name: '土城學府明德', x: -148, z: 165, green: 650, yellow: 120, red: 500, offset: 100 }
];

let sandpitLightFrame = 0;

function getSandpitLightState(tl) {
  const cycle = tl.green + tl.yellow + tl.red;
  const t = (sandpitLightFrame + tl.offset) % cycle;
  if (t < tl.green) return { state: 'GREEN', color: '#22c55e', remaining: Math.ceil((tl.green - t) / 60) };
  if (t < tl.green + tl.yellow) return { state: 'YELLOW', color: '#eab308', remaining: Math.ceil((tl.green + tl.yellow - t) / 60) };
  return { state: 'RED', color: '#ef4444', remaining: Math.ceil((cycle - t) / 60) };
}

// 幹線公車真實路網動態動力學與自動站點導航 (遵守規律交通號誌，紅燈強制停等)
function updateBusPhysics(bus) {
  sandpitLightFrame++;

  if (bus.isStopped) {
    bus.stopTimer--;
    if (bus.stopTimer <= 0) {
      bus.isStopped = false;
    }
    return;
  }

  // 號誌偵測：公車周圍 20 單位內是否有紅燈停等線
  let waitingAtRed = false;
  let activeLight = null;
  for (let i = 0; i < sandpitTrafficLights.length; i++) {
    const tl = sandpitTrafficLights[i];
    const distToLight = Math.hypot(tl.x - bus.x, tl.z - bus.z);
    if (distToLight < 22) {
      const s = getSandpitLightState(tl);
      if (s.state === 'RED' || (s.state === 'YELLOW' && s.remaining <= 1)) {
        waitingAtRed = true;
        activeLight = { tl, s };
        break;
      }
    }
  }

  if (waitingAtRed && activeLight) {
    // ★ 紅燈強制停等：車速歸零，LED 提示
    bus.isWaitingLight = true;
    bus.ledText = `🚦 ${activeLight.tl.name} 紅燈停等中 (${activeLight.s.remaining}s)`;
    return;
  }
  bus.isWaitingLight = false;

  const target = bus.waypoints[bus.currentWaypointIndex];
  const dx = target.x - bus.x;
  const dz = target.z - bus.z;
  const dist = Math.hypot(dx, dz);

  // 目標轉向角與平滑角插值
  const targetAngle = Math.atan2(dz, dx);
  let diff = targetAngle - bus.angle;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  bus.angle += diff * 0.16;

  if (target.street) bus.currentStreet = target.street;

  if (dist <= bus.speed * 1.5) {
    bus.x = target.x;
    bus.z = target.z;
    if (target.stopName && !target.justStopped) {
      bus.isStopped = true;
      bus.stopTimer = 100; // 停站約 1.7 秒載客
      bus.currentStopName = target.stopName;
      target.justStopped = true;
      setTimeout(() => { target.justStopped = false; }, 9000);
    }
    bus.currentWaypointIndex = (bus.currentWaypointIndex + 1) % bus.waypoints.length;
    const nextPt = bus.waypoints[bus.currentWaypointIndex];
    if (nextPt.stopName) {
      bus.nextStopName = nextPt.stopName;
      if (bus.id === 'bus_656_a' || bus.id === 'bus_656_b' || bus.id === 'bus_656_c') {
        bus.ledText = bus.currentWaypointIndex < 11 ? '656 ➔ 臺大醫院' : '656 ➔ 海山 ➔ 德霖科大';
      } else if (bus.id === 'bus_9006_a' || bus.id === 'bus_9006_b') {
        bus.ledText = bus.currentWaypointIndex < 8 ? '9006 ➔ 基隆客運 往台北/圓山' : '9006 ➔ 國道一號 往基隆火車站';
      } else if (bus.id === 'bus_307_a' || bus.id === 'bus_307_b' || bus.id === 'bus_307_c') {
        bus.ledText = bus.currentWaypointIndex < 16 ? '307 ➔ 南京東路' : '307 ➔ 板橋府中';
      } else if (bus.id === 'bus_zhongshan') {
        bus.ledText = bus.currentWaypointIndex < 9 ? '中山幹線 ➔ 師大' : '中山幹線 ➔ 晴光商圈';
      } else if (bus.id === 'bus_99') {
        bus.ledText = bus.currentWaypointIndex < 5 ? '99 ➔ 土城學府路一段' : '99 ➔ 新北新埔 ➔ 新莊';
      } else if (bus.id === 'bus_299') {
        bus.ledText = bus.currentWaypointIndex < 6 ? '299 ➔ 台北車站 ➔ 忠孝復興' : '299 ➔ 三重 ➔ 輔大';
      }
    }
  } else {
    bus.x += Math.cos(bus.angle) * bus.speed;
    bus.z += Math.sin(bus.angle) * bus.speed;
  }
}

// ──────────────────────────────────────────
// 4.6 🚇 台北捷運固定班距動態列車系統 (MRT Scheduled Dynamic Rapid Transit)
// 包含板南線 (BL) 與淡水信義線 (R) 雙向固定時刻發車、進站停靠與流線型列車渲染
// ──────────────────────────────────────────
const mrtBannanTrack = [
  // 板南線 (東行：頂埔/府中 ➔ 台北車站 ➔ 忠孝復興)
  { x: -180, z: 12, stopName: '捷運府中站 (BL05)', line: '板南線' },
  { x: -150, z: 12, stopName: '捷運板橋站 (BL07)', line: '板南線' },
  { x: -100, z: 12, stopName: '捷運新埔站 (BL08)', line: '板南線' },
  { x: -50,  z: 12, stopName: '捷運西門站 (BL11)', line: '板南線' },
  { x: 0,    z: 12, stopName: '捷運台北車站 (BL12)', line: '板南線' },
  { x: 70,   z: 12, stopName: '捷運善導寺站 (BL13)', line: '板南線' },
  { x: 120,  z: 12, stopName: '捷運忠孝新生站 (BL14)', line: '板南線' },
  { x: 185,  z: 12, stopName: '捷運忠孝復興站 (BL15)', line: '板南線' },

  // 板南線 (西行：忠孝復興 ➔ 台北車站 ➔ 府中/頂埔)
  { x: 185,  z: 18, stopName: '捷運忠孝復興站 (返程)', line: '板南線' },
  { x: 120,  z: 18, stopName: '捷運忠孝新生站 (西行)', line: '板南線' },
  { x: 70,   z: 18, stopName: '捷運善導寺站 (西行)', line: '板南線' },
  { x: 0,    z: 18, stopName: '捷運台北車站 (西行月台)', line: '板南線' },
  { x: -50,  z: 18, stopName: '捷運西門站 (西行月台)', line: '板南線' },
  { x: -100, z: 18, stopName: '捷運新埔站 (西行)', line: '板南線' },
  { x: -150, z: 18, stopName: '捷運板橋站 (西行)', line: '板南線' },
  { x: -180, z: 18, stopName: '捷運府中站 (終點整備)', line: '板南線' }
];

const mrtTamsuiTrack = [
  // 淡水信義線 (南行：圓山 ➔ 台北車站 ➔ 中正紀念堂)
  { x: 62, z: -180, stopName: '捷運圓山站 (R14)', line: '淡水信義線' },
  { x: 62, z: -140, stopName: '捷運民權西路站 (R13)', line: '淡水信義線' },
  { x: 62, z: -95,  stopName: '捷運中山站 (R11)', line: '淡水信義線' },
  { x: 62, z: -45,  stopName: '台北車站北段走廊', line: '淡水信義線' },
  { x: 62, z: 15,   stopName: '捷運台北車站 (R10地下月台)', line: '淡水信義線' },
  { x: 62, z: 45,   stopName: '捷運臺大醫院站 (R09)', line: '淡水信義線' },
  { x: 62, z: 95,   stopName: '捷運中正紀念堂站 (R08)', line: '淡水信義線' },

  // 淡水信義線 (北行：中正紀念堂 ➔ 台北車站 ➔ 圓山/淡水)
  { x: 68, z: 95,   stopName: '捷運中正紀念堂 (北行發車)', line: '淡水信義線' },
  { x: 68, z: 45,   stopName: '捷運臺大醫院站 (北行)', line: '淡水信義線' },
  { x: 68, z: 15,   stopName: '捷運台北車站 (北行月台)', line: '淡水信義線' },
  { x: 68, z: -45,  stopName: '中山地下段 (北行)', line: '淡水信義線' },
  { x: 68, z: -95,  stopName: '捷運中山站 (北行)', line: '淡水信義線' },
  { x: 68, z: -140, stopName: '捷運民權西路 (北行)', line: '淡水信義線' },
  { x: 68, z: -180, stopName: '捷運圓山站 (回場整備)', line: '淡水信義線' }
];

// 雙北捷運固定班距動態列車車隊 (Fixed Headway Fleet - 含車次編號與這班收班時間)
const mrtTrains = [
  // 板南線 (BL)
  {
    id: 'mrt_BL_01',
    lineCode: 'BL',
    trainNo: 'BL-101',
    closingTime: '00:52',
    lastTrainTime: '00:52',
    lineName: '板南線 BL-101',
    ledText: '🚇 [車次 BL-101] 板南線 ➔ 南港展覽館｜收班: 00:52',
    themeColor: '#0070bd',
    track: mrtBannanTrack,
    currentWaypointIndex: 0,
    x: mrtBannanTrack[0].x,
    z: mrtBannanTrack[0].z,
    angle: 0,
    speed: 0.58,
    isStopped: false,
    stopTimer: 0,
    w: 32,
    d: 6.2,
    currentStation: mrtBannanTrack[0].stopName
  },
  {
    id: 'mrt_BL_02',
    lineCode: 'BL',
    trainNo: 'BL-103',
    closingTime: '00:52',
    lastTrainTime: '00:52',
    lineName: '板南線 BL-103 (次班接續)',
    ledText: '🚇 [車次 BL-103] 板南線 ➔ 南港展覽館｜收班: 00:52',
    themeColor: '#0284c7',
    track: mrtBannanTrack,
    currentWaypointIndex: 3, // 錯開班距
    x: mrtBannanTrack[3].x,
    z: mrtBannanTrack[3].z,
    angle: 0,
    speed: 0.58,
    isStopped: false,
    stopTimer: 0,
    w: 32,
    d: 6.2,
    currentStation: mrtBannanTrack[3].stopName
  },
  {
    id: 'mrt_BL_03',
    lineCode: 'BL',
    trainNo: 'BL-102',
    closingTime: '00:52',
    lastTrainTime: '00:52',
    lineName: '板南線 BL-102 (返程)',
    ledText: '🚇 [車次 BL-102] 板南線 ➔ 板橋府中 ➔ 頂埔｜收班: 00:52',
    themeColor: '#0070bd',
    track: mrtBannanTrack,
    currentWaypointIndex: 8, // 西行返程
    x: mrtBannanTrack[8].x,
    z: mrtBannanTrack[8].z,
    angle: Math.PI,
    speed: 0.58,
    isStopped: false,
    stopTimer: 0,
    w: 32,
    d: 6.2,
    currentStation: mrtBannanTrack[8].stopName
  },

  // 淡水信義線 (R)
  {
    id: 'mrt_R_01',
    lineCode: 'R',
    trainNo: 'R-201',
    closingTime: '00:48',
    lastTrainTime: '00:48',
    lineName: '淡水信義線 R-201',
    ledText: '🚇 [車次 R-201] 淡水信義線 ➔ 象山｜收班: 00:48',
    themeColor: '#e3002c',
    track: mrtTamsuiTrack,
    currentWaypointIndex: 0,
    x: mrtTamsuiTrack[0].x,
    z: mrtTamsuiTrack[0].z,
    angle: Math.PI / 2,
    speed: 0.60,
    isStopped: false,
    stopTimer: 0,
    w: 32,
    d: 6.2,
    currentStation: mrtTamsuiTrack[0].stopName
  },
  {
    id: 'mrt_R_02',
    lineCode: 'R',
    trainNo: 'R-202',
    closingTime: '00:48',
    lastTrainTime: '00:48',
    lineName: '淡水信義線 R-202 (返程)',
    ledText: '🚇 [車次 R-202] 淡水信義線 ➔ 圓山 ➔ 淡水｜收班: 00:48',
    themeColor: '#ef4444',
    track: mrtTamsuiTrack,
    currentWaypointIndex: 7, // 北行返程
    x: mrtTamsuiTrack[7].x,
    z: mrtTamsuiTrack[7].z,
    angle: -Math.PI / 2,
    speed: 0.60,
    isStopped: false,
    stopTimer: 0,
    w: 32,
    d: 6.2,
    currentStation: mrtTamsuiTrack[7].stopName
  }
];

// 捷運列車真實速度與物理學 (起步平滑加速、依站距巡航極速、進站前平滑減速煞車)
function updateMrtPhysics(train) {
  if (train.isStopped) {
    train.stopTimer--;
    train.currentSpeed = 0;
    if (train.stopTimer <= 0) train.isStopped = false;
    return;
  }

  const prevIdx = (train.currentWaypointIndex - 1 + train.track.length) % train.track.length;
  const prevPt = train.track[prevIdx];
  const target = train.track[train.currentWaypointIndex];

  const segDist = Math.hypot(target.x - prevPt.x, target.z - prevPt.z) || 50;
  const dx = target.x - train.x;
  const dz = target.z - train.z;
  const distRemaining = Math.hypot(dx, dz);
  const traveled = Math.max(0, segDist - distRemaining);

  // 依站距決定極速：長站距 (如圓山到台北車站) 速度大幅提高
  let topSpeed = train.speed || 0.60;
  if (segDist > 70) topSpeed = 0.88;
  else if (segDist > 45) topSpeed = 0.65;
  else topSpeed = 0.48;

  // 3 階段平滑速度曲線
  let curSpeed = topSpeed;
  const accelZone = segDist * 0.28;
  const decelZone = segDist * 0.30;

  if (traveled < accelZone) {
    // 階段 1：起步平滑加速
    curSpeed = Math.max(0.12, topSpeed * (traveled / accelZone));
  } else if (distRemaining < decelZone) {
    // 階段 2：進站前平滑煞車減速
    curSpeed = Math.max(0.10, topSpeed * (distRemaining / decelZone));
  } else {
    // 階段 3：區間最高速巡航
    curSpeed = topSpeed;
  }
  train.currentSpeed = curSpeed;

  const targetAngle = Math.atan2(dz, dx);
  let diff = targetAngle - train.angle;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  train.angle += diff * 0.20;

  if (distRemaining <= curSpeed * 1.5) {
    train.x = target.x;
    train.z = target.z;
    if (target.stopName && !target.justStopped) {
      train.isStopped = true;
      train.stopTimer = 90; // 停站約 1.5 秒模擬月台上下客
      train.currentStation = target.stopName;
      target.justStopped = true;
      setTimeout(() => { target.justStopped = false; }, 8000);
    }
    train.currentWaypointIndex = (train.currentWaypointIndex + 1) % train.track.length;
    const nextPt = train.track[train.currentWaypointIndex];
    if (nextPt.stopName) {
      const speedDisplay = Math.round(curSpeed * 100);
      if (train.lineCode === 'BL') {
        train.ledText = train.currentWaypointIndex < 8 ? `🚇 板南線 ➔ 南港 (${speedDisplay}km/h)` : `🚇 板南線 ➔ 頂埔 (${speedDisplay}km/h)`;
      } else if (train.lineCode === 'R') {
        train.ledText = train.currentWaypointIndex < 7 ? `🚇 淡水信義線 ➔ 象山 (${speedDisplay}km/h)` : `🚇 淡水信義線 ➔ 淡水 (${speedDisplay}km/h)`;
      }
    }
  } else {
    train.x += Math.cos(train.angle) * curSpeed;
    train.z += Math.sin(train.angle) * curSpeed;
  }
}

// 繪製 2.5D 高科技捷運列車 (Rotated MRT Train)
function drawRotatedMrtTrain(train) {
  const scale = camera.currentScale;
  const screenX = (val) => (val - camera.x) * scale;
  const screenZ = (val) => (val - camera.z) * scale;
  const cx = screenX(train.x);
  const cz = screenZ(train.z);
  const trainW = train.w * scale;
  const trainD = train.d * scale;

  ctx.save();
  ctx.translate(cx, cz);
  ctx.rotate(train.angle);

  // 1. 地面投影陰影與發光軌道輪廓
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  drawSafeRoundRect(ctx, -trainW / 2 + 1.5 * scale, -trainD / 2 + 2.0 * scale, trainW, trainD, 2.5 * scale);
  ctx.fill();

  // 軌道感應高光底色
  ctx.fillStyle = train.lineCode === 'BL' ? 'rgba(0,112,189,0.3)' : 'rgba(227,0,44,0.3)';
  ctx.fillRect(-trainW / 2 - 2 * scale, -trainD / 2 - 1 * scale, trainW + 4 * scale, trainD + 2 * scale);

  // 2. 流線型銀白車身主體
  ctx.fillStyle = '#f1f5f9';
  drawSafeRoundRect(ctx, -trainW / 2, -trainD / 2, trainW, trainD, 3.0 * scale);
  ctx.fill();

  // 3. 經典捷運路線彩色腰線 (板南湛藍 / 淡水信義朱紅)
  ctx.fillStyle = train.themeColor || '#0070bd';
  ctx.fillRect(-trainW / 2 + 2 * scale, -trainD / 2 + 1.2 * scale, trainW - 4 * scale, 1.8 * scale);
  ctx.fillRect(-trainW / 2 + 2 * scale, trainD / 2 - 3.0 * scale, trainW - 4 * scale, 1.8 * scale);

  // 4. 車窗與車門條紋 (模擬 6 節編組捷運車門)
  ctx.fillStyle = '#0f172a';
  for (let i = -trainW / 2 + 6 * scale; i < trainW / 2 - 6 * scale; i += 7 * scale) {
    // 側窗
    ctx.fillRect(i, -trainD / 2 + 0.6 * scale, 4.5 * scale, 1.2 * scale);
    ctx.fillRect(i, trainD / 2 - 1.8 * scale, 4.5 * scale, 1.2 * scale);
  }

  // 5. 車頭前擋風玻璃
  ctx.fillStyle = '#0284c7';
  drawSafeRoundRect(ctx, trainW / 2 - 4.2 * scale, -trainD / 2 + 1.0 * scale, 3.8 * scale, trainD - 2.0 * scale, 1.5 * scale);
  ctx.fill();

  // 6. 車頂中央微波通訊機殼
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-trainW / 4, -trainD / 4, trainW / 2, trainD / 2);

  // 7. 車頭 LED 路線發光看板
  ctx.fillStyle = '#0f172a';
  drawSafeRoundRect(ctx, -trainW / 3, -trainD / 2 - 6 * scale, trainW * 0.66, 5 * scale, 2 * scale);
  ctx.fill();
  ctx.strokeStyle = train.themeColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = train.isStopped ? '#fbbf24' : '#38bdf8';
  ctx.font = `bold ${Math.max(8, Math.round(7.5 * scale))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const displayLabel = train.isStopped ? `🚊 停靠[${train.currentStation}]` : train.ledText;
  ctx.fillText(displayLabel, 0, -trainD / 2 - 3.5 * scale);

  ctx.restore();
}

// ──────────────────────────────────────────
// 4.7 🚆 臺灣鐵路縱貫線動態列車系統 (TRA Main Line Dynamic Express Trains)
// 包含 EMU900 區間快車與新自強號 EMU3000，穿梭雙北 8 大樞紐車站
// ──────────────────────────────────────────
const traTrack = [
  // 縱貫線西向 (汐止 ➔ 南港 ➔ 松山 ➔ 臺北車站 ➔ 萬華 ➔ 板橋 ➔ 樹林 ➔ 鶯歌)
  { x: 380,  z: -40, stopName: '汐止車站 (TRA)', line: '台鐵縱貫線' },
  { x: 360,  z: -20, stopName: '南港車站 (TRA)', line: '台鐵縱貫線' },
  { x: 290,  z: -95, stopName: '松山車站 (TRA)', line: '台鐵縱貫線' },
  { x: 0,    z: 0,   stopName: '臺北車站 (TRA特等站)', line: '台鐵縱貫線' },
  { x: -160, z: 80,  stopName: '萬華車站 (TRA)', line: '台鐵縱貫線' },
  { x: -130, z: 130, stopName: '板橋車站 (TRA特等站)', line: '台鐵縱貫線' },
  { x: -200, z: 210, stopName: '樹林車站 (TRA)', line: '台鐵縱貫線' },
  { x: -310, z: 290, stopName: '鶯歌車站 (TRA)', line: '台鐵縱貫線' },

  // 縱貫線東向返程 (鶯歌 ➔ 樹林 ➔ 板橋 ➔ 萬華 ➔ 臺北車站 ➔ 松山 ➔ 南港 ➔ 汐止)
  { x: -310, z: 295, stopName: '鶯歌車站 (返程發車)', line: '台鐵縱貫線' },
  { x: -200, z: 215, stopName: '樹林車站 (東行)', line: '台鐵縱貫線' },
  { x: -130, z: 135, stopName: '板橋車站 (東行特等月台)', line: '台鐵縱貫線' },
  { x: -160, z: 85,  stopName: '萬華車站 (東行)', line: '台鐵縱貫線' },
  { x: 0,    z: 5,   stopName: '臺北車站 (東行特等月台)', line: '台鐵縱貫線' },
  { x: 290,  z: -90, stopName: '松山車站 (東行)', line: '台鐵縱貫線' },
  { x: 360,  z: -15, stopName: '南港車站 (東行)', line: '台鐵縱貫線' },
  { x: 380,  z: -35, stopName: '汐止車站 (終點調度)', line: '台鐵縱貫線' }
];

const traTrains = [
  {
    id: 'tra_emu900_01',
    lineCode: 'TRA',
    lineName: '臺鐵 EMU900 區間快車',
    ledText: '🚆 臺鐵 ➔ 台北特等站 ➔ 板橋 ➔ 樹林 ➔ 鶯歌',
    themeColor: '#0284c7', // 台鐵深邃湛藍
    accentColor: '#38bdf8',
    track: traTrack,
    currentWaypointIndex: 0,
    x: traTrack[0].x,
    z: traTrack[0].z,
    angle: 0,
    speed: 0.65,
    isStopped: false,
    stopTimer: 0,
    w: 42,
    d: 6.8,
    currentStation: traTrack[0].stopName
  },
  {
    id: 'tra_emu3000_02',
    lineCode: 'TRA',
    lineName: '臺鐵 新自強號 EMU3000',
    ledText: '🚆 新自強號 ➔ 台北特等站 ➔ 松山 ➔ 南港 ➔ 汐止',
    themeColor: '#1e293b', // 黑白極簡沉穩
    accentColor: '#fbbf24',
    track: traTrack,
    currentWaypointIndex: 8, // 返程段
    x: traTrack[8].x,
    z: traTrack[8].z,
    angle: Math.PI,
    speed: 0.72,
    isStopped: false,
    stopTimer: 0,
    w: 44,
    d: 7.0,
    currentStation: traTrack[8].stopName
  }
];

function updateTraPhysics(train) {
  if (train.isStopped) {
    train.stopTimer--;
    if (train.stopTimer <= 0) train.isStopped = false;
    return;
  }

  const target = train.track[train.currentWaypointIndex];
  const dx = target.x - train.x;
  const dz = target.z - train.z;
  const dist = Math.hypot(dx, dz);

  const targetAngle = Math.atan2(dz, dx);
  let diff = targetAngle - train.angle;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  train.angle += diff * 0.20;

  if (dist <= train.speed * 1.5) {
    train.x = target.x;
    train.z = target.z;
    if (target.stopName && !target.justStopped) {
      train.isStopped = true;
      train.stopTimer = 90; // 停站 1.5 秒上下客
      train.currentStation = target.stopName;
      target.justStopped = true;
      setTimeout(() => { target.justStopped = false; }, 9000);
    }
    train.currentWaypointIndex = (train.currentWaypointIndex + 1) % train.track.length;
    const nextPt = train.track[train.currentWaypointIndex];
    if (nextPt.stopName) {
      train.ledText = train.currentWaypointIndex < 8
        ? '🚆 臺鐵 ➔ 台北特等站 ➔ 板橋 ➔ 樹林 ➔ 鶯歌'
        : '🚆 臺鐵 ➔ 台北特等站 ➔ 松山 ➔ 南港 ➔ 汐止';
    }
  } else {
    train.x += Math.cos(train.angle) * train.speed;
    train.z += Math.sin(train.angle) * train.speed;
  }
}

function drawRotatedTraTrain(train) {
  const scale = camera.currentScale;
  const screenX = (val) => (val - camera.x) * scale;
  const screenZ = (val) => (val - camera.z) * scale;
  const cx = screenX(train.x);
  const cz = screenZ(train.z);
  const trainW = train.w * scale;
  const trainD = train.d * scale;

  ctx.save();
  ctx.translate(cx, cz);
  ctx.rotate(train.angle);

  // 1. 地面陰影與鐵道反光
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  drawSafeRoundRect(ctx, -trainW / 2 + 1.5 * scale, -trainD / 2 + 2.0 * scale, trainW, trainD, 2.5 * scale);
  ctx.fill();

  // 鐵道發光
  ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.fillRect(-trainW / 2 - 2 * scale, -trainD / 2 - 1 * scale, trainW + 4 * scale, trainD + 2 * scale);

  // 2. 流線型台鐵車身 (EMU900 或 EMU3000)
  ctx.fillStyle = '#e2e8f0';
  drawSafeRoundRect(ctx, -trainW / 2, -trainD / 2, trainW, trainD, 3.2 * scale);
  ctx.fill();

  // 3. 台鐵經典塗裝色帶
  ctx.fillStyle = train.themeColor || '#0284c7';
  ctx.fillRect(-trainW / 2 + 3 * scale, -trainD / 2 + 1.0 * scale, trainW - 6 * scale, 1.8 * scale);
  ctx.fillRect(-trainW / 2 + 3 * scale, trainD / 2 - 2.8 * scale, trainW - 6 * scale, 1.8 * scale);

  // 4. 車窗排列 (模擬 8 節編組台鐵列車)
  ctx.fillStyle = '#0f172a';
  for (let i = -trainW / 2 + 7 * scale; i < trainW / 2 - 7 * scale; i += 7.5 * scale) {
    ctx.fillRect(i, -trainD / 2 + 0.6 * scale, 5 * scale, 1.2 * scale);
    ctx.fillRect(i, trainD / 2 - 1.8 * scale, 5 * scale, 1.2 * scale);
  }

  // 5. 車頭擋風玻璃與前大燈
  ctx.fillStyle = '#0284c7';
  drawSafeRoundRect(ctx, trainW / 2 - 4.5 * scale, -trainD / 2 + 1.0 * scale, 4.0 * scale, trainD - 2.0 * scale, 1.5 * scale);
  ctx.fill();

  // 6. 頂部 LED 標牌
  ctx.fillStyle = '#0f172a';
  drawSafeRoundRect(ctx, -trainW / 3, -trainD / 2 - 6 * scale, trainW * 0.66, 5 * scale, 2 * scale);
  ctx.fill();
  ctx.strokeStyle = train.accentColor || '#38bdf8';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = train.isStopped ? '#fbbf24' : '#38bdf8';
  ctx.font = `bold ${Math.max(8, Math.round(7.5 * scale))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const displayLabel = train.isStopped ? `🚆 停靠[${train.currentStation}]` : train.ledText;
  ctx.fillText(displayLabel, 0, -trainD / 2 - 3.5 * scale);

  ctx.restore();
}

// 雙北街頭行人 NPC (Pedestrians)
const pedestrians = [
  { x: 15, z: 28, minX: -60, maxX: 70, dir: 1, speed: 0.08, walkCycle: 0, shirt: '#d97706', pants: '#1e293b', name: '通勤上班族' },
  { x: -30, z: 28, minX: -80, maxX: 40, dir: -1, speed: 0.07, walkCycle: 2, shirt: '#0284c7', pants: '#334155', name: '高中學生' },
  { x: 92, z: -10, minZ: -80, maxZ: 60, dir: 1, isZAxis: true, speed: 0.075, walkCycle: 1, shirt: '#10b981', pants: '#0f172a', name: '漫步市民' },
  { x: 92, z: 40, minZ: -50, maxZ: 70, dir: -1, isZAxis: true, speed: 0.065, walkCycle: 3, shirt: '#ec4899', pants: '#374151', name: '購物遊客' },
  { x: -6, z: 2, minX: -16, maxX: 16, dir: 1, speed: 0.04, walkCycle: 4, shirt: '#f59e0b', pants: '#1e293b', name: '等車乘客' }
];

/* ─── 5. 跑步衝刺 (Sprint) 模式切換邏輯 ─── */
function toggleSprintMode() {
  gameState.isRunning = !gameState.isRunning;
  updateSprintUI();
  playTone(gameState.isRunning ? 620 : 440, 'triangle', 0.08);
}

function updateSprintUI() {
  const btn = document.getElementById("btnToggleSprint");
  const icon = document.getElementById("sprintIcon");
  const text = document.getElementById("sprintText");
  if (!btn || !icon || !text) return;

  if (gameState.isRunning) {
    btn.classList.add("running");
    icon.innerText = "🏃";
    text.innerText = "奔跑衝刺中 (Shift)";
  } else {
    btn.classList.remove("running");
    icon.innerText = "🚶";
    text.innerText = "走路慢行 (Shift)";
  }
}

// 鍵盤 Shift 按下時動態切換跑步
window.addEventListener("keydown", e => {
  if (e.key === "Shift") {
    gameState.isRunning = true;
    updateSprintUI();
  }
});
window.addEventListener("keyup", e => {
  if (e.key === "Shift") {
    gameState.isRunning = false;
    updateSprintUI();
  }
});

/* ─── 6. 控制器輸入與平滑移動運算 (支援幽靈天眼滑鼠拖曳、滾輪縮放與鍵盤漫遊) ─── */
const keys = {};
window.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
    cameraLockToPlayer = true;
  }
  if (k === "e") triggerCurrentInteraction();
});
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// 滑鼠拖曳自由平移與滾輪無級縮放 (Ghost Drone Controls)
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let cameraDragStartX = 0;
let cameraDragStartZ = 0;

canvas.addEventListener("mousedown", e => {
  if (e.button === 0) {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    cameraDragStartX = camera.x;
    cameraDragStartZ = camera.z;
  }
});

window.addEventListener("mousemove", e => {
  if (isDragging) {
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const dragMultiplier = 1.35; // 提高游標拖曳平移反饋速度，指哪打哪超靈敏
    camera.x = cameraDragStartX - (dx / camera.currentScale) * dragMultiplier;
    camera.z = cameraDragStartZ - (dy / camera.currentScale) * dragMultiplier;
    // 擴大相機巡航範圍至雙北全境 41 行政特區 (-460 ~ +650, -520 ~ +460)
    camera.x = Math.max(-460, Math.min(650, camera.x));
    camera.z = Math.max(-520, Math.min(460, camera.z));
    if (!gameState.isGhostMode) {
      playerPos.x = camera.x;
      playerPos.z = camera.z;
    }
  }
});

window.addEventListener("mouseup", () => {
  isDragging = false;
});

// 滑鼠滾輪縮放 (Zoom in / out - 支援超大微觀人物特寫 160.0x)
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.20 : 0.82;
  camera.targetScale = Math.max(camera.minScale, Math.min(camera.maxScale, camera.targetScale * zoomFactor));
  // 當放大為人物微觀特寫時，自動鎖定置中於人物正上方
  if (!gameState.isGhostMode && camera.targetScale >= 12.0) {
    cameraLockToPlayer = true;
    camera.x = playerPos.x;
    camera.z = playerPos.z;
  }
}, { passive: false });

// 點擊地圖任意門市/地標直接互動
canvas.addEventListener("click", e => {
  if (Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) > 6) return; // 拖曳中忽略點擊
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left - rect.width / 2;
  const clickY = e.clientY - rect.top - rect.height / 2;
  const worldX = camera.x + clickX / camera.currentScale;
  const worldZ = camera.z + clickY / camera.currentScale;

  for (const it of interactables) {
    const dist = Math.hypot(it.x - worldX, it.z - worldZ);
    if (dist <= (it.r || 10) * 1.5) {
      triggerDirectInteraction(it);
      return;
    }
  }
});

function bindMobileDpad(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = (e) => { e.preventDefault(); keys[key] = true; };
  const end = (e) => { e.preventDefault(); keys[key] = false; };
  el.addEventListener("touchstart", start);
  el.addEventListener("touchend", end);
  el.addEventListener("mousedown", start);
  el.addEventListener("mouseup", end);
}
bindMobileDpad("dpadUp", "w");
bindMobileDpad("dpadDown", "s");
bindMobileDpad("dpadLeft", "a");
bindMobileDpad("dpadRight", "d");

let lastHudAlt = '', lastHudZoom = '', lastHudCoords = '', lastHudDistrict = '';
function updateGhostDroneHUD() {
  const altEl = document.getElementById("hudAltitude");
  const zoomEl = document.getElementById("hudZoom");
  const coordsEl = document.getElementById("hudCoords");
  const distEl = document.getElementById("hudDistrict");
  if (altEl) {
    const altStr = `${Math.round(450 * (15 / camera.currentScale))}m`;
    if (altStr !== lastHudAlt) { altEl.innerText = altStr; lastHudAlt = altStr; }
  }
  if (zoomEl) {
    const zoomStr = `${(camera.currentScale / 15).toFixed(1)}x`;
    if (zoomStr !== lastHudZoom) { zoomEl.innerText = zoomStr; lastHudZoom = zoomStr; }
  }
  if (coordsEl) {
    const coordsStr = `X: ${Math.round(camera.x)}, Z: ${Math.round(camera.z)}`;
    if (coordsStr !== lastHudCoords) { coordsEl.innerText = coordsStr; lastHudCoords = coordsStr; }
  }
  if (distEl) {
    let name = "🛰️ 雙北全息戰術拓撲空間";
    for (let i = 0; i < shuangbeiSectors.length; i++) {
      const sec = shuangbeiSectors[i];
      if (Math.abs(camera.x - sec.x) <= sec.w / 2 && Math.abs(camera.z - sec.z) <= sec.h / 2) {
        name = `${sec.name} ｜ ${sec.desc}`;
        break;
      }
    }
    // 特殊微觀地標精準補充
    if (camera.z >= 95 && camera.z <= 126 && camera.x <= -100) name = "🌉 萬華/板橋・新店溪 ✕ 華翠大橋 ✕ 華江橋 (跨市橋樑)";
    else if (camera.x <= -30 && camera.z >= 155 && camera.z <= 190) name = "🏫 板橋區・學府路一段 (1:1 真實商圈) ✕ 樂家康便利購";
    else if (camera.x <= -125 && camera.z >= 0 && camera.z < 95) name = "🎮 萬華區・西門町徒步區 ✕ 萬家福桂林旗艦店";
    else if (camera.x >= -35 && camera.x <= 35 && camera.z >= -10 && camera.z <= 30) name = "🏛️ 中正區・台北車站站前核心 ✕ 忠孝西路一段";
    if (name !== lastHudDistrict) { distEl.innerText = name; lastHudDistrict = name; }
  }
}

/**
 * 玩家平滑位移運算 (支援幽靈自由巡航模式 ✕ 地面角色雙速衝刺模式)
 */
function updateMovement() {
  if (gameState.inTransit) {
    if (gameState.fastForwarding) {
      updateFastForwardCutscene();
      return;
    }
    // 玩家搭乘公車或捷運，未快轉時隨車平穩漫遊欣賞街景
    if (gameState.transitType === 'bus') {
      const activeBus = gameState.activeBus || cityBuses[0];
      playerPos.x = activeBus.x;
      playerPos.z = activeBus.z;
      if (transitStatus) {
        transitStatus.innerText = `🚌 ${activeBus.lineName} 行駛中：【${activeBus.currentStreet || '雙北幹道'}】➔ 即將抵達【${activeBus.nextStopName || '下一站'}】(位置: X:${Math.round(activeBus.x)}, Z:${Math.round(activeBus.z)})。隨車漫遊欣賞真實街景中... 可隨時點擊【到站下車】或【快轉】。`;
      }
    } else if (gameState.transitType === 'mrt') {
      const dest = (gameState.transitDest === 'zhongshan') ? { x: 70, z: 15 } : { x: 24, z: 24 };
      playerPos.x += (dest.x - playerPos.x) * 0.02;
      playerPos.z += (dest.z - playerPos.z) * 0.02;
      if (transitStatus) {
        transitStatus.innerText = `🚇 捷運列車行駛於地下隧道中 (前往: ${gameState.transitDest === 'zhongshan' ? '中山站' : '台北車站'})，可隨車漫遊或點擊【到站下車】/【快轉】。`;
      }
    }

    camera.x += (playerPos.x - camera.x) * 0.12;
    camera.z += (playerPos.z - camera.z) * 0.12;
    camera.currentScale += (camera.targetScale - camera.currentScale) * 0.1;
    updateMinimapRadar();
    updateGhostDroneHUD();
    checkProximityAndLocation();
    return;
  }

  // 🛰️ 天眼幽靈巡航模式運算 (Ghost Spectator Drone Mode)
  if (gameState.isGhostMode) {
    let flySpeed = gameState.isRunning ? gameState.droneTurboSpeed : gameState.droneFlySpeed;
    let moveX = 0;
    let moveZ = 0;
    if (keys["w"] || keys["arrowup"]) moveZ -= 1;
    if (keys["s"] || keys["arrowdown"]) moveZ += 1;
    if (keys["a"] || keys["arrowleft"]) moveX -= 1;
    if (keys["d"] || keys["arrowright"]) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.hypot(moveX, moveZ);
      camera.x += (moveX / len) * flySpeed;
      camera.z += (moveZ / len) * flySpeed;
      // 雙北全境 41 特區無障礙穿梭巡航 (-460 ~ +650, -520 ~ +460)
      camera.x = Math.max(-460, Math.min(650, camera.x));
      camera.z = Math.max(-520, Math.min(460, camera.z));
      playerPos.x = camera.x;
      playerPos.z = camera.z;
    }

    camera.currentScale += (camera.targetScale - camera.currentScale) * 0.12;
    updateMinimapRadar();
    updateGhostDroneHUD();
    checkProximityAndLocation();
    return;
  }

  // 🚶 地面角色雙速移動模式 (Ground Player Mode)
  let currentSpeed = gameState.isRunning ? gameState.runSpeed : gameState.walkSpeed;
  if (gameState.hasSkateboard) currentSpeed = 1.10; // 滑板極速飛馳
  if (gameState.stamina < 15) {
    currentSpeed *= 0.55; // 體力不支自動降速
    if (gameState.isRunning) {
      gameState.isRunning = false;
      updateSprintUI();
    }
  }

  let moveX = 0;
  let moveZ = 0;

  if (keys["w"] || keys["arrowup"]) { moveZ -= 1; playerPos.facing = 'up'; }
  if (keys["s"] || keys["arrowdown"]) { moveZ += 1; playerPos.facing = 'down'; }
  if (keys["a"] || keys["arrowleft"]) { moveX -= 1; playerPos.facing = 'left'; }
  if (keys["d"] || keys["arrowright"]) { moveX += 1; playerPos.facing = 'right'; }

  playerPos.isMoving = (moveX !== 0 || moveZ !== 0);

  if (playerPos.isMoving) {
    const len = Math.hypot(moveX, moveZ);
    playerPos.x += (moveX / len) * currentSpeed;
    playerPos.z += (moveZ / len) * currentSpeed;

    // 步態擺動節奏
    const cycleStep = gameState.isRunning ? 0.38 : 0.22;
    playerPos.walkCycle += cycleStep;

    // 跑步衝刺體力消耗與塵土氣流粒子
    if (gameState.isRunning) {
      if (Math.random() < 0.45) {
        sprintParticles.push({
          x: playerPos.x + (Math.random() - 0.5) * 1.5,
          z: playerPos.z + 0.5,
          radius: Math.random() * 2 + 1.5,
          alpha: 0.65,
          decay: 0.04
        });
      }
      if (Math.floor(playerPos.walkCycle) % 12 === 0) {
        gameState.stamina = Math.max(8, gameState.stamina - 0.35);
        updateBars();
      }
    }

    // 腳步輕微音效
    if (Math.floor(playerPos.walkCycle) % 8 === 0) {
      playTone(gameState.isRunning ? 210 : 170, 'square', 0.03, 0.02);
    }
  }

  // 雙北全境 41 特區無障礙移動範圍 (-460 ~ +650, -520 ~ +460)
  playerPos.x = Math.max(-460, Math.min(650, playerPos.x));
  playerPos.z = Math.max(-520, Math.min(460, playerPos.z));

  // 動態攝影機平滑跟隨 (Smooth Lerp Camera) - 嚴密鎖定人物正上方 (以人物為中心)
  if (!isDragging) {
    if (cameraLockToPlayer || playerPos.isMoving || camera.currentScale >= 12.0) {
      // 緊貼角色：特寫或移動中直接精準同步，保證人物始終置於視窗正中央 (視角剛好在人物正上方，移動跟隨推進)
      const lerpSpd = (camera.currentScale >= 15.0 || playerPos.isMoving) ? 0.48 : 0.28;
      camera.x += (playerPos.x - camera.x) * lerpSpd;
      camera.z += (playerPos.z - camera.z) * lerpSpd;
      if (Math.hypot(playerPos.x - camera.x, playerPos.z - camera.z) < 0.05) {
        camera.x = playerPos.x;
        camera.z = playerPos.z;
      }
    } else {
      camera.x += (playerPos.x - camera.x) * 0.18;
      camera.z += (playerPos.z - camera.z) * 0.18;
    }
  }
  camera.currentScale += (camera.targetScale - camera.currentScale) * 0.18;

  // 節流 HUD 與小地圖 (每 3 幀刷新一次，消除高頻 DOM reflow 卡頓)
  hudUpdateFrameCount = (hudUpdateFrameCount || 0) + 1;
  if (hudUpdateFrameCount % 3 === 0) {
    updateMinimapRadar();
    updateGhostDroneHUD();
  }
  if (hudUpdateFrameCount % 6 === 0) {
    checkProximityAndLocation();
  }
}

function updateMinimapRadar() {
  const dot = document.getElementById("radarPlayerDot");
  if (!dot) return;
  // 將雙北全境大地圖座標 (-460~650, -520~460) 映射至雷達圓圈
  const normX = ((playerPos.x + 460) / 1110) * 72 + 4;
  const normZ = ((playerPos.z + 520) / 980) * 72 + 4;
  dot.style.left = `${normX}px`;
  dot.style.top = `${normZ}px`;
}

/* ─── 7. 公車、捷運與臺鐵動態路網連續運行系統 ─── */
function updateBusWorld() {
  cityBuses.forEach(b => updateBusPhysics(b));
  mrtTrains.forEach(t => updateMrtPhysics(t));
  traTrains.forEach(t => updateTraPhysics(t));
}

const transitHud = document.getElementById("transitHud");
const transitBadge = document.getElementById("transitBadge");
const transitStatus = document.getElementById("transitStatus");

function boardTaipeiBus(line, dest) {
  if (gameState.money < 15) return alert("悠遊卡餘額不足一段票 $15 囉！");
  gameState.money -= 15;
  playBusChime();
  updateBars();

  gameState.inTransit = true;
  gameState.transitType = 'bus';
  gameState.transitDest = dest;

  // 依玩家目前所在位置尋找最近的一班公車搭乘
  let chosenBus = cityBuses[0];
  let minD = 99999;
  cityBuses.forEach(b => {
    const d = Math.hypot(b.x - playerPos.x, b.z - playerPos.z);
    if (d < minD) {
      minD = d;
      chosenBus = b;
    }
  });
  gameState.activeBus = chosenBus;

  transitBadge.innerText = `🚌 ${chosenBus.lineName} (${chosenBus.ledText})`;
  transitStatus.innerText = `車輛發車於【${chosenBus.currentStreet || '雙北幹道'}】，沿真實路線平穩行駛中，可隨車欣賞街景或點擊快轉/下車...`;
  transitHud.style.display = "flex";

  showNavToast(`🚌 悠遊卡扣款 $15！已登上 ${chosenBus.lineName}，沿真實路網平穩行駛中！`);
  gameState.quests.bus = true;
  updateQuestProgress();
}

function boardMrtTrain(line) {
  if (gameState.money < 20) return alert("悠遊卡餘額不足 $20 囉！");
  gameState.money -= 20;
  playMrtChime();
  updateBars();
  closeModal('mrtStationModal');

  gameState.inTransit = true;
  gameState.transitType = 'mrt';
  gameState.transitDest = (line === 'tamsui') ? 'zhongshan' : 'station';

  transitBadge.innerText = `🚇 捷運淡水信義線 (${line === 'tamsui' ? '地下段 ➔ 中山商圈' : '地下段 ➔ 台北車站'})`;
  transitStatus.innerText = "列車加速行駛於地下隧道中，點擊右方按鈕啟用鳥瞰快轉過場...";
  transitHud.style.display = "flex";

  showNavToast("🚇 嗶！悠遊卡扣款 $20！列車已發車，可點擊快轉鍵啟用鳥瞰過場！");
}

function triggerFastForwardTransition() {
  if (!gameState.inTransit) return;
  gameState.fastForwarding = true;
  gameState.fastForwardProgress = 0;
  camera.targetScale = 5.2; // 縮小為高空衛星鳥瞰大地圖視角
  playTone(880, 'sine', 0.25, 0.2);
  transitStatus.innerText = "🚀 鏡頭平滑拉升至高空空拍鳥瞰！全速行駛中...";
}

function updateFastForwardCutscene() {
  gameState.fastForwardProgress += 0.014;
  const p = gameState.fastForwardProgress;

  const destCoords = (gameState.transitDest === 'zhongshan')
    ? { x: 78, z: -40, name: '中山商圈・中山市場' }
    : (gameState.transitDest === 'banqiao'
      ? { x: -150, z: 168, name: '板橋區・學府路一段' }
      : { x: -20, z: -5, name: '台北車站・忠孝西路站前' });

  playerPos.x += (destCoords.x - playerPos.x) * 0.045;
  playerPos.z += (destCoords.z - playerPos.z) * 0.045;

  if (p >= 0.75) {
    camera.targetScale = 19; // 降回地面正常視角
  }

  if (p >= 1.0) {
    gameState.fastForwarding = false;
    gameState.inTransit = false;
    transitHud.style.display = "none";
    playerPos.x = destCoords.x;
    playerPos.z = destCoords.z;
    camera.targetScale = 19;
    playBusChime();
    showNavToast(`📍 抵達【${destCoords.name}】！請親自步行探索街區！`);
    showDetectiveDialogue(`「已順利抵達目的地！進行街區探索吧！」`, "戰術中樞");
  }
}

function disembarkTransit() {
  if (!gameState.inTransit) return;
  const wasType = gameState.transitType;
  gameState.inTransit = false;
  gameState.fastForwarding = false;
  camera.targetScale = 19;
  if (transitHud) transitHud.style.display = "none";

  if (wasType === 'bus') {
    const activeBus = gameState.activeBus || cityBuses[0];
    playerPos.x = activeBus.x + Math.cos(activeBus.angle + Math.PI / 2) * 5.5;
    playerPos.z = activeBus.z + Math.sin(activeBus.angle + Math.PI / 2) * 5.5;
    playBusChime();
    showNavToast(`🚶 已從 ${activeBus.lineName} 下車至【${activeBus.currentStreet || '人行道'}】！恢復自由探索！`);
    showDetectiveDialogue("「抵達站點！在雙北街廓自由巡航！」", "戰術中樞");
  } else {
    playerPos.z = playerPos.z + 4;
    playMrtChime();
    showNavToast("🚶 已從捷運列車下車抵達站台！恢復自由探索！");
    showDetectiveDialogue("「超軌列車到站，走出手扶梯繼續漫遊！」", "戰術中樞");
  }
}

/* ─── 8. 現代 2D/2.5D 動漫都會冒險渲染核心 (Retina HiDPI ✕ Y-Sorting 深度分層) ─── */
function renderScene() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  const targetW = Math.round(cssW * dpr);
  const targetH = Math.round(cssH * dpr);

  // 動態檢測畫布物理像素，確保 100% 吻合螢幕像素密度 (Retina 4K/5K 零模糊)
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
  }

  // 啟用 Retina DPR 座標縮放
  ctx.save();
  ctx.scale(dpr, dpr);

  const w = cssW;
  const h = cssH;
  const cx = w / 2;
  const cy = h / 2;
  const scale = camera.currentScale;

  // 1. 深邃星空全息科技漸層底色 (Deep Cyber Space Gradient - 告別純黑，鮮明高科技對比)
  const bgGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(w, h));
  bgGrad.addColorStop(0, '#0c1a3b');
  bgGrad.addColorStop(0.65, '#070e24');
  bgGrad.addColorStop(1, '#020512');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(cx, cy);

  const screenX = (val) => (val - camera.x) * scale;
  const screenZ = (val) => (val - camera.z) * scale;

  // ──────────────────────────────────────────
  // 第 0 層：雙北全境無限賽博全息經緯矩陣 (Infinite Cyber Coordinate Grid)
  // 【徹底解決「只有一個區域，外面接下來全都是藍藍色」問題！】
  // 依據當前攝像機可視世界座標動態無限鋪滿全屏，永無邊界切斷！
  // ──────────────────────────────────────────

  // 計算當前視窗所涵蓋的真實世界座標範圍
  const viewMargin = 60 / scale;
  const minWorldX = camera.x - (cx / scale) - viewMargin;
  const maxWorldX = camera.x + (cx / scale) + viewMargin;
  const minWorldZ = camera.z - (cy / scale) - viewMargin;
  const maxWorldZ = camera.z + (cy / scale) + viewMargin;

  // 0.0 視錐可視範圍剔除 (Frustum Viewport Culling - 解決地圖移動嚴重卡頓的核心技術)
  const isInViewport = (wx, wz, margin = 35) => {
    return wx >= minWorldX - margin && wx <= maxWorldX + margin &&
           wz >= minWorldZ - margin && wz <= maxWorldZ + margin;
  };

  // 0.1 動態全像經緯拓撲主網格與次網格 (Dynamic Cyber Grid)
  const gridStep = scale < 2.0 ? 120 : (scale < 6.0 ? 60 : 30);
  const subStep = gridStep / 4;

  const startX = Math.floor(minWorldX / subStep) * subStep;
  const endX = Math.ceil(maxWorldX / subStep) * subStep;
  const startZ = Math.floor(minWorldZ / subStep) * subStep;
  const endZ = Math.ceil(maxWorldZ / subStep) * subStep;

  // 次級賽博格線 (Sub-Grid Lines - 僅在宏觀至中觀適度放大時繪製；超特寫 scale > 12.0 時隱藏以消除區塊感)
  if (scale >= 2.5 && scale <= 12.0) {
    ctx.strokeStyle = 'rgba(30, 68, 160, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += subStep) {
      if (x % gridStep !== 0) {
        ctx.moveTo(screenX(x), screenZ(minWorldZ));
        ctx.lineTo(screenX(x), screenZ(maxWorldZ));
      }
    }
    for (let z = startZ; z <= endZ; z += subStep) {
      if (z % gridStep !== 0) {
        ctx.moveTo(screenX(minWorldX), screenZ(z));
        ctx.lineTo(screenX(maxWorldX), screenZ(z));
      }
    }
    ctx.stroke();
  }

  // 主要賽博全息格線 (Major Cyber Grid Lines - scale <= 12.0 時繪製，特寫時隱藏讓真實街景完全呈現)
  if (scale <= 12.0) {
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.28)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridStep) {
      ctx.moveTo(screenX(x), screenZ(minWorldZ));
      ctx.lineTo(screenX(x), screenZ(maxWorldZ));
    }
    for (let z = startZ; z <= endZ; z += gridStep) {
      ctx.moveTo(screenX(minWorldX), screenZ(z));
      ctx.lineTo(screenX(maxWorldX), screenZ(z));
    }
    ctx.stroke();
  }

  // 賽博經緯十字準星與科技座標銘印 (限制軸線步數在 25 以內，防止千次運算)
  const numStepsX = Math.ceil((endX - startX) / gridStep);
  const numStepsZ = Math.ceil((endZ - startZ) / gridStep);
  if (numStepsX <= 30 && numStepsZ <= 30 && scale >= 1.2) {
    ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.font = '9px monospace';
    for (let x = startX; x <= endX; x += gridStep) {
      for (let z = startZ; z <= endZ; z += gridStep) {
        const sx = screenX(x);
        const sz = screenZ(z);
        // 十字標
        ctx.fillRect(sx - 3, sz - 0.5, 6, 1);
        ctx.fillRect(sx - 0.5, sz - 3, 1, 6);
        // 科技經緯刻度 (N 25.04° / E 121.51°)
        if (scale >= 2.0 && (x % (gridStep * 2) === 0) && (z % (gridStep * 2) === 0)) {
          const latVal = (25.0478 - z * 0.0009).toFixed(3);
          const lonVal = (121.5170 + x * 0.0009).toFixed(3);
          ctx.fillText(`+${lonVal}E, ${latVal}N`, sx + 4, sz - 3);
        }
      }
    }
  }

  // 0.2 全像同心雷達測距光環 (Holographic Tactical Radar Range Rings)
  const radarRadii = [80, 180, 320, 520, 750, 1100];
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 6]);
  radarRadii.forEach(r => {
    ctx.beginPath();
    ctx.arc(screenX(0), screenZ(10), r * scale, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // 動態掃描全息雷達光束 (Animated Holo-Radar Sweep Beam)
  const radarTime = (Date.now() / 2400) % (Math.PI * 2);
  const sweepLen = 950 * scale;
  const grad = ctx.createLinearGradient(
    screenX(0), screenZ(10),
    screenX(0) + Math.cos(radarTime) * sweepLen,
    screenZ(10) + Math.sin(radarTime) * sweepLen
  );
  grad.addColorStop(0, 'rgba(0, 240, 255, 0.18)');
  grad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(screenX(0), screenZ(10));
  ctx.lineTo(screenX(0) + Math.cos(radarTime) * sweepLen, screenZ(10) + Math.sin(radarTime) * sweepLen);
  ctx.stroke();

  // ──────────────────────────────────────────
  // 第 0.3 層：雙北全境 29+12 行政特區賽博全息晶片板塊 (All 41 Greater Taipei Sectors)
  // 【完整涵蓋：臺北市 12 區 ✕ 新北市全境 29 行政區，絕無遺漏！】
  // ──────────────────────────────────────────

  // 繪製 41 大特區之賽博全像板塊與邊界微流光 (僅在宏觀/中觀視角 scale <= 7.5 時繪製，特寫時全面隱藏以徹底消除「看到很多區塊」！)
  if (scale <= 7.5) {
    shuangbeiSectors.forEach(sec => {
      if (!isInViewport(sec.x, sec.z, Math.max(sec.w, sec.h) / 2 + 10)) return;

      const sx = screenX(sec.x - sec.w / 2);
      const sz = screenZ(sec.z - sec.h / 2);
      const sw = sec.w * scale;
      const sh = sec.h * scale;

      // 板塊底色 (科技半透明全息電路芯片)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      drawSafeRoundRect(ctx, sx, sz, sw, sh, 6);
      ctx.fill();

      // 板塊霓虹外框 (以高效向量線條取代耗效能之高斯模糊 shadowBlur，流暢 60FPS)
      ctx.strokeStyle = sec.col;
      ctx.lineWidth = scale < 2.0 ? 1.0 : 1.5;
      ctx.stroke();

      // 科技四角折角瞄準器 (Cyber Tactical Corner Brackets)
      const cornerSize = Math.max(3, scale * 0.4);
      ctx.fillStyle = sec.col;
      ctx.fillRect(sx, sz, cornerSize, 1.5);
      ctx.fillRect(sx, sz, 1.5, cornerSize);
      ctx.fillRect(sx + sw - cornerSize, sz, cornerSize, 1.5);
      ctx.fillRect(sx + sw - 1.5, sz, 1.5, cornerSize);
      ctx.fillRect(sx, sz + sh - 1.5, cornerSize, 1.5);
      ctx.fillRect(sx, sz + sh - cornerSize, 1.5, cornerSize);
      ctx.fillRect(sx + sw - cornerSize, sz + sh - 1.5, cornerSize, 1.5);
      ctx.fillRect(sx + sw - 1.5, sz + sh - cornerSize, 1.5, cornerSize);

      // 特區全像標籤與編號 (Sleek Sci-Fi Badge - 確保縮放時絕不扁平重疊)
      if (scale <= 4.0) {
        const tagW = Math.max(90, Math.min(sw * 0.95, 135));
        const tagH = 22;
        const tcx = sx + sw / 2;
        const tcy = sz + sh / 2;

        ctx.fillStyle = 'rgba(7, 13, 36, 0.92)';
        drawSafeRoundRect(ctx, tcx - tagW / 2, tcy - tagH / 2, tagW, tagH, 4);
        ctx.fill();
        ctx.strokeStyle = sec.col;
        ctx.lineWidth = 1.3;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sec.name.split('・')[0], tcx, tcy + 4);
      }
    });
  }

  // 0.4 雙北周邊盆地山系自然山稜線 (Holographic Basin Mountain Ridgelines)
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([3, 4]);
  // 北壁陽明山系
  ctx.beginPath();
  ctx.moveTo(screenX(-240), screenZ(-360));
  ctx.quadraticCurveTo(screenX(-50), screenZ(-330), screenX(150), screenZ(-360));
  ctx.quadraticCurveTo(screenX(280), screenZ(-300), screenX(480), screenZ(-420));
  ctx.stroke();
  // 南壁雪山烏來山脈
  ctx.beginPath();
  ctx.moveTo(screenX(-320), screenZ(360));
  ctx.quadraticCurveTo(screenX(0), screenZ(320), screenX(280), screenZ(340));
  ctx.quadraticCurveTo(screenX(420), screenZ(300), screenX(560), screenZ(320));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#0284c7'; // 蔚藍大河

  // (1) 淡水河 (Tamsui River Main Stem): 從板橋江子翠向北經關渡至淡水出海口
  ctx.beginPath();
  ctx.moveTo(screenX(-160), screenZ(98)); // 江子翠
  ctx.quadraticCurveTo(screenX(-225), screenZ(10), screenX(-215), screenZ(-120));
  ctx.quadraticCurveTo(screenX(-210), screenZ(-210), screenX(-235), screenZ(-270)); // 關渡隘口
  ctx.quadraticCurveTo(screenX(-250), screenZ(-330), screenX(-265), screenZ(-420)); // 淡水出海口西岸
  ctx.lineTo(screenX(-225), screenZ(-420)); // 東岸
  ctx.quadraticCurveTo(screenX(-215), screenZ(-330), screenX(-205), screenZ(-270));
  ctx.quadraticCurveTo(screenX(-180), screenZ(-210), screenX(-185), screenZ(-120));
  ctx.quadraticCurveTo(screenX(-195), screenZ(10), screenX(-140), screenZ(98));
  ctx.closePath();
  ctx.fill();

  // (2) 基隆河 (Keelung River): 從汐止南港蜿蜒經內湖、松山、大直、士林社子島匯入淡水河
  ctx.beginPath();
  ctx.moveTo(screenX(420), screenZ(-30)); // 汐止
  ctx.quadraticCurveTo(screenX(280), screenZ(-90), screenX(200), screenZ(-110));
  ctx.quadraticCurveTo(screenX(130), screenZ(-155), screenX(30), screenZ(-175)); // 大直圓山
  ctx.quadraticCurveTo(screenX(-70), screenZ(-185), screenX(-190), screenZ(-210)); // 社子島匯流口
  ctx.lineTo(screenX(-190), screenZ(-195));
  ctx.quadraticCurveTo(screenX(-70), screenZ(-170), screenX(30), screenZ(-160));
  ctx.quadraticCurveTo(screenX(130), screenZ(-140), screenX(200), screenZ(-95));
  ctx.quadraticCurveTo(screenX(280), screenZ(-75), screenX(420), screenZ(-15));
  ctx.closePath();
  ctx.fill();

  // (3) 新店溪 (Xindian River): 從新店碧潭向西北流經景美、公館、永和、板橋江子翠
  ctx.beginPath();
  ctx.moveTo(screenX(80), screenZ(360)); // 新店碧潭上游
  ctx.quadraticCurveTo(screenX(70), screenZ(260), screenX(40), screenZ(190)); // 景美公館
  ctx.quadraticCurveTo(screenX(-10), screenZ(145), screenX(-80), screenZ(120)); // 永和中正橋
  ctx.quadraticCurveTo(screenX(-120), screenZ(110), screenX(-160), screenZ(98)); // 江子翠
  ctx.lineTo(screenX(-160), screenZ(115));
  ctx.quadraticCurveTo(screenX(-120), screenZ(125), screenX(-80), screenZ(135));
  ctx.quadraticCurveTo(screenX(-10), screenZ(160), screenX(55), screenZ(205));
  ctx.quadraticCurveTo(screenX(85), screenZ(275), screenX(95), screenZ(360));
  ctx.closePath();
  ctx.fill();

  // (4) 大漢溪 (Dahan River): 從新莊三峽樹林向東流至江子翠
  ctx.beginPath();
  ctx.moveTo(screenX(-420), screenZ(145));
  ctx.quadraticCurveTo(screenX(-280), screenZ(130), screenX(-160), screenZ(98));
  ctx.lineTo(screenX(-160), screenZ(115));
  ctx.quadraticCurveTo(screenX(-280), screenZ(148), screenX(-420), screenZ(165));
  ctx.closePath();
  ctx.fill();

  // 0.4 六大捷運發光路網 (6 Glowing Metro Corridors - 視錐剔除與雙筆刷光暈優化)
  function drawMetroCorridor(points, color, name) {
    if (points.length < 2) return;
    let anyInView = false;
    for (let i = 0; i < points.length; i++) {
      if (isInViewport(points[i][0], points[i][1], 80)) { anyInView = true; break; }
    }
    if (!anyInView) return;

    // 外層光暈 (使用輕量透明雙筆刷，取代卡頓元兇 shadowBlur)
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(5.5, scale * 0.35);
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.moveTo(screenX(points[0][0]), screenZ(points[0][1]));
    for (let i = 1; i < points.length; i++) ctx.lineTo(screenX(points[i][0]), screenZ(points[i][1]));
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // 核心亮線
    ctx.lineWidth = Math.max(3.2, scale * 0.22);
    ctx.beginPath();
    ctx.moveTo(screenX(points[0][0]), screenZ(points[0][1]));
    for (let i = 1; i < points.length; i++) ctx.lineTo(screenX(points[i][0]), screenZ(points[i][1]));
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.2, scale * 0.08);
    ctx.beginPath();
    ctx.moveTo(screenX(points[0][0]), screenZ(points[0][1]));
    for (let i = 1; i < points.length; i++) ctx.lineTo(screenX(points[i][0]), screenZ(points[i][1]));
    ctx.stroke();

    points.forEach((pt) => {
      if (!isInViewport(pt[0], pt[1], 15)) return;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(screenX(pt[0]), screenZ(pt[1]), Math.max(2.5, scale * 0.16), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
      if (pt[2] && scale >= 3.0) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = `bold ${Math.max(8, scale * 0.35)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(pt[2], screenX(pt[0]), screenZ(pt[1] - 4));
      }
    });
  }

  // 🔴 淡水信義線 (Red Line)
  drawMetroCorridor([
    [-240, -340, "淡水"], [-230, -270, "關渡"], [-180, -250, "北投"], [-90, -210, "士林"],
    [50, -180, "圓山"], [78, -95, "中山"], [0, 0, "台北車站"], [30, 120, "中正紀念堂"],
    [140, 80, "大安"], [230, 50, "台北101"], [280, 70, "象山"]
  ], '#ef4444', "淡水信義線");

  // 🔵 板南線 (Blue Line)
  drawMetroCorridor([
    [-320, 220, "頂埔"], [-200, 170, "新埔"], [-130, 130, "板橋"], [-120, 110, "江子翠"],
    [-160, 80, "龍山寺"], [-160, 25, "西門"], [0, 0, "台北車站"], [150, 0, "忠孝復興"],
    [230, 0, "市政府"], [360, -20, "南港展覽館"]
  ], '#3b82f6', "板南線");

  // 🟢 松山新店線 (Green Line)
  drawMetroCorridor([
    [80, 310, "新店"], [60, 220, "景美"], [40, 160, "公館"], [30, 120, "中正紀念堂"],
    [-160, 25, "西門"], [78, -95, "中山"], [155, -95, "松江南京"], [185, -95, "南京復興"],
    [290, -95, "松山"]
  ], '#10b981', "松山新店線");

  // 🟠 中和新蘆線 (Orange Line)
  drawMetroCorridor([
    [-20, 210, "南勢角"], [-40, 180, "景安"], [20, 130, "古亭"], [155, -95, "松江南京"],
    [60, -195, "民權西路"], [-220, -170, "三重"], [-240, -210, "蘆洲"]
  ], '#f97316', "中和新蘆線");

  // 🟤 文湖線 (Brown Line)
  drawMetroCorridor([
    [200, 240, "動物園"], [160, 110, "科技大樓"], [140, 80, "大安"], [150, 0, "忠孝復興"],
    [185, -95, "南京復興"], [185, -150, "松山機場"], [130, -170, "劍南路"], [260, -140, "港墘"],
    [350, -60, "南港軟體園區"]
  ], '#a16207', "文湖線");

  // 🟡 環狀線 (Circular Line)
  drawMetroCorridor([
    [70, 260, "大坪林"], [-40, 180, "景安"], [-130, 130, "板橋車站"], [-220, 100, "頭前庄"],
    [-240, 60, "新北產業園區"]
  ], '#eab308', "環狀線");

  // 🟣 桃園機場捷運雙北段 (Airport MRT)
  drawMetroCorridor([
    [0, 0, "A1台北車站"], [-220, -170, "A2三重"], [-240, 60, "A3新北產業園區"], [-280, 80, "A4新莊副都心"]
  ], '#8246af', "機場捷運");

  // 🩵 淡海輕軌 (Danhai LRT)
  drawMetroCorridor([
    [-240, -340, "紅樹林"], [-250, -380, "崁頂/漁人碼頭"]
  ], '#0099cc', "淡海輕軌");

  // 🩷 安坑輕軌 (Ankeng LRT)
  drawMetroCorridor([
    [70, 260, "十四張"], [60, 340, "雙城"]
  ], '#e67799', "安坑輕軌");

  // 🚅 台灣高鐵走廊 (THSR High Speed Rail Dedicated Corridor)
  function drawHighSpeedRailCorridor(points) {
    if (points.length < 2) return;
    let anyInView = false;
    for (let i = 0; i < points.length; i++) {
      if (isInViewport(points[i][0], points[i][1], 80)) { anyInView = true; break; }
    }
    if (!anyInView) return;

    // 橘色外光暈 (取代 shadowBlur)
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = Math.max(8, scale * 0.5);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(screenX(points[0][0]), screenZ(points[0][1]));
    for (let i = 1; i < points.length; i++) ctx.lineTo(screenX(points[i][0]), screenZ(points[i][1]));
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.lineWidth = Math.max(5, scale * 0.35);
    ctx.beginPath();
    ctx.moveTo(screenX(points[0][0]), screenZ(points[0][1]));
    for (let i = 1; i < points.length; i++) ctx.lineTo(screenX(points[i][0]), screenZ(points[i][1]));
    ctx.stroke();

    // 橘白虛線代表高鐵電氣化極速軌道
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = Math.max(2.2, scale * 0.15);
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(screenX(points[0][0]), screenZ(points[0][1]));
    for (let i = 1; i < points.length; i++) ctx.lineTo(screenX(points[i][0]), screenZ(points[i][1]));
    ctx.stroke();
    ctx.setLineDash([]);

    points.forEach(pt => {
      if (!isInViewport(pt[0], pt[1], 15)) return;
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(screenX(pt[0]), screenZ(pt[1]), Math.max(4, scale * 0.25), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (pt[2] && scale >= 2.5) {
        ctx.fillStyle = '#fdba74';
        ctx.font = `bold ${Math.max(9, scale * 0.4)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`🚅 ${pt[2]}`, screenX(pt[0]), screenZ(pt[1] - 6));
      }
    });
  }

  drawHighSpeedRailCorridor([
    [360, -20, "高鐵南港"], [0, 0, "高鐵台北"], [-130, 130, "高鐵板橋"], [-260, 240, "往桃園青埔"]
  ]);

  // 🚆 臺灣鐵路縱貫線 (TRA Western Main Line & Yilan Line)
  function drawRailroadTrackCorridor(points) {
    if (points.length < 2) return;
    let anyInView = false;
    for (let i = 0; i < points.length; i++) {
      if (isInViewport(points[i][0], points[i][1], 80)) { anyInView = true; break; }
    }
    if (!anyInView) return;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = Math.max(6, scale * 0.38);
    ctx.beginPath();
    ctx.moveTo(screenX(points[0][0]), screenZ(points[0][1]));
    for (let i = 1; i < points.length; i++) ctx.lineTo(screenX(points[i][0]), screenZ(points[i][1]));
    ctx.stroke();

    // 鐵道枕木交錯線
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(2.5, scale * 0.16);
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(screenX(points[0][0]), screenZ(points[0][1]));
    for (let i = 1; i < points.length; i++) ctx.lineTo(screenX(points[i][0]), screenZ(points[i][1]));
    ctx.stroke();
    ctx.setLineDash([]);

    points.forEach(pt => {
      if (!isInViewport(pt[0], pt[1], 15)) return;
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(screenX(pt[0]), screenZ(pt[1]), Math.max(3.5, scale * 0.22), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (pt[2] && scale >= 2.5) {
        ctx.fillStyle = '#7dd3fc';
        ctx.font = `bold ${Math.max(9, scale * 0.38)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`🚆 ${pt[2]}`, screenX(pt[0]), screenZ(pt[1] - 5));
      }
    });
  }

  drawRailroadTrackCorridor([
    [380, -40, "汐止"], [360, -20, "南港"], [290, -95, "松山"], [0, 0, "臺北車站"],
    [-160, 80, "萬華"], [-130, 130, "板橋車站"], [-200, 210, "樹林"], [-310, 290, "鶯歌"]
  ]);

  // 0.5 雙北全境東西向延伸大動脈 (Macro Arterials Extents)
  ctx.fillStyle = '#2d3748';
  // 忠孝東路三段至七段 (往信義、南港延伸, z: 0)
  ctx.fillRect(screenX(220), screenZ(-16), 200 * scale, 32 * scale);
  // 信義路 (信義計畫區軸線, z: 50)
  ctx.fillRect(screenX(0), screenZ(40), 420 * scale, 22 * scale);
  // 仁愛路 (林蔭大道, z: 25)
  ctx.fillRect(screenX(0), screenZ(15), 420 * scale, 24 * scale);
  // 南京東路二段至六段 (往松山、內湖延伸, z: -95)
  ctx.fillRect(screenX(220), screenZ(-108), 200 * scale, 26 * scale);
  // 基隆路一段 (穿越南北向金融幹道, x: 230)
  ctx.fillRect(screenX(218), screenZ(-150), 24 * scale, 300 * scale);
  // 新北三重重新路 (x: -420 ~ -220, z: -10 ~ 10)
  ctx.fillRect(screenX(-420), screenZ(-12), 200 * scale, 24 * scale);
  // 新莊中正路 (x: -420 ~ -200, z: 90 ~ 110)
  ctx.fillRect(screenX(-420), screenZ(88), 220 * scale, 24 * scale);

  // 0.6 著名地標立體科技剪影 (台北101、圓山大飯店、大直美麗華、淡水情人橋、大安森林公園 - 視錐剔除)
  // (1) 台北 101 大樓 (Taipei 101, x: 230, z: 50)
  if (isInViewport(230, 50, 40)) {
    const sx101 = screenX(230);
    const sz101 = screenZ(50);
    ctx.fillStyle = '#0f766e'; // 科技竹節綠
    for (let s = 0; s < 8; s++) {
      const sw = (20 - s * 1.5) * scale * 0.4;
      const sh = 10 * scale * 0.4;
      ctx.fillRect(sx101 - sw / 2, sz101 - s * sh, sw, sh);
      ctx.strokeStyle = '#2dd4bf';
      ctx.strokeRect(sx101 - sw / 2, sz101 - s * sh, sw, sh);
    }
    // 101 避雷天線與頂部激光
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(sx101 - 1, sz101 - 8 * 10 * scale * 0.4 - 15, 2, 15);
    ctx.beginPath();
    ctx.arc(sx101, sz101 - 8 * 10 * scale * 0.4 - 15, 3, 0, Math.PI * 2);
    ctx.fill();
    if (scale >= 1.5) {
      ctx.fillStyle = '#6ee7b7';
      ctx.font = `bold ${Math.max(9, scale * 0.45)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🏙️ 台北 101 (Taipei 101)', sx101, sz101 + 14);
    }
  }

  // (2) 圓山大飯店 (The Grand Hotel, x: 50, z: -180)
  if (isInViewport(50, -180, 40)) {
    const sxGrand = screenX(50);
    const szGrand = screenZ(-180);
    ctx.fillStyle = '#991b1b'; // 宮殿紅
    ctx.fillRect(sxGrand - 18 * scale * 0.35, szGrand - 10 * scale * 0.35, 36 * scale * 0.35, 20 * scale * 0.35);
    ctx.fillStyle = '#f59e0b'; // 金色琉璃屋頂
    ctx.beginPath();
    ctx.moveTo(sxGrand - 22 * scale * 0.35, szGrand - 10 * scale * 0.35);
    ctx.lineTo(sxGrand + 22 * scale * 0.35, szGrand - 10 * scale * 0.35);
    ctx.lineTo(sxGrand, szGrand - 20 * scale * 0.35);
    ctx.closePath();
    ctx.fill();
    if (scale >= 1.8) {
      ctx.fillStyle = '#fde68a';
      ctx.font = `bold ${Math.max(8.5, scale * 0.4)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🏛️ 圓山大飯店', sxGrand, szGrand + 12);
    }
  }

  // (3) 大直美麗華摩天輪 (Miramar Ferris Wheel, x: 130, z: -160)
  if (isInViewport(130, -160, 40)) {
    const sxFerris = screenX(130);
    const szFerris = screenZ(-160);
    const wheelAng = (Date.now() / 2500) % (Math.PI * 2);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sxFerris, szFerris, 14 * scale * 0.35, 0, Math.PI * 2);
    ctx.stroke();
    for (let sp = 0; sp < 6; sp++) {
      const a = wheelAng + (sp * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(sxFerris, szFerris);
      ctx.lineTo(sxFerris + Math.cos(a) * 14 * scale * 0.35, szFerris + Math.sin(a) * 14 * scale * 0.35);
      ctx.stroke();
    }
    if (scale >= 1.8) {
      ctx.fillStyle = '#6ee7b7';
      ctx.font = `bold ${Math.max(8, scale * 0.4)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🎡 大直美麗華', sxFerris, szFerris + 12);
    }
  }

  // (4) 大安森林公園 (Daan Forest Park, x: 120, z: 80)
  if (isInViewport(120, 80, 50)) {
    ctx.fillStyle = '#14532d';
    drawSafeRoundRect(ctx, screenX(100), screenZ(65), 45 * scale, 35 * scale, 8);
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.stroke();
    if (scale >= 1.8) {
      ctx.fillStyle = '#86efac';
      ctx.font = `bold ${Math.max(8.5, scale * 0.42)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🌲 大安森林公園', screenX(122), screenZ(82));
    }
  }

  // (5) 關渡大橋 (Guandu Bridge, x: -220, z: -270)
  if (isInViewport(-220, -270, 50)) {
    const sxgd = screenX(-220);
    const szgd = screenZ(-270);
    ctx.strokeStyle = '#ef4444'; // 經典鮮紅鋼拱
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sxgd, szgd, 16 * scale * 0.3, Math.PI, 0);
    ctx.stroke();
    if (scale >= 1.8) {
      ctx.fillStyle = '#fca5a5';
      ctx.font = `bold ${Math.max(8, scale * 0.4)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🌉 關渡大橋 (紅拱)', sxgd, szgd + 10);
    }
  }

  // (6) 淡水老街與金色水岸 (Tamsui Promenade, x: -225, z: -320)
  if (isInViewport(-225, -320, 50) && scale >= 1.8) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = `bold ${Math.max(9, scale * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🌊 淡水老街金色水岸 ✕ 八里左岸', screenX(-225), screenZ(-320));
  }

  // ──────────────────────────────────────────
  // 第一層：地表鋪面與 1:1 真實雙北街廓拓撲 (Ground Roads & Contiguous Metropolis Topology)
  // 【超高畫質向量渲染重構：徹底解決「整張地圖放大之後背景變模糊」！】
  // 1. 全域 Retina HiDPI Canvas：高達 2.0x~2.5x 物理像素密度，消除畫布雙線性模糊！
  // 2. 街廓微觀石材地坪網格：scale >= 4.0 時鋪滿真實都會石材鋪面，消除空洞模糊漸層！
  // 3. 高解析度道路鋪面與標線：車道白實線、車道分道虛線、路緣石立體高光、人行道透水地磚、水溝蓋格柵、黃色導盲磚！
  // ──────────────────────────────────────────

  // 0.8 雙北核心城區微觀地坪石材網格 (Urban Plaza & Block Base Paving - scale >= 4.0 時自動呈現，微觀特寫清晰無比)
  if (scale >= 4.0) {
    const tilePitch = scale >= 25.0 ? 1.0 : (scale >= 10.0 ? 2.5 : 5.0); // 隨縮放精細遞進之 1m~5m 模組化石板
    const baseMinX = Math.max(-240, minWorldX - 10);
    const baseMaxX = Math.min(240, maxWorldX + 10);
    const baseMinZ = Math.max(-240, minWorldZ - 10);
    const baseMaxZ = Math.min(240, maxWorldZ + 10);

    if (baseMinX < baseMaxX && baseMinZ < baseMaxZ) {
      // 核心基底深灰藍石材地坪 (告別模糊純黑或空洞漸層)
      ctx.fillStyle = '#0b1324';
      ctx.fillRect(screenX(baseMinX), screenZ(baseMinZ), (baseMaxX - baseMinX) * scale, (baseMaxZ - baseMinZ) * scale);

      // 石板接縫向量線 (純向量繪製，永遠保持 1px 極致銳利，絕不模糊！)
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const sBaseX = Math.floor(baseMinX / tilePitch) * tilePitch;
      for (let bx = sBaseX; bx <= baseMaxX; bx += tilePitch) {
        ctx.moveTo(screenX(bx), screenZ(baseMinZ));
        ctx.lineTo(screenX(bx), screenZ(baseMaxZ));
      }
      const sBaseZ = Math.floor(baseMinZ / tilePitch) * tilePitch;
      for (let bz = sBaseZ; bz <= baseMaxZ; bz += tilePitch) {
        ctx.moveTo(screenX(baseMinX), screenZ(bz));
        ctx.lineTo(screenX(baseMaxX), screenZ(bz));
      }
      ctx.stroke();

      // 在超特寫 scale >= 16.0 時繪製石材交錯十字接縫高光點，營造精緻人行徒步區地磚質感
      if (scale >= 16.0 && (baseMaxX - baseMinX) <= 100 && (baseMaxZ - baseMinZ) <= 100) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
        for (let bx = sBaseX; bx <= baseMaxX; bx += tilePitch * 2) {
          for (let bz = sBaseZ; bz <= baseMaxZ; bz += tilePitch * 2) {
            ctx.fillRect(screenX(bx) - 1, screenZ(bz) - 1, 2, 2);
          }
        }
      }
    }
  }

  // 高解析度人孔蓋繪製輔助函式 (Manhole Cover Vector)
  function drawManholeCover(mx, mz) {
    if (!isInViewport(mx, mz, 5)) return;
    const sx = screenX(mx);
    const sz = screenZ(mz);
    const mr = Math.max(2.5, scale * 0.45);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(sx, sz, mr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = Math.max(1, scale * 0.05);
    ctx.stroke();
    // 鑄鐵防滑十字花紋
    ctx.beginPath();
    ctx.moveTo(sx - mr * 0.6, sz);
    ctx.lineTo(sx + mr * 0.6, sz);
    ctx.moveTo(sx, sz - mr * 0.6);
    ctx.lineTo(sx, sz + mr * 0.6);
    ctx.stroke();
  }

  // 高解析度車道導向箭頭繪製輔助函式 (Lane Arrow Vector)
  function drawRoadLaneArrow(ax, az, dir = 'straight') {
    if (scale < 12.0) return;
    if (!isInViewport(ax, az, 6)) return;
    const sx = screenX(ax);
    const sz = screenZ(az);
    const aLen = Math.max(3, scale * 0.5);
    const aW = Math.max(1.8, scale * 0.22);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    if (dir === 'straight') {
      ctx.moveTo(sx, sz - aLen);
      ctx.lineTo(sx + aW, sz - aLen * 0.35);
      ctx.lineTo(sx + aW * 0.35, sz - aLen * 0.35);
      ctx.lineTo(sx + aW * 0.35, sz + aLen);
      ctx.lineTo(sx - aW * 0.35, sz + aLen);
      ctx.lineTo(sx - aW * 0.35, sz - aLen * 0.35);
      ctx.lineTo(sx - aW, sz - aLen * 0.35);
    }
    ctx.closePath();
    ctx.fill();
  }

  // 1. 東西向 9 大主要幹道與街廓 (East-West Major Arterials)
  // (1) 民權西路 / 民權東路 (z: -195, 寬 24m)
  ctx.fillStyle = '#1e2530';
  ctx.fillRect(screenX(-220), screenZ(-207), 440 * scale, 24 * scale);
  // 車道外側白實線
  if (scale >= 5.0) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(screenX(-220), screenZ(-207), 440 * scale, Math.max(1, scale * 0.1));
    ctx.fillRect(screenX(-220), screenZ(-183 - Math.max(0.1, 1 / scale)), 440 * scale, Math.max(1, scale * 0.1));
  }
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-220), screenZ(-195.4), 440 * scale, 0.8 * scale);

  // (2) 民生西路 / 民生東路 (z: -140, 寬 22m)
  ctx.fillStyle = '#1e2530';
  ctx.fillRect(screenX(-220), screenZ(-151), 440 * scale, 22 * scale);
  if (scale >= 5.0) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(screenX(-220), screenZ(-151), 440 * scale, Math.max(1, scale * 0.1));
    ctx.fillRect(screenX(-220), screenZ(-129 - Math.max(0.1, 1 / scale)), 440 * scale, Math.max(1, scale * 0.1));
  }
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-220), screenZ(-140.4), 440 * scale, 0.8 * scale);

  // (3) 南京西路 / 南京東路 (z: -95, 寬 26m)
  ctx.fillStyle = '#1e2530';
  ctx.fillRect(screenX(-220), screenZ(-108), 440 * scale, 26 * scale);
  if (scale >= 5.0) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(screenX(-220), screenZ(-108), 440 * scale, Math.max(1, scale * 0.1));
    ctx.fillRect(screenX(-220), screenZ(-82 - Math.max(0.1, 1 / scale)), 440 * scale, Math.max(1, scale * 0.1));
  }
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-220), screenZ(-95.4), 440 * scale, 0.8 * scale);

  // (4) 長安西路 / 長安東路 (z: -48, 寬 20m)
  ctx.fillStyle = '#1e2530';
  ctx.fillRect(screenX(-220), screenZ(-58), 440 * scale, 20 * scale);
  if (scale >= 5.0) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(screenX(-220), screenZ(-58), 440 * scale, Math.max(1, scale * 0.1));
    ctx.fillRect(screenX(-220), screenZ(-38 - Math.max(0.1, 1 / scale)), 440 * scale, Math.max(1, scale * 0.1));
  }
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-220), screenZ(-48.4), 440 * scale, 0.8 * scale);

  // (4.5) 市民大道一段 (市民高架橋 ✕ 台北車站北側大道, z: -26, 寬 22m)
  ctx.fillStyle = '#111827';
  ctx.fillRect(screenX(-220), screenZ(-37), 440 * scale, 22 * scale);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-220), screenZ(-26.4), 440 * scale, 0.8 * scale);
  // 市民高架水泥高架橋墩 (Elevated Expressway Piers)
  for (let px = -200; px <= 200; px += 40) {
    ctx.fillStyle = '#475569';
    ctx.fillRect(screenX(px - 2), screenZ(-31), 4 * scale, 10 * scale);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(screenX(px - 1.5), screenZ(-30.5), 3 * scale, 9 * scale);
  }

  // (5) 忠孝西路一段 / 忠孝東路一段 (z: 0, 寬 36m，台北都會樞紐大動脈)
  ctx.fillStyle = '#1e2530';
  ctx.fillRect(screenX(-220), screenZ(-18), 440 * scale, 36 * scale);

  // 忠孝西路 中央公車專用道 (深藍柏油，z: -5 ~ 5)
  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(screenX(-220), screenZ(-5), 440 * scale, 10 * scale);
  // 公車專用道白色虛線分道線
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = Math.max(1.2, scale * 0.1);
  ctx.setLineDash([Math.max(4, scale * 1.2), Math.max(4, scale * 1.2)]);
  ctx.beginPath();
  ctx.moveTo(screenX(-220), screenZ(-5));
  ctx.lineTo(screenX(220), screenZ(-5));
  ctx.moveTo(screenX(-220), screenZ(5));
  ctx.lineTo(screenX(220), screenZ(5));
  ctx.stroke();
  ctx.setLineDash([]);

  // 車道外側白實線
  if (scale >= 4.5) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(screenX(-220), screenZ(-18), 440 * scale, Math.max(1, scale * 0.12));
    ctx.fillRect(screenX(-220), screenZ(18 - Math.max(0.12, 1.2 / scale)), 440 * scale, Math.max(1, scale * 0.12));

    // 一般車道分道虛線 (z = -11.5 與 z = 11.5)
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.7)';
    ctx.lineWidth = Math.max(1, scale * 0.08);
    ctx.setLineDash([Math.max(3, scale * 0.8), Math.max(4, scale * 1.0)]);
    ctx.beginPath();
    ctx.moveTo(screenX(-220), screenZ(-11.5));
    ctx.lineTo(screenX(220), screenZ(-11.5));
    ctx.moveTo(screenX(-220), screenZ(11.5));
    ctx.lineTo(screenX(220), screenZ(11.5));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 雙黃線 (z: 0)
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-220), screenZ(-0.4), 440 * scale, 0.8 * scale);

  // 忠孝西路 南北兩側人行道石板地磚與立體路緣石
  ctx.fillStyle = '#334155';
  ctx.fillRect(screenX(-220), screenZ(-36), 440 * scale, 18 * scale);
  ctx.fillRect(screenX(-220), screenZ(18), 440 * scale, 18 * scale);

  // 人行道微觀地磚與路緣石立體高光 (scale >= 6.0 時呈現)
  if (scale >= 6.0) {
    // 北側路緣石立體高光與水溝陰影 (z: -18)
    ctx.fillStyle = '#64748b';
    ctx.fillRect(screenX(-220), screenZ(-18.6), 440 * scale, 0.6 * scale);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(screenX(-220), screenZ(-18), 440 * scale, 0.3 * scale);

    // 南側路緣石立體高光與水溝陰影 (z: 18)
    ctx.fillStyle = '#64748b';
    ctx.fillRect(screenX(-220), screenZ(18), 440 * scale, 0.6 * scale);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(screenX(-220), screenZ(18.6), 440 * scale, 0.3 * scale);

    // 人行道黃色導盲磚引導帶 (Tactile Warning Strip)
    ctx.fillStyle = '#eab308';
    ctx.fillRect(screenX(-220), screenZ(-23), 440 * scale, 0.6 * scale);
    ctx.fillRect(screenX(-220), screenZ(23), 440 * scale, 0.6 * scale);

    // 人行道石板橫向接縫線
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let jx = -220; jx <= 220; jx += 4) {
      ctx.moveTo(screenX(jx), screenZ(-36));
      ctx.lineTo(screenX(jx), screenZ(-18.6));
      ctx.moveTo(screenX(jx), screenZ(18.6));
      ctx.lineTo(screenX(jx), screenZ(36));
    }
    ctx.stroke();
  }

  // 高解析度地面標線與鑄鐵人孔蓋 (scale >= 14.0)
  if (scale >= 14.0) {
    for (let ax = -180; ax <= 180; ax += 30) {
      drawRoadLaneArrow(ax, -14.5, 'straight');
      drawRoadLaneArrow(ax, 14.5, 'straight');
      drawManholeCover(ax + 15, -13);
      drawManholeCover(ax + 15, 13);
    }
  }

  // (6) 許昌街 / 開封街一段 (z: 44, 寬 18m)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(-130), screenZ(35), 205 * scale, 18 * scale);

  // (7) 漢口街一段 / 武昌街一段 (z: 72, 寬 18m)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(-220), screenZ(63), 295 * scale, 18 * scale);

  // (8) 衡陽路 / 襄陽路 (z: 98, 寬 20m)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(-220), screenZ(88), 295 * scale, 20 * scale);

  // (8.5) 凱達格蘭大道 ✕ 愛國西路 (z: 112, 寬 24m)
  ctx.fillStyle = '#1e242d';
  ctx.fillRect(screenX(-140), screenZ(100), 220 * scale, 24 * scale);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-140), screenZ(111.6), 220 * scale, 0.8 * scale);

  // (9) 板橋縣民大道一段 (z: 130, 寬 26m，新板特區綠帶大道)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(-220), screenZ(117), 220 * scale, 26 * scale);
  ctx.fillStyle = '#15803d'; // 中央安全島綠帶
  ctx.fillRect(screenX(-220), screenZ(128.5), 220 * scale, 3 * scale);

  // (10) 板橋學府路一段 (特別由玩家點名指定！z: 168, 寬 26m)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(-220), screenZ(155), 220 * scale, 26 * scale);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(screenX(-220), screenZ(168));
  ctx.lineTo(screenX(0), screenZ(168));
  ctx.stroke();
  ctx.setLineDash([]);
  // 學府路一段人行道
  ctx.fillStyle = '#475569';
  ctx.fillRect(screenX(-220), screenZ(149), 220 * scale, 6 * scale);
  ctx.fillRect(screenX(-220), screenZ(181), 220 * scale, 6 * scale);

  // (11) 板橋文化路一段 / 府中路 (z: 195, 寬 28m)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(-220), screenZ(181), 260 * scale, 28 * scale);

  // 2. 南北向 9 大主要幹道與街廓 (North-South Major Arterials)
  // (1) 淡水河畔環河路 / 迪化街一段 (x: -185, 寬 22m, z: -220 ~ 0)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(-196), screenZ(-220), 22 * scale, 220 * scale);

  // (2) 萬華漢中街 (西門町徒步區) (x: -178, 寬 20m, z: 0 ~ 115)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(-188), screenZ(0), 20 * scale, 115 * scale);

  // (3) 大同延平北路二段/三段 (x: -145, 寬 22m, z: -220 ~ 0)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(-156), screenZ(-220), 22 * scale, 220 * scale);

  // (4) 萬華中華路一段 (林蔭大道，寬 32m, z: 0 ~ 115)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(-161), screenZ(0), 32 * scale, 115 * scale);
  ctx.fillStyle = '#15803d'; // 中央綠帶
  ctx.fillRect(screenX(-147), screenZ(0), 4 * scale, 115 * scale);

  // (5) 大同重慶北路二段/三段 (x: -85, 寬 26m, z: -220 ~ 0)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(-98), screenZ(-220), 26 * scale, 220 * scale);

  // (6) 中正重慶南路一段 (書店街) (x: -92, 寬 24m, z: 0 ~ 140)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(-104), screenZ(0), 24 * scale, 140 * scale);

  // (7) 大同寧夏路 (夜市街區) (x: -55, 寬 20m, z: -220 ~ 0)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(-65), screenZ(-220), 20 * scale, 220 * scale);

  // (8) 站前館前路 (x: -32, 寬 22m, z: 0 ~ 115)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(-43), screenZ(0), 22 * scale, 115 * scale);

  // (9) 站前南陽街 (x: 15, 寬 18m, z: 20 ~ 115)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(6), screenZ(20), 18 * scale, 95 * scale);

  // (10) 站前公園路 (x: 48, 寬 24m, z: 0 ~ 115)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(36), screenZ(0), 24 * scale, 115 * scale);

  // (11) 中山北路一段/二段 (樟樹林蔭大道，寬 36m, z: -220 ~ 30)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(60), screenZ(-220), 36 * scale, 250 * scale);
  ctx.fillStyle = '#15803d'; // 中央綠蔭安全島
  ctx.fillRect(screenX(76), screenZ(-220), 4 * scale, 250 * scale);
  ctx.fillStyle = '#475569'; // 東側人行道
  ctx.fillRect(screenX(96), screenZ(-220), 20 * scale, 250 * scale);

  // (12) 林森北路 (條通商圈) (x: 108, 寬 22m, z: -220 ~ 30)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(97), screenZ(-220), 22 * scale, 250 * scale);

  // (13) 松江路 (金融商圈) (x: 155, 寬 28m, z: -220 ~ 140)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(141), screenZ(-220), 28 * scale, 360 * scale);

  // (14) 復興北路/南路 (文湖線軸線) (x: 185, 寬 28m, z: -220 ~ 140)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(171), screenZ(-220), 28 * scale, 360 * scale);

  // (15) 板橋府中路 / 重慶路 (x: -175 ~ -110, z: 120 ~ 220)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(screenX(-185), screenZ(120), 24 * scale, 100 * scale);
  ctx.fillRect(screenX(-155), screenZ(120), 24 * scale, 100 * scale);

  // 3. 雙北天然地理界線：淡水河 ✕ 新店溪 ✕ 跨市地標大橋 (Tamsui River, Xindian River & Inter-City Bridges)
  const waveOffset = (Date.now() / 300) % 12;

  // (1) 淡水河主河道 (大同區 ✕ 萬華區西側，x: -220 ~ -195, z: -220 ~ 20)
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(screenX(-220), screenZ(-220), 25 * scale, 240 * scale);
  ctx.fillStyle = '#38bdf8';
  for (let wy = -215; wy <= 15; wy += 14) {
    ctx.fillRect(screenX(-218 + waveOffset), screenZ(wy), 18 * scale, 1.8 * scale);
  }

  // (2) 忠孝橋 (跨淡水河連接台北與三重，x: -220 ~ -195, z: -8 ~ 8)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(screenX(-220), screenZ(-8), 26 * scale, 16 * scale);
  ctx.fillStyle = '#f59e0b'; // 中央分隔線
  ctx.fillRect(screenX(-220), screenZ(-0.4), 26 * scale, 0.8 * scale);
  // 忠孝橋白色防撞護欄
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(screenX(-220), screenZ(-8), 26 * scale, 1.5 * scale);
  ctx.fillRect(screenX(-220), screenZ(6.5), 26 * scale, 1.5 * scale);
  ctx.fillStyle = '#38bdf8';
  ctx.font = `bold ${Math.max(7, scale * 0.42)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('忠孝橋 (往三重)', screenX(-208), screenZ(2.5));

  // (3) 新店溪天然界河 (萬華區 ✕ 板橋區天然分界，x: -220 ~ -110, z: 98 ~ 124)
  // 北側：萬華雙園河濱綠帶；南側：板橋江子翠河濱綠帶
  ctx.fillStyle = '#14532d';
  ctx.fillRect(screenX(-220), screenZ(95), 115 * scale, 3 * scale);
  ctx.fillRect(screenX(-220), screenZ(124), 115 * scale, 3 * scale);
  // 新店溪湛藍水面
  ctx.fillStyle = '#0369a1';
  ctx.fillRect(screenX(-220), screenZ(98), 115 * scale, 26 * scale);
  ctx.fillStyle = '#38bdf8';
  for (let wx = -215; wx <= -115; wx += 22) {
    for (let wz = 101; wz <= 120; wz += 7) {
      ctx.fillRect(screenX(wx + ((wz % 2) * 6) + waveOffset), screenZ(wz), 12 * scale, 1.5 * scale);
    }
  }

  // (4) 華翠大橋 (跨新店溪連接萬華中華路與板橋縣民大道，307公車行駛之跨市大橋，x: -156 ~ -138, z: 98 ~ 124)
  ctx.fillStyle = '#1e293b'; // 橋面柏油
  ctx.fillRect(screenX(-156), screenZ(96), 18 * scale, 30 * scale);
  // 橋面中央雙黃線
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-147.4), screenZ(96), 0.8 * scale, 30 * scale);
  // 兩側白色安全護欄
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(screenX(-156), screenZ(96), 1.5 * scale, 30 * scale);
  ctx.fillRect(screenX(-139.5), screenZ(96), 1.5 * scale, 30 * scale);
  // 紅色鋼拱桁架剪影 (Steel Arch Silhouette)
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(screenX(-156), screenZ(96));
  ctx.quadraticCurveTo(screenX(-147), screenZ(111), screenX(-156), screenZ(126));
  ctx.moveTo(screenX(-138), screenZ(96));
  ctx.quadraticCurveTo(screenX(-147), screenZ(111), screenX(-138), screenZ(126));
  ctx.stroke();
  // 橋名路標指示
  ctx.fillStyle = '#fbbf24';
  ctx.font = `bold ${Math.max(7.5, scale * 0.45)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('🌉 華翠大橋 (跨新店溪 往新板)', screenX(-147), screenZ(112));

  // (5) 華江橋 (跨新店溪連接萬華和平西路與板橋文化路，x: -198 ~ -180, z: 98 ~ 124)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(screenX(-198), screenZ(96), 18 * scale, 30 * scale);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-189.4), screenZ(96), 0.8 * scale, 30 * scale);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(screenX(-198), screenZ(96), 1.5 * scale, 30 * scale);
  ctx.fillRect(screenX(-181.5), screenZ(96), 1.5 * scale, 30 * scale);
  ctx.fillStyle = '#93c5fd';
  ctx.font = `bold ${Math.max(7, scale * 0.42)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('華江橋 (往文化路)', screenX(-189), screenZ(112));

  // 4. 十字路口精密斑馬線 (綠斑馬線，參考台北狂飆台味特色 - 視錐剔除)
  function drawGreenZebraCrossing(gx, gz, gw, gh, isVertical=false) {
    if (!isInViewport(gx + gw / 2, gz + gh / 2, Math.max(gw, gh) + 15)) return;
    const sx = screenX(gx);
    const sz = screenZ(gz);
    ctx.fillStyle = '#15803d'; // 台灣標準交通部綠底
    ctx.fillRect(sx, sz, gw * scale, gh * scale);
    ctx.fillStyle = '#ffffff'; // 白色斑馬反光條
    if (isVertical) {
      for (let y = 1; y < gh - 2; y += 4.5) {
        ctx.fillRect(sx + 1 * scale, sz + y * scale, (gw - 2) * scale, 2.2 * scale);
      }
    } else {
      for (let x = 1; x < gw - 2; x += 4.5) {
        ctx.fillRect(sx + x * scale, sz + 1 * scale, 2.2 * scale, (gh - 2) * scale);
      }
    }
  }

  // 中山北路 ✕ 忠孝西路 綠斑馬線
  drawGreenZebraCrossing(54, -18, 6, 36, true);
  drawGreenZebraCrossing(96, -18, 6, 36, true);
  // 館前路 ✕ 忠孝西路
  drawGreenZebraCrossing(-43, 17, 24, 6, false);
  // 重慶南路 ✕ 忠孝西路
  drawGreenZebraCrossing(-104, 17, 24, 6, false);
  // 板橋學府路一段路口斑馬線
  drawGreenZebraCrossing(-62, 154, 6, 28, true);
  drawGreenZebraCrossing(-192, 154, 6, 28, true);

  // 5. 瀝青路面高對比路名與台灣經典綠底路牌標示 (High-Visibility Taiwan Street Signage - 視錐剔除)
  // 【落實委託人指示：地圖預設極致簡化，預設隱藏「民權東路」等看板，按鈕按需啟用】
  function drawTaiwanRoadSign(text, x, z) {
    if (!window.showGameRoadSigns) return;
    if (scale > 15.0) return; // 特寫模式下避免路牌放大成巨大色塊擋住人物視線
    if (!isInViewport(x, z, 35)) return;
    const sx = screenX(x);
    const sz = screenZ(z);
    ctx.save();
    const fontSize = Math.min(13, Math.max(9, scale * 0.45));
    ctx.font = `bold ${fontSize}px sans-serif`;
    const txtWidth = ctx.measureText(text).width + 12;
    const txtHeight = fontSize + 6;
    ctx.fillStyle = '#065f46'; // 經典台灣綠底路牌
    drawSafeRoundRect(ctx, sx - txtWidth / 2, sz - txtHeight / 2, txtWidth, txtHeight, 3);
    ctx.fill();
    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 1.0;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(text, sx, sz + fontSize * 0.35);
    ctx.restore();
  }

  // 台北核心幹道路標
  drawTaiwanRoadSign('🛣️ 忠孝西路一段 ✕ 公車專用道', 0, -1);
  drawTaiwanRoadSign('🛣️ 忠孝東路 (東區商圈 ✕ 市府)', 180, 0);
  drawTaiwanRoadSign('🛣️ 中山北路一段・樟樹林蔭大道', 78, -30);
  drawTaiwanRoadSign('🛣️ 重慶南路一段・書店街', -92, 50);
  drawTaiwanRoadSign('🛣️ 中華路一段・西門町徒步區', -145, 40);
  drawTaiwanRoadSign('🛣️ 南京西路 / 南京東路金融走廊', 120, -93);
  drawTaiwanRoadSign('🛣️ 信義路・世貿 101 大道', 180, 50);
  drawTaiwanRoadSign('🛣️ 仁愛路・林蔭大道', 150, 25);
  drawTaiwanRoadSign('🛣️ 羅斯福路・公館師大文教', 80, 160);
  drawTaiwanRoadSign('🛣️ 民權西路 / 民權東路', 10, -193);
  drawTaiwanRoadSign('🛣️ 承德路 / 大業路・北投溫泉線', 0, -220);
  drawTaiwanRoadSign('🛣️ 木柵路・文山生態走廊', 160, 220);
  drawTaiwanRoadSign('🛣️ 內湖港墘路・科技心臟', 270, -160);
  drawTaiwanRoadSign('🛣️ 南港三重路・南軟經貿', 370, -60);

  // 新北 29 行政特區 1:1 核心幹道路標
  drawTaiwanRoadSign('🛣️ 板橋學府路一段 (1:1 真實商圈)', -110, 169);
  drawTaiwanRoadSign('🛣️ 縣民大道・新板特區', -110, 131);
  drawTaiwanRoadSign('🛣️ 文化路一段・府中商圈', -110, 196);
  drawTaiwanRoadSign('🛣️ 三重重新路・天台商圈', -260, -30);
  drawTaiwanRoadSign('🛣️ 蘆洲三民路・微風水岸', -250, -150);
  drawTaiwanRoadSign('🛣️ 新莊中正路・輔大副都心', -310, 80);
  drawTaiwanRoadSign('🛣️ 中和景平路・科技聚落', -35, 175);
  drawTaiwanRoadSign('🛣️ 永和中正路・樂華生活圈', -65, 135);
  drawTaiwanRoadSign('🛣️ 新店北新路・碧潭水岸', 80, 275);
  drawTaiwanRoadSign('🛣️ 土城中央路・頂埔科技廊道', -120, 250);
  drawTaiwanRoadSign('🛣️ 樹林大安路・調車機廠線', -220, 240);
  drawTaiwanRoadSign('🛣️ 鶯歌文化路・陶瓷水岸', -330, 310);
  drawTaiwanRoadSign('🛣️ 三峽介壽路・藍染老街', -260, 320);
  drawTaiwanRoadSign('🛣️ 淡水淡金路・金色水岸', -230, -320);
  drawTaiwanRoadSign('🛣️ 汐止大同路・新台五路雲端', 390, -30);
  drawTaiwanRoadSign('🛣️ 林口文化一路・影視星雲台地', -380, -180);
  drawTaiwanRoadSign('🛣️ 八里龍米路・左岸水岸線', -310, -300);
  drawTaiwanRoadSign('🛣️ 五股成泰路・水碓觀景', -310, -80);
  drawTaiwanRoadSign('🛣️ 泰山明志路・貴子走廊', -340, 0);
  drawTaiwanRoadSign('🛣️ 瑞芳明燈路・黃金礦嶺九份老街', 480, -60);
  drawTaiwanRoadSign('🛣️ 北海岸淡金公路 (萬里/金山/石門)', -150, -420);
  drawTaiwanRoadSign('🛣️ 平溪十分街・天燈光子水瀑', 430, 160);
  drawTaiwanRoadSign('🛣️ 貢寮福隆街・極東海洋風景線', 560, 210);
  drawTaiwanRoadSign('🛣️ 烏來溫泉街・地熱生態綠廊', 110, 380);

  // 6. 雙北全境 41 行政特區 1:1 微縮銘板 (僅在宏觀 scale <= 7.5 時繪製，特寫時隱藏以消除「看到很多區塊」)
  function drawDistrictBadge(text, x, z, col) {
    if (scale > 7.5) return; // 【核心優化】：放大特寫時隱藏宏觀特區銘板，避免大量色塊遮擋視線！
    if (!isInViewport(x, z, 35)) return;
    const bx = screenX(x);
    const bz = screenZ(z);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    drawSafeRoundRect(ctx, bx - 45 * scale * 0.35, bz - 8 * scale * 0.35, 90 * scale * 0.35, 16 * scale * 0.35, 3);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.font = `bold ${Math.max(9, scale * 0.55)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, bx, bz + 4 * scale * 0.35);
  }

  // 臺北市 12 核心行政特區
  drawDistrictBadge('🏛️ 中正區・站前政經', 0, -28, '#38bdf8');
  drawDistrictBadge('🎮 萬華區・西門艋舺', -178, 25, '#f472b6');
  drawDistrictBadge('🏮 大同區・大稻埕寧夏', -115, -120, '#fbbf24');
  drawDistrictBadge('🌳 中山區・林蔭金融', 78, -115, '#a78bfa');
  drawDistrictBadge('🌲 大安區・森林學府', 120, 80, '#34d399');
  drawDistrictBadge('🏙️ 信義區・台北101', 230, 50, '#f59e0b');
  drawDistrictBadge('🎤 松山區・巨蛋饒河', 230, -95, '#fb7185');
  drawDistrictBadge('🔬 南港區・軟體生技', 370, -60, '#38bdf8');
  drawDistrictBadge('⚡ 內湖區・內科科技園', 270, -160, '#00f0ff');
  drawDistrictBadge('⛩️ 士林區・官邸夜市', -60, -210, '#f43f5e');
  drawDistrictBadge('♨️ 北投區・溫泉地熱', -160, -260, '#a855f7');
  drawDistrictBadge('🍵 文山區・貓空政大', 160, 220, '#10b981');

  // 新北市 29 全境行政特區 (1:1 實裝)
  drawDistrictBadge('🏫 板橋區・學府商圈 (1:1)', -120, 156, '#34d399');
  drawDistrictBadge('🏙️ 板橋區・新板特等門戶', -145, 215, '#10b981');
  drawDistrictBadge('🏭 三重區・重新大都會', -260, -30, '#94a3b8');
  drawDistrictBadge('🌾 蘆洲區・湧蓮微風水岸', -250, -150, '#22d3ee');
  drawDistrictBadge('🛍️ 新莊區・輔大副都心', -310, 80, '#a3e635');
  drawDistrictBadge('🏢 中和區・遠東科技城', -35, 175, '#c084fc');
  drawDistrictBadge('🏮 永和區・頂溪樂華商圈', -65, 135, '#e879f9');
  drawDistrictBadge('🚣 新店區・碧潭水電樞紐', 80, 275, '#22d3ee');
  drawDistrictBadge('🌲 土城區・頂埔科技承天', -120, 250, '#059669');
  drawDistrictBadge('🚆 樹林區・調車場大安紅樹', -220, 240, '#f97316');
  drawDistrictBadge('🏺 鶯歌區・陶瓷古都水岸', -330, 310, '#f472b6');
  drawDistrictBadge('📜 三峽區・祖師廟藍染客家', -260, 320, '#fb923c');
  drawDistrictBadge('🌊 淡水區・老街出海口金色水岸', -230, -320, '#38bdf8');
  drawDistrictBadge('☁️ 汐止區・雲端園區科技廊道', 390, -30, '#818cf8');
  drawDistrictBadge('🌫️ 林口區・台地星雲影視城', -380, -180, '#facc15');
  drawDistrictBadge('🚢 八里區・左岸風帆十三行', -310, -300, '#06b6d4');
  drawDistrictBadge('⛰️ 五股區・水碓景觀高新谷', -310, -80, '#6ee7b7');
  drawDistrictBadge('⛩️ 泰山區・明志書院科技聚落', -340, 0, '#bef264');
  drawDistrictBadge('🍲 深坑區・老街豆腐簪花香', 250, 210, '#fbbf24');
  drawDistrictBadge('🍵 石碇區・千島茶鄉翡翠水庫', 330, 260, '#34d399');
  drawDistrictBadge('🍃 坪林區・包種茶金水岸古道', 370, 330, '#10b981');
  drawDistrictBadge('♨️ 烏來區・地熱瀑布泰雅生態', 110, 380, '#2dd4bf');
  drawDistrictBadge('⛏️ 瑞芳區・黃金山城九份貓村', 480, -60, '#fbbf24');
  drawDistrictBadge('🏮 平溪區・天燈光子十分瀑布', 430, 160, '#f472b6');
  drawDistrictBadge('🌿 雙溪區・低碳清流虎豹潭', 490, 220, '#22c55e');
  drawDistrictBadge('🏖️ 貢寮區・極東福隆三貂角', 560, 210, '#38bdf8');
  drawDistrictBadge('🌊 金山區・金包里溫泉雙嶼', -150, -420, '#0284c7');
  drawDistrictBadge('👑 萬里區・野柳女王頭翡翠灣', 70, -420, '#00f0ff');
  drawDistrictBadge('🧭 石門區・極北富貴角風能老梅', -220, -450, '#38bdf8');
  drawDistrictBadge('🌸 三芝區・淺水灣櫻花水岸', -290, -410, '#06b6d4');

  // ──────────────────────────────────────────
  // 1.5 雙北街廓真實都會建築群、綠帶公園與林蔭行道樹 (Urban Fabric & Architecture - 視錐剔除)
  // 【徹底消除商店孤立浮動或並排感！商店嵌於真實大廈、公寓街廓與林蔭之間】
  // ──────────────────────────────────────────
  // ──────────────────────────────────────────
  // 1.5 雙北街廓真實都會建築群立體鋼骨框架 (Building Structural Wireframes - 視錐剔除)
  // ──────────────────────────────────────────
  function drawCityBlockBuilding(bx, bz, bw, bd, bColor, label, bHeight=28) {
    if (!isInViewport(bx + bw / 2, bz + bd / 2, Math.max(bw, bd) + 25)) return;
    const sx = screenX(bx);
    const sz = screenZ(bz);
    const w = bw * scale;
    const d = bd * scale;
    const hPx = Math.max(4, bHeight * scale * 0.32);

    // 1. 建築物投影陰影
    ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
    drawSafeRoundRect(ctx, sx + 4 * scale, sz + 4 * scale, w, d, 3);
    ctx.fill();

    // 2. 基底佔地邊界框架 (Ground Rim)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 1;
    drawSafeRoundRect(ctx, sx, sz, w, d, 2);
    ctx.stroke();

    // 3. 2.5D 立體拉伸面 (South & East Extrusion Faces)
    if (hPx > 5) {
      // 南立體受光面
      ctx.fillStyle = 'rgba(14, 165, 233, 0.22)';
      ctx.beginPath();
      ctx.moveTo(sx, sz + d);
      ctx.lineTo(sx + w, sz + d);
      ctx.lineTo(sx + w + hPx * 0.3, sz + d - hPx);
      ctx.lineTo(sx + hPx * 0.3, sz + d - hPx);
      ctx.closePath();
      ctx.fill();

      // 東側立面
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.beginPath();
      ctx.moveTo(sx + w, sz + d);
      ctx.lineTo(sx + w, sz);
      ctx.lineTo(sx + w + hPx * 0.3, sz - hPx);
      ctx.lineTo(sx + w + hPx * 0.3, sz + d - hPx);
      ctx.closePath();
      ctx.fill();

      // 水平樓層橫樑框架線 (Floor Strata Wireframes)
      const strataCount = Math.min(8, Math.max(2, Math.floor(bHeight / 6)));
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let f = 1; f < strataCount; f++) {
        const frac = f / strataCount;
        ctx.moveTo(sx + frac * (hPx * 0.3), sz + d - frac * hPx);
        ctx.lineTo(sx + w + frac * (hPx * 0.3), sz + d - frac * hPx);
        ctx.lineTo(sx + w + frac * (hPx * 0.3), sz - frac * hPx);
      }
      ctx.stroke();

      // 4 主結構立柱鋼骨線 (Corner Skeleton Columns)
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, sz + d);
      ctx.lineTo(sx + hPx * 0.3, sz + d - hPx);
      ctx.moveTo(sx + w, sz + d);
      ctx.lineTo(sx + w + hPx * 0.3, sz + d - hPx);
      ctx.moveTo(sx + w, sz);
      ctx.lineTo(sx + w + hPx * 0.3, sz - hPx);
      ctx.stroke();
    }

    // 4. 頂樓樓頂框架 (Top Roof Face & Wireframe Rim)
    const topX = sx + hPx * 0.3;
    const topZ = sz - hPx;
    ctx.fillStyle = bColor || '#1e293b';
    drawSafeRoundRect(ctx, topX, topZ, w, d, 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 5. 辦公/住宅透光窗格矩陣 (Lit Windows)
    if (scale >= 6.0) {
      ctx.fillStyle = 'rgba(254, 240, 138, 0.40)';
      const cols = Math.floor(bw / 8);
      const rows = Math.floor(bd / 7);
      for (let c = 1; c < cols; c++) {
        for (let r = 1; r < rows; r++) {
          if ((c + r) % 2 === 0) {
            ctx.fillRect(topX + (c * 8 - 2) * scale, topZ + (r * 7 - 1.5) * scale, 3.5 * scale, 3 * scale);
          }
        }
      }
    }

    // 6. 頂樓機房天線尖塔線框 (Roof Antenna Spire / Helipad)
    if (bHeight >= 50 && scale >= 3.5) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(topX + w / 2, topZ + d / 2);
      ctx.lineTo(topX + w / 2, topZ + d / 2 - 12 * scale);
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(topX + w / 2, topZ + d / 2 - 12 * scale, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. 頂樓標籤
    if (label && scale >= 8) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold ' + Math.max(9, Math.floor(scale * 0.48)) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, topX + (bw / 2) * scale, topZ + (bd / 2) * scale + 3);
    }
  }

  // (1) 台北車站核心站前大廈：新光摩天大樓 (站前地標)
  drawCityBlockBuilding(-32, 28, 22, 20, '#1e293b', '新光摩天大樓');
  drawCityBlockBuilding(20, 26, 18, 16, '#334155', '站前金融大樓');

  // (2) 二二八和平紀念公園 (綠地與林蔭)
  if (isInViewport(-67.5, 79, 40)) {
    ctx.fillStyle = '#14532d';
    drawSafeRoundRect(ctx, screenX(-85), screenZ(68), 35 * scale, 22 * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#86efac';
    ctx.font = `bold ${Math.max(8.5, scale * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🌲 二二八和平紀念公園 🌲', screenX(-67.5), screenZ(80));
  }

  // (2.1) 國立臺灣博物館 (228公園北側・希臘多立克式宮殿與百年銅頂)
  drawCityBlockBuilding(-68, 60, 22, 14, '#334155', '國立臺灣博物館 (希臘多立克式宮殿)');

  // (2.2) 國定古蹟 景福門 (東門圓環 ✕ 凱達格蘭大道 ✕ 中山南路)
  if (isInViewport(60, 110, 30)) {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(screenX(60), screenZ(110), 16 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#15803d'; // 圓環中央綠島
    ctx.beginPath();
    ctx.arc(screenX(60), screenZ(110), 12 * scale, 0, Math.PI * 2);
    ctx.fill();
    // 景福門城樓 (紅柱綠琉璃歇山頂)
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(screenX(55), screenZ(105), 10 * scale, 10 * scale);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(screenX(53.5), screenZ(103), 13 * scale, 3 * scale);
    ctx.fillStyle = '#fbbf24';
    ctx.font = `bold ${Math.max(7.5, scale * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('國定古蹟 景福門 (東門)', screenX(60), screenZ(118));
  }

  // (3) 大安森林公園 (東南方廣袤綠海)
  if (isInViewport(85, 102.5, 40)) {
    ctx.fillStyle = '#14532d';
    drawSafeRoundRect(ctx, screenX(70), screenZ(85), 30 * scale, 35 * scale, 8);
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#86efac';
    ctx.font = `bold ${Math.max(9, scale * 0.55)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🌳 大安森林公園綠海 🌳', screenX(85), screenZ(103));
  }

  // (4) 新板特區摩天建築群與市民廣場
  drawCityBlockBuilding(-170, 142, 25, 18, '#1e3a8a', '新板大遠百 Mega City');
  drawCityBlockBuilding(-130, 138, 26, 22, '#0f172a', '新北市政府行政大樓 (33層)');
  drawCityBlockBuilding(-85, 138, 24, 20, '#1e293b', '板橋車站三鐵共構大樓');

  // (4.5) 板橋國定古蹟 林本源園邸 (林家花園 百年江南庭園)
  drawCityBlockBuilding(-195, 205, 24, 18, '#78350f', '國定古蹟 林本源園邸 (林家花園)');

  // (5) 板橋學府路一段 社區校園與住宅街屋 (介於學府路各超商之間，徹底杜絕並排)
  drawCityBlockBuilding(-135, 175, 26, 18, '#1f2937', '板橋學府文教園區');
  drawCityBlockBuilding(-75, 175, 24, 18, '#292524', '學府社區生活大廈');
  drawCityBlockBuilding(-15, 175, 22, 18, '#334155', '重慶學府商務華廈');

  // (6) 東區金融商圈大樓 (松江南京 ✕ 復興)
  drawCityBlockBuilding(135, -95, 22, 28, '#1e293b', '松江金融總部');
  drawCityBlockBuilding(175, -95, 22, 28, '#1e3a8a', '復興南京科技大樓');
  drawCityBlockBuilding(135, -145, 22, 28, '#334155', '長春商業大廈');
  drawCityBlockBuilding(175, -145, 22, 28, '#1e293b', '民生金融中心');

  // (7) 中山區精品商辦與條通街屋
  drawCityBlockBuilding(95, -45, 18, 22, '#292524', '林森條通特色街屋');
  drawCityBlockBuilding(55, -80, 20, 22, '#334155', '南京西路精品名品館');
  drawCityBlockBuilding(95, -80, 20, 22, '#1e293b', '中山晶華生活圈');

  // (8) 大稻埕迪化街 百年巴洛克仿古街屋 ✕ 霞海城隍廟
  drawCityBlockBuilding(-185, -75, 18, 16, '#991b1b', '台北霞海城隍廟 (百年香火)');
  drawCityBlockBuilding(-175, -95, 20, 24, '#78350f', '迪化街百年南北貨行');
  drawCityBlockBuilding(-135, -95, 20, 24, '#7c2d12', '大稻埕漢藥老茶棧');
  drawCityBlockBuilding(-175, -155, 20, 24, '#78350f', '延平北路古早味街屋');
  drawCityBlockBuilding(-135, -155, 20, 24, '#7c2d12', '重慶北路文創坊');

  // (9) 萬華西門町 潮流百貨與電影街商圈
  drawCityBlockBuilding(-165, 18, 18, 18, '#334155', '西門誠品生活館');
  drawCityBlockBuilding(-205, 45, 18, 22, '#1e293b', '武昌電影街影城');
  drawCityBlockBuilding(-165, 75, 20, 18, '#1e3a8a', '萬年商業大樓');

  // (10) 中山北路、學府路、敦化南路 綠蔭樟樹行道樹 (Street Trees - 視錐剔除)
  function drawStreetTree(tx, tz) {
    if (!isInViewport(tx, tz, 10)) return;
    const sx = screenX(tx);
    const sz = screenZ(tz);
    // 樹影
    ctx.beginPath();
    ctx.ellipse(sx + 1.5 * scale, sz + 1.5 * scale, 3 * scale, 2 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    // 樹幹
    ctx.fillStyle = '#78350f';
    ctx.fillRect(sx - 0.8 * scale, sz - 0.5 * scale, 1.6 * scale, 2.5 * scale);
    // 圓形豐滿樹冠
    ctx.beginPath();
    ctx.arc(sx, sz - 2 * scale, 3.2 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#15803d';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx - 0.8 * scale, sz - 2.8 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
  }

  // 中山北路樟樹林蔭排樹
  for (let tz = -210; tz <= 20; tz += 22) {
    drawStreetTree(78, tz);
  }
  // 板橋學府路一段綠蔭行道樹
  for (let tx = -200; tx <= 0; tx += 25) {
    drawStreetTree(tx, 162);
    drawStreetTree(tx, 174);
  }
  // 敦化/復興大道行道樹
  for (let tz = -180; tz <= 120; tz += 28) {
    drawStreetTree(185, tz);
  }

  // 第二層：連鎖品牌雷達光波與物流光纖線路 (Brand Radar Laser Network & Pulses)
  // ──────────────────────────────────────────
  if (gameState.activeBrandFilter !== 'all') {
    const matchedStores = interactables.filter(it => it.type === gameState.activeBrandFilter && isInViewport(it.x, it.z, 50));
    const brandColors = {
      familymart: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.25)', glow: 'rgba(16, 185, 129, 0.6)' },
      seven: { stroke: '#ea580c', fill: 'rgba(234, 88, 12, 0.25)', glow: 'rgba(234, 88, 12, 0.6)' },
      carrefour: { stroke: '#ef4444', fill: 'rgba(59, 130, 246, 0.25)', glow: 'rgba(239, 68, 68, 0.6)' },
      pxmart: { stroke: '#0284c7', fill: 'rgba(2, 132, 199, 0.25)', glow: 'rgba(2, 132, 199, 0.6)' },
      coco: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.25)', glow: 'rgba(245, 158, 11, 0.6)' },
      market: { stroke: '#d97706', fill: 'rgba(217, 119, 6, 0.25)', glow: 'rgba(217, 119, 6, 0.7)' }
    };
    const bColor = brandColors[gameState.activeBrandFilter] || { stroke: '#00d2ff', fill: 'rgba(0, 210, 255, 0.25)', glow: 'rgba(0, 210, 255, 0.6)' };

    // (A) 分店之間動態光纖雷射射線 (純向量無 shadowBlur，極致平滑)
    if (matchedStores.length > 1) {
      ctx.save();
      ctx.strokeStyle = bColor.stroke;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([12, 8]);
      ctx.lineDashOffset = -(Date.now() / 35) % 20;
      ctx.beginPath();
      for (let i = 0; i < matchedStores.length; i++) {
        const cur = matchedStores[i];
        const next = matchedStores[(i + 1) % matchedStores.length];
        ctx.moveTo(screenX(cur.x), screenZ(cur.z));
        ctx.lineTo(screenX(next.x), screenZ(next.z));
      }
      ctx.stroke();
      ctx.restore();
    }

    // (B) 門市向外綻放的連鎖脈衝光環 (Concentric Radar Pulses)
    const pulseR = ((Date.now() / 120) % 20 + 8) * scale * 0.45;
    matchedStores.forEach(st => {
      const sx = screenX(st.x);
      const sz = screenZ(st.z);
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sz, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = bColor.stroke;
      ctx.lineWidth = 2;
      ctx.fillStyle = bColor.fill;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  } else {
    // 預設全部地標點位發光提示 (視錐剔除：僅繪製可視區內的項目)
    // 依據委託人指示：縮小概覽時隱藏發光圈保持畫面清爽整潔，放大特寫 (scale >= 4.8) 時才顯示
    if (scale >= 4.8) {
      interactables.forEach(it => {
        if (!isInViewport(it.x, it.z, 20)) return;
        const ix = screenX(it.x);
        const iz = screenZ(it.z);
        ctx.beginPath();
        ctx.arc(ix, iz, it.r * scale * 0.75, 0, Math.PI * 2);
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }
  }

  // 奔跑塵土粒子渲染
  for (let i = sprintParticles.length - 1; i >= 0; i--) {
    const p = sprintParticles[i];
    p.alpha -= p.decay;
    if (p.alpha <= 0) {
      sprintParticles.splice(i, 1);
      continue;
    }
    ctx.beginPath();
    ctx.arc(screenX(p.x), screenZ(p.z), p.radius * scale * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(226, 232, 240, ${p.alpha})`;
    ctx.fill();
  }

  // ──────────────────────────────────────────
  // 第三層：動態深度排序 (Y-Sorting Render List)
  // ──────────────────────────────────────────
  const renderList = [];

  // (0) 雙北現代低底盤幹線公車 (Rotated 2.5D City Bus)
  function drawRotatedBus(bus) {
    const cx = screenX(bus.x);
    const cz = screenZ(bus.z);
    const busW = bus.w * scale;
    const busD = bus.d * scale;

    ctx.save();
    ctx.translate(cx, cz);
    ctx.rotate(bus.angle);

    // 1. 車身地面投影陰影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    drawSafeRoundRect(ctx, -busW / 2 + 1.2 * scale, -busD / 2 + 1.8 * scale, busW, busD, 3.5 * scale);
    ctx.fill();

    // 2. 雙色低底盤車身塗裝 (首都/台北客運經典綠白相間 或 中山幹線藍)
    ctx.fillStyle = bus.themeColor || '#059669';
    drawSafeRoundRect(ctx, -busW / 2, -busD / 2, busW, busD, 3.5 * scale);
    ctx.fill();

    // 3. 車頂與白色腰線裝飾
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-busW / 2 + 1.8 * scale, -busD / 2 + 1.1 * scale, busW - 3.6 * scale, busD - 2.2 * scale);

    // 4. 車頂空調散熱機殼
    ctx.fillStyle = '#cbd5e1';
    drawSafeRoundRect(ctx, -busW / 4, -busD / 4, busW / 2, busD / 2, 1.5 * scale);
    ctx.fill();

    // 5. 車頭前擋風玻璃 (車頭朝向 +X)
    ctx.fillStyle = '#0f172a';
    drawSafeRoundRect(ctx, busW / 2 - 3.6 * scale, -busD / 2 + 0.6 * scale, 3 * scale, busD - 1.2 * scale, 1.8 * scale);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(busW / 2 - 3.2 * scale, -busD / 2 + 1.0 * scale, 1.2 * scale, busD - 2.0 * scale);

    // 6. 兩側大面積全景車窗玻璃
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-busW / 2 + 3 * scale, -busD / 2 + 0.3 * scale, busW - 7 * scale, 0.9 * scale);
    ctx.fillRect(-busW / 2 + 3 * scale, busD / 2 - 1.2 * scale, busW - 7 * scale, 0.9 * scale);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(busW / 2 - 5 * scale, busD / 2 - 1.3 * scale, 1.8 * scale, 1.1 * scale);
    ctx.fillRect(-busW / 2 + 4 * scale, busD / 2 - 1.3 * scale, 1.8 * scale, 1.1 * scale);

    // 7. LED 車頭電子路線看板 (朝前方)
    ctx.fillStyle = '#020617';
    drawSafeRoundRect(ctx, busW / 2 - 1.5 * scale, -busD / 2 + 1.1 * scale, 1.4 * scale, busD - 2.2 * scale, 0.8 * scale);
    ctx.fill();

    // 車頂 LED 路線文字
    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${Math.max(7.5, scale * 0.48)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(bus.ledText || '307 幹線', 0, 1.3 * scale);

    // 8. 車頭明亮大燈與路面照地燈光 (Headlight Beams)
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(busW / 2 - 0.4 * scale, -busD / 2 + 0.6 * scale, 0.8 * scale, 1.0 * scale);
    ctx.fillRect(busW / 2 - 0.4 * scale, busD / 2 - 1.6 * scale, 0.8 * scale, 1.0 * scale);

    ctx.fillStyle = 'rgba(254, 240, 138, 0.22)';
    ctx.beginPath();
    ctx.moveTo(busW / 2, -busD / 2 + 0.6 * scale);
    ctx.lineTo(busW / 2 + 14 * scale, -busD * 1.5);
    ctx.lineTo(busW / 2 + 14 * scale, busD * 1.5);
    ctx.lineTo(busW / 2, busD / 2 - 0.6 * scale);
    ctx.closePath();
    ctx.fill();

    // 9. 車尾煞車警示紅燈
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-busW / 2 - 0.4 * scale, -busD / 2 + 0.6 * scale, 0.8 * scale, 1.0 * scale);
    ctx.fillRect(-busW / 2 - 0.4 * scale, busD / 2 - 1.6 * scale, 0.8 * scale, 1.0 * scale);

    ctx.restore();
  }

  // ──────────────────────────────────────────
  // 品牌官方標準向量標誌渲染引擎 (Canvas Vector Brand Logos)
  // 【落實委託人指示：我要的是它的樣式，而不是在下面寫個它的名字。放大到一定程度才顯示，不然畫面會很擠】
  // ──────────────────────────────────────────

  // 🟢 7-Eleven 官方經典標誌 (綠框橘白紅 '7' ✕ 'ELEVEN')
  function drawSevenElevenLogo(ctx, cx, cy, w, h) {
    ctx.save();
    ctx.translate(cx, cy);
    const boxW = w || 22;
    const boxH = h || 22;
    ctx.fillStyle = '#ffffff';
    drawSafeRoundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 3);
    ctx.fill();
    ctx.strokeStyle = '#00843d';
    ctx.lineWidth = Math.max(1, boxW * 0.08);
    ctx.stroke();

    const barH = boxH * 0.22;
    ctx.fillStyle = '#ff7900';
    ctx.fillRect(-boxW * 0.35, -boxH * 0.38, boxW * 0.7, barH);

    ctx.fillStyle = '#ed1c24';
    ctx.beginPath();
    ctx.moveTo(boxW * 0.35, -boxH * 0.38 + barH);
    ctx.lineTo(boxW * 0.12, -boxH * 0.38 + barH);
    ctx.lineTo(-boxW * 0.15, boxH * 0.38);
    ctx.lineTo(boxW * 0.05, boxH * 0.38);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-boxW * 0.42, -boxH * 0.08, boxW * 0.84, boxH * 0.24);
    ctx.fillStyle = '#00843d';
    ctx.font = `900 ${Math.max(6, boxH * 0.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ELEVEN', 0, boxH * 0.04);
    ctx.restore();
  }

  // 🔵 全家 FamilyMart 官方綠藍雙色標誌
  function drawFamilyMartLogo(ctx, cx, cy, w, h) {
    ctx.save();
    ctx.translate(cx, cy);
    const boxW = w || 24;
    const boxH = h || 20;
    ctx.fillStyle = '#0068b7';
    drawSafeRoundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH / 2, 2);
    ctx.fill();
    ctx.fillStyle = '#00a040';
    drawSafeRoundRect(ctx, -boxW / 2, 0, boxW, boxH / 2, 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-boxW * 0.38, -boxH * 0.08, boxW * 0.76, boxH * 0.16);
    ctx.restore();
  }

  // 🔵 全聯福利中心 PX-Mart 官方藍底紅白雙環無限標誌
  function drawPxmartLogo(ctx, cx, cy, w, h) {
    ctx.save();
    ctx.translate(cx, cy);
    const r = Math.min(w, h) / 2 || 11;
    ctx.fillStyle = '#003da5';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, r * 0.22);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#e3001b';
    ctx.lineWidth = Math.max(1.2, r * 0.18);
    ctx.beginPath();
    ctx.arc(-r * 0.24, 0, r * 0.24, 0, Math.PI * 2);
    ctx.arc(r * 0.24, 0, r * 0.24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 🍟 麥當勞 McDonald's 官方金色雙拱門標誌 (Golden Arches 'M')
  function drawMcdonaldsLogo(ctx, cx, cy, w, h) {
    ctx.save();
    ctx.translate(cx, cy);
    const boxW = w || 22;
    const boxH = h || 22;
    ctx.fillStyle = '#da291c';
    drawSafeRoundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 4);
    ctx.fill();

    ctx.strokeStyle = '#ffc72c';
    ctx.lineWidth = Math.max(2, boxW * 0.14);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-boxW * 0.28, boxH * 0.28);
    ctx.bezierCurveTo(-boxW * 0.28, -boxH * 0.35, -boxW * 0.03, -boxH * 0.35, -boxW * 0.03, boxH * 0.28);
    ctx.bezierCurveTo(-boxW * 0.03, -boxH * 0.35, boxW * 0.25, -boxH * 0.35, boxW * 0.25, boxH * 0.28);
    ctx.stroke();
    ctx.restore();
  }

  // ☕ 星巴克 Starbucks 官方深綠海妖標誌
  function drawStarbucksLogo(ctx, cx, cy, radius) {
    ctx.save();
    ctx.translate(cx, cy);
    const r = radius || 11;
    ctx.fillStyle = '#006241';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(0.8, r * 0.1);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -r * 0.42, r * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, r * 0.08, r * 0.42, 0, Math.PI);
    ctx.fill();
    ctx.restore();
  }

  // 🍔 摩斯漢堡 MOS Burger 官方圓弧紅色 M 標誌
  function drawMosBurgerLogo(ctx, cx, cy, w, h) {
    ctx.save();
    ctx.translate(cx, cy);
    const boxW = w || 22;
    const boxH = h || 20;
    ctx.fillStyle = '#ffffff';
    drawSafeRoundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 4);
    ctx.fill();
    ctx.strokeStyle = '#e60012';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = '#e60012';
    ctx.lineWidth = Math.max(2, boxW * 0.14);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-boxW * 0.32, boxH * 0.15);
    ctx.bezierCurveTo(-boxW * 0.32, -boxH * 0.28, -boxW * 0.05, -boxH * 0.28, -boxW * 0.02, boxH * 0.05);
    ctx.bezierCurveTo(0, -boxH * 0.28, boxW * 0.32, -boxH * 0.28, boxW * 0.32, boxH * 0.15);
    ctx.stroke();
    ctx.restore();
  }

  // 💊 屈臣氏 Watsons 官方湖水綠標誌
  function drawWatsonsLogo(ctx, cx, cy, w, h) {
    ctx.save();
    ctx.translate(cx, cy);
    const boxW = w || 24;
    const boxH = h || 18;
    ctx.fillStyle = '#008899';
    drawSafeRoundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 3);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold italic ${Math.max(7, boxH * 0.48)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('watsons', 0, 0);
    ctx.restore();
  }

  // 🌸 康是美 Cosmed 官方活力珊瑚橘十字花瓣標誌
  function drawCosmedLogo(ctx, cx, cy, w, h) {
    ctx.save();
    ctx.translate(cx, cy);
    const boxW = w || 22;
    const boxH = h || 20;
    ctx.fillStyle = '#f57200';
    drawSafeRoundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    const pw = boxW * 0.22;
    const ph = boxH * 0.55;
    drawSafeRoundRect(ctx, -pw / 2, -ph / 2, pw, ph, 2);
    ctx.fill();
    drawSafeRoundRect(ctx, -ph / 2, -pw / 2, ph, pw, 2);
    ctx.fill();
    ctx.restore();
  }

  // 🧋 CoCo 都可 手搖飲官方微笑標誌
  function drawCocoLogo(ctx, cx, cy, radius) {
    ctx.save();
    ctx.translate(cx, cy);
    const r = radius || 10;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.2, r * 0.2);
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r * 0.5, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.25, r * 0.12, 0, Math.PI * 2);
    ctx.arc(r * 0.3, -r * 0.25, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 🏮 傳統市場與夜市 官方牌樓與紅燈籠標誌
  function drawMarketArchwayLogo(ctx, cx, cy, w, h) {
    ctx.save();
    ctx.translate(cx, cy);
    const boxW = w || 24;
    const boxH = h || 20;
    ctx.fillStyle = '#78350f';
    drawSafeRoundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 4);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-boxW * 0.45, -boxH * 0.15);
    ctx.lineTo(0, -boxH * 0.42);
    ctx.lineTo(boxW * 0.45, -boxH * 0.15);
    ctx.lineTo(boxW * 0.35, -boxH * 0.05);
    ctx.lineTo(-boxW * 0.35, -boxH * 0.05);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-boxW * 0.28, boxH * 0.2, boxW * 0.12, 0, Math.PI * 2);
    ctx.arc(boxW * 0.28, boxH * 0.2, boxW * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 🛒 全球正統萬家福/樂家康官方向量標誌 (WanJiaFu / LeJiaKang Dual-Color Diamond ✕ Negative White 'C')
  let carrefourRedPath2D = null;
  let carrefourBluePath2D = null;
  if (typeof Path2D !== 'undefined') {
    try {
      carrefourRedPath2D = new Path2D("M18.0334273,1.59976316 C18.1419912,1.4945 18.2441057,1.45213158 18.331978,1.45213158 C18.4894493,1.45213158 18.600163,1.5895 18.5950573,1.75713158 C18.5902203,1.85660526 18.5464185,1.96581579 18.4486035,2.06160526 C14.5351982,6.82607895 11.6891586,12.3942368 11.6891586,20.1192368 C11.6891586,27.8376579 14.5351982,33.2989737 18.4486035,38.0610789 C18.5464185,38.1571316 18.5902203,38.2681842 18.5950573,38.3658158 C18.600163,38.5313421 18.4894493,38.6710789 18.331978,38.6710789 C18.2441057,38.6710789 18.1419912,38.6284474 18.0334273,38.5226579 L1.36296035,22.7345 C0.530995595,22.0363421 0,21.2218684 0,20.0629211 C0,18.8989737 0.530995595,18.0866053 1.36296035,17.3939737 L18.0334273,1.59976316");
      carrefourBluePath2D = new Path2D("M9.08448546,0.141973684 C2.55721674,0.141973684 0.0056969163,9.20092105 0.0056969163,19.9982895 C0.0056969163,30.7982895 2.55721674,39.7367105 9.08448546,39.7367105 C13.0008467,39.7367105 16.3394546,37.4901316 16.3510097,35.6440789 C16.3518159,35.2406579 16.1935383,34.8530263 15.8468863,34.5148684 C13.9916264,32.7585526 13.2650009,31.0022368 13.2580141,29.4540789 C13.2475339,26.4967105 15.8681154,24.2927632 18.2823181,24.2927632 C21.603459,24.2927632 23.5616396,26.8496053 23.5616396,30.1588158 C23.5616396,33.2935526 22.1946485,35.9077632 20.7118379,37.9975 C20.6543313,38.0848684 20.6282652,38.1780263 20.6282652,38.2622368 C20.6301463,38.4272368 20.7271551,38.5614474 20.8749524,38.5614474 C20.9652432,38.5614474 21.0705824,38.5146053 21.1847894,38.4014474 L37.8600934,22.6132895 C38.6925956,21.9153947 39.2241286,21.1009211 39.2241286,19.9419737 C39.2241286,18.7780263 38.6925956,17.9653947 37.8600934,17.2727632 L21.1847894,1.47881579 C21.0705824,1.36697368 20.9652432,1.32013158 20.8749524,1.32013158 C20.7260802,1.32013158 20.6301463,1.45539474 20.6282652,1.61986842 C20.6282652,1.70460526 20.6543313,1.79855263 20.7118379,1.88618421 C22.1946485,3.97328947 23.5616396,6.59065789 23.5616396,9.72302632 C23.5616396,13.0298684 21.603459,15.5893421 18.2823181,15.5893421 C15.8681154,15.5893421 13.2475339,13.3869737 13.2580141,10.4285526 C13.2650009,8.87907895 13.9916264,7.12302632 15.8468863,5.36855263 C16.1935383,5.02697368 16.3518159,4.64223684 16.3510097,4.23881579 C16.3394546,2.39013158 13.0008467,0.141973684 9.08448546,0.141973684");
    } catch (e) {
      console.warn("Path2D initialization exception:", e);
    }
  }

  function drawCarrefourLogo(ctx, cx, cy, targetWidth, targetHeight) {
    const w = targetWidth || 22;
    const h = targetHeight || (w * 40 / 61);
    ctx.save();
    ctx.translate(cx - w / 2, cy - h / 2);

    ctx.fillStyle = '#ffffff';
    drawSafeRoundRect(ctx, -2, -2, w + 4, h + 4, 3);
    ctx.fill();

    const scaleRatio = w / 61;
    ctx.scale(scaleRatio, scaleRatio);

    if (carrefourRedPath2D && carrefourBluePath2D) {
      ctx.fillStyle = '#C20016';
      ctx.fill(carrefourRedPath2D);

      ctx.save();
      ctx.translate(21.766520, 0.121053);
      ctx.fillStyle = '#254F9B';
      ctx.fill(carrefourBluePath2D);
      ctx.restore();
    } else {
      ctx.fillStyle = '#C20016';
      ctx.beginPath();
      ctx.moveTo(18, 1.6);
      ctx.bezierCurveTo(11.7, 12.4, 11.7, 27.8, 18.4, 38.1);
      ctx.lineTo(1.4, 22.7);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#254F9B';
      ctx.beginPath();
      ctx.moveTo(31, 0.2);
      ctx.bezierCurveTo(55, 0.2, 61, 20, 31, 39.7);
      ctx.lineTo(60, 20);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // 🚇 台北捷運官方雙色流線標誌
  function drawTaipeiMetroLogo(ctx, cx, cy, radius) {
    ctx.save();
    ctx.translate(cx, cy);
    const s = radius / 36;
    ctx.scale(s, s);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0070bc';
    ctx.beginPath();
    ctx.moveTo(-26, 10);
    ctx.bezierCurveTo(-28, -14, -12, -36, 14, -36);
    ctx.bezierCurveTo(26, -36, 36, -30, 42, -20);
    ctx.lineTo(46, -30);
    ctx.lineTo(46, -6);
    ctx.lineTo(22, -10);
    ctx.lineTo(32, -17);
    ctx.bezierCurveTo(27, -23, 21, -27, 14, -27);
    ctx.bezierCurveTo(-6, -27, -18, -11, -17, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#00a650';
    ctx.beginPath();
    ctx.moveTo(26, -10);
    ctx.bezierCurveTo(28, 14, 12, 36, -14, 36);
    ctx.bezierCurveTo(-26, 36, -36, 30, -42, 20);
    ctx.lineTo(-46, 30);
    ctx.lineTo(-46, 6);
    ctx.lineTo(-22, 10);
    ctx.lineTo(-32, 17);
    ctx.bezierCurveTo(-27, 23, -21, 27, -14, 27);
    ctx.bezierCurveTo(6, 27, 18, 11, 17, -10);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // 🌟 全門市層級細節 (LOD) 與官方純粹樣式浮動指示器：落實委託人指示
  // 「那些只要出現的商店，我要的是它的樣式，而不是在下面寫個它的名字。我要的是它的樣式，並且要放大到一定程度我才會看得到。不然畫面會很擠」
  function drawFloatingStoreBrandBadge(ctx, bx, bz, storeW, brand, borderColor = '#00f0ff') {
    if (scale < 4.8) return; // 縮小 (scale < 4.8) 時絕不繪製，確保大景深視野整潔不擁擠！

    const badgeW = Math.min(46, Math.max(34, scale * 2.2));
    const badgeH = Math.min(32, Math.max(22, scale * 1.4));
    const badgeX = bx + (storeW * scale - badgeW) / 2;
    const badgeY = bz - badgeH - 6;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    drawSafeRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 8;
    ctx.stroke();

    const cx = badgeX + badgeW / 2;
    const cy = badgeY + badgeH / 2;
    const iconW = Math.min(26, badgeW * 0.72);
    const iconH = Math.min(20, badgeH * 0.72);

    switch (brand) {
      case 'wanjiafu':
      case 'carrefour':
      case 'lejiakang':
        drawCarrefourLogo(ctx, cx, cy, iconW, iconW * 40 / 61);
        break;
      case 'seven':
        drawSevenElevenLogo(ctx, cx, cy, iconW, iconH);
        break;
      case 'familymart':
        drawFamilyMartLogo(ctx, cx, cy, iconW, iconH);
        break;
      case 'pxmart':
        drawPxmartLogo(ctx, cx, cy, iconW, iconH);
        break;
      case 'mcdonalds':
        drawMcdonaldsLogo(ctx, cx, cy, iconW, iconH);
        break;
      case 'starbucks':
        drawStarbucksLogo(ctx, cx, cy, Math.min(iconW, iconH) / 2);
        break;
      case 'mosburger':
        drawMosBurgerLogo(ctx, cx, cy, iconW, iconH);
        break;
      case 'watsons':
        drawWatsonsLogo(ctx, cx, cy, iconW, iconH);
        break;
      case 'cosmed':
        drawCosmedLogo(ctx, cx, cy, iconW, iconH);
        break;
      case 'coco':
        drawCocoLogo(ctx, cx, cy, Math.min(iconW, iconH) / 2);
        break;
      case 'market':
        drawMarketArchwayLogo(ctx, cx, cy, iconW, iconH);
        break;
      default:
        drawSevenElevenLogo(ctx, cx, cy, iconW, iconH);
    }
    // 嚴格遵守委託人鐵令：僅呈現純粹官方樣式，絕不在下方附加雜亂文字！
    ctx.restore();
  }

  // (1) CoCo 都可 手搖飲門市立面
  function drawCocoStore(x, z, branchName) {
    const storeW = 24, storeH = 20;
    const bx = screenX(x - storeW / 2);
    const bz = screenZ(z - storeH / 2);
    ctx.fillStyle = '#ffffff';
    drawSafeRoundRect(ctx, bx, bz, storeW * scale, storeH * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 亮橘招牌
    ctx.fillStyle = '#f97316';
    drawSafeRoundRect(ctx, bx - 2, bz, (storeW + 4) * scale, 5.5 * scale, 4);
    ctx.fill();

    // 圓形微笑官方商標 (純粹樣式，無文字)
    const logoR = Math.max(5.5, scale * 0.9);
    drawCocoLogo(ctx, bx + (storeW * scale) / 2, bz + 2.7 * scale, logoR);

    // 服務點餐吧檯
    ctx.fillStyle = '#78350f';
    drawSafeRoundRect(ctx, bx + 5 * scale, bz + 11 * scale, 14 * scale, 5 * scale, 3);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    drawSafeRoundRect(ctx, bx + 7 * scale, bz + 7.5 * scale, 2.5 * scale, 3.5 * scale, 2);
    ctx.fill();
    drawSafeRoundRect(ctx, bx + 14 * scale, bz + 7.5 * scale, 2.5 * scale, 3.5 * scale, 2);
    ctx.fill();

    drawFloatingStoreBrandBadge(ctx, bx, bz, storeW, 'coco', '#f97316');
  }

  // (2) 全家便利商店 FamilyMart 門市立面
  function drawFamilyMartStore(x, z, branchName) {
    const storeW = 24, storeH = 20;
    const bx = screenX(x - storeW / 2);
    const bz = screenZ(z - storeH / 2);
    ctx.fillStyle = '#f8fafc';
    drawSafeRoundRect(ctx, bx, bz, storeW * scale, storeH * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 綠藍雙色燈箱
    ctx.fillStyle = '#0068b7';
    ctx.fillRect(bx, bz, storeW * scale, 2.7 * scale);
    ctx.fillStyle = '#00a040';
    ctx.fillRect(bx, bz + 2.7 * scale, storeW * scale, 2.7 * scale);

    // 官方綠藍向量標誌
    const logoSize = Math.max(14, scale * 2.0);
    drawFamilyMartLogo(ctx, bx + (storeW * scale) / 2, bz + 2.7 * scale, logoSize, logoSize * 0.7);

    // 玻璃自動門
    ctx.fillStyle = 'rgba(219, 234, 254, 0.45)';
    drawSafeRoundRect(ctx, bx + 6 * scale, bz + 9 * scale, 12 * scale, 10 * scale, 3);
    ctx.fill();
    ctx.strokeStyle = '#00a040';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    drawFloatingStoreBrandBadge(ctx, bx, bz, storeW, 'familymart', '#00a040');
  }

  // (3) 7-Eleven 統一超商 門市立面
  function drawSevenElevenStore(x, z, branchName) {
    const storeW = 24, storeH = 20;
    const bx = screenX(x - storeW / 2);
    const bz = screenZ(z - storeH / 2);
    ctx.fillStyle = '#f8fafc';
    drawSafeRoundRect(ctx, bx, bz, storeW * scale, storeH * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 經典橘綠紅三色橫條
    const stripeH = 1.8 * scale;
    ctx.fillStyle = '#ff7900';
    ctx.fillRect(bx, bz, storeW * scale, stripeH);
    ctx.fillStyle = '#00843d';
    ctx.fillRect(bx, bz + stripeH, storeW * scale, stripeH);
    ctx.fillStyle = '#ed1c24';
    ctx.fillRect(bx, bz + stripeH * 2, storeW * scale, stripeH);

    // 官方 7-Eleven 標誌
    const logoSize = Math.max(12, scale * 1.8);
    drawSevenElevenLogo(ctx, bx + (storeW * scale) / 2, bz + 2.7 * scale, logoSize, logoSize);

    // 落地透光自動門
    ctx.fillStyle = 'rgba(254, 243, 199, 0.45)';
    drawSafeRoundRect(ctx, bx + 6 * scale, bz + 9 * scale, 12 * scale, 10 * scale, 3);
    ctx.fill();
    ctx.strokeStyle = '#00843d';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    drawFloatingStoreBrandBadge(ctx, bx, bz, storeW, 'seven', '#00843d');
  }

  // (3.1) 🔵 全聯福利中心 PX-Mart 門市立面
  function drawPxmartStore(x, z, branchName) {
    const storeW = 26, storeH = 20;
    const bx = screenX(x - storeW / 2);
    const bz = screenZ(z - storeH / 2);
    ctx.fillStyle = '#0f172a';
    drawSafeRoundRect(ctx, bx, bz, storeW * scale, storeH * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#003da5';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#003da5';
    ctx.fillRect(bx, bz, storeW * scale, 5.4 * scale);

    const logoSize = Math.max(12, scale * 1.8);
    drawPxmartLogo(ctx, bx + (storeW * scale) / 2, bz + 2.7 * scale, logoSize, logoSize);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    drawSafeRoundRect(ctx, bx + 6 * scale, bz + 9 * scale, 14 * scale, 10 * scale, 3);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    drawFloatingStoreBrandBadge(ctx, bx, bz, storeW, 'pxmart', '#003da5');
  }

  // (3.2) 🍟 麥當勞 McDonald's 門市立面
  function drawMcdonaldsStore(x, z, branchName) {
    const storeW = 26, storeH = 22;
    const bx = screenX(x - storeW / 2);
    const bz = screenZ(z - storeH / 2);
    ctx.fillStyle = '#1e293b';
    drawSafeRoundRect(ctx, bx, bz, storeW * scale, storeH * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#da291c';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#da291c';
    ctx.fillRect(bx, bz, storeW * scale, 6 * scale);

    const logoSize = Math.max(14, scale * 2.0);
    drawMcdonaldsLogo(ctx, bx + (storeW * scale) / 2, bz + 3 * scale, logoSize, logoSize * 0.85);

    ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
    drawSafeRoundRect(ctx, bx + 5 * scale, bz + 10 * scale, 16 * scale, 10 * scale, 3);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    drawFloatingStoreBrandBadge(ctx, bx, bz, storeW, 'mcdonalds', '#ffc72c');
  }

  // (3.3) ☕ 星巴克 Starbucks 門市立面
  function drawStarbucksStore(x, z, branchName) {
    const storeW = 24, storeH = 20;
    const bx = screenX(x - storeW / 2);
    const bz = screenZ(z - storeH / 2);
    ctx.fillStyle = '#1c1917';
    drawSafeRoundRect(ctx, bx, bz, storeW * scale, storeH * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#006241';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#006241';
    ctx.fillRect(bx, bz, storeW * scale, 5.2 * scale);

    const logoR = Math.max(6, scale * 1.0);
    drawStarbucksLogo(ctx, bx + (storeW * scale) / 2, bz + 2.6 * scale, logoR);

    ctx.fillStyle = 'rgba(253, 230, 138, 0.22)';
    drawSafeRoundRect(ctx, bx + 5 * scale, bz + 9 * scale, 14 * scale, 10 * scale, 3);
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    drawFloatingStoreBrandBadge(ctx, bx, bz, storeW, 'starbucks', '#006241');
  }

  // (3.4) 🍔 摩斯漢堡 MOS Burger 門市立面
  function drawMosBurgerStore(x, z, branchName) {
    const storeW = 24, storeH = 20;
    const bx = screenX(x - storeW / 2);
    const bz = screenZ(z - storeH / 2);
    ctx.fillStyle = '#fafaf9';
    drawSafeRoundRect(ctx, bx, bz, storeW * scale, storeH * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#e60012';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#e60012';
    ctx.fillRect(bx, bz, storeW * scale, 5 * scale);

    const logoSize = Math.max(12, scale * 1.8);
    drawMosBurgerLogo(ctx, bx + (storeW * scale) / 2, bz + 2.5 * scale, logoSize, logoSize * 0.8);

    ctx.fillStyle = 'rgba(254, 242, 242, 0.4)';
    drawSafeRoundRect(ctx, bx + 5 * scale, bz + 9 * scale, 14 * scale, 10 * scale, 3);
    ctx.fill();
    ctx.strokeStyle = '#e60012';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    drawFloatingStoreBrandBadge(ctx, bx, bz, storeW, 'mosburger', '#e60012');
  }

  // (3.5) 💊 屈臣氏 Watsons 門市立面
  function drawWatsonsStore(x, z, branchName) {
    const storeW = 24, storeH = 20;
    const bx = screenX(x - storeW / 2);
    const bz = screenZ(z - storeH / 2);
    ctx.fillStyle = '#0f172a';
    drawSafeRoundRect(ctx, bx, bz, storeW * scale, storeH * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#008899';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#008899';
    ctx.fillRect(bx, bz, storeW * scale, 5.2 * scale);

    const logoSize = Math.max(14, scale * 2.0);
    drawWatsonsLogo(ctx, bx + (storeW * scale) / 2, bz + 2.6 * scale, logoSize, logoSize * 0.7);

    ctx.fillStyle = 'rgba(45, 212, 191, 0.2)';
    drawSafeRoundRect(ctx, bx + 5 * scale, bz + 9 * scale, 14 * scale, 10 * scale, 3);
    ctx.fill();
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    drawFloatingStoreBrandBadge(ctx, bx, bz, storeW, 'watsons', '#008899');
  }

  // (3.6) 🌸 康是美 Cosmed 門市立面
  function drawCosmedStore(x, z, branchName) {
    const storeW = 24, storeH = 20;
    const bx = screenX(x - storeW / 2);
    const bz = screenZ(z - storeH / 2);
    ctx.fillStyle = '#0f172a';
    drawSafeRoundRect(ctx, bx, bz, storeW * scale, storeH * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#f57200';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f57200';
    ctx.fillRect(bx, bz, storeW * scale, 5.2 * scale);

    const logoSize = Math.max(12, scale * 1.8);
    drawCosmedLogo(ctx, bx + (storeW * scale) / 2, bz + 2.6 * scale, logoSize, logoSize * 0.85);

    ctx.fillStyle = 'rgba(251, 146, 60, 0.2)';
    drawSafeRoundRect(ctx, bx + 5 * scale, bz + 9 * scale, 14 * scale, 10 * scale, 3);
    ctx.fill();
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    drawFloatingStoreBrandBadge(ctx, bx, bz, storeW, 'cosmed', '#f57200');
  }

  // (4) 🛒 萬家福 WanJiaFu ✕ 樂家康 LeJiaKang (旗艦量販 ✕ 便利購超市)
  function drawWanjiafuStore(x, z, branchName, isFlagship) {
    const storeW = isFlagship ? 34 : 24;
    const storeH = isFlagship ? 24 : 20;
    const bx = screenX(x - storeW / 2);
    const bz = screenZ(z - storeH / 2);

    ctx.fillStyle = '#0f172a';
    drawSafeRoundRect(ctx, bx, bz, storeW * scale, storeH * scale, 6);
    ctx.fill();
    ctx.strokeStyle = isFlagship ? '#254F9B' : '#0284c7';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 招牌頂條 (萬家福深藍底色)
    ctx.fillStyle = isFlagship ? '#1e3a8a' : '#0369a1';
    ctx.fillRect(bx, bz, storeW * scale, 5 * scale);

    // 門面正統萬家福/樂家康紅白藍雙箭頭白 C 標誌 (純粹樣式，無多餘文字)
    const logoSize = Math.max(12, scale * 1.8);
    drawCarrefourLogo(ctx, bx + (storeW * scale) / 2, bz + 2.5 * scale, logoSize, logoSize * 40 / 61);

    // 挑高全息玻璃帷幕與能量補給站門面
    ctx.fillStyle = isFlagship ? 'rgba(37, 79, 155, 0.22)' : 'rgba(2, 132, 199, 0.18)';
    drawSafeRoundRect(ctx, bx + 5 * scale, bz + 9 * scale, (storeW - 10) * scale, (storeH - 11) * scale, 3);
    ctx.fill();
    ctx.strokeStyle = isFlagship ? '#60a5fa' : '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 購物補給平台
    ctx.fillStyle = '#64748b';
    drawSafeRoundRect(ctx, bx + 2 * scale, bz + (storeH - 4.5) * scale, 4 * scale, 3.5 * scale, 1);
    ctx.fill();

    // 🌟 委託人指示重要鐵令：嚴格落實 LOD (scale >= 4.8) 與純樣式無文字
    drawFloatingStoreBrandBadge(ctx, bx, bz, storeW, 'carrefour', isFlagship ? '#254F9B' : '#0284c7');
  }

  // (4.1) 🚇 台北捷運立體高畫質出入口 (Taipei Metro Isometric Entrance)
  function drawMrtEscalatorEntrance(it) {
    const ew = it.w || 14;
    const ed = it.d || 10;
    const bx = screenX(it.x - ew / 2);
    const bz = screenZ(it.z - ed / 2);
    const bw = ew * scale;
    const bh = ed * scale;

    // 1. 地面花崗岩平台基座
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = Math.min(20, scale * 1.5);
    ctx.shadowOffsetY = Math.min(8, scale * 0.8);
    ctx.fillStyle = '#0f172a';
    drawSafeRoundRect(ctx, bx, bz, bw, bh, Math.min(8, scale * 0.4));
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(1, scale * 0.08);
    ctx.stroke();

    // 2. 出入口前方黃色圓點導盲警示磚 (Tactile Warning Paving)
    if (scale >= 2.0) {
      const tileH = Math.min(bh * 0.2, scale * 1.6);
      const tileY = bz + bh - tileH;
      ctx.fillStyle = '#eab308';
      ctx.fillRect(bx + bw * 0.1, tileY, bw * 0.8, tileH);
      if (scale >= 8.0) {
        ctx.fillStyle = '#ca8a04';
        const dotStep = Math.max(3, scale * 0.35);
        const dotR = Math.max(0.8, scale * 0.08);
        for (let dotX = bx + bw * 0.12; dotX < bx + bw * 0.88; dotX += dotStep) {
          for (let dotY = tileY + dotStep / 2; dotY < tileY + tileH; dotY += dotStep) {
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // 3. 地下穿堂通道井開口
    const pitX = bx + bw * 0.08;
    const pitY = bz + bh * 0.18;
    const pitW = bw * 0.84;
    const pitH = bh * 0.62;
    ctx.fillStyle = '#020617';
    drawSafeRoundRect(ctx, pitX, pitY, pitW, pitH, Math.min(4, scale * 0.2));
    ctx.fill();

    // 4. 雙向自動電扶梯 (Dual Animated Escalators - 左下行、右上行)
    const escW = pitW * 0.42;
    const escGap = pitW * 0.06;
    const escX1 = pitX + pitW * 0.05;
    const escX2 = escX1 + escW + escGap;
    const escY = pitY + pitH * 0.08;
    const escH = pitH * 0.84;
    const escTime = Date.now() * 0.003;

    function drawSingleEscalator(ex, ey, ew, eh, isUpward) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(ex, ey, ew, eh);

      const stepCount = Math.max(4, Math.floor(eh / Math.max(3, scale * 0.35)));
      const stepH = eh / stepCount;
      const offset = (isUpward ? (escTime % 1) : (1 - (escTime % 1))) * stepH;

      for (let s = -1; s <= stepCount; s++) {
        const curY = ey + s * stepH + offset;
        if (curY >= ey && curY + stepH * 0.7 <= ey + eh) {
          ctx.fillStyle = (Math.floor(s + escTime) % 2 === 0) ? '#475569' : '#334155';
          ctx.fillRect(ex + ew * 0.1, curY, ew * 0.8, stepH * 0.7);

          // 踏階黃色安全邊緣線 (Taipei Metro Yellow Warning Edge)
          ctx.fillStyle = '#facc15';
          ctx.fillRect(ex + ew * 0.1, curY, ew * 0.8, Math.max(0.6, scale * 0.05));
          ctx.fillRect(ex + ew * 0.1, curY, Math.max(0.6, scale * 0.05), stepH * 0.7);
          ctx.fillRect(ex + ew * 0.9 - Math.max(0.6, scale * 0.05), curY, Math.max(0.6, scale * 0.05), stepH * 0.7);
        }
      }

      // 左右兩側強化玻璃欄板
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.fillRect(ex, ey, ew * 0.08, eh);
      ctx.fillRect(ex + ew * 0.92, ey, ew * 0.08, eh);

      // 黑色橡膠扶手帶
      ctx.fillStyle = '#020617';
      ctx.fillRect(ex, ey, ew * 0.08, eh);
      ctx.fillRect(ex + ew * 0.92, ey, ew * 0.08, eh);

      // 運行方向 LED 指示燈號
      if (scale >= 3.5) {
        const ledR = Math.max(1, scale * 0.1);
        ctx.fillStyle = isUpward ? '#22c55e' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(ex + ew / 2, isUpward ? (ey + eh - ledR * 2) : (ey + ledR * 2), ledR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawSingleEscalator(escX1, escY, escW, escH, false);
    drawSingleEscalator(escX2, escY, escW, escH, true);

    // 5. 波浪採光天棚玻璃遮雨棚 (Glass Canopy & Steel Truss)
    ctx.save();
    const canopyX = bx - bw * 0.06;
    const canopyY = bz - bh * 0.22;
    const canopyW = bw * 1.12;
    const canopyH = bh * 0.85;

    const grad = ctx.createLinearGradient(canopyX, canopyY, canopyX + canopyW, canopyY + canopyH);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.42)');
    grad.addColorStop(0.5, 'rgba(14, 165, 233, 0.25)');
    grad.addColorStop(1, 'rgba(3, 105, 161, 0.55)');
    ctx.fillStyle = grad;
    drawSafeRoundRect(ctx, canopyX, canopyY, canopyW, canopyH, Math.min(8, scale * 0.45));
    ctx.fill();

    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = Math.max(1, scale * 0.09);
    ctx.stroke();

    if (scale >= 3.0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = Math.max(0.8, scale * 0.06);
      const ribCount = 4;
      for (let r = 1; r < ribCount; r++) {
        const rx = canopyX + (canopyW / ribCount) * r;
        ctx.beginPath();
        ctx.moveTo(rx, canopyY);
        ctx.lineTo(rx, canopyY + canopyH);
        ctx.stroke();
      }
    }
    ctx.restore();

    // 6. 經典台北捷運出入口立柱 (Taipei Metro Entrance Pylon)
    let lines = [{ code: 'BL', name: '板南線', color: '#0070bd' }];
    let exitName = it.name;
    if (it.id.includes('m6') || it.name.includes('M6') || it.name.includes('台北車站')) {
      lines = [
        { code: 'BL', name: '板南線', color: '#0070bd' },
        { code: 'R', name: '淡水信義線', color: '#e3002c' }
      ];
      exitName = '台北車站 出口 M6';
    } else if (it.id.includes('zs') || it.name.includes('中山')) {
      lines = [
        { code: 'R', name: '淡水信義線', color: '#e3002c' },
        { code: 'G', name: '松山新店線', color: '#008659' }
      ];
      exitName = '捷運中山站';
    } else if (it.id.includes('fz') || it.name.includes('府中')) {
      lines = [{ code: 'BL', name: '板南線', color: '#0070bd' }];
      exitName = '捷運府中站 出口 1';
    }

    const pylonW = Math.min(bw * 0.42, Math.max(50, scale * 3.8));
    const pylonH = Math.min(bh * 0.72, Math.max(38, scale * 2.8));
    const pylonX = bx + bw + 4;
    const pylonY = bz + bh * 0.12;

    ctx.save();
    ctx.fillStyle = '#0f172a';
    drawSafeRoundRect(ctx, pylonX, pylonY, pylonW, pylonH, 4);
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 柱頂高畫質台北捷運藍綠官方 Logo
    const logoR = Math.min(10, Math.max(5, pylonH * 0.18));
    const logoCx = pylonX + pylonW * 0.22;
    const logoCy = pylonY + pylonH * 0.32;
    drawTaipeiMetroLogo(ctx, logoCx, logoCy, logoR);

    // 路線專屬色標膠囊 (Line Badges)
    const badgeStartX = pylonX + pylonW * 0.44;
    lines.forEach((l, idx) => {
      const lx = badgeStartX + idx * (pylonW * 0.27);
      const ly = pylonY + pylonH * 0.18;
      const lw = pylonW * 0.24;
      const lh = pylonH * 0.28;
      ctx.fillStyle = l.color;
      drawSafeRoundRect(ctx, lx, ly, lw, lh, 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(7, lh * 0.65)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(l.code, lx + lw / 2, ly + lh / 2);
    });

    // 站名文字標示
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(8, pylonH * 0.24)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(exitName, pylonX + pylonW / 2, pylonY + pylonH * 0.72);
    ctx.restore();
  }

  // (4.2) 🏛️ 台北車站旗艦大樓 (Taipei Main Station Grand Terminal Building)
  function drawStationBuilding(it) {
    const bw = it.w * scale;
    const bh = it.d * scale;
    const bx = screenX(it.x - it.w / 2);
    const bz = screenZ(it.z - it.d / 2);

    // 1. 底層站體主結構 (Main Terminal Building Structure)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = Math.min(30, scale * 2.2);
    ctx.shadowOffsetY = Math.min(12, scale * 1.2);
    ctx.fillStyle = '#1e293b';
    drawSafeRoundRect(ctx, bx, bz, bw, bh, Math.min(10, scale * 0.5));
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = Math.max(1.5, scale * 0.1);
    ctx.stroke();

    // 2. 挑高石材長廊與落地採光玻璃帷幕 (Glass Atrium & Column Arcade)
    const atriumX = bx + bw * 0.08;
    const atriumY = bz + bh * 0.28;
    const atriumW = bw * 0.84;
    const atriumH = bh * 0.64;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    drawSafeRoundRect(ctx, atriumX, atriumY, atriumW, atriumH, 4);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (scale >= 2.0) {
      const colCount = 8;
      const colStep = atriumW / colCount;
      ctx.fillStyle = '#94a3b8';
      for (let c = 1; c < colCount; c++) {
        ctx.fillRect(atriumX + c * colStep - Math.max(1, scale * 0.08), atriumY, Math.max(2, scale * 0.16), atriumH);
      }
    }

    // 3. 巨型四面廡殿頂古銅褐琉璃瓦屋脊 (Palatial Hip Roof)
    const roofX = bx - 4 * scale;
    const roofY = bz - 6 * scale;
    const roofW = bw + 8 * scale;
    const roofH = Math.min(bh * 0.45, 18 * scale);

    ctx.fillStyle = '#7c2d12';
    drawSafeRoundRect(ctx, roofX, roofY, roofW, roofH, 6);
    ctx.fill();
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = Math.max(1.2, scale * 0.08);
    ctx.stroke();

    if (scale >= 2.5) {
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 1;
      const tileSteps = Math.floor(roofW / Math.max(6, scale * 0.6));
      for (let t = 1; t < tileSteps; t++) {
        const tx = roofX + t * (roofW / tileSteps);
        ctx.beginPath();
        ctx.moveTo(tx, roofY);
        ctx.lineTo(tx, roofY + roofH);
        ctx.stroke();
      }
    }

    // 4. 頂部巨型三鐵共構高解析度發光站名看板 (Grand Signboard)
    const signW = Math.min(bw * 0.88, Math.max(140, scale * 8.5));
    const signH = Math.min(bh * 0.32, Math.max(28, scale * 2.2));
    const signX = bx + (bw - signW) / 2;
    const signY = bz + (bh - signH) / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    drawSafeRoundRect(ctx, signX, signY, signW, signH, 6);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // (4a) 台北捷運官方藍綠雙色標誌
    const mrtLogoR = Math.min(10, Math.max(5, signH * 0.28));
    drawTaipeiMetroLogo(ctx, signX + 16, signY + signH / 2, mrtLogoR);

    // (4b) 路線代表色膠囊 [BL 板南線 藍] ✕ [R 淡水信義線 紅]
    const badgeY = signY + (signH - 12) / 2;
    // BL
    ctx.fillStyle = '#0070bd';
    drawSafeRoundRect(ctx, signX + 32, badgeY, 18, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BL', signX + 41, badgeY + 6);

    // R
    ctx.fillStyle = '#e3002c';
    drawSafeRoundRect(ctx, signX + 53, badgeY, 16, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('R', signX + 61, badgeY + 6);

    // (4c) 臺灣鐵路與高鐵標籤
    ctx.fillStyle = '#0284c7';
    drawSafeRoundRect(ctx, signX + 72, badgeY, 22, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TRA', signX + 83, badgeY + 6);

    ctx.fillStyle = '#ea580c';
    drawSafeRoundRect(ctx, signX + 97, badgeY, 26, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('THSR', signX + 110, badgeY + 6);

    // (4d) 站名大字「臺北車站 TAIPEI MAIN STATION」
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(10, Math.min(18, signH * 0.42))}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('臺北車站 TAIPEI MAIN STATION', signX + 128, signY + signH / 2 + 1);
    ctx.restore();
  }

  // (6) 傳統市場與觀光夜市 (Traditional Market / Night Market)
  function drawMarketPlace(x, z, marketName) {
    const storeW = 28, storeH = 24;
    const bx = screenX(x - storeW / 2);
    const bz = screenZ(z - storeH / 2);
    // 主建築底色 (傳統暖色磚紅/檜木色)
    ctx.fillStyle = '#451a03';
    drawSafeRoundRect(ctx, bx, bz, storeW * scale, storeH * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 傳統中式斜簷 / 紅金雙色遮雨棚 (Striped Canopy)
    ctx.fillStyle = '#dc2626';
    drawSafeRoundRect(ctx, bx - 2, bz, (storeW + 4) * scale, 6 * scale, 4);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    for (let stripe = 0; stripe < storeW + 4; stripe += 8) {
      ctx.fillRect(bx - 2 + stripe * scale, bz, 4 * scale, 6 * scale);
    }

    // 門面官方向量傳統牌樓標誌 (純粹樣式，無多餘文字)
    const logoSize = Math.max(14, scale * 2.2);
    drawMarketArchwayLogo(ctx, bx + (storeW * scale) / 2, bz + 3 * scale, logoSize, logoSize * 0.8);

    // 左右兩側懸掛紅燈籠
    function drawLantern(lx, ly) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(lx, ly, 2.2 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.fillRect(lx - 1 * scale, ly - 0.5 * scale, 2 * scale, 1 * scale);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(lx - 0.5 * scale, ly + 2.2 * scale, 1 * scale, 1.5 * scale);
    }
    drawLantern(bx + 2 * scale, bz + 9 * scale);
    drawLantern(bx + (storeW - 2) * scale, bz + 9 * scale);

    // 熱鬧攤販檔口 (生鮮蔬果木箱 / 熱氣小吃吧台)
    ctx.fillStyle = '#92400e';
    drawSafeRoundRect(ctx, bx + 4 * scale, bz + 13 * scale, (storeW - 8) * scale, 8 * scale, 3);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 浮動純樣式標示 (scale >= 4.8)
    drawFloatingStoreBrandBadge(ctx, bx, bz, storeW, 'market', '#ef4444');
  }

  // 全雙北 176+ 處互動地標與連鎖門市動態加入深度排序清單 (Y-Sorting - 視錐剔除核心優化)
  interactables.forEach(it => {
    if (!isInViewport(it.x, it.z, 28)) return;
    const cleanName = (it.name || '').replace(/[\(\)]/g, '');
    if (it.type === 'coco') {
      renderList.push({ z: it.z, draw: () => drawCocoStore(it.x, it.z, cleanName) });
    } else if (it.type === 'familymart') {
      renderList.push({ z: it.z, draw: () => drawFamilyMartStore(it.x, it.z, cleanName) });
    } else if (it.type === 'seven') {
      renderList.push({ z: it.z, draw: () => drawSevenElevenStore(it.x, it.z, cleanName) });
    } else if (it.type === 'wanjiafu' || it.type === 'carrefour' || it.type === 'lejiakang') {
      renderList.push({ z: it.z, draw: () => drawWanjiafuStore(it.x, it.z, cleanName, !!it.isFlagship) });
    } else if (it.type === 'pxmart') {
      renderList.push({ z: it.z, draw: () => drawPxmartStore(it.x, it.z, cleanName) });
    } else if (it.type === 'mcdonalds') {
      renderList.push({ z: it.z, draw: () => drawMcdonaldsStore(it.x, it.z, cleanName) });
    } else if (it.type === 'starbucks') {
      renderList.push({ z: it.z, draw: () => drawStarbucksStore(it.x, it.z, cleanName) });
    } else if (it.type === 'mosburger') {
      renderList.push({ z: it.z, draw: () => drawMosBurgerStore(it.x, it.z, cleanName) });
    } else if (it.type === 'watsons') {
      renderList.push({ z: it.z, draw: () => drawWatsonsStore(it.x, it.z, cleanName) });
    } else if (it.type === 'cosmed') {
      renderList.push({ z: it.z, draw: () => drawCosmedStore(it.x, it.z, cleanName) });
    } else if (it.type === 'market') {
      renderList.push({ z: it.z, draw: () => drawMarketPlace(it.x, it.z, cleanName) });
    } else if (it.type === 'station') {
      renderList.push({
        z: it.z,
        draw: () => drawStationBuilding(it)
      });
    } else if (it.type === 'mrt_escalator') {
      renderList.push({
        z: it.z,
        draw: () => drawMrtEscalatorEntrance(it)
      });
    } else if (it.type === 'bus_stop') {
      renderList.push({
        z: it.z,
        draw: () => {
          const bx = screenX(it.x - 7);
          const bz = screenZ(it.z - 3);
          ctx.fillStyle = '#1e293b';
          drawSafeRoundRect(ctx, bx, bz, 14 * scale, 6 * scale, 3);
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.fillStyle = '#f59e0b';
          ctx.font = `bold ${Math.max(8.5, scale * 0.55)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(`🚏 307 站牌`, bx + 7 * scale, bz + 4 * scale);
        }
      });
    } else if (it.type === 'police') {
      renderList.push({
        z: it.z,
        draw: () => {
          const bx = screenX(it.x - 9);
          const bz = screenZ(it.z - 7);
          ctx.fillStyle = '#1e3a8a';
          drawSafeRoundRect(ctx, bx, bz, 18 * scale, 14 * scale, 4);
          ctx.fill();
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(9, scale * 0.6)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('👮 刑事偵查隊', bx + 9 * scale, bz + 8 * scale);
        }
      });
    } else if (it.type === 'ferry') {
      renderList.push({
        z: it.z,
        draw: () => {
          const bx = screenX(it.x - 9);
          const bz = screenZ(it.z - 7);
          ctx.fillStyle = '#0e7490';
          drawSafeRoundRect(ctx, bx, bz, 18 * scale, 14 * scale, 4);
          ctx.fill();
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(9, scale * 0.6)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('🚢 水岸渡輪棧道', bx + 9 * scale, bz + 8 * scale);
        }
      });
    } else if (it.type === 'rest') {
      renderList.push({
        z: it.z,
        draw: () => {
          const bx = screenX(it.x - 5);
          const bz = screenZ(it.z - 3);
          ctx.fillStyle = '#78350f';
          drawSafeRoundRect(ctx, bx, bz, 10 * scale, 6 * scale, 2);
          ctx.fill();
          ctx.fillStyle = '#fef3c7';
          ctx.font = `bold ${Math.max(8, scale * 0.5)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('🪑 休憩長椅', bx + 5 * scale, bz + 4 * scale);
        }
      });
    } else if (it.type === 'clue_ground') {
      renderList.push({
        z: it.z,
        draw: () => {
          const bx = screenX(it.x);
          const bz = screenZ(it.z);
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.arc(bx, bz, 4 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(8, scale * 0.5)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('🌸 紙條', bx, bz);
        }
      });
    } else if (it.type === 'park') {
      renderList.push({
        z: it.z,
        draw: () => {
          const bx = screenX(it.x - it.w / 2);
          const bz = screenZ(it.z - it.d / 2);
          // 雙北真實公園綠地 (半透明翠綠底 + 翡翠綠邊框)
          ctx.fillStyle = '#14532d';
          drawSafeRoundRect(ctx, bx, bz, it.w * scale, it.d * scale, 8);
          ctx.fill();
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          // 公園內部樹木與步道景觀
          const numTrees = Math.min(5, Math.max(2, Math.floor(it.w / 8)));
          for (let ti = 0; ti < numTrees; ti++) {
            const tx = bx + (ti * 7 + 4) * scale;
            const tz = bz + (it.d * 0.45) * scale;
            ctx.beginPath();
            ctx.arc(tx, tz, 2.8 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#15803d';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(tx - 0.6 * scale, tz - 0.6 * scale, 1.8 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#34d399';
            ctx.fill();
          }

          if (scale >= 1.5) {
            ctx.fillStyle = '#86efac';
            ctx.font = `bold ${Math.max(8.5, scale * 0.52)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(`🌲 ${it.name}`, bx + (it.w / 2) * scale, bz + (it.d / 2) * scale + 3);
          }
        }
      });
    }
  });

  // 雙北真實路網幹線公車車隊渲染 (Rotated 2.5D City Buses - 視錐剔除)
  cityBuses.forEach(bus => {
    if (!isInViewport(bus.x, bus.z, 30)) return;
    renderList.push({
      z: bus.z,
      draw: () => drawRotatedBus(bus)
    });
  });

  // 雙北捷運固定班距動態列車渲染 (Rotated 2.5D MRT Trains - 視錐剔除)
  mrtTrains.forEach(train => {
    if (!isInViewport(train.x, train.z, 40)) return;
    renderList.push({
      z: train.z,
      draw: () => drawRotatedMrtTrain(train)
    });
  });

  // 臺灣鐵路縱貫線動態列車渲染 (Rotated 2.5D TRA Trains - 視錐剔除)
  traTrains.forEach(train => {
    if (!isInViewport(train.x, train.z, 50)) return;
    renderList.push({
      z: train.z,
      draw: () => drawRotatedTraTrain(train)
    });
  });

  // 【人物與居民渲染】：依據使用者要求，在幽靈天眼模式下隱藏人物與居民！地面模式下才顯示！
  if (!gameState.isGhostMode) {
    // 角色動態等比縮放係數 (Dynamic Character Scale Factor)
    // 解決人物尺寸固定過小問題：隨 scale 動態放大，在特寫時達到超大巨型身形！
    const pScale = Math.max(1.0, scale * 0.22);
    const npcScale = Math.max(0.9, scale * 0.18);
    const rpScale = Math.max(1.0, scale * 0.22);

    // 1. NPC 行人居民 (隨 scale 動態放大)
    pedestrians.forEach(p => {
      p.walkCycle += 0.12;
      if (p.isZAxis) {
        p.z += p.dir * p.speed;
        if (p.z >= p.maxZ) p.dir = -1;
        else if (p.z <= p.minZ) p.dir = 1;
      } else {
        p.x += p.dir * p.speed;
        if (p.x >= p.maxX) p.dir = -1;
        else if (p.x <= p.minX) p.dir = 1;
      }

      renderList.push({
        z: p.z,
        draw: () => {
          const px = screenX(p.x);
          const pz = screenZ(p.z);
          // 陰影
          ctx.beginPath();
          ctx.ellipse(px, pz + 2 * npcScale, 8 * npcScale, 4 * npcScale, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.fill();

          // 軀幹
          ctx.fillStyle = p.shirt;
          drawSafeRoundRect(ctx, px - 6 * npcScale, pz - 16 * npcScale, 12 * npcScale, 12 * npcScale, 3 * npcScale);
          ctx.fill();

          // 頭部
          ctx.beginPath();
          ctx.arc(px, pz - 21 * npcScale, 5.5 * npcScale, 0, Math.PI * 2);
          ctx.fillStyle = '#fed7aa';
          ctx.fill();

          // 雙腿
          ctx.fillStyle = p.pants;
          const legSwing = Math.sin(p.walkCycle) * 3 * npcScale;
          ctx.fillRect(px - 4 * npcScale, pz - 4 * npcScale, 3 * npcScale, 5 * npcScale + legSwing);
          ctx.fillRect(px + 1 * npcScale, pz - 4 * npcScale, 3 * npcScale, 5 * npcScale - legSwing);
        }
      });
    });

    // 2. 遠端連線其他玩家 (隨 scale 動態放大)
    remotePlayers.forEach(rp => {
      renderList.push({
        z: rp.z || 0,
        draw: () => {
          const rx = screenX(rp.x || 0);
          const rz = screenZ(rp.z || 0);
          // 陰影
          ctx.beginPath();
          ctx.ellipse(rx, rz + 2 * rpScale, 9 * rpScale, 4.5 * rpScale, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.fill();

          // 綠色風衣軀幹
          ctx.fillStyle = '#059669';
          drawSafeRoundRect(ctx, rx - 7 * rpScale, rz - 18 * rpScale, 14 * rpScale, 14 * rpScale, 3 * rpScale);
          ctx.fill();

          // 頭部
          ctx.beginPath();
          ctx.arc(rx, rz - 23 * rpScale, 6 * rpScale, 0, Math.PI * 2);
          ctx.fillStyle = '#fed7aa';
          ctx.fill();

          // 暱稱標籤
          ctx.fillStyle = '#34d399';
          ctx.font = `bold ${Math.max(10, rpScale * 3.5)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(rp.nickname, rx, rz - 32 * rpScale);
        }
      });
    });

    // 3. 主角 (全息巡航者 - 支援超大微觀特寫 160x 動漫級精緻渲染)
    renderList.push({
      z: playerPos.z,
      draw: () => {
        const px = screenX(playerPos.x);
        const pz = screenZ(playerPos.z);

        // (1) 地面動態柔和陰影 (隨奔跑擴散)
        ctx.beginPath();
        const shadowW = (gameState.isRunning ? 20 : 15) * pScale;
        const shadowH = 6 * pScale;
        ctx.ellipse(px, pz + 2 * pScale, shadowW, shadowH, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fill();

        // (2) 戰術全息地面光環與 Google Maps 風格 60° 扇形視線探照光錐 (Vision Cone)
        if (scale >= 6.0) {
          ctx.save();
          const facingAngle = playerPos.facing === 'down' ? Math.PI / 2 :
                             (playerPos.facing === 'up' ? -Math.PI / 2 :
                             (playerPos.facing === 'left' ? Math.PI : 0));

          // 繪製 60° (Math.PI / 3) 扇形漸層探照光 (Google Maps Vision Cone)
          const coneRadius = 38 * pScale;
          const halfAngle = Math.PI / 6; // 30度
          const startAngle = facingAngle - halfAngle;
          const endAngle = facingAngle + halfAngle;

          const grad = ctx.createRadialGradient(px, pz + 2 * pScale, 2, px, pz + 2 * pScale, coneRadius);
          grad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
          grad.addColorStop(0.5, 'rgba(2, 132, 199, 0.20)');
          grad.addColorStop(1, 'rgba(0, 240, 255, 0)');

          ctx.beginPath();
          ctx.moveTo(px, pz + 2 * pScale);
          ctx.arc(px, pz + 2 * pScale, coneRadius, startAngle, endAngle);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();

          // 戰術全息地面光環
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
          ctx.lineWidth = Math.max(1.2, pScale * 0.25);
          ctx.beginPath();
          ctx.arc(px, pz + 2 * pScale, 14 * pScale, 0, Math.PI * 2);
          ctx.stroke();

          // 朝向指針
          const arrowDist = 14 * pScale;
          const ax = px + Math.cos(facingAngle) * arrowDist;
          const az = pz + 2 * pScale + Math.sin(facingAngle) * arrowDist;
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(ax, az, Math.max(2, 2.5 * pScale * 0.35), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // (3) 滑板 / 賽博懸浮滑板 (Cyber Hoverboard)
        if (gameState.hasSkateboard) {
          ctx.save();
          ctx.fillStyle = '#ef4444';
          drawSafeRoundRect(ctx, px - 16 * pScale, pz - 1 * pScale, 32 * pScale, 6 * pScale, 2.5 * pScale);
          ctx.fill();
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = Math.max(1, pScale * 0.2);
          ctx.stroke();
          // 懸浮光子氣流
          ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
          ctx.fillRect(px - 14 * pScale, pz + 5 * pScale, 28 * pScale, 1.8 * pScale);
          ctx.restore();
        }

        // (4) 動態擺動四肢與皮靴 (依朝向與 walkCycle 步態擺動)
        const cycle = playerPos.walkCycle;
        const swingDist = (gameState.isRunning ? 6.5 : 3.8) * pScale;
        const legSwing = playerPos.isMoving ? Math.sin(cycle) * swingDist : 0;
        const legW = 4.2 * pScale;
        const legH = 13 * pScale;
        const legSpacing = 4.2 * pScale;

        if (playerPos.facing === 'down' || playerPos.facing === 'up') {
          // 挺拔長褲 (深藍黑)
          ctx.fillStyle = '#1e293b';
          drawSafeRoundRect(ctx, px - legSpacing - legW / 2, pz - legH + legSwing * 0.7, legW, legH, 1.5 * pScale);
          ctx.fill();
          drawSafeRoundRect(ctx, px + legSpacing - legW / 2, pz - legH - legSwing * 0.7, legW, legH, 1.5 * pScale);
          ctx.fill();

          // 皮靴 (黑色皮革 + 科技鞋底)
          ctx.fillStyle = '#0f172a';
          drawSafeRoundRect(ctx, px - legSpacing - legW / 2 - 0.5 * pScale, pz + legSwing * 0.7 - 2 * pScale, legW + 1 * pScale, 4.5 * pScale, 1.5 * pScale);
          ctx.fill();
          drawSafeRoundRect(ctx, px + legSpacing - legW / 2 - 0.5 * pScale, pz - legSwing * 0.7 - 2 * pScale, legW + 1 * pScale, 4.5 * pScale, 1.5 * pScale);
          ctx.fill();

          // 鞋底微光
          if (pScale >= 2.0) {
            ctx.fillStyle = '#00f0ff';
            ctx.fillRect(px - legSpacing - legW / 2, pz + legSwing * 0.7 + 1.8 * pScale, legW, 0.8 * pScale);
            ctx.fillRect(px + legSpacing - legW / 2, pz - legSwing * 0.7 + 1.8 * pScale, legW, 0.8 * pScale);
          }
        } else {
          // 側面行走步伐 (Left / Right)
          const frontLegX = playerPos.facing === 'left' ? px - legSwing : px + legSwing;
          const backLegX = playerPos.facing === 'left' ? px + legSwing : px - legSwing;
          ctx.fillStyle = '#1e293b';
          drawSafeRoundRect(ctx, backLegX - legW / 2, pz - legH, legW, legH, 1.5 * pScale);
          ctx.fill();
          drawSafeRoundRect(ctx, frontLegX - legW / 2, pz - legH, legW, legH, 1.5 * pScale);
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          drawSafeRoundRect(ctx, backLegX - legW / 2 - 1 * pScale, pz - 2 * pScale, legW + 2 * pScale, 4.5 * pScale, 1.5 * pScale);
          ctx.fill();
          drawSafeRoundRect(ctx, frontLegX - legW / 2 - 1 * pScale, pz - 2 * pScale, legW + 2 * pScale, 4.5 * pScale, 1.5 * pScale);
          ctx.fill();
        }

        // (5) 風衣軀幹與外層俐落立體剪裁 (Anime Trenchcoat)
        const torsoW = 16 * pScale;
        const torsoH = 18 * pScale;
        const torsoY = pz - 29 * pScale;

        // 風衣飄動下擺
        const coatFlap = playerPos.isMoving ? Math.sin(cycle * 1.5) * (gameState.isRunning ? 3 : 1.5) * pScale : 0;
        ctx.fillStyle = '#1e40af';
        drawSafeRoundRect(ctx, px - torsoW / 2 - 1.5 * pScale, torsoY + torsoH * 0.55, torsoW + 3 * pScale, torsoH * 0.65 + coatFlap, 3 * pScale);
        ctx.fill();

        // 風衣主體 (深藍經典俐落風衣)
        ctx.fillStyle = '#1d4ed8';
        drawSafeRoundRect(ctx, px - torsoW / 2, torsoY, torsoW, torsoH, 4 * pScale);
        ctx.fill();

        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = Math.max(1, 0.8 * pScale);
        ctx.stroke();

        // 風衣細部裝飾 (領口、領結、胸章與腰帶)
        if (playerPos.facing === 'down') {
          // 襯衫白領
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.moveTo(px - 3.5 * pScale, torsoY);
          ctx.lineTo(px, torsoY + 7 * pScale);
          ctx.lineTo(px + 3.5 * pScale, torsoY);
          ctx.closePath();
          ctx.fill();

          // 鮮紅領帶 / 戰術科技領結
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.moveTo(px - 1.2 * pScale, torsoY + 1.5 * pScale);
          ctx.lineTo(px + 1.2 * pScale, torsoY + 1.5 * pScale);
          ctx.lineTo(px + 1.8 * pScale, torsoY + 9 * pScale);
          ctx.lineTo(px, torsoY + 11.5 * pScale);
          ctx.lineTo(px - 1.8 * pScale, torsoY + 9 * pScale);
          ctx.closePath();
          ctx.fill();

          // 金色金屬胸章
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(px - 4.5 * pScale, torsoY + 4 * pScale, 1.6 * pScale, 0, Math.PI * 2);
          ctx.fill();

          // 皮革腰帶與金屬帶扣
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px - torsoW / 2, torsoY + torsoH - 4.5 * pScale, torsoW, 3 * pScale);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(px - 2.5 * pScale, torsoY + torsoH - 5 * pScale, 5 * pScale, 4 * pScale);
        } else if (playerPos.facing === 'up') {
          // 背面風衣背脊壓線
          ctx.strokeStyle = '#1e3a8a';
          ctx.lineWidth = Math.max(1, pScale * 0.4);
          ctx.beginPath();
          ctx.moveTo(px, torsoY + 1 * pScale);
          ctx.lineTo(px, torsoY + torsoH);
          ctx.stroke();
          // 腰帶背面
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px - torsoW / 2, torsoY + torsoH - 4.5 * pScale, torsoW, 3 * pScale);
        } else {
          // 側身 (left / right)
          const sideDir = playerPos.facing === 'left' ? -1 : 1;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px - torsoW / 2, torsoY + torsoH - 4.5 * pScale, torsoW, 3 * pScale);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(px + sideDir * 2 * pScale - 1.5 * pScale, torsoY + torsoH - 5 * pScale, 3 * pScale, 4 * pScale);
        }

        // (6) 手臂與皮手套 (依移動自然前後擺動)
        const armW = 4.2 * pScale;
        const armH = 15 * pScale;
        const armSwing = playerPos.isMoving ? Math.cos(cycle) * swingDist : 0;

        // 左手
        ctx.fillStyle = '#1d4ed8';
        drawSafeRoundRect(ctx, px - torsoW / 2 - armW + 0.5 * pScale, torsoY + 2 * pScale - armSwing * 0.7, armW, armH - 3 * pScale, 2 * pScale);
        ctx.fill();
        ctx.fillStyle = '#334155';
        drawSafeRoundRect(ctx, px - torsoW / 2 - armW, torsoY + armH - 2 * pScale - armSwing * 0.7, armW + 0.5 * pScale, 4.5 * pScale, 2 * pScale);
        ctx.fill();

        // 右手
        ctx.fillStyle = '#1d4ed8';
        drawSafeRoundRect(ctx, px + torsoW / 2 - 0.5 * pScale, torsoY + 2 * pScale + armSwing * 0.7, armW, armH - 3 * pScale, 2 * pScale);
        ctx.fill();
        ctx.fillStyle = '#334155';
        drawSafeRoundRect(ctx, px + torsoW / 2 - 0.5 * pScale, torsoY + armH - 2 * pScale + armSwing * 0.7, armW + 0.5 * pScale, 4.5 * pScale, 2 * pScale);
        ctx.fill();

        // (7) 脖子、動漫面龐、眼神與層次髮絲 (Anime Face & High-Res Features)
        const headR = 8.5 * pScale;
        const headY = torsoY - headR + 2 * pScale;

        // 脖子
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(px - 2.5 * pScale, torsoY - 2 * pScale, 5 * pScale, 4 * pScale);

        // 頭部皮膚底色
        ctx.beginPath();
        ctx.arc(px, headY, headR, 0, Math.PI * 2);
        ctx.fillStyle = '#fed7aa';
        ctx.fill();

        if (playerPos.facing === 'down') {
          // 動漫大眼
          const eyeY = headY - 0.5 * pScale;
          const eyeSpacing = 3.6 * pScale;
          const eyeW = 2.4 * pScale;
          const eyeH = 3.0 * pScale;

          // 眼白
          ctx.fillStyle = '#ffffff';
          drawSafeRoundRect(ctx, px - eyeSpacing - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH, 1.2 * pScale);
          ctx.fill();
          drawSafeRoundRect(ctx, px + eyeSpacing - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH, 1.2 * pScale);
          ctx.fill();

          // 寶石青藍瞳孔
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(px - eyeSpacing, eyeY, 1.2 * pScale, 0, Math.PI * 2);
          ctx.arc(px + eyeSpacing, eyeY, 1.2 * pScale, 0, Math.PI * 2);
          ctx.fill();

          // 眼神靈魂高光
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px - eyeSpacing - 0.4 * pScale, eyeY - 0.5 * pScale, 0.5 * pScale, 0, Math.PI * 2);
          ctx.arc(px + eyeSpacing - 0.4 * pScale, eyeY - 0.5 * pScale, 0.5 * pScale, 0, Math.PI * 2);
          ctx.fill();

          // 堅毅微笑
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = Math.max(1, 0.7 * pScale);
          ctx.beginPath();
          ctx.arc(px, headY + 3.8 * pScale, 2 * pScale, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.stroke();

          // 前額層次瀏海
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.moveTo(px - headR + 1 * pScale, headY - 2 * pScale);
          ctx.lineTo(px - 4 * pScale, headY + 1.2 * pScale);
          ctx.lineTo(px - 1.5 * pScale, headY - 1.5 * pScale);
          ctx.lineTo(px + 1 * pScale, headY + 1.5 * pScale);
          ctx.lineTo(px + 4 * pScale, headY - 1 * pScale);
          ctx.lineTo(px + headR - 1 * pScale, headY - 2 * pScale);
          ctx.closePath();
          ctx.fill();
        } else if (playerPos.facing === 'left' || playerPos.facing === 'right') {
          const sideDir = playerPos.facing === 'left' ? -1 : 1;
          ctx.fillStyle = '#ffffff';
          drawSafeRoundRect(ctx, px + sideDir * 3.5 * pScale - 1.2 * pScale, headY - 1.5 * pScale, 2.4 * pScale, 3.0 * pScale, 1.2 * pScale);
          ctx.fill();
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(px + sideDir * 3.5 * pScale, headY - 0.2 * pScale, 1.1 * pScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px + sideDir * 3.2 * pScale, headY - 0.5 * pScale, 0.45 * pScale, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 背面立體髮流
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(px, headY, headR * 0.95, 0, Math.PI * 2);
          ctx.fill();
        }

        // (8) 帥氣軟呢偵探帽 / 科技貝雷帽 (Fedora / Cyber Cap)
        const hatBrimW = 26 * pScale;
        const hatBrimH = 6 * pScale;
        const hatBrimY = headY - headR * 0.7;

        // 帽簷
        ctx.fillStyle = '#0f172a';
        drawSafeRoundRect(ctx, px - hatBrimW / 2, hatBrimY, hatBrimW, hatBrimH, 2.8 * pScale);
        ctx.fill();

        // 帽冠
        const hatCrownW = 17 * pScale;
        const hatCrownH = 11 * pScale;
        const hatCrownY = hatBrimY - hatCrownH + 1 * pScale;
        ctx.fillStyle = '#1e293b';
        drawSafeRoundRect(ctx, px - hatCrownW / 2, hatCrownY, hatCrownW, hatCrownH, 3.5 * pScale);
        ctx.fill();

        // 賽博青光霓虹飾帶 (Cyber Cyan Ribbon)
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(px - hatCrownW / 2, hatBrimY - 2.5 * pScale, hatCrownW, 2.5 * pScale);

        // (9) 動態全息對話氣泡 (Dynamic Floating Holographic Bubble)
        const bubbleText = gameState.currentBubble;
        const bFontSize = Math.min(14, Math.max(11, pScale * 1.5));
        ctx.font = `bold ${bFontSize}px sans-serif`;
        const bMetrics = ctx.measureText(bubbleText);
        const bubbleW = Math.max(120, bMetrics.width + 24);
        const bubbleH = Math.min(32, Math.max(22, pScale * 2.2));
        const bubbleY = hatCrownY - bubbleH - 12;

        ctx.fillStyle = 'rgba(10, 25, 50, 0.92)';
        drawSafeRoundRect(ctx, px - bubbleW / 2, bubbleY, bubbleW, bubbleH, 6);
        ctx.fill();
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 1.3;
        ctx.stroke();

        // 氣泡指向下角尖嘴
        ctx.fillStyle = 'rgba(10, 25, 50, 0.92)';
        ctx.beginPath();
        ctx.moveTo(px - 5, bubbleY + bubbleH);
        ctx.lineTo(px, bubbleY + bubbleH + 5);
        ctx.lineTo(px + 5, bubbleY + bubbleH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#00d2ff';
        ctx.beginPath();
        ctx.moveTo(px - 5, bubbleY + bubbleH);
        ctx.lineTo(px, bubbleY + bubbleH + 5);
        ctx.lineTo(px + 5, bubbleY + bubbleH);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(bubbleText, px, bubbleY + bubbleH * 0.65);
      }
    });
  } else {
    // 🛰️ 天眼幽靈巡航模式：在中心繪製高科技幽靈雷達光學準星 (Drone Crosshair & Scanning Reticle)
    renderList.push({
      z: camera.z,
      draw: () => {
        const cx = screenX(camera.x);
        const cz = screenZ(camera.z);
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 210, 255, 0.65)';
        ctx.lineWidth = 1.6;

        // 旋轉雷達瞄準環
        ctx.beginPath();
        ctx.arc(cx, cz, 22, 0, Math.PI * 2);
        ctx.stroke();

        // 四角準星標記
        const rLen = 14;
        ctx.beginPath();
        ctx.moveTo(cx - 30, cz); ctx.lineTo(cx - 30 + rLen, cz);
        ctx.moveTo(cx + 30, cz); ctx.lineTo(cx + 30 - rLen, cz);
        ctx.moveTo(cx, cz - 30); ctx.lineTo(cx, cz - 30 + rLen);
        ctx.moveTo(cx, cz + 30); ctx.lineTo(cx, cz + 30 - rLen);
        ctx.stroke();

        // 中心雷達掃描小點
        ctx.beginPath();
        ctx.arc(cx, cz, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.restore();
      }
    });
  }

  // 依據 Z 軸進行動態深度排序並繪製
  renderList.sort((a, b) => a.z - b.z);
  renderList.forEach(item => item.draw());

  // ──────────────────────────────────────────
  // 第四層：頂層高架橋與動態立體光影 (市民大道高架段)
  // ──────────────────────────────────────────
  const bridgeZ = screenZ(-42);
  ctx.fillStyle = '#334155';
  ctx.fillRect(screenX(-220), bridgeZ - 8 * scale, 440 * scale, 14 * scale);
  // 高架金屬護欄
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(screenX(-220), bridgeZ - 8 * scale, 440 * scale, 1.4 * scale);
  ctx.fillRect(screenX(-220), bridgeZ + 6 * scale, 440 * scale, 1.4 * scale);
  // 高架橋鋼骨立墩 (Pillars)
  for (let px = -200; px <= 200; px += 45) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(screenX(px - 2), bridgeZ + 6 * scale, 4 * scale, 24 * scale);
  }
  // 高架橋在地面投射之立體陰影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(screenX(-220), bridgeZ + 6 * scale, 440 * scale, 10 * scale);

  // ──────────────────────────────────────────
  // 第 4.5 層：10 大生活科學探究示範案件現場光標 (🚨 Demonstration Crime Beacons - 視錐剔除)
  // ──────────────────────────────────────────
  const demoCases = (typeof DEMO_10_CASES !== 'undefined') ? DEMO_10_CASES : [];
  demoCases.forEach(c => {
    if (!isInViewport(c.worldX, c.worldZ, 35)) return;
    const sx = screenX(c.worldX);
    const sz = screenZ(c.worldZ);
    const pulse = (Math.sin(Date.now() / 240) + 1) / 2;

    // 外層光暈波紋
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
    ctx.lineWidth = Math.max(1.8, scale * 0.18);
    ctx.beginPath();
    ctx.arc(sx, sz, (13 + pulse * 10) * Math.min(2.5, Math.max(0.65, scale * 0.22)), 0, Math.PI * 2);
    ctx.stroke();

    // 核心警報標記
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(sx, sz, 8.5 * Math.min(2.5, Math.max(0.65, scale * 0.22)), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 標籤卡片
    if (scale >= 1.5) {
      const tagW = 120;
      const tagH = 20;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.2;
      drawSafeRoundRect(ctx, sx - tagW / 2, sz - 28, tagW, tagH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fecdd3';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`🚨 ${c.id}: 案${c.num}`, sx, sz - 14);
    }
  });

  ctx.restore(); // 恢復 translate(cx, cy)
  ctx.restore(); // 恢復 Retina scale(dpr, dpr)
}

/* ─── 9. 地點偵測與互動判定 ─── */
const interactPrompt = document.getElementById("interactPrompt");
const interactLabel = document.getElementById("interactLabel");
const actionPillsStack = document.getElementById("actionPillsStack");
const locationText = document.getElementById("locationText");
let lastNearestId = null;
let hasPlayedDoorbell = false;

function checkProximityAndLocation() {
  let currentLoc = "忠孝西路一段 ✕ 館前路口";
  let nearestItem = null;
  let minItemDist = 20;
  let nearest = null;
  let minD = 999;

  const px = playerPos.x;
  const pz = playerPos.z;

  // 單趟走訪 + 曼哈頓快速粗篩 (解決百處門市每幀重複兩次距離運算的卡頓瓶頸)
  for (let i = 0; i < interactables.length; i++) {
    const item = interactables[i];
    if (Math.abs(px - item.x) > 25 || Math.abs(pz - item.z) > 25) continue;

    const d = Math.hypot(px - item.x, pz - item.z);
    if (d < minItemDist) {
      minItemDist = d;
      nearestItem = item;
    }
    const targetR = item.r || 8.5;
    if (d < targetR && d < minD) {
      minD = d;
      nearest = item;
    }
  }

  if (nearestItem) {
    currentLoc = `${nearestItem.name} (${nearestItem.address || '雙北核心商圈'})`;
  } else {
    // 區域街區名稱備援
    if (pz > 95 && px < -60) currentLoc = "板橋區・學府路一段 ✕ 新板特區商圈";
    else if (pz < -60 && px > 30) currentLoc = "中山區・中山北路林蔭大道 ✕ 南京商圈";
    else if (pz < -60 && px < -60) currentLoc = "大同區・建成圓環 ✕ 寧夏夜市商圈";
    else if (pz > 15 && px < -90) currentLoc = "萬華/中正・重慶南路書店街 ✕ 西門町商圈";
    else currentLoc = "中正區・忠孝西路一段 ✕ 台北車站站前廣場";
  }

  if (gameState.currentLocationName !== currentLoc) {
    gameState.currentLocationName = currentLoc;
    if (locationText) locationText.innerText = currentLoc;
  }

  // 體力警告
  const warnBanner = document.getElementById("staminaWarningBanner");
  if (warnBanner) {
    const shouldShow = gameState.stamina <= 18 ? "flex" : "none";
    if (warnBanner.style.display !== shouldShow) warnBanner.style.display = shouldShow;
  }

  if (nearest) {
    gameState.activeInteractTarget = nearest.type;
    interactLabel.innerText = nearest.label;
    interactPrompt.style.display = "flex";

    if (nearest.id !== lastNearestId) {
      lastNearestId = nearest.id;
      updateActionPills(nearest);
      if ((nearest.type === 'familymart' || nearest.type === 'seven' || nearest.type === 'coco' || nearest.type === 'carrefour' || nearest.type === 'wanjiafu' || nearest.type === 'market') && !hasPlayedDoorbell) {
        playStoreChime();
        hasPlayedDoorbell = true;
      }
    }
  } else {
    gameState.activeInteractTarget = null;
    interactPrompt.style.display = "none";
    hasPlayedDoorbell = false;
    if (lastNearestId !== null) {
      lastNearestId = null;
      actionPillsStack.innerHTML = "";
    }
  }
}

function updateActionPills(item) {
  actionPillsStack.innerHTML = "";
  if (item.type === "bus_stop") {
    addActionPill(`🚌 搭乘 307 公車`, "E", () => boardTaipeiBus('307', item.dest || 'zhongshan'));
  } else if (item.type === "mrt_escalator") {
    addActionPill("🚇 搭手扶梯進地下月台", "E", () => openMrtStationModal());
  } else if (item.type === "coco") {
    addActionPill(`🧋 進入 CoCo (${item.name})`, "E", () => openCocoModal(item));
  } else if (item.type === "familymart") {
    addActionPill(`🏪 進入全家 (${item.name})`, "E", () => openStoreModal(item));
    addActionPill("🥚 購買熱茶葉蛋 ($13)", "🥚", () => buyTeaEgg());
    addActionPill("🛹 購買極速滑板 ($300)", "🛹", () => buySkateboard());
  } else if (item.type === "seven") {
    addActionPill(`🏪 進入 7-Eleven (${item.name})`, "E", () => openSevenModal(item));
    addActionPill("🍙 買肉鬆御飯糰 ($30)", "🍙", () => buyRiceBall());
    addActionPill("☕ 買 CITY CAFE 拿鐵 ($45)", "☕", () => buyLatte());
    addActionPill("🍵 買茶裏王無糖綠 ($25)", "🍵", () => buyKingTea());
  } else if (item.type === "wanjiafu" || item.type === "carrefour" || item.type === "pxmart") {
    const isFlag = !!item.isFlagship;
    addActionPill(`🛒 進入${isFlag ? '萬家福旗艦量販' : '樂家康超市'} (${item.name})`, "E", () => openWanjiafuModal(item));
    addActionPill("🍞 買高能複合餐包 ($40)", "🍞", () => buyWanjiafuToast());
    addActionPill("💧 買離子電解水 ($30)", "💧", () => buyWanjiafuWater());
    addActionPill("🧰 買全像探測補給箱 ($120)", "🧰", () => buyWanjiafuBox());
  } else if (item.type === "market") {
    addActionPill(`🏮 進入 ${item.name}`, "E", () => openMarketModal(item));
    addActionPill("🍜 買古早味切仔麵 ($45)", "🍜", () => buyMarketFood('noodle', 45));
    addActionPill("🌯 買現包傳香潤餅 ($50)", "🌯", () => buyMarketFood('roll', 50));
    addActionPill("🍢 買現炸旗魚黑輪 ($30)", "🍢", () => buyMarketFood('fishcake', 30));
  } else if (item.type === "police") {
    addActionPill("📹 調閱 CCTV 軌跡", "E", () => openCctvModal());
    addActionPill("🚓 進行筆錄對質逮捕", "🚨", () => openInterrogateModal());
  } else if (item.type === "nightmarket") {
    addActionPill("🏮 品嚐夜市美食", "E", () => openNightMarketModal());
  } else if (item.type === "ferry") {
    addActionPill("🚢 欣賞淡水河風景", "E", () => openFerryModal());
  } else if (item.type === "clue_ground") {
    addActionPill("📜 調查花圃暗號紙條", "E", () => guideToClue());
  } else if (item.type === "rest") {
    addActionPill("🛏️ 長椅休息", "E", () => openRestModal());
  } else if (item.type === "park") {
    addActionPill(`🌲 漫步 ${item.name}`, "E", () => openParkModal(item));
    addActionPill("🌿 進行生態深呼吸 (體力+35)", "🌿", () => restInPark(item));
  }
}

function addActionPill(text, badge, onClick) {
  const btn = document.createElement("div");
  btn.className = "action-pill-btn";
  btn.innerHTML = `<span class="key-badge">${badge}</span> <span>${text}</span>`;
  btn.onclick = onClick;
  actionPillsStack.appendChild(btn);
}

function triggerCurrentInteraction() {
  const type = gameState.activeInteractTarget;
  if (!type) return;
  playTone(550, 'triangle', 0.1);

  const nearest = interactables.find(i => i.type === type && Math.hypot(playerPos.x - i.x, playerPos.z - i.z) < (i.r + 6));
  triggerDirectInteraction(nearest || { type });
}

function triggerDirectInteraction(it) {
  if (!it) return;
  playTone(550, 'triangle', 0.1);

  if (it.type === "bus_stop") boardTaipeiBus('307', it.dest || 'zhongshan');
  else if (it.type === "mrt_escalator") openMrtStationModal();
  else if (it.type === "coco") openCocoModal(it);
  else if (it.type === "familymart") openStoreModal(it);
  else if (it.type === "seven") openSevenModal(it);
  else if (it.type === "wanjiafu" || it.type === "carrefour" || it.type === "pxmart") openWanjiafuModal(it);
  else if (it.type === "market") openMarketModal(it);
  else if (it.type === "police") openCctvModal();
  else if (it.type === "nightmarket") openNightMarketModal();
  else if (it.type === "ferry") openFerryModal();
  else if (it.type === "rest") openRestModal();
  else if (it.type === "park") openParkModal(it);
  else if (it.type === "clue_ground") guideToClue();
}

function openParkModal(park) {
  if (!park) return;
  showNavToast(`🌲 漫步抵達【${park.name}】！沉浸於真實自然生態中！`);
  showDetectiveDialogue(`「抵達【${park.name}】(${park.category || '公園綠地'})！特色：${park.features || '綠意盎然、芬多精環繞、都會中的大自然庇護所'}。」`, "雙北生態");
  playTone(523, 'sine', 0.2);
}

function restInPark(park) {
  if (!park) return;
  gameState.stamina = Math.min(100, gameState.stamina + 35);
  gameState.mood = Math.min(100, gameState.mood + 30);
  updateBars();
  playTone(659, 'triangle', 0.25);
  showNavToast(`🌿 在【${park.name}】深呼吸芬多精！體力 +35、心情 +30！`);
  showDetectiveDialogue(`「在【${park.name}】林蔭草坪深呼吸，充分吸收負離子與芬多精，體能與精神狀態大幅回升！」`, "體能維護");
}

function guideToClue() {
  alert("📜 拾獲站前花圃紙條！上頭寫著：『14:12 在忠孝西路刷卡搭乘 307 公車』！已列入關鍵證物簿！");
  gameState.cluesFound = Math.min(3, gameState.cluesFound + 1);
  gameState.quests.clues = true;
  updateQuestProgress();
}

function alertPlanRoute(routeId) {
  if (routeId === 'bus_307') {
    showNavToast("🚌 307 幹線公車：請走到忠孝西路中央專用道候車站牌，嗶卡上車即可啟用快轉過場！");
  } else if (routeId === 'bus_zs') {
    showNavToast("🚌 中山幹線公車：沿中山北路林蔭大道行駛，停靠 CoCo 都可門市前站牌！");
  } else if (routeId === 'mrt_red') {
    showNavToast("🚇 捷運淡水信義線：請走到站前 M6 或 中山出入口，搭乘手扶梯進入地下月台！");
  } else if (routeId === 'bus_cd') {
    showNavToast("🚌 承德幹線：沿重慶北路通往寧夏夜市，請前往西側站牌搭乘！");
  }
  closeModal('mapModal');
}

/* ─── 10. 消費、物品與對質逮捕 ─── */
function buyBobaTea() {
  if (gameState.money < 50) return alert("悠遊卡餘額不足 $50 囉！");
  gameState.money -= 50;
  gameState.stamina = Math.min(100, gameState.stamina + 35);
  gameState.mood = Math.min(100, gameState.mood + 30);
  gameState.hasBoba = true;
  updateBars();
  playTone(650, 'sine', 0.12);
  alert("🧋 咕嚕嚕～CoCo 招牌珍珠奶茶超好喝！體力 +35，心情 +30！");
  gameState.quests.coco = true;
  updateQuestProgress();
  closeModal('cocoModal');
}

function buyGreenTea() {
  if (gameState.money < 35) return alert("餘額不足！");
  gameState.money -= 35;
  gameState.stamina = Math.min(100, gameState.stamina + 20);
  updateBars();
  playTone(680, 'sine', 0.1);
  alert("🍋 CoCo 四季春青茶清香解渴，體力 +20！");
  closeModal('cocoModal');
}

function buyTeaEgg() {
  if (gameState.money < 13) return alert("悠遊卡餘額不足 $13 囉！");
  gameState.money -= 13;
  gameState.stamina = Math.min(100, gameState.stamina + 25);
  gameState.hasTeaEgg = true;
  updateBars();
  playTone(650, 'sine', 0.1);
  alert("🥚 熱騰騰全家茶葉蛋真香！體力 +25！自備購物袋響應六年級減塑生活！");
  gameState.quests.store = true;
  updateQuestProgress();
  closeModal('storeModal');
}

function buyDrink() {
  if (gameState.money < 25) return alert("餘額不足！");
  gameState.money -= 25;
  gameState.mood = Math.min(100, gameState.mood + 20);
  updateBars();
  playTone(700, 'sine', 0.1);
  alert("🧃 喝了冰涼運動飲料！心情值 +20！");
  closeModal('storeModal');
}

function buySkateboard() {
  if (gameState.money < 300) return alert("生活金不足 $300！破案後領取獎金再來購買吧！");
  gameState.money -= 300;
  gameState.hasSkateboard = true;
  const btn = document.getElementById("btnSkateboard");
  if (btn) { btn.innerText = "已裝備"; btn.disabled = true; }
  playTone(850, 'triangle', 0.15);
  alert("🛹 裝備極速電動滑板！移動速度提升至 1.10！疾馳全雙北街區！");
  closeModal('storeModal');
}

function buyRiceBall() {
  if (gameState.money < 30) return alert("悠遊卡餘額不足 $30 囉！");
  gameState.money -= 30;
  gameState.stamina = Math.min(100, gameState.stamina + 30);
  updateBars();
  playTone(680, 'sine', 0.12);
  alert("🍙 享用 7-Eleven 經典肉鬆御飯糰！酥脆海苔搭配香濃肉鬆，體力 +30！");
  gameState.quests.store = true;
  updateQuestProgress();
  closeModal('sevenModal');
}

function buyLatte() {
  if (gameState.money < 45) return alert("悠遊卡餘額不足 $45 囉！");
  gameState.money -= 45;
  gameState.mood = Math.min(100, gameState.mood + 25);
  updateBars();
  playTone(720, 'sine', 0.12);
  alert("☕ 喝了一杯 7-Eleven CITY CAFE 冰拿鐵！濃郁咖啡香放鬆辦案心情，心情 +25！");
  gameState.quests.store = true;
  updateQuestProgress();
  closeModal('sevenModal');
}

function buyKingTea() {
  if (gameState.money < 25) return alert("悠遊卡餘額不足 $25 囉！");
  gameState.money -= 25;
  gameState.stamina = Math.min(100, gameState.stamina + 20);
  updateBars();
  playTone(660, 'sine', 0.1);
  alert("🍵 喝了 7-Eleven 茶裏王日式無糖綠！回甘就像現泡，解渴生津體力 +20！");
  gameState.quests.store = true;
  updateQuestProgress();
  closeModal('sevenModal');
}

function buySnack(type, price) {
  if (gameState.money < price) return alert(`餘額不足 $${price}！`);
  gameState.money -= price;
  gameState.stamina = 100;
  gameState.mood = 100;
  updateBars();
  playTone(800, 'sine', 0.15);
  alert(type === 'chicken' ? "🍗 寧夏夜市現炸鹽酥雞九層塔香氣爆棚！體力心情全滿！" : "🐙 濃純日式章魚燒精神百倍！");
  closeModal('nightMarketModal');
}

function restAndRecover() {
  gameState.stamina = Math.min(100, gameState.stamina + 50);
  updateBars();
  playTone(520, 'sine', 0.15);
  alert("🛏️ 在候車長椅閉目休息片刻，體力恢復 +50！");
  closeModal('restModal');
}

function drinkWater() {
  gameState.stamina = Math.min(100, gameState.stamina + 25);
  updateBars();
  playTone(600, 'sine', 0.1);
  alert("☕ 喝了環保隨身保溫瓶的溫水，體力恢復 +25！");
  closeModal('restModal');
}

function confrontSuspect(choice) {
  closeModal('interrogateModal');
  if (choice === 'easycard') {
    playSlapSound();
    alert("💥【現場筆錄打臉成功！】\n出示 TIB 悠遊卡紀錄：嫌疑人 14:12 在忠孝西路刷卡搭乘 307 公車！\n黑帽男子當場無言以對：「我…我認罪！公事包我藏在月台後方了！」");

    gameState.quests.arrest = true;
    updateQuestProgress();

    if (isOnlineWithServer && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'case_solved', title: '雙北公車竊盜案' }));
    } else {
      showBreakingNews(`${gameState.nickname} 運用公車刷卡大數據，成功偵破【雙北公車竊盜案】！`);
      playVictoryFanfare();
    }
    openVictoryModal();
  } else {
    playBuzzer();
    alert("❌ 呈堂物證不符！茶葉蛋發票無法證明嫌犯搭乘公車之行蹤！請出示交通電子票證紀錄！");
  }
}

function updateQuestProgress() {
  const stBus = document.getElementById("stBus");
  const stStore = document.getElementById("stStore");
  const stCctv = document.getElementById("stCctv");
  const stArrest = document.getElementById("stArrest");

  if (gameState.quests.bus && stBus) { stBus.innerText = "已完成 ✅"; stBus.style.color = "#10b981"; }
  if ((gameState.quests.coco || gameState.quests.store) && stStore) { stStore.innerText = "已完成 ✅"; stStore.style.color = "#10b981"; }
  if (gameState.quests.tib && stCctv) { stCctv.innerText = "已完成 ✅"; stCctv.style.color = "#10b981"; }
  if (gameState.quests.arrest && stArrest) { stArrest.innerText = "已破案 🏆"; stArrest.style.color = "#10b981"; }

  const mapMoney = document.getElementById("mapMoney");
  if (mapMoney) mapMoney.innerText = gameState.money;
  const invMoney = document.getElementById("invMoney");
  if (invMoney) invMoney.innerText = gameState.money;

  const descBoba = document.getElementById("descBoba");
  if (descBoba && gameState.hasBoba) {
    descBoba.innerText = "持有中";
    const slot = document.getElementById("slotBoba");
    if (slot) slot.classList.add("active");
  }
  const descTeaEgg = document.getElementById("descTeaEgg");
  if (descTeaEgg && gameState.hasTeaEgg) {
    descTeaEgg.innerText = "持有中";
    const slot = document.getElementById("slotTeaEgg");
    if (slot) slot.classList.add("active");
  }
  const descSkateboard = document.getElementById("descSkateboard");
  if (descSkateboard && gameState.hasSkateboard) {
    descSkateboard.innerText = "已裝備";
    const slot = document.getElementById("slotSkateboard");
    if (slot) slot.classList.add("active");
  }
}

function updateBars() {
  const sFill = document.getElementById("barStamina");
  if (sFill) {
    sFill.style.width = Math.round(gameState.stamina) + "%";
    if (gameState.stamina <= 18) sFill.classList.add("low");
    else sFill.classList.remove("low");
  }
  const sTxt = document.getElementById("txtStamina");
  if (sTxt) sTxt.innerText = `${Math.round(gameState.stamina)}/100`;

  const mFill = document.getElementById("barMood");
  if (mFill) mFill.style.width = Math.round(gameState.mood) + "%";
  const mTxt = document.getElementById("txtMood");
  if (mTxt) mTxt.innerText = `${Math.round(gameState.mood)}/100`;
}

function showNavToast(text) {
  const toast = document.getElementById("navHintToast");
  const txt = document.getElementById("navHintText");
  if (!toast || !txt) return;
  txt.innerText = text;
  toast.style.display = "flex";
  playTone(520, 'sine', 0.12);
  setTimeout(() => toast.style.display = "none", 4200);
}

function showDetectiveDialogue(text, speaker = "戰術中樞") {
  const box = document.getElementById("detectiveDialogueBox");
  const spk = document.getElementById("diagSpeaker");
  const txt = document.getElementById("diagText");
  if (spk) spk.innerText = speaker;
  if (txt) txt.innerText = text;
  if (box) box.style.display = "flex";
}
function closeDialogueBox() {
  const box = document.getElementById("detectiveDialogueBox");
  if (box) box.style.display = "none";
}

/* ─── 11. 天氣、彈窗與 UI 控制 ─── */
function toggleWeather() {
  const icon = document.getElementById("weatherIcon");
  const text = document.getElementById("weatherTimeText");

  if (gameState.weather === 'sunny') {
    gameState.weather = 'sunset';
    if (icon) icon.innerText = "🌇";
    if (text) text.innerText = "傍晚 17:15";
  } else if (gameState.weather === 'sunset') {
    gameState.weather = 'night';
    if (icon) icon.innerText = "🌙";
    if (text) text.innerText = "晴夜 20:30";
  } else {
    gameState.weather = 'sunny';
    if (icon) icon.innerText = "☀️";
    if (text) text.innerText = "晴天 10:24";
  }
  playTone(500, 'sine', 0.05);
}

function toggleMainQuestCard() {
  const c = document.getElementById("mainQuestCard");
  if (c) c.style.display = (c.style.display === "none") ? "block" : "none";
}
function toggleHintQuestCard() {
  const c = document.getElementById("hintQuestCard");
  if (c) c.style.display = (c.style.display === "none") ? "block" : "none";
}

function openCocoModal(store) {
  const modal = document.getElementById("cocoModal");
  if (modal) {
    if (store && store.name) {
      const title = modal.querySelector(".modal-title");
      if (title) title.innerHTML = `<span>🧋</span> ${store.name}`;
    }
    modal.style.display = "flex";
  }
}

function openStoreModal(store) {
  const modal = document.getElementById("storeModal");
  if (modal) {
    if (store && store.name) {
      const title = modal.querySelector(".modal-title");
      if (title) title.innerHTML = `<span>🏪</span> ${store.name} (24H 門市)`;
    }
    modal.style.display = "flex";
  }
}

function openSevenModal(store) {
  const modal = document.getElementById("sevenModal");
  if (modal) {
    if (store && store.name) {
      const title = modal.querySelector(".modal-title");
      if (title) title.innerHTML = `<span>🏪</span> ${store.name} (24H 門市)`;
    }
    modal.style.display = "flex";
  }
}

function openWanjiafuModal(store) {
  const modal = document.getElementById("wanjiafuModal") || document.getElementById("carrefourModal");
  if (modal) {
    if (store && store.name) {
      const title = modal.querySelector(".modal-title");
      if (title) title.innerHTML = `<span>🏬</span> ${store.name}`;
      const greet = document.getElementById("wanjiafuBranchGreeting") || document.getElementById("carrefourBranchGreeting");
      if (greet) {
        const isFlag = !!store.isFlagship;
        greet.innerText = `店長親切招呼：「科技生活，盡在${isFlag ? '萬家福旗艦量販' : '樂家康超市'}！【${store.name}】全雙北量子物流互聯，提供充足探索能量與補給！」`;
      }
    }
    modal.style.display = "flex";
  }
}

function openCarrefourModal(store) {
  openWanjiafuModal(store);
}

function openPxmartModal(store) {
  openWanjiafuModal(store);
}

function openMarketModal(market) {
  const modal = document.getElementById("marketModal");
  if (modal) {
    if (market && market.name) {
      const title = document.getElementById("marketModalTitle");
      if (title) title.innerHTML = `<span>🏮</span> ${market.name}`;
      const addr = document.getElementById("marketAddress");
      if (addr) addr.innerText = market.address || "雙北在地市集街區";
      const greet = document.getElementById("marketGreeting");
      if (greet) {
        greet.innerText = `市場攤商熱情招呼：「歡迎來到【${market.name}】！傳承數十載的正宗雙北在地美味，生鮮現採、小吃現煮，吃了精神百倍！」`;
      }
    }
    modal.style.display = "flex";
  }
}

function buyMarketFood(foodType, price) {
  if (gameState.money < price) return alert(`悠遊卡餘額不足 $${price} 囉！`);
  gameState.money -= price;
  if (foodType === 'noodle') {
    gameState.stamina = Math.min(100, gameState.stamina + 40);
    gameState.mood = Math.min(100, gameState.mood + 25);
    showNavToast("🍜 享用傳統市場古早味切仔麵！體力 +40、心情 +25！");
    showDetectiveDialogue("「滾燙大骨高湯配上油麵與豆芽紅燒肉，在地老味道真暖心！」", "戰術中樞");
  } else if (foodType === 'roll') {
    gameState.stamina = Math.min(100, gameState.stamina + 35);
    gameState.mood = Math.min(100, gameState.mood + 30);
    showNavToast("🌯 享用現包傳香潤餅捲！體力 +35、心情 +30！");
    showDetectiveDialogue("「滿滿脆甜高麗菜加上香甜花生粉與蛋酥，酥脆爽口！」", "戰術中樞");
  } else if (foodType === 'fishcake') {
    gameState.stamina = Math.min(100, gameState.stamina + 20);
    gameState.mood = Math.min(100, gameState.mood + 35);
    showNavToast("🍢 享用現炸旗魚黑輪！心情 +35！");
    showDetectiveDialogue("「金黃現炸旗魚黑輪熱氣騰騰，咬開還有包水煮蛋，太滿足了！」", "戰術中樞");
  }
  updateBars();
  playTone(660, 'sine', 0.15);
  closeModal('marketModal');
}

function openMrtStationModal() { document.getElementById("mrtStationModal").style.display = "flex"; }
function openNightMarketModal() { document.getElementById("nightMarketModal").style.display = "flex"; }
function openFerryModal() { document.getElementById("ferryModal").style.display = "flex"; }
function openRestModal() { document.getElementById("restModal").style.display = "flex"; }
function openCctvModal() {
  gameState.quests.tib = true;
  updateQuestProgress();
  document.getElementById("cctvModal").style.display = "flex";
}
function openInterrogateModal() { const el = document.getElementById("interrogateModal"); if (el) el.style.display = "flex"; }
function openVictoryModal() { const el = document.getElementById("victoryModal"); if (el) el.style.display = "flex"; }
function openInventoryModal() { showNavToast("🗺️ 當前為雙北地圖全景樣式版，背包系統已依指示隱藏！"); }
function openQuestsModal() { updateQuestProgress(); document.getElementById("questsModal").style.display = "flex"; }
function openMapModal() { updateQuestProgress(); document.getElementById("mapModal").style.display = "flex"; }
function openSettingsModal() { document.getElementById("settingsModal").style.display = "flex"; }
function closeModal(id) { const el = document.getElementById(id); if (el) el.style.display = "none"; }

/* ─── 10b. 萬家福旗艦量販 ✕ 樂家康超市便利購 商品購買邏輯 ─── */
function buyWanjiafuToast() {
  if (gameState.money < 40) return alert("生活金不足 $40 囉！");
  gameState.money -= 40;
  gameState.stamina = Math.min(100, gameState.stamina + 45);
  updateBars();
  playTone(659, 'triangle', 0.15);
  showNavToast("🍞 購買萬家福高能複合能量餐包！體力 +45！");
  showDetectiveDialogue("「烘焙工坊現做高能能量餐包，香軟飽滿，迅速補滿全域巡航體力！」", "戰術中樞");
  closeModal('wanjiafuModal');
  closeModal('carrefourModal');
}
function buyCarrefourToast() { buyWanjiafuToast(); }

function buyWanjiafuWater() {
  if (gameState.money < 30) return alert("生活金不足 $30 囉！");
  gameState.money -= 30;
  gameState.mood = Math.min(100, gameState.mood + 35);
  updateBars();
  playTone(587, 'triangle', 0.15);
  showNavToast("💧 購買萬家福 1500ml 離子電解水！心情 +35！");
  showDetectiveDialogue("「1500ml 大容量離子水，隨時補充電解質與活力！」", "戰術中樞");
  closeModal('wanjiafuModal');
  closeModal('carrefourModal');
}
function buyCarrefourWater() { buyWanjiafuWater(); }

function buyWanjiafuBox() {
  if (gameState.money < 120) return alert("生活金不足 $120 囉！");
  gameState.money -= 120;
  gameState.stamina = Math.min(100, gameState.stamina + 60);
  gameState.mood = Math.min(100, gameState.mood + 50);
  updateBars();
  playTone(784, 'triangle', 0.2);
  showNavToast("🧰 購買樂家康全像探測補給箱！體力 +60、心情 +50！");
  showDetectiveDialogue("「全配探測補給箱！高能口糧與應急套件一應俱全，巡航無後顧之憂！」", "戰術中樞");
  closeModal('wanjiafuModal');
  closeModal('carrefourModal');
}
function buyCarrefourBox() { buyWanjiafuBox(); }

/* ─── 10c. 連鎖品牌雷達切換與街區導航 ─── */
function setBrandRadarFilter(brand) {
  gameState.activeBrandFilter = brand;
  document.querySelectorAll(".radar-filter-btn").forEach(b => b.classList.remove("active"));
  const btnMap = {
    all: 'filterAll',
    familymart: 'filterFmart',
    seven: 'filterSeven',
    carrefour: 'filterCarrefour',
    wanjiafu: 'filterCarrefour',
    coco: 'filterCoco',
    market: 'filterMarket'
  };
  const targetBtn = document.getElementById(btnMap[brand]);
  if (targetBtn) targetBtn.classList.add("active");

  const banner = document.getElementById("chainBroadcastBanner");
  const icon = document.getElementById("chainBroadcastIcon");
  const text = document.getElementById("chainBroadcastText");
  if (banner && icon && text) {
    if (brand === 'all') {
      banner.style.display = "none";
      showNavToast("🌐 已切換至【雙北全部路網】，自由巡航全城！");
    } else if (brand === 'familymart') {
      banner.style.display = "flex";
      icon.innerText = "🏪";
      text.innerText = "全家 FamilyMart 全城 FamiPort 互聯網絡已啟動！全雙北 28 間門市雷達連線中！";
      showNavToast("🏪 全家 FamilyMart 連鎖網絡雷達啟動！門市光環展開！");
      playTone(587, 'triangle', 0.15);
    } else if (brand === 'seven') {
      banner.style.display = "flex";
      icon.innerText = "🍙";
      text.innerText = "7-Eleven OPENPOINT 數位雷達啟動！全雙北 28 間 24H 門市光纖互聯！";
      showNavToast("🍙 7-Eleven OPENPOINT 數位雷達啟動！");
      playTone(659, 'triangle', 0.15);
    } else if (brand === 'carrefour' || brand === 'wanjiafu' || brand === 'pxmart') {
      banner.style.display = "flex";
      icon.innerText = "🏬";
      text.innerText = "萬家福 ✕ 樂家康 全雙北量子物流網絡已啟動！旗艦量販與便利購全城跨區互聯！";
      showNavToast("🏬 萬家福 ✕ 樂家康 量子物流雷達啟動！");
      playTone(523, 'triangle', 0.15);
    } else if (brand === 'coco') {
      banner.style.display = "flex";
      icon.innerText = "🧋";
      text.innerText = "CoCo 都可 跨門市雲端寄杯網絡啟動！雙北 14 間手搖飲門市雲端寄杯隨處領！";
      showNavToast("🧋 CoCo 都可 跨店雲端寄杯雷達啟動！");
      playTone(698, 'triangle', 0.15);
    } else if (brand === 'market') {
      banner.style.display = "flex";
      icon.innerText = "🏮";
      text.innerText = "雙北傳統市場與觀光夜市網絡連線！10 處在地市場老字號生鮮與夜市小吃互聯！";
      showNavToast("🏮 傳統市場與夜市網絡雷達啟動！在地古早味連線！");
      playTone(622, 'triangle', 0.15);
    }
  }
}

function jumpToDistrict(distId) {
  document.querySelectorAll(".district-jump-btn").forEach(b => b.classList.remove("highlight"));
  if (distId === 'overview') {
    camera.x = 70; camera.z = -20; camera.targetScale = 1.15;
    const btn = document.getElementById("btnJumpOverview");
    if (btn) btn.classList.add("highlight");
    showNavToast("🗺️ 已切換為【雙北全圖樣式總覽】！一覽台北市 12 區與新北市 29 特區全境拓撲！");
  } else if (distId === 'station') {
    camera.x = 0; camera.z = 14; camera.targetScale = 16;
    const btn = document.getElementById("btnJumpStation");
    if (btn) btn.classList.add("highlight");
    showNavToast("🏛️ 已跳轉至【台北車站(忠孝) 站前核心】！");
  } else if (distId === 'banqiao_xuefu') {
    camera.x = -95; camera.z = 168; camera.targetScale = 16;
    const btn = document.getElementById("btnJumpXuefu");
    if (btn) btn.classList.add("highlight");
    showNavToast("🏫 已跳轉至【板橋學府路一段 (1:1 真實商圈・徹底分散無並排)】！");
  } else if (distId === 'zhongshan') {
    camera.x = 78; camera.z = -40; camera.targetScale = 16;
    const btn = document.getElementById("btnJumpZhongshan");
    if (btn) btn.classList.add("highlight");
    showNavToast("🌳 已跳轉至【中山北路林蔭大道 ✕ 南京商圈】！");
  } else if (distId === 'chongqing_ximen') {
    camera.x = -145; camera.z = 25; camera.targetScale = 16;
    const btn = document.getElementById("btnJumpXimen") || document.getElementById("btnJumpChongqing");
    if (btn) btn.classList.add("highlight");
    showNavToast("📚 已跳轉至【重慶南路書街 ✕ 西門町商圈】！");
  } else if (distId === 'daan_park') {
    camera.x = 120; camera.z = 80; camera.targetScale = 14;
    const btn = document.getElementById("btnJumpDaan");
    if (btn) btn.classList.add("highlight");
    showNavToast("🌲 已跳轉至【大安森林公園 ✕ 都會綠帶】！");
  } else if (distId === 'xinyi_101') {
    camera.x = 220; camera.z = 50; camera.targetScale = 14;
    const btn = document.getElementById("btnJumpXinyi");
    if (btn) btn.classList.add("highlight");
    showNavToast("🏙️ 已跳轉至【信義計畫區 ✕ 台北 101 大樓】！");
  } else if (distId === 'circle') {
    camera.x = -95; camera.z = -45; camera.targetScale = 16;
    const btn = document.getElementById("btnJumpCircle");
    if (btn) btn.classList.add("highlight");
    showNavToast("🏮 已跳轉至【建成圓環 ✕ 大稻埕寧夏夜市】！");
  } else if (distId === 'tamsui') {
    camera.x = -220; camera.z = -300; camera.targetScale = 13;
    const btn = document.getElementById("btnJumpTamsui");
    if (btn) btn.classList.add("highlight");
    showNavToast("🌊 已跳轉至【淡水金色水岸 ✕ 八里渡船頭出海口】！");
  } else if (distId === 'xindian_bitan') {
    camera.x = 80; camera.z = 280; camera.targetScale = 13;
    const btn = document.getElementById("btnJumpBitan");
    if (btn) btn.classList.add("highlight");
    showNavToast("🚣 已跳轉至【新店溪水岸 ✕ 碧潭水電中樞】！");
  } else if (distId === 'neihu_park') {
    camera.x = 270; camera.z = -160; camera.targetScale = 12;
    const btn = document.getElementById("btnJumpNeihu");
    if (btn) btn.classList.add("highlight");
    showNavToast("⚡ 已鎖定定位【內湖科技園區 ✕ 內科高能園區】！");
  } else if (distId === 'nangang_biotech') {
    camera.x = 370; camera.z = -60; camera.targetScale = 12;
    const btn = document.getElementById("btnJumpNangang");
    if (btn) btn.classList.add("highlight");
    showNavToast("🔬 已鎖定定位【南港生技光谷 ✕ 軟體園區 ✕ 展覽館】！");
  } else if (distId === 'sanchong') {
    camera.x = -285; camera.z = 20; camera.targetScale = 12;
    const btn = document.getElementById("btnJumpSanchong");
    if (btn) btn.classList.add("highlight");
    showNavToast("🏭 已鎖定定位【三重新莊創新工坊 ✕ 重新路 ✕ 副都心】！");
  } else {
    // 支援任意 41 行政特區代碼 (如 TPE-01~12, NTP-01~29) 或 45+ 真實公園名稱
    const sec = (typeof sectors !== 'undefined') ? sectors.find(s => s.id === distId || s.name.includes(distId)) : null;
    if (sec) {
      camera.x = sec.x; camera.z = sec.z; camera.targetScale = 12;
      showNavToast(`🛰️ 已躍遷至【${sec.name}】！`);
    } else {
      const pk = (typeof SHUANGBEI_REAL_PARKS !== 'undefined') ? SHUANGBEI_REAL_PARKS.find(p => p.id === distId || p.name.includes(distId)) : null;
      if (pk) {
        camera.x = pk.x; camera.z = pk.z; camera.targetScale = 14;
        showNavToast(`🌲 已鎖定前往【${pk.name}】！`);
      }
    }
  }
  updateMinimapRadar();
  updateGhostDroneHUD();
  playTone(550, 'triangle', 0.08);
}

function toggleGhostMode() {
  gameState.isGhostMode = !gameState.isGhostMode;
  const btn = document.getElementById("btnGhostToggle");
  const icon = document.getElementById("ghostToggleIcon");
  const text = document.getElementById("ghostToggleText");

  if (gameState.isGhostMode) {
    if (btn) btn.classList.add("spectator");
    if (icon) icon.innerText = "👻";
    if (text) text.innerText = "全域巡航 (無角色)";
    showNavToast("🛰️ 已切換為【天眼全域自由巡航模式】！以全像視角自由巡視雙北全境！");
    showDetectiveDialogue("「切換至高空全像巡航！俯瞰雙北 29+12 特區戰術拓撲！」", "戰術中樞");
  } else {
    if (btn) btn.classList.remove("spectator");
    if (icon) icon.innerText = "🚶";
    if (text) text.innerText = "地面視角模式";
    playerPos.x = camera.x;
    playerPos.z = camera.z;
    showNavToast("🚶 已切換為【地面視角模式】！親自漫步雙北街頭！");
    showDetectiveDialogue("「降落回地面！以第一人稱視角漫步街廓！」", "戰術中樞");
  }
  playTone(gameState.isGhostMode ? 880 : 440, 'sine', 0.1);
}

function zoomInCamera() {
  camera.targetScale = Math.min(camera.maxScale, camera.targetScale * 1.25);
  if (!gameState.isGhostMode && camera.targetScale >= 12.0) {
    cameraLockToPlayer = true;
    camera.x = playerPos.x;
    camera.z = playerPos.z;
  }
  playTone(700, 'sine', 0.05);
  updateGhostDroneHUD();
}

function zoomOutCamera() {
  camera.targetScale = Math.max(camera.minScale, camera.targetScale * 0.8);
  playTone(500, 'sine', 0.05);
  updateGhostDroneHUD();
}

function setCloseUpMode() {
  camera.targetScale = 65.0; // 超特寫微觀人物視角 (人物超巨大、五官風衣清晰可見)
  camera.x = playerPos.x;
  camera.z = playerPos.z;
  cameraLockToPlayer = true;
  if (gameState.isGhostMode) {
    toggleGhostMode(); // 自動轉回地面角色模式
  }
  playTone(850, 'sine', 0.08);
  updateGhostDroneHUD();
  showNavToast("👤 已進入【超大微觀人物特寫模式】！視角嚴密鎖定人物正上方，隨移動無縫同步推進！");
}

function lockCameraToPlayer() {
  camera.x = playerPos.x;
  camera.z = playerPos.z;
  cameraLockToPlayer = true;
  playTone(650, 'sine', 0.06);
  updateGhostDroneHUD();
  showNavToast("🎯 視角已嚴密鎖定於人物正上方！人物移動視角無縫跟隨！");
}

function setStreetViewMode() {
  camera.targetScale = 6.5; // 都會街區標準巡航視角
  camera.x = playerPos.x;
  camera.z = playerPos.z;
  cameraLockToPlayer = true;
  playTone(550, 'sine', 0.06);
  updateGhostDroneHUD();
  showNavToast("🏙️ 已切換至【都會街區標準巡航視角】！");
}

function resetCameraOverview() {
  camera.x = 70;
  camera.z = -20;
  camera.targetScale = 1.15; // 雙北全景總覽
  playTone(450, 'sine', 0.08);
  updateGhostDroneHUD();
  showNavToast("🗺️ 已切換至【雙北都會全景總覽】！");
}

function resetCameraCenter() {
  lockCameraToPlayer();
}

// ──────────────────────────────────────────
// 13. 10 大生活科學探究示範案件系統 (落實評審顧問 50 建議)
// ──────────────────────────────────────────
function initDemonstrationCasesUI() {
  const scrollWrap = document.getElementById('casesChipsScroll');
  if (!scrollWrap) return;
  scrollWrap.innerHTML = '';

  const cases = (typeof DEMO_10_CASES !== 'undefined') ? DEMO_10_CASES : [];
  cases.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'case-nav-btn';
    btn.innerHTML = `🚨 案${c.num}: ${c.title.split('案')[0].replace('西門老牌連鎖咖啡雙倍濃縮拿鐵', '西門拿鐵').replace('北車忠孝西路地下道虹吸水壓失衡', '北車虹吸').replace('大安森林公園紅土泥地受力壓痕', '大安泥地').replace('萬華龍山寺百年青草茶酸鹼變色', '萬華茶湯').replace('新北板橋學府路生鮮冷鏈凝露', '學府冷鏈').replace('內湖高能運算園區伺服器散熱對流', '內科對流').replace('新店碧潭水電中樞連通管水位失衡', '碧潭水電').replace('南港生技光谷酵素低溫活性失常', '南港酵素').replace('淡水金色水岸船舶擱淺潮汐落差', '淡水潮汐').replace('大同迪化乾貨街海鹽過飽和結晶', '迪化海鹽')} <span style="font-size:9.5px; opacity:0.85;">[${c.subject.split('（')[1]?.replace('）','') || '探究'}]</span>`;
    btn.title = `${c.title} - ${c.subject}`;
    btn.onclick = () => {
      document.querySelectorAll('.case-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      camera.x = c.worldX;
      camera.z = c.worldZ;
      camera.targetScale = 5.5;
      playTone(659, 'triangle', 0.12);
      openCaseDossierModal(c.id);
      showNavToast(`🚨 已定位至示範案現場：【${c.title}】！`);
    };
    scrollWrap.appendChild(btn);
  });
}

function openCaseDossierModal(caseId) {
  const cases = (typeof DEMO_10_CASES !== 'undefined') ? DEMO_10_CASES : [];
  const c = cases.find(item => item.id === caseId);
  if (!c) return;

  const modal = document.getElementById('caseDossierModal');
  const card = document.getElementById('caseDossierCard');
  if (!modal || !card) return;

  const suspectsHtml = c.suspects.map(s => `
    <div style="display:flex; gap:6px; margin-bottom:4px; font-size:12.5px;">
      <strong style="color:#fbbf24; white-space:nowrap;">👤 ${s.name} (${s.role})：</strong>
      <span style="color:#cbd5e1;">${s.motive}</span>
    </div>
  `).join('');

  const stepsHtml = c.investigationSteps.map(step => `
    <li style="margin-bottom:4px; color:#cbd5e1; font-size:12.5px;">${step}</li>
  `).join('');

  card.innerHTML = `
    <div class="modal-header" style="border-bottom:1px solid rgba(0,240,255,0.3); padding-bottom:10px;">
      <div class="modal-title" style="display:flex; flex-direction:column; gap:2px;">
        <span style="font-size:11px; color:#f43f5e; font-weight:900;">🚨 示範案件 ${c.id} ｜ ${c.sectorName}</span>
        <span style="font-size:18px; color:#ffffff; font-weight:900;">${c.title}</span>
        <span style="font-size:12px; color:#38bdf8;">探究主題：${c.subtitle}</span>
      </div>
      <button class="modal-close" onclick="closeModal('caseDossierModal')">×</button>
    </div>

    <div style="display:flex; flex-direction:column; gap:12px; padding-top:14px;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; background:rgba(2,6,23,0.6); padding:10px; border-radius:8px; border:1px solid rgba(0,240,255,0.2);">
        <div><span style="color:#94a3b8; font-size:11px;">📍 現場門牌：</span><br><strong style="color:#f1f5f9; font-size:12px;">${c.location}</strong></div>
        <div><span style="color:#94a3b8; font-size:11px;">🧪 課綱學門：</span><br><strong style="color:#38bdf8; font-size:12px;">${c.subject}</strong></div>
        <div style="grid-column:1 / -1;"><span style="color:#94a3b8; font-size:11px;">📚 學習指標：</span><br><strong style="color:#a78bfa; font-size:12px;">${c.curriculumMapping}</strong></div>
      </div>

      <!-- 校園安全無害替代教具 (落實顧問 50 建議) -->
      <div style="background:rgba(16,185,129,0.15); border:1px solid #10b981; border-radius:8px; padding:12px;">
        <div style="color:#34d399; font-weight:900; font-size:12.5px; margin-bottom:4px;">🛡️ 評審亮點：校園教學安全無毒替代教具</div>
        <p style="color:#a7f3d0; font-size:12px; line-height:1.5; margin:0;">${c.safeClassroomKit}</p>
      </div>

      <div style="background:rgba(15,23,42,0.7); border-radius:8px; padding:10px;">
        <h4 style="color:#38bdf8; font-size:13px; margin-bottom:4px;">🔍 案件前情提要</h4>
        <p style="color:#e2e8f0; font-size:12.5px; line-height:1.5; margin:0;">${c.brief}</p>
      </div>

      <div style="background:rgba(15,23,42,0.7); border-radius:8px; padding:10px;">
        <h4 style="color:#fbbf24; font-size:13px; margin-bottom:6px;">👥 涉案嫌疑人調查網</h4>
        ${suspectsHtml}
      </div>

      <div style="background:rgba(15,23,42,0.7); border-radius:8px; padding:10px;">
        <h4 style="color:#34d399; font-size:13px; margin-bottom:6px;">🔬 實地自然探究三步驟</h4>
        <ol style="padding-left:18px; margin:0;">${stepsHtml}</ol>
      </div>

      <div style="background:rgba(0,240,255,0.08); border-left:4px solid #00f0ff; border-radius:4px; padding:10px;">
        <h4 style="color:#00f0ff; font-size:13px; margin-bottom:4px;">⚖️ 破案科學邏輯打臉依據</h4>
        <p style="color:#cbd5e1; font-size:12px; line-height:1.5; margin:0;">${c.conclusion}</p>
      </div>
    </div>

    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1);">
      <button class="chat-send-btn" style="background:#0284c7;" onclick="closeModal('caseDossierModal')">關閉並前往現場探究</button>
    </div>
  `;

  modal.style.display = 'flex';
}

function takeScenicPhoto() {
  playTone(750, 'triangle', 0.1);
  alert("📸 拍下了波光粼粼的淡水河景與八里對岸！解鎖相簿成就！");
  closeModal('ferryModal');
}

function postStory() {
  gameState.mood = Math.min(100, gameState.mood + 25);
  updateBars();
  playTone(700, 'sine', 0.1);
  alert("💬 發佈限時動態：『八里的風，吹散辦案的疲憊～』獲得熱烈點讚！心情 +25！");
  closeModal('ferryModal');
}

function toggleMosaic() {
  // 依委託人第 44 回合最新指令：防嚇馬賽克已全面取消，畫面一律自然清晰呈現
}


/* ─── 12. 專屬私服器 (WebSocket) 連線與多人同屏 ─── */
let socket = null;
const remotePlayers = new Map();
let isOnlineWithServer = false;

function initPrivateServerConnection() {
  if (location.protocol === "https:") {
    spawnSimulatedCitizens();
    return;
  }
  try {
    socket = new WebSocket(`ws://${location.host || 'localhost:3000'}`);
    socket.onopen = () => {
      isOnlineWithServer = true;
      socket.send(JSON.stringify({ type: 'join', nickname: gameState.nickname }));
    };
    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'init') msg.players.forEach(p => remotePlayers.set(p.id, p));
        else if (msg.type === 'player_move') remotePlayers.set(msg.id, msg);
        else if (msg.type === 'player_leave') remotePlayers.delete(msg.id);
        else if (msg.type === 'chat_broadcast') appendChatMessage(msg.nickname, msg.text);
      } catch (err) {}
    };
    socket.onclose = () => spawnSimulatedCitizens();
    socket.onerror = () => spawnSimulatedCitizens();
  } catch (e) {
    spawnSimulatedCitizens();
  }
}

function spawnSimulatedCitizens() {
  if (remotePlayers.size > 0) return;
  const bot1 = { id: 'bot_1', nickname: '市民_小涵', x: 26, z: 20 };
  const bot2 = { id: 'bot_2', nickname: '市民_志明', x: 75, z: -25 };
  remotePlayers.set(bot1.id, bot1);
  remotePlayers.set(bot2.id, bot2);
}

function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  gameState.currentBubble = text;
  if (isOnlineWithServer && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'chat', text }));
  } else {
    appendChatMessage(gameState.nickname, text);
  }
}

function appendChatMessage(author, text) {
  const box = document.getElementById("chatMessages");
  if (!box) return;
  const row = document.createElement("div");
  row.className = "chat-msg-row";
  row.innerHTML = `<span class="author">[${author}]:</span> <span>${text}</span>`;
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
}

function showBreakingNews(text) {
  const banner = document.getElementById("breakingNewsBanner");
  const textEl = document.getElementById("breakingNewsText");
  if (!banner || !textEl) return;
  textEl.innerText = text;
  banner.style.display = "flex";
  setTimeout(() => banner.style.display = "none", 6000);
}

function reconnectCustomServer() {
  const input = document.getElementById("wsServerInput");
  const url = input ? input.value.trim() : '';
  if (url) {
    if (socket) socket.close();
    try {
      socket = new WebSocket(url);
      socket.onopen = () => alert("🎉 成功連線至私服器：" + url);
    } catch (e) {
      alert("連線失敗：" + e.message);
    }
    closeModal('settingsModal');
  }
}

/* ─── 13. 視窗適應與 60FPS 現代遊戲循環 ─── */
window.addEventListener("resize", () => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
});

function gameLoop() {
  requestAnimationFrame(gameLoop);
  updateMovement();
  updateBusWorld();
  renderScene();
}
gameLoop();

initPrivateServerConnection();
initDemonstrationCasesUI();

/* ─── 14. 2.5D 主檔四軌大眾運輸真實世界即時 GPS 網路同步 (Live Internet Sync) ─── */
async function syncSandpitLiveTransit() {
  try {
    let data = null;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch('/api/transit/live', { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (res.ok) data = await res.json();
    } catch (e) {}

    if (data && data.success) {
      if (Array.isArray(data.buses) && data.buses.length > 0) {
        cityBuses.forEach((b, idx) => {
          const rKey = b.lineName.split(' ')[0];
          const match = data.buses.find(lb => String(lb.routeName).includes(rKey)) || data.buses[idx % data.buses.length];
          if (match) {
            b.livePlate = match.busId;
            b.liveSpeedKmH = Math.round(match.speed || 0);
            b.ledText = `${match.routeName} (${match.busId})｜${match.speed <= 1 ? '靠站/停等 0km/h' : Math.round(match.speed) + 'km/h'}`;
          }
        });
      }
      if (Array.isArray(data.mrtTrains) && data.mrtTrains.length > 0) {
        // 過濾專車 (專車不須顯示)
        const regularMrt = data.mrtTrains.filter(mt => !String(mt.name || '').includes('專車') && !String(mt.headsign || '').includes('專車'));
        mrtTrains.forEach((t, idx) => {
          const match = regularMrt.find(mt => mt.lineCode === t.lineCode) || regularMrt[idx % regularMrt.length];
          if (match) {
            t.trainNo = match.trainNo || t.trainNo;
            t.closingTime = match.closingTime || match.thisTrainClosingTime || t.closingTime;
            t.ledText = `🚇 [車次 ${t.trainNo}] ${match.name} ➔ 收班: ${t.closingTime}｜${match.status}`;
          }
        });
      }
      if (Array.isArray(data.traTrains) && data.traTrains.length > 0) {
        traTrains.forEach((t, idx) => {
          const match = data.traTrains[idx % data.traTrains.length];
          if (match) {
            t.lineName = match.name;
            t.ledText = `${match.name}｜${match.status}`;
          }
        });
      }
      return;
    }

    // 瀏覽器直連官方開放端點備援 (GitHub Pages 靜態環境自動啟用)
    const [trtcRes, traRes] = await Promise.all([
      fetch('https://ptx.transportdata.tw/MOTC/v2/Rail/Metro/LiveBoard/TRTC?%24format=JSON', { cache: 'no-store' }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('https://ptx.transportdata.tw/MOTC/v2/Rail/TRA/LiveBoard?%24format=JSON', { cache: 'no-store' }).then(r => r.ok ? r.json() : []).catch(() => [])
    ]);
    if (Array.isArray(trtcRes) && trtcRes.length > 0) {
      // 專車不須顯示
      const regularTrtc = trtcRes.filter(x => !String(x.TripHeadSign || '').includes('專車') && !String(x.TripHeadSign || '').includes('回送'));
      mrtTrains.forEach((t, idx) => {
        const m = regularTrtc.find(x => (x.LineNo || x.LineID) === t.lineCode) || regularTrtc[idx % regularTrtc.length];
        if (m && m.StationName && m.StationName.Zh_tw) {
          const dest = (m.DestinationStationName && m.DestinationStationName.Zh_tw) || '';
          t.ledText = `🚇 [車次 ${t.trainNo}] ${t.lineCode}線 [${m.StationName.Zh_tw}站] ➔ 往${dest}｜收班: ${t.closingTime || '24:00'}`;
        }
      });
    }
    if (Array.isArray(traRes) && traRes.length > 0) {
      traTrains.forEach((t, idx) => {
        const m = traRes[idx % traRes.length];
        if (m && m.StationName && m.StationName.Zh_tw) {
          const tType = (m.TrainTypeName && m.TrainTypeName.Zh_tw) ? m.TrainTypeName.Zh_tw.slice(0, 3) : '臺鐵';
          const delay = Number(m.DelayTime) > 0 ? `晚${m.DelayTime}分` : '準點';
          t.ledText = `🚆 ${m.TrainNo}次 ${tType} [${m.StationName.Zh_tw}] (${delay})`;
        }
      });
    }
  } catch (err) {}
}
syncSandpitLiveTransit();
setInterval(syncSandpitLiveTransit, 10000);

