'use strict';

// Attach command handling to each Baileys socket created by index.js, without
// changing the existing pairing dashboard or connection lifecycle.
const Module = require('module');
const originalLoad = Module._load;
const PREFIX = '.';
const RESPONSE_DELAY_MS = 3000;

const commandGroups = {
  owner: ['setreply','autoreply','listreply','delreply','setwelcome','listwelcome','delwelcome','setvoice','listvoice','delvoice','addsudo','delsudo','listsudo','save','anime','csong','movie','tv','forward','savesongs','autocsong','removesong','getdp','leave','join','jid','setpp','fullpp','set','gstatus','gjid','active','apply','profile','menutype','setting','game','schedule','schedules','unschedule','mytime'],
  main: ['menu','ping','time','date','uptime','about','verse','sabbath','calc','reverse','base64','ai','ask','mediainfo','save','status'],
  downloads: ['csong','savesongs','movie','tv','anime','play','video','ytmp3','ytmp4','tiktok','apk','pdf','image'],
  group: ['groupinfo','members','tagall','promote','demote','kick'],
  vpn: ['free','price','pay','status','server','setup','buy'],
  book: ['english','kiswahili','kalenjin','verse','sabbath','book']
};
const knownCommands = new Set(Object.values(commandGroups).flat());

function getText(message = {}) {
  let content = message;
  for (const key of ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2']) {
    if (content[key]?.message) content = content[key].message;
  }
  return content.conversation || content.extendedTextMessage?.text ||
    content.imageMessage?.caption || content.videoMessage?.caption ||
    content.documentMessage?.caption || '';
}

function commandReply(command, args) {
  if (command === 'menu' || command === 'help') {
    return `🤖 BRIAN BOT COMMANDS (prefix: ${PREFIX})\n` +
      Object.entries(commandGroups).map(([group, commands]) =>
        `${group.toUpperCase()}: ${commands.map(name => `${PREFIX}${name}`).join(' ')}`
      ).join('\n');
  }
  if (command === 'ping') return '🏓 Pong!';
  if (command === 'time') return `🕒 ${new Date().toLocaleString()}`;
  if (command === 'date') return `📅 ${new Date().toLocaleDateString()}`;
  if (!knownCommands.has(command)) return `Unknown command. Send ${PREFIX}menu to see available commands.`;
  return `✅ .${command} received${args ? `: ${args}` : ''}.`;
}

function attachMessageHandler(sock) {
  if (!sock?.ev?.on) return sock;
  sock.ev.on('messages.upsert', ({ messages = [], type } = {}) => {
    if (type !== 'notify') return;
    for (const message of messages) {
      if (!message?.message || message.key?.fromMe) continue;
      const text = getText(message).trim();
      if (!text.startsWith(PREFIX)) continue;
      const [rawCommand = '', ...rest] = text.slice(PREFIX.length).trim().split(/\s+/);
      const command = rawCommand.toLowerCase();
      if (!command) continue;
      const reply = commandReply(command, rest.join(' '));
      setTimeout(() => {
        sock.sendMessage(message.key.remoteJid, { text: reply }, { quoted: message })
          .catch(error => console.error('Command reply failed:', error.message));
      }, RESPONSE_DELAY_MS);
    }
  });
  return sock;
}

Module._load = function patchedLoad(request, parent, isMain) {
  const exports = originalLoad.call(this, request, parent, isMain);
  if (request !== '@whiskeysockets/baileys' || typeof exports?.default !== 'function' || exports.default.__dotCommandHandler) {
    return exports;
  }
  const makeWASocket = exports.default;
  function makeSocketWithCommands(...args) {
    return attachMessageHandler(Reflect.apply(makeWASocket, this, args));
  }
  makeSocketWithCommands.__dotCommandHandler = true;
  return { ...exports, default: makeSocketWithCommands };
};
