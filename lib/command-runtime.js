'use strict';

const PREFIX = '.';

const commandGroups = {
  owner: ['setreply','autoreply','listreply','delreply','setwelcome','listwelcome','delwelcome','setvoice','listvoice','delvoice','addsudo','delsudo','listsudo','save','anime','csong','movie','tv','forward','savesongs','autocsong','removesong','getdp','leave','join','jid','setpp','fullpp','set','gstatus','gjid','active','apply','profile','menutype','setting','game','schedule','schedules','unschedule','mytime'],
  main: ['menu','ping','time','date','uptime','about','verse','sabbath','calc','reverse','base64','ai','ask','mediainfo','save','status'],
  downloads: ['csong','savesongs','movie','tv','anime','play','video','ytmp3','ytmp4','tiktok','apk','pdf','image'],
  group: ['groupinfo','members','tagall','promote','demote','kick'],
  vpn: ['free','price','pay','status','server','setup','buy'],
  book: ['english','kiswahili','kalenjin','verse','sabbath','book']
};
const knownCommands = new Set(Object.values(commandGroups).flat());

// Baileys wraps messages for ephemeral, view-once, and edited-message delivery.
function unwrapMessage(message) {
  let content = message;
  for (let depth = 0; depth < 8 && content; depth += 1) {
    const wrapper = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension', 'documentWithCaptionMessage', 'editedMessage']
      .find(key => content[key]?.message);
    if (!wrapper) break;
    content = content[wrapper].message;
  }
  return content || {};
}

function getText(message = {}) {
  const content = unwrapMessage(message.message || message);
  return content.conversation || content.extendedTextMessage?.text ||
    content.imageMessage?.caption || content.videoMessage?.caption ||
    content.documentMessage?.caption || content.buttonsResponseMessage?.selectedButtonId ||
    content.listResponseMessage?.singleSelectReply?.selectedRowId ||
    content.templateButtonReplyMessage?.selectedId ||
    content.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || '';
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
  if (!sock?.ev?.on) throw new TypeError('A valid Baileys socket is required.');

  sock.ev.on('messages.upsert', async ({ messages = [], type } = {}) => {
    // `notify` represents newly received messages. History-sync batches must not
    // trigger replies to old messages while a linked device is syncing.
    if (type !== 'notify') return;

    for (const message of messages) {
      const jid = message?.key?.remoteJid;
      if (!jid || message.key.fromMe || message.key.remoteJid === 'status@broadcast') continue;

      const text = getText(message).trim();
      if (!text.startsWith(PREFIX)) continue;
      const [rawCommand = '', ...rest] = text.slice(PREFIX.length).trim().split(/\s+/);
      const command = rawCommand.toLowerCase();
      if (!command) continue;

      try {
        await sock.sendMessage(jid, { text: commandReply(command, rest.join(' ')) }, { quoted: message });
      } catch (error) {
        console.error(`Command reply failed for ${jid}:`, error?.message || error);
      }
    }
  });
  return sock;
}

module.exports = { attachMessageHandler, commandReply, getText };
