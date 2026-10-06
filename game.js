/**
 * ==========================================================================
 * 《雙北漫遊偵探：都會行蹤》✕《城市脈動：通勤偵探》
 * 3D 核心遊戲邏輯 ✕ Three.js 引擎 ✕ 專屬私服器 (WebSocket) 多人同步
 * ==========================================================================
 */

// 全域 Canvas 圓角相容輔助函式 (避免部分瀏覽器缺少 ctx.roundRect 導致黑屏報錯)
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
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq = 440, type = 'sine', duration = 0.08, gainVal = 0.1) {
  try {
    const ctx = getAudioContext();
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
  } catch (e) {
    // 忽略未互動前的使用者音效靜音警告
  }
}

// 全家超商經典進門叮咚鈴聲 (E5, G#5, F#5, B4)
function playStoreChime() {
  const notes = [659.25, 830.61, 739.99, 493.88];
  notes.forEach((freq, idx) => {
    setTimeout(() => playTone(freq, 'triangle', 0.22, 0.18), idx * 160);
  });
}

// 捷運進站四音階 (G4, B4, D5, G5)
function playMrtChime() {
  const notes = [392, 493.88, 587.33, 783.99];
  notes.forEach((freq, idx) => {
    setTimeout(() => playTone(freq, 'triangle', 0.28, 0.15), idx * 170);
  });
}

// 破案勝利號角
function playVictoryFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, idx) => {
    setTimeout(() => playTone(freq, 'sine', 0.2, 0.2), idx * 130);
  });
}

// 筆錄打臉音效
function playSlapSound() {
  playTone(150, 'sawtooth', 0.15, 0.3);
  setTimeout(() => playTone(880, 'square', 0.25, 0.2), 80);
}

// 錯誤蜂鳴音
function playBuzzer() {
  playTone(180, 'sawtooth', 0.2, 0.25);
  setTimeout(() => playTone(150, 'sawtooth', 0.2, 0.25), 180);
}

/* ─── 2. 遊戲全局狀態 ─── */
const gameState = {
  money: 200,
  stamina: 85,
  mood: 90,
  hasSkateboard: false,
  speed: 0.18,
  weather: 'sunny',
  mosaic: false,
  nickname: "小偵探 [你]",
  currentBubble: "🔍 巡視街頭",
  cluesFound: 0,
  quests: {
    clues: false,
    store: false,
    tib: false,
    arrest: false
  },
  activeInteractTarget: null
};

/* ─── 3. Three.js 3D 場景安全初始化 ─── */
const container = document.getElementById("webgl-container");

if (typeof THREE === 'undefined') {
  container.innerHTML = `
    <div style="color:white; padding:40px; text-align:center;">
      <h2>⚠️ 3D 繪圖引擎載入中...</h2>
      <p>請稍候片刻或重新整理頁面。</p>
    </div>
  `;
  throw new Error("Three.js not loaded yet");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // 晴天天空藍
scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
// 初始預設相機位置與朝向，確保首幀立即有畫面，絕不黑屏
camera.position.set(0, 11, 23);
camera.lookAt(0, 1.8, 5);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
} catch (e) {
  console.error("WebGL failed:", e);
  container.innerHTML = `
    <div style="color:white; padding:40px; text-align:center;">
      <h2>⚠️ 您的瀏覽器尚未啟用 WebGL 3D 支援</h2>
      <p>請前往瀏覽器設定開啟硬體加速或使用最新版 Chrome / Edge / Safari。</p>
    </div>
  `;
}

// 光照系統
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffaed, 0.95);
sunLight.position.set(40, 70, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 180;
const d = 45;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
scene.add(sunLight);

/* ─── 4. 建立 3D 台北街區與重要建築 ─── */
// 道路與人行道
const roadMat = new THREE.MeshLambertMaterial({ color: 0x242830 });
const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0xc8cdd4 });

// 主幹道 (寬 18m)
const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(160, 20), roadMat);
roadMesh.rotation.x = -Math.PI / 2;
roadMesh.receiveShadow = true;
scene.add(roadMesh);

// 斑馬線
for (let i = -8; i <= 8; i += 2) {
  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 5),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  stripe.rotation.x = -Math.PI / 2;
  stripe.position.set(i, 0.02, 0);
  scene.add(stripe);
}

