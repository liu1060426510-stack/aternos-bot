const bedrock = require('bedrock-protocol');
const http = require('http');

let bot1Client = null;
let bot2Client = null;

let bot1Status = { name: 'Bot 1 (Nick-2mc)', status: '初始化中...', server: 'nick-2mc.aternos.me:50109' };
let bot2Status = { name: 'Bot 2 (Nick-1mc)', status: '初始化中...', server: 'Nick-1mc.aternos.me:17440' };

// 建立輕量級 HTTP 伺服器（提供健康檢查與公開 API 狀態查詢）
const server = http.createServer((req, res) => {
  if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      bots: [bot1Status, bot2Status],
      uptime: process.uptime()
    }));
    return;
  }

  // 簡潔漂亮的狀態儀表板首頁
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Minecraft Aternos Bot 運行狀態</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #121212; color: #e0e0e0; text-align: center; padding: 40px; margin: 0; }
        h1 { color: #4CAF50; margin-bottom: 10px; }
        .subtitle { color: #888; font-size: 14px; margin-bottom: 30px; }
        .container { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; max-width: 800px; margin: 0 auto; }
        .card { background: #1e1e1e; border: 1px solid #333; border-radius: 12px; padding: 25px; width: 320px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); text-align: left; }
        .card h3 { margin-top: 0; color: #64B5F6; border-bottom: 1px solid #333; padding-bottom: 10px; }
        .status { font-weight: bold; color: #FF9800; }
        .api-box { margin-top: 30px; background: #1e1e1e; padding: 15px; border-radius: 8px; border: 1px solid #333; display: inline-block; }
        code { color: #81C784; }
      </style>
    </head>
    <body>
      <h1>Minecraft 機器人掛機中心</h1>
      <p class="subtitle">雙開機器人持續在線，每 2 秒自動跳躍維持活動狀態</p>
      
      <div class="container">
        <div class="card">
          <h3>${bot1Status.name}</h3>
          <p>伺服器：<code>${bot1Status.server}</code></p>
          <p>狀態：<span class="status" id="b1_status">${bot1Status.status}</span></p>
        </div>

        <div class="card">
          <h3>${bot2Status.name}</h3>
          <p>伺服器：<code>${bot2Status.server}</code></p>
          <p>狀態：<span class="status" id="b2_status">${bot2Status.status}</span></p>
        </div>
      </div>

      <div class="api-box">
        <p>🔌 公開 API 狀態接口：<a href="/api/status" target="_blank" style="color: #64B5F6;">/api/status</a></p>
      </div>

      <script>
        // 每 5 秒自動更新網頁狀態
        setInterval(async () => {
          try {
            const res = await fetch('/api/status');
            const data = await res.json();
            document.getElementById('b1_status').innerText = data.bots[0].status;
            document.getElementById('b2_status').innerText = data.bots[1].status;
          } catch(e) {}
        }, 5000);
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`[HTTP] 伺服器已在 Port ${PORT} 啟動`);
});

// 機器人 1 邏輯
function createBot1() {
  bot1Status.status = '正在嘗試連線...';
  bot1Client = bedrock.createClient({
    host: 'nick-2mc.aternos.me',
    port: 50109,
    username: 'AternosBot1',
    offline: true
  });

  let jumpInterval = null;

  bot1Client.on('connect', () => { bot1Status.status = '已建立底層連線'; });
  bot1Client.on('spawn', () => {
    bot1Status.status = '🟢 已進入遊戲世界穩定掛機中';
    
    if (jumpInterval) clearInterval(jumpInterval);
    jumpInterval = setInterval(() => {
      try {
        bot1Client.queue('player_auth_input', {
          pitch: 0, yaw: 0,
          position: { x: 0, y: 0, z: 0 },
          move_vector: { x: 0, z: 0 },
          head_yaw: 0,
          input_data: 0x01, // 跳躍指令
          input_command_source: 0,
          player_action: 0,
          interaction_model: 0,
          tick: 0,
          delta: { x: 0, y: 0, z: 0 }
        });
      } catch (e) {}
    }, 2000);
  });

  bot1Client.on('text', (packet) => {
    if (packet.message && (packet.message.includes('died') || packet.message.includes('死'))) {
      bot1Status.status = '💀 機器人死亡，正在自動重新連線...';
      if (jumpInterval) clearInterval(jumpInterval);
      try { bot1Client.close(); } catch(e){}
    }
  });

  bot1Client.on('close', () => {
    bot1Status.status = '🟡 斷線中，2秒後重試...';
    if (jumpInterval) clearInterval(jumpInterval);
    setTimeout(createBot1, 2000);
  });

  bot1Client.on('error', (err) => {
    bot1Status.status = `❌ 錯誤: ${err.message}`;
    if (jumpInterval) clearInterval(jumpInterval);
    setTimeout(createBot1, 2000);
  });
}

// 機器人 2 邏輯
function createBot2() {
  bot2Status.status = '正在嘗試連線...';
  bot2Client = bedrock.createClient({
    host: 'Nick-1mc.aternos.me',
    port: 17440,
    username: 'AternosBot2',
    offline: true
  });

  let jumpInterval2 = null;

  bot2Client.on('connect', () => { bot2Status.status = '已建立底層連線'; });
  bot2Client.on('spawn', () => {
    bot2Status.status = '🟢 已進入遊戲世界穩定掛機中';
    
    if (jumpInterval2) clearInterval(jumpInterval2);
    jumpInterval2 = setInterval(() => {
      try {
        bot2Client.queue('player_auth_input', {
          pitch: 0, yaw: 0,
          position: { x: 0, y: 0, z: 0 },
          move_vector: { x: 0, z: 0 },
          head_yaw: 0,
          input_data: 0x01,
          input_command_source: 0,
          player_action: 0,
          interaction_model: 0,
          tick: 0,
          delta: { x: 0, y: 0, z: 0 }
        });
      } catch (e) {}
    }, 2000);
  });

  bot2Client.on('text', (packet) => {
    if (packet.message && (packet.message.includes('died') || packet.message.includes('死'))) {
      bot2Status.status = '💀 機器人死亡，正在自動重新連線...';
      if (jumpInterval2) clearInterval(jumpInterval2);
      try { bot2Client.close(); } catch(e){}
    }
  });

  bot2Client.on('close', () => {
    bot2Status.status = '🟡 斷線中，2秒後重試...';
    if (jumpInterval2) clearInterval(jumpInterval2);
    setTimeout(createBot2, 2000);
  });

  bot2Client.on('error', (err) => {
    bot2Status.status = `❌ 錯誤: ${err.message}`;
    if (jumpInterval2) clearInterval(jumpInterval2);
    setTimeout(createBot2, 2000);
  });
}

createBot1();
createBot2();
