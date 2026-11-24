'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
const port = Number(process.env.PORT || 3000);
const authFolder = path.join(__dirname, 'auth');

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

let latestSocket = null;
let pairingCode = '';
let pairingStatus = 'Ready';
let pairingError = '';

async function createSocket(requestedNumber) {
  pairingError = '';
  pairingCode = '';
  pairingStatus = 'Starting pairing…';

  if (latestSocket?.end) {
    try {
      latestSocket.end(new Error('Starting a new pairing session'));
    } catch (_) {}
  }

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
  latestSocket = sock;

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update) => {
    if (update.pairingCode) {
      pairingCode = update.pairingCode;
      pairingStatus = 'Pairing code ready';
    }

    if (update.qr) {
      pairingStatus = 'Scan the QR code with WhatsApp';
    }

    if (update.connection === 'open') {
      pairingCode = '';
      pairingStatus = 'Connected successfully';
    }

    if (update.connection === 'close') {
      const statusCode = update.lastDisconnect?.error?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        pairingStatus = 'Logged out';
        pairingCode = '';
        fs.rmSync(authFolder, { recursive: true, force: true });
      } else {
        pairingStatus = 'Disconnected — request another pairing code';
      }
    }
  });

  if (!state.creds.registered) {
    const number = String(requestedNumber || '').replace(/[^0-9]/g, '');

    if (number) {
      pairingStatus = 'Generating pairing code…';
      const code = await sock.requestPairingCode(number);
      pairingCode = code;
      pairingStatus = 'Pairing code ready';
    } else {
      pairingStatus = 'Scan the QR code with WhatsApp';
    }
  }

  return sock;
}

