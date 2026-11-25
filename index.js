'use strict';

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error?.message || error);
});
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error?.message || error);
});

const express = require('express');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadContentFromMessage,
} = require('@whiskeysockets/baileys');
const crypto = require('node:crypto');

const OWNER = (process.env.OWNER_NUMBER || '').replace(/\D/g, '');
const PAIRING_SECRET = process.env.PAIRING_SECRET || '';
const PREFIX = '.';
const PORT = Number(process.env.PORT) || 3000;
const PAIR_RATE_WINDOW_MS = 15 * 60 * 1000;
const PAIR_RATE_LIMIT = 5;
const pairAttempts = new Map();
let lastPairAt = 0;
let pairInProgress = false;
let isConnected = false;
let sock = null;
let startTime = Date.now();

if (!/^\d{8,15}$/.test(OWNER)) {
  throw new Error('Set OWNER_NUMBER to the bot owner phone number, digits only, including country code.');
}

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.type('html').send('<h1>👑 BRIAN BOT RUNNING</h1><p><a href="/pairing">Secure pairing</a></p><p><a href="/status">Status</a></p>');
});
app.get('/status', (_req, res) => res.json({ connected: isConnected, owner: OWNER, uptime: Math.floor((Date.now()-startTime)/1000) }));

// ===== PAIRING PAGE - UNCHANGED DESIGN =====
const PAIRING_HTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Brian Bot - Secure Pairing</title><style>*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}body{background:linear-gradient(135deg,#075e54,#25d366);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:#fff;width:100%;max-width:430px;border-radius:24px;padding:28px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.25)}.btn{width:100%;padding:15px;border:none;border-radius:14px;font-size:17px;font-weight:bold;color:#fff;background:#25d366;cursor:pointer;margin-top:12px}.btn:disabled{opacity:.6}input{width:100%;padding:14px;border:2px solid #e0e0e0;border-radius:12px;font-size:16px;text-align:center;margin-top:8px;outline:none}#code{font-size:34px;font-weight:900;letter-spacing:5px;color:#075e54;margin:12px 0;background:#fff;padding:10px;border-radius:10px;border:1px solid #c8e6c9}#codeBox{display:none;background:#f0fff4;border:2px dashed #25d366;border-radius:16px;padding:18px;margin-top:15px}.copyBtn{background:#075e54;color:#fff;border:none;padding:12px;border-radius:10px;font-weight:bold;width:100%;cursor:pointer}.waBtn{display:block;margin-top:12px;background:#25d366;color:#fff;text-decoration:none;padding:13px;border-radius:10px;font-weight:bold}.bar{height:10px;background:#e0e0e0;border-radius:10px;margin-top:8px;overflow:hidden}.fill{height:100%;background:#25d366;width:100%;transition:width 1s linear}</style></head><body><div class="card"><div style="font-size:50px">🔒</div><h1>BRIAN BOT</h1><p>Secure Pairing - Owner Only</p><p style="margin-top:10px">Linking: <b>+${OWNER}</b><br><span style="font-size:12px;color:#888">Number is locked and cannot be changed</span></p><p style="text-align:left;font-size:13px;font-weight:bold;margin-top:15px">🔑 Pairing Secret</p><input id="secret" type="password" autocomplete="current-password" placeholder="Enter PAIRING_SECRET"><button class="btn" id="generate" onclick="generateCode()">🔑 GENERATE CODE</button><p id="status" style="color:#e65100;font-size:13px;margin-top:10px;font-weight:bold"></p><div id="codeBox"><div>YOUR CODE FOR +${OWNER}</div><div id="code">--------</div><button class="copyBtn" onclick="copyCode()">📋 COPY CODE</button><p id="copied" style="color:green;font-size:12px;margin-top:8px"></p><a class="waBtn" href="whatsapp://linked_devices">📱 OPEN WHATSAPP</a><p id="timer" style="font-weight:bold;margin-top:10px">⏳ 60 seconds left</p><div class="bar"><div class="fill" id="fill"></div></div></div><p style="text-align:left;background:#f8f8f8;border-radius:12px;padding:12px;margin-top:15px;font-size:12px;line-height:1.8">1. Enter your pairing secret<br>2. Tap GENERATE<br>3. Copy the code<br>4. WhatsApp → Linked Devices → Link with phone number<br>5. Paste promptly</p></div><script>let timer,seconds=60;async function generateCode(){const secret=document.getElementById('secret').value;const status=document.getElementById('status');const button=document.getElementById('generate');if(!secret){status.innerText='❌ Enter PAIRING_SECRET';return}button.disabled=true;status.innerText='Generating...';try{const response=await fetch('/pair',{method:'POST',headers:{Authorization:'Bearer '+secret}});const data=await response.json();if(data.code){document.getElementById('codeBox').style.display='block';document.getElementById('code').innerText=data.code;status.innerText='✅ Code generated';try{await navigator.clipboard.writeText(data.code);document.getElementById('copied').innerText='✅ Auto-copied!'}catch(error){document.getElementById('copied').innerText='Copy the code using the button below.'}startTimer()}else{status.innerText='❌ '+(data.error||'Pairing failed')}}catch(error){status.innerText='❌ Server error'}finally{button.disabled=false}}function copyCode(){const value=document.getElementById('code').innerText;navigator.clipboard.writeText(value).then(()=>document.getElementById('copied').innerText='�� Copied!').catch(()=>{document.getElementById('copied').innerText='Clipboard unavailable; select and copy the code.'})}function startTimer(){seconds=60;clearInterval(timer);const fill=document.getElementById('fill');fill.style.width='100%';timer=setInterval(()=>{seconds--;document.getElementById('timer').innerText=seconds>0?'⏳ '+seconds+' seconds left':'❌ Code expired';fill.style.width=(seconds/60*100)+'%';if(seconds<=0)clearInterval(timer)},1000)}</script></body></html>`;

app.get('/pairing', (_req, res) => res.type('html').send(PAIRING_HTML));

// ===== /pair - OWNER-ONLY PAIRING =====
// The owner number is fixed by OWNER_NUMBER; requests cannot select another number.
app.post('/pair', async (req, res) => {
  if (!PAIRING_SECRET) {
    return res.status(503).json({ error: 'Pairing is disabled; configure PAIRING_SECRET.' });
  }
  const supplied = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const authorized = supplied.length === PAIRING_SECRET.length &&
    crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(PAIRING_SECRET));
  if (!authorized) return res.status(401).json({ error: 'Unauthorized.' });

  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const attempts = (pairAttempts.get(ip) || []).filter((time) => now - time < PAIR_RATE_WINDOW_MS);
  if (attempts.length >= PAIR_RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many pairing attempts. Try again later.' });
  }
  attempts.push(now);
  pairAttempts.set(ip, attempts);

  if (!sock) return res.status(503).json({ error: 'Bot is starting. Try again shortly.' });
  if (sock.authState.creds.registered) {
    return res.status(409).json({ error: 'This bot is already linked.' });
  }
  if (pairInProgress || now - lastPairAt < 60_000) {
    return res.status(429).json({ error: 'A pairing code was recently requested. Try again in a minute.' });
  }

  const requestedPhone = req.body?.phoneNumber || req.body?.phone || req.body?.number;
  if (requestedPhone && String(requestedPhone).replace(/\D/g, '') !== OWNER) {
    return res.status(403).json({ error: 'Pairing is restricted to the configured owner number.' });
  }
  const phoneToLink = OWNER;
  if (!/^\d{8,15}$/.test(phoneToLink)) {
    return res.status(400).json({ error: 'Invalid phone number.' });
  }

  pairInProgress = true;
  lastPairAt = now;
  try {
    const code = await sock.requestPairingCode(phoneToLink);
    return res.json({ code, phoneNumber: phoneToLink, expiresIn: 60 });
  } catch (error) {
    console.error('Pairing request failed:', error?.message || error);
    return res.status(502).json({ error: 'Could not generate a pairing code.' });
  } finally {
    pairInProgress = false;
  }
});

app.listen(PORT, () => console.log(`HTTP server listening on port ${PORT}`));

function jidNumber(jid = '') {
  return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}
function getMessageText(message = {}) {
  return message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    '';
}
function formatUptime(ms){
  const s = Math.floor(ms/1000);
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  return `${h}h ${m}m ${sec}s`;
}

async function start() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    sock = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: state,
      browser: ['Brian Bot', 'Chrome', '1.0'],
    });
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
      if (connection === 'close') {
        isConnected = false;
        sock = null;
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) setTimeout(start, 3000);
      } else if (connection === 'open') {
        isConnected = true;
        startTime = Date.now();
        console.log('Brian Bot connected.');
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      const msg = messages?.[0];
      if (!msg?.message || msg.key.fromMe) return;
      const from = msg.key.remoteJid;
      if (!from) return;
      const sender = msg.key.participant || from;
      const senderNumber = jidNumber(sender);
      const isOwner = senderNumber === OWNER;
      const isGroup = from.endsWith('@g.us');
      const body = getMessageText(msg.message);
      if (!body.startsWith(PREFIX)) return;

      const args = body.slice(PREFIX.length).trim().split(/\s+/);
      const command = (args.shift() || '').toLowerCase();
      const text = args.join(' ');
      const context = msg.message.extendedTextMessage?.contextInfo || {};
      const quoted = context.quotedMessage;
      const mentioned = context.mentionedJid || [];
      const reply = (value) => sock.sendMessage(from, { text: value }, { quoted: msg });

      try {
        if (command === 'ping') {
          const t1 = Date.now();
          await reply('🏓 Pong! ' + (Date.now()-t1) + 'ms');
        } else if (command === 'menu' || command === 'help') {
          await reply('👑 *BRIAN BOT MENU*\n\n*General*\n.ping - speed\n.time - Kenya time\n.alive - check bot\n.uptime - bot uptime\n.owner - owner info\n.me - your info\n\n*Fun*\n.joke - real joke\n.quote - real quote\n.fact - real fact\n.image <text> - real AI image\n\n*Tools*\n.sticker - reply to image/video\n.tagall - tag all (owner)\n.link - group link (owner)\n.kick / .promote / .demote - admin (owner)\n\n*Group*\n.groupinfo\n.admins');
        } else if (command === 'time') {
          await reply('🕐 Kenya: ' + new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }));
        } else if (command === 'alive') {
          await reply('✅ Brian Bot Alive!\n⏱ Uptime: ' + formatUptime(Date.now()-startTime) + '\n📱 Connected: Yes');
        } else if (command === 'uptime') {
          await reply('⏱ Uptime: ' + formatUptime(Date.now()-startTime));
        } else if (command === 'owner') {
          await sock.sendMessage(from, { text: '👑 Owner: @' + OWNER, mentions: [OWNER + '@s.whatsapp.net'] }, { quoted: msg });
        } else if (command === 'me') {
          await reply('👤 Your Number: +' + senderNumber + '\n💬 Chat: ' + (isGroup ? 'Group' : 'Private') + '\n👑 Owner: ' + (isOwner ? 'Yes' : 'No'));
        } else if (command === 'joke') {
          const r = await fetch('https://official-joke-api.appspot.com/random_joke');
          if (!r.ok) throw new Error('Joke service unavailable');
          const j = await r.json();
          await reply('😂 *JOKE*\n\n' + j.setup + '\n\n' + j.punchline);
        } else if (command === 'quote') {
          const r = await fetch('https://api.quotable.io/random');
          if (!r.ok) throw new Error('Quote service unavailable');
          const q = await r.json();
          await reply('💬 "' + q.content + '"\n- ' + q.author);
        } else if (command === 'fact') {
          const r = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
          if (!r.ok) throw new Error('Fact service unavailable');
          const f = await r.json();
          await reply('🧠 *DID YOU KNOW?*\n\n' + f.text);
        } else if (command === 'image' || command === 'img') {
          if (!text) return await reply('❌ Usage: .image lion with crown');
          await reply('🎨 Generating image for: ' + text + ' ...');
          const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(text) + '?width=1024&height=1024&seed=' + Math.floor(Math.random()*99999) + '&nologo=true';
          await sock.sendMessage(from, { image: { url }, caption: '🖼️ ' + text }, { quoted: msg });
        } else if (command === 'sticker' || command === 's') {
          const imageMessage = msg.message.imageMessage || quoted?.imageMessage;
          const videoMessage = msg.message.videoMessage || quoted?.videoMessage;
          if (!imageMessage && !videoMessage) return await reply('❌ Reply to an image or video with .sticker');
          const stream = await downloadContentFromMessage(imageMessage || videoMessage, imageMessage ? 'image' : 'video');
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          await sock.sendMessage(from, { sticker: Buffer.concat(chunks) }, { quoted: msg });
        } else if (command === 'groupinfo' || command === 'ginfo') {
          if (!isGroup) return await reply('❌ Group only.');
          const meta = await sock.groupMetadata(from);
          await reply('👥 *GROUP INFO*\n\nName: ' + meta.subject + '\nMembers: ' + meta.participants.length + '\nCreated: ' + new Date(meta.creation*1000).toLocaleDateString('en-KE') + '\nDesc: ' + (meta.desc || 'No description'));
        } else if (command === 'admins') {
          if (!isGroup) return await reply('❌ Group only.');
          const meta = await sock.groupMetadata(from);
          const admins = meta.participants.filter(p => p.admin);
          await sock.sendMessage(from, { text: '👑 *ADMINS (' + admins.length + ')*\n\n' + admins.map(a => '@' + jidNumber(a.id)).join('\n'), mentions: admins.map(a => a.id) }, { quoted: msg });
        } else if (['kick', 'promote', 'demote'].includes(command)) {
          if (!isGroup) return await reply('❌ Group only.');
          if (!isOwner) return await reply('❌ Only owner can use this.');
          if (!mentioned[0]) return await reply(`❌ Usage: .${command} @user`);
          const metadata = await sock.groupMetadata(from);
          const ownerP = metadata.participants.find(p => jidNumber(p.id) === OWNER);
          const botNum = jidNumber(sock.user?.id || '');
          const botP = metadata.participants.find(p => jidNumber(p.id) === botNum);
          const isAdmin = (p) => Boolean(p?.admin === 'admin' || p?.admin === 'superadmin');
          if (!isAdmin(ownerP)) return await reply('❌ Owner must be group admin.');
          if (!isAdmin(botP)) return await reply('❌ Bot must be group admin.');
          await sock.groupParticipantsUpdate(from, [mentioned[0]], command === 'kick' ? 'remove' : command);
          await reply(command === 'kick' ? '✅ Removed.' : `✅ ${command === 'promote' ? 'Promoted' : 'Demoted'}.`);
        } else if (command === 'tagall') {
          if (!isGroup) return await reply('❌ Group only.');
          if (!isOwner) return await reply('❌ Only owner can use this.');
          const metadata = await sock.groupMetadata(from);
          const members = metadata.participants.map(p => p.id);
          const list = metadata.participants.map(p => '@' + jidNumber(p.id)).join(' ');
          await sock.sendMessage(from, { text: '📢 *TAG ALL*\n\n' + (text || 'Hello!') + '\n\n' + list, mentions: members }, { quoted: msg });
        } else if (command === 'link') {
          if (!isGroup) return await reply('❌ Group only.');
          if (!isOwner) return await reply('❌ Only owner can use this.');
          const code = await sock.groupInviteCode(from);
          await reply('🔗 https://chat.whatsapp.com/' + code);
        } else {
          await reply('❌ Unknown: .' + command + '\nType .menu');
        }
      } catch (error) {
        console.error('Command failed:', error?.message || error);
        await reply('❌ Command failed. Try again.');
      }
    });
  } catch (error) {
    console.error('Bot start failed; retrying:', error?.message || error);
    sock = null;
    setTimeout(start, 5000);
  }
}

start();
console.log('🚀 Starting Brian Bot...');
