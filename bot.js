const bedrock = require('bedrock-protocol');
const http = require('http');
const url = require('url');
const https = require('https');

let bot1Client = null;
let bot2Client = null;

let bot1Status = { name: 'Bot 1 (Nick-2mc)', status: '初始化中...', server: 'nick-2mc.aternos.me:50109' };
let bot2Status = { name: 'Bot 2 (Nick-1mc)', status: '初始化中...', server: 'Nick-1mc.aternos.me:17440' };

// Discord Webhook 網址
const DISCORD_WEBHOOK_EVENTS = 'https://discord.com/api/webhooks/1529869916889551058/jb3O5cnI7ZHUYRV2zlhumBEpBhd4T1XR7R64Swa5zVhIlNI--OCsgVyhRMlwt-o-f-sc';
const DISCORD_WEBHOOK_ANNOUNCE = 'https://discord.com/api/webhooks/1529870217566617650/Y0XkDcl8fgdnWIgidLeMTq7BhMAmohqDTqys9Myipi6ze_5yVN9x9DWaxFmnPJhKTSun';

// 發送 Discord 訊息函式
function sendDiscordWebhook(webhookUrl, content, title) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      embeds: [{
        title: title || '伺服器通知',
        description: content,
        color: 5814783,
        timestamp: new Date().toISOString()
      }]
    });

    const parsedUrl = new URL(webhookUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => resolve(responseBody));
    });

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

// 伺服器規則與違規分析引擎
function checkRuleViolation(actionText) {
  const text = actionText.toLowerCase();
  
  if (text.includes('外掛') || text.includes('輔助') || text.includes('腳本') || text.includes('修改客戶端')) {
    return { rule: '公平競爭', punishment: '封禁 (Ban)', desc: '嚴禁使用任何外掛、輔助程式或腳本，違者永久封禁。' };
  }
  if (text.includes('黑曜石')) {
    return { rule: '方塊與建築限制 - 黑曜石', punishment: '違禁品直接清除', desc: '伺服器禁止放置與使用黑曜石。' };
  }
  if (text.includes('基岩')) {
    return { rule: '方塊與建築限制 - 基岩', punishment: '違禁品直接清除 / 嚴重者封禁', desc: '嚴禁獲取或放置任何形式的基岩。' };
  }
  if (text.includes('破壞') || text.includes('搶劫') || text.includes('偷竊')) {
    return { rule: '禁止破壞', punishment: '禁言 / 監禁 / 封禁', desc: '請勿惡意破壞他人建築或搶劫他人財物。' };
  }
  if (text.includes('洗頻') || text.includes('廣告') || text.includes('惡意連結')) {
    return { rule: '禮貌聊天', punishment: '警告 / 禁言', desc: '禁止洗頻、散布惡意連結或進行商業廣告。' };
  }
  if (text.includes('歧視') || text.includes('人身攻擊') || text.includes('霸凌') || text.includes('挑釁')) {
    return { rule: '尊重他人', punishment: '警告 / 禁言 / 封禁', desc: '禁止歧視、人身攻擊、挑釁或霸凌行為。' };
  }
  if (text.includes('lag') || text.includes('延遲') || text.includes('循環裝置')) {
    return { rule: '性能友善', punishment: '警告並拆除裝置', desc: '禁止建造會導致伺服器延遲 (Lag) 的大型循環裝置。' };
  }
  if (text.includes('攻擊新人') || text.includes('攻擊掛機')) {
    return { rule: '戰鬥與 PVP (禁止惡意攻擊)', punishment: '警告 / 監禁', desc: '禁止攻擊掛機玩家或新人。' };
  }

  return { rule: '未明確觸發已知條例', punishment: '需管理員人工審視', desc: '請對照伺服器核心守則進行人工判斷。' };
}

