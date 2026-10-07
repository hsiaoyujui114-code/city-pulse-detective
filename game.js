/**
 * ==========================================================================
 * 《雙北漫遊：都會行蹤》✕《城市脈動：通勤偵探》
 * 雙核心引擎 (Three.js 3D 第一人稱視角 FPV ✕ 2.5D Canvas 萬能高相容模式)
 * 1:1 雙北真實路網 (忠孝西路 ✕ 中山北路 ✕ 館前路 ✕ 重慶路 ✕ 市民大道)
 * 專屬私服器多人同步 ✕ 公車主軸通勤 ✕ 鳥瞰快轉過場動畫
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

/* ─── 2. 遊戲全局狀態 ─── */
const gameState = {
  money: 200,
  stamina: 78,
  mood: 85,
  hasSkateboard: false,
  speed: 0.24,
  weather: 'sunny',
  mosaic: false,
  nickname: "都會調查員 [你]",
  currentBubble: "🔍 巡視雙北街頭",
  cluesFound: 0,
  hasBoba: false,
  hasTeaEgg: false,
  currentDistrict: 'zhongshan',
  currentLocationName: "忠孝西路一段 ✕ 館前路口",
  inTransit: false,
  transitType: null, // 'bus' or 'mrt'
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

/* ─── 3. 第一人稱視角 (FPV) 控制狀態 ─── */
const fpv = {
  eyeHeight: 1.7,
  yaw: 0, // 水平旋轉 (弧度)
  pitch: 0, // 俯仰角 (弧度，正抬頭、負低頭)
  mouseSensitivity: 0.0028,
  touchSensitivity: 0.005,
  isPointerLocked: false,
  lastTouchX: 0,
  lastTouchY: 0,
  isTouching: false
};

const playerPos = {
  x: 0,
  y: 0,
  z: 14,
  rot: 0
};
let walkCycle = 0;

/* ─── 4. 雙核心引擎偵測 (Three.js 3D ✕ 2.5D Canvas 萬能高相容模式) ─── */
let activeEngine = '2.5d';
const container = document.getElementById("webgl-container");

let scene, camera, renderer, sunLight, hemiLight;
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

let threeSuccess = false;
if (typeof THREE !== 'undefined' && isWebGLSupported()) {
  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1426);
    scene.fog = new THREE.FogExp2(0x0a1426, 0.008);

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1500);
    camera.position.set(playerPos.x, fpv.eyeHeight, playerPos.z);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.75);
    scene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xfffaed, 1.1);
    sunLight.position.set(60, 120, 80);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    threeSuccess = true;
    activeEngine = '3d';
  } catch (err) {
    console.warn("3D WebGL 啟動受限，平滑啟動 2.5D 萬能相容引擎：", err);
    threeSuccess = false;
  }
}

if (!threeSuccess) {
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
  engineLbl.innerText = activeEngine === '3d' ? '3D WebGL 第一人稱硬體加速模式' : '2.5D Canvas 萬能相容模式 (零死機)';
}

/* ─── 5. 世界互動地標清單 (路標、公車站、捷運手扶梯、品牌門市) ─── */
const interactables = [
  // 1. 公車通勤主軸站牌 (忠孝西路專用道候車站 & 中山市場站牌)
  { id: 'bus_station_zx', x: 0, z: 2, r: 6.0, type: 'bus_stop', name: '台北車站(忠孝)公車專用道站牌', line: '307', dest: 'zhongshan', label: '搭乘 307 公車 (前往中山商圈 / 南京東路)' },
  { id: 'bus_station_zs', x: 48, z: -35, r: 6.0, type: 'bus_stop', name: '中山市場公車站牌 (CoCo前)', line: '307', dest: 'station', label: '搭乘 307 公車 (前往台北車站)' },
  
  // 2. 捷運站出入口手扶梯 (台北車站 M6 / 中山 R4)
  { id: 'mrt_escalator_m6', x: 22, z: 24, r: 5.5, type: 'mrt_escalator', name: '捷運站出入口 (M6搭乘手扶梯往地下月台)', label: '搭手扶梯進捷運站月台' },
  { id: 'mrt_escalator_zs', x: 48, z: 15, r: 5.5, type: 'mrt_escalator', name: '捷運中山站出入口 (搭手扶梯往地下月台)', label: '搭手扶梯進捷運站月台' },

  // 3. 品牌實體外觀門市
  { id: 'coco_zs', x: 62, z: -30, r: 5.5, type: 'coco', name: 'CoCo 都可 (中山北路門市)', label: '購買 CoCo 手搖飲料 ($50)' },
  { id: 'fmart_zs', x: 62, z: 20, r: 5.5, type: 'familymart', name: '全家便利商店 (中山北路店)', label: '進入全家便利商店 (買茶葉蛋)' },
  { id: 'fmart_station', x: -35, z: 24, r: 5.5, type: 'familymart', name: '全家便利商店 (站前館前店)', label: '進入全家便利商店' },

  // 4. 重點調查與線索地標
  { id: 'clue_flower', x: 14, z: 18, r: 4.5, type: 'clue_ground', name: '站前花圃神祕紙條', label: '翻查站前花圃神祕紙條' },
  { id: 'nightmarket', x: -90, z: -80, r: 6.5, type: 'nightmarket', name: '寧夏夜市美食小吃街', label: '品嚐寧夏夜市美食 (鹽酥雞 / 章魚燒)' },
  { id: 'police_cctv', x: 75, z: 75, r: 6.0, type: 'police', name: '北投分局偵查隊', label: '與林巡官調閱 CCTV 監控軌跡' },
  { id: 'rest_bench', x: 2, z: 26, r: 4.5, type: 'rest', name: '站前綠化長椅', label: '在候車長椅休息恢復體力' }
];

/* ─── 6. 3D 場景真實雙北道路與建築幾何建置 ─── */
let bus3D = null;
const pedestrians3D = [];
const otherPlayers3D = new Map();

if (activeEngine === '3d') {
  buildRealTaipeiRoadNetwork3D();
  build3DStorefrontsAndLandmarks();
  bus3D = createTaipeiCityBus3D();
  scene.add(bus3D.group);
  spawn3DPedestrians();
}

/**
 * 建立 1:1 雙北擴大道路網絡 (忠孝西路、中山北路、館前路、重慶南路、市民大道高架)
 */
