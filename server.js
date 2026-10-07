/**
 * 《雙北漫遊偵探：都會行蹤》✕《城市脈動：通勤偵探》
 * 專屬私服器 (Dedicated Private Server) - Node.js + WebSocket
 * 
 * 核心功能：
 * 1. 提供 HTTP 靜態網頁服務 (可直接透過瀏覽器開啟 http://localhost:3000)
 * 2. 提供 WebSocket 即時多人同屏世界同步 (Player Co-Presence)
 * 3. 即時廣播玩家 3D 座標、朝向、步行動畫、頭頂暱稱與動作氣泡
 * 4. 全服破案即時號外推播 (Server-wide Breaking News Broadcast)
 * 5. 線上偵探即時文字與表情廣播
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

// MIME 類型對照表
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 1. 建立 HTTP 伺服器
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(PUBLIC_DIR, reqPath);

  // 安全檢查：防止路徑跳躍
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

// 2. 建立 WebSocket 多人連線私服器
const wss = new WebSocketServer({ server });

// 在線玩家資料字典
const players = new Map();

function broadcast(msgObj, excludeWs = null) {
  const jsonStr = JSON.stringify(msgObj);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      client.send(jsonStr);
    }
  }
}

wss.on('connection', (ws, req) => {
  const playerId = 'det_' + Math.random().toString(36).substring(2, 8);
  const clientIp = req.socket.remoteAddress;

  const playerState = {
    id: playerId,
    nickname: `調查員_${playerId.substring(4)}`,
    badge: '🌟 都會調查員',
    x: 0,
    y: 0,
    z: 0,
    rotY: 0,
    state: 'idle',
    bubble: '🔍 巡視街頭',
    lastSeen: Date.now()
  };

  players.set(ws, playerState);

  console.log(`[+] 玩家連線: ${playerState.nickname} (${playerId}) 來自 ${clientIp} | 目前在線: ${players.size} 人`);

  // 發送初始迎賓包給該玩家
  ws.send(JSON.stringify({
    type: 'init',
    playerId: playerId,
    myState: playerState,
    onlineCount: players.size,
    players: Array.from(players.values()).filter(p => p.id !== playerId)
  }));

  // 向其他人廣播新玩家加入
  broadcast({
    type: 'player_join',
    player: playerState,
    onlineCount: players.size
  }, ws);

  // 接收用戶端訊息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const cur = players.get(ws);
      if (!cur) return;

      if (data.type === 'join') {
        if (data.nickname) cur.nickname = data.nickname.substring(0, 15);
        if (data.badge) cur.badge = data.badge;
        broadcast({
          type: 'player_update',
          player: cur
        });
      }
      else if (data.type === 'move') {
        cur.x = data.x || 0;
        cur.y = data.y || 0;
        cur.z = data.z || 0;
        cur.rotY = data.rotY || 0;
        cur.state = data.state || 'idle';
        cur.bubble = data.bubble || cur.bubble;
        cur.lastSeen = Date.now();

        // 廣播給其他在線玩家更新座標
        broadcast({
          type: 'player_move',
          id: cur.id,
          x: cur.x,
          y: cur.y,
          z: cur.z,
          rotY: cur.rotY,
          state: cur.state,
          bubble: cur.bubble
        }, ws);
      }
      else if (data.type === 'chat') {
        const text = String(data.text || '').substring(0, 80);
        cur.bubble = text;
        broadcast({
          type: 'chat_broadcast',
          id: cur.id,
          nickname: cur.nickname,
          text: text,
          time: new Date().toLocaleTimeString('zh-TW', { hour12: false })
        });
      }
      else if (data.type === 'case_solved') {
        // 全服破案號外即時推播！
        const title = data.title || '雙北失竊懸案';
        console.log(`[🏆 破案快報] ${cur.nickname} 率先破獲了【${title}】！`);
        broadcast({
          type: 'breaking_news',
          solver: cur.nickname,
          title: title,
          timestamp: Date.now()
        });
      }
      else if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', time: Date.now() }));
      }
    } catch (e) {
      console.warn('無效的 WebSocket 訊息格式', e);
    }
  });

  // 玩家斷線清理
  ws.on('close', () => {
    const cur = players.get(ws);
    if (cur) {
      console.log(`[-] 玩家離線: ${cur.nickname} (${cur.id}) | 剩餘在線: ${players.size - 1} 人`);
      players.delete(ws);
      broadcast({
        type: 'player_leave',
        id: cur.id,
        onlineCount: players.size
      });
    }
  });

  ws.on('error', (err) => {
    console.error(`Socket 錯誤: ${err.message}`);
  });
});

// 啟動伺服器監聽
server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🕵️‍♂️ 《雙北漫遊偵探 ✕ 城市脈動》專屬私服器已成功啟動！`);
  console.log(`🌐 本地網頁遊戲入口 : http://localhost:${PORT}`);
  console.log(`🔌 多人 WebSocket 位址: ws://localhost:${PORT}`);
  console.log(`🎮 支援所有局域網同學連入同一個 3D 台北世界同屏辦案！`);
  console.log(`================================================================`);
});
