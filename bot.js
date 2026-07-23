const bedrock = require('bedrock-protocol');
const http = require('http');

// 儲存兩個機器人的即時狀態，供網頁顯示
let bot1Status = { name: 'Bot 1 (Nick-2mc)', status: '初始化中...', server: 'nick-2mc.aternos.me:50109' };
let bot2Status = { name: 'Bot 2 (Nick-1mc)', status: '初始化中...', server: 'Nick-1mc.aternos.me:17440' };

// 1. 建立網頁伺服器，用來顯示機器人狀態並應付 Render 的 Port 需求
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Aternos AFK Bot 監控面板</title>
      <meta http-equiv="refresh" content="5"> <!-- 每 5 秒自動重新整理網頁 -->
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[HTTP] 監控網頁已在 Port ${PORT} 啟動`);
});

// 2. 啟動第一個機器人 (nick-2mc.aternos.me:50109)
function createBot1() {
  bot1Status.status = '正在嘗試連線...';
  console.log('[Bot 1] 正在嘗試連線到伺服器...');
  
  const client = bedrock.createClient({
    host: 'nick-2mc.aternos.me',
    port: 50109,
    username: 'AternosBot1',
    offline: true
  });

  client.on('connect', () => {
    bot1Status.status = '已建立底層連線';
    console.log('[Bot 1] 成功與伺服器建立底層連線...');
  });

  client.on('spawn', () => {
    bot1Status.status = '🟢 已進入遊戲世界掛機中';
    console.log('[Bot 1] 成功進入遊戲世界！');
  });

  client.on('kick', (reason) => {
    bot1Status.status = `🔴 被伺服器踢出: ${JSON.stringify(reason)}`;
    console.log('[Bot 1] 被伺服器踢出，原因:', reason);
  });

  client.on('close', () => {
    bot1Status.status = '🟡 連線中斷，2秒後重試...';
    console.log('[Bot 1] 連線中斷，2秒後嘗試重新連線...');
    setTimeout(createBot1, 2000);
  });

  client.on('error', (err) => {
    bot1Status.status = `❌ 錯誤: ${err.message}`;
    console.log('[Bot 1] 發生錯誤:', err.message);
  });
}

// 3. 啟動第二個機器人 (Nick-1mc.aternos.me:17440)
function createBot2() {
  bot2Status.status = '正在嘗試連線...';
  console.log('[Bot 2] 正在嘗試連線到伺服器...');
  
  const client = bedrock.createClient({
    host: 'Nick-1mc.aternos.me',
    port: 17440,
    username: 'AternosBot2',
    offline: true
  });

  client.on('connect', () => {
    bot2Status.status = '已建立底層連線';
    console.log('[Bot 2] 成功與伺服器建立底層連線...');
  });

  client.on('spawn', () => {
    bot2Status.status = '🟢 已進入遊戲世界掛機中';
    console.log('[Bot 2] 成功進入遊戲世界！');
  });

  client.on('kick', (reason) => {
    bot2Status.status = `🔴 被伺服器踢出: ${JSON.stringify(reason)}`;
    console.log('[Bot 2] 被伺服器踢出，原因:', reason);
  });

  client.on('close', () => {
    bot2Status.status = '🟡 連線中斷，2秒後重試...';
    console.log('[Bot 2] 連線中斷，2秒後嘗試重新連線...');
    setTimeout(createBot2, 2000);
  });

  client.on('error', (err) => {
    bot2Status.status = `❌ 錯誤: ${err.message}`;
    console.log('[Bot 2] 發生錯誤:', err.message);
  });
}

// 同時啟動兩隻機器人
createBot1();
createBot2();
