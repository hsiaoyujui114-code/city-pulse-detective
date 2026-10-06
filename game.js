/* ==========================================================================
   《雙北漫遊偵探：都會行蹤》✕《城市脈動：通勤偵探》
   完整遊戲邏輯與交互核心 (純前端 Vanilla JS / 零依賴)
   ========================================================================== */

/* ─── 1. Web Audio API 音效合成引擎 ─── */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep(freq = 440, type = 'sine', duration = 0.08, gainVal = 0.1) {
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
    console.warn("Audio not allowed yet", e);
  }
}

// 台北捷運進站四音階廣播 (G4, B4, D5, G5)
function playMrtChime() {
  const notes = [392, 493.88, 587.33, 783.99];
  notes.forEach((freq, idx) => {
    setTimeout(() => playBeep(freq, 'triangle', 0.28, 0.15), idx * 170);
  });
}

// 破案勝利號角
function playVictoryChime() {
  const melody = [523.25, 659.25, 783.99, 1046.50];
  melody.forEach((freq, idx) => {
    setTimeout(() => playBeep(freq, 'sine', 0.22, 0.2), idx * 130);
  });
}

// 呈堂證供「筆錄打臉」震撼音效
function playSlapSound() {
  playBeep(150, 'sawtooth', 0.15, 0.3);
  setTimeout(() => playBeep(880, 'square', 0.25, 0.2), 80);
}

// 錯誤蜂鳴音
function playBuzzer() {
  playBeep(180, 'sawtooth', 0.2, 0.25);
  setTimeout(() => playBeep(150, 'sawtooth', 0.2, 0.25), 180);
}

/* ─── 2. 遊戲全局狀態 (Game State) ─── */
const gameState = {
  money: 200,
  teaEggs: 0,
  rep: 0,
  speed: 3.6,
  hasCoat: false,
  hasBoard: false,
  hasGlass: false,
  currentLocation: 'ximen', // 'ximen', 'tpe_station', 'office'
  weather: 'rain', // 'clear', 'rain', 'night'
  mosaic: false,
  clues: {
    easycard: true, // 初始已從 TIB 獲取
    ph: false,
    cctv: false,
    glove: false
  },
  caseProgress: {
    phTested: false,
    zhangDefeated: false,
    xuDefeated: false,
    chaseSteps: [false, false, false],
    solved: false
  },
  player: {
    x: 400,
    y: 280,
    targetX: null,
    targetY: null,
    size: 20,
    dir: 'down',
    stepCounter: 0
  }
};