// 建立網頁控制與管理伺服器
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/control') {
    const botId = parsedUrl.query.bot;
    const action = parsedUrl.query.action;

    if (action === 'reconnect') {
      if (botId === '1') {
        if (bot1Client) try { bot1Client.close(); } catch(e){}
        createBot1();
      } else if (botId === '2') {
        if (bot2Client) try { bot2Client.close(); } catch(e){}
        createBot2();
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 處理 Discord 發布 API
  if (pathname === '/api/discord') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const params = new URLSearchParams(body);
        const type = params.get('type');
        const content = params.get('content');
        const title = params.get('title');

        const webhookUrl = (type === 'event') ? DISCORD_WEBHOOK_EVENTS : DISCORD_WEBHOOK_ANNOUNCE;
        const defaultTitle = (type === 'event') ? '🎉 伺服器精彩活動通知' : '📢 伺服器重要公告';

        await sendDiscordWebhook(webhookUrl, content, title || defaultTitle);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Discord 訊息發布成功！' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 處理違規檢測 API
  if (pathname === '/api/check_rule') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const actionText = params.get('actionText') || '';
      const result = checkRuleViolation(actionText);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, result }));
    });
    return;
  }

  // 管理面板前端網頁介面
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Minecraft 伺服器管理與掛機控制台</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #121212; color: #e0e0e0; text-align: center; padding: 20px; margin: 0; }
        h1 { color: #4CAF50; margin-bottom: 5px; }
        .subtitle { color: #888; font-size: 14px; margin-bottom: 25px; }
        .container { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; max-width: 1100px; margin: 0 auto; }
        .card { background: #1e1e1e; border: 1px solid #333; border-radius: 12px; padding: 20px; width: 320px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); text-align: left; }
        .card h3 { margin-top: 0; color: #64B5F6; border-bottom: 1px solid #333; padding-bottom: 10px; }
        .wide-card { background: #1e1e1e; border: 1px solid #333; border-radius: 12px; padding: 20px; width: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.5); text-align: left; box-sizing: border-box; margin-top: 20px; }
        .status { font-weight: bold; color: #FF9800; }
        button { padding: 8px 12px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .btn-reconnect { background: #f44336; color: white; width: 100%; padding: 10px; margin-top: 10px; }
        .btn-reconnect:hover { background: #e53935; }
        .btn-action { background: #4CAF50; color: white; width: 100%; padding: 10px; margin-top: 10px; }
        .btn-action:hover { background: #43a047; }
        label { font-size: 12px; color: #aaa; display: block; margin-bottom: 3px; margin-top: 8px; }
        input[type="text"], textarea, select { width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: #fff; box-sizing: border-box; margin-bottom: 8px; font-family: inherit; }
        textarea { resize: vertical; height: 80px; }
        .result-box { background: #2a2a2a; border-left: 4px solid #FF9800; padding: 10px; margin-top: 10px; border-radius: 4px; font-size: 13px; display: none; }
      </style>
    </head>
    <body>
      <h1>Minecraft 伺服器管理與掛機控制台</h1>
      <p class="subtitle">機器人穩定在線掛機、Discord 公告/活動發布、伺服器規則違規檢測系統</p>
      
      <div class="container">
        <!-- Bot 1 狀態卡片 -->
        <div class="card">
          <h3>${bot1Status.name}</h3>
          <p>伺服器：<code>${bot1Status.server}</code></p>
          <p>狀態：<span class="status">${bot1Status.status}</span></p>
          <button class="btn-reconnect" onclick="reconnectBot('1')">🔄 強制重連 Bot 1</button>
        </div>

        <!-- Bot 2 狀態卡片 -->
        <div class="card">
          <h3>${bot2Status.name}</h3>
          <p>伺服器：<code>${bot2Status.server}</code></p>
          <p>狀態：<span class="status">${bot2Status.status}</span></p>
          <button class="btn-reconnect" onclick="reconnectBot('2')">🔄 強制重連 Bot 2</button>
        </div>

        <!-- 管理員功能：Discord 公告與活動發布 -->
        <div class="wide-card">
          <h3>📢 Discord 管理員發布系統</h3>
          <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 280px;">
              <label>發布類型：</label>
              <select id="discord_type">
                <option value="announce">伺服器公告 (Announcement)</option>
                <option value="event">伺服器活動 (Event)</option>
              </select>
              <label>標題：</label>
              <input type="text" id="discord_title" placeholder="輸入訊息標題...">
            </div>
            <div style="flex: 2; min-width: 280px;">
              <label>內文內容：</label>
              <textarea id="discord_content" placeholder="請輸入要發布到 Discord 的詳細內容..."></textarea>
              <button class="btn-action" onclick="sendDiscord()">發布至 Discord 頻道</button>
            </div>
          </div>
        </div>

        <!-- 管理員功能：伺服器規則違規檢測器 -->
        <div class="wide-card">
          <h3>⚖️ 伺服器規則與違規分析檢測器</h3>
          <label>輸入玩家行為描述或舉報內容（例如：「某某玩家在地下挖到並放置黑曜石」或「有人開外掛飛行」）：</label>
          <input type="text" id="rule_input" placeholder="輸入要檢測的行為...">
          <button class="btn-action" style="background: #2196F3;" onclick="checkRule()">檢測違規條例與建議處罰</button>
          
          <div id="rule_result" class="result-box"></div>
        </div>
      </div>

      <script>
        function reconnectBot(botId) {
          fetch('/api/control?bot=' + botId + '&action=reconnect').then(() => location.reload());
        }

        function sendDiscord() {
          const type = document.getElementById('discord_type').value;
          const title = document.getElementById('discord_title').value;
          const content = document.getElementById('discord_content').value;

          if (!content) return alert('請輸入內文內容！');

          fetch('/api/discord', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'type=' + encodeURIComponent(type) + '&title=' + encodeURIComponent(title) + '&content=' + encodeURIComponent(content)
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              alert('成功發布至 Discord！');
              document.getElementById('discord_content').value = '';
              document.getElementById('discord_title').value = '';
            } else {
              alert('發布失敗: ' + data.error);
            }
          });
        }

        function checkRule() {
          const actionText = document.getElementById('rule_input').value;
          if (!actionText) return alert('請輸入要檢測的行為！');

          fetch('/api/check_rule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'actionText=' + encodeURIComponent(actionText)
          })
          .then(res => res.json())
          .then(data => {
            const resBox = document.getElementById('rule_result');
            resBox.style.display = 'block';
            resBox.innerHTML = '<b>📌 觸發核心守則：</b> ' + data.result.rule + '<br>' +
                               '<b>⚙️ 條例說明：</b> ' + data.result.desc + '<br>' +
                               '<b>⚡ 建議處罰條款：</b> <span style="color: #ff5252; font-weight: bold;">' + data.result.punishment + '</span>';
          });
        }

        setInterval(() => { location.reload(); }, 15000);
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`[HTTP] 管理控制面板已在 Port ${PORT} 啟動`);
});

// 1. 啟動第一個機器人
function createBot1() {
  bot1Status.status = '正在嘗試連線...';
  
  bot1Client = bedrock.createClient({
    host: 'nick-2mc.aternos.me',
    port: 50109,
    username: 'AternosBot1',
    offline: true
  });

  bot1Client.on('connect', () => { bot1Status.status = '已建立底層連線'; });
  bot1Client.on('spawn', () => { bot1Status.status = '🟢 已進入遊戲世界穩定掛機中'; });
  
  bot1Client.on('text', (packet) => {
    if (packet.message && (packet.message.includes('died') || packet.message.includes('死'))) {
      bot1Status.status = '💀 機器人死亡，正在自動重新連線...';
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

// 2. 啟動第二個機器人
function createBot2() {
  bot2Status.status = '正在嘗試連線...';
  
  bot2Client = bedrock.createClient({
    host: 'Nick-1mc.aternos.me',
    port: 17440,
    username: 'AternosBot2',
    offline: true
  });

  bot2Client.on('connect', () => { bot2Status.status = '已建立底層連線'; });
  bot2Client.on('spawn', () => { bot2Status.status = '🟢 已進入遊戲世界穩定掛機中'; });
  
  bot2Client.on('text', (packet) => {
    if (packet.message && (packet.message.includes('died') || packet.message.includes('死'))) {
      bot2Status.status = '💀 機器人死亡，正在自動重新連線...';
      try { bot2Client.close(); } catch(e){}
    }
  });

  bot2Client.on('kick', (reason) => { bot2Status.status = `🔴 被踢出: ${JSON.stringify(reason)}`; });
  bot2Client.on('close', () => {
    bot2Status.status = '🟡 斷線中，2秒後重試...';
    setTimeout(createBot2, 2000);
  });
  bot2Client.on('error', (err) => {
    bot2Status.status = `❌ 錯誤: ${err.message}`;
    setTimeout(createBot2, 2000);
  });
}

createBot1();
createBot2();
