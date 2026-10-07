/**
 * ==========================================================================
 * 《雙北漫遊偵探：都會行蹤》✕《城市脈動：通勤偵探》
 * 雙核心引擎 (Three.js 3D ✕ 2.5D Canvas 萬能高相容模式)
 * 專屬私服器 (WebSocket) 多人同屏同步 ✕ 自由捷運地圖探索系統
 * ==========================================================================
 */

// 全域 Canvas 圓角安全輔助函式
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

/* ─── 2. 遊戲全局狀態 ─── */
const gameState = {
  money: 200,
  stamina: 78,
  mood: 85,
  hasSkateboard: false,
  speed: 0.2,
  weather: 'sunny',
  mosaic: false,
  nickname: "小偵探 [你]",
  currentBubble: "🔍 巡視街頭",
  cluesFound: 0,
  hasBoba: false,
  hasTeaEgg: false,
  currentDistrict: 'zhongshan',
  currentLocationName: "中山商圈・街頭",
  quests: {
    coco: false,
    store: false,
    clues: false,
    tib: false,
    arrest: false
  },
  activeInteractTarget: null
};

/* ─── 3. 雙引擎架構偵測 (Three.js 3D ✕ 2.5D Canvas 萬能相容模式) ─── */
let activeEngine = '2.5d'; // 預設使用萬能 2.5D 相容引擎，若 3D 支援良好則升級 3D
const container = document.getElementById("webgl-container");

let scene, camera, renderer, sunLight;
let canvas2D, ctx2D;

function isWebGLSupported() {
  try {
    const testCanvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

// 嘗試啟動 3D 引擎
let threeSuccess = false;
if (typeof THREE !== 'undefined' && isWebGLSupported()) {
  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.012);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 12, 24);
    camera.lookAt(0, 1.8, 5);

    renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "default",
      failIfMajorPerformanceCaveat: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xfffaed, 0.95);
    sunLight.position.set(40, 70, 30);
    sunLight.castShadow = true;
    scene.add(sunLight);

    threeSuccess = true;
    activeEngine = '3d';
  } catch (err) {
    console.warn("WebGL 初始化受限，自動平滑切換至 2.5D 高相容模式：", err);
    threeSuccess = false;
  }
}

if (!threeSuccess) {
  // 啟動 2.5D Canvas 高相容模式
  activeEngine = '2.5d';
  container.innerHTML = '';
  canvas2D = document.createElement('canvas');
  canvas2D.width = window.innerWidth;
  canvas2D.height = window.innerHeight;
  container.appendChild(canvas2D);
  ctx2D = canvas2D.getContext('2d');
}

const engineLbl = document.getElementById("renderEngineLabel");
if (engineLbl) {
  engineLbl.innerText = activeEngine === '3d' ? '3D WebGL 硬體加速模式' : '2.5D Canvas 萬能相容模式 (零死機)';
}

/* ─── 4. 世界地圖與實體互動地標 ─── */
const interactables = [
  // 1. 中山商圈
  { id: 'coco', x: 0, z: 18, r: 4.8, type: 'coco', district: 'zhongshan', label: '購買 CoCo 手搖飲料 ($50)' },
  { id: 'fmart_zs', x: -28, z: 18, r: 5.0, type: 'familymart', district: 'zhongshan', label: '進入全家中山店 (買茶葉蛋)' },
  // 2. 台北車站
  { id: 'station', x: 28, z: 20, r: 5.5, type: 'station', district: 'taipei_main', label: '調查台北車站四鐵大廳' },
  { id: 'fmart_station', x: 38, z: 14, r: 5.0, type: 'familymart', district: 'taipei_main', label: '進入站前全家超商' },
  { id: 'clue_ground', x: 18, z: 12, r: 3.8, type: 'clue_ground', district: 'taipei_main', label: '翻查站前花圃神祕紙條' },
  // 3. 雙連與大同夜市
  { id: 'nightmarket', x: -56, z: 16, r: 5.0, type: 'nightmarket', district: 'datong', label: '品嚐寧夏夜市美食 (鹽酥雞 / 章魚燒)' },
  { id: 'fmart_nm', x: -44, z: 18, r: 5.0, type: 'familymart', district: 'datong', label: '進入夜市圓環全家超商' },
  // 4. 淡水渡船頭
  { id: 'ferry', x: -72, z: -16, r: 5.5, type: 'ferry', district: 'tamsui', label: '搭乘淡水河渡輪 (前往八里)' },
  // 5. 信義區
  { id: 'alley', x: 16, z: -18, r: 4.8, type: 'alley', district: 'xinyi', label: '與信義巷弄阿嬤泡茶聊天' },
  { id: 'fireworks', x: 42, z: -20, r: 5.5, type: 'fireworks', district: 'xinyi', label: '觀賞台北 101 煙火夜景' },
  // 6. 北投公園與分局
  { id: 'rest_bench', x: 62, z: -14, r: 4.5, type: 'rest', district: 'beitou', label: '在北投公園涼亭長椅休息' },
  { id: 'police_cctv', x: 52, z: 12, r: 5.2, type: 'police', district: 'beitou', label: '與北投分局林巡官調閱 CCTV' }
];