/* ─── 3. 雙北地圖場景定義 ─── */
const scenes = {
  ximen: {
    name: "西門町中華路商圈",
    bgColor: "#090d16",
    streetName: "中華路一段 ✕ 成都路口",
    buildings: [
      { x: 50, y: 70, w: 200, h: 90, color: "#1e293b", stroke: "#0284c7", label: "☕ 連鎖咖啡店 (案發現場)", type: "cafe" },
      { x: 290, y: 70, w: 180, h: 90, color: "#064e3b", stroke: "#10b981", label: "🏪 街角便利商店 (24H)", type: "store" },
      { x: 520, y: 70, w: 220, h: 90, color: "#312e81", stroke: "#818cf8", label: "🚇 捷運西門站 6號出口", type: "mrt" },
      { x: 60, y: 360, w: 160, h: 70, color: "#451a03", stroke: "#f59e0b", label: "🚲 YouBike 2.0 租借站", type: "bike" },
      { x: 600, y: 360, w: 150, h: 70, color: "#1f2937", stroke: "#64748b", label: "🗑️ 峨嵋街暗巷垃圾桶", type: "alley" }
    ],
    npcs: [
      {
        id: "chen",
        x: 230,
        y: 220,
        name: "巡警陳隊長",
        icon: "👮‍♂️",
        greeting: "大偵探早安！今天路上風大要注意安全喔！",
        dialog: "咖啡店裡剛剛有人在拿鐵裡被下毒，我們已經保護現場！調閱 TIB 交通數據並動手化驗咖啡殘留物，就能揪出兇手！"
      },
      {
        id: "zhang",
        x: 150,
        y: 210,
        name: "嫌疑人 張世傑",
        icon: "🧑‍💻",
        greeting: "我…我只是剛好在附近買飲料而已…",
        dialog: "偵探先生，我下午真的在板橋家裡睡覺，悠遊卡根本沒用過！絕對跟我沒關係！"
      },
      {
        id: "cat",
        x: 630,
        y: 330,
        name: "街貓阿巧",
        icon: "🐱",
        greeting: "喵～（磨蹭你的褲管）",
        dialog: "黑貓阿巧剛才在暗巷垃圾桶旁邊發現了一副被匆忙丟棄的手套！"
      }
    ],
    triggers: [
      { x: 150, y: 165, r: 40, type: "cafe", label: "🔬 調查咖啡館命案現場" },
      { x: 380, y: 165, r: 35, type: "store", label: "🏪 進入便利商店 (買茶葉蛋)" },
      { x: 630, y: 165, r: 35, type: "mrt", label: "🚇 進入西門站搭捷運" },
      { x: 675, y: 400, r: 35, type: "alley", label: "🔍 翻查暗巷丟棄物證" }
    ]
  },

  tpe_station: {
    name: "台北車站地下廊道",
    bgColor: "#0f172a",
    streetName: "台北車站 Y 區地下街 ✕ 三鐵共構長廊",
    buildings: [
      { x: 80, y: 80, w: 260, h: 100, color: "#1e3a8a", stroke: "#38bdf8", label: "🚇 台北捷運閘門 (紅/藍線)", type: "mrt" },
      { x: 420, y: 80, w: 280, h: 100, color: "#374151", stroke: "#9ca3af", label: "🚄 高鐵與台鐵轉乘通道", type: "tra" },
      { x: 260, y: 350, w: 280, h: 80, color: "#1f2937", stroke: "#0284c7", label: "🔉 地下街長廊聲學反射點 (300m)", type: "corridor" }
    ],
    npcs: [
      {
        id: "station_master",
        x: 210,
        y: 230,
        name: "站務郭副理",
        icon: "👨‍✈️",
        greeting: "北車大廳人潮眾多，請妥善保管電子票證！",
        dialog: "根據我們閘門後台伺服器紀錄，張世傑的悠遊卡確實於 14:05 在北車閘門刷卡出站！直接擊破他的不在場證明！"
      }
    ],
    triggers: [
      { x: 210, y: 185, r: 40, type: "mrt", label: "🚇 刷卡搭乘捷運" },
      { x: 400, y: 390, r: 40, type: "corridor", label: "🔍 檢視長廊監視器定位" }
    ]
  },

  office: {
    name: "重慶南路偵探事務所",
    bgColor: "#1c1917",
    streetName: "重慶南路一段 45 號 4 樓",
    buildings: [
      { x: 80, y: 80, w: 200, h: 90, color: "#451a03", stroke: "#d97706", label: "🛋️ 慢活皮沙發 (喝水休息)", type: "sofa" },
      { x: 320, y: 80, w: 220, h: 90, color: "#1e293b", stroke: "#06b6d4", label: "📋 案件時序白板", type: "whiteboard" },
      { x: 580, y: 80, w: 160, h: 90, color: "#292524", stroke: "#a8a29e", label: "🚪 走出大門回街頭", type: "door" },
      { x: 120, y: 360, w: 180, h: 70, color: "#064e3b", stroke: "#34d399", label: "🚰 飲水機 (恢復精神)", type: "water" }
    ],
    npcs: [
      {
        id: "assistant",
        x: 430,
        y: 220,
        name: "實習助理 小璇",
        icon: "👩‍💼",
        greeting: "前輩辛苦了！今天雙北各區的案件進度都記錄在白板上了！",
        dialog: "多去超商吃熱騰騰茶葉蛋補充體力，記住結帳不要拿衛生紙，我們要養成環保的好習慣喔！"
      }
    ],
    triggers: [
      { x: 180, y: 175, r: 35, type: "sofa", label: "🛋️ 坐在沙發上放鬆" },
      { x: 430, y: 175, r: 35, type: "whiteboard", label: "📋 查看案件進度白板" },
      { x: 660, y: 175, r: 35, type: "door", label: "🚪 走下樓梯前往西門町" },
      { x: 210, y: 395, r: 35, type: "water", label: "🚰 點擊飲水機喝水" }
    ]
  }
};

