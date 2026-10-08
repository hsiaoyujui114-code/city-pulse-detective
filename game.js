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
  walkSpeed: 0.38,       // 🚶 正常步行速度 (比過去 0.2 提升近一倍)
  runSpeed: 0.75,        // 🏃 奔跑衝刺速度 (極速奔馳)
  isRunning: false,      // 當前是否處於跑步衝刺狀態
  speed: 0.38,
  // 幽靈天眼巡航核心狀態 (Ghost Spectator Drone View)
  isGhostMode: true,     // 預設為天眼幽靈自由巡航模式 (無人物，自由飛翔巡視地圖)
  droneFlySpeed: 0.85,   // 天眼飛行平移速度
  droneTurboSpeed: 2.2,  // 極速巡航飛行速度
  activeBrandFilter: 'all', // 當前連鎖雷達篩選品牌: 'all', 'familymart', 'seven', 'carrefour', 'pxmart', 'coco'
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
// 互動地標點位 (留存店家 100% 精確對齊現實路名、門牌號碼與街區相對位置)
const interactables = [
  // 1. 公車通勤站牌 (以 307 幹線為主軸)
  { id: 'bus_station_zx', x: 0, z: 2, r: 8.5, type: 'bus_stop', name: '台北車站(忠孝)公車專用道站牌', line: '307', dest: 'zhongshan', label: '搭乘 307 公車 (前往中山商圈 / 南京東路)' },
  { id: 'bus_station_zs', x: 70, z: -35, r: 8.5, type: 'bus_stop', name: '中山市場公車站牌 (CoCo前)', line: '307', dest: 'station', label: '搭乘 307 公車 (前往台北車站)' },
  { id: 'bus_station_xf', x: -120, z: 120, r: 8.5, type: 'bus_stop', name: '板橋學府路一段公車站牌', line: '307', dest: 'station', label: '搭乘 307 公車 (經板橋至台北車站)' },

  // 2. 捷運站出入口手扶梯
  { id: 'mrt_escalator_m6', x: 24, z: 24, r: 7.5, type: 'mrt_escalator', name: '捷運出入口 M6 (搭手扶梯往地下月台)', label: '搭手扶梯進地下月台' },
  { id: 'mrt_escalator_zs', x: 70, z: 15, r: 7.5, type: 'mrt_escalator', name: '捷運中山站出入口 (搭手扶梯往地下月台)', label: '搭手扶梯進地下月台' },
  { id: 'mrt_escalator_fz', x: -140, z: 145, r: 7.5, type: 'mrt_escalator', name: '捷運府中站出入口 (板橋區)', label: '搭手扶梯進地下月台' },

  // 3. 實體品牌連鎖門市 (遵守 50% 剪裁法則，留存門市 100% 精確對齊現實)：
  // (A) 全家便利商店 FamilyMart (綠藍經典雙色燈箱、FamiPort)
  // 【學府路一段剪裁實施例】：現實約 5 間 ➔ 精簡保留 2 間 (板橋學府店、板橋學府二店)，符合 <= 50% 剪裁法則！
  { id: 'fmart_xf', x: -145, z: 120, r: 8.0, type: 'familymart', name: '全家便利商店 (板橋學府店)', address: '板橋區學府路一段 146 號', label: '進入全家 (板橋學府店)' },
  { id: 'fmart_xf2', x: -105, z: 120, r: 8.0, type: 'familymart', name: '全家便利商店 (板橋學府二店)', address: '板橋區學府路一段 98 號', label: '進入全家 (板橋學府二店)' },
  { id: 'fmart_station', x: -20, z: 45, r: 8.0, type: 'familymart', name: '全家便利商店 (站前館前店)', address: '中正區館前路 43 號', label: '進入全家 (站前館前店)' },
  { id: 'fmart_zs', x: 92, z: 25, r: 8.0, type: 'familymart', name: '全家便利商店 (中山北路店)', address: '中山區中山北路一段 105 號', label: '進入全家 (中山北路店)' },
  { id: 'fmart_circle', x: -105, z: -75, r: 8.0, type: 'familymart', name: '全家便利商店 (建成圓環店)', address: '大同區重慶北路二段 12 號', label: '進入全家 (建成圓環店)' },
  { id: 'fmart_xm', x: -125, z: 50, r: 8.0, type: 'familymart', name: '全家便利商店 (西門町漢中店)', address: '萬華區漢中街 52 號', label: '進入全家 (西門漢中店)' },

  // (B) 7-Eleven 統一超商 (橘綠紅三色招牌、OPENPOINT)
  { id: 'seven_xf', x: -75, z: 125, r: 8.0, type: 'seven', name: '7-Eleven 統一超商 (板橋學府門市)', address: '板橋區學府路一段 62 號', label: '進入 7-Eleven (板橋學府門市)' },
  { id: 'seven_zx', x: -15, z: 28, r: 8.0, type: 'seven', name: '7-Eleven 統一超商 (站前忠孝店)', address: '中正區忠孝西路一段 49 號', label: '進入 7-Eleven (站前忠孝店)' },
  { id: 'seven_cq', x: -115, z: 75, r: 8.0, type: 'seven', name: '7-Eleven 統一超商 (重慶南路店)', address: '中正區重慶南路一段 70 號', label: '進入 7-Eleven (重慶南路店)' },
  { id: 'seven_zs', x: 92, z: -95, r: 8.0, type: 'seven', name: '7-Eleven 統一超商 (中山南京店)', address: '中山區中山北路一段 120 號', label: '進入 7-Eleven (中山南京店)' },
  { id: 'seven_circle', x: -90, z: -140, r: 8.0, type: 'seven', name: '7-Eleven 統一超商 (寧夏夜市店)', address: '大同區民生西路 188 號', label: '進入 7-Eleven (寧夏夜市店)' },
  { id: 'seven_banqiao', x: -160, z: 160, r: 8.0, type: 'seven', name: '7-Eleven 統一超商 (府中重慶店)', address: '板橋區重慶路 15 號', label: '進入 7-Eleven (府中重慶店)' },

  // (C) 家樂福 Carrefour (量販 ✕ 超市便利購，紅白藍雙環 C 字標)
  { id: 'carrefour_xf', x: -170, z: 115, r: 9.0, type: 'carrefour', name: '家樂福便利購 (板橋學府店)', address: '板橋區學府路一段 192 號', isFlagship: false, label: '進入家樂福便利購 (學府店)' },
  { id: 'carrefour_cq_flagship', x: -110, z: -150, r: 10.5, type: 'carrefour', name: '家樂福 重慶旗艦店 (雙層大賣場)', address: '大同區重慶北路二段 171 號', isFlagship: true, label: '進入家樂福重慶旗艦店 (大賣場)' },
  { id: 'carrefour_cq_south', x: -115, z: 110, r: 9.0, type: 'carrefour', name: '家樂福超市 (重慶南店)', address: '中正區重慶南路一段 118 號', isFlagship: false, label: '進入家樂福超市 (重慶南店)' },
  { id: 'carrefour_zs', x: 92, z: -55, r: 9.0, type: 'carrefour', name: '家樂福超市 (中山店)', address: '中山區中山北路一段 88 號', isFlagship: false, label: '進入家樂福超市 (中山店)' },
  { id: 'carrefour_fz', x: -130, z: 170, r: 9.0, type: 'carrefour', name: '家樂福超市 (板橋府中店)', address: '板橋區府中路 29 號', isFlagship: false, label: '進入家樂福超市 (府中店)' },

  // (D) 全聯福利中心 PX Mart (深藍底紅白蝴蝶圓形標、社區生鮮)
  { id: 'pxmart_yp', x: -145, z: -110, r: 8.5, type: 'pxmart', name: '全聯福利中心 (延平店)', address: '大同區延平北路二段 247 號', label: '進入全聯 (延平店)' },
  { id: 'pxmart_cq', x: -110, z: -180, r: 8.5, type: 'pxmart', name: '全聯福利中心 (重慶店)', address: '大同區重慶北路三段 154 號', label: '進入全聯 (重慶店)' },
  { id: 'pxmart_xf', x: -130, z: 130, r: 8.5, type: 'pxmart', name: '全聯福利中心 (板橋學府店)', address: '板橋區學府路一段 180 號', label: '進入全聯 (板橋學府店)' },
  { id: 'pxmart_wc', x: -115, z: 45, r: 8.5, type: 'pxmart', name: '全聯福利中心 (中正武昌店)', address: '中正區重慶南路一段 86 號', label: '進入全聯 (中正武昌店)' },

  // (E) CoCo 都可 手搖飲門市 (亮橘波浪招牌、經典微笑圓標、保溫茶桶)
  { id: 'coco_ny', x: -20, z: 65, r: 8.0, type: 'coco', name: 'CoCo 都可 (站前南陽店)', address: '中正區南陽街 18 號', label: '購買 CoCo 手搖飲 (南陽店)' },
  { id: 'coco_zs', x: 92, z: -35, r: 8.0, type: 'coco', name: 'CoCo 都可 (中山北路門市)', address: '中山區中山北路一段 92 號', label: '購買 CoCo 手搖飲 (中山門市)' },
  { id: 'coco_cq', x: -115, z: 15, r: 8.0, type: 'coco', name: 'CoCo 都可 (重慶書店街店)', address: '中正區重慶南路一段 55 號', label: '購買 CoCo 手搖飲 (重慶店)' },
  { id: 'coco_fz', x: -150, z: 150, r: 8.0, type: 'coco', name: 'CoCo 都可 (板橋府中店)', address: '板橋區重慶路 12 號', label: '購買 CoCo 手搖飲 (府中店)' },

  // 4. 重點調查與線索地標
  { id: 'clue_flower', x: 12, z: 18, r: 6.0, type: 'clue_ground', name: '站前花圃神祕紙條', label: '翻查站前花圃神祕紙條' },
  { id: 'nightmarket', x: -110, z: -120, r: 9.0, type: 'nightmarket', name: '建成圓環 ✕ 寧夏夜市美食小吃街', label: '品嚐寧夏夜市美食 (鹽酥雞 / 章魚燒)' },
  { id: 'police_cctv', x: 130, z: 120, r: 8.5, type: 'police', name: '北投分局刑事偵查隊', label: '與林巡官調閱 CCTV 監控軌跡' },
  { id: 'ferry_tamsui', x: -180, z: -40, r: 8.5, type: 'ferry', name: '淡水河渡輪觀景棧道', label: '欣賞淡水河風景' },
  { id: 'rest_bench', x: 2, z: 26, r: 6.0, type: 'rest', name: '站前候車長椅', label: '在長椅休息恢復體力' },
  { id: 'rest_bench_xf', x: -110, z: 128, r: 6.0, type: 'rest', name: '板橋學府路候車休憩椅', label: '在長椅休息恢復體力' }
];