// 北側人行道
const northWalk = new THREE.Mesh(new THREE.PlaneGeometry(160, 25), sidewalkMat);
northWalk.rotation.x = -Math.PI / 2;
northWalk.position.set(0, 0.05, 22.5);
northWalk.receiveShadow = true;
scene.add(northWalk);

// 南側人行道
const southWalk = new THREE.Mesh(new THREE.PlaneGeometry(160, 25), sidewalkMat);
southWalk.rotation.x = -Math.PI / 2;
southWalk.position.set(0, 0.05, -22.5);
southWalk.receiveShadow = true;
scene.add(southWalk);

// 遠景：台北 101 大樓
function buildTaipei101() {
  const t101Group = new THREE.Group();
  const mat101 = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(10, 25, 10), mat101);
  base.position.y = 12.5;
  t101Group.add(base);

  for (let i = 0; i < 8; i++) {
    const sec = new THREE.Mesh(new THREE.BoxGeometry(9.2 - i * 0.3, 7, 9.2 - i * 0.3), glassMat);
    sec.position.y = 25 + i * 7.5;
    t101Group.add(sec);
  }
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2, 20, 8), mat101);
  spire.position.y = 95;
  t101Group.add(spire);

  t101Group.position.set(35, 0, -110);
  scene.add(t101Group);
}
buildTaipei101();

// 實體互動地標資料列表
const interactables = [];

// 建立 3D 建築輔助函式（讓門面永遠面向街道 z = 0）
function createStreetBuilding(x, z, w, h, d, mainColor, signText, signColor = 0x00d2ff, type = "") {
  const group = new THREE.Group();
  const bMat = new THREE.MeshLambertMaterial({ color: mainColor });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bMat);
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // 門面朝向街道（z > 0 的建築門面向南 -d/2；z < 0 的建築門面向北 +d/2）
  const facingZ = z > 0 ? -d / 2 : d / 2;

  // 門面落地玻璃窗
  const windowPane = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.75, h * 0.5, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x1e293b, emissive: 0x0f2744 })
  );
  windowPane.position.set(0, h * 0.3, facingZ + (z > 0 ? -0.1 : 0.1));
  group.add(windowPane);

  // 建築發光招牌
  const signMesh = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.88, 2.2, 0.4),
    new THREE.MeshLambertMaterial({ color: signColor, emissive: signColor, emissiveIntensity: 0.35 })
  );
  signMesh.position.set(0, h * 0.68, facingZ + (z > 0 ? -0.25 : 0.25));
  group.add(signMesh);

  group.position.set(x, 0, z);
  scene.add(group);

  // 實體入口座標（人行道上門口位置）
  const doorZ = z > 0 ? z - d / 2 - 2.5 : z + d / 2 + 2.5;

  if (type) {
    // 地面發光感應圓環
    const ringGeo = new THREE.RingGeometry(1.6, 2.0, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: signColor, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(x, 0.08, doorZ);
    scene.add(ringMesh);

    interactables.push({
      x: x,
      z: doorZ,
      r: 4.8,
      type: type,
      label: signText,
      ringMesh: ringMesh
    });
  }
  return group;
}

// 1. 🏪 全家 FamilyMart 24H 便利商店（實體位置：x: -25, z: 18）
const fMart = createStreetBuilding(-25, 18, 16, 9, 12, 0xf8fafc, "進入全家便利商店 (買茶葉蛋)", 0x10b981, "familymart");
// 全家綠白藍經典飾條
const fmStripe = new THREE.Mesh(
  new THREE.BoxGeometry(15, 0.9, 0.4),
  new THREE.MeshBasicMaterial({ color: 0x0284c7 })
);
fmStripe.position.set(0, 7.2, -6.3);
fMart.add(fmStripe);

// 2. 🚇 台北車站站前大廳 (x: 22, z: 20)
createStreetBuilding(22, 20, 26, 14, 15, 0x475569, "調查台北車站失竊現場", 0x38bdf8, "station");

// 3. 🏮 寧夏夜市美食小吃攤 (x: -50, z: 16)
const foodStall = new THREE.Group();
const stallBody = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 4), new THREE.MeshLambertMaterial({ color: 0x78350f }));
stallBody.position.y = 2;
stallBody.castShadow = true;
foodStall.add(stallBody);
const canopy = new THREE.Mesh(new THREE.BoxGeometry(7, 0.6, 5), new THREE.MeshLambertMaterial({ color: 0xd90429 }));
canopy.position.y = 4.2;
foodStall.add(canopy);
const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), new THREE.MeshLambertMaterial({ color: 0xef4444, emissive: 0xef4444 }));
lantern.position.set(-2.5, 3.8, -2.2);
foodStall.add(lantern);
foodStall.position.set(-50, 0, 16);
scene.add(foodStall);
interactables.push({ x: -50, z: 12, r: 4.5, type: "nightmarket", label: "品嚐夜市美食 (鹽酥雞 / 章魚燒)" });

