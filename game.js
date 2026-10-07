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
  weather: 'sunny',
  mosaic: false,
  nickname: "都會調查員 [你]",
  currentBubble: "🔍 巡視雙北都會街區",
  cluesFound: 0,
  hasBoba: false,
  hasTeaEgg: false,
  currentDistrict: 'zhongshan',
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
  targetScale: 19, // 正常視野比例
  currentScale: 19
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
  engineLbl.innerText = '現代 2D ✕ 2.5D 動漫都會冒險引擎 (高幀率・零白屏)';
}

/* ─── 4. 倍增大雙北完整路網與地標資料庫 ─── */
// 互動地標點位
const interactables = [
  // 1. 公車通勤站牌
  { id: 'bus_station_zx', x: 0, z: 2, r: 8.5, type: 'bus_stop', name: '台北車站(忠孝)公車專用道站牌', line: '307', dest: 'zhongshan', label: '搭乘 307 公車 (前往中山商圈 / 南京東路)' },
  { id: 'bus_station_zs', x: 70, z: -35, r: 8.5, type: 'bus_stop', name: '中山市場公車站牌 (CoCo前)', line: '307', dest: 'station', label: '搭乘 307 公車 (前往台北車站)' },
  
  // 2. 捷運站出入口手扶梯
  { id: 'mrt_escalator_m6', x: 24, z: 24, r: 7.5, type: 'mrt_escalator', name: '捷運出入口 M6 (搭手扶梯往地下月台)', label: '搭手扶梯進地下月台' },
  { id: 'mrt_escalator_zs', x: 70, z: 15, r: 7.5, type: 'mrt_escalator', name: '捷運中山站出入口 (搭手扶梯往地下月台)', label: '搭手扶梯進地下月台' },

  // 3. 實體品牌外觀門市
  { id: 'coco_zs', x: 92, z: -35, r: 8.0, type: 'coco', name: 'CoCo 都可 (中山北路門市)', label: '購買 CoCo 手搖飲料 ($50)' },
  { id: 'fmart_zs', x: 92, z: 25, r: 8.0, type: 'familymart', name: '全家便利商店 (中山北路店)', label: '進入全家便利商店 (買茶葉蛋)' },
  { id: 'fmart_station', x: -45, z: 32, r: 8.0, type: 'familymart', name: '全家便利商店 (站前館前店)', label: '進入全家便利商店' },

  // 4. 重點調查與線索地標
  { id: 'clue_flower', x: 12, z: 18, r: 6.0, type: 'clue_ground', name: '站前花圃神祕紙條', label: '翻查站前花圃神祕紙條' },
  { id: 'nightmarket', x: -110, z: -120, r: 9.0, type: 'nightmarket', name: '建成圓環 ✕ 寧夏夜市美食小吃街', label: '品嚐寧夏夜市美食 (鹽酥雞 / 章魚燒)' },
  { id: 'police_cctv', x: 130, z: 120, r: 8.5, type: 'police', name: '北投分局刑事偵查隊', label: '與林巡官調閱 CCTV 監控軌跡' },
  { id: 'ferry_tamsui', x: -160, z: -40, r: 8.5, type: 'ferry', name: '淡水河渡輪觀景棧道', label: '欣賞淡水河風景' },
  { id: 'rest_bench', x: 2, z: 26, r: 6.0, type: 'rest', name: '站前候車長椅', label: '在長椅休息恢復體力' }
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

/* ─── 6. 控制器輸入與平滑移動運算 ─── */
const keys = {};
window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === "e" || e.key === "E") triggerCurrentInteraction();
});
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

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

/**
 * 玩家雙速平滑位移運算
 */