function buildRealTaipeiRoadNetwork3D() {
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e242d, roughness: 0.85 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
  const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const busLaneMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.8 }); // 公車專用道深藍柏油

  // 1. 忠孝西路 (東西向大道，寬 36m，z 從 -18 到 +18，長度 360m)
  const zxRoad = new THREE.Mesh(new THREE.PlaneGeometry(380, 36), roadMat);
  zxRoad.rotation.x = -Math.PI / 2;
  zxRoad.position.set(0, 0.01, 0);
  scene.add(zxRoad);

  // 忠孝西路 中央公車專用道 (寬 8m，z: -4 到 +4)
  const busLane = new THREE.Mesh(new THREE.PlaneGeometry(380, 8), busLaneMat);
  busLane.rotation.x = -Math.PI / 2;
  busLane.position.set(0, 0.015, 0);
  scene.add(busLane);

  // 中央雙黃線 (z: 0)
  for (let x = -180; x < 180; x += 10) {
    const yl1 = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.25), yellowLineMat);
    yl1.rotation.x = -Math.PI / 2;
    yl1.position.set(x + 4, 0.02, 0.2);
    scene.add(yl1);
    const yl2 = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.25), yellowLineMat);
    yl2.rotation.x = -Math.PI / 2;
    yl2.position.set(x + 4, 0.02, -0.2);
    scene.add(yl2);
  }

  // 忠孝西路 北側人行道 (z: -18 到 -38，寬 20m)
  const northWalk = new THREE.Mesh(new THREE.PlaneGeometry(380, 20), sidewalkMat);
  northWalk.rotation.x = -Math.PI / 2;
  northWalk.position.set(0, 0.08, -28);
  scene.add(northWalk);

  // 忠孝西路 南側人行道 (z: 18 到 38，寬 20m)
  const southWalk = new THREE.Mesh(new THREE.PlaneGeometry(380, 20), sidewalkMat);
  southWalk.rotation.x = -Math.PI / 2;
  southWalk.position.set(0, 0.08, 28);
  scene.add(southWalk);

  // 2. 中山北路一段 (南北向林蔭大道，寬 30m，x: 35 到 65，z: -180 到 180)
  const zsRoad = new THREE.Mesh(new THREE.PlaneGeometry(30, 360), roadMat);
  zsRoad.rotation.x = -Math.PI / 2;
  zsRoad.position.set(50, 0.02, 0);
  scene.add(zsRoad);

  // 中山北路 東側林蔭人行道 (x: 65 到 85，寬 20m)
  const zsEastWalk = new THREE.Mesh(new THREE.PlaneGeometry(20, 360), sidewalkMat);
  zsEastWalk.rotation.x = -Math.PI / 2;
  zsEastWalk.position.set(75, 0.08, 0);
  scene.add(zsEastWalk);

  // 3. 館前路 (南北向站前大道，x: -32 到 -8，寬 24m，z: 18 到 160)
  const gqRoad = new THREE.Mesh(new THREE.PlaneGeometry(24, 150), roadMat);
  gqRoad.rotation.x = -Math.PI / 2;
  gqRoad.position.set(-20, 0.02, 90);
  scene.add(gqRoad);

  // 4. 重慶南路一段 (x: -102 到 -78，寬 24m，z: -160 到 160)
  const cqRoad = new THREE.Mesh(new THREE.PlaneGeometry(24, 340), roadMat);
  cqRoad.rotation.x = -Math.PI / 2;
  cqRoad.position.set(-90, 0.02, 0);
  scene.add(cqRoad);

  // 5. 斑馬線 (行人穿越道)
  function createCrosswalk(cx, cz, w, d, horizontal = true) {
    const group = new THREE.Group();
    const count = Math.floor(horizontal ? w / 1.6 : d / 1.6);
    for (let i = 0; i < count; i++) {
      const bar = new THREE.Mesh(
        new THREE.PlaneGeometry(horizontal ? 0.9 : 4.5, horizontal ? 4.5 : 0.9),
        whiteLineMat
      );
      bar.rotation.x = -Math.PI / 2;
      if (horizontal) {
        bar.position.set(-w / 2 + i * 1.6 + 0.8, 0.03, 0);
      } else {
        bar.position.set(0, 0.03, -d / 2 + i * 1.6 + 0.8);
      }
      group.add(bar);
    }
    group.position.set(cx, 0, cz);
    scene.add(group);
  }
  // 忠孝西路 ✕ 中山北路 路口斑馬線
  createCrosswalk(50, 16, 28, 4.5, true);
  createCrosswalk(50, -16, 28, 4.5, true);
  createCrosswalk(36, 0, 4.5, 30, false);
  createCrosswalk(64, 0, 4.5, 30, false);

  // 忠孝西路 ✕ 館前路 路口斑馬線
  createCrosswalk(-20, 16, 22, 4.5, true);

  // 6. 中山北路 樟樹林蔭大道 (綠意造景)
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
  for (let z = -140; z <= 140; z += 22) {
    if (Math.abs(z) < 22) continue; // 避開路口
    // 東側樹
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3.2, 8), treeTrunkMat);
    trunk.position.set(67, 1.6, z);
    scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), foliageMat);
    leaves.position.set(67, 4.2, z);
    scene.add(leaves);
  }

  // 7. 市民大道高架橋 (東西向空中高架橋，z: -55，高 12m)
  const bridgeDeckMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
  const bridgePillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
  const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(380, 1.6, 22), bridgeDeckMat);
  bridgeDeck.position.set(0, 11, -55);
  scene.add(bridgeDeck);

  // 高架橋墩柱
  for (let px = -160; px <= 160; px += 45) {
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 11, 12), bridgePillarMat);
    pier.position.set(px, 5.5, -55);
    scene.add(pier);
  }

  // 8. 交通號誌紅綠燈桿
  function addTrafficLight(x, z, rotY = 0) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 6, 8), poleMat);
    pole.position.set(x, 3, z);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.15, 0.15), poleMat);
    arm.position.set(x + 1.5, 5.8, z);
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.4), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    box.position.set(x + 2.8, 5.8, z);
    const greenLight = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    greenLight.position.set(x + 3.1, 5.8, z + 0.21);
    scene.add(pole);
    scene.add(arm);
    scene.add(box);
    scene.add(greenLight);
  }
  addTrafficLight(36, 18);
  addTrafficLight(64, -18);
  addTrafficLight(-10, 18);
}

/**
 * 建立 3D 品牌門市、站牌與地標 (CoCo 正宗招牌、全家、台北車站、捷運出入口手扶梯)
 */
