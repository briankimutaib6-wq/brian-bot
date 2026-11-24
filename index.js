'use strict';

// BRIAN BOT — command-focused WhatsApp bot.
// Configure OWNER_NUMBER as an international number without a leading +.
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadContentFromMessage,
} = require('@whiskeysockets/baileys');
const pino = require('pino');

const OWNER = String(process.env.OWNER_NUMBER || '').replace(/\D/g, '');
const PREFIX = '.';
const AUTH_DIR = process.env.AUTH_DIR || 'session';
let reconnectTimer;

function numberOf(jid = '') {
  return String(jid).split('@')[0].replace(/\D/g, '');
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const sock = makeWASocket({
    logger: pino({ level: process.env.LOG_LEVEL || 'warn' }),
    printQRInTerminal: true,
    auth: state,
    browser: ['Brian Bot', 'Chrome', '1.0'],
  });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log('✅ BRIAN BOT CONNECTED');
    } else if (connection === 'close') {
      const loggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
      if (!loggedOut && !reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          start().catch(error => console.error('Reconnect failed:', error.message));
        }, 3000);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages = [], type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg?.message || msg.key?.fromMe) continue;
      const from = msg.key.remoteJid;
      if (!from) continue;
      const sender = msg.key.participant || from;
      const senderNum = numberOf(sender);
      const isGroup = from.endsWith('@g.us');
      const content = msg.message;
      const body = content.conversation
        || content.extendedTextMessage?.text
        || content.imageMessage?.caption
        || content.videoMessage?.caption
        || '';
      if (!body.startsWith(PREFIX)) continue;

      const [rawCommand = '', ...args] = body.slice(PREFIX.length).trim().split(/\s+/);
      const command = rawCommand.toLowerCase();
      if (!command) continue;
      const text = args.join(' ');
      const quoted = content.extendedTextMessage?.contextInfo?.quotedMessage;
      const mentioned = content.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const reply = message => sock.sendMessage(from, { text: message }, { quoted: msg });
      const isOwner = Boolean(OWNER && senderNum === OWNER);

      async function authorizeGroupAdmin() {
        if (!isGroup) {
          await reply('❌ This command can only be used in a group.');
          return false;
        }
        const metadata = await sock.groupMetadata(from);
        const participants = metadata.participants || [];
        const senderParticipant = participants.find(p => numberOf(p.id) === senderNum);
        const botNumber = numberOf(sock.user?.id);
        const botParticipant = participants.find(p => numberOf(p.id) === botNumber);
        const senderIsAdmin = senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin';
        const botIsAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
        if (!isOwner && !senderIsAdmin) {
          await reply('❌ Group admins or the configured owner only.');
          return false;
        }
        if (!botIsAdmin) {
          await reply('❌ The bot must be a group admin to do that.');
          return false;
        }
        return true;
      }

      try {
        if (command === 'ping') {
          const startedAt = Date.now();
          await reply('🏓 Pinging…');
          await reply(`🏓 Pong! Speed: ${Date.now() - startedAt}ms\nUptime: ${Math.floor(process.uptime())}s`);
        } else if (command === 'menu' || command === 'help') {
          await reply(`👑 *BRIAN BOT MENU* 👑\n\n*GENERAL*\n.ping - Speed\n.time - Kenya Time\n.alive - Check bot\n.owner - Owner\n.joke - Random joke\n.quote - Random quote\n\n*IMAGE & MEDIA*\n.image <text> - Generate image\n.sticker - Reply to image/video to make sticker\n\n*GROUP (admins/owner; bot must be admin)*\n.kick @user - Remove member\n.promote @user - Promote member\n.demote @user - Demote member\n.tagall [message] - Tag members\n.link - Get group invite link\n\n*OWNER*\n.broadcast <text> - Owner check demo`);
        } else if (command === 'time') {
          const time = new Date().toLocaleString('en-KE', {
            timeZone: 'Africa/Nairobi', weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit',
          });
          await reply(`🕐 *Kenya Time:* ${time}`);
        } else if (command === 'alive') {
          const ownerMention = OWNER ? `\nOwner: @${OWNER}` : '';
          await sock.sendMessage(from, {
            text: `✅ *Brian Bot is alive!*\nUptime: ${Math.floor(process.uptime() / 60)} mins${ownerMention}`,
            ...(OWNER ? { mentions: [`${OWNER}@s.whatsapp.net`] } : {}),
          }, { quoted: msg });
        } else if (command === 'owner') {
          if (!OWNER) return await reply('Owner number is not configured. Set OWNER_NUMBER.');
          await sock.sendMessage(from, {
            text: `👑 My owner is @${OWNER}`,
            mentions: [`${OWNER}@s.whatsapp.net`],
          }, { quoted: msg });
        } else if (command === 'joke') {
          const response = await fetch('https://official-joke-api.appspot.com/random_joke');
          if (!response.ok) throw new Error('Joke service is unavailable.');
          const joke = await response.json();
          await reply(`😂 ${joke.setup}\n\n${joke.punchline}`);
        } else if (command === 'quote') {
          const response = await fetch('https://api.quotable.io/random');
          if (!response.ok) throw new Error('Quote service is unavailable.');
          const quote = await response.json();
          await reply(`💬 “${quote.content}”\n— ${quote.author}`);
        } else if (['image', 'img', 'imagine'].includes(command)) {
          if (!text) return await reply('❌ Usage: .image a lion with a crown');
          await reply(`🎨 Generating: “${text}”…`);
          const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 99999)}&nologo=true`;
          await sock.sendMessage(from, {
            image: { url },
            caption: `🖼️ ${text}\nRequested by @${senderNum}`,
            mentions: [sender],
          }, { quoted: msg });
        } else if (command === 'sticker' || command === 's') {
          const image = content.imageMessage || quoted?.imageMessage;
          const video = content.videoMessage || quoted?.videoMessage;
          if (!image && !video) return await reply('❌ Reply to an image or video with .sticker');
          const stream = await downloadContentFromMessage(image || video, image ? 'image' : 'video');
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          await sock.sendMessage(from, { sticker: Buffer.concat(chunks) }, { quoted: msg });
        } else if (['kick', 'promote', 'demote'].includes(command)) {
          if (!await authorizeGroupAdmin()) continue;
          const target = mentioned[0];
          if (!target) return await reply(`❌ Mention someone: .${command} @user`);
          const action = command === 'kick' ? 'remove' : command;
          await sock.groupParticipantsUpdate(from, [target], action);
          const label = command === 'kick' ? 'Removed' : command === 'promote' ? 'Promoted' : 'Demoted';
          await reply(`✅ ${label} @${numberOf(target)}${command === 'promote' ? ' to admin' : ''}.`);
        } else if (command === 'tagall') {
          if (!await authorizeGroupAdmin()) continue;
          const metadata = await sock.groupMetadata(from);
          const members = metadata.participants.map(participant => participant.id);
          const list = metadata.participants.map(participant => `@${numberOf(participant.id)}`).join('\n');
          await sock.sendMessage(from, {
            text: `📢 *TAG ALL*\n\n${text || 'Hello everyone!'}\n\n${list}`,
            mentions: members,
          }, { quoted: msg });
        } else if (command === 'link') {
          if (!await authorizeGroupAdmin()) continue;
          const code = await sock.groupInviteCode(from);
          await reply(`🔗 Group invite link:\nhttps://chat.whatsapp.com/${code}`);
        } else if (command === 'broadcast' || command === 'bc') {
          if (!isOwner) return await reply('❌ Owner only! Configure OWNER_NUMBER to enable owner commands.');
          if (!text) return await reply('❌ Usage: .broadcast Hello everyone');
          await reply(`✅ Owner check passed. Broadcast delivery is not configured: ${text}`);
        } else {
          await reply(`❌ Unknown command: .${command}\nType .menu to see commands.`);
        }
      } catch (error) {
        console.error(`Command .${command} failed:`, error);
        await reply(`❌ Command failed: ${error.message}`);
      }
    }
  });
}

start().catch(error => {
  console.error('Failed to start BRIAN BOT:', error);
  process.exitCode = 1;
});