/* ─── 5. 3D 模式場景建置 (若 3D 成功啟動) ─── */
let localPlayer3D = null;
if (activeEngine === '3d') {
  // 道路與人行道
  const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(200, 20), new THREE.MeshLambertMaterial({ color: 0x242830 }));
  roadMesh.rotation.x = -Math.PI / 2;
  scene.add(roadMesh);

  const northWalk = new THREE.Mesh(new THREE.PlaneGeometry(200, 25), new THREE.MeshLambertMaterial({ color: 0xc8cdd4 }));
  northWalk.rotation.x = -Math.PI / 2;
  northWalk.position.set(0, 0.05, 22.5);
  scene.add(northWalk);

  const southWalk = new THREE.Mesh(new THREE.PlaneGeometry(200, 25), new THREE.MeshLambertMaterial({ color: 0xc8cdd4 }));
  southWalk.rotation.x = -Math.PI / 2;
  southWalk.position.set(0, 0.05, -22.5);
  scene.add(southWalk);

  // 建築生成函式
  function add3DBuilding(x, z, w, h, d, col, signCol) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: col }));
    b.position.set(x, h / 2, z);
    scene.add(b);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 1.8, 0.4), new THREE.MeshLambertMaterial({ color: signCol }));
    sign.position.set(x, h * 0.7, z > 0 ? z - d / 2 - 0.2 : z + d / 2 + 0.2);
    scene.add(sign);
  }
  add3DBuilding(0, 18, 14, 8, 10, 0xf97316, 0xf97316);   // CoCo
  add3DBuilding(-28, 18, 16, 9, 12, 0xf8fafc, 0x10b981); // FamilyMart
  add3DBuilding(28, 20, 24, 13, 14, 0x475569, 0x38bdf8); // 台北車站

  // 地面感應發光圓環
  interactables.forEach(item => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.0, 32),
      new THREE.MeshBasicMaterial({ color: 0x00d2ff, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(item.x, 0.08, item.z);
    scene.add(ring);
  });

  // 主角 3D 模型
  localPlayer3D = createDetectiveCharacter3D(true, gameState.nickname);
  localPlayer3D.group.position.set(0, 0, 5);
  scene.add(localPlayer3D.group);
}

function createDetectiveCharacter3D(isLocal = true, name = "小偵探") {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.7), new THREE.MeshLambertMaterial({ color: isLocal ? 0xb45309 : 0x1d4ed8 }));
  body.position.y = 1.4;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshLambertMaterial({ color: 0xfed7aa }));
  head.position.y = 2.4;
  group.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.28, 16), new THREE.MeshLambertMaterial({ color: 0x78350f }));
  hat.position.y = 2.65;
  group.add(hat);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), legMat);
  leftLeg.position.set(-0.25, 0.4, 0);
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), legMat);
  rightLeg.position.set(0.25, 0.4, 0);
  group.add(rightLeg);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 2.2), new THREE.MeshLambertMaterial({ color: 0xef4444 }));
  board.position.set(0, 0.06, 0);
  board.visible = false;
  group.add(board);

  return { group, leftLeg, rightLeg, board };
}

/* ─── 6. 2.5D Canvas 高相容渲染器 ─── */
const playerPos = { x: 0, z: 5, rot: 0 };
let walkCycle = 0;

