'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const app = express();
const port = Number(process.env.PORT || 3000);
const adminSecret = process.env.PAIRING_SECRET || '';
const authRoot = path.join(__dirname, 'auth', 'accounts');
const accountsFile = path.join(__dirname, 'accounts.json');

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const accounts = new Map();
const sockets = new Map();

function safeId(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
}

function loadAccounts() {
  if (!fs.existsSync(accountsFile)) return;
  try {
    for (const item of JSON.parse(fs.readFileSync(accountsFile, 'utf8'))) {
      if (!item?.id) continue;
      accounts.set(item.id, { id: item.id, name: item.name || item.id, status: 'Offline', code: '', error: '' });
    }
  } catch (error) {
    console.error('Could not load accounts:', error.message);
  }
}

function saveAccounts() {
  fs.mkdirSync(path.dirname(accountsFile), { recursive: true });
  fs.writeFileSync(accountsFile, JSON.stringify([...accounts.values()].map(({ id, name }) => ({ id, name })), null, 2));
}

function authorized(req) {
  if (!adminSecret) return false;
  const supplied = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return supplied.length === adminSecret.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(adminSecret));
}

function requireAdmin(req, res, next) {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized.' });
  next();
}

async function createSocket(accountId) {
  const account = accounts.get(accountId);
  if (!account) throw new Error('Account not found');

  account.error = '';
  account.code = '';
  account.status = 'Starting…';

  const oldSocket = sockets.get(accountId);
  if (oldSocket?.end) {
    try { oldSocket.end(new Error('Starting a new pairing session')); } catch (_) {}
  }

  const authFolder = path.join(authRoot, accountId);
  fs.mkdirSync(authFolder, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Brian Bot', 'Chrome', '1.0.0'],
  });
  sockets.set(accountId, sock);

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => {
    if (update.pairingCode) {
      account.code = update.pairingCode;
      account.status = 'Pairing code ready';
    }
    if (update.qr) account.status = 'Scan the QR code';
    if (update.connection === 'open') {
      account.code = '';
      account.status = 'Connected';
      account.error = '';
    }
    if (update.connection === 'close') {
      const code = update.lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        account.status = 'Logged out';
        account.code = '';
        fs.rmSync(authFolder, { recursive: true, force: true });
      } else {
        account.status = 'Disconnected';
      }
    }
  });

  return { sock, state };
}

async function pairAccount(accountId, requestedNumber) {
  const { sock, state } = await createSocket(accountId);
  const account = accounts.get(accountId);
  const number = String(requestedNumber || '').replace(/[^0-9]/g, '');

  if (state.creds.registered) {
    account.status = 'Already connected';
    account.code = '';
    return account;
  }

  if (!number) {
    account.status = 'Waiting for QR code';
    return account;
  }
  if (!/^\d{8,15}$/.test(number)) throw new Error('Use an international phone number, digits only.');

  account.status = 'Generating pairing code…';
  account.code = await sock.requestPairingCode(number);
  account.status = 'Pairing code ready';
  return account;
}

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Brian Bot — Accounts</title><style>body{margin:0;font-family:system-ui;background:#071b14;color:#effff6;padding:24px}.wrap{max-width:900px;margin:auto}.card{background:#10251c;border:1px solid #286744;border-radius:16px;padding:18px;margin:12px 0}.row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}input,button{height:46px;border:0;border-radius:10px;padding:0 12px}button{background:#25d366;font-weight:800;cursor:pointer}.danger{background:#ff7777}.code{font-size:32px;font-weight:900;letter-spacing:5px;text-align:center;border:2px dashed #f6c445;padding:14px;margin:12px 0}.muted{color:#aac3b6}@media(max-width:700px){.row{grid-template-columns:1fr}}</style></head><body><div class="wrap"><h1>Brian Bot — Multiple Accounts</h1><div class="card"><h3>Add account</h3><div class="row"><input id="id" placeholder="Account ID"><input id="name" placeholder="Display name"><input id="number" placeholder="254... (optional)"></div><button style="width:100%;margin-top:10px" onclick="addAccount()">Create account</button></div><div id="accounts"></div></div><script>let secret='';async function api(path,options={}){if(!secret)secret=prompt('Enter PAIRING_SECRET')||'';return fetch(path,{...options,headers:{'Content-Type':'application/json','Authorization':'Bearer '+secret,...(options.headers||{})}})}async function addAccount(){const r=await api('/api/accounts',{method:'POST',body:JSON.stringify({id:id.value,name:name.value,number:number.value})});const d=await r.json();if(!r.ok)return alert(d.error||'Failed');load()}async function pairAccount(id){const number=prompt('Phone number (digits only). Leave blank for QR:','')||'';const r=await api('/api/accounts/'+encodeURIComponent(id)+'/pair',{method:'POST',body:JSON.stringify({number})});const d=await r.json();if(!r.ok)return alert(d.error||'Failed');load()}async function removeAccount(id){if(confirm('Remove '+id+' and its session?')){await api('/api/accounts/'+encodeURIComponent(id),{method:'DELETE'});load()}}async function copyCode(code){await navigator.clipboard.writeText(code);alert('Copied')}async function load(){const r=await api('/api/accounts');if(r.status===401)return;const list=await r.json();accounts.innerHTML=list.map(a=>'<div class="card"><h3>'+escapeHtml(a.name)+' <span class="muted">('+escapeHtml(a.id)+')</span></h3><p>'+escapeHtml(a.status)+(a.error?' — '+escapeHtml(a.error):'')+'</p>'+ (a.code?'<div class="code">'+escapeHtml(a.code)+'</div><button onclick="copyCode('+JSON.stringify(a.code)+')">Copy code</button>':'')+'<p><button onclick="pairAccount('+JSON.stringify(a.id)+')">Generate pairing code</button> <button class="danger" onclick="removeAccount('+JSON.stringify(a.id)+')">Remove</button></p></div>').join('')}function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}load();setInterval(load,3000)</script></body></html>`);
});

