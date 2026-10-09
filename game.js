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
  isGhostMode: true,     // 預設為天眼幽靈自由巡航模式 (無人物，自由飛翔巡視地圖)
  droneFlySpeed: 3.5,    // 天眼飛行平移速度 (玩家指定大幅提速！極速平移無延遲)
  droneTurboSpeed: 8.5,  // 極速巡航飛行速度 (Shift 鍵超光速巡視全城)
  activeBrandFilter: 'all', // 當前連鎖雷達篩選品牌: 'all', 'familymart', 'seven', 'carrefour', 'pxmart', 'coco', 'market'
  weather: 'sunny',
  mosaic: false,
  nickname: "都會調查員 [你]",
  currentBubble: "🛰️ 天眼幽靈巡航雙北街區",
  cluesFound: 0,
  hasBoba: false,
  hasTeaEgg: false,
  currentDistrict: 'station',
  currentLocationName: "忠孝西路一段 ✕ 館前路口",
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
  targetScale: 15, // 正常視野比例
  currentScale: 15,
  minScale: 2.8,   // 縮小為整座雙北大地圖全覽
  maxScale: 25.0   // 放大為門市近景立面
};

// 奔跑腳底塵土/氣流粒子系統
const sprintParticles = [];

/* ─── 3. 2D/2.5D Canvas 現代動漫引擎容器初始化 ─── */
const container = document.getElementById("webgl-container");
container.innerHTML = '';
const canvas = document.createElement('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
container.appendChild(canvas);
const ctx = canvas.getContext('2d');

const engineLbl = document.getElementById("renderEngineLabel");
if (engineLbl) {
  engineLbl.innerText = '現代 2D ✕ 2.5D 高空俯瞰創新科技冒險引擎 (高幀率・零白屏)';
}

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
  {"id": "carrefour_kf", "x": 20, "z": 110, "w": 24, "d": 20, "r": 9.5, "type": "carrefour", "name": "家樂福超市 (站前開封店)", "address": "中正區開封街一段 38 號", "label": "進入家樂福超市 (站前開封店)"},
  {"id": "coco_cq", "x": -95, "z": 15, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (重慶書店街店)", "address": "中正區重慶南路一段 55 號", "label": "購買 CoCo 手搖飲 (重慶店)"},
  {"id": "market_cz", "x": -95, "z": 55, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "城中市場老市集", "address": "中正區武昌街一段 22 巷 (省城隍廟口)", "label": "進入 城中市場老市集 (老台北在地情報與小吃)"},
  {"id": "seven_hy", "x": -95, "z": 95, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (中正衡陽店)", "address": "中正區衡陽路 51 號", "label": "進入 7-Eleven (中正衡陽店)"},
  {"id": "fmart_hn", "x": -55, "z": 80, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (懷寧襄陽店)", "address": "中正區襄陽路 9 號", "label": "進入全家 (懷寧襄陽店)"},
  {"id": "seven_xm_zh", "x": -145, "z": 10, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (西門中華店)", "address": "萬華區中華路一段 144 號", "label": "進入 7-Eleven (西門中華店)"},
  {"id": "fmart_wc", "x": -205, "z": 15, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (西門武昌店)", "address": "萬華區武昌街二段 37 號", "label": "進入全家 (西門武昌店)"},
  {"id": "coco_xm", "x": -175, "z": 40, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (西門町店)", "address": "萬華區武昌街二段 4 號", "label": "購買 CoCo 手搖飲 (西門町店)"},
  {"id": "market_xm", "x": -135, "z": 52, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "西門市場 ✕ 紅樓文創市集", "address": "萬華區成都路 10 號", "label": "進入 西門市場/紅樓文創市集 (潮流古著與點心)"},
  {"id": "pxmart_cs", "x": -185, "z": 80, "w": 24, "d": 20, "r": 8.5, "type": "pxmart", "name": "全聯福利中心 (萬華長沙店)", "address": "萬華區長沙街二段 110 號", "label": "進入全聯 (萬華長沙店)"},
  {"id": "carrefour_gl_flagship", "x": -140, "z": 95, "w": 32, "d": 24, "r": 11.0, "type": "carrefour", "name": "家樂福 桂林旗艦店 (24H量販店)", "address": "萬華區桂林路 1 號", "isFlagship": true, "label": "進入家樂福桂林旗艦店 (24H量販店)"},
  {"id": "fmart_circle", "x": -95, "z": -45, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (建成圓環店)", "address": "大同區重慶北路二段 12 號", "label": "進入全家 (建成圓環店)"},
  {"id": "market_nx", "x": -55, "z": -95, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "建成圓環 ✕ 寧夏觀光夜市", "address": "大同區寧夏路民生西路口", "label": "進入 寧夏觀光夜市 (鹽酥雞 / 潤餅 / 章魚燒)"},
  {"id": "seven_circle", "x": -55, "z": -145, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (寧夏夜市店)", "address": "大同區民生西路 188 號", "label": "進入 7-Eleven (寧夏夜市店)"},
  {"id": "carrefour_cq_flagship", "x": -100, "z": -115, "w": 32, "d": 24, "r": 11.0, "type": "carrefour", "name": "家樂福 重慶旗艦店 (雙層大賣場)", "address": "大同區重慶北路二段 171 號", "isFlagship": true, "label": "進入家樂福重慶旗艦店 (大賣場)"},
  {"id": "pxmart_cq", "x": -95, "z": -175, "w": 24, "d": 20, "r": 8.5, "type": "pxmart", "name": "全聯福利中心 (重慶店)", "address": "大同區重慶北路三段 154 號", "label": "進入全聯 (重慶店)"},
  {"id": "coco_yp", "x": -145, "z": -45, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (延平北路店)", "address": "大同區延平北路二段 80 號", "label": "購買 CoCo 手搖飲 (延平店)"},
  {"id": "pxmart_dh", "x": -145, "z": -115, "w": 24, "d": 20, "r": 8.5, "type": "pxmart", "name": "全聯福利中心 (大稻埕民生店)", "address": "大同區民生西路 230 號", "label": "進入全聯 (大稻埕民生店)"},
  {"id": "market_yl", "x": -185, "z": -60, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "大稻埕永樂市場", "address": "大同區迪化街一段 21 號", "label": "進入 大稻埕永樂市場 (百年布行與油飯旗魚羹)"},
  {"id": "seven_dh", "x": -185, "z": -125, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (大稻埕迪化店)", "address": "大同區迪化街一段 54 號", "label": "進入 7-Eleven (大稻埕迪化店)"},
  {"id": "market_lz", "x": -145, "z": -185, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "大同蘭州傳統市場", "address": "大同區昌吉街 55 號", "label": "進入 大同蘭州傳統市場 (黑點雞肉 / 生鮮果菜市集)"},
  {"id": "market_zs", "x": 35, "z": -45, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "中山傳統市場", "address": "中山區長安西路 3 號 (中山北路口)", "label": "進入 中山傳統市場 (品嚐古早味切仔麵 / 潤餅)"},
  {"id": "fmart_zs", "x": 125, "z": -20, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (中山北路店)", "address": "中山區中山北路一段 105 號", "label": "進入全家 (中山北路店)"},
  {"id": "seven_ls", "x": 125, "z": -60, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (林森條通店)", "address": "中山區林森北路 119 號", "label": "進入 7-Eleven (林森條通店)"},
  {"id": "pxmart_nj", "x": 35, "z": -95, "w": 24, "d": 20, "r": 8.5, "type": "pxmart", "name": "全聯福利中心 (中山南京店)", "address": "中山區南京西路 36 號", "label": "進入全聯 (中山南京店)"},
  {"id": "coco_zs", "x": 115, "z": -105, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (中山北路門市)", "address": "中山區中山北路一段 92 號", "label": "購買 CoCo 手搖飲 (中山門市)"},
  {"id": "market_sl", "x": 45, "z": -145, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "雙連傳統市場", "address": "大同區民生西路 198 號 (文昌宮旁)", "label": "進入 雙連傳統市場 (品嚐文昌宮古早味美食)"},
  {"id": "fmart_sl", "x": 105, "z": -150, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (中山雙連店)", "address": "中山區民生西路 66 號", "label": "進入全家 (中山雙連店)"},
  {"id": "market_qg", "x": 85, "z": -195, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "晴光傳統商圈市場", "address": "中山區雙城街 12 巷 (晴光商圈)", "label": "進入 晴光商圈市場 (晴光紅豆餅 / 脆皮鮮奶甜甜圈)"},
  {"id": "seven_mq", "x": 35, "z": -195, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (中山民權店)", "address": "中山區中山北路二段 92 號", "label": "進入 7-Eleven (中山民權店)"},
  {"id": "pxmart_jl", "x": 165, "z": -55, "w": 24, "d": 20, "r": 8.5, "type": "pxmart", "name": "全聯福利中心 (中山吉林店)", "address": "中山區吉林路 108 號", "label": "進入全聯 (中山吉林店)"},
  {"id": "fmart_sj", "x": 165, "z": -105, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (松江南京店)", "address": "中山區松江路 102 號", "label": "進入全家 (松江南京店)"},
  {"id": "coco_sj", "x": 165, "z": -155, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (松江南京店)", "address": "中山區松江路 120 號", "label": "購買 CoCo 手搖飲 (松江店)"},
  {"id": "seven_fx", "x": 205, "z": -55, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (復興長安店)", "address": "中山區復興北路 88 號", "label": "進入 7-Eleven (復興長安店)"},
  {"id": "carrefour_sj", "x": 205, "z": -115, "w": 24, "d": 20, "r": 9.5, "type": "carrefour", "name": "家樂福超市 (中山松江店)", "address": "中山區松江路 168 號", "label": "進入家樂福超市 (中山松江店)"},
  {"id": "fmart_fx", "x": 205, "z": -175, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (復興南京店)", "address": "中山區復興北路 45 號", "label": "進入全家 (復興南京店)"},
  {"id": "seven_ms", "x": 80, "z": 75, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (中正紀念堂店)", "address": "中正區中山南路 21 號", "label": "進入 7-Eleven (中正紀念堂店)"},
  {"id": "pxmart_gt", "x": 55, "z": 135, "w": 24, "d": 20, "r": 8.5, "type": "pxmart", "name": "全聯福利中心 (古亭和平店)", "address": "中正區和平西路一段 28 號", "label": "進入全聯 (古亭和平店)"},
  {"id": "seven_rf", "x": 55, "z": 185, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (羅斯福師大店)", "address": "中正區羅斯福路二段 88 號", "label": "進入 7-Eleven (羅斯福師大店)"},
  {"id": "carrefour_sd", "x": 105, "z": 135, "w": 24, "d": 20, "r": 9.5, "type": "carrefour", "name": "家樂福便利購 (師大龍泉店)", "address": "大安區師大路 39 號", "label": "進入家樂福便利購 (師大店)"},
  {"id": "market_sd", "x": 105, "z": 185, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "師大夜市 ✕ 龍泉傳統市場", "address": "大安區師大路 49 巷", "label": "進入 師大夜市/龍泉市場 (生煎包 / 鹽水雞 / 滷味)"},
  {"id": "fmart_da", "x": 155, "z": 65, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (大安信義店)", "address": "大安區信義路三段 102 號", "label": "進入全家 (大安信義店)"},
  {"id": "coco_da", "x": 155, "z": 125, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (大安復興店)", "address": "大安區復興南路一段 150 號", "label": "購買 CoCo 手搖飲 (大安店)"},
  {"id": "seven_dh_south", "x": 155, "z": 185, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (敦南科技店)", "address": "大安區敦化南路二段 77 號", "label": "進入 7-Eleven (敦南科技店)"},
  {"id": "seven_xm_bd", "x": -185, "z": 130, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (府中縣民店)", "address": "板橋區縣民大道一段 88 號", "label": "進入 7-Eleven (府中縣民店)"},
  {"id": "fmart_xm_bq", "x": -65, "z": 125, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (板橋縣民店)", "address": "板橋區縣民大道一段 110 號", "label": "進入全家 (板橋縣民店)"},
  {"id": "market_ny", "x": -205, "z": 168, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "板橋湳雅觀光夜市", "address": "板橋區南雅東路 87 號", "label": "進入 板橋湳雅觀光夜市 (麻油雞 / 旗魚黑輪 / 烤肉串)"},
  {"id": "seven_xf", "x": -95, "z": 168, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (學城門市)", "address": "新北海山生活圈 學府路一段 118 號", "label": "進入 7-Eleven (學城門市)"},
  {"id": "coco_xf", "x": -40, "z": 168, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (板橋重慶店)", "address": "板橋生活圈 重慶路 179 號", "label": "購買 CoCo 手搖飲 (重慶店)"},
  {"id": "carrefour_xf", "x": 15, "z": 168, "w": 24, "d": 20, "r": 9.5, "type": "carrefour", "name": "家樂福便利購 (土城廣明店)", "address": "新北海山生活圈 廣明街 63 號", "label": "進入家樂福便利購 (廣明店)"},
  {"id": "market_hs", "x": -185, "z": 210, "w": 28, "d": 24, "r": 9.5, "type": "market", "name": "板橋黃石傳統市場", "address": "板橋區宮口街 37 號 (府中商圈)", "label": "進入 板橋黃石市場 (傳承老店高記生炒魷魚 / 蘿蔔糕)"},
  {"id": "fmart_fz", "x": -100, "z": 210, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (板橋府中店)", "address": "板橋區府中路 35 號", "label": "進入全家 (板橋府中店)"},
  {"id": "pxmart_wh", "x": -50, "z": 210, "w": 24, "d": 20, "r": 8.5, "type": "pxmart", "name": "全聯福利中心 (板橋文化店)", "address": "板橋區文化路一段 145 號", "label": "進入全聯 (板橋文化店)"},
  {"id": "seven_wh", "x": -5, "z": 210, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (板橋文化店)", "address": "板橋區文化路一段 136 號", "label": "進入 7-Eleven (板橋文化店)"},
  {"id": "seven_ag", "x": 55, "z": 110, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (中正愛國店)", "address": "中正區愛國西路 9 號", "label": "進入 7-Eleven (中正愛國店)"},
  {"id": "fmart_cd", "x": -185, "z": 45, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (西門成都店)", "address": "萬華區成都路 23 號", "label": "進入全家 (西門成都店)"},
  {"id": "coco_fz", "x": -140, "z": 210, "w": 24, "d": 20, "r": 8.0, "type": "coco", "name": "CoCo 都可 (板橋府中店)", "address": "板橋區中山路一段 50 號", "label": "購買 CoCo 手搖飲 (府中店)"},
  {"id": "pxmart_xp", "x": -185, "z": 168, "w": 24, "d": 20, "r": 8.5, "type": "pxmart", "name": "全聯福利中心 (板橋新埔店)", "address": "板橋區文化路一段 360 號", "label": "進入全聯 (板橋新埔店)"},
  {"id": "seven_dh_2", "x": -185, "z": -80, "w": 24, "d": 20, "r": 8.0, "type": "seven", "name": "7-Eleven 統一超商 (大稻埕迪化二店)", "address": "大同區迪化街一段 82 號", "label": "進入 7-Eleven (迪化二店)"},
  {"id": "fmart_sd_lq", "x": 105, "z": 155, "w": 24, "d": 20, "r": 8.0, "type": "familymart", "name": "全家便利商店 (師大龍泉店)", "address": "大安區師大路 59 號", "label": "進入全家 (師大龍泉店)"},
  {"id": "carrefour_cq_north", "x": -85, "z": -145, "w": 24, "d": 20, "r": 9.5, "type": "carrefour", "name": "家樂福超市 (大同重慶北店)", "address": "大同區重慶北路三段 88 號", "label": "進入家樂福超市 (重慶北店)"},
  {"id": "landmark_jf_gate", "x": 60, "z": 108, "w": 18, "d": 18, "r": 9.0, "type": "landmark", "name": "國定古蹟 景福門 (東門圓環)", "address": "中正區中山南路 ✕ 凱達格蘭大道口", "label": "瞻仰 景福門古蹟 (台北府城東門)"},
  {"id": "landmark_museum", "x": -67.5, "z": 66, "w": 24, "d": 16, "r": 9.0, "type": "landmark", "name": "國立臺灣博物館", "address": "中正區襄陽路 2 號 (二二八公園北側)", "label": "參觀 國立臺灣博物館 (希臘多立克式宮殿與百年銅頂)"},
  {"id": "landmark_lin_garden", "x": -195, "z": 210, "w": 24, "d": 20, "r": 9.0, "type": "landmark", "name": "國定古蹟 林本源園邸 (林家花園)", "address": "板橋區西門街 9 號 (府中生活圈)", "label": "漫遊 林家花園 (百年江南庭園與來青閣)"}
];

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

// 雙北真實路網巡航車隊
const cityBuses = [
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
  }
];

// 向下相容物件 (供既有模組與全域狀態引用)
const bus307 = cityBuses[0];

// 幹線公車真實路網動態動力學與自動站點導航
function updateBusPhysics(bus) {
  if (bus.isStopped) {
    bus.stopTimer--;
    if (bus.stopTimer <= 0) {
      bus.isStopped = false;
    }
    return;
  }

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
      if (bus.id === 'bus_307_a') {
        bus.ledText = bus.currentWaypointIndex < 16 ? '307 ➔ 南京東路' : '307 ➔ 板橋府中';
      } else if (bus.id === 'bus_307_b') {
        bus.ledText = bus.currentWaypointIndex < 16 ? '307 ➔ 南京東路' : '307 ➔ 板橋府中';
      } else if (bus.id === 'bus_zhongshan') {
        bus.ledText = bus.currentWaypointIndex < 9 ? '中山幹線 ➔ 師大' : '中山幹線 ➔ 晴光商圈';
      }
    }
  } else {
    bus.x += Math.cos(bus.angle) * bus.speed;
    bus.z += Math.sin(bus.angle) * bus.speed;
  }
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
  keys[e.key.toLowerCase()] = true;
  if (e.key === "e" || e.key === "E") triggerCurrentInteraction();
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
    camera.x = Math.max(-215, Math.min(215, camera.x));
    camera.z = Math.max(-215, Math.min(215, camera.z));
    if (!gameState.isGhostMode) {
      playerPos.x = camera.x;
      playerPos.z = camera.z;
    }
  }
});

window.addEventListener("mouseup", () => {
  isDragging = false;
});

// 滑鼠滾輪縮放 (Zoom in / out)
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
  camera.targetScale = Math.max(camera.minScale, Math.min(camera.maxScale, camera.targetScale * zoomFactor));
}, { passive: false });

// 點擊地圖任意門市/地標直接互動
canvas.addEventListener("click", e => {
  if (Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) > 6) return; // 拖曳中忽略點擊
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left - canvas.width / 2;
  const clickY = e.clientY - rect.top - canvas.height / 2;
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

function updateGhostDroneHUD() {
  const altEl = document.getElementById("hudAltitude");
  const zoomEl = document.getElementById("hudZoom");
  const coordsEl = document.getElementById("hudCoords");
  const distEl = document.getElementById("hudDistrict");
  if (altEl) {
    const alt = Math.round(450 * (15 / camera.currentScale));
    altEl.innerText = `${alt}m`;
  }
  if (zoomEl) {
    zoomEl.innerText = `${(camera.currentScale / 15).toFixed(1)}x`;
  }
  if (coordsEl) {
    coordsEl.innerText = `X: ${Math.round(camera.x)}, Z: ${Math.round(camera.z)}`;
  }
  if (distEl) {
    let name = "🏛️ 中正區・台北車站站前核心 ✕ 忠孝西路一段";
    if (camera.z >= 95 && camera.z <= 126 && camera.x <= -100) name = "🌉 萬華/板橋・新店溪 ✕ 華翠大橋 ✕ 華江橋 (跨市橋樑)";
    else if (camera.x <= -30 && camera.z >= 155) name = "🏫 板橋區・學府路一段 (1:1 真實商圈) ✕ 府中商圈 ✕ 林家花園";
    else if (camera.x <= -30 && camera.z >= 115 && camera.z < 155) name = "🏙️ 板橋區・新板特區 ✕ 縣民大道一段 ✕ 新北市政府";
    else if (camera.x <= -125 && camera.z >= 0 && camera.z < 95) name = "🎮 萬華區・西門町徒步區 ✕ 中華路 ✕ 桂林路家樂福";
    else if (camera.x > -125 && camera.x <= -35 && camera.z >= 0 && camera.z < 95) name = "📚 中正區・重慶南路書店街 ✕ 城中市場 ✕ 臺灣博物館";
    else if (camera.x >= 35 && camera.x <= 90 && camera.z >= 90 && camera.z <= 125) name = "🏛️ 中正區・凱達格蘭大道 ✕ 國定古蹟景福門 (東門圓環)";
    else if (camera.z >= -38 && camera.z <= -20 && camera.x >= -60 && camera.x <= 60) name = "🛣️ 中正區・市民大道一段 (市民高架快速道路 ✕ 站北大道)";
    else if (camera.x <= -35 && camera.z < -20) name = "🏮 大同區・大稻埕迪化街 ✕ 霞海城隍廟 ✕ 寧夏夜市";
    else if (camera.x >= 35 && camera.z >= 110) name = "🏛️ 南區商圈・古亭 ✕ 羅斯福路 ✕ 師大夜市/龍泉市場";
    else if (camera.x >= 110 && camera.z >= 50 && camera.z < 110) name = "🌳 大安區・信義商圈 ✕ 敦化南路林蔭大道";
    else if (camera.x >= 135 && camera.z < 50) name = "💼 中山/松山・松江南京金融商圈 ✕ 復興南京";
    else if (camera.x >= 35 && camera.x < 135 && camera.z < 50) name = "🌳 中山區・中山北路林蔭大道 ✕ 南京商圈 ✕ 雙連晴光";
    else if (camera.x <= -180 && camera.z >= -110 && camera.z <= 20) name = "🌊 萬華/大同・淡水河水岸 ✕ 忠孝橋";
    distEl.innerText = name;
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
      camera.x = Math.max(-215, Math.min(215, camera.x));
      camera.z = Math.max(-215, Math.min(215, camera.z));
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

  // 雙倍大地圖邊界限制 (-215 ~ +215, -215 ~ +215)
  playerPos.x = Math.max(-215, Math.min(215, playerPos.x));
  playerPos.z = Math.max(-215, Math.min(215, playerPos.z));

  // 動態攝影機平滑跟隨 (Smooth Lerp Camera)
  camera.x += (playerPos.x - camera.x) * 0.12;
  camera.z += (playerPos.z - camera.z) * 0.12;
  camera.currentScale += (camera.targetScale - camera.currentScale) * 0.1;

  // 更新圓形雷達小地圖指針
  updateMinimapRadar();
  updateGhostDroneHUD();

  checkProximityAndLocation();
}

function updateMinimapRadar() {
  const dot = document.getElementById("radarPlayerDot");
  if (!dot) return;
  // 將雙倍大地圖座標 (-195~195, -170~170) 映射至雷達圓圈
  const normX = ((playerPos.x + 195) / 390) * 72 + 4;
  const normZ = ((playerPos.z + 170) / 340) * 72 + 4;
  dot.style.left = `${normX}px`;
  dot.style.top = `${normZ}px`;
}

/* ─── 7. 公車移動與空拍鳥瞰過場系統 ─── */
function updateBusWorld() {
  cityBuses.forEach(b => updateBusPhysics(b));
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
    showDetectiveDialogue(`「已順利抵達目的地！下車步行調查吧！」`, "都會調查員");
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
    showDetectiveDialogue("「呼～到站下車！在雙北街頭吹吹風，繼續調查！」", "都會調查員");
  } else {
    playerPos.z = playerPos.z + 4;
    playMrtChime();
    showNavToast("🚶 已從捷運列車下車抵達站台！恢復自由探索！");
    showDetectiveDialogue("「捷運列車到站，走出手扶梯繼續調查！」", "都會調查員");
  }
}

/* ─── 8. 現代 2D/2.5D 動漫都會冒險渲染核心 (Y-Sorting 深度分層) ─── */
function renderScene() {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const scale = camera.currentScale;

  // 1. 背景天色 (依據天氣時段)
  ctx.fillStyle = gameState.weather === 'sunny' ? '#0f1f38' : (gameState.weather === 'sunset' ? '#2e1c2b' : '#070d18');
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(cx, cy);

  const screenX = (val) => (val - camera.x) * scale;
  const screenZ = (val) => (val - camera.z) * scale;

  // ──────────────────────────────────────────
  // 第一層：地表鋪面與 1:1 真實雙北街廓拓撲 (Ground Roads & Contiguous Metropolis Topology)
  // 全區涵蓋 -220m ~ +220m，忠實呈現雙北各大行政區真實道路經緯
  // ──────────────────────────────────────────

  // 1. 東西向 9 大主要幹道與街廓 (East-West Major Arterials)
  // (1) 民權西路 / 民權東路 (z: -195, 寬 24m)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-220), screenZ(-207), 440 * scale, 24 * scale);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-220), screenZ(-195.4), 440 * scale, 0.8 * scale);

  // (2) 民生西路 / 民生東路 (z: -140, 寬 22m)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-220), screenZ(-151), 440 * scale, 22 * scale);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-220), screenZ(-140.4), 440 * scale, 0.8 * scale);

  // (3) 南京西路 / 南京東路 (z: -95, 寬 26m)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-220), screenZ(-108), 440 * scale, 26 * scale);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-220), screenZ(-95.4), 440 * scale, 0.8 * scale);

  // (4) 長安西路 / 長安東路 (z: -48, 寬 20m)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-220), screenZ(-58), 440 * scale, 20 * scale);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-220), screenZ(-48.4), 440 * scale, 0.8 * scale);

  // (4.5) 市民大道一段 (市民高架橋 ✕ 台北車站北側大道, z: -26, 寬 22m)
  ctx.fillStyle = '#151921';
  ctx.fillRect(screenX(-220), screenZ(-37), 440 * scale, 22 * scale);
  // 市民大道中央雙黃線
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
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-220), screenZ(-18), 440 * scale, 36 * scale);
  // 忠孝西路 中央公車專用道 (深藍柏油，z: -5 ~ 5)
  ctx.fillStyle = '#1e385c';
  ctx.fillRect(screenX(-220), screenZ(-5), 440 * scale, 10 * scale);
  // 公車專用道白色虛線分道線
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(screenX(-220), screenZ(-5));
  ctx.lineTo(screenX(220), screenZ(-5));
  ctx.moveTo(screenX(-220), screenZ(5));
  ctx.lineTo(screenX(220), screenZ(5));
  ctx.stroke();
  ctx.setLineDash([]);
  // 雙黃線 (z: 0)
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-220), screenZ(-0.4), 440 * scale, 0.8 * scale);
  // 忠孝西路 南北兩側人行道石板地磚
  ctx.fillStyle = '#475569';
  ctx.fillRect(screenX(-220), screenZ(-36), 440 * scale, 18 * scale);
  ctx.fillRect(screenX(-220), screenZ(18), 440 * scale, 18 * scale);

  // (6) 許昌街 / 開封街一段 (z: 44, 寬 18m)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-130), screenZ(35), 205 * scale, 18 * scale);

  // (7) 漢口街一段 / 武昌街一段 (z: 72, 寬 18m)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-220), screenZ(63), 295 * scale, 18 * scale);

  // (8) 衡陽路 / 襄陽路 (z: 98, 寬 20m)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-220), screenZ(88), 295 * scale, 20 * scale);

  // (8.5) 凱達格蘭大道 ✕ 愛國西路 (z: 112, 寬 24m)
  ctx.fillStyle = '#1e242d';
  ctx.fillRect(screenX(-140), screenZ(100), 220 * scale, 24 * scale);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-140), screenZ(111.6), 220 * scale, 0.8 * scale);

  // (9) 板橋縣民大道一段 (z: 130, 寬 26m，新板特區綠帶大道)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-220), screenZ(117), 220 * scale, 26 * scale);
  ctx.fillStyle = '#15803d'; // 中央安全島綠帶
  ctx.fillRect(screenX(-220), screenZ(128.5), 220 * scale, 3 * scale);

  // (10) 板橋學府路一段 (特別由玩家點名指定！z: 168, 寬 26m)
  ctx.fillStyle = '#1c222b';
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
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-220), screenZ(181), 260 * scale, 28 * scale);

  // 2. 南北向 9 大主要幹道與街廓 (North-South Major Arterials)
  // (1) 淡水河畔環河路 / 迪化街一段 (x: -185, 寬 22m, z: -220 ~ 0)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-196), screenZ(-220), 22 * scale, 220 * scale);

  // (2) 萬華漢中街 (西門町徒步區) (x: -178, 寬 20m, z: 0 ~ 115)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-188), screenZ(0), 20 * scale, 115 * scale);

  // (3) 大同延平北路二段/三段 (x: -145, 寬 22m, z: -220 ~ 0)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-156), screenZ(-220), 22 * scale, 220 * scale);

  // (4) 萬華中華路一段 (林蔭大道，寬 32m, z: 0 ~ 115)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-161), screenZ(0), 32 * scale, 115 * scale);
  ctx.fillStyle = '#15803d'; // 中央綠帶
  ctx.fillRect(screenX(-147), screenZ(0), 4 * scale, 115 * scale);

  // (5) 大同重慶北路二段/三段 (x: -85, 寬 26m, z: -220 ~ 0)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-98), screenZ(-220), 26 * scale, 220 * scale);

  // (6) 中正重慶南路一段 (書店街) (x: -92, 寬 24m, z: 0 ~ 140)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-104), screenZ(0), 24 * scale, 140 * scale);

  // (7) 大同寧夏路 (夜市街區) (x: -55, 寬 20m, z: -220 ~ 0)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-65), screenZ(-220), 20 * scale, 220 * scale);

  // (8) 站前館前路 (x: -32, 寬 22m, z: 0 ~ 115)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-43), screenZ(0), 22 * scale, 115 * scale);

  // (9) 站前南陽街 (x: 15, 寬 18m, z: 20 ~ 115)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(6), screenZ(20), 18 * scale, 95 * scale);

  // (10) 站前公園路 (x: 48, 寬 24m, z: 0 ~ 115)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(36), screenZ(0), 24 * scale, 115 * scale);

  // (11) 中山北路一段/二段 (樟樹林蔭大道，寬 36m, z: -220 ~ 30)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(60), screenZ(-220), 36 * scale, 250 * scale);
  ctx.fillStyle = '#15803d'; // 中央綠蔭安全島
  ctx.fillRect(screenX(76), screenZ(-220), 4 * scale, 250 * scale);
  ctx.fillStyle = '#475569'; // 東側人行道
  ctx.fillRect(screenX(96), screenZ(-220), 20 * scale, 250 * scale);

  // (12) 林森北路 (條通商圈) (x: 108, 寬 22m, z: -220 ~ 30)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(97), screenZ(-220), 22 * scale, 250 * scale);

  // (13) 松江路 (金融商圈) (x: 155, 寬 28m, z: -220 ~ 140)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(141), screenZ(-220), 28 * scale, 360 * scale);

  // (14) 復興北路/南路 (文湖線軸線) (x: 185, 寬 28m, z: -220 ~ 140)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(171), screenZ(-220), 28 * scale, 360 * scale);

  // (15) 板橋府中路 / 重慶路 (x: -175 ~ -110, z: 120 ~ 220)
  ctx.fillStyle = '#1c222b';
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

  // 4. 十字路口精密斑馬線
  ctx.fillStyle = '#ffffff';
  // 中山北路 ✕ 忠孝西路
  for (let z = -16; z <= 16; z += 4.5) {
    ctx.fillRect(screenX(55), screenZ(z), 5 * scale, 2.2 * scale);
    ctx.fillRect(screenX(96), screenZ(z), 5 * scale, 2.2 * scale);
  }
  // 館前路 ✕ 忠孝西路
  for (let x = -40; x <= -20; x += 4.5) {
    ctx.fillRect(screenX(x), screenZ(18), 2.2 * scale, 5 * scale);
  }
  // 板橋學府路一段路口斑馬線
  for (let z = 158; z <= 178; z += 4.5) {
    ctx.fillRect(screenX(-60), screenZ(z), 5 * scale, 2.2 * scale);
    ctx.fillRect(screenX(-190), screenZ(z), 5 * scale, 2.2 * scale);
  }

  // 5. 瀝青路面科技路名直接繪製 (Road Surface Typography)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.font = `bold ${Math.max(10, scale * 0.8)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('【忠孝西路一段 ✕ 公車專用道】', screenX(0), screenZ(-1));
  ctx.fillText('【板橋學府路一段 (1:1 真實商圈)】', screenX(-110), screenZ(169));
  ctx.fillText('【縣民大道・新板特區】', screenX(-110), screenZ(131));
  ctx.fillText('【文化路一段・府中商圈】', screenX(-110), screenZ(196));
  ctx.fillText('【中山北路一段・樟樹林蔭大道】', screenX(78), screenZ(-30));
  ctx.fillText('【重慶南路一段・書店街】', screenX(-92), screenZ(50));
  ctx.fillText('【南京西路商圈】', screenX(10), screenZ(-93));
  ctx.fillText('【中華路一段・西門町】', screenX(-145), screenZ(40));
  ctx.fillText('【民生西路・大稻埕與雙連】', screenX(10), screenZ(-138));
  ctx.fillText('【民權西路・晴光商圈】', screenX(10), screenZ(-193));
  ctx.fillText('【松江路・金融特區】', screenX(155), screenZ(-40));

  // 6. 雙北行政區微縮銘板 (District HUD Badges)
  function drawDistrictBadge(text, x, z, col) {
    const bx = screenX(x);
    const bz = screenZ(z);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    drawSafeRoundRect(ctx, bx - 42 * scale * 0.35, bz - 8 * scale * 0.35, 84 * scale * 0.35, 16 * scale * 0.35, 3);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.font = `bold ${Math.max(9, scale * 0.55)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, bx, bz + 4 * scale * 0.35);
  }
  drawDistrictBadge('🏛️ 中正區・站前核心', 0, -28, '#38bdf8');
  drawDistrictBadge('📚 中正區・重慶南路書街', -92, 25, '#60a5fa');
  drawDistrictBadge('🎮 萬華區・西門商圈', -178, 25, '#f472b6');
  drawDistrictBadge('🏮 大同區・大稻埕寧夏', -115, -120, '#fbbf24');
  drawDistrictBadge('🌳 中山區・林蔭商圈', 78, -115, '#a78bfa');
  drawDistrictBadge('💼 中山區・松江南京', 170, -60, '#38bdf8');
  drawDistrictBadge('🏫 板橋區・學府商圈 (1:1)', -120, 156, '#34d399');
  drawDistrictBadge('🏙️ 板橋區・新板府中', -145, 215, '#10b981');
  drawDistrictBadge('🏛️ 南區・古亭師大大安', 105, 120, '#f97316');

  // ──────────────────────────────────────────
  // 1.5 雙北街廓真實都會建築群、綠帶公園與林蔭行道樹 (Urban Fabric & Architecture)
  // 【徹底消除商店孤立浮動或並排感！商店嵌於真實大廈、公寓街廓與林蔭之間】
  // ──────────────────────────────────────────
  function drawCityBlockBuilding(bx, bz, bw, bd, bColor, label, bHeight=28) {
    const sx = screenX(bx);
    const sz = screenZ(bz);
    // 建築物投影陰影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    drawSafeRoundRect(ctx, sx + 3 * scale, sz + 3 * scale, bw * scale, bd * scale, 4);
    ctx.fill();
    // 建築本體
    ctx.fillStyle = bColor;
    drawSafeRoundRect(ctx, sx, sz, bw * scale, bd * scale, 4);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 辦公/住宅透光窗格矩陣 (Lit Windows)
    ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
    const cols = Math.floor(bw / 8);
    const rows = Math.floor(bd / 7);
    for (let c = 1; c < cols; c++) {
      for (let r = 1; r < rows; r++) {
        if ((c + r) % 2 === 0) {
          ctx.fillRect(sx + (c * 8 - 2) * scale, sz + (r * 7 - 1.5) * scale, 3.5 * scale, 3 * scale);
        }
      }
    }

    // 頂樓設備層/標籤
    if (label && scale >= 10) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `bold ${Math.max(8, scale * 0.45)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(label, sx + (bw / 2) * scale, sz + (bd / 2) * scale + 3);
    }
  }

  // (1) 台北車站核心站前大廈：新光摩天大樓 (站前地標)
  drawCityBlockBuilding(-32, 28, 22, 20, '#1e293b', '新光摩天大樓');
  drawCityBlockBuilding(20, 26, 18, 16, '#334155', '站前金融大樓');

  // (2) 二二八和平紀念公園 (綠地與林蔭)
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

  // (2.1) 國立臺灣博物館 (228公園北側・希臘多立克式宮殿與百年銅頂)
  drawCityBlockBuilding(-68, 60, 22, 14, '#334155', '國立臺灣博物館 (希臘多立克式宮殿)');

  // (2.2) 國定古蹟 景福門 (東門圓環 ✕ 凱達格蘭大道 ✕ 中山南路)
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

  // (3) 大安森林公園 (東南方廣袤綠海)
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

  // (10) 中山北路、學府路、敦化南路 綠蔭樟樹行道樹 (Street Trees)
  function drawStreetTree(tx, tz) {
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
    const matchedStores = interactables.filter(it => it.type === gameState.activeBrandFilter);
    const brandColors = {
      familymart: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.25)', glow: 'rgba(16, 185, 129, 0.6)' },
      seven: { stroke: '#ea580c', fill: 'rgba(234, 88, 12, 0.25)', glow: 'rgba(234, 88, 12, 0.6)' },
      carrefour: { stroke: '#ef4444', fill: 'rgba(59, 130, 246, 0.25)', glow: 'rgba(239, 68, 68, 0.6)' },
      pxmart: { stroke: '#0284c7', fill: 'rgba(2, 132, 199, 0.25)', glow: 'rgba(2, 132, 199, 0.6)' },
      coco: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.25)', glow: 'rgba(245, 158, 11, 0.6)' },
      market: { stroke: '#d97706', fill: 'rgba(217, 119, 6, 0.25)', glow: 'rgba(217, 119, 6, 0.7)' }
    };
    const bColor = brandColors[gameState.activeBrandFilter] || { stroke: '#00d2ff', fill: 'rgba(0, 210, 255, 0.25)', glow: 'rgba(0, 210, 255, 0.6)' };

    // (A) 分店之間動態光纖雷射射線
    if (matchedStores.length > 1) {
      ctx.save();
      ctx.strokeStyle = bColor.stroke;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([12, 8]);
      ctx.lineDashOffset = -(Date.now() / 35) % 20;
      ctx.shadowColor = bColor.glow;
      ctx.shadowBlur = 10;
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
    // 預設全部地標點位發光提示
    interactables.forEach(it => {
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

  // (1) CoCo 都可 手搖飲門市立面
  function drawCocoStore(x, z, branchName) {
    const bx = screenX(x - 12);
    const bz = screenZ(z - 10);
    ctx.fillStyle = '#ffffff';
    drawSafeRoundRect(ctx, bx, bz, 24 * scale, 20 * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 亮橘波浪招牌
    ctx.fillStyle = '#f97316';
    drawSafeRoundRect(ctx, bx - 2, bz, 28 * scale, 5.5 * scale, 4);
    ctx.fill();

    // 圓形微笑商標
    ctx.beginPath();
    ctx.arc(bx + 4 * scale, bz + 2.7 * scale, 2.2 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx + 4 * scale, bz + 2.7 * scale, 1.6 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#f97316';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(10, scale * 0.72)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`CoCo (${branchName})`, bx + 7.5 * scale, bz + 3.8 * scale);

    // 服務點餐木質吧檯與不銹鋼茶桶
    ctx.fillStyle = '#78350f';
    drawSafeRoundRect(ctx, bx + 5 * scale, bz + 12 * scale, 14 * scale, 4 * scale, 3);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    drawSafeRoundRect(ctx, bx + 7 * scale, bz + 8.5 * scale, 2.5 * scale, 3.5 * scale, 2);
    ctx.fill();
    drawSafeRoundRect(ctx, bx + 14 * scale, bz + 8.5 * scale, 2.5 * scale, 3.5 * scale, 2);
    ctx.fill();
  }

  // (2) 全家便利商店 FamilyMart 門市立面
  function drawFamilyMartStore(x, z, branchName) {
    const bx = screenX(x - 12);
    const bz = screenZ(z - 10);
    ctx.fillStyle = '#f8fafc';
    drawSafeRoundRect(ctx, bx, bz, 24 * scale, 20 * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 綠藍雙色燈箱
    ctx.fillStyle = '#009944';
    ctx.fillRect(bx, bz, 24 * scale, 3 * scale);
    ctx.fillStyle = '#0068b7';
    ctx.fillRect(bx, bz + 3 * scale, 24 * scale, 2.5 * scale);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(9.5, scale * 0.7)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`FamilyMart (${branchName})`, bx + 12 * scale, bz + 4 * scale);

    // 玻璃自動門
    ctx.fillStyle = 'rgba(219, 234, 254, 0.45)';
    drawSafeRoundRect(ctx, bx + 6 * scale, bz + 10 * scale, 12 * scale, 9 * scale, 3);
    ctx.fill();
    ctx.strokeStyle = '#009944';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // (3) 7-Eleven 統一超商 門市立面
  function drawSevenElevenStore(x, z, branchName) {
    const bx = screenX(x - 12);
    const bz = screenZ(z - 10);
    ctx.fillStyle = '#f8fafc';
    drawSafeRoundRect(ctx, bx, bz, 24 * scale, 20 * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 經典橘綠紅三色橫條
    const stripeH = 1.8 * scale;
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(bx, bz, 24 * scale, stripeH);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(bx, bz + stripeH, 24 * scale, stripeH);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(bx, bz + stripeH * 2, 24 * scale, stripeH);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(9.5, scale * 0.7)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`7-Eleven (${branchName})`, bx + 12 * scale, bz + 3.8 * scale);

    // 落地透光自動門
    ctx.fillStyle = 'rgba(254, 243, 199, 0.45)';
    drawSafeRoundRect(ctx, bx + 6 * scale, bz + 10 * scale, 12 * scale, 9 * scale, 3);
    ctx.fill();
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // (4) 家樂福 Carrefour (量販 ✕ 超市便利購立面，紅白藍雙環 C 字幾何標)
  function drawCarrefourStore(x, z, branchName, isFlagship) {
    const storeW = isFlagship ? 32 : 24;
    const storeH = isFlagship ? 24 : 20;
    const bx = screenX(x - storeW / 2);
    const bz = screenZ(z - storeH / 2);

    ctx.fillStyle = '#f8fafc';
    drawSafeRoundRect(ctx, bx, bz, storeW * scale, storeH * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 家樂福深藍頂條
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(bx, bz, storeW * scale, 5 * scale);

    // 經典紅白藍雙弧 C 標誌
    const logoX = bx + 4 * scale;
    const logoY = bz + 2.5 * scale;
    // 左紅弧
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(logoX - 1.2 * scale, logoY, 1.8 * scale, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    // 右藍弧
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(logoX + 1.2 * scale, logoY, 1.8 * scale, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.fill();
    // 中央菱形白心
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(logoX, logoY, 1 * scale, 0, Math.PI * 2);
    ctx.fill();

    // 招牌名稱
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(9, scale * 0.68)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(isFlagship ? `家樂福旗艦 (${branchName})` : `Carrefour (${branchName})`, bx + 7.5 * scale, bz + 3.6 * scale);

    // 挑高量販雙層大玻璃門窗
    ctx.fillStyle = 'rgba(219, 234, 254, 0.45)';
    drawSafeRoundRect(ctx, bx + 5 * scale, bz + 9 * scale, (storeW - 10) * scale, (storeH - 11) * scale, 3);
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 購物手推車區
    ctx.fillStyle = '#94a3b8';
    drawSafeRoundRect(ctx, bx + 2 * scale, bz + (storeH - 4.5) * scale, 4 * scale, 3.5 * scale, 1);
    ctx.fill();
  }

  // (5) 全聯福利中心 PX Mart (藍底紅白雙圓蝴蝶標、社區生鮮)
  function drawPxMartStore(x, z, branchName) {
    const bx = screenX(x - 12);
    const bz = screenZ(z - 10);
    ctx.fillStyle = '#f8fafc';
    drawSafeRoundRect(ctx, bx, bz, 24 * scale, 20 * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 全聯深藍底招牌
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(bx, bz, 24 * scale, 5.2 * scale);

    // 經典雙圓蝴蝶標誌 (紅/白)
    const logoX = bx + 4 * scale;
    const logoY = bz + 2.6 * scale;
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(logoX - 1.2 * scale, logoY, 1.4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(logoX + 1.2 * scale, logoY, 1.4 * scale, 0, Math.PI * 2);
    ctx.fill();

    // 招牌大字
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(8.8, scale * 0.65)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`全聯 PX MART (${branchName})`, bx + 7.5 * scale, bz + 3.6 * scale);

    // 生鮮大落地櫥窗與生鮮綠條
    ctx.fillStyle = '#15803d';
    ctx.fillRect(bx + 4 * scale, bz + 9 * scale, 16 * scale, 1.8 * scale);
    ctx.fillStyle = 'rgba(224, 242, 254, 0.45)';
    drawSafeRoundRect(ctx, bx + 5 * scale, bz + 11 * scale, 14 * scale, 8 * scale, 2);
    ctx.fill();
  }

  // (6) 傳統市場與觀光夜市 (Traditional Market / Night Market)
  function drawMarketPlace(x, z, marketName) {
    const bx = screenX(x - 14);
    const bz = screenZ(z - 12);
    // 主建築底色 (傳統暖色磚紅/檜木色)
    ctx.fillStyle = '#451a03';
    drawSafeRoundRect(ctx, bx, bz, 28 * scale, 24 * scale, 6);
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 傳統中式斜簷 / 紅金雙色遮雨棚 (Striped Canopy)
    ctx.fillStyle = '#dc2626';
    drawSafeRoundRect(ctx, bx - 2, bz, 32 * scale, 6 * scale, 4);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    for (let stripe = 0; stripe < 32; stripe += 8) {
      ctx.fillRect(bx - 2 + stripe * scale, bz, 4 * scale, 6 * scale);
    }

    // 傳統木匾招牌
    ctx.fillStyle = '#78350f';
    drawSafeRoundRect(ctx, bx + 2 * scale, bz + 1.2 * scale, 26 * scale, 3.8 * scale, 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = `bold ${Math.max(9, scale * 0.65)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`🏮 ${marketName}`, bx + 15 * scale, bz + 3.8 * scale);

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
    drawLantern(bx + 1 * scale, bz + 9 * scale);
    drawLantern(bx + 27 * scale, bz + 9 * scale);

    // 熱鬧攤販檔口 (生鮮蔬果木箱 / 熱氣小吃吧台)
    ctx.fillStyle = '#92400e';
    drawSafeRoundRect(ctx, bx + 4 * scale, bz + 13 * scale, 20 * scale, 8 * scale, 3);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 小吃蒸籠 / 食物陳列
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(bx + 9 * scale, bz + 16 * scale, 2.5 * scale, 0, Math.PI * 2);
    ctx.arc(bx + 19 * scale, bz + 16 * scale, 2.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b45309';
    ctx.font = `bold ${Math.max(8, scale * 0.52)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('老字號', bx + 14 * scale, bz + 19 * scale);
  }

  // 全雙北 124+ 處互動地標與連鎖門市動態加入深度排序清單 (Y-Sorting)
  interactables.forEach(it => {
    if (it.type === 'coco') {
      const bName = it.name.replace('CoCo 都可 (', '').replace(')', '');
      renderList.push({ z: it.z, draw: () => drawCocoStore(it.x, it.z, bName) });
    } else if (it.type === 'familymart') {
      const bName = it.name.replace('全家便利商店 (', '').replace(')', '');
      renderList.push({ z: it.z, draw: () => drawFamilyMartStore(it.x, it.z, bName) });
    } else if (it.type === 'seven') {
      const bName = it.name.replace('7-Eleven 統一超商 (', '').replace(')', '');
      renderList.push({ z: it.z, draw: () => drawSevenElevenStore(it.x, it.z, bName) });
    } else if (it.type === 'carrefour') {
      const bName = it.name.replace('家樂福便利購 (', '').replace('家樂福超市 (', '').replace('家樂福 ', '').replace(')', '');
      renderList.push({ z: it.z, draw: () => drawCarrefourStore(it.x, it.z, bName, !!it.isFlagship) });
    } else if (it.type === 'pxmart') {
      const bName = it.name.replace('全聯福利中心 (', '').replace(')', '');
      renderList.push({ z: it.z, draw: () => drawPxMartStore(it.x, it.z, bName) });
    } else if (it.type === 'market') {
      const bName = it.name.replace('傳統市場', '').replace('觀光夜市', '').replace('老市集', '');
      renderList.push({ z: it.z, draw: () => drawMarketPlace(it.x, it.z, bName) });
    } else if (it.type === 'station') {
      renderList.push({
        z: it.z,
        draw: () => {
          const bx = screenX(it.x - it.w / 2);
          const bz = screenZ(it.z - it.d / 2);
          ctx.fillStyle = '#334155';
          drawSafeRoundRect(ctx, bx, bz, it.w * scale, it.d * scale, 8);
          ctx.fill();
          // 傳統廡殿頂造型
          ctx.fillStyle = '#7c2d12';
          drawSafeRoundRect(ctx, bx - 4 * scale, bz - 6 * scale, (it.w + 8) * scale, 14 * scale, 6);
          ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.font = `bold ${Math.max(13, scale * 1.05)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('🚇 台北車站 TAIPEI MAIN STATION', bx + (it.w / 2) * scale, bz + 18 * scale);
        }
      });
    } else if (it.type === 'mrt_escalator') {
      renderList.push({
        z: it.z,
        draw: () => {
          const bx = screenX(it.x - 6);
          const bz = screenZ(it.z - 5);
          ctx.fillStyle = '#0284c7';
          drawSafeRoundRect(ctx, bx, bz, 12 * scale, 10 * scale, 4);
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(9, scale * 0.6)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(`Ⓜ️ ${it.name.split(' ')[0]}`, bx + 6 * scale, bz + 6 * scale);
        }
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
    }
  });

  // 雙北真實路網幹線公車車隊渲染 (Rotated 2.5D City Buses)
  cityBuses.forEach(bus => {
    renderList.push({
      z: bus.z,
      draw: () => drawRotatedBus(bus)
    });
  });

  // 【人物與居民渲染】：依據使用者要求，在幽靈天眼模式下隱藏人物與居民！地面模式下才顯示！
  if (!gameState.isGhostMode) {
    // NPC 行人
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
          ctx.beginPath();
          ctx.ellipse(px, pz + 2, 8, 4, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fill();

          ctx.fillStyle = p.shirt;
          drawSafeRoundRect(ctx, px - 6, pz - 16, 12, 12, 3);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px, pz - 21, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = '#fed7aa';
          ctx.fill();
          ctx.fillStyle = p.pants;
          const legSwing = Math.sin(p.walkCycle) * 3;
          ctx.fillRect(px - 4, pz - 4, 3, 5 + legSwing);
          ctx.fillRect(px + 1, pz - 4, 3, 5 - legSwing);
        }
      });
    });

    // 遠端連線其他玩家
    remotePlayers.forEach(rp => {
      renderList.push({
        z: rp.z || 0,
        draw: () => {
          const rx = screenX(rp.x || 0);
          const rz = screenZ(rp.z || 0);
          ctx.fillStyle = '#059669';
          drawSafeRoundRect(ctx, rx - 7, rz - 18, 14, 14, 3);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(rx, rz - 23, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#fed7aa';
          ctx.fill();

          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(rp.nickname, rx, rz - 34);
        }
      });
    });

    // 主角 (都會調查員)
    renderList.push({
      z: playerPos.z,
      draw: () => {
        const px = screenX(playerPos.x);
        const pz = screenZ(playerPos.z);

        // 影子
        ctx.beginPath();
        const shadowW = gameState.isRunning ? 14 : 10;
        ctx.ellipse(px, pz + 2, shadowW, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fill();

        // 滑板
        if (gameState.hasSkateboard) {
          ctx.fillStyle = '#ef4444';
          drawSafeRoundRect(ctx, px - 12, pz, 24, 5, 2);
          ctx.fill();
        }

        // 風衣軀幹
        ctx.fillStyle = '#1d4ed8';
        drawSafeRoundRect(ctx, px - 7, pz - 18, 14, 14, 3);
        ctx.fill();

        // 擺動四肢
        ctx.fillStyle = '#1e293b';
        const legSwing = Math.sin(playerPos.walkCycle) * (gameState.isRunning ? 5 : 3);
        ctx.fillRect(px - 5, pz - 4, 3.5, 6 + legSwing);
        ctx.fillRect(px + 1.5, pz - 4, 3.5, 6 - legSwing);

        // 頭部與帽子
        ctx.beginPath();
        ctx.arc(px, pz - 24, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#fed7aa';
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        drawSafeRoundRect(ctx, px - 8, pz - 31, 16, 7, 3);
        ctx.fill();

        // 頭頂對話氣泡
        ctx.fillStyle = 'rgba(10, 25, 50, 0.9)';
        drawSafeRoundRect(ctx, px - 65, pz - 60, 130, 22, 6);
        ctx.fill();
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(gameState.currentBubble, px, pz - 45);
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

  ctx.restore();
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
  // 動態比對距離最近之真實門市、公車站牌或市集
  let nearestItem = null;
  let minItemDist = 20;
  for (const item of interactables) {
    const d = Math.hypot(playerPos.x - item.x, playerPos.z - item.z);
    if (d < minItemDist) {
      minItemDist = d;
      nearestItem = item;
    }
  }

  if (nearestItem) {
    currentLoc = `${nearestItem.name} (${nearestItem.address || '雙北核心商圈'})`;
  } else {
    // 區域街區名稱備援
    if (playerPos.z > 95 && playerPos.x < -60) currentLoc = "板橋區・學府路一段 ✕ 新板特區商圈";
    else if (playerPos.z < -60 && playerPos.x > 30) currentLoc = "中山區・中山北路林蔭大道 ✕ 南京商圈";
    else if (playerPos.z < -60 && playerPos.x < -60) currentLoc = "大同區・建成圓環 ✕ 寧夏夜市商圈";
    else if (playerPos.z > 15 && playerPos.x < -90) currentLoc = "萬華/中正・重慶南路書店街 ✕ 西門町商圈";
    else currentLoc = "中正區・忠孝西路一段 ✕ 台北車站站前廣場";
  }

  if (gameState.currentLocationName !== currentLoc) {
    gameState.currentLocationName = currentLoc;
    if (locationText) locationText.innerText = currentLoc;
  }

  // 體力警告
  const warnBanner = document.getElementById("staminaWarningBanner");
  if (warnBanner) warnBanner.style.display = gameState.stamina <= 18 ? "flex" : "none";

  // 實體互動範圍判定
  let nearest = null;
  let minD = 999;

  for (const item of interactables) {
    const dist = Math.hypot(playerPos.x - item.x, playerPos.z - item.z);
    if (dist < (item.r || 8.5) && dist < minD) {
      minD = dist;
      nearest = item;
    }
  }

  if (nearest) {
    gameState.activeInteractTarget = nearest.type;
    interactLabel.innerText = nearest.label;
    interactPrompt.style.display = "flex";

    if (nearest.id !== lastNearestId) {
      lastNearestId = nearest.id;
      updateActionPills(nearest);
      if ((nearest.type === 'familymart' || nearest.type === 'seven' || nearest.type === 'coco' || nearest.type === 'carrefour' || nearest.type === 'pxmart' || nearest.type === 'market') && !hasPlayedDoorbell) {
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
  } else if (item.type === "carrefour") {
    addActionPill(`🛒 進入家樂福 (${item.name})`, "E", () => openCarrefourModal(item));
    addActionPill("🥖 買家庭號能量吐司 ($40)", "🥖", () => buyCarrefourToast());
    addActionPill("💧 買大瓶量販運動水 ($30)", "💧", () => buyCarrefourWater());
    addActionPill("🧰 買手提補給箱 ($120)", "🧰", () => buyCarrefourBox());
  } else if (item.type === "pxmart") {
    addActionPill(`🧺 進入全聯 (${item.name})`, "E", () => openPxmartModal(item));
    addActionPill("🍎 買產地直送高纖蘋果 ($35)", "🍎", () => buyPxmartApple());
    addActionPill("🥛 買濃醇高纖豆漿 ($25)", "🥛", () => buyPxmartSoymilk());
    addActionPill("🧺 買生鮮活力籃 ($80)", "🧺", () => buyPxmartBasket());
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
  else if (it.type === "carrefour") openCarrefourModal(it);
  else if (it.type === "pxmart") openPxmartModal(it);
  else if (it.type === "market") openMarketModal(it);
  else if (it.type === "police") openCctvModal();
  else if (it.type === "nightmarket") openNightMarketModal();
  else if (it.type === "ferry") openFerryModal();
  else if (it.type === "rest") openRestModal();
  else if (it.type === "clue_ground") guideToClue();
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

function showDetectiveDialogue(text, speaker = "都會調查員") {
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

function openCarrefourModal(store) {
  const modal = document.getElementById("carrefourModal");
  if (modal) {
    if (store && store.name) {
      const title = modal.querySelector(".modal-title");
      if (title) title.innerHTML = `<span>🛒</span> ${store.name}`;
      const greet = document.getElementById("carrefourBranchGreeting");
      if (greet) {
        greet.innerText = `店長親切招呼：「天天都便宜，就是家樂福！【${store.name}】全雙北物流互聯，提供充足調查能量補給！」`;
      }
    }
    modal.style.display = "flex";
  }
}

function openPxmartModal(store) {
  const modal = document.getElementById("pxmartModal");
  if (modal) {
    if (store && store.name) {
      const title = modal.querySelector(".modal-title");
      if (title) title.innerHTML = `<span>🧺</span> ${store.name}`;
      const greet = document.getElementById("pxmartBranchGreeting");
      if (greet) {
        greet.innerText = `廣播響起：「請支援收銀！買進美好生活，【${store.name}】生鮮產地直送！」`;
      }
    }
    modal.style.display = "flex";
  }
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
    showDetectiveDialogue("「滾燙大骨高湯配上油麵與豆芽紅燒肉，傳統市場的人情味真暖心！」", "都會調查員");
  } else if (foodType === 'roll') {
    gameState.stamina = Math.min(100, gameState.stamina + 35);
    gameState.mood = Math.min(100, gameState.mood + 30);
    showNavToast("🌯 享用現包傳香潤餅捲！體力 +35、心情 +30！");
    showDetectiveDialogue("「滿滿脆甜高麗菜加上香甜花生粉與蛋酥，酥脆爽口！」", "都會調查員");
  } else if (foodType === 'fishcake') {
    gameState.stamina = Math.min(100, gameState.stamina + 20);
    gameState.mood = Math.min(100, gameState.mood + 35);
    showNavToast("🍢 享用現炸旗魚黑輪！心情 +35！");
    showDetectiveDialogue("「金黃現炸旗魚黑輪熱氣騰騰，咬開還有包水煮蛋，太滿足了！」", "都會調查員");
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
function openInterrogateModal() { document.getElementById("interrogateModal").style.display = "flex"; }
function openVictoryModal() { document.getElementById("victoryModal").style.display = "flex"; }
function openInventoryModal() { updateQuestProgress(); document.getElementById("inventoryModal").style.display = "flex"; }
function openQuestsModal() { updateQuestProgress(); document.getElementById("questsModal").style.display = "flex"; }
function openMapModal() { updateQuestProgress(); document.getElementById("mapModal").style.display = "flex"; }
function openSettingsModal() { document.getElementById("settingsModal").style.display = "flex"; }
function closeModal(id) { const el = document.getElementById(id); if (el) el.style.display = "none"; }

/* ─── 10b. 家樂福與全聯商品購買邏輯 ─── */
function buyCarrefourToast() {
  if (gameState.money < 40) return alert("生活金不足 $40 囉！");
  gameState.money -= 40;
  gameState.stamina = Math.min(100, gameState.stamina + 45);
  updateBars();
  playTone(659, 'triangle', 0.15);
  showNavToast("🥖 購買家樂福家庭號能量吐司！體力 +45！");
  showDetectiveDialogue("「家樂福現做白吐司香軟飽滿，體力瞬間補滿大半！」", "都會調查員");
  closeModal('carrefourModal');
}

function buyCarrefourWater() {
  if (gameState.money < 30) return alert("生活金不足 $30 囉！");
  gameState.money -= 30;
  gameState.mood = Math.min(100, gameState.mood + 35);
  updateBars();
  playTone(587, 'triangle', 0.15);
  showNavToast("💧 購買家樂福 1500ml 量販大瓶水！心情 +35！");
  showDetectiveDialogue("「量販大容量飲用水就是踏實，隨時補充水分！」", "都會調查員");
  closeModal('carrefourModal');
}

function buyCarrefourBox() {
  if (gameState.money < 120) return alert("生活金不足 $120 囉！");
  gameState.money -= 120;
  gameState.stamina = Math.min(100, gameState.stamina + 60);
  gameState.mood = Math.min(100, gameState.mood + 50);
  updateBars();
  playTone(784, 'triangle', 0.2);
  showNavToast("🧰 購買家樂福調查員手提補給箱！體力 +60、心情 +50！");
  showDetectiveDialogue("「豪華手提量販補給箱！乾糧與電解水一應俱全，調查巡航無後顧之憂！」", "都會調查員");
  closeModal('carrefourModal');
}

function buyPxmartApple() {
  if (gameState.money < 35) return alert("生活金不足 $35 囉！");
  gameState.money -= 35;
  gameState.stamina = Math.min(100, gameState.stamina + 35);
  updateBars();
  playTone(659, 'triangle', 0.15);
  showNavToast("🍎 購買全聯產地直送高纖蘋果！體力 +35！");
  showDetectiveDialogue("「清脆香甜的產地直送蘋果，一口咬下滿口生津，元氣滿滿！」", "都會調查員");
  closeModal('pxmartModal');
}

function buyPxmartSoymilk() {
  if (gameState.money < 25) return alert("生活金不足 $25 囉！");
  gameState.money -= 25;
  gameState.stamina = Math.min(100, gameState.stamina + 25);
  gameState.mood = Math.min(100, gameState.mood + 20);
  updateBars();
  playTone(587, 'triangle', 0.15);
  showNavToast("🥛 購買全聯濃醇無糖高纖豆漿！體力 +25、心情 +20！");
  showDetectiveDialogue("「非基改現磨濃醇高纖豆漿，提神醒腦、思路清晰！」", "都會調查員");
  closeModal('pxmartModal');
}

function buyPxmartBasket() {
  if (gameState.money < 80) return alert("生活金不足 $80 囉！");
  gameState.money -= 80;
  gameState.stamina = Math.min(100, gameState.stamina + 50);
  gameState.mood = Math.min(100, gameState.mood + 40);
  updateBars();
  playTone(740, 'triangle', 0.2);
  showNavToast("🧺 購買全聯社區生鮮活力籃！體力 +50、心情 +40！");
  showDetectiveDialogue("「時令新鮮蔬果綜合籃，維持一整天充沛體能！」", "都會調查員");
  closeModal('pxmartModal');
}

/* ─── 10c. 連鎖品牌雷達切換與街區導航 ─── */
function setBrandRadarFilter(brand) {
  gameState.activeBrandFilter = brand;
  document.querySelectorAll(".radar-filter-btn").forEach(b => b.classList.remove("active"));
  const btnMap = {
    all: 'filterAll',
    familymart: 'filterFmart',
    seven: 'filterSeven',
    carrefour: 'filterCarrefour',
    pxmart: 'filterPxmart',
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
    } else if (brand === 'carrefour') {
      banner.style.display = "flex";
      icon.innerText = "🛒";
      text.innerText = "家樂福 Carrefour 全城量販物流網絡已啟動！12 間旗艦大賣場與便利購全城跨區互聯！";
      showNavToast("🛒 家樂福 Carrefour 全城量販物流雷達啟動！");
      playTone(523, 'triangle', 0.15);
    } else if (brand === 'pxmart') {
      banner.style.display = "flex";
      icon.innerText = "🧺";
      text.innerText = "全聯 PX Mart 社區生鮮互聯網絡啟動！雙北 14 間生鮮超市供應鏈互聯！";
      showNavToast("🧺 全聯 PX Mart 社區生鮮網絡雷達啟動！");
      playTone(493, 'triangle', 0.15);
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
  if (distId === 'station') {
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
    const btn = document.getElementById("btnJumpChongqing");
    if (btn) btn.classList.add("highlight");
    showNavToast("📚 已跳轉至【重慶南路書街 ✕ 西門町商圈】！");
  } else if (distId === 'circle') {
    camera.x = -95; camera.z = -45; camera.targetScale = 16;
    const btn = document.getElementById("btnJumpCircle");
    if (btn) btn.classList.add("highlight");
    showNavToast("🏮 已跳轉至【建成圓環 ✕ 寧夏夜市】！");
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
    if (text) text.innerText = "幽靈天眼 (無角色)";
    showNavToast("🛰️ 已切換為【天眼幽靈自由巡航模式】！角色與市民已隱藏，自由飛行巡視雙北！");
    showDetectiveDialogue("「切換至高空天眼巡航！以幽靈視角俯瞰雙北真實街廓與連鎖門市！」", "都會調查員");
  } else {
    if (btn) btn.classList.remove("spectator");
    if (icon) icon.innerText = "🚶";
    if (text) text.innerText = "地面角色模式";
    playerPos.x = camera.x;
    playerPos.z = camera.z;
    showNavToast("🚶 已切換為【地面角色模式】！調查員與市民已現身，可親自漫步街區！");
    showDetectiveDialogue("「降落回地面！以調查員之姿親自踏查雙北街頭！」", "都會調查員");
  }
  playTone(gameState.isGhostMode ? 880 : 440, 'sine', 0.1);
}

function zoomInCamera() {
  camera.targetScale = Math.min(camera.maxScale, camera.targetScale * 1.25);
  playTone(700, 'sine', 0.05);
  updateGhostDroneHUD();
}

function zoomOutCamera() {
  camera.targetScale = Math.max(camera.minScale, camera.targetScale * 0.8);
  playTone(500, 'sine', 0.05);
  updateGhostDroneHUD();
}

function resetCameraCenter() {
  camera.x = 0;
  camera.z = 14;
  camera.targetScale = 15;
  playTone(600, 'sine', 0.08);
  updateGhostDroneHUD();
  showNavToast("🎯 鏡頭已重置置中於【台北車站 忠孝西路】！");
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
  gameState.mosaic = !gameState.mosaic;
  const box = document.getElementById("webgl-container");
  const btn = document.getElementById("btnMosaic");
  if (gameState.mosaic) {
    if (box) box.classList.add("mosaic-mode");
    if (btn) btn.innerText = "👁️ 防嚇馬賽克保護：開";
  } else {
    if (box) box.classList.remove("mosaic-mode");
    if (btn) btn.innerText = "👁️ 防嚇馬賽克保護：關";
  }
  playTone(600, 'sine', 0.05);
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
  const bot2 = { id: 'bot_2', nickname: '市民_益碩', x: 75, z: -25 };
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
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

function gameLoop() {
  requestAnimationFrame(gameLoop);
  updateMovement();
  updateBusWorld();
  renderScene();
}
gameLoop();

initPrivateServerConnection();