function build3DStorefrontsAndLandmarks() {
  // ── 1. CoCo 都可 (中山北路門市) ──
  // 建築本體
  const cocoBuilding = new THREE.Mesh(
    new THREE.BoxGeometry(16, 9, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
  );
  cocoBuilding.position.set(72, 4.5, -30);
  scene.add(cocoBuilding);

  // CoCo 亮橘色代表性波浪招牌與遮雨棚
  const cocoOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 });
  const cocoSign = new THREE.Mesh(new THREE.BoxGeometry(15, 2.2, 0.6), cocoOrangeMat);
  cocoSign.position.set(72, 7.2, -23.8);
  scene.add(cocoSign);

  // CoCo 招牌圓形微笑商標
  const logoEmblem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  logoEmblem.rotation.x = Math.PI / 2;
  logoEmblem.position.set(67, 7.2, -23.4);
  scene.add(logoEmblem);

  const innerFace = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 0.22, 16),
    new THREE.MeshBasicMaterial({ color: 0xf97316 })
  );
  innerFace.rotation.x = Math.PI / 2;
  innerFace.position.set(67, 7.2, -23.3);
  scene.add(innerFace);

  // 實體點餐吧檯 (服務窗口)
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(8, 1.2, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4 })
  );
  counter.position.set(72, 0.6, -24);
  scene.add(counter);

  // 不銹鋼大茶桶 2 只 (保溫茶桶)
  const urnMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
  const urn1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12), urnMat);
  urn1.position.set(70.5, 1.6, -24.2);
  scene.add(urn1);
  const urn2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12), urnMat);
  urn2.position.set(73.5, 1.6, -24.2);
  scene.add(urn2);

  // 溫暖門市射燈
  const cocoSpot = new THREE.PointLight(0xfed7aa, 1.2, 18);
  cocoSpot.position.set(72, 4, -22);
  scene.add(cocoSpot);

  // ── 2. 全家 FamilyMart (中山北路門市 & 站前店) ──
  function createFamilyMart(x, z, rotY = 0) {
    const fGroup = new THREE.Group();
    // 建築白色本體
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(18, 9, 12),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    b.position.y = 4.5;
    fGroup.add(b);

    // 經典全家 藍綠雙色彩繪招牌
    const greenBand = new THREE.Mesh(
      new THREE.BoxGeometry(17, 1.1, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x009944 }) // 全家經典綠
    );
    greenBand.position.set(0, 7.5, 6.2);
    fGroup.add(greenBand);

    const blueBand = new THREE.Mesh(
      new THREE.BoxGeometry(17, 1.1, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x0068b7 }) // 全家經典藍
    );
    blueBand.position.set(0, 6.4, 6.2);
    fGroup.add(blueBand);

    // 落地透明玻璃大門
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(10, 3.8, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 })
    );
    glass.position.set(0, 1.9, 6.1);
    fGroup.add(glass);

    // 門市感應燈
    const light = new THREE.PointLight(0x6ee7b7, 1.1, 16);
    light.position.set(0, 3.5, 7.5);
    fGroup.add(light);

    fGroup.position.set(x, 0, z);
    fGroup.rotation.y = rotY;
    scene.add(fGroup);
  }
  createFamilyMart(72, 20, Math.PI); // 中山全家 (朝向中山北路人行道)
  createFamilyMart(-35, 28, 0);       // 站前全家 (朝向忠孝西路人行道)

  // ── 3. 台北車站主體建築 (宏偉傳統殿堂屋頂與四鐵共構) ──
  const stationGroup = new THREE.Group();
  // 車站基座主樓
  const baseMesh = new THREE.Mesh(
    new THREE.BoxGeometry(90, 22, 60),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 })
  );
  baseMesh.position.y = 11;
  stationGroup.add(baseMesh);

  // 台北車站屋頂四阿頂 (宮殿廡殿頂建築簷口)
  const roofMesh = new THREE.Mesh(
    new THREE.ConeGeometry(68, 14, 4),
    new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.6 })
  );
  roofMesh.position.y = 28;
  roofMesh.rotation.y = Math.PI / 4;
  stationGroup.add(roofMesh);

  // 站名發光字 "台北車站 TAIPEI MAIN STATION"
  const clockMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 0.4, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  clockMesh.rotation.x = Math.PI / 2;
  clockMesh.position.set(0, 18, 30.3);
  stationGroup.add(clockMesh);

  stationGroup.position.set(0, 0, -68);
  scene.add(stationGroup);

  // ── 4. 捷運出入口手扶梯亭 (玻璃採光罩與下行電扶梯階梯) ──
  function createMrtPavilion(x, z) {
    const pavilion = new THREE.Group();
    // 鋼構玻璃頂棚 (北捷特色綠藍線條)
    const glassCanopy = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.4, 12),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.6 })
    );
    glassCanopy.position.set(0, 4.2, 0);
    pavilion.add(glassCanopy);

    // 鋼柱
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });
    for (let cx of [-3.8, 3.8]) {
      for (let cz of [-5.5, 5.5]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4.2, 8), pillarMat);
        p.position.set(cx, 2.1, cz);
        pavilion.add(p);
      }
    }

    // 地下通道開口階梯 (往下延伸進入地底)
    const stairPit = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 2.5, 9),
      new THREE.MeshStandardMaterial({ color: 0x020617 })
    );
    stairPit.position.set(0, -1.2, 0);
    pavilion.add(stairPit);

    // 手扶梯斜坡與扶手帶
    const escalatorBelt = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.3, 8),
      new THREE.MeshStandardMaterial({ color: 0x10b981 })
    );
    escalatorBelt.rotation.x = -Math.PI / 8;
    escalatorBelt.position.set(1.4, 0.6, 0);
    pavilion.add(escalatorBelt);

    // 捷運站名燈箱柱
    const logoSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.2, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x0284c7 })
    );
    logoSign.position.set(3.8, 2.8, 6.2);
    pavilion.add(logoSign);

    pavilion.position.set(x, 0, z);
    scene.add(pavilion);
  }
  createMrtPavilion(22, 24); // 站前 M6 出入口
  createMrtPavilion(48, 15); // 中山 R4 出入口

  // ── 5. 公車專用道候車站島 (忠孝西路專用道候車站) ──
  const busShelter = new THREE.Group();
  // 月台島本體
  const island = new THREE.Mesh(
    new THREE.BoxGeometry(32, 0.35, 3.5),
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 })
  );
  island.position.y = 0.18;
  busShelter.add(island);

  // 候車亭頂棚
  const shelterRoof = new THREE.Mesh(
    new THREE.BoxGeometry(26, 0.25, 4.2),
    new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 })
  );
  shelterRoof.position.set(0, 3.2, 0);
  busShelter.add(shelterRoof);

  // 智慧型公車動態電子站牌 (顯示 307 即將進站)
  const eSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 1.8, 1.2),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b })
  );
  eSign.position.set(12, 1.8, 0);
  busShelter.add(eSign);

  busShelter.position.set(0, 0, 2);
  scene.add(busShelter);

  // 中山市場路邊站牌
  const stopPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x10b981 })
  );
  stopPole.position.set(48, 1.4, -35);
  scene.add(stopPole);

  const stopBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.8, 0.6),
    new THREE.MeshBasicMaterial({ color: 0x10b981 })
  );
  stopBoard.position.set(48, 2.4, -35);
  scene.add(stopBoard);

  // ── 6. 互動標記地面感應發光光圈 ──
  interactables.forEach(item => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(item.r * 0.75, item.r * 0.95, 32),
      new THREE.MeshBasicMaterial({ color: 0x00d2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(item.x, 0.09, item.z);
    scene.add(ring);
  });
}

