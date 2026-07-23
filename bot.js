const bedrock = require('bedrock-protocol');
const http = require('http');

let bot1Status = { name: 'Bot 1 (Nick-2mc)', status: '初始化中...', server: 'nick-2mc.aternos.me:50109' };
let bot2Status = { name: 'Bot 2 (Nick-1mc)', status: '初始化中...', server: 'Nick-1mc.aternos.me:17440' };

// 1. 建立網頁監控伺服器
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Aternos AFK Bot 監控面板</title>
      <meta http-equiv="refresh" content="5">
      <style>
        body { font-family: Arial, sans-serif; background: #121212; color: #e0e0e0; text-align: center; padding-top: 50px; }
        .card { background: #1e1e1e; border-radius: 8px; padding: 20px; margin: 20px auto; width: 350px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); }
        h1 { color: #4CAF50; }
        .status { font-weight: bold; color: #FF9800; }
      </style>
    </head>
    <body>
      <h1>Minecraft 雙機器人掛機監控</h1>
      <p>網頁每 5 秒會自動更新狀態</p>
      
      <div class="card">
        <h3>${bot1Status.name}</h3>
        <p>伺服器：${bot1Status.server}</p>
        <p>狀態：<span class="status">${bot1Status.status}</span></p>
      </div>

      <div class="card">
        <h3>${bot2Status.name}</h3>
        <p>伺服器：${bot2Status.server}</p>
        <p>狀態：<span class="status">${bot2Status.status}</span></p>
      </div>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`[HTTP] 監控網頁已在 Port ${PORT} 啟動`);
});

// 2. 啟動第一個機器人
function createBot1() {
  bot1Status.status = '正在嘗試連線...';
  
  const client = bedrock.createClient({
    host: 'nick-2mc.aternos.me',
    port: 50109,
    username: 'AternosBot1',
    offline: true
  });

  client.on('connect', () => {
    bot1Status.status = '已建立底層連線';
  });

  client.on('spawn', () => {
    bot1Status.status = '🟢 已進入遊戲世界掛機中';
  });

  client.on('kick', (reason) => {
    bot1Status.status = `🔴 被踢出: ${JSON.stringify(reason)}`;
  });

  client.on('close', () => {
    bot1Status.status = '🟡 連線中斷，2秒後重試...';
    setTimeout(createBot1, 2000);
  });

  client.on('error', (err) => {
    bot1Status.status = `❌ 錯誤: ${err.message}`;
    setTimeout(createBot1, 2000);
  });
}

// 3. 啟動第二個機器人 (強制鎖定 Port 17440)
function createBot2() {
  bot2Status.status = '正在嘗試連線...';
  
  const client = bedrock.createClient({
    host: 'Nick-1mc.aternos.me',
    port: 17440, // 確保這裡緊緊鎖定正確的連接埠
    username: 'AternosBot2',
    offline: true
  });

  client.on('connect', () => {
    bot2Status.status = '已建立底層連線';
  });

  client.on('spawn', () => {
    bot2Status.status = '🟢 已進入遊戲世界掛機中';
  });

  client.on('kick', (reason) => {
    bot2Status.status = `🔴 被踢出: ${JSON.stringify(reason)}`;
  });

  client.on('close', () => {
    bot2Status.status = '🟡 連線中斷，2秒後重試...';
    setTimeout(createBot2, 2000);
  });

  client.on('error', (err) => {
    bot2Status.status = `❌ 錯誤: ${err.message}`;
    setTimeout(createBot2, 2000);
  });
}

createBot1();
createBot2();
