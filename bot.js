const bedrock = require('bedrock-protocol');
const http = require('http');
const url = require('url');

let bot1Client = null;
let bot2Client = null;

let bot1Status = { name: 'Bot 1 (Nick-2mc)', status: '初始化中...', server: 'nick-2mc.aternos.me:50109' };
let bot2Status = { name: 'Bot 2 (Nick-1mc)', status: '初始化中...', server: 'Nick-1mc.aternos.me:17440' };

let bot1IntervalTimer = null;
let bot2IntervalTimer = null;

// 更安全穩定的聊天訊息發送函式
function sendChat(client, msg) {
  if (!client) return;
  try {
    client.write('text', {
      type: 'chat',
      needs_translation: false,
      source_name: client.username,
      xuid: '',
      platform_chat_id: '',
      message: msg
    });
  } catch (e) {
    console.log('[發送訊息錯誤]', e.message);
  }
}

// 模擬跳躍動作
function sendJump(client) {
  if (!client) return;
  try {
    client.write('player_auth_input', {
      pitch: 0, yaw: 0,
      position: { x: 0, y: 0, z: 0 },
      move_vector: { x: 0, z: 0 },
      head_yaw: 0,
      input_data: 0x00000002,
      input_mode: 1, play_mode: 0, interaction_model: 0,
      tick: 0, delta: { x: 0, y: 0, z: 0 }
    });
  } catch (e) {
    console.log('[跳躍錯誤]', e.message);
  }
}