app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Brian Bot Pairing</title>
  <style>
    :root { --green:#0b8f4d; --green-dark:#075b35; --gold:#f6c445; --cream:#fffaf0; --ink:#123126; }
    * { box-sizing:border-box; }
    body {
      margin:0; min-height:100vh; display:grid; place-items:center; padding:24px;
      font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
      color:var(--ink);
      background:radial-gradient(circle at 10% 10%,rgba(246,196,69,.25),transparent 28%),linear-gradient(135deg,#073b27,#0b8f4d 58%,#159b58);
    }
    .card { width:min(520px,100%); border:1px solid rgba(246,196,69,.75); border-radius:24px; padding:28px; background:rgba(255,250,240,.97); box-shadow:0 24px 70px rgba(3,52,31,.38); }
    .brand { display:flex; align-items:center; gap:12px; margin-bottom:22px; }
    .mark { width:48px; height:48px; display:grid; place-items:center; border-radius:14px; background:var(--green); color:var(--gold); font-size:26px; font-weight:900; box-shadow:inset 0 0 0 2px rgba(246,196,69,.55); }
    h1 { margin:0; font-size:25px; color:var(--green-dark); }
    .subtitle { margin:4px 0 0; color:#587064; font-size:14px; }
    label { display:block; margin-bottom:8px; font-weight:800; }
    input { width:100%; height:52px; border:2px solid #cfe3d7; border-radius:14px; padding:0 15px; font-size:16px; outline:none; background:white; }
    input:focus { border-color:var(--gold); box-shadow:0 0 0 4px rgba(246,196,69,.18); }
    .hint { margin:8px 0 18px; color:#6a7d73; font-size:13px; }
    button { border:0; border-radius:14px; cursor:pointer; font-weight:900; }
    .primary { width:100%; height:52px; color:white; background:linear-gradient(135deg,var(--green-dark),var(--green)); border:1px solid var(--gold); box-shadow:0 10px 24px rgba(11,143,77,.22); }
    .primary:hover { filter:brightness(1.06); }
    .status { min-height:22px; margin:16px 0 12px; color:var(--green-dark); font-weight:800; }
    .codebox { display:none; margin-top:12px; grid-template-columns:1fr 110px; gap:10px; }
    .code { height:58px; display:grid; place-items:center; border:2px dashed var(--gold); border-radius:14px; background:#fff; font-size:24px; letter-spacing:5px; font-weight:950; color:var(--green-dark); }
    .copy { background:var(--gold); color:#4f3b00; }
    .copy.copied { background:var(--green); color:white; }
    .steps { margin:18px 0 0; padding:14px 14px 14px 34px; border-radius:14px; background:#edf7f1; color:#40584c; font-size:13px; line-height:1.65; }
  </style>
</head>
<body>
  <main class="card">
    <div class="brand"><div class="mark">B</div><div><h1>Brian Bot Pairing</h1><p class="subtitle">Public WhatsApp pairing dashboard</p></div></div>

    <label for="number">Phone number <span style="color:#7c8d84;font-weight:600">(optional)</span></label>
    <input id="number" inputmode="tel" autocomplete="tel" placeholder="e.g. 254712345678">
    <p class="hint">Leave blank to pair by QR code. When entered, use international format without <strong>+</strong>.</p>

    <button class="primary" id="pair" type="button">Generate pairing code</button>
    <div class="status" id="status">Ready</div>

    <div class="codebox" id="codebox">
      <div class="code" id="code">— — — — — — — —</div>
      <button class="copy" id="copy" type="button">Copy</button>
    </div>

    <ol class="steps">
      <li>Enter an optional phone number or leave it blank.</li>
      <li>Open WhatsApp → Linked devices → Link a device.</li>
      <li>Use “Link with phone number instead”, or scan the QR code.</li>
    </ol>
  </main>

  <script>
    const pairButton = document.getElementById('pair');
    const numberInput = document.getElementById('number');
    const statusNode = document.getElementById('status');
    const codeNode = document.getElementById('code');
    const codeBox = document.getElementById('codebox');
    const copyButton = document.getElementById('copy');

    async function refreshStatus() {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        statusNode.textContent = data.error || data.status || 'Ready';
        if (data.code) {
          codeNode.textContent = data.code;
          codeBox.style.display = 'grid';
        }
      } catch (_) {}
    }

    pairButton.addEventListener('click', async () => {
      pairButton.disabled = true;
      pairButton.textContent = 'Generating…';
      statusNode.textContent = 'Starting pairing…';
      codeBox.style.display = 'none';
      try {
        const response = await fetch('/api/pair', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ number:numberInput.value.trim() })
        });
        const data = await response.json();
        statusNode.textContent = data.error || data.status || 'Ready';
        if (data.code) {
          codeNode.textContent = data.code;
          codeBox.style.display = 'grid';
        }
      } catch (_) {
        statusNode.textContent = 'Could not start pairing';
      } finally {
        pairButton.disabled = false;
        pairButton.textContent = 'Generate pairing code';
      }
    });

    copyButton.addEventListener('click', async () => {
      const value = codeNode.textContent.trim();
      if (!value || value.includes('—')) return;
      try { await navigator.clipboard.writeText(value); }
      catch (_) {
        const area = document.createElement('textarea'); area.value = value;
        document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
      }
      copyButton.textContent = 'Copied'; copyButton.classList.add('copied');
      setTimeout(() => { copyButton.textContent = 'Copy'; copyButton.classList.remove('copied'); }, 1800);
    });

    refreshStatus();
    setInterval(refreshStatus, 3000);
  </script>
</body>
</html>`);
});

app.get('/api/status', (req, res) => {
  res.json({ status: pairingStatus, code: pairingCode, error: pairingError });
});

app.post('/api/pair', async (req, res) => {
  try {
    await createSocket(req.body?.number || '');
    res.json({ status: pairingStatus, code: pairingCode, error: pairingError });
  } catch (error) {
    pairingError = error?.message || 'Could not start pairing';
    pairingStatus = 'Pairing failed';
    res.status(500).json({ status: pairingStatus, code: '', error: pairingError });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Brian Bot pairing dashboard listening on port ${port}`);
});