// 307 幹線公車動態物件
const bus307 = {
  x: -40,
  z: 2,
  w: 18,
  d: 4.8,
  speed: 0.28,
  dir: 1, // 1 往東，-1 往西
  currentRoute: 'zx', // 'zx' 忠孝西路, 'zs' 中山北路
  destName: '中山商圈 / 南京東路'
};

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
    camera.x = cameraDragStartX - dx / camera.currentScale;
    camera.z = cameraDragStartZ - dy / camera.currentScale;
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
    let name = "中正區・忠孝西路一段 ✕ 台北車站";
    if (camera.x <= -60 && camera.z >= 80) name = "🏫 板橋區・學府路一段 (1:1 真實商圈)";
    else if (camera.x <= -70 && camera.z <= -60) name = "🏮 大同區・建成圓環 ✕ 寧夏夜市";
    else if (camera.x >= 40 && camera.z <= 0) name = "🌳 中山區・中山北路林蔭大道 ✕ 南京商圈";
    else if (camera.x <= -80 && camera.z > 0 && camera.z < 80) name = "📚 萬華/中正・重慶南路書店街 ✕ 西門町";
    else if (camera.x <= -150 && camera.z >= -60 && camera.z <= 0) name = "🌊 萬華/大同・淡水河水岸碼頭棧道";
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
      playerPos.x = bus307.x;
      playerPos.z = bus307.z;
      if (transitStatus) {
        transitStatus.innerText = `🚌 307 公車行駛中 (位置: X:${Math.round(bus307.x)}, Z:${Math.round(bus307.z)})，隨車漫遊欣賞街景中... 可點擊【到站下車】或【快轉】。`;
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
  // 307 公車沿著專用道巡迴行駛
  bus307.x += bus307.dir * bus307.speed;
  if (bus307.x > 50) bus307.dir = -1;
  else if (bus307.x < -60) bus307.dir = 1;
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

  transitBadge.innerText = `🚌 307 幹線公車 (${dest === 'zhongshan' ? '台北車站 ➔ 中山商圈' : '中山商圈 ➔ 台北車站'})`;
  transitStatus.innerText = "車輛已發車平穩行駛中，可點擊右方按鈕啟用鳥瞰快轉過場...";
  transitHud.style.display = "flex";

  showNavToast("🚌 悠遊卡扣款 $15！已登上 307 公車，可點擊快轉鍵啟用高空鳥瞰過場！");
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
    ? { x: 70, z: -35, name: '中山商圈・CoCo門市前' }
    : { x: 0, z: 14, name: '台北車站・忠孝西路站前' };

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
    playerPos.x = bus307.x;
    playerPos.z = bus307.z + 5.5; // 下車至路旁人行道
    playBusChime();
    showNavToast("🚶 已從 307 公車下車至人行道！恢復自由探索！");
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
  // 第一層：地表鋪面與 1:1 真實雙北街廓拓撲 (Ground Roads & Topology)
  // ──────────────────────────────────────────

  // 1. 忠孝西路一段 (東西向大道，寬 40m，z: -20 ~ 20)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-220), screenZ(-20), 440 * scale, 40 * scale);

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

  // 忠孝西路 南北兩側人行道
  ctx.fillStyle = '#475569';
  ctx.fillRect(screenX(-220), screenZ(-38), 440 * scale, 18 * scale);
  ctx.fillRect(screenX(-220), screenZ(20), 440 * scale, 18 * scale);

  // 2. 中山北路一段 (南北向林蔭大道，寬 36m，x: 60 ~ 96)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(60), screenZ(-220), 36 * scale, 440 * scale);
  // 中山北路中央綠蔭安全島 (樟樹綠帶，x: 76 ~ 80)
  ctx.fillStyle = '#15803d';
  ctx.fillRect(screenX(76), screenZ(-220), 4 * scale, 440 * scale);
  // 中山北路東側人行道 (x: 96 ~ 120)
  ctx.fillStyle = '#475569';
  ctx.fillRect(screenX(96), screenZ(-220), 24 * scale, 440 * scale);

  // 3. 南京西路 / 南京東路 (東西向大道，x: -140 ~ 200, z: -105 ~ -85)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-140), screenZ(-105), 340 * scale, 20 * scale);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-140), screenZ(-95.4), 340 * scale, 0.8 * scale);

  // 4. 館前路 (南北向站前大道，x: -35 ~ -5, z: 20 ~ 160)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-35), screenZ(20), 30 * scale, 140 * scale);

  // 5. 重慶南路一段 (南北向書店街，x: -125 ~ -95, z: 20 ~ 200)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-125), screenZ(20), 30 * scale, 180 * scale);

  // 6. 重慶北路二段 (南北向圓環段，x: -125 ~ -95, z: -220 ~ -20)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-125), screenZ(-220), 30 * scale, 200 * scale);

  // 7. 中華路一段 (南北向西門町林蔭大道，x: -150 ~ -120, z: 20 ~ 110)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-150), screenZ(20), 30 * scale, 90 * scale);
  ctx.fillStyle = '#15803d';
  ctx.fillRect(screenX(-137), screenZ(20), 4 * scale, 90 * scale);

  // 8. 【板橋區核心街道 - 1:1 還原真實路網】
  // (A) 板橋學府路一段 (特別由玩家點名指定！東西向幹道，x: -195 ~ -65, z: 110 ~ 138)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-195), screenZ(110), 130 * scale, 28 * scale);
  // 學府路一段中央黃虛線
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(screenX(-195), screenZ(124));
  ctx.lineTo(screenX(-65), screenZ(124));
  ctx.stroke();
  ctx.setLineDash([]);
  // 學府路一段兩側人行道
  ctx.fillStyle = '#475569';
  ctx.fillRect(screenX(-195), screenZ(104), 130 * scale, 6 * scale);
  ctx.fillRect(screenX(-195), screenZ(138), 130 * scale, 6 * scale);

  // (B) 縣民大道 (新板特區綠帶大道，x: -215 ~ -65, z: 70 ~ 95)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-215), screenZ(70), 150 * scale, 25 * scale);
  ctx.fillStyle = '#15803d';
  ctx.fillRect(screenX(-215), screenZ(81), 150 * scale, 3 * scale);

  // (C) 文化路一段 (板橋主要幹道，x: -215 ~ -65, z: 155 ~ 180)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-215), screenZ(155), 150 * scale, 25 * scale);

  // 9. 斑馬線路口紋理
  ctx.fillStyle = '#ffffff';
  // 中山北路 ✕ 忠孝西路 路口斑馬線
  for (let z = -16; z <= 16; z += 4.5) {
    ctx.fillRect(screenX(55), screenZ(z), 5 * scale, 2.2 * scale);
    ctx.fillRect(screenX(96), screenZ(z), 5 * scale, 2.2 * scale);
  }
  // 館前路口斑馬線
  for (let x = -30; x <= 0; x += 4.5) {
    ctx.fillRect(screenX(x), screenZ(18), 2.2 * scale, 5 * scale);
  }
  // 板橋學府路一段路口斑馬線
  for (let z = 112; z <= 136; z += 4.5) {
    ctx.fillRect(screenX(-70), screenZ(z), 5 * scale, 2.2 * scale);
    ctx.fillRect(screenX(-190), screenZ(z), 5 * scale, 2.2 * scale);
  }

  // 10. 淡水河水面波紋 (x: -220 ~ -155, z: -120 ~ 20)
  ctx.fillStyle = '#0369a1';
  ctx.fillRect(screenX(-220), screenZ(-120), 65 * scale, 140 * scale);
  ctx.fillStyle = '#38bdf8';
  const waveOffset = (Date.now() / 300) % 12;
  for (let wy = -115; wy <= 15; wy += 14) {
    ctx.fillRect(screenX(-215 + waveOffset), screenZ(wy), 22 * scale, 1.8 * scale);
  }

  // 11. 瀝青路面科技路名直接繪製 (Road Surface Typography)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.font = `bold ${Math.max(10, scale * 0.8)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('【忠孝西路一段 ✕ 公車專用道】', screenX(0), screenZ(-1));
  ctx.fillText('【板橋學府路一段 (1:1 真實商圈)】', screenX(-130), screenZ(126));
  ctx.fillText('【縣民大道・新板特區】', screenX(-130), screenZ(84));
  ctx.fillText('【中山北路一段・林蔭大道】', screenX(88), screenZ(-30));
  ctx.fillText('【重慶南路一段・書店街】', screenX(-110), screenZ(50));
  ctx.fillText('【南京西路商圈】', screenX(20), screenZ(-93));
  ctx.fillText('【中華路一段・西門町】', screenX(-135), screenZ(40));

  // 12. 雙北行政區微縮銘板 (District HUD Badges)
  function drawDistrictBadge(text, x, z, col) {
    const bx = screenX(x);
    const bz = screenZ(z);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    drawSafeRoundRect(ctx, bx - 40 * scale * 0.35, bz - 8 * scale * 0.35, 80 * scale * 0.35, 16 * scale * 0.35, 3);
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
  drawDistrictBadge('🏫 板橋區・學府商圈', -130, 102, '#34d399');
  drawDistrictBadge('🌳 中山區・林蔭商圈', 80, -115, '#a78bfa');
  drawDistrictBadge('🏮 大同區・圓環寧夏', -110, -135, '#fbbf24');
  drawDistrictBadge('🎮 萬華區・西門商圈', -135, 25, '#f472b6');

  // ──────────────────────────────────────────
  // 第二層：連鎖品牌雷達光波與物流光纖線路 (Brand Radar Laser Network & Pulses)
  // ──────────────────────────────────────────
  if (gameState.activeBrandFilter !== 'all') {
    const matchedStores = interactables.filter(it => it.type === gameState.activeBrandFilter);
    const brandColors = {
      familymart: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.25)', glow: 'rgba(16, 185, 129, 0.6)' },
      seven: { stroke: '#ea580c', fill: 'rgba(234, 88, 12, 0.25)', glow: 'rgba(234, 88, 12, 0.6)' },
      carrefour: { stroke: '#ef4444', fill: 'rgba(59, 130, 246, 0.25)', glow: 'rgba(239, 68, 68, 0.6)' },
      pxmart: { stroke: '#0284c7', fill: 'rgba(2, 132, 199, 0.25)', glow: 'rgba(2, 132, 199, 0.6)' },
      coco: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.25)', glow: 'rgba(245, 158, 11, 0.6)' }
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

  // 將全雙北 5 大連鎖門市加入深度排序清單
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
    }
  });

  // 台北車站主體大樓 (TAIPEI MAIN STATION)
  renderList.push({
    z: -65,
    draw: () => {
      const bx = screenX(-35);
      const bz = screenZ(-90);
      ctx.fillStyle = '#334155';
      drawSafeRoundRect(ctx, bx, bz, 70 * scale, 36 * scale, 8);
      ctx.fill();
      // 傳統宮殿廡殿頂
      ctx.fillStyle = '#7c2d12';
      drawSafeRoundRect(ctx, bx - 4 * scale, bz - 6 * scale, 78 * scale, 14 * scale, 6);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.font = `bold ${Math.max(14, scale * 1.1)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🚇 台北車站 TAIPEI MAIN STATION', bx + 35 * scale, bz + 18 * scale);
    }
  });

  // 捷運出入口 M6 亭
  renderList.push({
    z: 24,
    draw: () => {
      const bx = screenX(24 - 6);
      const bz = screenZ(24 - 5);
      ctx.fillStyle = '#0284c7';
      drawSafeRoundRect(ctx, bx, bz, 12 * scale, 10 * scale, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(10, scale * 0.65)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Ⓜ️ 捷運 M6 手扶梯', bx + 6 * scale, bz + 6 * scale);
    }
  });

  // 板橋府中捷運出入口
  renderList.push({
    z: 145,
    draw: () => {
      const bx = screenX(-140 - 6);
      const bz = screenZ(145 - 5);
      ctx.fillStyle = '#0f766e';
      drawSafeRoundRect(ctx, bx, bz, 13 * scale, 10 * scale, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(9.5, scale * 0.62)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Ⓜ️ 板橋府中捷運出入口', bx + 6.5 * scale, bz + 6 * scale);
    }
  });

  // 忠孝公車專用道候車站島
  renderList.push({
    z: 2,
    draw: () => {
      const bx = screenX(-18);
      const bz = screenZ(0);
      ctx.fillStyle = '#334155';
      drawSafeRoundRect(ctx, bx, bz, 36 * scale, 4.5 * scale, 4);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${Math.max(10, scale * 0.65)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🚌 忠孝專用道候車站【307】', bx + 18 * scale, bz + 3.2 * scale);
    }
  });

  // 307 幹線公車本體
  renderList.push({
    z: bus307.z,
    draw: () => {
      const bx = screenX(bus307.x - bus307.w / 2);
      const bz = screenZ(bus307.z - bus307.d / 2);

      // 車身陰影
      ctx.beginPath();
      ctx.ellipse(bx + (bus307.w / 2) * scale, bz + (bus307.d) * scale, (bus307.w / 2) * scale, 3 * scale, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fill();

      // 低底盤綠色車身
      ctx.fillStyle = '#10b981';
      drawSafeRoundRect(ctx, bx, bz, bus307.w * scale, bus307.d * scale, 5);
      ctx.fill();

      // 白色腰線
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx, bz + 1.6 * scale, bus307.w * scale, 1.2 * scale);

      // LED 路線看板
      ctx.fillStyle = '#0f172a';
      drawSafeRoundRect(ctx, bx + 2 * scale, bz + 0.4 * scale, 14 * scale, 1.5 * scale, 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.font = `bold ${Math.max(9, scale * 0.55)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('307 幹線 ➔ 板橋 ✕ 南京東路', bx + 9 * scale, bz + 1.5 * scale);
    }
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
  // 板橋學府路一段與周邊商圈判定
  if (Math.hypot(playerPos.x - (-145), playerPos.z - 120) < 18) currentLoc = "板橋學府路一段・全家便利商店(板橋學府店)";
  else if (Math.hypot(playerPos.x - (-105), playerPos.z - 120) < 18) currentLoc = "板橋學府路一段・全家便利商店(板橋學府二店)";
  else if (Math.hypot(playerPos.x - (-75), playerPos.z - 125) < 18) currentLoc = "板橋學府路一段・7-Eleven 統一超商(學府門市)";
  else if (Math.hypot(playerPos.x - (-170), playerPos.z - 115) < 18) currentLoc = "板橋學府路一段・家樂福便利購(學府店)";
  else if (Math.hypot(playerPos.x - (-130), playerPos.z - 130) < 18) currentLoc = "板橋學府路一段・全聯福利中心(板橋學府店)";
  else if (Math.hypot(playerPos.x - (-120), playerPos.z - 120) < 18) currentLoc = "板橋學府路一段公車站牌 (307 幹線)";
  else if (Math.hypot(playerPos.x - (-140), playerPos.z - 145) < 18) currentLoc = "板橋府中商圈 ✕ 府中捷運出入口";
  else if (Math.hypot(playerPos.x - (-150), playerPos.z - 150) < 18) currentLoc = "板橋府中商圈・CoCo 都可手搖飲門市";
  else if (Math.hypot(playerPos.x - (-110), playerPos.z - (-150)) < 22) currentLoc = "重慶北路二段・家樂福 重慶旗艦店(大賣場)";
  else if (Math.hypot(playerPos.x - (-115), playerPos.z - 110) < 18) currentLoc = "重慶南路一段・家樂福超市(重慶南店)";
  else if (Math.hypot(playerPos.x - 92, playerPos.z - (-55)) < 18) currentLoc = "中山北路一段・家樂福超市(中山店)";
  else if (Math.hypot(playerPos.x - (-145), playerPos.z - (-110)) < 18) currentLoc = "延平北路二段・全聯福利中心(延平店)";
  else if (Math.hypot(playerPos.x - (-110), playerPos.z - (-180)) < 18) currentLoc = "重慶北路三段・全聯福利中心(重慶店)";
  else if (Math.hypot(playerPos.x - (-115), playerPos.z - 45) < 18) currentLoc = "重慶南路一段・全聯福利中心(中正武昌店)";
  else if (Math.hypot(playerPos.x - 92, playerPos.z - (-35)) < 18) currentLoc = "中山北路一段・CoCo都可手搖飲門市";
  else if (Math.hypot(playerPos.x - (-20), playerPos.z - 65) < 18) currentLoc = "南陽補習街・CoCo都可手搖飲門市";
  else if (Math.hypot(playerPos.x - (-115), playerPos.z - 15) < 18) currentLoc = "重慶南路書店街・CoCo都可門市";
  else if (Math.hypot(playerPos.x - 92, playerPos.z - 25) < 18) currentLoc = "中山北路一段・全家便利商店";
  else if (Math.hypot(playerPos.x - (-20), playerPos.z - 45) < 18) currentLoc = "館前路商業廊道・全家便利商店(站前店)";
  else if (Math.hypot(playerPos.x - (-105), playerPos.z - (-75)) < 18) currentLoc = "建成圓環商圈・全家便利商店";
  else if (Math.hypot(playerPos.x - (-15), playerPos.z - 28) < 18) currentLoc = "忠孝西路一段・7-Eleven 統一超商(站前店)";
  else if (Math.hypot(playerPos.x - (-115), playerPos.z - 75) < 18) currentLoc = "重慶南路一段・7-Eleven 統一超商";
  else if (Math.hypot(playerPos.x - 92, playerPos.z - (-95)) < 18) currentLoc = "中山南京路口・7-Eleven 統一超商";
  else if (Math.hypot(playerPos.x - 0, playerPos.z - 2) < 16) currentLoc = "忠孝西路中央公車專用道【台北車站(忠孝)】";
  else if (Math.hypot(playerPos.x - 24, playerPos.z - 24) < 16) currentLoc = "台北車站南側廣場 ✕ M6捷運出入口";
  else if (Math.hypot(playerPos.x - (-110), playerPos.z - (-120)) < 24) currentLoc = "建成圓環 ✕ 寧夏夜市美食小吃街";
  else if (Math.hypot(playerPos.x - 130, playerPos.z - 120) < 22) currentLoc = "北投分局・刑事偵查隊";
  else if (Math.hypot(playerPos.x - (-180), playerPos.z - (-40)) < 22) currentLoc = "淡水河水岸碼頭棧道";

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
      if ((nearest.type === 'familymart' || nearest.type === 'seven' || nearest.type === 'coco' || nearest.type === 'carrefour' || nearest.type === 'pxmart') && !hasPlayedDoorbell) {
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
    coco: 'filterCoco'
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
      text.innerText = "全家 FamilyMart 全城 FamiPort 互聯網絡已啟動！雙北 6 間門市雷達連線中！";
      showNavToast("🏪 全家 FamilyMart 連鎖網絡雷達啟動！門市光環展開！");
      playTone(587, 'triangle', 0.15);
    } else if (brand === 'seven') {
      banner.style.display = "flex";
      icon.innerText = "🍙";
      text.innerText = "7-Eleven OPENPOINT 數位雷達啟動！全雙北 6 間 24H 門市光纖互聯！";
      showNavToast("🍙 7-Eleven OPENPOINT 數位雷達啟動！");
      playTone(659, 'triangle', 0.15);
    } else if (brand === 'carrefour') {
      banner.style.display = "flex";
      icon.innerText = "🛒";
      text.innerText = "家樂福 Carrefour 全城量販物流網絡已啟動！板橋學府便利購 ✕ 重慶旗艦店跨區互聯！";
      showNavToast("🛒 家樂福 Carrefour 全城量販物流雷達啟動！");
      playTone(523, 'triangle', 0.15);
    } else if (brand === 'pxmart') {
      banner.style.display = "flex";
      icon.innerText = "🧺";
      text.innerText = "全聯 PX Mart 社區生鮮互聯網絡啟動！雙北 4 間生鮮超市供應鏈互聯！";
      showNavToast("🧺 全聯 PX Mart 社區生鮮網絡雷達啟動！");
      playTone(493, 'triangle', 0.15);
    } else if (brand === 'coco') {
      banner.style.display = "flex";
      icon.innerText = "🧋";
      text.innerText = "CoCo 都可 跨門市雲端寄杯網絡啟動！站前南陽店寄杯、中山店/府中店隨處領取！";
      showNavToast("🧋 CoCo 都可 跨店雲端寄杯雷達啟動！");
      playTone(698, 'triangle', 0.15);
    }
  }
}

function jumpToDistrict(distId) {
  document.querySelectorAll(".district-jump-btn").forEach(b => b.classList.remove("highlight"));
  if (distId === 'station') {
    camera.x = 0; camera.z = 14; camera.targetScale = 16;
    const btn = document.getElementById("btnJumpStation");
    if (btn) btn.classList.add("highlight");
    showNavToast("🏛️ 已跳轉至【台北車站(忠孝) 核心街區】！");
  } else if (distId === 'banqiao_xuefu') {
    camera.x = -135; camera.z = 120; camera.targetScale = 16;
    const btn = document.getElementById("btnJumpXuefu");
    if (btn) btn.classList.add("highlight");
    showNavToast("🏫 已跳轉至【板橋學府路一段 (1:1 真實街道還原)】！");
  } else if (distId === 'zhongshan') {
    camera.x = 80; camera.z = -35; camera.targetScale = 16;
    const btn = document.getElementById("btnJumpZhongshan");
    if (btn) btn.classList.add("highlight");
    showNavToast("🌳 已跳轉至【中山北路林蔭大道 ✕ 南京商圈】！");
  } else if (distId === 'chongqing_ximen') {
    camera.x = -115; camera.z = 50; camera.targetScale = 16;
    const btn = document.getElementById("btnJumpChongqing");
    if (btn) btn.classList.add("highlight");
    showNavToast("📚 已跳轉至【重慶南路書店街 ✕ 西門町】！");
  } else if (distId === 'circle') {
    camera.x = -105; camera.z = -80; camera.targetScale = 16;
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