/* ─── 4. Canvas 繪製系統 ─── */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function drawScene() {
  const cur = scenes[gameState.currentLocation];

  // 繪製背景
  ctx.fillStyle = cur.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 繪製地磚網格 (賽博都會脈動風格)
  ctx.strokeStyle = "rgba(56, 189, 248, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // 繪製道路中央分隔線與街區光暈
  ctx.strokeStyle = "rgba(251, 191, 36, 0.2)";
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(0, 270);
  ctx.lineTo(canvas.width, 270);
  ctx.stroke();
  ctx.setLineDash([]);

  // 繪製街道路名提示
  ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("📍 " + cur.streetName, 20, 25);

  // 繪製建築物件
  cur.buildings.forEach(b => {
    // 建築投影
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(b.x + 4, b.y + 4, b.w, b.h);

    // 本體
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // 外框霓虹線
    ctx.strokeStyle = b.stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);

    // 標籤
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 12.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 5);
  });

  // 繪製調查光圈
  cur.triggers.forEach(t => {
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
    ctx.fill();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 10.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t.label, t.x, t.y + t.r + 14);
  });

  // 繪製 NPC 與頭頂打招呼氣泡
  const p = gameState.player;
  cur.npcs.forEach(npc => {
    // 圖標
    ctx.font = "26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(npc.icon, npc.x, npc.y);

    // 名字標籤
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(npc.name, npc.x, npc.y + 16);

    // 距離偵測：靠近時浮現問候氣泡
    const dist = Math.hypot(p.x - npc.x, p.y - npc.y);
    if (dist < 80) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.2;
      const bubbleW = Math.min(180, npc.greeting.length * 13 + 16);
      ctx.beginPath();
      ctx.roundRect(npc.x - bubbleW / 2, npc.y - 48, bubbleW, 22, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#e0f2fe";
      ctx.font = "11px sans-serif";
      ctx.fillText(npc.greeting, npc.x, npc.y - 33);
    }
  });

  // 繪製主角 (少年大偵探 2D 像素造型)
  ctx.save();
  ctx.translate(p.x, p.y);

  // 影子
  ctx.beginPath();
  ctx.ellipse(0, 10, 10, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fill();

  // 若裝備電動滑板：繪製滑板
  if (gameState.hasBoard) {
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.roundRect(-14, 8, 28, 5, 2);
    ctx.fill();
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(-12, 12, 4, 3);
    ctx.fillRect(8, 12, 4, 3);
  }

  // 身體 (若買風衣呈英倫棕色，否則呈深藍校服)
  ctx.fillStyle = gameState.hasCoat ? "#b45309" : "#1d4ed8";
  ctx.fillRect(-8, -10, 16, 18);

  // 頭部
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.arc(0, -14, 8, 0, Math.PI * 2);
  ctx.fill();

  // 帽子 (風衣配雙層獵鹿帽，平時配深藍小學生偵探帽)
  if (gameState.hasCoat) {
    ctx.fillStyle = "#78350f";
    ctx.fillRect(-10, -25, 20, 6);
  } else {
    ctx.fillStyle = "#1e3a8a";
    ctx.fillRect(-9, -23, 18, 5);
  }

  // 偵探狀態氣泡 (頭頂名牌)
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-24, -38, 48, 14, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 9.5px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("小偵探", 0, -27);

  ctx.restore();
}