/**
 * 建立正宗低底盤「307 幹線公車」3D 模型
 */
function createTaipeiCityBus3D() {
  const group = new THREE.Group();

  // 車身本體 (長 12m, 寬 3.0m, 高 3.2m)
  const busBodyMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 }); // 台北綠色低地板
  const body = new THREE.Mesh(new THREE.BoxGeometry(12, 2.8, 3.0), busBodyMat);
  body.position.y = 1.6;
  group.add(body);

  // 車身白色條紋
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(12.05, 0.5, 3.05),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  stripe.position.y = 1.2;
  group.add(stripe);

  // 車窗 (深色透明)
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
  const windows = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.0, 3.08), windowMat);
  windows.position.y = 2.1;
  group.add(windows);

  // 車頭 LED 路線看板 "307 板橋 ➔ 台北車站 ➔ 撫遠街"
  const ledSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.45, 2.2),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b })
  );
  ledSign.position.set(6.02, 2.6, 0);
  group.add(ledSign);

  // 車輪 4 只
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
  const wheelGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
  const wheels = [];
  for (let wx of [-3.8, 3.8]) {
    for (let wz of [-1.55, 1.55]) {
      const w = new THREE.Mesh(wheelGeom, wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(wx, 0.5, wz);
      group.add(w);
      wheels.push(w);
    }
  }

  // 車頂空調散熱器
  const ac = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.4, 1.8), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
  ac.position.set(-1, 3.2, 0);
  group.add(ac);

  group.position.set(-20, 0, 2); // 停靠於忠孝西路專用道
  return { group, wheels, currentStopIndex: 0 };
}

/**
 * 建立具備真實人體軀幹與四肢的 3D 人類角色模型 (Humanoid Mesh)
 */
function createHumanoidMesh({
  skinColor = 0xfed7aa,
  shirtColor = 0x2563eb,
  pantsColor = 0x1e293b,
  hairColor = 0x451a03,
  hasBag = true
} = {}) {
  const root = new THREE.Group();

  // 1. 軀幹 (胸部 + 腹部，自然比例)
  const torsoMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.6 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.68, 0.26), torsoMat);
  torso.position.y = 1.05;
  root.add(torso);

  // 雙肩背包
  if (hasBag) {
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.48, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 })
    );
    bag.position.set(0, 1.1, -0.2);
    root.add(bag);
  }

  // 2. 頸部與頭部
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.4 });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.15, 12), skinMat);
  neck.position.y = 1.45;
  root.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 14), skinMat);
  head.position.y = 1.62;
  root.add(head);

  // 頭髮造型
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8 });
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), hairMat);
  hair.position.set(0, 1.66, -0.04);
  root.add(hair);

  // 3. 左手臂 (以肩膀為樞軸，可前後擺動)
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.32, 1.34, 0);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.15), torsoMat);
  leftArm.position.y = -0.3;
  leftArmPivot.add(leftArm);
  root.add(leftArmPivot);

  // 4. 右手臂 (以肩膀為樞軸)
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.32, 1.34, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.15), torsoMat);
  rightArm.position.y = -0.3;
  rightArmPivot.add(rightArm);
  root.add(rightArmPivot);

  // 5. 左腿 (以髖部為樞軸)
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.14, 0.72, 0);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.19), pantsMat);
  leftLeg.position.y = -0.35;
  leftLegPivot.add(leftLeg);
  // 鞋子
  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.28), new THREE.MeshBasicMaterial({ color: 0x09090b }));
  leftShoe.position.set(0, -0.7, 0.04);
  leftLegPivot.add(leftShoe);
  root.add(leftLegPivot);

  // 6. 右腿 (以髖部為樞軸)
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.14, 0.72, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.19), pantsMat);
  rightLeg.position.y = -0.35;
  rightLegPivot.add(rightLeg);
  const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.28), new THREE.MeshBasicMaterial({ color: 0x09090b }));
  rightShoe.position.set(0, -0.7, 0.04);
  rightLegPivot.add(rightShoe);
  root.add(rightLegPivot);

  return {
    root,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot
  };
}

/**
 * 生成漫步於雙北人行道上的 3D 真實行人 (Pedestrians)
 */
function spawn3DPedestrians() {
  const configs = [
    { x: 10, z: 26, minX: -60, maxX: 70, dir: 1, shirt: 0xd97706, pants: 0x1e293b, speed: 0.04 }, // 南側上班族
    { x: -30, z: 27, minX: -80, maxX: 40, dir: -1, shirt: 0x0284c7, pants: 0x334155, speed: 0.035 }, // 提包學生
    { x: 74, z: -10, minZ: -80, maxZ: 60, dir: 1, isZAxis: true, shirt: 0x10b981, pants: 0x0f172a, speed: 0.04 }, // 中山林蔭散步者
    { x: 74, z: 30, minZ: -50, maxZ: 70, dir: -1, isZAxis: true, shirt: 0xec4899, pants: 0x374151, speed: 0.038 }, // 逛街市民
    { x: -5, z: 2, minX: -15, maxX: 15, dir: 1, shirt: 0xf59e0b, pants: 0x1e293b, speed: 0.02 }  // 公車候車亭乘客
  ];

  configs.forEach((cfg, idx) => {
    const ped = createHumanoidMesh({
      shirtColor: cfg.shirt,
      pantsColor: cfg.pants,
      hasBag: idx % 2 === 0
    });
    ped.root.position.set(cfg.x, 0, cfg.z);
    scene.add(ped.root);

    pedestrians3D.push({
      mesh: ped,
      config: cfg,
      walkCycle: Math.random() * 10
    });
  });
}