// 4. 🚓 警局巡邏車與筆錄警戒線現場 (x: 45, z: 14)
const policeCar = new THREE.Group();
const carBody = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.8, 6.5), new THREE.MeshLambertMaterial({ color: 0x111827 }));
carBody.position.y = 1.2;
policeCar.add(carBody);
const carCabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 3.6), new THREE.MeshLambertMaterial({ color: 0xffffff }));
carCabin.position.set(0, 2.2, -0.4);
policeCar.add(carCabin);
const strobeRed = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
strobeRed.position.set(-0.7, 3.0, -0.4);
policeCar.add(strobeRed);
const strobeBlue = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
strobeBlue.position.set(0.7, 3.0, -0.4);
policeCar.add(strobeBlue);
policeCar.position.set(45, 0, 14);
scene.add(policeCar);
interactables.push({ x: 45, z: 10, r: 5, type: "police", label: "與巡警會合，進行筆錄打臉逮捕" });

// 5. 🚕 黃色計程車 (x: 5, z: -5)
const taxi = new THREE.Group();
const taxiBody = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 6), new THREE.MeshLambertMaterial({ color: 0xfacc15 }));
taxiBody.position.y = 1;
taxi.add(taxiBody);
const taxiCabin = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 3.2), new THREE.MeshLambertMaterial({ color: 0xfacc15 }));
taxiCabin.position.set(0, 2.1, -0.3);
taxi.add(taxiCabin);
taxi.position.set(5, 0, -5);
taxi.rotation.y = Math.PI / 2;
scene.add(taxi);
interactables.push({ x: 5, z: -5, r: 4.5, type: "taxi", label: "詢問計程車司機 (目擊線索)" });

// 6. 📜 地面失竊暗號紙條 (x: -5, z: 12)
const clueMarker = new THREE.Mesh(
  new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16),
  new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
);
clueMarker.position.set(-5, 0.08, 12);
scene.add(clueMarker);
interactables.push({ x: -5, z: 12, r: 3.5, type: "clue_ground", label: "翻查站前花圃神祕暗號紙條" });

// 路燈
function addStreetLamp(x, z) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 8), new THREE.MeshLambertMaterial({ color: 0x334155 }));
  pole.position.set(x, 4, z);
  scene.add(pole);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
  head.position.set(x, 8, z);
  scene.add(head);
  const light = new THREE.PointLight(0xfef08a, 0.75, 18);
  light.position.set(x, 7.8, z);
  scene.add(light);
}
addStreetLamp(-35, 11);
addStreetLamp(0, 11);
addStreetLamp(35, 11);

// 行道樹
function addTree(x, z) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3), new THREE.MeshLambertMaterial({ color: 0x5c4033 }));
  trunk.position.set(x, 1.5, z);
  scene.add(trunk);
  const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(2), new THREE.MeshLambertMaterial({ color: 0x15803d }));
  leaves.position.set(x, 4.2, z);
  leaves.castShadow = true;
  scene.add(leaves);
}
addTree(-12, 14);
addTree(60, 14);
addTree(-62, 14);