function render2DScene() {
  if (!ctx2D) return;
  const w = canvas2D.width;
  const h = canvas2D.height;

  // 視角中心跟隨玩家
  const cx = w / 2;
  const cy = h / 2;
  const scale = Math.max(14, Math.min(22, w / 60)); // 動態視距

  // 1. 背景沉浸城市夜幕
  ctx2D.fillStyle = gameState.weather === 'sunny' ? '#0f1f38' : (gameState.weather === 'sunset' ? '#2e1c2b' : '#070d18');
  ctx2D.fillRect(0, 0, w, h);

  ctx2D.save();
  ctx2D.translate(cx, cy);

  // 2. 街道與人行道
  const screenX = (val) => (val - playerPos.x) * scale;
  const screenZ = (val) => (val - playerPos.z) * scale;

  // 北側人行道
  ctx2D.fillStyle = '#475569';
  ctx2D.fillRect(screenX(-100), screenZ(10), 200 * scale, 25 * scale);

  // 柏油馬路
  ctx2D.fillStyle = '#1e293b';
  ctx2D.fillRect(screenX(-100), screenZ(-10), 200 * scale, 20 * scale);

  // 南側人行道
  ctx2D.fillStyle = '#334155';
  ctx2D.fillRect(screenX(-100), screenZ(-35), 200 * scale, 25 * scale);

  // 斑馬線
  ctx2D.fillStyle = '#ffffff';
  for (let i = -10; i <= 10; i += 3) {
    ctx2D.fillRect(screenX(i), screenZ(-8), 1.5 * scale, 16 * scale);
  }

  // 3. 實體建築與招牌
  const buildings2D = [
    { x: 0, z: 18, w: 14, d: 8, col: '#ea580c', name: '🧋 CoCo 都可手搖飲' },
    { x: -28, z: 18, w: 16, d: 9, col: '#059669', name: '🏪 全家 FamilyMart (中山店)' },
    { x: 28, z: 20, w: 22, d: 11, col: '#0284c7', name: '🚇 台北車站四鐵大廳' },
    { x: 38, z: 14, w: 12, d: 7, col: '#10b981', name: '🏪 站前全家超商' },
    { x: -56, z: 16, w: 16, d: 8, col: '#b91c1c', name: '🏮 寧夏夜市美食小吃街' },
    { x: -44, z: 18, w: 12, d: 7, col: '#059669', name: '🏪 圓環全家超商' },
    { x: -72, z: -18, w: 18, d: 10, col: '#0369a1', name: '🚢 淡水河碼頭渡輪' },
    { x: 16, z: -18, w: 12, d: 8, col: '#b45309', name: '👵 信義鄰里阿嬤泡茶桌' },
    { x: 42, z: -20, w: 16, d: 9, col: '#38bdf8', name: '❇️ 101 觀景台' },
    { x: 52, z: 12, w: 16, d: 8, col: '#1e3a8a', name: '🚓 北投分局偵查隊' }
  ];

  buildings2D.forEach(b => {
    const bx = screenX(b.x - b.w / 2);
    const bz = screenZ(b.z - b.d / 2);
    ctx2D.fillStyle = b.col;
    drawSafeRoundRect(ctx2D, bx, bz, b.w * scale, b.d * scale, 8);
    ctx2D.fill();
    ctx2D.strokeStyle = '#38bdf8';
    ctx2D.lineWidth = 2;
    ctx2D.stroke();

    ctx2D.fillStyle = '#ffffff';
    ctx2D.font = `bold ${Math.max(11, scale * 0.7)}px sans-serif`;
    ctx2D.textAlign = 'center';
    ctx2D.fillText(b.name, bx + (b.w * scale) / 2, bz + (b.d * scale) / 2 + 5);
  });

  // 4. 地面發光感應圓環
  interactables.forEach(item => {
    const ix = screenX(item.x);
    const iz = screenZ(item.z);
    ctx2D.beginPath();
    ctx2D.arc(ix, iz, item.r * scale * 0.8, 0, Math.PI * 2);
    ctx2D.strokeStyle = '#00d2ff';
    ctx2D.lineWidth = 2.5;
    ctx2D.setLineDash([6, 6]);
    ctx2D.stroke();
    ctx2D.setLineDash([]);
  });

  // 5. 繪製小偵探主角
  const px = screenX(playerPos.x);
  const pz = screenZ(playerPos.z);

  // 影子
  ctx2D.beginPath();
  ctx2D.ellipse(px, pz + 4, 14, 7, 0, 0, Math.PI * 2);
  ctx2D.fillStyle = 'rgba(0,0,0,0.45)';
  ctx2D.fill();

  // 滑板
  if (gameState.hasSkateboard) {
    ctx2D.fillStyle = '#ef4444';
    drawSafeRoundRect(ctx2D, px - 12, pz + 2, 24, 7, 3);
    ctx2D.fill();
  }

  // 身體 (少年偵探棕色風衣與背包)
  ctx2D.fillStyle = '#b45309';
  drawSafeRoundRect(ctx2D, px - 9, pz - 24, 18, 20, 4);
  ctx2D.fill();

  // 頭部與偵探帽
  ctx2D.beginPath();
  ctx2D.arc(px, pz - 30, 9, 0, Math.PI * 2);
  ctx2D.fillStyle = '#fed7aa';
  ctx2D.fill();

  ctx2D.fillStyle = '#78350f';
  drawSafeRoundRect(ctx2D, px - 11, pz - 39, 22, 9, 4);
  ctx2D.fill();

  // 頭頂對話氣泡
  ctx2D.fillStyle = 'rgba(10, 25, 50, 0.9)';
  drawSafeRoundRect(ctx2D, px - 55, pz - 68, 110, 22, 6);
  ctx2D.fill();
  ctx2D.strokeStyle = '#00d2ff';
  ctx2D.lineWidth = 1.5;
  ctx2D.stroke();

  ctx2D.fillStyle = '#ffffff';
  ctx2D.font = 'bold 11px sans-serif';
  ctx2D.textAlign = 'center';
  ctx2D.fillText(gameState.currentBubble, px, pz - 53);

  // 其他遠端同儕小偵探
  remotePlayers.forEach(rp => {
    const rx = screenX(rp.x);
    const rz = screenZ(rp.z);
    ctx2D.fillStyle = '#1d4ed8';
    drawSafeRoundRect(ctx2D, rx - 9, rz - 24, 18, 20, 4);
    ctx2D.fill();
    ctx2D.beginPath();
    ctx2D.arc(rx, rz - 30, 9, 0, Math.PI * 2);
    ctx2D.fillStyle = '#fed7aa';
    ctx2D.fill();
    ctx2D.fillStyle = 'rgba(10, 25, 50, 0.85)';
    drawSafeRoundRect(ctx2D, rx - 45, rz - 62, 90, 18, 5);
    ctx2D.fill();
    ctx2D.fillStyle = '#34d399';
    ctx2D.font = 'bold 10px sans-serif';
    ctx2D.fillText(rp.nickname, rx, rz - 49);
  });

  ctx2D.restore();
}

