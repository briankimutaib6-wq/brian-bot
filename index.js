const {
  default: makeWASocket,
  useMultiFileAuthState,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

const PHONE_NUMBER = (process.env.PHONE_NUMBER || '').replace(/[^0-9]/g, '');
const OWNER_JID = (process.env.OWNER_JID || '').replace(/[^0-9]/g, '');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

let LATEST_CODE = PHONE_NUMBER
  ? 'Generating secure pairing code...'
  : 'Set PHONE_NUMBER before starting';
let BOT_STATUS = 'DISCONNECTED';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: BOT_STATUS.toLowerCase() }));
    return;
  }

  const isOnline = BOT_STATUS === 'CONNECTED';
  const statusColor = isOnline ? '#25D366' : '#C6A15B';
  const statusText = isOnline ? '✅ ONLINE - CONNECTED' : '🔴 DISCONNECTED';

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BRIAN BOT - Pairing</title>
  <style>
    :root {
      --gold: #FFD700;
      --gold-dark: #C6A15B;
      --green: #25D366;
      --green-dark: #075E54;
      --ink: #08140f;
      --panel: #10251c;
    }
    * { box-sizing: border-box; }
    body {
      min-height: 100vh;
      margin: 0;
      font-family: Arial, sans-serif;
      text-align: center;
      color: #fff;
      background:
        radial-gradient(circle at 50% 12%, rgba(37, 211, 102, .18), transparent 34%),
        linear-gradient(145deg, var(--ink), #0b1d16 60%, #071009);
      padding: 24px 16px;
    }
    .shell { max-width: 620px; margin: 0 auto; }
    .crown {
      font-size: 56px;
      filter: drop-shadow(0 4px 12px rgba(255, 215, 0, .28));
    }
    h1 {
      margin: 8px 0 4px;
      color: var(--gold);
      letter-spacing: 2px;
      text-shadow: 0 2px 18px rgba(255, 215, 0, .18);
    }
    .tagline { color: var(--gold); font-weight: bold; }
    .status {
      display: inline-block;
      min-width: 240px;
      margin: 12px 0 6px;
      padding: 13px 20px;
      border: 2px solid var(--gold);
      border-radius: 999px;
      background: ${statusColor};
      color: #fff;
      box-shadow: 0 8px 24px rgba(37, 211, 102, .18);
      font-weight: bold;
    }
    .card {
      margin: 20px 0;
      padding: 22px;
      border: 1px solid rgba(255, 215, 0, .75);
      border-radius: 18px;
      background: linear-gradient(145deg, rgba(16, 37, 28, .96), rgba(7, 94, 84, .28));
      box-shadow: 0 14px 38px rgba(0, 0, 0, .28);
    }
    .card-title { color: var(--gold); margin-top: 0; }
    .pairing-code {
      min-height: 72px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      border: 2px solid var(--green);
      border-radius: 14px;
      background: #07130e;
      color: var(--gold);
      font-size: clamp(22px, 7vw, 34px);
      letter-spacing: 4px;
      font-weight: bold;
      box-shadow: inset 0 0 24px rgba(37, 211, 102, .09);
      overflow-wrap: anywhere;
    }
    .instructions { text-align: left; }
    .instructions li { margin: 10px 0; line-height: 1.45; }
    .instructions b { color: var(--gold); }
    footer { color: #9ec1b0; font-size: 12px; }
  </style>
</head>
<body>
  <main class="shell">
    <div class="crown">👑</div>
    <h1>BRIAN BOT</h1>
    <p class="tagline">👑 KING OF BOTS • GREEN + GOLD 👑</p>
    <div class="status">${statusText}</div>

    <section class="card">
      <h2 class="card-title">PAIRING CODE</h2>
      <div class="pairing-code">${escapeHtml(LATEST_CODE)}</div>
    </section>

    <section class="card instructions">
      <h2 class="card-title">📱 LINKING INSTRUCTIONS</h2>
      <ol>
        <li>Set <b>PHONE_NUMBER</b> in the deployment environment.</li>
        <li>Start the application and wait for the pairing code.</li>
        <li>Open WhatsApp on that phone.</li>
        <li>Open <b>Linked Devices → Link a Device → Link with phone number instead</b>.</li>
        <li>Enter the pairing code shown above.</li>
      </ol>
    </section>
    <footer>👑 BRIAN BOT © 2026</footer>
  </main>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🌐 BRIAN BOT website live on port ${PORT}`));

function normalizeJid(jid = '') {
  return jid.split('@')[0].replace(/[^0-9]/g, '');
}

function isOwner(sock, jid) {
  const sender = normalizeJid(jid);
  const botOwner = normalizeJid(sock.user?.id || '');
  return Boolean(sender && (sender === OWNER_JID || (!OWNER_JID && sender === botOwner) || sender === botOwner));
}

function commandMenu() {
  return `👑 *BRIAN BOT COMMANDS*

📋 *General*
• menu — Show this menu
• hi — Greeting
• ping — Bot status
• time — Current server time
• uptime — Bot uptime
• calc 2+2 — Calculator
• jid — Show chat JID

👥 *Group*
• groupinfo — Group details
• members — Member count
• tagall [message] — Mention all members
• promote @user — Promote member
• demote @user — Demote member
• kick @user — Remove member

🖼️ *Media*
• save — Download a quoted media message
• mediainfo — Show media details

🤖 *AI*
• ai <prompt> — Ask AI (requires OPENAI_API_KEY)
• ask <prompt> — Alias for AI

🎉 *Fun*
• joke — Random joke
• dice — Roll a dice
• coin — Flip a coin
• fact — Random fact
• ship @user — Fun compatibility result

⬇️ *Downloader*
• download <direct-file-url> — Download a direct file link

👑 *Owner*
• status — Detailed bot status
• broadcast <message> — Send to all groups
• owners — Show owner setup`;
}

async function aiReply(prompt) {
  if (!OPENAI_API_KEY) {
    throw new Error('AI is not configured. Set OPENAI_API_KEY in the environment.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: 'You are BRIAN BOT, a helpful and concise WhatsApp assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`AI provider returned ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || 'The AI returned no response.';
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      BOT_STATUS = 'CONNECTED';
      LATEST_CODE = '✅ CONNECTED';
      console.log('✅ BRIAN BOT is online');
    } else if (connection === 'close') {
      BOT_STATUS = 'DISCONNECTED';
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode !== 401) {
        console.log('Connection closed; reconnecting...');
        setTimeout(startBot, 3000);
      } else {
        console.log('WhatsApp session rejected. Remove auth and link again.');
      }
    } else if (connection === 'connecting' && !state.creds.registered && PHONE_NUMBER) {
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER);
        LATEST_CODE = code;
        console.log(`📱 Pairing code for configured phone number: ${code}`);
      } catch (error) {
        LATEST_CODE = 'Pairing failed; restart the app';
        console.log('Pairing failed:', error.message);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      const sender = msg.key.participant || msg.key.remoteJid;
      const text = msg.message.conversation ||
        msg.message.extendedTextMessage?.text || '';
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      const cmdText = text.trim();
      const cmd = cmdText.toLowerCase().replace(/^[.!/]/, '').split(/\s+/)[0];
      const args = cmdText.replace(/^[.!/]/, '').trim().replace(/^\S+\s*/, '');

      try {
        if (cmd === 'hi' || cmd === 'hello') {
          await sock.sendMessage(from, { text: 'Hello 👋 I am BRIAN BOT\nType *menu* to see commands' });
        } else if (cmd === 'menu' || cmd === 'help') {
          await sock.sendMessage(from, { text: commandMenu() });
        } else if (cmd === 'ping') {
          await sock.sendMessage(from, { text: '✅ BRIAN BOT is ONLINE ⚡' });
        } else if (cmd === 'time') {
          await sock.sendMessage(from, { text: `🕒 ${new Date().toLocaleString()}` });
        } else if (cmd === 'uptime') {
          const seconds = Math.floor(process.uptime());
          await sock.sendMessage(from, { text: `⏱️ Uptime: ${seconds}s` });
        } else if (cmd === 'calc') {
          if (!args) throw new Error('Usage: calc 2+2');
          if (!/^[-+*/().0-9\s]+$/.test(args)) throw new Error('Only basic arithmetic is allowed');
          const result = Function(`"use strict"; return (${args})`)();
          await sock.sendMessage(from, { text: `🧮 Result: ${result}` });
        } else if (cmd === 'jid') {
          await sock.sendMessage(from, { text: `Chat JID: ${from}\nSender JID: ${sender}` });
        } else if (cmd === 'joke') {
          const jokes = [
            'Why did the computer show up late? It had a hard drive! 😄',
            'Why do programmers prefer dark mode? Because light attracts bugs! 😂',
            'I told my computer a joke. It froze. 🥶'
          ];
          await sock.sendMessage(from, { text: jokes[Math.floor(Math.random() * jokes.length)] });
        } else if (cmd === 'dice') {
          await sock.sendMessage(from, { text: `🎲 You rolled ${Math.floor(Math.random() * 6) + 1}` });
        } else if (cmd === 'coin') {
          await sock.sendMessage(from, { text: Math.random() < 0.5 ? '🪙 Heads' : '🪙 Tails' });
        } else if (cmd === 'fact') {
          const facts = ['Octopuses have three hearts.', 'A day on Venus is longer than its year.', 'Bananas are berries, but strawberries are not.'];
          await sock.sendMessage(from, { text: `💡 ${facts[Math.floor(Math.random() * facts.length)]}` });
        } else if (cmd === 'ship') {
          await sock.sendMessage(from, { text: `💕 Compatibility: ${Math.floor(Math.random() * 101)}%` });
        } else if (cmd === 'ai' || cmd === 'ask') {
          if (!args) throw new Error('Usage: ai <your question>');
          await sock.sendMessage(from, { text: '🤖 Thinking...' });
          const reply = await aiReply(args);
          await sock.sendMessage(from, { text: `🤖 ${reply}` });
        } else if (cmd === 'save') {
          if (!quoted) throw new Error('Reply to a photo, video, document, or audio message with save');
          const key = Object.keys(quoted)[0];
          const buffer = await downloadMediaMessage({ message: { [key]: quoted[key] } }, 'buffer', {});
          if (buffer.length > 20 * 1024 * 1024) throw new Error('Media exceeds the 20 MB WhatsApp bot limit');
          await sock.sendMessage(from, { document: buffer, mimetype: 'application/octet-stream', fileName: 'saved-media.bin' });
        } else if (cmd === 'mediainfo') {
          const mediaType = Object.keys(msg.message).find(key => key !== 'conversation' && key !== 'extendedTextMessage');
          await sock.sendMessage(from, { text: `🖼️ Media type: ${mediaType || 'none'}\nTo save media, reply to it with *save*.` });
        } else if (cmd === 'download') {
          if (!/^https?:\/\/\S+$/.test(args)) throw new Error('Usage: download <direct-https-url>');
          const url = new URL(args);
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
          const buffer = Buffer.from(await response.arrayBuffer());
          if (buffer.length > 20 * 1024 * 1024) throw new Error('File exceeds the 20 MB WhatsApp bot limit');
          const mime = response.headers.get('content-type') || 'application/octet-stream';
          const filename = url.pathname.split('/').pop() || 'download.bin';
          await sock.sendMessage(from, { document: buffer, mimetype: mime, fileName: filename });
        } else if (['groupinfo', 'members', 'tagall', 'promote', 'demote', 'kick'].includes(cmd)) {
          if (!from.endsWith('@g.us')) throw new Error('This command can only be used in groups');
          const metadata = await sock.groupMetadata(from);

          if (cmd === 'groupinfo') {
            await sock.sendMessage(from, { text: `👥 *${metadata.subject}*\nMembers: ${metadata.participants.length}\nDescription: ${metadata.desc || 'None'}` });
          } else if (cmd === 'members') {
            await sock.sendMessage(from, { text: `👥 This group has ${metadata.participants.length} members.` });
          } else {
            const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
            const botJid = sock.user?.id || '';
            if (!admins.includes(botJid) && !admins.includes(sock.user?.lid)) {
              throw new Error('Make BRIAN BOT an admin first');
            }
            if (!admins.includes(sender)) throw new Error('Only group admins can use this command');

            if (cmd === 'tagall') {
              const mentions = metadata.participants.map(p => p.id);
              await sock.sendMessage(from, { text: `📣 ${args || 'Attention everyone!'}\n\n${mentions.map(jid => `@${normalizeJid(jid)}`).join(' ')}`, mentions });
            } else {
              const targets = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
              if (!targets.length) throw new Error(`Usage: ${cmd} @member`);
              if (cmd === 'kick') await sock.groupParticipantsUpdate(from, targets, 'remove');
              if (cmd === 'promote') await sock.groupParticipantsUpdate(from, targets, 'promote');
              if (cmd === 'demote') await sock.groupParticipantsUpdate(from, targets, 'demote');
              await sock.sendMessage(from, { text: `✅ ${cmd.charAt(0).toUpperCase() + cmd.slice(1)} completed for ${targets.length} member(s).` });
            }
          }
        } else if (['status', 'broadcast', 'owners'].includes(cmd)) {
          if (!isOwner(sock, sender)) throw new Error('This command is restricted to the owner');
          if (cmd === 'status') {
            await sock.sendMessage(from, { text: `👑 *Owner Status*\nStatus: ${BOT_STATUS}\nUptime: ${Math.floor(process.uptime())}s\nAI: ${OPENAI_API_KEY ? 'Configured' : 'Not configured'}\nNode: ${process.version}` });
          } else if (cmd === 'broadcast') {
            if (!args) throw new Error('Usage: broadcast <message>');
            const groups = await sock.groupFetchAllParticipating();
            let sent = 0;
            for (const jid of Object.keys(groups)) {
              await sock.sendMessage(jid, { text: `📢 *BRIAN BOT BROADCAST*\n\n${args}` });
              sent++;
            }
            await sock.sendMessage(from, { text: `✅ Broadcast sent to ${sent} group(s).` });
          } else if (cmd === 'owners') {
            await sock.sendMessage(from, { text: `👑 Owner JID: ${OWNER_JID || 'linked account (default)'}\nSet OWNER_JID to restrict owner commands explicitly.` });
          }
        }
      } catch (error) {
        console.log(`Command ${cmd} failed:`, error.message);
        await sock.sendMessage(from, { text: `❌ ${error.message}` });
      }
    }
  });
}

startBot().catch((error) => {
  console.error('Failed to start BRIAN BOT:', error);
  process.exit(1);
});
