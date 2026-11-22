'use strict';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');
const { attachMessageHandler } = require('./lib/command-runtime');
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
let pairingRequestInProgress = false;
let reconnectTimer;
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
  if (!socket || status === 'CONNECTED') throw new Error('The bot is already connected or still starting. Try again shortly.');
  if (pairingRequestInProgress) throw new Error('A pairing code is already being generated. Please wait.');
  pairingNumber = number;
  pairingCode = 'Generating secure pairing code…';
  pairingRequestInProgress = true;
  try {
    pairingCode = await socket.requestPairingCode(number);
    return pairingCode;
  } finally {
    pairingRequestInProgress = false;
  }
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
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="10"><title>BRIAN BOT</title></head><body><main><h1>🤖 BRIAN BOT</h1><p>Status: ${online ? '✅ Connected' : escapeHtml(status)}</p><p>${escapeHtml(pairingCode)}</p><p>${commandCount} listed commands · uptime ${escapeHtml(getRuntime())} · memory ${escapeHtml(getMemory())}</p><form method="post" action="/pairing-number"><label>WhatsApp number (international digits only) <input name="phoneNumber" required></label><button type="submit">Request pairing code</button></form></main></body></html>`);
});
server.listen(PORT, () => console.log(`🌐 BRIAN BOT dashboard on ${PORT}`));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: state, logger: pino({ level: process.env.LOG_LEVEL || 'warn' }), printQRInTerminal: false });
  socket = sock;
  attachMessageHandler(sock);
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      status = 'CONNECTED';
      pairingCode = '✅ CONNECTED';
      pairingRequestInProgress = false;
      console.log('✅ BRIAN BOT is online; message handler is ready');
    } else if (connection === 'close') {
      status = 'DISCONNECTED';
      pairingRequestInProgress = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== 401) {
        console.error(`WhatsApp connection closed${code ? ` (status ${code})` : ''}; reconnecting…`);
        if (!reconnectTimer) reconnectTimer = setTimeout(() => {
          reconnectTimer = undefined;
          startBot().catch(error => console.error('Reconnect failed:', error));
        }, 3000);
      } else {
        pairingCode = 'Session rejected. Remove the saved auth session and link again.';
        console.error('WhatsApp session rejected. Remove auth and link again.');
      }
    } else if (connection === 'connecting' && !state.creds.registered && pairingNumber && !pairingRequestInProgress) {
      pairingRequestInProgress = true;
      try {
        pairingCode = await sock.requestPairingCode(pairingNumber);
      } catch (error) {
        pairingCode = 'Pairing failed. Check the phone number and try again.';
        console.error('Pairing failed:', error?.message || error);
      } finally {
        pairingRequestInProgress = false;
      }
    }
  });
}

startBot().catch(error => { console.error('Failed to start BRIAN BOT:', error); process.exit(1); });
