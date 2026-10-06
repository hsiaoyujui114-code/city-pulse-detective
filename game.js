/**
 * ==========================================================================
 * 《雙北漫遊偵探：都會行蹤》✕《城市脈動：通勤偵探》
 * 3D 核心遊戲邏輯 ✕ Three.js 引擎 ✕ 專屬私服器 (WebSocket) 多人同步
 * ==========================================================================
 */

/* ─── 1. Web Audio API 音效引擎 ─── */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq = 440, type = 'sine', duration = 0.08, gainVal = 0.1) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn("Audio play blocked", e);
  }
}

// 台北捷運進站四音階 (G4, B4, D5, G5)
function playMrtChime() {
  const notes = [392, 493.88, 587.33, 783.99];
  notes.forEach((freq, idx) => {
    setTimeout(() => playTone(freq, 'triangle', 0.28, 0.15), idx * 170);
  });
}

// 案件勝利號角
function playVictoryFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, idx) => {
    setTimeout(() => playTone(freq, 'sine', 0.2, 0.2), idx * 130);
  });
}

// 呈堂證供打臉音效
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
  weather: 'sunny', // 'sunny', 'sunset', 'night'
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

/* ─── 3. Three.js 3D 場景初始化 ─── */
const container = document.getElementById("webgl-container");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // 晴天天空藍
scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// 光照系統
const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffaed, 0.9);
sunLight.position.set(40, 70, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 200;
const d = 50;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
scene.add(sunLight);

/* ─── 4. 建立 3D 台北街區 (Taipei Urban Environment) ─── */
// 地面道路與人行道
const roadMat = new THREE.MeshLambertMaterial({ color: 0x22262c });
const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0xc8cdd4 });
const curbMat = new THREE.MeshLambertMaterial({ color: 0xd90429 }); // 台灣街頭紅線

// 大馬路 (寬度 18m)
const roadGeo = new THREE.PlaneGeometry(160, 20);
const roadMesh = new THREE.Mesh(roadGeo, roadMat);
roadMesh.rotation.x = -Math.PI / 2;
roadMesh.receiveShadow = true;
scene.add(roadMesh);

// 斑馬線斑紋 (Zebra Crossing)
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
northWalk.position.set(0, 0.1, 22.5);
northWalk.receiveShadow = true;
scene.add(northWalk);

// 南側人行道
const southWalk = new THREE.Mesh(new THREE.PlaneGeometry(160, 25), sidewalkMat);
southWalk.rotation.x = -Math.PI / 2;
southWalk.position.set(0, 0.1, -22.5);
southWalk.receiveShadow = true;
scene.add(southWalk);

// 遠景：台北 101 大樓 (Taipei 101 Skyline)
function buildTaipei101() {
  const t101Group = new THREE.Group();
  const mat101 = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });

  // 基座
  const base = new THREE.Mesh(new THREE.BoxGeometry(10, 25, 10), mat101);
  base.position.y = 12.5;
  t101Group.add(base);

  // 8 個斗狀倒梯形塔節
  for (let i = 0; i < 8; i++) {
    const sec = new THREE.Mesh(new THREE.BoxGeometry(9.2 - i * 0.3, 7, 9.2 - i * 0.3), glassMat);
    sec.position.y = 25 + i * 7.5;
    t101Group.add(sec);
  }
  // 塔尖尖塔
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2, 20, 8), mat101);
  spire.position.y = 95;
  t101Group.add(spire);

  t101Group.position.set(35, 0, -110);
  scene.add(t101Group);
}
buildTaipei101();

// 互動目標列表
const interactables = [];