/* ─── 5. 3D 少年偵探主角模型 ─── */
function createDetectiveCharacter(isLocal = true, name = "小偵探") {
  const group = new THREE.Group();

  // 身體
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.4, 0.7),
    new THREE.MeshLambertMaterial({ color: isLocal ? 0xb45309 : 0x1d4ed8 })
  );
  body.position.y = 1.4;
  body.castShadow = true;
  group.add(body);

  // 背包
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.9, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x0f172a })
  );
  pack.position.set(0, 1.45, -0.45);
  group.add(pack);

  // 頭部
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 12),
    new THREE.MeshLambertMaterial({ color: 0xfed7aa })
  );
  head.position.y = 2.4;
  head.castShadow = true;
  group.add(head);

  // 獵鹿帽
  const hat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.52, 0.28, 16),
    new THREE.MeshLambertMaterial({ color: 0x78350f })
  );
  hat.position.y = 2.65;
  group.add(hat);
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.08, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x78350f })
  );
  visor.position.set(0, 2.58, 0.4);
  group.add(visor);

  // 雙腿
  const legMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), legMat);
  leftLeg.position.set(-0.25, 0.4, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), legMat);
  rightLeg.position.set(0.25, 0.4, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // 滑板
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.1, 2.2),
    new THREE.MeshLambertMaterial({ color: 0xef4444 })
  );
  board.position.set(0, 0.06, 0);
  board.visible = false;
  group.add(board);

  // 影子
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  // 頭頂文字精靈 (昵稱與動作氣泡)
  const canvasText = document.createElement("canvas");
  canvasText.width = 256;
  canvasText.height = 128;
  const ctxText = canvasText.getContext("2d");

  const texture = new THREE.CanvasTexture(canvasText);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.y = 3.6;
  sprite.scale.set(3, 1.5, 1);
  group.add(sprite);

  function updateSprite(nickname, bubbleText) {
    ctxText.clearRect(0, 0, 256, 128);
    ctxText.fillStyle = "rgba(10, 25, 50, 0.92)";
    ctxText.strokeStyle = isLocal ? "#00d2ff" : "#34d399";
    ctxText.lineWidth = 4;
    // 使用全域相容繪製圓角
    drawSafeRoundRect(ctxText, 10, 10, 236, 60, 16);
    ctxText.fill();
    ctxText.stroke();

    ctxText.fillStyle = "#ffffff";
    ctxText.font = "bold 21px sans-serif";
    ctxText.textAlign = "center";
    ctxText.fillText(bubbleText || "🔍 巡視中", 128, 48);

    ctxText.fillStyle = isLocal ? "#38bdf8" : "#a7f3d0";
    ctxText.font = "bold 20px sans-serif";
    ctxText.fillText(nickname, 128, 105);

    texture.needsUpdate = true;
  }
  updateSprite(name, isLocal ? gameState.currentBubble : "少年偵探");

  return {
    group,
    leftLeg,
    rightLeg,
    board,
    updateSprite
  };
}

const localPlayer = createDetectiveCharacter(true, gameState.nickname);
localPlayer.group.position.set(0, 0, 5);
scene.add(localPlayer.group);

/* ─── 6. 控制器 (鍵盤 / 手機 / 滑鼠) ─── */
const keys = {};
window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === "e" || e.key === "E") {
    triggerCurrentInteraction();
  }
});
window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

// 手機十字虛擬按鍵支援
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

// 滑鼠拖曳環視視角
let isDragging = false;
let prevMouseX = 0;
let cameraYaw = 0;
let cameraPitch = 0.32;
let cameraDistance = 14;

window.addEventListener("mousedown", e => {
  if (e.button === 0 && e.target === renderer.domElement) {
    isDragging = true;
    prevMouseX = e.clientX;
  }
});
window.addEventListener("mouseup", () => isDragging = false);
window.addEventListener("mousemove", e => {
  if (isDragging) {
    const deltaX = e.clientX - prevMouseX;
    cameraYaw -= deltaX * 0.006;
    prevMouseX = e.clientX;
  }
});
window.addEventListener("wheel", e => {
  cameraDistance = Math.max(8, Math.min(24, cameraDistance + e.deltaY * 0.01));
});

let walkCycle = 0;

function updateLocalMovement() {
  const p = localPlayer.group;
  let spd = gameState.hasSkateboard ? gameState.speed * 1.6 : gameState.speed;
  let moveX = 0;
  let moveZ = 0;

  if (keys["w"] || keys["arrowup"]) moveZ -= 1;
  if (keys["s"] || keys["arrowdown"]) moveZ += 1;
  if (keys["a"] || keys["arrowleft"]) moveX -= 1;
  if (keys["d"] || keys["arrowright"]) moveX += 1;

  if (moveX !== 0 || moveZ !== 0) {
    const angle = Math.atan2(moveX, moveZ) + cameraYaw;
    p.position.x += Math.sin(angle) * spd;
    p.position.z += Math.cos(angle) * spd;
    p.rotation.y = angle;

    walkCycle += 0.22;
    localPlayer.leftLeg.rotation.x = Math.sin(walkCycle) * 0.6;
    localPlayer.rightLeg.rotation.x = -Math.sin(walkCycle) * 0.6;

    if (Math.floor(walkCycle) % 8 === 0) {
      playTone(200, 'square', 0.03, 0.02);
    }
  } else {
    localPlayer.leftLeg.rotation.x = 0;
    localPlayer.rightLeg.rotation.x = 0;
  }

  // 邊界防溢出
  p.position.x = Math.max(-75, Math.min(75, p.position.x));
  p.position.z = Math.max(-20, Math.min(25, p.position.z));

  // 相機平滑插值追蹤
  const targetCamX = p.position.x + Math.sin(cameraYaw) * cameraDistance;
  const targetCamZ = p.position.z + Math.cos(cameraYaw) * cameraDistance;
  const targetCamY = p.position.y + Math.sin(cameraPitch) * cameraDistance + 2.5;

  camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.12);
  camera.lookAt(p.position.x, p.position.y + 1.8, p.position.z);

  // 檢查是否走到地標位置
  checkProximityToInteractables(p.position);
}

