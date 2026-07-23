const bedrock = require('bedrock-protocol');
const http = require('http');
const url = require('url');

let bot1Client = null;
let bot2Client = null;

let bot1Status = { name: 'Bot 1 (Nick-2mc)', status: '初始化中...', server: 'nick-2mc.aternos.me:50109' };
let bot2Status = { name: 'Bot 2 (Nick-1mc)', status: '初始化中...', server: 'Nick-1mc.aternos.me:17440' };

// 1. 建立網頁監控與控制伺服器
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/control') {
    const botId = parsedUrl.query.bot;
    const action = parsedUrl.query.action;
    const msg = parsedUrl.query.msg || '';

    const targetClient = botId === '1' ? bot1Client : bot2Client;

    if (action === 'reconnect') {
      if (botId === '1') {
        if (bot1Client) try { bot1Client.close(); } catch(e){}
        createBot1();
      } else if (botId === '2') {
        if (bot2Client) try { bot2Client.close(); } catch(e){}
        createBot2();
      }
    } else if (action === 'say' && targetClient) {
      try {
        targetClient.queue('text', {
          type: 'chat',
          needs_translation: false,
          source_name: targetClient.username || '',
          xuid: '',
          platform_chat_id: '',
          message: msg
        });
      } catch (e) {
        console.log(`[Bot ${botId}] 發送訊息失敗:`, e.message);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Aternos 機器人遠端控制面板</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #121212; color: #e0e0e0; text-align: center; padding: 20px; margin: 0; }
        h1 { color: #4CAF50; margin-bottom: 5px; }
        .subtitle { color: #888; font-size: 14px; margin-bottom: 25px; }
        .container { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; }
        .card { background: #1e1e1e; border: 1px solid #333; border-radius: 12px; padding: 20px; width: 320px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); text-align: left; }
        .card h3 { margin-top: 0; color: #64B5F6; border-bottom: 1px solid #333; padding-bottom: 10px; }
        .status { font-weight: bold; color: #FF9800; }
        .control-group { margin-top: 15px; }
        input[type="text"] { width: 68%; padding: 8px; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: #fff; box-sizing: border-box; }
        button { padding: 8px 12px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .btn-send { background: #2196F3; color: white; }
        .btn-send:hover { background: #1e88e5; }
        .btn-reconnect { background: #f44336; color: white; width: 100%; margin-top: 10px; padding: 10px; }
        .btn-reconnect:hover { background: #e53935; }
      </style>
    </head>
    <body>
      <h1>Minecraft 雙機器人遠端控制台</h1>
      <p class="subtitle">即時監控與控制網頁面板（含自動重生保護）</p>
      
      <div class="container">
        <div class="card">
          <h3>${bot1Status.name}</h3>
          <p>伺服器：<code>${bot1Status.server}</code></p>
          <p>狀態：<span class="status">${bot1Status.status}</span></p>
          <div class="control-group">
            <input type="text" id="msg1" placeholder="輸入聊天訊息或指令...">
            <button class="btn-send" onclick="sendControl('1', 'say', 'msg1')">發送</button>
          </div>
          <button class="btn-reconnect" onclick="sendControl('1', 'reconnect')">🔄 強制重新連線</button>
        </div>

        <div class="card">
          <h3>${bot2Status.name}</h3>
          <p>伺服器：<code>${bot2Status.server}</code></p>
          <p>狀態：<span class="status">${bot2Status.status}</span></p>
          <div class="control-group">
            <input type="text" id="msg2" placeholder="輸入聊天訊息或指令...">
            <button class="btn-send" onclick="sendControl('2', 'say', 'msg2')">發送</button>
          </div>
          <button class="btn-reconnect" onclick="sendControl('2', 'reconnect')">🔄 強制重新連線</button>
        </div>
      </div>

      <script>
        function sendControl(botId, action, inputId) {
          let msg = '';
          if (inputId) {
            const inputEle = document.getElementById(inputId);
            msg = encodeURIComponent(inputEle.value);
            if (!msg && action === 'say') return alert('請先輸入內容！');
            inputEle.value = '';
          }
          fetch('/api/control?bot=' + botId + '&action=' + action + '&msg=' + msg).then(() => location.reload());
        }
        setInterval(() => { location.reload(); }, 8000);
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`[HTTP] 控制面板已在 Port ${PORT} 啟動`);
});

// 2. 啟動第一個機器人
function createBot1() {
  bot1Status.status = '正在嘗試連線...';
  
  bot1Client = bedrock.createClient({
    host: 'nick-2mc.aternos.me',
    port: 50109,
    username: 'AternosBot1',
    offline: true
  });

  bot1Client.on('connect', () => { bot1Status.status = '已建立底層連線'; });
  bot1Client.on('spawn', () => { bot1Status.status = '🟢 已進入遊戲世界掛機中'; });
  
  // 監聽死亡或血量歸零事件
  bot1Client.on('text', (packet) => {
    if (packet.message && (packet.message.includes('died') || packet.message.includes('死'))) {
      bot1Status.status = '💀 機器人死亡，正在自動重新連線重生...';
      try { bot1Client.close(); } catch(e){}
    }
  });

  bot1Client.on('kick', (reason) => { bot1Status.status = `🔴 被踢出: ${JSON.stringify(reason)}`; });
  bot1Client.on('close', () => {
    bot1Status.status = '🟡 斷線中，2秒後重生重試...';
    setTimeout(createBot1, 2000);
  });
  bot1Client.on('error', (err) => {
    bot1Status.status = `❌ 錯誤: ${err.message}`;
    setTimeout(createBot1, 2000);
  });
}

// 3. 啟動第二個機器人
function createBot2() {
  bot2Status.status = '正在嘗試連線...';
  
  bot2Client = bedrock.createClient({
    host: 'Nick-1mc.aternos.me',
    port: 17440,
    username: 'AternosBot2',
    offline: true
  });

  bot2Client.on('connect', () => { bot2Status.status = '已建立底層連線'; });
  bot2Client.on('spawn', () => { bot2Status.status = '🟢 已進入遊戲世界掛機中'; });
  
  // 監聽死亡訊息
  bot2Client.on('text', (packet) => {
    if (packet.message && (packet.message.includes('died') || packet.message.includes('死'))) {
      bot2Status.status = '💀 機器人死亡，正在自動重新連線重生...';
      try { bot2Client.close(); } catch(e){}
    }
  });

  bot2Client.on('kick', (reason) => { bot2Status.status = `🔴 被踢出: ${JSON.stringify(reason)}`; });
  bot2Client.on('close', () => {
    bot2Status.status = '🟡 斷線中，2秒後重生重試...';
    setTimeout(createBot2, 2000);
  });
  bot2Client.on('error', (err) => {
    bot2Status.status = `❌ 錯誤: ${err.message}`;
    setTimeout(createBot2, 2000);
  });
}

createBot1();
createBot2();
