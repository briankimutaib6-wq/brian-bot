'use strict';

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { attachMessageHandler } = require('./lib/command-runtime');
const { categories, count: commandCount } = require('./lib/commands');
const pino = require('pino');
const http = require('http');

const PORT = Number(process.env.PORT || 10000);
let pairingNumber = (process.env.PHONE_NUMBER || '').replace(/[^0-9]/g, '');
let pairingCode = 'Enter your phone number to request a pairing code.';
let status = 'STARTING';
let socket;
let pairingRequestInProgress = false;
let reconnectTimer;
const START_TIME = Date.now();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}
function getRuntime() {
  const diff = Date.now() - START_TIME;
  const seconds = Math.floor(diff / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m ${seconds % 60}s`;
}
function getMemory() { return `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`; }
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 16384) return reject(new Error('Request body is too large.'));
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
async function requestPairingCode(number) {
  if (!/^\d{7,15}$/.test(number)) throw new Error('Enter a valid international phone number (7–15 digits).');
  if (!socket || status === 'CONNECTED') throw new Error('The bot is already connected or still starting.');
  if (pairingRequestInProgress) throw new Error('A pairing code is already being generated.');
  pairingNumber = number;
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
      const data = (req.headers['content-type'] || '').includes('application/json')
        ? JSON.parse(body || '{}')
        : Object.fromEntries(new URLSearchParams(body));
      const code = await requestPairingCode(String(data.phoneNumber || '').replace(/[^0-9]/g, ''));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, pairingCode: code }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: error.message }));
    }
    return;
  }
  if (req.method !== 'GET' || url.pathname !== '/') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  const menu = categories.map(category => `<h2>${category.icon} ${escapeHtml(category.title)}</h2><p>${category.commands.map(command => `.${command}`).join(' ')}</p>`).join('');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Brian Bot</title><style>body{margin:0;padding:32px;background:#071b18;color:#f4fbf8;font:16px/1.5 system-ui}main{max-width:1000px;margin:auto}section{padding:24px;border:1px solid #ffffff20;border-radius:18px;background:#102925;margin:18px 0}h1{color:#25d366}h2{font-size:20px}p{color:#b7ccc6;word-break:break-word}</style></head><body><main><h1>BRIAN BOT</h1><p>Status: ${escapeHtml(status)} · Uptime: ${escapeHtml(getRuntime())} · Memory: ${escapeHtml(getMemory())}</p><p>${commandCount} command entries</p>${menu}</main></body></html>`);
});
server.listen(PORT, () => console.log(`🌐 BRIAN BOT dashboard on ${PORT}`));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: state, logger: pino({ level: process.env.LOG_LEVEL || 'warn' }), printQRInTerminal: false });
  socket = sock;
  attachMessageHandler(sock);
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      status = 'CONNECTED';
      pairingCode = '✅ CONNECTED';
      pairingRequestInProgress = false;
      console.log('✅ BRIAN BOT is online; message handler is ready');
    } else if (connection === 'close') {
      status = 'DISCONNECTED';
      pairingRequestInProgress = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== 401 && !reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = undefined;
          startBot().catch(error => console.error('Reconnect failed:', error));
        }, 3000);
      }
    } else if (connection === 'connecting' && !state.creds.registered && pairingNumber && !pairingRequestInProgress) {
      pairingRequestInProgress = true;
      try { pairingCode = await sock.requestPairingCode(pairingNumber); }
      catch (error) { pairingCode = 'Pairing failed. Check the phone number and try again.'; console.error('Pairing failed:', error.message); }
      finally { pairingRequestInProgress = false; }
    }
  });
}

startBot().catch(error => { console.error('Failed to start BRIAN BOT:', error); process.exit(1); });