/* ─── 7. 嚴格實體步行距離偵測與導航 ─── */
const interactPrompt = document.getElementById("interactPrompt");
const interactLabel = document.getElementById("interactLabel");
let hasPlayedDoorbell = false;

function checkProximityToInteractables(pos) {
  let nearest = null;
  let minD = 999;

  for (const item of interactables) {
    const dist = Math.hypot(pos.x - item.x, pos.z - item.z);
    if (dist < item.r && dist < minD) {
      minD = dist;
      nearest = item;
    }
  }

  if (nearest) {
    gameState.activeInteractTarget = nearest.type;
    interactLabel.innerText = nearest.label;
    interactPrompt.style.display = "flex";

    // 若走到全家門口，播放全家進門叮咚聲
    if (nearest.type === "familymart" && !hasPlayedDoorbell) {
      playStoreChime();
      hasPlayedDoorbell = true;
    }
  } else {
    gameState.activeInteractTarget = null;
    interactPrompt.style.display = "none";
    hasPlayedDoorbell = false;
  }
}

// 導航提示 Toast
function showNavToast(text) {
  const toast = document.getElementById("navHintToast");
  const txt = document.getElementById("navHintText");
  txt.innerText = text;
  toast.style.display = "flex";
  playTone(480, 'sine', 0.12);
  setTimeout(() => {
    toast.style.display = "none";
  }, 4000);
}

// 點擊全家超商按鈕時的處理（貫徹必須實際走到的核心要求！）
function handleGoToStore() {
  const pos = localPlayer.group.position;
  // 全家入口在 (-25, 7.5)
  const dist = Math.hypot(pos.x - (-25), pos.z - 7.5);

  if (dist <= 5.0) {
    // 已經在全家門口，允許進入
    openStoreModal();
  } else {
    // 離全家太遠，提示必須實際走過去！
    showNavToast(`📍 你目前距離全家超商還有約 ${Math.round(dist)} 公尺！請操作小偵探實際走到全家綠白藍發光招牌處！`);
    // 角色頭頂氣泡提示
    gameState.currentBubble = "🏪 前往全家買茶葉蛋";
    localPlayer.updateSprite(gameState.nickname, gameState.currentBubble);
  }
}

// 點擊夜市美食按鈕時的處理
function handleGoToNightMarket() {
  const pos = localPlayer.group.position;
  const dist = Math.hypot(pos.x - (-50), pos.z - 12);

  if (dist <= 5.0) {
    openNightMarketModal();
  } else {
    showNavToast(`📍 距離夜市小吃攤還有約 ${Math.round(dist)} 公尺！請走到左側寧夏夜市紅燈籠處！`);
  }
}

function guideToClue() {
  const pos = localPlayer.group.position;
  const dist = Math.hypot(pos.x - (-5), pos.z - 12);
  if (dist <= 4.0) {
    alert("📜 拾獲地面紙條！上面潦草寫著：『14:38 北車站閘門碰面』！正式列入線索！");
    gameState.cluesFound = Math.min(3, gameState.cluesFound + 1);
    document.getElementById("clueCount").innerText = gameState.cluesFound;
    gameState.quests.clues = true;
    updateQuestProgress();
  } else {
    showNavToast(`📍 請走到站前花圃黃色光圈處調查神祕紙條！(尚距 ${Math.round(dist)} 公尺)`);
  }
}

function guideToPolice() {
  const pos = localPlayer.group.position;
  const dist = Math.hypot(pos.x - 45, pos.z - 10);
  if (dist <= 5.5) {
    openInterrogateModal();
  } else {
    showNavToast(`📍 請走到右側警車警笛閃爍處與巡警會合！(尚距 ${Math.round(dist)} 公尺)`);
  }
}