function update3DPedestrians() {
  pedestrians3D.forEach(p => {
    p.walkCycle += 0.12;
    const cfg = p.config;
    if (cfg.isZAxis) {
      cfg.z += cfg.dir * cfg.speed;
      p.mesh.root.position.z = cfg.z;
      p.mesh.root.rotation.y = cfg.dir > 0 ? 0 : Math.PI;
      if (cfg.z >= cfg.maxZ) cfg.dir = -1;
      else if (cfg.z <= cfg.minZ) cfg.dir = 1;
    } else {
      cfg.x += cfg.dir * cfg.speed;
      p.mesh.root.position.x = cfg.x;
      p.mesh.root.rotation.y = cfg.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      if (cfg.x >= cfg.maxX) cfg.dir = -1;
      else if (cfg.x <= cfg.minX) cfg.dir = 1;
    }

    // 手腳擺動動畫
    const swing = Math.sin(p.walkCycle) * 0.55;
    p.mesh.leftArmPivot.rotation.x = swing;
    p.mesh.rightArmPivot.rotation.x = -swing;
    p.mesh.leftLegPivot.rotation.x = -swing;
    p.mesh.rightLegPivot.rotation.x = swing;
  });
}

/* ─── 7. 2.5D Canvas 萬能高相容渲染器 (保證零死機) ─── */
function render2DScene() {
  if (!ctx2D) return;
  const w = canvas2D.width;
  const h = canvas2D.height;
  const cx = w / 2;
  const cy = h / 2;

  // 鳥瞰快轉時視角拉高縮放
  let scale = Math.max(14, Math.min(24, w / 55));
  if (gameState.fastForwarding) {
    scale = 6.5; // 空拍鳥瞰全景
  }

  // 1. 天空夜幕底色
  ctx2D.fillStyle = gameState.weather === 'sunny' ? '#0f1f38' : (gameState.weather === 'sunset' ? '#2e1c2b' : '#070d18');
  ctx2D.fillRect(0, 0, w, h);

  ctx2D.save();
  ctx2D.translate(cx, cy);

  const screenX = (val) => (val - playerPos.x) * scale;
  const screenZ = (val) => (val - playerPos.z) * scale;

  // 2. 忠孝西路 (東西向)
  ctx2D.fillStyle = '#1e242d';
  ctx2D.fillRect(screenX(-180), screenZ(-18), 360 * scale, 36 * scale);

  // 公車專用道
  ctx2D.fillStyle = '#1e3a5f';
  ctx2D.fillRect(screenX(-180), screenZ(-4), 360 * scale, 8 * scale);

  // 雙黃線
  ctx2D.fillStyle = '#f59e0b';
  ctx2D.fillRect(screenX(-180), screenZ(-0.3), 360 * scale, 0.6 * scale);

  // 南北人行道
  ctx2D.fillStyle = '#475569';
  ctx2D.fillRect(screenX(-180), screenZ(-36), 360 * scale, 18 * scale);
  ctx2D.fillRect(screenX(-180), screenZ(18), 360 * scale, 18 * scale);

  // 中山北路 (南北向)
  ctx2D.fillStyle = '#1e242d';
  ctx2D.fillRect(screenX(35), screenZ(-180), 30 * scale, 360 * scale);

  // 館前路
  ctx2D.fillRect(screenX(-32), screenZ(18), 24 * scale, 150 * scale);

  // 斑馬線
  ctx2D.fillStyle = '#ffffff';
  for (let z = -14; z <= 14; z += 4) {
    ctx2D.fillRect(screenX(46), screenZ(z), 8 * scale, 2 * scale);
  }

  // 3. 建築與門市
  const b2d = [
    { x: 72, z: -30, w: 16, d: 12, col: '#ea580c', name: '🧋 CoCo 都可 (中山北路)' },
    { x: 72, z: 20, w: 18, d: 12, col: '#059669', name: '🏪 全家 FamilyMart (中山店)' },
    { x: -35, z: 28, w: 18, d: 12, col: '#059669', name: '🏪 全家 (站前館前店)' },
    { x: 0, z: -68, w: 70, d: 45, col: '#334155', name: '🚇 台北車站大樓' },
    { x: 22, z: 24, w: 8, d: 10, col: '#0284c7', name: 'Ⓜ️ 捷運 M6 手扶梯出入口' },
    { x: 0, z: 2, w: 26, d: 3.5, col: '#f59e0b', name: '🚌 忠孝專用道公車站【307】' }
  ];

  b2d.forEach(b => {
    const bx = screenX(b.x - b.w / 2);
    const bz = screenZ(b.z - b.d / 2);
    ctx2D.fillStyle = b.col;
    drawSafeRoundRect(ctx2D, bx, bz, b.w * scale, b.d * scale, 6);
    ctx2D.fill();
    ctx2D.strokeStyle = '#38bdf8';
    ctx2D.lineWidth = 1.5;
    ctx2D.stroke();

    ctx2D.fillStyle = '#ffffff';
    ctx2D.font = `bold ${Math.max(10, scale * 0.65)}px sans-serif`;
    ctx2D.textAlign = 'center';
    ctx2D.fillText(b.name, bx + (b.w * scale) / 2, bz + (b.d * scale) / 2 + 4);
  });

  // 4. 307 公車
  ctx2D.fillStyle = '#10b981';
  drawSafeRoundRect(ctx2D, screenX(-16), screenZ(0.5), 14 * scale, 3.2 * scale, 4);
  ctx2D.fill();
  ctx2D.fillStyle = '#ffffff';
  ctx2D.font = 'bold 11px sans-serif';
  ctx2D.fillText('🚌 307 幹線公車', screenX(-9), screenZ(2.5));

  // 5. 互動標記感應圈
  interactables.forEach(it => {
    const ix = screenX(it.x);
    const iz = screenZ(it.z);
    ctx2D.beginPath();
    ctx2D.arc(ix, iz, it.r * scale * 0.8, 0, Math.PI * 2);
    ctx2D.strokeStyle = '#00d2ff';
    ctx2D.lineWidth = 2;
    ctx2D.setLineDash([5, 5]);
    ctx2D.stroke();
    ctx2D.setLineDash([]);
  });

  // 6. 玩家主角 (第一人稱俯瞰指標 / 人體圖示)
  const px = screenX(playerPos.x);
  const pz = screenZ(playerPos.z);

  // 影子
  ctx2D.beginPath();
  ctx2D.ellipse(px, pz + 4, 12, 6, 0, 0, Math.PI * 2);
  ctx2D.fillStyle = 'rgba(0,0,0,0.5)';
  ctx2D.fill();

  // 身體 (都會調查員)
  ctx2D.fillStyle = '#2563eb';
  drawSafeRoundRect(ctx2D, px - 9, pz - 22, 18, 18, 4);
  ctx2D.fill();

  // 頭部
  ctx2D.beginPath();
  ctx2D.arc(px, pz - 28, 8, 0, Math.PI * 2);
  ctx2D.fillStyle = '#fed7aa';
  ctx2D.fill();

  // 視角朝向箭頭
  ctx2D.beginPath();
  ctx2D.moveTo(px, pz - 28);
  ctx2D.lineTo(px - Math.sin(fpv.yaw) * 18, pz - 28 - Math.cos(fpv.yaw) * 18);
  ctx2D.strokeStyle = '#38bdf8';
  ctx2D.lineWidth = 2.5;
  ctx2D.stroke();

  // 頭頂對話氣泡
  ctx2D.fillStyle = 'rgba(10, 25, 50, 0.9)';
  drawSafeRoundRect(ctx2D, px - 60, pz - 64, 120, 22, 6);
  ctx2D.fill();
  ctx2D.strokeStyle = '#00d2ff';
  ctx2D.lineWidth = 1.2;
  ctx2D.stroke();

  ctx2D.fillStyle = '#ffffff';
  ctx2D.font = 'bold 11px sans-serif';
  ctx2D.textAlign = 'center';
  ctx2D.fillText(gameState.currentBubble, px, pz - 49);

  // 7. 同儕遠端玩家
  remotePlayers.forEach(rp => {
    const rx = screenX(rp.x);
    const rz = screenZ(rp.z);
    ctx2D.fillStyle = '#059669';
    drawSafeRoundRect(ctx2D, rx - 9, rz - 22, 18, 18, 4);
    ctx2D.fill();
    ctx2D.beginPath();
    ctx2D.arc(rx, rz - 28, 8, 0, Math.PI * 2);
    ctx2D.fillStyle = '#fed7aa';
    ctx2D.fill();

    ctx2D.fillStyle = '#34d399';
    ctx2D.font = 'bold 10px sans-serif';
    ctx2D.fillText(rp.nickname, rx, rz - 44);
  });

  ctx2D.restore();
}

