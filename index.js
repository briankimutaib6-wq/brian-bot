'use strict';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

const BOT_PREFIX = '.';
const PORT = Number(process.env.PORT || 10000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const OWNER_JID = (process.env.OWNER_JID || '').replace(/[^0-9]/g, '');
const OFFICIAL_WHATSAPP_JID = (process.env.OFFICIAL_WHATSAPP_JID || '').replace(/[^0-9]/g, '');
const AUTO_REPLY = process.env.AUTO_REPLY !== 'false';
let pairingNumber = (process.env.PHONE_NUMBER || '').replace(/[^0-9]/g, '');

let pairingCode = 'Enter a phone number to request a pairing code.';
let status = 'STARTING';
let socket;
let connectionNoticeSent = false;
const START_TIME = Date.now();
let menuUsers = {};

const categories = [
  { key: 'owner', title: 'Owner Panel', icon: '👑', commands: ['setreply','autoreply','listreply','delreply','setwelcome','listwelcome','delwelcome','setvoice','listvoice','delvoice','addsudo','delsudo','listsudo','save','anime','csong','movie','tv','forward','savesongs','autocsong','removesong','getdp','leave','join','jid','setpp','fullpp','set','gstatus','gjid','active','apply','profile','menutype','setting','game','schedule','schedules','unschedule','mytime'] },
  { key: 'main', title: 'Main Panel', icon: '🛠️', commands: ['menu','ping','time','date','uptime','about','verse','sabbath','calc','reverse','base64','ai','ask','mediainfo','save','status'] },
  { key: 'downloads', title: 'Downloads', icon: '📥', commands: ['csong','savesongs','movie','tv','anime','play','video','ytmp3','ytmp4','tiktok','apk','pdf','image'] },
  { key: 'group', title: 'Group Tools', icon: '👥', commands: ['groupinfo','members','tagall','promote','demote','kick'] },
  { key: 'vpn', title: 'VPN Panel', icon: '🔥', commands: ['free','price','pay','status','server','setup','buy'] },
  { key: 'book', title: 'Book Panel', icon: '📖', commands: ['english','kiswahili','kalenjin','verse','sabbath','book'] },
];
const commandCount = categories.reduce((n, c) => n + c.commands.length, 0);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}
function normalizeJid(jid = '') { return String(jid).split('@')[0].replace(/[^0-9]/g, ''); }
function linkedJid(sock) { const number = normalizeJid(sock.user?.id); return number ? `${number}@s.whatsapp.net` : ''; }
function isOwner(sock, jid) { const sender = normalizeJid(jid); return Boolean(sender && (sender === OWNER_JID || sender === normalizeJid(sock.user?.id))); }
function getRuntime() {
  const diff = Date.now() - START_TIME;
  const m = Math.floor(diff / 60000); const s = Math.floor((diff % 60000) / 1000); const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m ${s}s` : `${m} minutes, ${s} seconds`;
}
function getMemory() { return (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + 'MB'; }

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', chunk => { size += chunk.length; if (size > 16384) { reject(new Error('Request body is too large.')); req.destroy(); } else chunks.push(chunk); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function requestPairingCode(number) {
  if (!/^\d{7,15}$/.test(number)) throw new Error('Enter a valid international phone number (7–15 digits).');
  if (!socket) throw new Error('The bot is still starting. Try again shortly.');
  pairingNumber = number;
  pairingCode = 'Generating secure pairing code…';
  pairingCode = await socket.requestPairingCode(number);
  return pairingCode;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: status.toLowerCase(), pairingNumberConfigured: Boolean(pairingNumber) }));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/pairing-number') {
    try {
      const body = await readBody(req);
      const data = (req.headers['content-type'] || '').includes('application/json') ? JSON.parse(body || '{}') : Object.fromEntries(new URLSearchParams(body));
      const code = await requestPairingCode(String(data.phoneNumber || '').replace(/[^0-9]/g, ''));
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, pairingCode: code }));
    } catch (error) { if (!res.headersSent) res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: error.message })); }
    return;
  }
  if (req.method !== 'GET' || url.pathname !== '/') { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found'); return; }
  const online = status === 'CONNECTED';
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="10"><title>BRIAN BOT</title><style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0f14;color:#fff;font:16px system-ui;padding:24px}main{max-width:760px;width:100%;border:1px solid #26313d;border-radius:18px;padding:24px;background:#111820}h1{margin:8px 0}.status{color:#25d366}.code{font-size:28px;font-weight:800;letter-spacing:4px;color:#00ff00}.grid{display:grid;gap:16px}section{border:1px solid #26313d;border-radius:12px;padding:16px}input,button{font:inherit;padding:10px;border-radius:8px}input{width:min(420px,70%)}button{cursor:pointer;font-weight:700;background:#25d366;border:none}</style></head><body><main><h1>👑 BRIAN BOT</h1><div class="status">${online ? '🟢 ONLINE · CONNECTED' : `🟠 ${escapeHtml(status)}`}</div><div class="grid"><section><h2>📱 Pairing code</h2><div class="code">${escapeHtml(pairingCode)}</div><p>Phone: +${escapeHtml(pairingNumber || 'Not set')}</p></section><section><h2>🔗 Link your WhatsApp</h2><form id="pair"><input id="number" type="tel" placeholder="2547XXXXXXXX" required><button>Pair</button></form><p>1. WhatsApp → Linked Devices → Link a device<br>2. Choose <b>Link with phone number</b><br>3. Enter the pairing code shown above</p></section><section><h2>Panels</h2><p>Send <b>.menu</b> to WhatsApp for the interactive command list.</p></section></div></main><script>const pair=document.getElementById('pair');const number=document.getElementById('number');pair.addEventListener('submit',async e=>{e.preventDefault();const r=await fetch('/pairing-number',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phoneNumber:number.value})});const d=await r.json();alert(r.ok?'Code: '+d.pairingCode:d.error)})</script></body></html>`);
});
server.listen(PORT, () => console.log(`🌐 BRIAN BOT dashboard on ${PORT}`));

function getMessageText(message = {}) {
  const content = message.ephemeralMessage?.message || message.viewOnceMessage?.message || message.viewOnceMessageV2?.message || message;
  return content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption || content.videoMessage?.caption || content.documentMessage?.caption || '';
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), printQRInTerminal: false });
  socket = sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      status = 'CONNECTED'; pairingCode = '✅ CONNECTED';
      console.log('✅ BRIAN BOT is online');
    } else if (connection === 'close') {
      status = 'DISCONNECTED';
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== 401) {
        console.log('Connection closed; reconnecting…');
        setTimeout(() => startBot().catch(error => console.error('Reconnect failed:', error)), 3000);
      } else console.error('WhatsApp session rejected. Remove auth and link again.');
    } else if (connection === 'connecting' && !state.creds.registered && pairingNumber) {
      try { pairingCode = await sock.requestPairingCode(pairingNumber); }
      catch (error) { pairingCode = 'Pairing failed. Check the phone number and try again.'; console.error('Pairing failed:', error.message); }
    }
  });
}

startBot().catch(error => { console.error('Failed to start BRIAN BOT:', error); process.exit(1); });