// 輔助函式：建立具發光招牌的 3D 建築
function createBuilding(x, z, w, h, d, mainColor, signText, signColor = 0x00d2ff, type = "") {
  const group = new THREE.Group();
  const bMat = new THREE.MeshLambertMaterial({ color: mainColor });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bMat);
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // 門面發光玻璃窗
  const winMat = new THREE.MeshLambertMaterial({ color: 0x1e293b, emissive: 0x0f2744 });
  const windowPane = new THREE.Mesh(new THREE.BoxGeometry(w * 0.75, h * 0.45, 0.2), winMat);
  windowPane.position.set(0, h * 0.3, d / 2 + 0.1);
  group.add(windowPane);

  // 招牌
  const signMesh = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.9, 2.2, 0.4),
    new THREE.MeshLambertMaterial({ color: signColor, emissive: signColor, emissiveIntensity: 0.3 })
  );
  signMesh.position.set(0, h * 0.65, d / 2 + 0.25);
  group.add(signMesh);

  group.position.set(x, 0, z);
  scene.add(group);

  if (type) {
    interactables.push({
      x: x,
      z: z + d / 2 + 2,
      r: 4.5,
      type: type,
      label: signText
    });
  }
  return group;
}

// 1. 全家 FamilyMart (經典綠白藍)
const fMart = createBuilding(-25, 24, 16, 9, 12, 0xf1f5f9, "進入全家便利商店 (買茶葉蛋)", 0x10b981, "familymart");
// 綠白藍標籤條
const fmStripe = new THREE.Mesh(
  new THREE.BoxGeometry(15, 0.8, 0.5),
  new THREE.MeshBasicMaterial({ color: 0x0284c7 })
);
fmStripe.position.set(0, 6.8, 6.2);
fMart.add(fmStripe);

// 2. 台北車站站前大廳 (Taipei Main Station)
createBuilding(18, 26, 28, 14, 16, 0x475569, "調查台北車站失竊現場", 0x38bdf8, "station");

// 3. 寧夏夜市美食小吃攤 (鹽酥雞 & 章魚燒)
const foodStall = new THREE.Group();
const stallBody = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 4), new THREE.MeshLambertMaterial({ color: 0x78350f }));
stallBody.position.y = 2;
stallBody.castShadow = true;
foodStall.add(stallBody);
// 遮陽棚紅黃相間
const canopy = new THREE.Mesh(new THREE.BoxGeometry(7, 0.6, 5), new THREE.MeshLambertMaterial({ color: 0xd90429 }));
canopy.position.y = 4.2;
foodStall.add(canopy);
// 紅燈籠
const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), new THREE.MeshLambertMaterial({ color: 0xef4444, emissive: 0xef4444 }));
lantern.position.set(-2.5, 3.8, 2.2);
foodStall.add(lantern);
foodStall.position.set(-50, 0, 20);
scene.add(foodStall);
interactables.push({ x: -50, z: 23, r: 4, type: "nightmarket", label: "品嚐夜市美食 (鹽酥雞 / 章魚燒)" });

// 4. 警局巡邏車與警戒線 (Police Cruiser Crime Scene)
const policeCar = new THREE.Group();
const carBody = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.8, 6.5), new THREE.MeshLambertMaterial({ color: 0x111827 }));
carBody.position.y = 1.2;
policeCar.add(carBody);
const carCabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 3.6), new THREE.MeshLambertMaterial({ color: 0xffffff }));
carCabin.position.set(0, 2.2, -0.4);
policeCar.add(carCabin);
// 紅藍警笛爆閃燈
const strobeRed = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
strobeRed.position.set(-0.7, 3.0, -0.4);
policeCar.add(strobeRed);
const strobeBlue = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
strobeBlue.position.set(0.7, 3.0, -0.4);
policeCar.add(strobeBlue);
policeCar.position.set(38, 0, 18);
policeCar.rotation.y = -0.3;
scene.add(policeCar);
interactables.push({ x: 38, z: 18, r: 5, type: "police", label: "與巡警會合，進行筆錄打臉逮捕" });

// 5. 黃色計程車 (Yellow Taxi)
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

// 6. 地面神祕失竊暗號紙條 (Ground Clue)
const clueMarker = new THREE.Mesh(
  new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16),
  new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
);
clueMarker.position.set(-8, 0.1, 18);
scene.add(clueMarker);
interactables.push({ x: -8, z: 18, r: 3.5, type: "clue_ground", label: "翻查花圃旁神祕暗號紙條" });