function triggerCurrentInteraction() {
  const type = gameState.activeInteractTarget;
  if (!type) return;

  playTone(550, 'triangle', 0.1);
  if (type === "familymart") {
    openStoreModal();
  } else if (type === "nightmarket") {
    openNightMarketModal();
  } else if (type === "station") {
    openCluesModal();
    gameState.quests.clues = true;
    updateQuestProgress();
  } else if (type === "police") {
    openInterrogateModal();
  } else if (type === "taxi") {
    alert("🚖 計程車運將大叔：「剛才看見一個戴黑鴨舌帽的男生從車站 B1 跑出來，朝全家超商方向溜走了！」");
    gameState.cluesFound = Math.min(3, gameState.cluesFound + 1);
    document.getElementById("clueCount").innerText = gameState.cluesFound;
  } else if (type === "clue_ground") {
    alert("📜 拾獲地面紙條！上面潦草寫著：『14:38 北車站閘門碰面』！正式列入線索！");
    gameState.cluesFound = Math.min(3, gameState.cluesFound + 1);
    document.getElementById("clueCount").innerText = gameState.cluesFound;
    gameState.quests.clues = true;
    updateQuestProgress();
  }
}

/* ─── 8. 專屬私服器 (WebSocket) 客戶端同步 ─── */
let socket = null;
const remotePlayers = new Map();
let isOnlineWithServer = false;

function initPrivateServerConnection() {
  // 如果當前是在 HTTPS (例如 GitHub Pages)，不強制連線未加密 ws:// 以防瀏覽器拋出安全性阻擋
  if (location.protocol === "https:") {
    console.log("[WS] 運行於 HTTPS 環境，自動啟用同儕偵探模擬模式！");
    spawnSimulatedClassmates();
    document.getElementById("serverStatusDot").innerText = "🟢";
    document.getElementById("serverStatusText").innerText = "GitHub Pages 共享世界";
    return;
  }

  const url = `ws://${location.host || 'localhost:3000'}`;
  try {
    socket = new WebSocket(url);

    socket.onopen = () => {
      isOnlineWithServer = true;
      document.getElementById("serverStatusDot").innerText = "🟢";
      document.getElementById("serverStatusText").innerText = "私服器已連線";

      socket.send(JSON.stringify({
        type: 'join',
        nickname: gameState.nickname,
        badge: '🌟 偵探新手'
      }));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (err) {}
    };

    socket.onclose = () => {
      isOnlineWithServer = false;
      document.getElementById("serverStatusDot").innerText = "🟡";
      document.getElementById("serverStatusText").innerText = "單機模式 (同儕模擬)";
      spawnSimulatedClassmates();
    };

    socket.onerror = () => {
      spawnSimulatedClassmates();
    };
  } catch (e) {
    spawnSimulatedClassmates();
  }
}

function handleServerMessage(msg) {
  if (msg.type === 'init') {
    document.getElementById("serverStatusText").innerText = `私服器在線: ${msg.onlineCount} 人`;
    msg.players.forEach(p => addRemotePlayer(p));
  }
  else if (msg.type === 'player_join') {
    document.getElementById("serverStatusText").innerText = `私服器在線: ${msg.onlineCount} 人`;
    addRemotePlayer(msg.player);
    appendChatMessage("[系統]", `同學 ${msg.player.nickname} 進入了雙北 3D 世界！`);
  }
  else if (msg.type === 'player_move') {
    const rChar = remotePlayers.get(msg.id);
    if (rChar) {
      rChar.group.position.set(msg.x, msg.y, msg.z);
      rChar.group.rotation.y = msg.rotY;
      if (msg.bubble) rChar.updateSprite(rChar.nickname, msg.bubble);
    }
  }
  else if (msg.type === 'chat_broadcast') {
    appendChatMessage(msg.nickname, msg.text);
    const rChar = remotePlayers.get(msg.id);
    if (rChar) rChar.updateSprite(msg.nickname, msg.text);
    if (msg.id === 'local') localPlayer.updateSprite(gameState.nickname, msg.text);
  }
  else if (msg.type === 'breaking_news') {
    showBreakingNews(`${msg.solver} 率先破獲了【${msg.title}】！`);
    playVictoryFanfare();
  }
  else if (msg.type === 'player_leave') {
    removeRemotePlayer(msg.id);
    document.getElementById("serverStatusText").innerText = `私服器在線: ${msg.onlineCount} 人`;
  }
}

