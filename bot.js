const bedrock = require('bedrock-protocol');

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