// 1. 建立網頁監控與控制伺服器
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/control') {
    const botId = parsedUrl.query.bot;
    const action = parsedUrl.query.action;
    const msg = parsedUrl.query.msg || '';
    const intervalSec = parseInt(parsedUrl.query.sec) || 0;

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
      sendChat(targetClient, msg);
    } else if (action === 'jump' && targetClient) {
      sendJump(targetClient);
    } else if (action === 'set_interval') {
      if (botId === '1') {
        if (bot1IntervalTimer) clearInterval(bot1IntervalTimer);
        if (intervalSec > 0 && msg) {
          bot1IntervalTimer = setInterval(() => { sendChat(bot1Client, msg); }, intervalSec * 1000);
        }
      } else if (botId === '2') {
        if (bot2IntervalTimer) clearInterval(bot2IntervalTimer);
        if (intervalSec > 0 && msg) {
          bot2IntervalTimer = setInterval(() => { sendChat(bot2Client, msg); }, intervalSec * 1000);
        }
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
      <title>Aternos 機器人自動化控制台</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #121212; color: #e0e0e0; text-align: center; padding: 20px; margin: 0; }
        h1 { color: #4CAF50; margin-bottom: 5px; }
        .subtitle { color: #888; font-size: 14px; margin-bottom: 25px; }
        .container { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; }
        .card { background: #1e1e1e; border: 1px solid #333; border-radius: 12px; padding: 20px; width: 340px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); text-align: left; }
        .card h3 { margin-top: 0; color: #64B5F6; border-bottom: 1px solid #333; padding-bottom: 10px; }
        .status { font-weight: bold; color: #FF9800; }
        .control-group { margin-top: 12px; }
        label { font-size: 12px; color: #aaa; display: block; margin-bottom: 3px; }
        input[type="text"], input[type="number"] { width: 100%; padding: 7px; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: #fff; box-sizing: border-box; margin-bottom: 8px; }
        .row { display: flex; gap: 8px; }
        button { padding: 8px 12px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .btn-send { background: #2196F3; color: white; width: 100%; }
        .btn-send:hover { background: #1e88e5; }
        .btn-timer { background: #9C27B0; color: white; width: 100%; }
        .btn-timer:hover { background: #7B1FA2; }
        .btn-jump { background: #FF9800; color: white; width: 48%; margin-top: 10px; padding: 10px; }
        .btn-jump:hover { background: #f57c00; }
        .btn-reconnect { background: #f44336; color: white; width: 48%; margin-top: 10px; padding: 10px; float: right; }
        .btn-reconnect:hover { background: #e53935; }
      </style>
    </head>
    <body>
      <h1>Minecraft 雙機器人自動化控制台</h1>
      <p class="subtitle">即時監控、指令發送與定時自動化設定</p>
      
      <div class="container">
        <!-- Bot 1 -->
        <div class="card">
          <h3>${bot1Status.name}</h3>
          <p>伺服器：<code>${bot1Status.server}</code></p>
          <p>狀態：<span class="status">${bot1Status.status}</span></p>
          
          <div class="control-group">
            <label>單次發送訊息或指令：</label>
            <input type="text" id="msg1" placeholder="輸入內容...">
            <button class="btn-send" onclick="sendAction('1', 'say', 'msg1')">立即發送</button>
          </div>

          <div class="control-group" style="border-top: 1px dashed #444; padding-top: 10px; margin-top: 10px;">
            <label>⏱️ 定時自動執行指令：</label>
            <input type="text" id="timer_msg1" placeholder="要自動執行的指令/文字">
            <div class="row">
              <input type="number" id="timer_sec1" placeholder="秒數 (例: 30)" min="1">
            </div>
            <button class="btn-timer" onclick="setTimer('1')">啟動 / 更新定時器 (秒)</button>
          </div>
          
          <div>
            <button class="btn-jump" onclick="sendAction('1', 'jump')">🦘 跳躍</button>
            <button class="btn-reconnect" onclick="sendAction('1', 'reconnect')">🔄 重連</button>
          </div>
        </div>

        <!-- Bot 2 -->
        <div class="card">
          <h3>${bot2Status.name}</h3>
          <p>伺服器：<code>${bot2Status.server}</code></p>
          <p>狀態：<span class="status">${bot2Status.status}</span></p>
          
          <div class="control-group">
            <label>單次發送訊息或指令：</label>
            <input type="text" id="msg2" placeholder="輸入內容...">
            <button class="btn-send" onclick="sendAction('2', 'say', 'msg2')">立即發送</button>
          </div>

          <div class="control-group" style="border-top: 1px dashed #444; padding-top: 10px; margin-top: 10px;">
            <label>⏱️ 定時自動執行指令：</label>
            <input type="text" id="timer_msg2" placeholder="要自動執行的指令/文字">
            <div class="row">
              <input type="number" id="timer_sec2" placeholder="秒數 (例: 30)" min="1">
            </div>
            <button class="btn-timer" onclick="setTimer('2')">啟動 / 更新定時器 (秒)</button>
          </div>
          
          <div>
            <button class="btn-jump" onclick="sendAction('2', 'jump')">🦘 跳躍</button>
            <button class="btn-reconnect" onclick="sendAction('2', 'reconnect')">🔄 重連</button>
          </div>
        </div>
      </div>

      <script>
        function sendAction(botId, action, inputId) {
          const inputEle = document.getElementById(inputId);
          const msg = inputEle ? encodeURIComponent(inputEle.value) : '';
          if (inputId && !msg && action === 'say') return alert('請先輸入內容！');
          if (inputId) inputEle.value = '';
          
          fetch('/api/control?bot=' + botId + '&action=' + action + '&msg=' + msg).then(() => location.reload());
        }

        function setTimer(botId) {
          const msg = encodeURIComponent(document.getElementById('timer_msg' + botId).value);
          const sec = document.getElementById('timer_sec' + botId).value;
          if (!msg || !sec) return alert('請完整填寫定時指令與秒數！');

          fetch('/api/control?bot=' + botId + '&action=set_interval&msg=' + msg + '&sec=' + sec)
            .then(res => res.json())
            .then(() => alert('定時器設定成功！機器人將每隔 ' + sec + ' 秒執行一次。'));
        }

        setInterval(() => { location.reload(); }, 10000);
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
  
  bot1Client.on('text', (packet) => {
    if (packet.message && (packet.message.includes('died') || packet.message.includes('死'))) {
      bot1Status.status = '💀 機器人死亡，正在自動重新連線重生...';
      try { bot1Client.close(); } catch(e){}
    }
  });

  bot1Client.on('kick', (reason) => { bot1Status.status = `🔴 被踢出: ${JSON.stringify(reason)}`; });
  bot1Client.on('close', () => {
    bot1Status.status = '🟡 斷線中，2秒後重試...';
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
  
  bot2Client.on('text', (packet) => {
    if (packet.message && (packet.message.includes('died') || packet.message.includes('死'))) {
      bot2Status.status = '💀 機器人死亡，正在自動重新連線重生...';
      try { bot2Client.close(); } catch(e){}
    }
  });

  bot2Status.on('kick', (reason) => { bot2Status.status = `🔴 被踢出: ${JSON.stringify(reason)}`; });
  bot2Status.on('close', () => {
    bot2Status.status = '🟡 斷線中，2秒後重試...';
    setTimeout(createBot2, 2000);
  });
  bot2Status.on('error', (err) => {
    bot2Status.status = `❌ 錯誤: ${err.message}`;
    setTimeout(createBot2, 2000);
  });
}

createBot1();
createBot2();