/* ─── 5. 鍵盤、滑鼠點擊與移動循環 ─── */
const keys = {};
window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === " " || e.key === "Enter") {
    checkInteraction();
  }
});
window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

// 滑鼠/觸控點擊畫布移動
canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  gameState.player.targetX = (e.clientX - rect.left) * scaleX;
  gameState.player.targetY = (e.clientY - rect.top) * scaleY;
});

function updatePlayer() {
  const p = gameState.player;
  const spd = gameState.speed;
  let moved = false;

  // 鍵盤移動
  if (keys["w"] || keys["arrowup"]) { p.y -= spd; p.dir = "up"; moved = true; p.targetX = null; }
  if (keys["s"] || keys["arrowdown"]) { p.y += spd; p.dir = "down"; moved = true; p.targetX = null; }
  if (keys["a"] || keys["arrowleft"]) { p.x -= spd; p.dir = "left"; moved = true; p.targetX = null; }
  if (keys["d"] || keys["arrowright"]) { p.x += spd; p.dir = "right"; moved = true; p.targetX = null; }

  // 點擊目標自動走步
  if (p.targetX !== null && p.targetY !== null) {
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 4) {
      p.x += (dx / dist) * spd;
      p.y += (dy / dist) * spd;
      moved = true;
    } else {
      p.targetX = null;
      p.targetY = null;
    }
  }

  // 邊界防溢出
  p.x = Math.max(25, Math.min(canvas.width - 25, p.x));
  p.y = Math.max(30, Math.min(canvas.height - 25, p.y));

  if (moved) {
    p.stepCounter++;
    if (p.stepCounter % 18 === 0) {
      playBeep(260, 'square', 0.03, 0.04);
    }
  }
}

