const bedrock = require('bedrock-protocol');
const http = require('http');

// 1. 建立一個簡單的 HTTP 伺服器，用來應付 Render Web Service 的 Port 需求
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Aternos AFK Bot is running!\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[HTTP] 網頁伺服器已在 Port ${PORT} 啟動`);
});

// 2. 你的 Minecraft 基岩版掛機機器人邏輯
function createBot() {
  console.log('[狀態] 正在嘗試連線到 Aternos 伺服器...');
  
  const client = bedrock.createClient({
    host: 'nick-2mc.aternos.me',
    port: 50109,
    username: 'AternosAFKBot',
    offline: true
  });

  client.on('connect', () => {
    console.log('[狀態] 成功與伺服器建立底層連線...');
  });

  client.on('spawn', () => {
    console.log('[成功] 機器人已進入遊戲世界，開始掛機！');
  });

  client.on('kick', (reason) => {
    console.log('[警告] 被伺服器踢出，原因:', reason);
  });

  client.on('close', () => {
    console.log('[狀態] 連線中斷，2秒後再次嘗試...');
    setTimeout(createBot, 2000);
  });

  client.on('error', (err) => {
    console.log('[錯誤] 發生錯誤:', err.message);
  });
}

createBot();