// 街道路燈與暖光
function addStreetLamp(x, z) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 8), new THREE.MeshLambertMaterial({ color: 0x334155 }));
  pole.position.set(x, 4, z);
  scene.add(pole);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
  head.position.set(x, 8, z);
  scene.add(head);
  const light = new THREE.PointLight(0xfef08a, 0.8, 18);
  light.position.set(x, 7.8, z);
  scene.add(light);
}
addStreetLamp(-35, 12);
addStreetLamp(0, 12);
addStreetLamp(35, 12);
addStreetLamp(-35, -12);
addStreetLamp(0, -12);
addStreetLamp(35, -12);

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
addTree(55, 14);
addTree(-60, 14);

/* ─── 5. 3D 少年偵探主角模型 (Detective Avatar) ─── */
function createDetectiveCharacter(isLocal = true, name = "小偵探") {
  const group = new THREE.Group();

  // 身體 (棕色風衣／連帽外套)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.4, 0.7),
    new THREE.MeshLambertMaterial({ color: isLocal ? 0xb45309 : 0x1d4ed8 })
  );
  body.position.y = 1.4;
  body.castShadow = true;
  group.add(body);

  // 背包 (深黑藍色背包)
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

  // 偵探帽 (獵鹿帽 / 棒球帽)
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

  // 滑板 (預設隱藏，解鎖後顯示)
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
    // 氣泡背景
    ctxText.fillStyle = "rgba(10, 25, 50, 0.9)";
    ctxText.strokeStyle = isLocal ? "#00d2ff" : "#34d399";
    ctxText.lineWidth = 4;
    ctxText.beginPath();
    ctxText.roundRect(10, 10, 236, 60, 16);
    ctxText.fill();
    ctxText.stroke();

    ctxText.fillStyle = "#ffffff";
    ctxText.font = "bold 22px sans-serif";
    ctxText.textAlign = "center";
    ctxText.fillText(bubbleText || "🔍 巡視中", 128, 48);

    // 暱稱
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
localPlayer.group.position.set(0, 0, 8);
scene.add(localPlayer.group);

/* ─── 6. 鍵盤移動與平滑跟隨第三人稱相機 ─── */
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

// 滑鼠拖曳旋轉視角
let isDragging = false;
let prevMouseX = 0;
let cameraYaw = 0; // 水平環繞角度
let cameraPitch = 0.35; // 垂直仰角
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
  let moving = false;

  let moveX = 0;
  let moveZ = 0;

  if (keys["w"] || keys["arrowup"]) moveZ -= 1;
  if (keys["s"] || keys["arrowdown"]) moveZ += 1;
  if (keys["a"] || keys["arrowleft"]) moveX -= 1;
  if (keys["d"] || keys["arrowright"]) moveX += 1;

  if (moveX !== 0 || moveZ !== 0) {
    moving = true;
    // 依據相機視角轉換移動向量
    const angle = Math.atan2(moveX, moveZ) + cameraYaw;
    p.position.x += Math.sin(angle) * spd;
    p.position.z += Math.cos(angle) * spd;
    p.rotation.y = angle;

    // 走路腿部擺動
    walkCycle += 0.22;
    localPlayer.leftLeg.rotation.x = Math.sin(walkCycle) * 0.6;
    localPlayer.rightLeg.rotation.x = -Math.sin(walkCycle) * 0.6;

    // 步行動畫音效 (輕柔晶片音)
    if (Math.floor(walkCycle) % 6 === 0) {
      playTone(200, 'square', 0.03, 0.02);
    }
  } else {
    localPlayer.leftLeg.rotation.x = 0;
    localPlayer.rightLeg.rotation.x = 0;
  }

  // 邊界限制
  p.position.x = Math.max(-75, Math.min(75, p.position.x));
  p.position.z = Math.max(-25, Math.min(30, p.position.z));

  // 相機平滑跟隨
  const targetCamX = p.position.x + Math.sin(cameraYaw) * cameraDistance;
  const targetCamZ = p.position.z + Math.cos(cameraYaw) * cameraDistance;
  const targetCamY = p.position.y + Math.sin(cameraPitch) * cameraDistance + 2.5;

  camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.12);
  camera.lookAt(p.position.x, p.position.y + 1.8, p.position.z);

  // 檢查是否有靠近可互動目標
  checkProximityToInteractables(p.position);
}