/* ─── 8. 第一人稱視角 (FPV) 控制與滑鼠視角鎖定 ─── */
const keys = {};
window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === "e" || e.key === "E") triggerCurrentInteraction();
});
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// 畫布點擊鎖定滑鼠視角 (Pointer Lock API)
container.addEventListener("click", () => {
  if (container.requestPointerLock) {
    container.requestPointerLock();
  }
});

document.addEventListener("pointerlockchange", () => {
  fpv.isPointerLocked = (document.pointerLockElement === container);
  const hint = document.getElementById("fpvHint");
  if (hint) {
    hint.innerHTML = fpv.isPointerLocked
      ? `<span>🔒 視角已鎖定：移動滑鼠環顧四周，[WASD] 移動，按 [ESC] 釋放游標</span>`
      : `<span>👀 第一人稱視角：滑鼠點擊畫面轉動視角，[WASD] 移動，[E] 互動</span>`;
  }
});

// 滑鼠環顧視角 (Yaw & Pitch)
window.addEventListener("mousemove", e => {
  if (fpv.isPointerLocked || e.buttons === 1) { // 鎖定游標或拖曳左鍵
    fpv.yaw -= e.movementX * fpv.mouseSensitivity;
    fpv.pitch -= e.movementY * fpv.mouseSensitivity;
    // 限制上下仰角在 -80 度至 +80 度之間
    fpv.pitch = Math.max(-1.35, Math.min(1.35, fpv.pitch));
  }
});

// 行動裝置觸控滑動旋轉視角
container.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    fpv.isTouching = true;
    fpv.lastTouchX = e.touches[0].clientX;
    fpv.lastTouchY = e.touches[0].clientY;
  }
}, { passive: true });

container.addEventListener("touchmove", e => {
  if (fpv.isTouching && e.touches.length === 1) {
    const dx = e.touches[0].clientX - fpv.lastTouchX;
    const dy = e.touches[0].clientY - fpv.lastTouchY;
    fpv.yaw -= dx * fpv.touchSensitivity;
    fpv.pitch -= dy * fpv.touchSensitivity;
    fpv.pitch = Math.max(-1.35, Math.min(1.35, fpv.pitch));
    fpv.lastTouchX = e.touches[0].clientX;
    fpv.lastTouchY = e.touches[0].clientY;
  }
}, { passive: true });

