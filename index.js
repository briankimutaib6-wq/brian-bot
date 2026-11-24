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
const PAIRING_TOKEN = process.env.PAIRING_TOKEN || '';
const PREFIX = '.';
const PORT = Number(process.env.PORT) || 3000;
const PAIR_RATE_WINDOW_MS = 15 * 60 * 1000;
const PAIR_RATE_LIMIT = 5;
const pairAttempts = new Map();
let lastPairAt = 0;
let pairInProgress = false;
let isConnected = false;
let sock = null;

if (!/^\d{8,15}$/.test(OWNER)) {
  throw new Error('Set OWNER_NUMBER to the bot owner phone number, digits only, including country code.');
}

const app = express();
app.disable('x-powered-by');
app.get('/', (_req, res) => {
  res.type('html').send('<h1>Brian Bot is running</h1><p>Connection status: <a href="/status">/status</a></p>');
});
app.get('/status', (_req, res) => res.json({ connected: isConnected }));

// Pairing codes are sensitive: only issue them via an authenticated POST request.
// Configure PAIRING_TOKEN as a long random secret and use HTTPS in production.
app.post('/pair', async (req, res) => {
  if (!PAIRING_TOKEN) {
    return res.status(503).json({ error: 'Pairing is disabled; configure PAIRING_TOKEN.' });
  }

  const supplied = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const expectedBuffer = Buffer.from(PAIRING_TOKEN);
  const suppliedBuffer = Buffer.from(supplied);
  const authorized = suppliedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized.' });

  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const attempts = (pairAttempts.get(ip) || []).filter((time) => now - time < PAIR_RATE_WINDOW_MS);
  if (attempts.length >= PAIR_RATE_LIMIT) {
    pairAttempts.set(ip, attempts);
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

  pairInProgress = true;
  lastPairAt = now;
  try {
    const code = await sock.requestPairingCode(OWNER);
    // Do not log pairing codes; anyone with a code may link the WhatsApp account.
    return res.json({ code });
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
          await reply('🏓 Pong!');
        } else if (command === 'menu' || command === 'help') {
          await reply('👑 *BRIAN BOT MENU*\n\n.ping\n.time\n.alive\n.owner\n.joke\n.quote\n.image <text>\n.sticker\n.kick @user (owner + group admin)\n.promote @user (owner + group admin)\n.demote @user (owner + group admin)\n.tagall (owner only)\n.link (owner only)');
        } else if (command === 'time') {
          await reply('🕐 Kenya: ' + new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }));
        } else if (command === 'alive') {
          await reply('✅ Brian Bot Alive!');
        } else if (command === 'owner') {
          await sock.sendMessage(from, {
            text: '👑 Owner: @' + OWNER,
            mentions: [OWNER + '@s.whatsapp.net'],
          }, { quoted: msg });
        } else if (command === 'joke') {
          const response = await fetch('https://official-joke-api.appspot.com/random_joke');
          if (!response.ok) throw new Error('Joke service unavailable');
          const joke = await response.json();
          await reply('😂 ' + joke.setup + '\n\n' + joke.punchline);
        } else if (command === 'quote') {
          const response = await fetch('https://api.quotable.io/random');
          if (!response.ok) throw new Error('Quote service unavailable');
          const quote = await response.json();
          await reply('💬 "' + quote.content + '" - ' + quote.author);
        } else if (command === 'image' || command === 'img') {
          if (!text) return await reply('❌ Usage: .image lion with crown');
          await reply('🎨 Generating...');
          const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(text) +
            '?width=1024&height=1024&seed=' + Math.floor(Math.random() * 99999) + '&nologo=true';
          await sock.sendMessage(from, { image: { url }, caption: '🖼️ ' + text }, { quoted: msg });
        } else if (command === 'sticker' || command === 's') {
          const imageMessage = msg.message.imageMessage || quoted?.imageMessage;
          const videoMessage = msg.message.videoMessage || quoted?.videoMessage;
          if (!imageMessage && !videoMessage) return await reply('❌ Reply to an image or video with .sticker');
          const stream = await downloadContentFromMessage(imageMessage || videoMessage, imageMessage ? 'image' : 'video');
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          await sock.sendMessage(from, { sticker: Buffer.concat(chunks) }, { quoted: msg });
        } else if (['kick', 'promote', 'demote'].includes(command)) {
          if (!isGroup) return await reply('❌ Group only.');
          if (!isOwner) return await reply('❌ Only the configured bot owner can use this command.');
          if (!mentioned[0]) return await reply(`❌ Usage: .${command} @user`);

          const metadata = await sock.groupMetadata(from);
          const ownerParticipant = metadata.participants.find((participant) => jidNumber(participant.id) === OWNER);
          const botNumber = jidNumber(sock.user?.id || '');
          const botParticipant = metadata.participants.find((participant) => jidNumber(participant.id) === botNumber);
          const isAdmin = (participant) => Boolean(participant?.admin === 'admin' || participant?.admin === 'superadmin');
          if (!isAdmin(ownerParticipant)) return await reply('❌ The configured owner must be a group admin.');
          if (!isAdmin(botParticipant)) return await reply('❌ The bot must be a group admin to do that.');

          await sock.groupParticipantsUpdate(from, [mentioned[0]], command === 'kick' ? 'remove' : command);
          await reply(command === 'kick' ? '✅ Removed.' : `✅ ${command === 'promote' ? 'Promoted' : 'Demoted'}.`);
        } else if (command === 'tagall') {
          if (!isGroup) return await reply('❌ Group only.');
          if (!isOwner) return await reply('❌ Only the configured bot owner can use this command.');
          const metadata = await sock.groupMetadata(from);
          const members = metadata.participants.map((participant) => participant.id);
          const list = metadata.participants.map((participant) => '@' + jidNumber(participant.id)).join('\n');
          await sock.sendMessage(from, {
            text: '📢 TAG ALL\n\n' + (text || 'Hello!') + '\n\n' + list,
            mentions: members,
          }, { quoted: msg });
        } else if (command === 'link') {
          if (!isGroup) return await reply('❌ Group only.');
          if (!isOwner) return await reply('❌ Only the configured bot owner can use this command.');
          const code = await sock.groupInviteCode(from);
          await reply('🔗 https://chat.whatsapp.com/' + code);
        } else {
          await reply('❌ Unknown: .' + command + '\nType .menu');
        }
      } catch (error) {
        console.error('Command failed:', error?.message || error);
        await reply('❌ Command failed. Check bot permissions and try again.');
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