app.get('/api/accounts', requireAdmin, (_req, res) => {
  res.json([...accounts.values()].map(({ id, name, status, code, error }) => ({ id, name, status, code, error })));
});

app.post('/api/accounts', requireAdmin, async (req, res) => {
  try {
    const id = safeId(req.body?.id);
    if (!id) return res.status(400).json({ error: 'A valid account ID is required.' });
    if (accounts.has(id)) return res.status(409).json({ error: 'That account ID already exists.' });

    const name = String(req.body?.name || id).trim().slice(0, 80) || id;
    accounts.set(id, { id, name, status: 'Ready', code: '', error: '' });
    saveAccounts();
    const account = await pairAccount(id, req.body?.number);
    res.json({ id, name, status: account.status, code: account.code, error: account.error });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Could not create account' });
  }
});

app.post('/api/accounts/:id/pair', requireAdmin, async (req, res) => {
  try {
    const id = safeId(req.params.id);
    if (!accounts.has(id)) return res.status(404).json({ error: 'Account not found.' });
    const account = await pairAccount(id, req.body?.number);
    res.json({ id, name: account.name, status: account.status, code: account.code, error: account.error });
  } catch (error) {
    const account = accounts.get(safeId(req.params.id));
    if (account) { account.error = error.message || 'Pairing failed'; account.status = 'Pairing failed'; }
    res.status(500).json({ error: error.message || 'Pairing failed' });
  }
});

app.delete('/api/accounts/:id', requireAdmin, (req, res) => {
  const id = safeId(req.params.id);
  if (!accounts.has(id)) return res.status(404).json({ error: 'Account not found.' });
  const sock = sockets.get(id);
  if (sock?.logout) sock.logout().catch(() => {});
  else if (sock?.end) sock.end(new Error('Account removed'));
  sockets.delete(id);
  accounts.delete(id);
  fs.rmSync(path.join(authRoot, id), { recursive: true, force: true });
  saveAccounts();
  res.json({ removed: id });
});

loadAccounts();
if (!adminSecret) {
  console.warn('PAIRING_SECRET is not set; the multi-account dashboard API is disabled.');
}
app.listen(port, '0.0.0.0', () => {
  console.log(`Brian Bot multi-account pairing listening on port ${port}`);
  for (const id of accounts.keys()) {
    createSocket(id).catch((error) => {
      const account = accounts.get(id);
      if (account) account.error = error.message || 'Could not reconnect';
    });
  }
});