/* ─── 7. 控制器與移動運算 ─── */
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

function updateMovement() {
  let spd = gameState.hasSkateboard ? gameState.speed * 1.6 : gameState.speed;
  if (gameState.stamina < 15) spd *= 0.55;

  let moveX = 0;
  let moveZ = 0;
  if (keys["w"] || keys["arrowup"]) moveZ -= 1;
  if (keys["s"] || keys["arrowdown"]) moveZ += 1;
  if (keys["a"] || keys["arrowleft"]) moveX -= 1;
  if (keys["d"] || keys["arrowright"]) moveX += 1;

  if (moveX !== 0 || moveZ !== 0) {
    const angle = Math.atan2(moveX, moveZ);
    playerPos.x += Math.sin(angle) * spd;
    playerPos.z += Math.cos(angle) * spd;
    playerPos.rot = angle;

    walkCycle += 0.22;
    if (Math.floor(walkCycle) % 8 === 0) {
      playTone(200, 'square', 0.03, 0.02);
      if (Math.random() < 0.2) {
        gameState.stamina = Math.max(8, gameState.stamina - 0.4);
        updateBars();
      }
    }
  }

  // 邊界保護
  playerPos.x = Math.max(-85, Math.min(85, playerPos.x));
  playerPos.z = Math.max(-30, Math.min(30, playerPos.z));

  // 同步給 3D 主角
  if (activeEngine === '3d' && localPlayer3D) {
    const p = localPlayer3D.group;
    p.position.x = playerPos.x;
    p.position.z = playerPos.z;
    p.rotation.y = playerPos.rot;
    camera.position.set(p.position.x, 12, p.position.z + 18);
    camera.lookAt(p.position.x, 1.8, p.position.z);
  }

  checkProximityAndLocation();
}