container.addEventListener("touchend", () => {
  fpv.isTouching = false;
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

/**
 * 依據主角視角 (FPV Yaw) 進行自然前進、後退與左右橫移平移
 */
function updateMovement() {
  if (gameState.fastForwarding) {
    updateFastForwardCutscene();
    return;
  }

  let spd = gameState.hasSkateboard ? gameState.speed * 1.65 : gameState.speed;
  if (gameState.stamina < 15) spd *= 0.55;

  let forward = 0;
  let strafe = 0;

  if (keys["w"] || keys["arrowup"]) forward += 1;
  if (keys["s"] || keys["arrowdown"]) forward -= 1;
  if (keys["a"] || keys["arrowleft"]) strafe -= 1;
  if (keys["d"] || keys["arrowright"]) strafe += 1;

  if (forward !== 0 || strafe !== 0) {
    // 依據視角 yaw 進行向量合成
    const sinYaw = Math.sin(fpv.yaw);
    const cosYaw = Math.cos(fpv.yaw);

    // forward 沿著視線向前 (0, 0, -1)
    const moveX = (-sinYaw * forward) + (cosYaw * strafe);
    const moveZ = (-cosYaw * forward) + (-sinYaw * strafe);

    const len = Math.hypot(moveX, moveZ);
    if (len > 0) {
      playerPos.x += (moveX / len) * spd;
      playerPos.z += (moveZ / len) * spd;
    }

    walkCycle += 0.24;
    if (Math.floor(walkCycle) % 8 === 0) {
      playTone(160, 'square', 0.03, 0.02);
      if (Math.random() < 0.25) {
        gameState.stamina = Math.max(8, gameState.stamina - 0.35);
        updateBars();
      }
    }
  }

  // 雙北擴大道路邊界限制
  playerPos.x = Math.max(-170, Math.min(170, playerPos.x));
  playerPos.z = Math.max(-150, Math.min(150, playerPos.z));

  // 更新 FPV 3D 攝影機
  if (activeEngine === '3d' && camera) {
    // 步態自然晃動 (Head-Bobbing)
    const bob = (forward !== 0 || strafe !== 0) ? Math.sin(walkCycle * 2) * 0.04 : 0;
    camera.position.set(playerPos.x, fpv.eyeHeight + bob, playerPos.z);

    // 依據 yaw 與 pitch 計算注視點目標
    const lookTarget = new THREE.Vector3(
      playerPos.x - Math.sin(fpv.yaw) * Math.cos(fpv.pitch) * 10,
      fpv.eyeHeight + bob + Math.sin(fpv.pitch) * 10,
      playerPos.z - Math.cos(fpv.yaw) * Math.cos(fpv.pitch) * 10
    );
    camera.lookAt(lookTarget);
  }

  // 更新圓形雷達小地圖指針
  updateMinimapRadar();

  checkProximityAndLocation();
}

function updateMinimapRadar() {
  const dot = document.getElementById("radarPlayerDot");
  if (!dot) return;
  // 將地圖世界座標 (-170~170, -150~150) 映射至雷達圓圈 (0~80px)
  const normX = ((playerPos.x + 170) / 340) * 72 + 4;
  const normZ = ((playerPos.z + 150) / 300) * 72 + 4;
  dot.style.left = `${normX}px`;
  dot.style.top = `${normZ}px`;
}

/* ─── 9. 公車通勤與鳥瞰快轉過場動畫系統 (Fast-Forward Transit Cutscene) ─── */
const transitHud = document.getElementById("transitHud");
const transitBadge = document.getElementById("transitBadge");
const transitStatus = document.getElementById("transitStatus");

/**
 * 登上公車，顯示快轉按鈕 HUD
 */
function boardTaipeiBus(line, dest) {
  if (gameState.money < 15) {
    alert("悠遊卡餘額不足一段票 $15 囉！");
    return;
  }
  gameState.money -= 15;
  playBusChime();
  updateBars();

  gameState.inTransit = true;
  gameState.transitType = 'bus';
  gameState.transitDest = dest;

  transitBadge.innerText = `🚌 307 幹線公車 (${dest === 'zhongshan' ? '台北車站 ➔ 中山商圈' : '中山商圈 ➔ 台北車站'})`;
  transitStatus.innerText = "車輛平穩行駛中，可點擊右方按鈕啟用鳥瞰快轉過場動畫...";
  transitHud.style.display = "flex";

  showNavToast("🚌 悠遊卡扣款 $15！已登上 307 公車，可點擊右下快轉鍵直接過場！");
  gameState.quests.bus = true;
  updateQuestProgress();
}

/**
 * 捷運地下月台搭車
 */
function boardMrtTrain(line) {
  if (gameState.money < 20) {
    alert("悠遊卡餘額不足 $20 囉！");
    return;
  }
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

/**
 * 點擊【⏩ 快轉過場動畫 (空拍鳥瞰)】
 */
function triggerFastForwardTransition() {
  if (!gameState.inTransit) return;
  gameState.fastForwarding = true;
  gameState.fastForwardProgress = 0;
  playTone(880, 'sine', 0.25, 0.2);
  transitStatus.innerText = "🚀 鏡頭拉升至高空空拍鳥瞰！全速行駛中...";
}

/**
 * 空拍鳥瞰過場逐幀插值演算 (從第一人稱平滑拉到空拍 140m，再降回第一人稱)
 */
function updateFastForwardCutscene() {
  gameState.fastForwardProgress += 0.012;
  const p = gameState.fastForwardProgress;

  // 目標目的地座標
  const destCoords = (gameState.transitDest === 'zhongshan')
    ? { x: 48, z: -35, name: '中山商圈・CoCo門市前' }
    : { x: 0, z: 14, name: '台北車站・忠孝西路站前' };

  // 玩家世界座標平滑滑向目的地
  playerPos.x += (destCoords.x - playerPos.x) * 0.04;
  playerPos.z += (destCoords.z - playerPos.z) * 0.04;

  if (activeEngine === '3d' && camera) {
    let camHeight = 1.7;
    let targetPitch = 0;

    if (p < 0.3) {
      // 階段 1：鏡頭迅速拉升至 135m 空拍鳥瞰
      const ratio = p / 0.3;
      camHeight = 1.7 + (135 - 1.7) * Math.sin(ratio * Math.PI / 2);
      targetPitch = -(Math.PI / 2) * ratio; // 垂直俯視
    } else if (p < 0.75) {
      // 階段 2：在高空快速滑行俯瞰雙北完整路網與車流
      camHeight = 135;
      targetPitch = -Math.PI / 2;
    } else if (p < 1.0) {
      // 階段 3：抵達目標站牌，鏡頭平滑下降回 1.7m 主角第一人稱之眼
      const ratio = (1.0 - p) / 0.25;
      camHeight = 1.7 + (135 - 1.7) * Math.sin(ratio * Math.PI / 2);
      targetPitch = -(Math.PI / 2) * ratio;
    }

    camera.position.set(playerPos.x, camHeight, playerPos.z);
    camera.rotation.x = targetPitch;
  }

  // 過場完成抵達
  if (p >= 1.0) {
    gameState.fastForwarding = false;
    gameState.inTransit = false;
    transitHud.style.display = "none";
    playerPos.x = destCoords.x;
    playerPos.z = destCoords.z;
    fpv.pitch = 0;
    playBusChime();
    showNavToast(`📍 抵達【${destCoords.name}】！請親自步行探索街區！`);
    showDetectiveDialogue(`「已順利抵達目的地！下車步行調查吧！」`, "都會調查員");
  }
}

/* ─── 10. 步行距離檢測與互動觸發 ─── */
const interactPrompt = document.getElementById("interactPrompt");
const interactLabel = document.getElementById("interactLabel");
const actionPillsStack = document.getElementById("actionPillsStack");
const locationText = document.getElementById("locationText");
let lastNearestId = null;
let hasPlayedDoorbell = false;

function checkProximityAndLocation() {
  // 1. 動態街道名稱判定
  let currentLoc = "忠孝西路一段 ✕ 館前路口";
  if (Math.hypot(playerPos.x - 72, playerPos.z - (-30)) < 18) currentLoc = "中山北路一段・CoCo都可手搖飲門市";
  else if (Math.hypot(playerPos.x - 72, playerPos.z - 20) < 18) currentLoc = "中山北路一段・全家便利商店";
  else if (Math.hypot(playerPos.x - 0, playerPos.z - 2) < 16) currentLoc = "忠孝西路公車專用道【台北車站(忠孝)】";
  else if (Math.hypot(playerPos.x - 22, playerPos.z - 24) < 16) currentLoc = "台北車站南側廣場 ✕ M6捷運出入口";
  else if (Math.hypot(playerPos.x - (-35), playerPos.z - 28) < 16) currentLoc = "館前路商圈・站前全家超商";
  else if (Math.hypot(playerPos.x - (-90), playerPos.z - (-80)) < 24) currentLoc = "建成圓環 ✕ 寧夏夜市美食街";
  else if (Math.hypot(playerPos.x - 75, playerPos.z - 75) < 20) currentLoc = "北投分局・刑事偵查隊";

  if (gameState.currentLocationName !== currentLoc) {
    gameState.currentLocationName = currentLoc;
    if (locationText) locationText.innerText = currentLoc;
  }

  // 2. 體力警報
  const warnBanner = document.getElementById("staminaWarningBanner");
  if (warnBanner) warnBanner.style.display = gameState.stamina <= 18 ? "flex" : "none";

  // 3. 實體互動範圍判定
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
  else if (type === "rest") openRestModal();
  else if (type === "clue_ground") guideToClue();
}

function guideToClue() {
  alert("📜 拾獲站前花圃紙條！上頭寫著：『14:12 在忠孝西路刷卡搭乘 307 公車』！已列入關鍵證物簿！");
  gameState.cluesFound = Math.min(3, gameState.cluesFound + 1);
  gameState.quests.clues = true;
  updateQuestProgress();
}

/* ─── 11. 雙北地圖路線規劃 (嚴格禁止直接傳送，僅供路線指引) ─── */
function alertPlanRoute(routeId) {
  if (routeId === 'bus_307') {
    showNavToast("🚌 307 幹線公車：請走到忠孝西路中央專用道候車站牌，嗶卡上車即可啟用快轉過場！");
  } else if (routeId === 'bus_zs') {
    showNavToast("🚌 中山幹線公車：沿中山北路林蔭大道行駛，停靠 CoCo 都可門市前站牌！");
  } else if (routeId === 'mrt_red') {
    showNavToast("🚇 捷運淡水信義線：請走到站前 M6 或 中山 R4 出入口，搭乘手扶梯進入地下月台！");
  } else if (routeId === 'bus_cd') {
    showNavToast("🚌 承德幹線：沿重慶北路通往寧夏夜市，請前往西側站牌搭乘！");
  }
  closeModal('mapModal');
}

/* ─── 12. 商店消費、物品與對質逮捕 ─── */
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
  alert("🛹 裝備極速電動滑板！移動速度提升 65%！穿梭雙北街頭如風馳掣！");
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
  alert("🛏️ 在綠化候車長椅閉目休息片刻，體力恢復 +50！");
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

/* ─── 13. 天氣、彈窗與 UI 控制 ─── */
function toggleWeather() {
  const icon = document.getElementById("weatherIcon");
  const text = document.getElementById("weatherTimeText");

  if (gameState.weather === 'sunny') {
    gameState.weather = 'sunset';
    if (icon) icon.innerText = "🌇";
    if (text) text.innerText = "傍晚 17:15";
    if (scene && sunLight) {
      sunLight.color.setHex(0xf97316);
      scene.fog.color.setHex(0x2a1b2d);
    }
  } else if (gameState.weather === 'sunset') {
    gameState.weather = 'night';
    if (icon) icon.innerText = "🌙";
    if (text) text.innerText = "晴夜 20:30";
    if (scene && sunLight) {
      sunLight.color.setHex(0x38bdf8);
      scene.fog.color.setHex(0x060d1a);
    }
  } else {
    gameState.weather = 'sunny';
    if (icon) icon.innerText = "☀️";
    if (text) text.innerText = "晴天 10:24";
    if (scene && sunLight) {
      sunLight.color.setHex(0xfffaed);
      scene.fog.color.setHex(0x0a1426);
    }
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

/* ─── 14. 專屬私服器 (WebSocket) 連線與多人同屏 ─── */
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
        if (msg.type === 'init') msg.players.forEach(p => syncRemotePlayer(p));
        else if (msg.type === 'player_move') syncRemotePlayer(msg);
        else if (msg.type === 'player_leave') removeRemotePlayer(msg.id);
        else if (msg.type === 'chat_broadcast') appendChatMessage(msg.nickname, msg.text);
      } catch (err) {}
    };
    socket.onclose = () => spawnSimulatedCitizens();
    socket.onerror = () => spawnSimulatedCitizens();
  } catch (e) {
    spawnSimulatedCitizens();
  }
}

function syncRemotePlayer(p) {
  remotePlayers.set(p.id, p);
  if (activeEngine === '3d' && scene) {
    let r3d = otherPlayers3D.get(p.id);
    if (!r3d) {
      r3d = createHumanoidMesh({ shirtColor: 0x059669, pantsColor: 0x1e293b });
      scene.add(r3d.root);
      otherPlayers3D.set(p.id, r3d);
    }
    r3d.root.position.set(p.x || 0, 0, p.z || 0);
  }
}

function removeRemotePlayer(id) {
  remotePlayers.delete(id);
  if (otherPlayers3D.has(id)) {
    scene.remove(otherPlayers3D.get(id).root);
    otherPlayers3D.delete(id);
  }
}

function spawnSimulatedCitizens() {
  if (remotePlayers.size > 0) return;
  const bot1 = { id: 'bot_1', nickname: '市民_小涵', x: 26, z: 20 };
  const bot2 = { id: 'bot_2', nickname: '市民_益碩', x: 55, z: -25 };
  syncRemotePlayer(bot1);
  syncRemotePlayer(bot2);
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

/* ─── 15. 視窗適應與主渲染循環 ─── */
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

  if (activeEngine === '3d') {
    update3DPedestrians();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  } else if (activeEngine === '2.5d') {
    render2DScene();
  }
}
gameLoop();

initPrivateServerConnection();
