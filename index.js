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

  const menu = categories.map(category => `
    <article class="command-card">
      <div class="command-heading"><span class="category-icon">${category.icon}</span><div><h2>${escapeHtml(category.title)}</h2><span class="command-count">${category.count} commands</span></div></div>
      <div class="command-list">${category.commands.map(command => `<code>.${escapeHtml(command)}</code>`).join('')}</div>
    </article>`).join('');
  const codeReady = pairingCode !== 'Enter your phone number to request a pairing code.'
    && pairingCode !== '✅ CONNECTED'
    && !pairingCode.startsWith('Pairing failed.');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#071b15">
  <title>Brian Bot | Pairing &amp; Commands</title>
  <style>
    :root{color-scheme:dark;--bg:#071b15;--surface:#0d281f;--surface-2:#123328;--green:#39d98a;--green-deep:#11794d;--gold:#e8bd59;--text:#f2f7f2;--muted:#a9bdb1;--line:rgba(225,243,231,.12)}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 82% 0%,rgba(57,217,138,.12),transparent 38%),radial-gradient(ellipse at 0% 40%,rgba(232,189,89,.08),transparent 34%),var(--bg);color:var(--text);font:15px/1.6 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input{font:inherit}button{cursor:pointer}a{color:inherit}main{width:min(1120px,calc(100% - 40px));margin:auto;padding:38px 0 64px}.topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:54px}.brand{display:flex;align-items:center;gap:12px;font-weight:800;letter-spacing:.07em}.brand-mark{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:linear-gradient(145deg,var(--green),#168552);color:#062217;font-size:21px;box-shadow:0 8px 26px #26c87833}.live{display:inline-flex;align-items:center;gap:9px;padding:8px 13px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:12px;text-transform:capitalize}.live-dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 12px #39d98a99}.hero{display:grid;grid-template-columns:1.04fr .96fr;gap:38px;align-items:center;margin-bottom:76px}.eyebrow{display:flex;align-items:center;gap:9px;color:var(--gold);font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.eyebrow:before{content:"";width:24px;height:1px;background:var(--gold)}h1{max-width:620px;margin:17px 0 15px;font-size:clamp(38px,6vw,68px);line-height:1.03;letter-spacing:-.055em}h1 span{color:var(--green)}.intro{max-width:490px;margin:0;color:var(--muted);font-size:16px}.pair-card{padding:27px;border:1px solid rgba(57,217,138,.22);border-radius:24px;background:linear-gradient(145deg,rgba(18,51,40,.96),rgba(9,31,24,.98));box-shadow:0 24px 70px #0005,0 0 50px #35d9880c}.card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px}.card-top h2{margin:0 0 4px;font-size:21px}.card-top p{margin:0;color:var(--muted);font-size:13px}.step{display:grid;place-items:center;width:35px;height:35px;flex:none;border:1px solid #e8bd5944;border-radius:12px;color:var(--gold);font-weight:800}.field-label{display:block;margin:0 0 8px;color:#dce9df;font-size:13px;font-weight:650}.phone-wrap{display:flex;align-items:center;gap:10px;padding:5px;border:1px solid var(--line);border-radius:14px;background:#061a13;transition:border-color .2s,box-shadow .2s}.phone-wrap:focus-within{border-color:var(--green);box-shadow:0 0 0 3px #39d98a1c}.phone-icon{padding-left:12px;color:var(--gold);font-size:18px}.phone-wrap input{width:100%;min-width:0;padding:12px 8px;border:0;outline:0;background:transparent;color:var(--text)}.phone-wrap input::placeholder{color:#718a7d}.primary-btn,.copy-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:12px;font-weight:800;transition:transform .18s,filter .18s,opacity .18s}.primary-btn{width:100%;margin-top:13px;padding:13px 18px;background:linear-gradient(100deg,#49e39a,#26bd75);color:#052317;box-shadow:0 8px 24px #31d48625}.primary-btn:hover,.copy-btn:hover{filter:brightness(1.08);transform:translateY(-1px)}.primary-btn:disabled{cursor:wait;opacity:.65;transform:none}.result{margin-top:17px;padding:14px;border:1px solid #e8bd5933;border-radius:14px;background:#091e17}.result-label{display:block;margin-bottom:8px;color:var(--gold);font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.code-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.pair-code{overflow-wrap:anywhere;color:var(--text);font:700 19px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}.copy-btn{flex:none;padding:9px 12px;border:1px solid #e8bd5944;background:#e8bd5914;color:var(--gold);font-size:12px}.copy-btn:disabled{cursor:not-allowed;opacity:.45}.hint,.feedback{margin:10px 0 0;color:var(--muted);font-size:12px}.feedback{min-height:18px}.feedback.error{color:#ff9b8c}.feedback.success{color:var(--green)}.section-head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:23px}.section-head h2{margin:0;font-size:clamp(25px,4vw,36px);letter-spacing:-.035em}.section-head p{margin:6px 0 0;color:var(--muted);font-size:14px}.total{padding:8px 12px;border:1px solid #e8bd5933;border-radius:999px;color:var(--gold);font-size:12px;font-weight:700;white-space:nowrap}.command-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.command-card{min-width:0;padding:21px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(150deg,#102c22,#0b211a);transition:border-color .2s,transform .2s}.command-card:hover{transform:translateY(-2px);border-color:#39d98a55}.command-heading{display:flex;align-items:center;gap:12px;margin-bottom:17px}.category-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:13px;background:#39d98a14;font-size:20px}.command-heading h2{margin:0;font-size:16px}.command-count{color:var(--muted);font-size:11px}.command-list{display:flex;flex-wrap:wrap;gap:8px}.command-list code{padding:6px 9px;border:1px solid #39d98a24;border-radius:8px;background:#071b15;color:#bbf3d4;font-size:12px}.footer{display:flex;justify-content:space-between;gap:15px;margin-top:35px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:12px}.footer strong{color:var(--gold)}
    @media(max-width:760px){main{width:min(100% - 28px,560px);padding-top:23px}.topbar{margin-bottom:38px}.hero{grid-template-columns:1fr;gap:26px;margin-bottom:56px}.hero-copy{text-align:center}.hero-copy .eyebrow{justify-content:center}.intro{margin:auto}.pair-card{padding:21px}.command-grid{grid-template-columns:1fr}.section-head{align-items:flex-start;flex-direction:column;gap:12px}.footer{flex-direction:column;gap:5px}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}
  </style>
</head>
<body>
  <main>
    <header class="topbar">
      <div class="brand"><span class="brand-mark" aria-hidden="true">B</span><span>BRIAN BOT</span></div>
      <div class="live"><span class="live-dot" aria-hidden="true"></span><span>${escapeHtml(status.toLowerCase())}</span></div>
    </header>
    <section class="hero" aria-labelledby="page-title">
      <div class="hero-copy">
        <div class="eyebrow">Your WhatsApp companion</div>
        <h1 id="page-title">A smarter way to <span>stay connected.</span></h1>
        <p class="intro">Link your WhatsApp in moments, then explore a handy collection of tools made for your chats.</p>
      </div>
      <section class="pair-card" aria-labelledby="pair-title">
        <div class="card-top"><div><h2 id="pair-title">Connect your WhatsApp</h2><p>Get a secure one-time pairing code.</p></div><span class="step" aria-hidden="true">01</span></div>
        <form id="pairing-form">
          <label class="field-label" for="phone-number">Phone number with country code</label>
          <div class="phone-wrap"><span class="phone-icon" aria-hidden="true">＋</span><input id="phone-number" name="phoneNumber" type="tel" inputmode="tel" autocomplete="tel" placeholder="e.g. 254712345678" pattern="[+0-9 ()-]{7,20}" required aria-describedby="phone-hint"></div>
          <button class="primary-btn" id="request-code" type="submit"><span>Request pairing code</span><span aria-hidden="true">→</span></button>
          <p class="hint" id="phone-hint">Enter 7–15 digits, including your country code.</p>
        </form>
        <div class="result" aria-live="polite" aria-atomic="true">
          <span class="result-label">Your pairing code</span>
          <div class="code-row"><code class="pair-code" id="pairing-code">${escapeHtml(pairingCode)}</code><button class="copy-btn" id="copy-code" type="button" ${codeReady ? '' : 'disabled'} aria-label="Copy pairing code">Copy code</button></div>
          <p class="feedback" id="pairing-feedback" role="status">${codeReady ? 'On WhatsApp, choose Linked devices → Link a device → Link with phone number instead.' : ''}</p>
        </div>
      </section>
    </section>
    <section aria-labelledby="commands-title">
      <div class="section-head"><div><div class="eyebrow">Explore what it can do</div><h2 id="commands-title">Command collection</h2><p>Type a command in your chat to get started.</p></div><span class="total">${commandCount} command entries</span></div>
      <div class="command-grid">${menu}</div>
    </section>
    <footer class="footer"><span>Made to make your chats a little easier.</span><span><strong>BRIAN BOT</strong> · Stay connected</span></footer>
  </main>
  <script>
    (function () {
      var form = document.getElementById('pairing-form');
      var phone = document.getElementById('phone-number');
      var submit = document.getElementById('request-code');
      var code = document.getElementById('pairing-code');
      var copy = document.getElementById('copy-code');
      var feedback = document.getElementById('pairing-feedback');
      function setFeedback(message, kind) {
        feedback.textContent = message;
        feedback.className = 'feedback' + (kind ? ' ' + kind : '');
      }
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var number = phone.value.replace(/[^0-9]/g, '');
        if (number.length < 7 || number.length > 15) {
          setFeedback('Please enter a valid international number with 7–15 digits.', 'error');
          phone.focus();
          return;
        }
        submit.disabled = true;
        submit.querySelector('span').textContent = 'Requesting code…';
        copy.disabled = true;
        setFeedback('Generating your pairing code…');
        try {
          var response = await fetch('/pairing-number', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: number })
          });
          var result = await response.json();
          if (!response.ok || !result.ok) throw new Error(result.error || 'Could not generate a pairing code. Please try again.');
          code.textContent = result.pairingCode;
          copy.disabled = false;
          setFeedback('On WhatsApp, choose Linked devices → Link a device → Link with phone number instead.', 'success');
        } catch (error) {
          code.textContent = 'No code yet';
          setFeedback(error.message || 'Something went wrong. Please try again.', 'error');
        } finally {
          submit.disabled = false;
          submit.querySelector('span').textContent = 'Request pairing code';
        }
      });
      copy.addEventListener('click', async function () {
        var value = code.textContent.trim();
        if (!value || copy.disabled) return;
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
          } else {
            var selection = document.createElement('textarea');
            selection.value = value;
            selection.setAttribute('readonly', '');
            selection.style.position = 'fixed';
            selection.style.opacity = '0';
            document.body.appendChild(selection);
            selection.select();
            var copied = document.execCommand('copy');
            selection.remove();
            if (!copied) throw new Error('Copy was blocked by the browser.');
          }
          copy.textContent = 'Copied!';
          setFeedback('Pairing code copied. Enter it in WhatsApp to link your device.', 'success');
          window.setTimeout(function () { copy.textContent = 'Copy code'; }, 1800);
        } catch (error) {
          setFeedback('Could not copy automatically. Please select and copy the code.', 'error');
        }
      });
    }());
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