/* ─── 8. 實體步行距離偵測、右側選單與捷運探索 ─── */
const interactPrompt = document.getElementById("interactPrompt");
const interactLabel = document.getElementById("interactLabel");
const actionPillsStack = document.getElementById("actionPillsStack");
const locationText = document.getElementById("locationText");
let lastNearestId = null;
let hasPlayedDoorbell = false;

function checkProximityAndLocation() {
  // 1. 動態地點判定
  let currentLoc = "中山商圈・街頭";
  if (Math.hypot(playerPos.x - 0, playerPos.z - 18) < 14) currentLoc = "中山區・CoCo手搖飲";
  else if (Math.hypot(playerPos.x - (-28), playerPos.z - 18) < 14) currentLoc = "中山區・全家中山店";
  else if (Math.hypot(playerPos.x - 28, playerPos.z - 20) < 16) currentLoc = "台北車站・站前大廳";
  else if (Math.hypot(playerPos.x - (-56), playerPos.z - 16) < 16) currentLoc = "雙連站・寧夏夜市";
  else if (Math.hypot(playerPos.x - (-72), playerPos.z - (-18)) < 16) currentLoc = "淡水渡船頭・老街";
  else if (Math.hypot(playerPos.x - 16, playerPos.z - (-18)) < 16) currentLoc = "信義區・鄰里巷弄";
  else if (Math.hypot(playerPos.x - 52, playerPos.z - 12) < 16) currentLoc = "北投分局・偵查隊";

  if (gameState.currentLocationName !== currentLoc) {
    gameState.currentLocationName = currentLoc;
    if (locationText) locationText.innerText = currentLoc;
  }

  // 2. 體力警報
  const warnBanner = document.getElementById("staminaWarningBanner");
  if (warnBanner) warnBanner.style.display = gameState.stamina <= 18 ? "flex" : "none";

  // 3. 實體互動距離判斷
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
      updateActionPills(nearest.type);
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

function updateActionPills(type) {
  actionPillsStack.innerHTML = "";
  if (type === "coco") {
    addActionPill("🧋 購買飲料", "E", () => openCocoModal());
  } else if (type === "familymart") {
    addActionPill("🏪 進入全家便利商店", "E", () => openStoreModal());
    addActionPill("🥚 購買茶葉蛋 ($13)", "🥚", () => buyTeaEgg());
    addActionPill("🛹 購買柯南滑板 ($300)", "🛹", () => buySkateboard());
  } else if (type === "ferry") {
    addActionPill("🚢 欣賞淡水河風景", "E", () => openFerryModal());
    addActionPill("📷 拍照留念", "📸", () => takeScenicPhoto());
  } else if (type === "alley") {
    addActionPill("👵 與阿嬤泡茶聊天", "E", () => openAlleyModal());
  } else if (type === "police") {
    addActionPill("📹 查看北投分局 CCTV", "E", () => openCctvModal());
    addActionPill("🚓 進行筆錄對質逮捕", "🚨", () => openInterrogateModal());
  } else if (type === "station") {
    addActionPill("📜 翻查花圃紙條", "E", () => guideToClue());
  } else if (type === "nightmarket") {
    addActionPill("🏮 品嚐夜市美食", "E", () => openNightMarketModal());
  } else if (type === "rest") {
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

function showNavToast(text) {
  const toast = document.getElementById("navHintToast");
  const txt = document.getElementById("navHintText");
  if (!toast || !txt) return;
  txt.innerText = text;
  toast.style.display = "flex";
  playTone(480, 'sine', 0.12);
  setTimeout(() => toast.style.display = "none", 4000);
}

function showDetectiveDialogue(text, speaker = "偵探新手") {
  const box = document.getElementById("detectiveDialogueBox");
  document.getElementById("diagSpeaker").innerText = speaker;
  document.getElementById("diagText").innerText = text;
  box.style.display = "flex";
}
function closeDialogueBox() {
  document.getElementById("detectiveDialogueBox").style.display = "none";
}

/* ─── 9. 雙北捷運搭乘探索系統 (透過地圖自由探尋) ─── */
function travelToDistrict(districtId) {
  if (gameState.money < 20) {
    alert("悠遊卡餘額不足 $20！請先解任務賺取生活金！");
    return;
  }
  gameState.money -= 20;
  playMrtChime();

  const districtCoords = {
    zhongshan: { x: 0, z: 12, name: '中山商圈' },
    taipei_main: { x: 28, z: 14, name: '台北車站' },
    datong: { x: -50, z: 14, name: '雙連・寧夏夜市' },
    tamsui: { x: -68, z: -12, name: '淡水渡船頭' },
    xinyi: { x: 18, z: -14, name: '信義區鄰里' },
    beitou: { x: 54, z: 8, name: '北投公園與分局' }
  };

  const target = districtCoords[districtId] || districtCoords.zhongshan;
  playerPos.x = target.x;
  playerPos.z = target.z;
  gameState.currentDistrict = districtId;

  closeModal('mapModal');
  updateBars();
  showNavToast(`🚇 嗶！悠遊卡扣款 $20。已抵達【${target.name}】！請親自探索街區！`);
}

function triggerCurrentInteraction() {
  const type = gameState.activeInteractTarget;
  if (!type) return;
  playTone(550, 'triangle', 0.1);
  if (type === "coco") openCocoModal();
  else if (type === "familymart") openStoreModal();
  else if (type === "ferry") openFerryModal();
  else if (type === "alley") openAlleyModal();
  else if (type === "police") openCctvModal();
  else if (type === "nightmarket") openNightMarketModal();
  else if (type === "rest") openRestModal();
  else if (type === "clue_ground" || type === "station") guideToClue();
}

function guideToClue() {
  alert("📜 拾獲站前花圃紙條！上頭寫著：『14:38 北車閘門碰面』！列入線索簿！");
  gameState.cluesFound = Math.min(3, gameState.cluesFound + 1);
  gameState.quests.clues = true;
  updateQuestProgress();
}

/* ─── 10. 消費、劇情分支與對質破案 ─── */
function buyBobaTea() {
  if (gameState.money < 50) return alert("悠遊卡餘額不足 $50 囉！");
  gameState.money -= 50;
  gameState.stamina = Math.min(100, gameState.stamina + 35);
  gameState.mood = Math.min(100, gameState.mood + 30);
  gameState.hasBoba = true;
  updateBars();
  playTone(650, 'sine', 0.12);
  alert("🧋 咕嚕嚕～珍珠奶茶口感超Q彈！體力 +35，心情 +30！");
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
  alert("🍋 四季春青茶清爽回甘，體力 +20！");
  closeModal('cocoModal');
}

function buyTeaEgg() {
  if (gameState.money < 13) return alert("悠遊卡餘額不足 $13 囉！");
  gameState.money -= 13;
  gameState.stamina = Math.min(100, gameState.stamina + 25);
  gameState.hasTeaEgg = true;
  updateBars();
  playTone(650, 'sine', 0.1);
  alert("🥚 熱騰騰茶葉蛋好吃！體力 +25！響應六年級減塑守則不索取多餘塑膠袋！");
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
  if (gameState.money < 300) return alert("生活金不足 $300！快破案賺取賞金吧！");
  gameState.money -= 300;
  gameState.hasSkateboard = true;
  if (activeEngine === '3d' && localPlayer3D) localPlayer3D.board.visible = true;
  const btn = document.getElementById("btnSkateboard");
  if (btn) { btn.innerText = "已裝備"; btn.disabled = true; }
  playTone(850, 'triangle', 0.15);
  alert("🛹 裝備柯南電動滑板！移動速度提升 60%！");
  closeModal('storeModal');
}

function buySnack(type, price) {
  if (gameState.money < price) return alert(`餘額不足 $${price}！`);
  gameState.money -= price;
  gameState.stamina = 100;
  gameState.mood = 100;
  updateBars();
  playTone(800, 'sine', 0.15);
  alert(type === 'chicken' ? "🍗 經典鹽酥雞九層塔香氣爆棚！體力心情全滿！" : "🐙 濃純日式章魚燒精神百倍！");
  closeModal('nightMarketModal');
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

function dialogueOption(opt) {
  closeModal('alleyModal');
  if (opt === 'gossip_1') showDetectiveDialogue("哇～原來是這樣！鄰居的八卦果然不能小看……說不定跟案件有關！");
  else if (opt === 'gossip_2') showDetectiveDialogue("阿嬤：「他提著黑色背包往北投方向跑了，神色很慌張呢！」");
  else showDetectiveDialogue("謝謝阿嬤！我馬上前往北投分局調閱 CCTV 監視器！");
}

function enjoyFireworks() {
  gameState.mood = 100;
  updateBars();
  playTone(900, 'sine', 0.2);
  alert("🎆 台北 101 高空萬千花火璀璨綻放！心情值全滿！");
  closeModal('fireworksModal');
}

function restAndRecover() {
  gameState.stamina = Math.min(100, gameState.stamina + 50);
  updateBars();
  playTone(520, 'sine', 0.15);
  alert("🛏️ 在涼亭長椅深呼吸休息了片刻，體力恢復 +50！");
  closeModal('restModal');
}

function drinkWater() {
  gameState.stamina = Math.min(100, gameState.stamina + 25);
  updateBars();
  playTone(600, 'sine', 0.1);
  alert("☕ 喝了隨身保溫瓶溫水，體力恢復 +25！");
  closeModal('restModal');
}

function confrontSuspect(choice) {
  closeModal('interrogateModal');
  if (choice === 'easycard') {
    playSlapSound();
    alert("💥【筆錄打臉成功！】\n出示 TIB 悠遊卡數據：嫌犯於 14:38 在台北車站出站扣款 $30！\n黑帽男子臉色慘白：「我…我認罪！公事包我藏在月台後方了！」");

    gameState.quests.arrest = true;
    updateQuestProgress();

    if (isOnlineWithServer && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'case_solved', title: '台北車站失竊案' }));
    } else {
      showBreakingNews(`${gameState.nickname} 率先破獲了【台北車站失竊案】！`);
      playVictoryFanfare();
    }
    openVictoryModal();
  } else {
    playBuzzer();
    alert("❌ 呈堂物證不符！茶葉蛋發票無法反駁嫌犯的不在場證明！請出示交通電子票證紀錄！");
  }
}

function updateQuestProgress() {
  const stCoCo = document.getElementById("stCoCo");
  const stStore = document.getElementById("stStore");
  const stClue = document.getElementById("stClue");
  const stArrest = document.getElementById("stArrest");

  if (gameState.quests.coco && stCoCo) { stCoCo.innerText = "已完成 ✅"; stCoCo.style.color = "#10b981"; }
  if (gameState.quests.clues && stClue) { stClue.innerText = "已完成 ✅"; stClue.style.color = "#10b981"; }
  if (gameState.quests.arrest && stArrest) { stArrest.innerText = "已破案 🏆"; stArrest.style.color = "#10b981"; }

  const invMoney = document.getElementById("invMoney");
  if (invMoney) invMoney.innerText = gameState.money;
  const mapMoney = document.getElementById("mapMoney");
  if (mapMoney) mapMoney.innerText = gameState.money;

  const descBoba = document.getElementById("descBoba");
  if (descBoba && gameState.hasBoba) {
    descBoba.innerText = "持有中";
    document.getElementById("slotBoba").classList.add("active");
  }
  const descTeaEgg = document.getElementById("descTeaEgg");
  if (descTeaEgg && gameState.hasTeaEgg) {
    descTeaEgg.innerText = "持有中";
    document.getElementById("slotTeaEgg").classList.add("active");
  }
  const descSkateboard = document.getElementById("descSkateboard");
  if (descSkateboard && gameState.hasSkateboard) {
    descSkateboard.innerText = "已裝備";
    document.getElementById("slotSkateboard").classList.add("active");
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

/* ─── 11. 天氣時段切換 ─── */
function toggleWeather() {
  const icon = document.getElementById("weatherIcon");
  const text = document.getElementById("weatherTimeText");

  if (gameState.weather === 'sunny') {
    gameState.weather = 'sunset';
    icon.innerText = "🌇";
    text.innerText = "下午 16:32";
  } else if (gameState.weather === 'sunset') {
    gameState.weather = 'night';
    icon.innerText = "🌙";
    text.innerText = "晴天 20:36";
  } else {
    gameState.weather = 'sunny';
    icon.innerText = "☀️";
    text.innerText = "晴天 10:24";
  }
  playTone(500, 'sine', 0.05);
}

function toggleMosaic() {
  gameState.mosaic = !gameState.mosaic;
  const box = document.getElementById("webgl-container");
  const btn = document.getElementById("btnMosaic");
  if (gameState.mosaic) {
    box.classList.add("mosaic-mode");
    if (btn) btn.innerText = "👁️ 防嚇馬賽克保護：開";
  } else {
    box.classList.remove("mosaic-mode");
    if (btn) btn.innerText = "👁️ 防嚇馬賽克保護：關";
  }
  playTone(600, 'sine', 0.05);
}

function toggleMainQuestCard() {
  const c = document.getElementById("mainQuestCard");
  c.style.display = (c.style.display === "none") ? "block" : "none";
}
function toggleHintQuestCard() {
  const c = document.getElementById("hintQuestCard");
  c.style.display = (c.style.display === "none") ? "block" : "none";
}

/* ─── 12. 彈窗控制器 ─── */
function openCocoModal() { document.getElementById("cocoModal").style.display = "flex"; }
function openStoreModal() { document.getElementById("storeModal").style.display = "flex"; }
function openFerryModal() { document.getElementById("ferryModal").style.display = "flex"; }
function openAlleyModal() { document.getElementById("alleyModal").style.display = "flex"; }
function openFireworksModal() { document.getElementById("fireworksModal").style.display = "flex"; }
function openRestModal() { document.getElementById("restModal").style.display = "flex"; }
function openCctvModal() { document.getElementById("cctvModal").style.display = "flex"; }
function openNightMarketModal() { document.getElementById("nightMarketModal").style.display = "flex"; }
function openInterrogateModal() { document.getElementById("interrogateModal").style.display = "flex"; }
function openVictoryModal() { document.getElementById("victoryModal").style.display = "flex"; }
function openInventoryModal() { updateQuestProgress(); document.getElementById("inventoryModal").style.display = "flex"; }
function openQuestsModal() { updateQuestProgress(); document.getElementById("questsModal").style.display = "flex"; }
function openMapModal() {
  updateQuestProgress();
  document.getElementById("mapModal").style.display = "flex";
}
function openSettingsModal() { document.getElementById("settingsModal").style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }

/* ─── 13. WebSocket 私服器連線 ─── */
let socket = null;
const remotePlayers = new Map();
let isOnlineWithServer = false;

function initPrivateServerConnection() {
  if (location.protocol === "https:") {
    spawnSimulatedClassmates();
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
    socket.onclose = () => spawnSimulatedClassmates();
    socket.onerror = () => spawnSimulatedClassmates();
  } catch (e) {
    spawnSimulatedClassmates();
  }
}

function spawnSimulatedClassmates() {
  if (remotePlayers.size > 0) return;
  remotePlayers.set('bot_1', { id: 'bot_1', nickname: '少年偵探_小涵', x: -15, z: 8 });
  remotePlayers.set('bot_2', { id: 'bot_2', nickname: '少年偵探_益碩', x: 20, z: 6 });
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
  const row = document.createElement("div");
  row.className = "chat-msg-row";
  row.innerHTML = `<span class="author">[${author}]:</span> <span>${text}</span>`;
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
}

function showBreakingNews(text) {
  const banner = document.getElementById("breakingNewsBanner");
  const textEl = document.getElementById("breakingNewsText");
  textEl.innerText = text;
  banner.style.display = "flex";
  setTimeout(() => banner.style.display = "none", 6000);
}

function reconnectCustomServer() {
  const url = document.getElementById("wsServerInput").value.trim();
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

/* ─── 14. 視窗適應與主遊戲循環 ─── */
window.addEventListener("resize", () => {
  if (activeEngine === '3d' && camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  } else if (activeEngine === '2.5d' && canvas2D) {
    canvas2D.width = window.innerWidth;
    canvas2D.height = window.innerHeight;
  }
});

function gameLoop() {
  requestAnimationFrame(gameLoop);
  updateMovement();

  if (activeEngine === '3d' && renderer && scene && camera) {
    renderer.render(scene, camera);
  } else if (activeEngine === '2.5d') {
    render2DScene();
  }
}
gameLoop();

initPrivateServerConnection();