function updateMovement() {
  if (gameState.fastForwarding) {
    updateFastForwardCutscene();
    return;
  }

  // 計算當前速度係數
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

  // 雙倍大地圖邊界限制 (-195 ~ +195, -170 ~ +170)
  playerPos.x = Math.max(-195, Math.min(195, playerPos.x));
  playerPos.z = Math.max(-170, Math.min(170, playerPos.z));

  // 動態攝影機平滑跟隨 (Smooth Lerp Camera)
  camera.x += (playerPos.x - camera.x) * 0.12;
  camera.z += (playerPos.z - camera.z) * 0.12;
  camera.currentScale += (camera.targetScale - camera.currentScale) * 0.1;

  // 更新圓形雷達小地圖指針
  updateMinimapRadar();

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
  // 第一層：地表鋪面與路網 (Ground Roads & Pavement)
  // ──────────────────────────────────────────

  // 忠孝西路 (東西向大道，寬 40m，z: -20 ~ 20)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-200), screenZ(-20), 400 * scale, 40 * scale);

  // 忠孝西路 中央公車專用道 (深藍柏油)
  ctx.fillStyle = '#1e385c';
  ctx.fillRect(screenX(-200), screenZ(-5), 400 * scale, 10 * scale);

  // 公車專用道白色虛線分道線
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(screenX(-200), screenZ(-5));
  ctx.lineTo(screenX(200), screenZ(-5));
  ctx.moveTo(screenX(-200), screenZ(5));
  ctx.lineTo(screenX(200), screenZ(5));
  ctx.stroke();
  ctx.setLineDash([]);

  // 雙黃線 (z: 0)
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(screenX(-200), screenZ(-0.4), 400 * scale, 0.8 * scale);

  // 南北兩側人行道
  ctx.fillStyle = '#475569';
  ctx.fillRect(screenX(-200), screenZ(-40), 400 * scale, 20 * scale);
  ctx.fillRect(screenX(-200), screenZ(20), 400 * scale, 20 * scale);

  // 中山北路一段 (南北向林蔭大道，寬 36m，x: 60 ~ 96)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(60), screenZ(-180), 36 * scale, 360 * scale);
  // 中山北路東側人行道 (x: 96 ~ 120)
  ctx.fillStyle = '#475569';
  ctx.fillRect(screenX(96), screenZ(-180), 24 * scale, 360 * scale);

  // 館前路 (南北向站前大道，x: -35 ~ -5, z: 20 ~ 170)
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(screenX(-35), screenZ(20), 30 * scale, 150 * scale);

  // 重慶南路 (x: -125 ~ -95, z: -180 ~ 180)
  ctx.fillRect(screenX(-125), screenZ(-180), 30 * scale, 360 * scale);

  // 斑馬線 (行人穿越道)
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

  // 淡水河水面波紋 (x: -180 ~ -140)
  ctx.fillStyle = '#0369a1';
  ctx.fillRect(screenX(-200), screenZ(-90), 55 * scale, 100 * scale);
  ctx.fillStyle = '#38bdf8';
  const waveOffset = (Date.now() / 300) % 10;
  for (let wy = -85; wy <= 0; wy += 12) {
    ctx.fillRect(screenX(-195 + waveOffset), screenZ(wy), 18 * scale, 1.5 * scale);
  }

  // ──────────────────────────────────────────
  // 第二層：地標發光圈與地板裝飾 (Pill Markers)
  // ──────────────────────────────────────────
  interactables.forEach(it => {
    const ix = screenX(it.x);
    const iz = screenZ(it.z);
    ctx.beginPath();
    ctx.arc(ix, iz, it.r * scale * 0.75, 0, Math.PI * 2);
    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  });

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
  // 將所有建築、公車、NPC 行人與玩家依照 Z 座標排序，呈現精緻遮蔽感
  const renderList = [];

  // 1. 建築物件加入渲染清單
  // CoCo 都可 (中山北路門市)
  renderList.push({
    z: -35,
    draw: () => {
      const bx = screenX(92 - 12);
      const bz = screenZ(-35 - 10);
      // 店面主體
      ctx.fillStyle = '#ffffff';
      drawSafeRoundRect(ctx, bx, bz, 24 * scale, 20 * scale, 6);
      ctx.fill();
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2;
      ctx.stroke();

      // CoCo 正宗亮橘波浪招牌
      ctx.fillStyle = '#f97316';
      drawSafeRoundRect(ctx, bx - 2, bz, 28 * scale, 5.5 * scale, 4);
      ctx.fill();

      // 圓形微笑標誌
      ctx.beginPath();
      ctx.arc(bx + 4 * scale, bz + 2.7 * scale, 2.2 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx + 4 * scale, bz + 2.7 * scale, 1.6 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#f97316';
      ctx.fill();

      // 招牌大字 "CoCo 都可"
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(12, scale * 0.85)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('CoCo 都可 (手搖飲)', bx + 8 * scale, bz + 3.8 * scale);

      // 服務點餐木質吧檯與 2 只大茶桶
      ctx.fillStyle = '#78350f';
      drawSafeRoundRect(ctx, bx + 5 * scale, bz + 12 * scale, 14 * scale, 4 * scale, 3);
      ctx.fill();
      // 不銹鋼大茶桶
      ctx.fillStyle = '#e2e8f0';
      drawSafeRoundRect(ctx, bx + 7 * scale, bz + 8.5 * scale, 2.5 * scale, 3.5 * scale, 2);
      ctx.fill();
      drawSafeRoundRect(ctx, bx + 14 * scale, bz + 8.5 * scale, 2.5 * scale, 3.5 * scale, 2);
      ctx.fill();
    }
  });

  // 全家 FamilyMart (中山店)
  renderList.push({
    z: 25,
    draw: () => {
      const bx = screenX(92 - 12);
      const bz = screenZ(25 - 10);
      ctx.fillStyle = '#f8fafc';
      drawSafeRoundRect(ctx, bx, bz, 24 * scale, 20 * scale, 6);
      ctx.fill();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 經典藍綠雙色燈箱
      ctx.fillStyle = '#009944';
      ctx.fillRect(bx, bz, 24 * scale, 3 * scale);
      ctx.fillStyle = '#0068b7';
      ctx.fillRect(bx, bz + 3 * scale, 24 * scale, 2.5 * scale);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(12, scale * 0.8)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('FamilyMart 全家 (中山店)', bx + 12 * scale, bz + 4 * scale);
    }
  });

  // 台北車站主體大樓
  renderList.push({
    z: -65,
    draw: () => {
      const bx = screenX(-35);
      const bz = screenZ(-90);
      // 車站基座
      ctx.fillStyle = '#334155';
      drawSafeRoundRect(ctx, bx, bz, 70 * scale, 36 * scale, 8);
      ctx.fill();
      // 傳統宮殿屋頂
      ctx.fillStyle = '#7c2d12';
      drawSafeRoundRect(ctx, bx - 4 * scale, bz - 6 * scale, 78 * scale, 14 * scale, 6);
      ctx.fill();

      // 站名文字與站前大鐘
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

  // 公車專用道候車站島
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
      ctx.fillText('307 幹線 ➔ 南京東路', bx + 9 * scale, bz + 1.5 * scale);
    }
  });

  // NPC 行人
  pedestrians.forEach(p => {
    // 行人步行動畫位移
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
        // 影子
        ctx.beginPath();
        ctx.ellipse(px, pz + 2, 8, 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();

        // 身體
        ctx.fillStyle = p.shirt;
        drawSafeRoundRect(ctx, px - 6, pz - 16, 12, 12, 3);
        ctx.fill();
        // 頭部
        ctx.beginPath();
        ctx.arc(px, pz - 21, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fed7aa';
        ctx.fill();
        // 褲子與腳擺動
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

      // 影子 (奔跑時拉長)
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

      // 軀幹 (深藍調查風衣)
      ctx.fillStyle = '#1d4ed8';
      drawSafeRoundRect(ctx, px - 7, pz - 18, 14, 14, 3);
      ctx.fill();

      // 雙臂與雙腿動畫
      ctx.fillStyle = '#1e293b';
      const legSwing = Math.sin(playerPos.walkCycle) * (gameState.isRunning ? 5 : 3);
      ctx.fillRect(px - 5, pz - 4, 3.5, 6 + legSwing);
      ctx.fillRect(px + 1.5, pz - 4, 3.5, 6 - legSwing);

      // 頸部與頭部
      ctx.beginPath();
      ctx.arc(px, pz - 24, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#fed7aa';
      ctx.fill();

      // 調查員鴨舌帽
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

  // 依據 Z 軸進行排序並繪製
  renderList.sort((a, b) => a.z - b.z);
  renderList.forEach(item => item.draw());

  // ──────────────────────────────────────────
  // 第四層：頂層高架橋與動態光影遮罩 (Overhead Viaduct & Lighting)
  // ──────────────────────────────────────────
  // 市民大道空中高架橋 (z: -120，懸浮於所有街道上方)
  const bridgeZ = screenZ(-120);
  ctx.fillStyle = '#475569';
  ctx.fillRect(screenX(-200), bridgeZ - 10 * scale, 400 * scale, 18 * scale);
  // 高架橋金屬護欄與標線
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(screenX(-200), bridgeZ - 10 * scale, 400 * scale, 1.5 * scale);
  ctx.fillRect(screenX(-200), bridgeZ + 8 * scale, 400 * scale, 1.5 * scale);
  // 高架橋在地面投射之立體陰影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.fillRect(screenX(-200), bridgeZ + 8 * scale, 400 * scale, 12 * scale);

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
  if (Math.hypot(playerPos.x - 92, playerPos.z - (-35)) < 18) currentLoc = "中山北路一段・CoCo都可手搖飲門市";
  else if (Math.hypot(playerPos.x - 92, playerPos.z - 25) < 18) currentLoc = "中山北路一段・全家便利商店";
  else if (Math.hypot(playerPos.x - 0, playerPos.z - 2) < 16) currentLoc = "忠孝西路中央公車專用道【台北車站(忠孝)】";
  else if (Math.hypot(playerPos.x - 24, playerPos.z - 24) < 16) currentLoc = "台北車站南側廣場 ✕ M6捷運出入口";
  else if (Math.hypot(playerPos.x - (-45), playerPos.z - 32) < 18) currentLoc = "館前路商業廊道・站前全家超商";
  else if (Math.hypot(playerPos.x - (-110), playerPos.z - (-120)) < 24) currentLoc = "建成圓環 ✕ 寧夏夜市美食小吃街";
  else if (Math.hypot(playerPos.x - 130, playerPos.z - 120) < 22) currentLoc = "北投分局・刑事偵查隊";
  else if (Math.hypot(playerPos.x - (-160), playerPos.z - (-40)) < 22) currentLoc = "淡水河水岸碼頭棧道";

  if (gameState.currentLocationName !== currentLoc) {
    gameState.currentLocationName = currentLoc;
    if (locationText) locationText.innerText = currentLoc;
  }

  // 體力警告
  const warnBanner = document.getElementById("staminaWarningBanner");
  if (warnBanner) warnBanner.style.display = gameState.stamina <= 18 ? "flex" : "none";

  // 實體互動範圍
  let nearest = null;
  let minD = 999;

  for (const item of interactables) {
    const dist = Math.hypot(playerPos.x - item.x, playerPos.z - item.z);
    if (dist < item.r && dist < minD) {
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
      if (nearest.type === 'familymart' && !hasPlayedDoorbell) {
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
    addActionPill(`🚌 搭乘 307 公車`, "E", () => boardTaipeiBus('307', item.dest));
  } else if (item.type === "mrt_escalator") {
    addActionPill("🚇 搭手扶梯進地下月台", "E", () => openMrtStationModal());
  } else if (item.type === "coco") {
    addActionPill("🧋 購買 CoCo 手搖飲", "E", () => openCocoModal());
  } else if (item.type === "familymart") {
    addActionPill("🏪 進入全家便利商店", "E", () => openStoreModal());
    addActionPill("🥚 購買熱茶葉蛋 ($13)", "🥚", () => buyTeaEgg());
    addActionPill("🛹 購買極速滑板 ($300)", "🛹", () => buySkateboard());
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

  if (type === "bus_stop") {
    const it = interactables.find(i => i.type === 'bus_stop' && Math.hypot(playerPos.x - i.x, playerPos.z - i.z) < i.r);
    boardTaipeiBus('307', it ? it.dest : 'zhongshan');
  } else if (type === "mrt_escalator") {
    openMrtStationModal();
  } else if (type === "coco") openCocoModal();
  else if (type === "familymart") openStoreModal();
  else if (type === "police") openCctvModal();
  else if (type === "nightmarket") openNightMarketModal();
  else if (type === "ferry") openFerryModal();
  else if (type === "rest") openRestModal();
  else if (type === "clue_ground") guideToClue();
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

function openCocoModal() { document.getElementById("cocoModal").style.display = "flex"; }
function openStoreModal() { document.getElementById("storeModal").style.display = "flex"; }
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
