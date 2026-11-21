'use strict';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');
const commandLibrary = require('./lib/commands');

const BOT_PREFIX = '.';
const PORT = Number(process.env.PORT || 3000);
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[char]);
}

function normalizeJid(jid = '') {
  return String(jid).split('@')[0].replace(/[^0-9]/g, '');
}

function linkedJid(sock) {
  const id = sock.user?.id || '';
  const number = normalizeJid(id);
  return number ? `${number}@s.whatsapp.net` : '';
}

function isOwner(sock, jid) {
  const sender = normalizeJid(jid);
  return Boolean(sender && (sender === OWNER_JID || sender === normalizeJid(sock.user?.id)));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 16_384) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      } else chunks.push(chunk);
    });
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
      const data = (req.headers['content-type'] || '').includes('application/json')
        ? JSON.parse(body || '{}')
        : Object.fromEntries(new URLSearchParams(body));
      const code = await requestPairingCode(String(data.phoneNumber || '').replace(/[^0-9]/g, ''));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, pairingCode: code }));
    } catch (error) {
      if (!res.headersSent) res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: error.message }));
    }
    return;
  }
  if (req.method !== 'GET' || url.pathname !== '/') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  const online = status === 'CONNECTED';
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="10"><title>BRIAN BOT · Link</title>
<style>:root{color-scheme:dark;--gold:#ffd76a;--green:#25d366}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:24px;display:grid;place-items:center;font:16px system-ui,Arial;color:#f4fff8;background:radial-gradient(ellipse at top,#135337,#07150f 65%)}main{width:min(720px,100%)}header,section{border:1px solid #ffffff25;border-radius:22px;background:#0a1d14e8;box-shadow:0 20px 70px #0005;padding:26px;margin:14px 0}header{text-align:center}.crown{font-size:48px}h1{color:var(--gold);letter-spacing:4px;margin:6px}.tag{color:#abd2b9}.status{display:inline-block;margin:12px;padding:10px 18px;border-radius:30px;background:${online ? '#127a3e' : '#654c15'};font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}h2{font-size:18px;color:var(--gold);margin-top:0}.code{overflow-wrap:anywhere;padding:16px;text-align:center;border:1px solid var(--green);border-radius:12px;font-weight:700;font-size:20px;min-height:58px}input,button{width:100%;padding:14px;border-radius:11px;font:inherit}input{color:white;background:#06130d;border:1px solid #607c68}button{margin-top:10px;border:0;background:var(--gold);color:#152116;font-weight:800;cursor:pointer}li{margin:10px 0;color:#d1e4d7}footer{text-align:center;color:#8aa393;font-size:13px;padding:12px}@media(max-width:600px){.grid{grid-template-columns:1fr}body{padding:14px}header,section{padding:20px}}</style></head>
<body><main><header><div class="crown">👑</div><h1>BRIAN BOT</h1><div class="tag">A brighter WhatsApp assistant</div><div class="status">${online ? '✅ ONLINE · CONNECTED' : `⏳ ${escapeHtml(status)}`}</div></header>
<div class="grid"><section><h2>🔐 Pairing code</h2><div id="code" class="code">${escapeHtml(pairingCode)}</div></section><section><h2>📱 Link your WhatsApp</h2><form id="pair"><label for="number">Phone number with country code</label><input id="number" inputmode="tel" autocomplete="tel" placeholder="15551234567" value="${escapeHtml(pairingNumber)}"><button>Generate pairing code</button></form></section></div>
<section><h2>Quick setup</h2><ol><li>Enter the linked phone number in international format.</li><li>Choose <b>Linked devices → Link a device → Link with phone number instead</b> in WhatsApp.</li><li>Enter the displayed code. Message the bot to get an instant greeting; send <b>.menu</b> for commands.</li></ol></section><footer>BRIAN BOT · Securely keep your auth folder private.</footer></main>
<script>document.getElementById('pair').addEventListener('submit',async e=>{e.preventDefault();const out=document.getElementById('code');out.textContent='Generating…';try{const r=await fetch('/pairing-number',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phoneNumber:document.getElementById('number').value})});const d=await r.json();if(!r.ok)throw Error(d.error||'Pairing failed');out.textContent=d.pairingCode}catch(err){out.textContent=err.message}})</script></body></html>`);
});
server.listen(PORT, () => console.log(`🌐 BRIAN BOT dashboard listening on port ${PORT}`));

function getMessageText(message = {}) {
  const content = message.ephemeralMessage?.message || message.viewOnceMessage?.message || message.viewOnceMessageV2?.message || message;
  return content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption ||
    content.videoMessage?.caption || content.documentMessage?.caption || content.buttonsResponseMessage?.selectedButtonId ||
    content.listResponseMessage?.singleSelectReply?.selectedRowId || '';
}

function menuText(category, page) {
  if (!category) {
    return `👑 *BRIAN BOT · COMMAND CENTER*\n━━━━━━━━━━━━━━━━━━\n✨ ${commandLibrary.count}+ ready-to-use command shortcuts\n\n📌 *Core* — menu, ping, hi, time, date, uptime, about, jid, calc, reverse, base64\n👥 *Groups* — groupinfo, members, tagall, promote, demote, kick\n🖼️ *Media* — mediainfo, save\n🤖 *AI* — ai, ask (requires OPENAI_API_KEY)\n🛠️ *Owner* — status, broadcast, owners\n\n🎯 *Command packs*\n${commandLibrary.categories.map(item => `• ${item.title}: .menu ${item.key} 1`).join('\n')}\n\nBrowse a category with *.menu <category> <page>* (20 shortcuts per page).\nExample: *.menu quotes 1*\nPrefix: *${BOT_PREFIX}*`;
  }
  const selected = commandLibrary.categories.find(item => item.key === category.toLowerCase());
  if (!selected) return `Unknown category. Try: ${commandLibrary.categories.map(item => item.key).join(', ')}`;
  const pageNumber = Number.parseInt(page || '1', 10);
  const result = commandLibrary.list(selected.key, pageNumber, 20);
  return `✨ *${selected.icon} ${selected.title.toUpperCase()}* · Page ${result.page}/${result.pages}\n━━━━━━━━━━━━━━━━━━\n${result.names.map(name => `• .${name}`).join('\n')}\n\nUse *.menu ${selected.key} ${result.page < result.pages ? result.page + 1 : 1}* for the next page.`;
}

async function aiReply(prompt) {
  if (!OPENAI_API_KEY) throw new Error('AI is not configured. Set OPENAI_API_KEY in the environment.');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: AI_MODEL, messages: [
      { role: 'system', content: 'You are BRIAN BOT, a helpful and concise WhatsApp assistant.' },
      { role: 'user', content: prompt }
    ], max_tokens: 500 })
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || 'The AI returned no response.';
}

async function sendConnectionNotice(sock) {
  if (connectionNoticeSent) return;
  const target = OFFICIAL_WHATSAPP_JID
    ? `${OFFICIAL_WHATSAPP_JID}@s.whatsapp.net`
    : OWNER_JID ? `${OWNER_JID}@s.whatsapp.net` : linkedJid(sock);
  if (!target) return;
  await sock.sendMessage(target, { text: `👑 *BRIAN BOT LINK SUCCESSFUL*\n\n✅ WhatsApp is connected and the bot is ready.\n🕒 ${new Date().toLocaleString()}\n📖 Send *.menu* to browse commands.` });
  connectionNoticeSent = true;
}

async function handleMessage(sock, msg) {
  if (!msg.message || msg.key.fromMe) return;
  const from = msg.key.remoteJid || '';
  if (!from || from === 'status@broadcast' || from.endsWith('@newsletter')) return;
  const sender = msg.key.participant || from;
  const text = getMessageText(msg.message).trim();
  if (!text) return;
  if (!text.startsWith(BOT_PREFIX)) {
    if (AUTO_REPLY && !from.endsWith('@g.us')) {
      await sock.sendMessage(from, { text: '👋 Hi! I’m *BRIAN BOT*. I received your message and I’m here to help. Send *.menu* to explore my commands.' });
    }
    return;
  }

  const input = text.slice(BOT_PREFIX.length).trim();
  if (!input) return;
  const [cmd, ...rest] = input.split(/\s+/);
  const command = cmd.toLowerCase();
  const args = rest.join(' ');
  try {
    if (command === 'menu' || command === 'help') {
      const [category, page] = rest;
      await sock.sendMessage(from, { text: menuText(category, page) });
    } else if (command === 'hi' || command === 'hello') {
      await sock.sendMessage(from, { text: '👋 Hello! I’m *BRIAN BOT*. Send *.menu* to explore.' });
    } else if (command === 'ping') {
      await sock.sendMessage(from, { text: '⚡ *PONG!* BRIAN BOT is online.' });
    } else if (command === 'time') {
      await sock.sendMessage(from, { text: `🕒 ${new Date().toLocaleTimeString()}` });
    } else if (command === 'date') {
      await sock.sendMessage(from, { text: `📅 ${new Date().toLocaleDateString()}` });
    } else if (command === 'uptime') {
      await sock.sendMessage(from, { text: `⏱️ Uptime: ${Math.floor(process.uptime())} seconds` });
    } else if (command === 'about') {
      await sock.sendMessage(from, { text: `👑 *BRIAN BOT*\nA WhatsApp assistant with categorized commands and ${commandLibrary.count}+ command shortcuts.` });
    } else if (command === 'jid') {
      await sock.sendMessage(from, { text: `Chat: ${from}\nSender: ${sender}` });
    } else if (command === 'reverse') {
      if (!args) throw new Error('Usage: .reverse <text>');
      await sock.sendMessage(from, { text: [...args].reverse().join('') });
    } else if (command === 'base64') {
      if (!args) throw new Error('Usage: .base64 <text>');
      await sock.sendMessage(from, { text: Buffer.from(args).toString('base64') });
    } else if (command === 'calc') {
      if (!args || !/^[\d+*/().%\s-]+$/.test(args)) throw new Error('Usage: .calc 2+2 (basic arithmetic only)');
      const tokens = args.match(/\d+(?:\.\d+)?|[()+*/%\-]/g) || [];
      if (tokens.join('') !== args.replace(/\s/g, '')) throw new Error('Invalid arithmetic expression');
      const value = Function(`"use strict"; return (${args})`)();
      if (!Number.isFinite(value)) throw new Error('Result is not a finite number');
      await sock.sendMessage(from, { text: `🧮 ${value}` });
    } else if (command === 'ai' || command === 'ask') {
      if (!args) throw new Error('Usage: .ai <your question>');
      await sock.sendMessage(from, { text: '🤖 Thinking…' });
      await sock.sendMessage(from, { text: `🤖 ${await aiReply(args)}` });
    } else {
      const packReply = commandLibrary.getResponse(command);
      if (packReply) {
        await sock.sendMessage(from, { text: packReply });
      } else if (['groupinfo', 'members', 'tagall', 'promote', 'demote', 'kick'].includes(command)) {
        if (!from.endsWith('@g.us')) throw new Error('This command can only be used in a group.');
        const metadata = await sock.groupMetadata(from);
        if (command === 'groupinfo') {
          await sock.sendMessage(from, { text: `👥 *${metadata.subject}*\nMembers: ${metadata.participants.length}\nDescription: ${metadata.desc || 'None'}` });
        } else if (command === 'members') {
          await sock.sendMessage(from, { text: `👥 This group has ${metadata.participants.length} members.` });
        } else {
          const admins = metadata.participants.filter(p => p.admin).map(p => normalizeJid(p.id));
          if (!admins.includes(normalizeJid(sock.user?.id)) && !admins.includes(normalizeJid(sock.user?.lid))) throw new Error('Make BRIAN BOT a group admin first.');
          if (!admins.includes(normalizeJid(sender))) throw new Error('Only group admins can use this command.');
          if (command === 'tagall') {
            const mentions = metadata.participants.map(p => p.id);
            await sock.sendMessage(from, { text: `📣 ${args || 'Attention everyone!'}\n\n${mentions.map(jid => `@${normalizeJid(jid)}`).join(' ')}`, mentions });
          } else {
            const mentions = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (!mentions.length) throw new Error(`Usage: .${command} @member`);
            await sock.groupParticipantsUpdate(from, mentions, command === 'kick' ? 'remove' : command);
            await sock.sendMessage(from, { text: `✅ ${command} completed for ${mentions.length} member(s).` });
          }
        }
      } else if (command === 'mediainfo') {
        const type = Object.keys(msg.message).find(key => /image|video|audio|document|sticker/i.test(key)) || 'none';
        await sock.sendMessage(from, { text: `🖼️ Media type: ${type}. Reply to media with *.save* to download it.` });
      } else if (command === 'save') {
        const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) throw new Error('Reply to a photo, video, document, or audio with .save');
        const wrapped = quoted.ephemeralMessage?.message || quoted.viewOnceMessage?.message || quoted;
        const key = Object.keys(wrapped).find(name => /imageMessage|videoMessage|audioMessage|documentMessage|stickerMessage/.test(name));
        if (!key) throw new Error('The replied-to message does not contain downloadable media.');
        const buffer = await downloadMediaMessage({ message: { [key]: wrapped[key] } }, 'buffer', {});
        if (buffer.length > 20 * 1024 * 1024) throw new Error('Media exceeds the 20 MB limit.');
        await sock.sendMessage(from, { document: buffer, mimetype: 'application/octet-stream', fileName: 'saved-media.bin' });
      } else if (['status', 'owners', 'broadcast'].includes(command)) {
        if (!isOwner(sock, sender)) throw new Error('This command is restricted to the owner.');
        if (command === 'status') {
          await sock.sendMessage(from, { text: `👑 *Status*\nConnection: ${status}\nUptime: ${Math.floor(process.uptime())}s\nCommands: ${commandLibrary.count}+\nAI: ${OPENAI_API_KEY ? 'configured' : 'not configured'}` });
        } else if (command === 'owners') {
          await sock.sendMessage(from, { text: `Owner: ${OWNER_JID || 'linked account'}\nOfficial notification: ${OFFICIAL_WHATSAPP_JID || OWNER_JID || 'linked account'}` });
        } else {
          if (!args) throw new Error('Usage: .broadcast <message>');
          const groups = await sock.groupFetchAllParticipating();
          let sent = 0;
          for (const jid of Object.keys(groups)) {
            await sock.sendMessage(jid, { text: `📢 *BRIAN BOT BROADCAST*\n\n${args}` });
            sent++;
          }
          await sock.sendMessage(from, { text: `✅ Broadcast sent to ${sent} group(s).` });
        }
      } else {
        await sock.sendMessage(from, { text: `I don't know *.${command}* yet. Send *.menu* to browse commands.` });
      }
    }
  } catch (error) {
    console.error(`Command ${command} failed:`, error.message);
    await sock.sendMessage(from, { text: `❌ ${error.message}` });
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), printQRInTerminal: false });
  socket = sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      status = 'CONNECTED';
      pairingCode = '✅ CONNECTED';
      try { await sendConnectionNotice(sock); } catch (error) { console.error('WhatsApp success notice failed:', error.message); }
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
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      try { await handleMessage(sock, msg); }
      catch (error) { console.error('Message handling failed:', error.message); }
    }
  });
}

startBot().catch(error => {
  console.error('Failed to start BRIAN BOT:', error);
  process.exit(1);
});
