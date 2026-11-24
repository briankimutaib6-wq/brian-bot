// ============================================
// BRIAN BOT - FINAL - Pairing Page + Bot
// ONE FILE - NO OTHER FILES NEEDED
// ============================================
const express = require('express');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys');

const OWNER = '254712345678'; // <-- CHANGE TO YOUR NUMBER, NO + , e.g. 254700000000
const PREFIX = '.';
const PORT = process.env.PORT || 3000;

let isConnected = false;
let sock = null;

// ============ PAIRING PAGE ============
const PAIRING_HTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Brian Bot - Pairing</title><style>*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}body{background:linear-gradient(135deg,#075e54,#25d366);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:#fff;width:100%;max-width:430px;border-radius:24px;padding:28px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.3)}.logo{font-size:55px}h1{font-size:26px;margin:8px 0 5px}p{color:#666;font-size:14px}input{width:100%;padding:15px;border:2px solid #e0e0e0;border-radius:14px;font-size:18px;text-align:center;outline:none;margin:18px 0 12px}input:focus{border-color:#25d366}.btn{width:100%;padding:15px;border:none;border-radius:14px;font-size:17px;font-weight:bold;cursor:pointer;color:#fff;background:#25d366}.btn:disabled{opacity:.6}#codeBox{display:none;margin-top:20px;background:#f0fff4;border:2px dashed #25d366;border-radius:16px;padding:18px}#code{font-size:34px;font-weight:900;letter-spacing:5px;color:#075e54;margin:10px 0}.copyBtn{background:#075e54;color:#fff;border:none;padding:12px;border-radius:10px;font-weight:bold;width:100%;cursor:pointer}.waBtn{display:block;margin-top:12px;background:#25d366;color:#fff;text-decoration:none;padding:14px;border-radius:10px;font-weight:bold;font-size:16px}.waBtn2{display:block;margin-top:8px;background:#fff;color:#075e54;border:2px solid #25d366;text-decoration:none;padding:12px;border-radius:10px;font-weight:bold;font-size:14px}.timer{font-size:13px;color:#e65100;font-weight:bold;margin-top:10px}.steps{text-align:left;background:#f8f8f8;border-radius:14px;padding:15px;margin-top:18px;font-size:13px;line-height:1.9}#connected{display:none;background:#e8f5e9;border-radius:16px;padding:18px;margin-top:20px}</style></head><body><div class="card"><div class="logo">👑</div><h1>BRIAN BOT</h1><p>Connect WhatsApp with Pairing Code</p><div id="formBox"><input id="number" type="tel" placeholder="254712345678"><button class="btn" id="genBtn" onclick="generate()">🔑 GENERATE PAIRING CODE</button><div id="status" style="font-size:13px;margin-top:10px;color:#e65100;font-weight:bold"></div></div><div id="codeBox"><div style="font-size:13px;color:#666">YOUR CODE - ENTER IN WHATSAPP</div><div id="code">--------</div><button class="copyBtn" onclick="copyCode()">📋 COPY CODE</button><div id="copied" style="font-size:12px;color:green;margin-top:8px"></div><a class="waBtn" href="whatsapp://linked_devices" onclick="openWA()">📱 OPEN WHATSAPP TO ENTER CODE</a><a class="waBtn2" href="https://wa.me/" target="_blank">↗ Open WhatsApp Web</a><div class="timer" id="timer">⏳ Code expires in 60s</div><div style="font-size:12px;color:#666;margin-top:8px" id="checking">🔄 Waiting for you to enter code...</div></div><div id="connected"><div style="font-size:40px">✅</div><h2>Connected!</h2><p>Your WhatsApp is now linked.<br>Go to WhatsApp and type <b>.menu</b></p></div><div class="steps"><b>📱 How to Enter Code:</b><br>1. Tap <b>OPEN WHATSAPP</b> above<br>2. WhatsApp → Settings → Linked Devices<br>3. Tap <b>Link a Device</b><br>4. Tap <b>Link with phone number instead</b><br>5. Paste code & tap Next</div><p style="margin-top:15px;font-size:11px;color:#999">Made by Brian • Elburgon 🇰🇪</p></div><script>let timerInt,checkInt,seconds=60;async function generate(){const num=document.getElementById('number').value.trim().replace(/[^0-9]/g,'');const status=document.getElementById('status');const btn=document.getElementById('genBtn');if(!num||num.length<9){status.innerText='❌ Enter valid number e.g. 254712345678';return}btn.disabled=true;btn.innerText='⏳ Generating...';status.innerText='Requesting code from WhatsApp...';try{const res=await fetch('/pair?number='+num);const data=await res.json();if(data.code){document.getElementById('formBox').style.display='none';document.getElementById('codeBox').style.display='block';document.getElementById('code').innerText=data.code;try{await navigator.clipboard.writeText(data.code);document.getElementById('copied').innerText='✅ Code auto-copied! Just paste in WhatsApp'}catch(e){}startTimer();startChecking(num)}else status.innerText='❌ '+(data.error||'Failed, try again')}catch(e){status.innerText='❌ Server error'}btn.disabled=false;btn.innerText='🔑 GENERATE PAIRING CODE'}function copyCode(){const code=document.getElementById('code').innerText;navigator.clipboard.writeText(code).then(()=>{document.getElementById('copied').innerText='✅ Copied! Now tap OPEN WHATSAPP'})}function openWA(){window.location.href='whatsapp://linked_devices';setTimeout(()=>{document.getElementById('checking').innerText='📱 WhatsApp opened? Go to Linked Devices > Link with phone number > Paste code'},1500)}function startTimer(){seconds=60;clearInterval(timerInt);timerInt=setInterval(()=>{seconds--;document.getElementById('timer').innerText='⏳ Code expires in '+seconds+'s';if(seconds<=0){clearInterval(timerInt);document.getElementById('timer').innerText='⚠️ Code expired! Refresh and generate new code'}},1000)}function startChecking(number){clearInterval(checkInt);checkInt=setInterval(async()=>{try{const r=await fetch('/status');const d=await r.json();if(d.connected){clearInterval(checkInt);clearInterval(timerInt);document.getElementById('codeBox').style.display='none';document.getElementById('connected').style.display='block'}}catch(e){}},3000)}</script></body></html>`;

// ============ EXPRESS SERVER ============
const app = express();
app.get('/', (req, res) => res.send(PAIRING_HTML));
app.get('/pairing', (req, res) => res.send(PAIRING_HTML));
app.get('/status', (req, res) => res.json({ connected: isConnected }));

app.get('/pair', async (req, res) => {
  const number = (req.query.number || '').replace(/[^0-9]/g, '');
  if (!number) return res.json({ error: 'Number required' });
  if (!sock) return res.json({ error: 'Bot starting... Wait 10 seconds and try again' });
  try {
    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(number);
      console.log(`Pairing code for ${number}: ${code}`);
      return res.json({ code });
    } else {
      isConnected = true;
      return res.json({ error: 'Already paired! Bot already connected.' });
    }
  } catch (e) {
    return res.json({ error: e.message });
  }
});
app.listen(PORT, () => console.log(`🌐 Pairing Page live on port ${PORT}`));

// ============ WHATSAPP BOT ============
async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('session');
  sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    browser: ['Brian Bot', 'Chrome', '1.0']
  });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      isConnected = false;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) start();
    } else if (connection === 'open') {
      isConnected = true;
      console.log('✅ BRIAN BOT CONNECTED');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const senderNum = sender.split('@')[0];
    const isGroup = from.endsWith('@g.us');
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
    if (!body.startsWith(PREFIX)) return;

    const args = body.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const text = args.join(' ');
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const reply = (t) => sock.sendMessage(from, { text: t }, { quoted: msg });
    const isOwner = senderNum === OWNER;

    try {
      if (command === 'ping') {
        const s = Date.now();
        await reply('🏓 Pinging...');
        await reply(`🏓 Pong! Speed: ${Date.now() - s}ms\nUptime: ${Math.floor(process.uptime())}s`);
      }
      else if (command === 'menu' || command === 'help') {
        await reply(`👑 *BRIAN BOT MENU* 👑\n\n*GENERAL*\n.ping - Speed\n.time - Kenya Time\n.alive - Check bot\n.owner - Owner\n.joke - Random Joke\n.quote - Random Quote\n\n*IMAGE*\n.image <text> - Generate Image\n.sticker - Reply to image to make sticker\n\n*GROUP*\n.kick @user - Kick\n.promote @user - Make admin\n.demote @user - Remove admin\n.tagall - Tag all\n.link - Group link\n\n*OWNER*\n.broadcast <text>`);
      }
      else if (command === 'time') {
        const t = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        await reply(`🕐 *Kenya Time:* ${t}`);
      }
      else if (command === 'alive') {
        await sock.sendMessage(from, { text: `✅ *Brian Bot is Alive!*\nUptime: ${Math.floor(process.uptime()/60)} mins\nOwner: @${OWNER}`, mentions: [OWNER + '@s.whatsapp.net'] });
      }
      else if (command === 'owner') {
        await sock.sendMessage(from, { text: `👑 My Owner is @${OWNER}`, mentions: [OWNER + '@s.whatsapp.net'] });
      }
      else if (command === 'joke') {
        const r = await fetch('https://official-joke-api.appspot.com/random_joke');
        const j = await r.json();
        await reply(`😂 ${j.setup}\n\n${j.punchline}`);
      }
      else if (command === 'quote') {
        const r = await fetch('https://api.quotable.io/random');
        const q = await r.json();
        await reply(`💬 "${q.content}"\n- ${q.author}`);
      }
      else if (command === 'image' || command === 'img' || command === 'imagine') {
        if (!text) return await reply('❌ Usage: .image a lion with crown');
        await reply(`🎨 Generating: "${text}"...`);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?width=1024&height=1024&seed=${Math.floor(Math.random()*99999)}&nologo=true`;
        await sock.sendMessage(from, { image: { url }, caption: `🖼️ *${text}*\nRequested by @${senderNum}`, mentions: [sender] }, { quoted: msg });
      }
      else if (command === 'sticker' || command === 's') {
        const imgMsg = msg.message.imageMessage || quoted?.imageMessage;
        const vidMsg = msg.message.videoMessage || quoted?.videoMessage;
        if (!imgMsg && !vidMsg) return await reply('❌ Reply to an image/video with .sticker');
        const type = imgMsg ? 'image' : 'video';
        const stream = await downloadContentFromMessage(imgMsg || vidMsg, type);
        let buf = Buffer.from([]);
        for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
        await sock.sendMessage(from, { sticker: buf }, { quoted: msg });
      }
      else if (command === 'kick') {
        if (!isGroup) return await reply('❌ Only in group');
        const target = mentioned[0];
        if (!target) return await reply('❌ Tag: .kick @Brian');
        await sock.groupParticipantsUpdate(from, [target], 'remove');
        await reply(`✅ Kicked @${target.split('@')[0]}`);
      }
      else if (command === 'promote') {
        if (!isGroup) return await reply('❌ Only in group');
        const target = mentioned[0];
        if (!target) return await reply('❌ Tag: .promote @Brian');
        await sock.groupParticipantsUpdate(from, [target], 'promote');
        await reply(`✅ Promoted @${target.split('@')[0]} to Admin`);
      }
      else if (command === 'demote') {
        if (!isGroup) return await reply('❌ Only in group');
        const target = mentioned[0];
        if (!target) return await reply('❌ Tag: .demote @Brian');
        await sock.groupParticipantsUpdate(from, [target], 'demote');
        await reply(`✅ Demoted @${target.split('@')[0]}`);
      }
      else if (command === 'tagall') {
        if (!isGroup) return await reply('❌ Only in group');
        const meta = await sock.groupMetadata(from);
        const members = meta.participants.map(p => p.id);
        const list = meta.participants.map(p => `@${p.id.split('@')[0]}`).join('\n');
        await sock.sendMessage(from, { text: `📢 *TAG ALL*\n\n${text || 'Hello everyone!'}\n\n${list}`, mentions: members });
      }
      else if (command === 'link') {
        if (!isGroup) return await reply('❌ Only in group');
        const code = await sock.groupInviteCode(from);
        await reply(`🔗 Group Link:\nhttps://chat.whatsapp.com/${code}`);
      }
      else if (command === 'broadcast' || command === 'bc') {
        if (!isOwner) return await reply('❌ Owner only!');
        if (!text) return await reply('❌ Usage: .broadcast Hello');
        await reply(`✅ Broadcast check passed: ${text}`);
      }
      else {
        await reply(`❌ Unknown command: .${command}\nType .menu`);
      }
    } catch (e) {
      console.log(e);
      await reply(`❌ Error: ${e.message}`);
    }
  });
}
start();