/* ─── 7. 接近互動偵測 ─── */
const interactPrompt = document.getElementById("interactPrompt");
const interactLabel = document.getElementById("interactLabel");

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
  } else {
    gameState.activeInteractTarget = null;
    interactPrompt.style.display = "none";
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
  }
}

/* ─── 8. 專屬私服器 (WebSocket) 客戶端同步 ─── */
let socket = null;
const remotePlayers = new Map(); // id -> Three.js Character
let isOnlineWithServer = false;

function initPrivateServerConnection(url = "ws://localhost:3000") {
  // 自動適應當前主機
  if (!url && location.protocol === "http:") {
    url = `ws://${location.host}`;
  }

  try {
    socket = new WebSocket(url);

    socket.onopen = () => {
      isOnlineWithServer = true;
      document.getElementById("serverStatusDot").innerText = "🟢";
      document.getElementById("serverStatusText").innerText = "私服器已連線";
      console.log("[WS] 成功連入專屬私服器！");

      // 發送加入事件
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
      } catch (err) {
        console.error(err);
      }
    };

    socket.onclose = () => {
      isOnlineWithServer = false;
      document.getElementById("serverStatusDot").innerText = "🟡";
      document.getElementById("serverStatusText").innerText = "單機模式 (同儕模擬)";
      spawnSimulatedClassmates();
    };

    socket.onerror = () => {
      socket.close();
    };
  } catch (e) {
    spawnSimulatedClassmates();
  }
}

function handleServerMessage(msg) {
  if (msg.type === 'init') {
    document.getElementById("serverStatusText").innerText = `私服器在線: ${msg.onlineCount} 人`;
    // 渲染已存在的其他同學角色
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

// 模擬同學偵探 (當 GitHub Pages 靜態無私服器時自動遊走)
function spawnSimulatedClassmates() {
  if (remotePlayers.size > 0) return;
  const classmates = [
    { id: 'bot_1', nickname: "少年偵探_小涵", x: -15, z: 12, vx: 0.05 },
    { id: 'bot_2', nickname: "少年偵探_益碩", x: 25, z: 10, vx: -0.04 }
  ];
  classmates.forEach(c => {
    addRemotePlayer(c);
  });

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

// 定時向伺服器廣播座標 (每 80ms)
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

    // 廣播全服號外
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
    scene.background.setHex(0xf97316); // 夕陽橘
    scene.fog.color.setHex(0xf97316);
    sunLight.color.setHex(0xfdba74);
    sunLight.intensity = 0.7;
    icon.innerText = "🌇";
    text.innerText = "夕 16°C 傍晚 05:40";
  } else if (gameState.weather === 'sunset') {
    gameState.weather = 'night';
    scene.background.setHex(0x030712); // 夜晚深黑
    scene.fog.color.setHex(0x030712);
    sunLight.color.setHex(0x38bdf8);
    sunLight.intensity = 0.25;
    icon.innerText = "🌃";
    text.innerText = "夜 13°C 晚上 07:42";
  } else {
    gameState.weather = 'sunny';
    scene.background.setHex(0x87ceeb); // 晴天藍
    scene.fog.color.setHex(0x87ceeb);
    sunLight.color.setHex(0xfffaed);
    sunLight.intensity = 0.9;
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
    initPrivateServerConnection(url);
    closeModal('serverModal');
  }
}

/* ─── 13. 視窗縮放自適應與主渲染循環 ─── */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  updateLocalMovement();
  renderer.render(scene, camera);
}
animate();

// 啟動連線嘗試
initPrivateServerConnection();