function addRemotePlayer(data) {
  if (remotePlayers.has(data.id)) return;
  const rChar = createDetectiveCharacter(false, data.nickname);
  rChar.nickname = data.nickname;
  rChar.group.position.set(data.x || 0, data.y || 0, data.z || 0);
  scene.add(rChar.group);
  remotePlayers.set(data.id, rChar);
}

function removeRemotePlayer(id) {
  const rChar = remotePlayers.get(id);
  if (rChar) {
    scene.remove(rChar.group);
    remotePlayers.delete(id);
  }
}

// 模擬同學偵探遊走
function spawnSimulatedClassmates() {
  if (remotePlayers.size > 0) return;
  const classmates = [
    { id: 'bot_1', nickname: "少年偵探_小涵", x: -15, z: 8, vx: 0.05 },
    { id: 'bot_2', nickname: "少年偵探_益碩", x: 20, z: 6, vx: -0.04 }
  ];
  classmates.forEach(c => addRemotePlayer(c));

  setInterval(() => {
    classmates.forEach(c => {
      const rChar = remotePlayers.get(c.id);
      if (rChar) {
        c.x += c.vx;
        if (c.x > 30 || c.x < -30) c.vx *= -1;
        rChar.group.position.x = c.x;
        rChar.group.rotation.y = c.vx > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    });
  }, 100);
}

setInterval(() => {
  if (isOnlineWithServer && socket && socket.readyState === WebSocket.OPEN) {
    const p = localPlayer.group;
    socket.send(JSON.stringify({
      type: 'move',
      x: Number(p.position.x.toFixed(2)),
      y: Number(p.position.y.toFixed(2)),
      z: Number(p.position.z.toFixed(2)),
      rotY: Number(p.rotation.y.toFixed(2)),
      state: 'walk',
      bubble: gameState.currentBubble
    }));
  }
}, 80);

/* ─── 9. 多人聊天室與全服快報 ─── */
function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  gameState.currentBubble = text;
  localPlayer.updateSprite(gameState.nickname, text);

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

/* ─── 10. 遊戲主線劇情、超商補給與對質破案 ─── */
function buyTeaEgg() {
  if (gameState.money < 13) {
    alert("悠遊卡餘額不足 $13 囉！");
    return;
  }
  gameState.money -= 13;
  gameState.stamina = Math.min(100, gameState.stamina + 25);
  updateBars();
  playTone(650, 'sine', 0.1);
  alert("🥚 成功購買熱騰騰茶葉蛋！體力 +25！店員溫馨提醒小心燙～響應環保不拿衛生紙！");

  gameState.quests.store = true;
  updateQuestProgress();
}

function buyDrink() {
  if (gameState.money < 25) {
    alert("餘額不足！");
    return;
  }
  gameState.money -= 25;
  gameState.mood = Math.min(100, gameState.mood + 20);
  updateBars();
  playTone(700, 'sine', 0.1);
  alert("🧃 喝了冰涼的蜜豆奶！心情值大振 +20！");
}

function buySkateboard() {
  if (gameState.money < 300) {
    alert("生活金不足 $300！快解開案件領取委託金吧！");
    return;
  }
  gameState.money -= 300;
  gameState.hasSkateboard = true;
  localPlayer.board.visible = true;
  document.getElementById("btnSkateboard").innerText = "已裝備";
  document.getElementById("btnSkateboard").disabled = true;
  playTone(850, 'triangle', 0.15);
  alert("🛹 成功裝備【柯南極速滑板】！3D 奔跑移動速度大幅提升 60%！");
}

function buySnack(type, price) {
  if (gameState.money < price) {
    alert(`金額不足 $${price}！`);
    return;
  }
  gameState.money -= price;
  gameState.stamina = 100;
  gameState.mood = 100;
  updateBars();
  playTone(800, 'sine', 0.15);
  alert(type === 'chicken' ? "🍗 九層塔香酥鹽酥雞太香了！體力與心情全部補滿！" : "🐙 濃郁章魚燒入口即化！精神百倍！");
  closeModal('nightMarketModal');
}

function confrontSuspect(choice) {
  closeModal('interrogateModal');
  if (choice === 'easycard') {
    playSlapSound();
    alert("💥【筆錄打臉成功！】\n出示 TIB 悠遊卡數據：嫌犯於 14:38 在台北車站出站扣款 $30！\n黑帽嫌疑人臉色慘白：「我…我認罪！公事包我藏在月台後方了！」");

    gameState.quests.arrest = true;
    updateQuestProgress();

    if (isOnlineWithServer && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'case_solved',
        title: '台北車站失竊案'
      }));
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
  if (gameState.quests.clues) document.getElementById("qcClues").className = "quest-check done";
  if (gameState.quests.store) document.getElementById("qcStore").className = "quest-check done";
  if (gameState.quests.tib) document.getElementById("qcTib").className = "quest-check done";
  if (gameState.quests.arrest) document.getElementById("qcArrest").className = "quest-check done";
}