function gameLoop() {
  updatePlayer();
  drawScene();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

/* ─── 6. 互動判斷 (靠近 NPC 或 調查點) ─── */
function checkInteraction() {
  const p = gameState.player;
  const cur = scenes[gameState.currentLocation];

  // 檢查是否靠近 NPC
  for (const npc of cur.npcs) {
    const dist = Math.hypot(p.x - npc.x, p.y - npc.y);
    if (dist < 55) {
      playBeep(480, 'sine', 0.1);
      showDialog(npc.icon, npc.name, npc.dialog);
      return;
    }
  }

  // 檢查是否靠近調查光圈
  for (const trg of cur.triggers) {
    const dist = Math.hypot(p.x - trg.x, p.y - trg.y);
    if (dist < trg.r + 20) {
      handleTrigger(trg.type);
      return;
    }
  }
}

function handleTrigger(type) {
  playBeep(580, 'triangle', 0.1);
  if (type === "cafe") {
    openForensicsModal();
  } else if (type === "store") {
    openStoreModal();
  } else if (type === "mrt") {
    openTransitModal();
  } else if (type === "alley") {
    gameState.clues.glove = true;
    updateClueCount();
    showDialog("🧤", "峨嵋街暗巷垃圾桶", "在翻倒的紙箱底層，發現了一雙帶有微量白色草酸結晶的乳膠手套！已正式列入關鍵物證！");
  } else if (type === "door") {
    transitTravel('ximen', '西門町中華路商圈', 0);
  } else if (type === "water") {
    playBeep(660, 'sine', 0.15);
    showDialog("🚰", "事務所飲水機", "喝了一杯甘甜的溫開水，頭腦清晰，推理靈感湧現！");
  } else if (type === "sofa") {
    showDialog("🛋️", "事務所沙發", "坐在老商辦的皮沙發上稍作歇息。聽著台北街頭的車流聲，這就是慢活偵探的生活。");
  } else if (type === "whiteboard") {
    showDialog("📋", "案件時序白板", "白板上貼著：【示範案一：西門町咖啡拿鐵案】、涉案人張世傑與許雅筑、市民大道監視器紀錄。請盡速進行筆錄對質！");
  } else if (type === "corridor") {
    showDialog("🔉", "台北車站長廊聲波反射點", "這裡長達 300 公尺，光滑水泥地面反射聲波，造成回聲延遲誤差！");
  }
}

/* ─── 7. 對話框系統 ─── */
const dialogBox = document.getElementById("dialog-box");
function showDialog(avatar, name, text) {
  document.getElementById("dialogAvatar").innerText = avatar;
  document.getElementById("dialogName").innerHTML = `${name} <span class="tag">互動</span>`;
  document.getElementById("dialogText").innerText = text;
  dialogBox.style.display = "flex";
}
document.getElementById("btnNextDialog").onclick = () => {
  dialogBox.style.display = "none";
};

/* ─── 8. TIB 交通情報控制中心切換邏輯 ─── */
function openTibModal() {
  playBeep(520, 'sine', 0.08);
  document.getElementById("tibModal").style.display = "flex";
}
function switchTibTab(tabKey) {
  playBeep(440, 'triangle', 0.05);
  const tabs = ['easycard', 'cctv', 'traffic', 'timetable'];
  tabs.forEach(t => {
    const el = document.getElementById("tibTab" + capitalize(t));
    if (el) el.style.display = (t === tabKey) ? "block" : "none";
  });
  const btns = document.querySelectorAll(".tib-tab-btn");
  btns.forEach(b => b.classList.remove("active"));
  event.target.classList.add("active");

  if (tabKey === 'cctv') {
    gameState.clues.cctv = true;
    updateClueCount();
  }
}
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ─── 9. 自然科學 pH 廣用試紙實驗 ─── */
function openForensicsModal() {
  document.getElementById("forensicsModal").style.display = "flex";
}
function runPhExperiment() {
  playBeep(700, 'sine', 0.12);
  const strip = document.getElementById("phStrip");
  const resultText = document.getElementById("phResultText");

  // 變色為深紅色 (強酸草酸結晶反應)
  strip.style.backgroundColor = "#b91c1c";
  strip.style.color = "#ffffff";
  strip.innerText = "pH 2.0";
  strip.style.borderColor = "#7f1d1d";

  resultText.innerHTML = "🔴 廣用試紙急遽變為深紅色 (pH 2.0 強酸性)！<br>檢測出高濃度工業除鏽草酸，徹底推翻單純牛奶過敏的說法！";

  gameState.clues.ph = true;
  gameState.caseProgress.phTested = true;
  updateClueCount();
}

/* ─── 10. 筆錄交叉質詢與「物證打臉」對質 ─── */
let selectedClueType = null;
function openInterrogateModal() {
  closeModal('forensicsModal');
  document.getElementById("interrogateModal").style.display = "flex";
}

function selectClue(el, clueType) {
  playBeep(480, 'sine', 0.05);
  document.querySelectorAll(".clue-card").forEach(c => c.classList.remove("selected"));
  el.classList.add("selected");
  selectedClueType = clueType;
}

function submitConfrontation(suspect) {
  if (suspect === 'zhang') {
    if (selectedClueType === 'easycard') {
      playSlapSound();
      alert("💥【打臉成功！】\n出示悠遊卡紀錄：張世傑於 14:05 在台北車站捷運站刷卡出站！\n張世傑臉色煞白：「這…我…我只是去買東西，不是我下毒的！」");
      gameState.caseProgress.zhangDefeated = true;
      checkBothDefeated();
    } else {
      playBuzzer();
      alert("❌ 物證對質錯誤！\n張世傑辯解他的不在場證明，你必須拿出能直接證明他『案發時出現在市中心』的交通票證紀錄！");
    }
  } else if (suspect === 'xu') {
    if (selectedClueType === 'traffic' || selectedClueType === 'ph' || selectedClueType === 'ph2') {
      playSlapSound();
      alert("💥【打臉成功！】\n出示交通數據：市民大道高架嚴重回堵時速 8km/h，開車至少需 55 分鐘！\n許雅筑承認：「我…我其實是搭捷運搶先到了現場，看見張世傑在杯子裡動了手腳…」");
      gameState.caseProgress.xuDefeated = true;
      checkBothDefeated();
    } else {
      playBuzzer();
      alert("❌ 物證不符合！\n許雅筑宣稱開車 15 分鐘暢通無阻，請調閱即時路況數據或強酸化學分析戳破謊言！");
    }
  }
}

function checkBothDefeated() {
  if (gameState.caseProgress.zhangDefeated && gameState.caseProgress.xuDefeated) {
    document.getElementById("confrontResultBox").style.display = "block";
    playVictoryChime();
  }
}

/* ─── 11. 智力交通圍捕逃犯模式 ─── */
function openChaseModal() {
  closeModal('interrogateModal');
  document.getElementById("chaseModal").style.display = "flex";
}

function executeChaseStep(stepIndex) {
  playBeep(640, 'square', 0.12);
  const steps = gameState.caseProgress.chaseSteps;
  steps[stepIndex - 1] = true;

  const btn = document.getElementById("btnChase" + stepIndex);
  btn.innerText = "已執行 ✅";
  btn.disabled = true;
  btn.style.background = "#059669";

  if (steps[0] && steps[1] && steps[2]) {
    document.getElementById("chaseVictoryBox").style.display = "block";
    playVictoryChime();
  }
}

function finalizeCaseVictory() {
  closeModal('chaseModal');
  gameState.caseProgress.solved = true;
  gameState.money += 500;
  gameState.rep += 100;
  updateHUD();

  playVictoryChime();
  showDialog("🎖️", "結案頒獎 —— 交通情報調查局 (TIB)", "恭喜大偵探！成功破獲【西門町咖啡拿鐵毒發案】！獲得 $500 委託金與 100 聲望！關鍵考據已收錄至圖鑑庫！");

  // 更新廣播文字
  document.getElementById("tickerText").innerText = "🎉 號外！雙北小偵探破獲西門町毒發案！追回關鍵機密晶片公事包！";
}

/* ─── 12. 大眾運輸轉乘邏輯 ─── */
function openTransitModal() {
  document.getElementById("transitModal").style.display = "flex";
}

function transitTravel(targetLoc, destName, fare) {
  if (gameState.currentLocation === targetLoc) {
    alert("你目前已經在此地囉！");
    return;
  }
  if (gameState.money < fare) {
    alert(`悠遊卡餘額不足 $${fare}！請先前往超商加值！`);
    return;
  }

  gameState.money -= fare;
  closeModal('transitModal');

  // 車窗轉場特效
  const overlay = document.getElementById("transitOverlay");
  const text = document.getElementById("transitText");
  text.innerText = `列車移動中... 前往【${destName}】（悠遊卡扣款 $${fare}）`;
  overlay.style.display = "flex";
  playMrtChime();

  setTimeout(() => {
    overlay.style.display = "none";
    gameState.currentLocation = targetLoc;
    gameState.player.x = 400;
    gameState.player.y = 280;
    updateHUD();
  }, 2200);
}

/* ─── 13. 便利超商生活互動與購買 ─── */
function openStoreModal() {
  document.getElementById("storeModal").style.display = "flex";
}

function buyTeaEgg() {
  if (gameState.money < 13) {
    alert("悠遊卡餘額不足 $13 囉！");
    return;
  }
  gameState.money -= 13;
  gameState.teaEggs += 1;
  playBeep(720, 'sine', 0.1);
  updateHUD();
  alert("🥚 成功購買熱騰騰茶葉蛋！店員貼心提醒小心燙！響應環保不拿衛生紙～");
}

function topUpCard() {
  gameState.money += 100;
  playBeep(880, 'sine', 0.15);
  updateHUD();
  alert("💳 悠遊卡成功儲值 $100！");
}

function buyShopItem(item, cost) {
  if (gameState.money < cost) {
    alert(`金額不足 $${cost}！快破解案件賺取委託金吧！`);
    return;
  }
  gameState.money -= cost;
  playBeep(800, 'triangle', 0.15);
  if (item === 'board') {
    gameState.hasBoard = true;
    gameState.speed = 5.6;
    document.getElementById("btnBuyBoard").innerText = "已擁有";
    document.getElementById("btnBuyBoard").disabled = true;
    alert("🛹 成功購買【柯南式極速電動滑板】！移動速度大幅提升 60%！");
  } else if (item === 'coat') {
    gameState.hasCoat = true;
    document.getElementById("btnBuyCoat").innerText = "已穿戴";
    document.getElementById("btnBuyCoat").disabled = true;
    alert("🧥 成功購買【福爾摩斯經典獵鹿風衣】！主角造型已換為復古英倫偵探！");
  }
  updateHUD();
}

/* ─── 14. 考據圖鑑與概念海報 ─── */
function openCodexModal() {
  document.getElementById("codexModal").style.display = "flex";
}
function openConceptModal() {
  document.getElementById("conceptModal").style.display = "flex";
}

/* ─── 15. 防嚇馬賽克與天氣切換 ─── */
function toggleMosaic() {
  gameState.mosaic = !gameState.mosaic;
  const btn = document.getElementById("btnMosaic");
  if (gameState.mosaic) {
    canvas.classList.add("mosaic-active");
    btn.innerText = "👁️ 馬賽克: 開";
    btn.style.borderColor = "#ef4444";
  } else {
    canvas.classList.remove("mosaic-active");
    btn.innerText = "👁️ 馬賽克: 關";
    btn.style.borderColor = "#a78bfa";
  }
  playBeep(500, 'sine', 0.05);
}

function toggleWeather() {
  const rain = document.getElementById("rainOverlay");
  const btn = document.getElementById("btnWeather");
  if (gameState.weather === 'clear') {
    gameState.weather = 'rain';
    rain.style.display = 'block';
    btn.innerText = "🌧️ 雨天";
  } else if (gameState.weather === 'rain') {
    gameState.weather = 'night';
    rain.style.display = 'none';
    btn.innerText = "🌃 深夜";
  } else {
    gameState.weather = 'clear';
    rain.style.display = 'none';
    btn.innerText = "☀️ 晴朗";
  }
  playBeep(450, 'sine', 0.05);
}

/* ─── 16. HUD 數值更新 ─── */
function updateHUD() {
  document.getElementById("statMoney").innerText = "$" + gameState.money;
  document.getElementById("statEggs").innerText = gameState.teaEggs + " 顆";
  document.getElementById("statRep").innerText = gameState.rep;
  document.getElementById("hudLocation").innerText = "📍 " + scenes[gameState.currentLocation].name;
}

function updateClueCount() {
  const count = Object.values(gameState.clues).filter(Boolean).length;
  document.getElementById("statClues").innerText = count + " / 4";
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

/* ─── 17. 移動端按鍵綁定 ─── */
const bindBtn = (id, key) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("touchstart", (e) => { e.preventDefault(); keys[key] = true; });
  el.addEventListener("touchend", (e) => { e.preventDefault(); keys[key] = false; });
  el.addEventListener("mousedown", () => { keys[key] = true; });
  el.addEventListener("mouseup", () => { keys[key] = false; });
};
bindBtn("btnUp", "arrowup");
bindBtn("btnDown", "arrowdown");
bindBtn("btnLeft", "arrowleft");
bindBtn("btnRight", "arrowright");

// 初始更新
updateHUD();
updateClueCount();
