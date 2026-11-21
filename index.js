const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

const PHONE_NUMBER = (process.env.PHONE_NUMBER || '').replace(/[^0-9]/g, '');
let LATEST_CODE = PHONE_NUMBER
  ? 'Generating secure pairing code...'
  : 'Set PHONE_NUMBER before starting';
let BOT_STATUS = 'DISCONNECTED';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: BOT_STATUS.toLowerCase() }));
    return;
  }

  const isOnline = BOT_STATUS === 'CONNECTED';
  const color = isOnline ? '#25D366' : '#FF3B30';
  const text = isOnline ? '✅ ONLINE - CONNECTED' : '🔴 DISCONNECTED';

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BRIAN BOT</title>
</head>
<body style="font-family:Arial,sans-serif;text-align:center;padding:20px;background:#0b141a;color:white;margin:0">
  <div style="font-size:50px">👑</div>
  <h1>BRIAN BOT</h1>
  <p style="color:#FFD700">👑 KING OF BOTS • GREEN + GOLD 👑</p>
  <div style="background:${color};padding:12px;border-radius:20px;font-weight:bold">${text}</div>
  <div style="border:1px solid #FFD700;border-radius:15px;padding:20px;margin:20px auto;max-width:600px">
    <p><b>PAIRING CODE</b></p>
    <div style="background:#111b21;padding:20px;border-radius:10px;font-size:28px;letter-spacing:3px;font-weight:bold;color:#FFD700">${LATEST_CODE}</div>
  </div>
  <div style="text-align:left;background:#111b21;padding:15px;border-radius:15px;margin:20px auto;max-width:600px">
    <p><b>📱 LINKING INSTRUCTIONS</b></p>
    <ol>
      <li>Configure <b>PHONE_NUMBER</b> in the deployment environment.</li>
      <li>Start the application and wait for the pairing code.</li>
      <li>Open WhatsApp on that phone.</li>
      <li>Open <b>Linked Devices → Link a Device → Link with phone number instead</b>.</li>
      <li>Enter the pairing code shown above.</li>
    </ol>
  </div>
  <p style="color:#888;font-size:12px">👑 BRIAN BOT © 2026</p>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🌐 BRIAN BOT website live on port ${PORT}`));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      BOT_STATUS = 'CONNECTED';
      LATEST_CODE = '✅ CONNECTED';
      console.log('✅ BRIAN BOT is online');
    } else if (connection === 'close') {
      BOT_STATUS = 'DISCONNECTED';
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode !== 401) {
        console.log('Connection closed; reconnecting...');
        setTimeout(startBot, 3000);
      } else {
        console.log('WhatsApp session rejected. Remove the auth directory and link again.');
      }
    } else if (connection === 'connecting' && !state.creds.registered && PHONE_NUMBER) {
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER);
        LATEST_CODE = code;
        console.log(`📱 Pairing code for configured phone number: ${code}`);
      } catch (error) {
        LATEST_CODE = 'Pairing failed; restart the app';
        console.log('Pairing failed:', error.message);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      const text = msg.message.conversation ||
        msg.message.extendedTextMessage?.text || '';
      const cmd = text.toLowerCase().trim().replace(/^[.!\/]/, '');

      if (cmd === 'hi') {
        await sock.sendMessage(from, {
          text: 'Hello 👋 I am BRIAN BOT\nType *menu* to see commands'
        });
      } else if (cmd === 'menu') {
        await sock.sendMessage(from, {
          text: '🤖 *BRIAN BOT MENU*\n\n• hi - Hello\n• menu - Menu\n• ping - Check online\n• price - Price\n• football - Game'
        });
      } else if (cmd === 'ping') {
        await sock.sendMessage(from, { text: '✅ BRIAN BOT is ONLINE ⚡' });
      } else if (cmd === 'price') {
        await sock.sendMessage(from, { text: 'Price is 500' });
      } else if (cmd === 'football') {
        await sock.sendMessage(from, { text: '⚽ Choose Left / Center / Right' });
      }
    }
  });
}

startBot().catch((error) => {
  console.error('Failed to start BRIAN BOT:', error);
  process.exit(1);
});