function updateBars() {
  document.getElementById("barStamina").style.width = gameState.stamina + "%";
  document.getElementById("txtStamina").innerText = `${gameState.stamina}/100`;
  document.getElementById("barMood").style.width = gameState.mood + "%";
  document.getElementById("txtMood").innerText = `${gameState.mood}/100`;
}

/* ─── 11. 天氣切換與防嚇馬賽克濾鏡 ─── */
function toggleWeather() {
  const icon = document.getElementById("weatherIcon");
  const text = document.getElementById("weatherTimeText");

  if (gameState.weather === 'sunny') {
    gameState.weather = 'sunset';
    scene.background.setHex(0xf97316);
    scene.fog.color.setHex(0xf97316);
    sunLight.color.setHex(0xfdba74);
    sunLight.intensity = 0.7;
    icon.innerText = "🌇";
    text.innerText = "夕 16°C 傍晚 05:40";
  } else if (gameState.weather === 'sunset') {
    gameState.weather = 'night';
    scene.background.setHex(0x030712);
    scene.fog.color.setHex(0x030712);
    sunLight.color.setHex(0x38bdf8);
    sunLight.intensity = 0.25;
    icon.innerText = "🌃";
    text.innerText = "夜 13°C 晚上 07:42";
  } else {
    gameState.weather = 'sunny';
    scene.background.setHex(0x87ceeb);
    scene.fog.color.setHex(0x87ceeb);
    sunLight.color.setHex(0xfffaed);
    sunLight.intensity = 0.95;
    icon.innerText = "☀️";
    text.innerText = "晴 14°C 下午 03:42";
  }
  playTone(500, 'sine', 0.05);
}

function toggleMosaic() {
  gameState.mosaic = !gameState.mosaic;
  const box = document.getElementById("webgl-container");
  const lbl = document.getElementById("lblMosaic");
  if (gameState.mosaic) {
    box.classList.add("mosaic-mode");
    lbl.innerText = "馬賽克:開";
  } else {
    box.classList.remove("mosaic-mode");
    lbl.innerText = "馬賽克:關";
  }
  playTone(600, 'sine', 0.05);
}

/* ─── 12. 彈窗控制器 ─── */
function openStoreModal() { document.getElementById("storeModal").style.display = "flex"; }
function openNightMarketModal() { document.getElementById("nightMarketModal").style.display = "flex"; }
function openTibModal() {
  document.getElementById("tibModal").style.display = "flex";
  gameState.quests.tib = true;
  updateQuestProgress();
}
function openInterrogateModal() { document.getElementById("interrogateModal").style.display = "flex"; }
function openVictoryModal() { document.getElementById("victoryModal").style.display = "flex"; }
function openCluesModal() { document.getElementById("cluesModal").style.display = "flex"; }
function openMapModal() { document.getElementById("mapModal").style.display = "flex"; }
function openCodexModal() { document.getElementById("codexModal").style.display = "flex"; }
function openServerModal() { document.getElementById("serverModal").style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }

function reconnectCustomServer() {
  const url = document.getElementById("wsServerInput").value.trim();
  if (url) {
    if (socket) socket.close();
    try {
      socket = new WebSocket(url);
      socket.onopen = () => {
        isOnlineWithServer = true;
        document.getElementById("serverStatusDot").innerText = "🟢";
        document.getElementById("serverStatusText").innerText = "已連線自訂私服";
        alert("🎉 成功連線至私服器：" + url);
      };
    } catch (e) {
      alert("連線失敗：" + e.message);
    }
    closeModal('serverModal');
  }
}

/* ─── 13. 自適應視窗縮放與主渲染循環 ─── */
window.addEventListener("resize", () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

function animate() {
  requestAnimationFrame(animate);
  updateLocalMovement();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}
animate();

// 啟動連線嘗試
initPrivateServerConnection();
