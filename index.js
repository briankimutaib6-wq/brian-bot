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

let pairingCode = 'Enter your phone number to request a pairing code.';
let status = 'STARTING';
let socket;
let pairingRequestInProgress = false;
let reconnectTimer;
let connectionNoticeSent = false;
const START_TIME = Date.now();
let menuUsers = {};

const categories = [
  { key: 'owner', title: 'Owner Panel', icon: '👑', commands: Array(40).fill('owner') },
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
  res.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#071b18">
  <title>Pair your WhatsApp · Brian Bot</title>
  <style>
    :root{color-scheme:dark;--bg:#071b18;--panel:#102925;--muted:#a9c2bc;--text:#f4fbf8;--green:#25d366;--line:rgba(207,239,228,.13)}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 82% 10%,rgba(37,211,102,.16),transparent 34%),radial-gradient(ellipse at 8% 85%,rgba(43,145,120,.16),transparent 32%),var(--bg);color:var(--text);font:16px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;flex-direction:column}
    .wrap{width:min(1120px,calc(100% - 40px));margin:auto;padding:38px 0 30px}.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:56px}.brand{display:flex;align-items:center;gap:12px;font-weight:750;letter-spacing:.02em}.brand-mark{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:linear-gradient(145deg,#35e078,#0e9f5a);box-shadow:0 8px 26px #25d36638;font-size:21px}.brand small{display:block;color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.13em;text-transform:uppercase}.live{display:flex;align-items:center;gap:9px;color:var(--muted);font-size:13px}.dot{width:9px;height:9px;border-radius:50%;background:${online ? '#25d366' : '#f5b942'};box-shadow:0 0 14px ${online ? '#25d36688' : '#f5b94288'}}
    .grid{display:grid;grid-template-columns:1.04fr .96fr;gap:70px;align-items:center}.eyebrow{display:inline-flex;align-items:center;gap:8px;color:#7fe8a6;font-weight:700;font-size:12px;letter-spacing:.14em;text-transform:uppercase}.eyebrow:before{content:"";width:24px;height:1px;background:currentColor}h1{font-size:clamp(42px,6vw,68px);line-height:1.02;letter-spacing:-.055em;margin:19px 0 18px}.highlight{color:var(--green)}.intro{max-width:490px;color:var(--muted);font-size:17px;margin:0 0 30px}.steps{display:grid;gap:17px;margin:0;padding:0;list-style:none}.steps li{display:flex;gap:13px;align-items:flex-start;color:#d9e8e3;font-size:14px}.step-no{flex:none;display:grid;place-items:center;width:26px;height:26px;border:1px solid var(--line);border-radius:9px;color:#7fe8a6;font-size:12px;font-weight:700}.card{position:relative;padding:30px;border:1px solid var(--line);border-radius:24px;background:linear-gradient(145deg,rgba(20,51,45,.96),rgba(12,35,31,.96));box-shadow:0 28px 90px #0005;overflow:hidden}.card:before{content:"";position:absolute;width:210px;height:210px;right:-110px;top:-130px;border-radius:50%;background:#25d36616;filter:blur(4px)}.card-head{position:relative;display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}.card h2{margin:0;font-size:20px;letter-spacing:-.02em}.secure{padding:6px 9px;border:1px solid #25d36638;border-radius:99px;color:#9be7b4;font-size:11px;font-weight:700}.field-label{display:block;margin-bottom:9px;color:#dcebe6;font-size:13px;font-weight:650}.phone-wrap{display:flex;align-items:center;gap:10px;padding:0 14px;border:1px solid rgba(207,239,228,.2);border-radius:13px;background:#071b1880;transition:border-color .2s,box-shadow .2s}.phone-wrap:focus-within{border-color:#25d366;box-shadow:0 0 0 3px #25d3661c}.prefix{color:#8faaa3;font-size:14px}.phone-wrap input{width:100%;height:52px;border:0;outline:0;background:transparent;color:var(--text);font:inherit;font-size:15px}.phone-wrap input::placeholder{color:#718b84}.hint{margin:8px 0 19px;color:#8da8a0;font-size:12px}.submit{width:100%;height:52px;border:0;border-radius:13px;background:linear-gradient(100deg,#37df79,#20bf62);color:#062217;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 8px 24px #25d36627;transition:transform .18s,filter .18s}.submit:hover{transform:translateY(-1px);filter:brightness(1.06)}.submit:disabled{opacity:.65;cursor:wait;transform:none}.result{display:none;margin-top:18px;padding:15px;border:1px solid var(--line);border-radius:13px;background:#071b1880}.result.show{display:block}.result-label{color:var(--muted);font-size:12px}.code{display:block;margin:7px 0 0;color:#9df2b9;font-size:25px;font-weight:800;letter-spacing:.16em;word-break:break-all}.result.error{border-color:#f1797966}.result.error .code{color:#ffaaaa;font-size:14px;letter-spacing:0;font-weight:600}.footnote{margin:18px 0 0;color:#819b94;font-size:11px;text-align:center}.stats{display:flex;gap:24px;margin-top:32px;padding-top:22px;border-top:1px solid var(--line)}.stat strong{display:block;font-size:16px}.stat span{color:#8fa9a2;font-size:11px}.footer{display:flex;justify-content:space-between;gap:12px;margin-top:60px;color:#79938c;font-size:12px}.footer span:last-child{text-align:right}
    @media(max-width:800px){.wrap{padding-top:24px}.topbar{margin-bottom:38px}.grid{grid-template-columns:1fr;gap:34px}.intro{font-size:16px}.card{padding:24px}.footer{margin-top:38px}}@media(max-width:440px){.wrap{width:calc(100% - 28px)}.topbar{margin-bottom:31px}.live{font-size:11px}.card{padding:20px;border-radius:20px}.footer{font-size:11px}}
  </style>
</head>
<body>
  <main class="wrap">
    <header class="topbar"><div class="brand"><div class="brand-mark" aria-hidden="true">✦</div><div>BRIAN BOT<small>WhatsApp connection</small></div></div><div class="live"><span class="dot" aria-hidden="true"></span><span id="statusText">${online ? 'Connected' : escapeHtml(status)}</span></div></header>
    <section class="grid" aria-labelledby="page-title">
      <div class="intro-copy"><span class="eyebrow">Quick, secure setup</span><h1 id="page-title">Your bot,<br><span class="highlight">one link away.</span></h1><p class="intro">Connect your WhatsApp account to Brian Bot in seconds. Your number is only used to generate a secure pairing code.</p>
        <ol class="steps"><li><span class="step-no">1</span><span>Enter your WhatsApp number with its country code.</span></li><li><span class="step-no">2</span><span>Tap <strong>Linked devices</strong> in WhatsApp settings.</span></li><li><span class="step-no">3</span><span>Choose <strong>Link with phone number</strong> and enter your code.</span></li></ol>
      </div>
      <section class="card" aria-labelledby="pair-title"><div class="card-head"><h2 id="pair-title">Pair your device</h2><span class="secure">● &nbsp;SECURE LINK</span></div>
        <form id="pairForm" method="post" action="/pairing-number"><label class="field-label" for="phoneNumber">WhatsApp phone number</label><div class="phone-wrap"><span class="prefix" aria-hidden="true">＋</span><input id="phoneNumber" name="phoneNumber" type="tel" inputmode="numeric" autocomplete="tel" placeholder="254 712 345 678" pattern="[0-9+() .-]{7,24}" required aria-describedby="phoneHint"></div><p class="hint" id="phoneHint">Include your country code. Digits only is best (7–15 digits).</p><button class="submit" id="submitButton" type="submit">Generate pairing code <span aria-hidden="true">→</span></button></form>
        <div class="result" id="result" role="status" aria-live="polite"><span class="result-label" id="resultLabel">Your pairing code</span><strong class="code" id="pairingCode"></strong></div>
        <p class="footnote">Never share your pairing code with anyone.</p><div class="stats"><div class="stat"><strong>${commandCount}+</strong><span>listed commands</span></div><div class="stat"><strong>${escapeHtml(getRuntime())}</strong><span>uptime</span></div><div class="stat"><strong>${escapeHtml(getMemory())}</strong><span>memory</span></div></div>
      </section>
    </section>
    <footer class="footer"><span>© ${new Date().getFullYear()} Brian Bot</span><span>Keep your linked devices and codes private.</span></footer>
  </main>
  <script>
    const form=document.getElementById('pairForm');const button=document.getElementById('submitButton');const result=document.getElementById('result');const code=document.getElementById('pairingCode');const label=document.getElementById('resultLabel');
    form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;button.textContent='Generating secure code…';result.classList.remove('show','error');try{const response=await fetch(form.action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phoneNumber:form.phoneNumber.value})});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'Unable to generate a code. Please try again.');label.textContent='Your pairing code';code.textContent=data.pairingCode;result.classList.add('show');}catch(error){label.textContent='Could not create pairing code';code.textContent=error.message;result.classList.add('show','error');}finally{button.disabled=false;button.innerHTML='Generate pairing code <span aria-hidden="true">→</span>';}});
  </script>
</body>
</html>`);
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
