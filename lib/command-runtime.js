'use strict';

const PREFIX = '.';
const AUTO_REPLY_ENABLED = false;
const AUTO_REPLY_MESSAGE = process.env.AUTO_REPLY_MESSAGE || '👋 Thanks for your message! I’m BRIAN BOT. Send *.menu* to see what I can do.';

// ===== SMD STYLE =====
function fancy(text) {
  const map = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ғ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'};
  return String(text).toLowerCase().split('').map(ch => map[ch] || ch).join('');
}
function smdMenu(title, commands) {
  let list = commands.map(c => `*│* ⬡ .${fancy(c)}`).join("\n");
  return `*┌───⭓ ${fancy(title)} ⭓───*\n${list}\n*└───────────────────⭓*`;
}
function getInfoBox(pushName) {
  const date = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'Africa/Nairobi' });
  return `*┌───⭓ ʙʀɪᴀɴ-ʙᴏᴛ ���───*\n*│* 👤 *ᴜsᴇʀ:* ${fancy(pushName || 'BRIAN')}\n*│* 👑 *ᴏᴡɴᴇʀ:* ʙʀɪᴀɴ\n*│* 📱 *ʙᴀɪʟᴇʏs:* ᴍᴅʙᴀɪʟᴇʏs*\n*│* 📅 *ᴅᴀᴛᴇ:* ${fancy(date)}\n*└───────────────────⭓*`;
}

const groups = [
  { title: 'Owner Panel', key:'owner', commands: ['setreply','autoreply','listreply','delreply','setwelcome','listwelcome','delwelcome','setvoice','listvoice','delvoice','addsudo','delsudo','listsudo','save','anime','csong','movie','tv','forward','savesongs','autocsong','removesong','getdp','leave','join','jid','setpp','fullpp','set','gstatus','gjid','active','apply','profile','menutype','setting','game','schedule','schedules','unschedule','mytime'] },
  { title: 'Main Panel', key:'main', commands: ['menu','ping','time','date','uptime','about','verse','sabbath','calc','reverse','base64','ai','ask','mediainfo','save','status'] },
  { title: 'Downloads', key:'downloads', commands: ['csong','savesongs','movie','tv','anime','play','video','ytmp3','ytmp4','tiktok','apk','pdf','image'] },
  { title: 'Group Tools', key:'group', commands: ['groupinfo','members','tagall','promote','demote','kick','clean','add','mute','unmute','invite','ginfo','lock','unlock'] },
  { title: 'VPN Panel', key:'vpn', commands: ['free','price','pay','status','server','setup','buy'] },
  { title: 'Book Panel', key:'book', commands: ['english','kiswahili','kalenjin','verse','sabbath','book'] },
  { title: 'Text & Math', key:'text', commands: ['calc','reverse','upper','lower','titlecase','wordcount','base64','unbase64'] },
  { title: 'Fun', key:'fun', commands: ['roll','flip','choose','8ball','coin','dice','quote'] },
];
const knownCommands = new Set(groups.flatMap(group => group.commands));
const startedAt = Date.now();

function calculate(input) {
  const tokens = input.match(/\d+(?:\.\d+)?|[()+\-*\/%^]/g);
  if (!tokens || tokens.join('') !== input.replace(/\s+/g, '')) throw new Error('Use numbers and + − × ÷ ^ ( ).');
  let i = 0;
  function atom() {
    const token = tokens[i++];
    if (token === '+') return atom();
    if (token === '-') return -atom();
    if (token === '(') { const value = expression(); if (tokens[i++] !== ')') throw new Error('Check your parentheses.'); return value; }
    if (!token || !/^\d/.test(token)) throw new Error('That calculation is incomplete.');
    return Number(token);
  }
  function power() { let value = atom(); if (tokens[i] === '^') { i++; value **= power(); } return value; }
  function term() { let value = power(); while (['*', '/', '%'].includes(tokens[i])) { const op = tokens[i++], rhs = power(); value = op === '*' ? value * rhs : op === '/' ? value / rhs : value % rhs; } return value; }
  function expression() { let value = term(); while (['+', '-'].includes(tokens[i])) { const op = tokens[i++], rhs = term(); value = op === '+' ? value + rhs : value - rhs; } return value; }
  const result = expression();
  if (i !== tokens.length || !Number.isFinite(result)) throw new Error('Please enter a valid calculation.');
  return Number(result.toPrecision(12)).toString();
}

function menu(pushName) {
  let out = getInfoBox(pushName) + "\n\n";
  for (const g of groups) out += smdMenu(g.title, g.commands) + "\n\n";
  out += `*ʙʀɪᴀɴ ʙᴏᴛ ʙʏ ʙʀɪᴀɴ*`;
  return out;
}
function categoryMenu(key, pushName) {
  const g = groups.find(x => x.key === key);
  if (!g) return menu(pushName);
  return getInfoBox(pushName) + "\n\n" + smdMenu(g.title, g.commands) + `\n\n*ʙʀɪᴀɴ ʙᴏᴛ ʙʏ ʙʀɪᴀɴ*`;
}

function commandReply(command, args, context = {}) {
  const input = String(args || '').trim();
  const words = input.split(/\s+/).filter(Boolean);
  const name = context.pushName || 'BRIAN';
  if (command === 'menu' || command === 'help' || command === 'allmenu') return menu(name);
  if (command === 'owner' || command === 'ownermenu') return categoryMenu('owner', name);
  if (command === 'group' || command === 'groupmenu') return categoryMenu('group', name);
  if (command === 'download' || command === 'downloads' || command === 'downloadmenu') return categoryMenu('downloads', name);
  if (command === 'main' || command === 'mainmenu') return categoryMenu('main', name);
  if (command === 'vpn') return categoryMenu('vpn', name);
  if (command === 'book' || command === 'bookmenu') return categoryMenu('book', name);
  if (command === 'ping') return `*┌───⭓ ᴘᴏɴɢ ⭓───*\n*│* 🏓 *BRIAN BOT is responding.*\n*└───────────────────⭓*`;
  if (command === 'time') return `🕒 *Local time:* ${new Date().toLocaleTimeString()}`;
  if (command === 'date') return `📅 *Today:* ${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
  if (command === 'uptime' || command === 'status') {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    return `*┌───⭓ ʙᴏᴛ sᴛᴀᴛᴜs ⭓───*\n*│* *State:* Online\n*│* *Uptime:* ${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s\n*└───────────────────⭓*`;
  }
  if (command === 'about') return '✨ *BRIAN BOT* - A friendly WhatsApp assistant. Built with Node.js and Baileys. Send *.menu* to explore commands.';
  if (command === 'jid') return context.jid ? `🔎 *Chat ID:* ${context.jid}` : 'I could not read this chat ID.';
  if (command === 'calc') { try { return `🧮 *${input}* = *${calculate(input)}*`; } catch (error) { return `⚠️ ${error.message}\nExample: *.calc (12 + 8) / 4*`; } }
  if (command === 'reverse') return input ? `↩️ ${[...input].reverse().join('')}` : 'Usage: *.reverse your text*';
  if (command === 'upper') return input ? input.toLocaleUpperCase() : 'Usage: *.upper your text*';
  if (command === 'lower') return input ? input.toLocaleLowerCase() : 'Usage: *.lower YOUR TEXT*';
  if (command === 'titlecase') return input ? input.toLocaleLowerCase().replace(/\b\p{L}/gu, c => c.toLocaleUpperCase()) : 'Usage: *.titlecase your text*';
  if (command === 'wordcount') return input ? `📝 *Text stats*\nWords: ${words.length}\nCharacters: ${[...input].length}` : 'Usage: *.wordcount your text*';
  if (command === 'base64') return input ? `🔐 ${Buffer.from(input, 'utf8').toString('base64')}` : 'Usage: *.base64 text to encode*';
  if (command === 'unbase64') {
    if (!input || !/^[A-Za-z0-9+/]*={0,2}$/.test(input) || input.length % 4 !== 0) return 'Usage: *.unbase64 BASE64_TEXT*';
    return `🔓 ${Buffer.from(input, 'base64').toString('utf8') || '(empty text)'}`;
  }
  if (command === 'roll' || command === 'dice') {
    const sides = Number(input || 6);
    if (!Number.isInteger(sides) || sides < 2 || sides > 1000) return 'Choose sides 2 to 1000. Example: *.roll 20*';
    return `🎲 You rolled *${1 + Math.floor(Math.random() * sides)}* (d${sides})`;
  }
  if (command === 'flip' || command === 'coin') return `🪙 *${Math.random() < 0.5 ? 'Heads' : 'Tails'}!*`;
  if (command === 'choose') {
    const choices = input.split(/[|,]/).map(item => item.trim()).filter(Boolean);
    return choices.length > 1 ? `🎯 I choose: *${choices[Math.floor(Math.random() * choices.length)]}*` : 'Give me at least two options. Example: *.choose tea, coffee*';
  }
  if (command === '8ball') return input ? `🎱 ${['Absolutely!', 'Looks promising.', 'The signs say yes.', 'Ask again later.', 'Hard to tell.', 'Probably not.', 'My answer is no.'][Math.floor(Math.random() * 7)]}` : '🎱 Ask a yes-or-no question. Example: *.8ball Should I take a break?*';
  if (command === 'quote') return `💬 “${['Great things are done by a series of small things brought together. — Vincent van Gogh', 'It always seems impossible until it’s done. — Nelson Mandela', 'The secret of getting ahead is getting started. — Mark Twain'][Math.floor(Math.random() * 3)]}”`;
  if (!knownCommands.has(command)) return `I don't recognize that command. Send *${PREFIX}menu* to see what I can do.`;
  return `ℹ️ *.${command}* is listed, but needs an external service or group/owner integration that is not configured yet.`;
}
function unwrapMessage(message) {
  let content = message;
  for (let depth = 0; depth < 8 && content; depth += 1) {
    const wrapper = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension', 'documentWithCaptionMessage', 'editedMessage'].find(key => content[key]?.message);
    if (!wrapper) break;
    content = content[wrapper].message;
  }
  return content || {};
}
function getText(message = {}) {
  const content = unwrapMessage(message.message || message);
  return content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption || content.videoMessage?.caption || content.documentMessage?.caption || content.buttonsResponseMessage?.selectedButtonId || content.listResponseMessage?.singleSelectReply?.selectedRowId || content.templateButtonReplyMessage?.selectedId || content.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || '';
}
function isDirectChat(jid) {
  return jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid');
}
function attachMessageHandler(sock) {
  if (!sock?.ev?.on) throw new TypeError('A valid Baileys socket is required.');
  sock.ev.on('messages.upsert', async ({ messages = [], type } = {}) => {
    if (type !== 'notify' && type !== 'append') return;
    for (const message of messages) {
      const jid = message?.key?.remoteJid;
      if (!jid || jid === 'status@broadcast') continue;
      const text = getText(message).trim();
      console.log(`📩 Got message from ${jid}: ${text}`);
      if (text.startsWith(PREFIX)) {
        const [rawCommand = '', ...rest] = text.slice(PREFIX.length).trim().split(/\s+/);
        const command = rawCommand.toLowerCase();
        if (!command) continue;
        try {
          const reply = commandReply(command, rest.join(' '), { jid, sender: message.key.participant || jid, pushName: message.pushName });
          await sock.sendMessage(jid, { text: reply }, { quoted: message });
          console.log(`✅ Replied to ${command}`);
        } catch (error) {
          console.error(`Command reply failed for ${jid}:`, error?.message || error);
        }
        continue;
      }
      if (!AUTO_REPLY_ENABLED || !text || !isDirectChat(jid)) continue;
      try {
        await sock.sendMessage(jid, { text: AUTO_REPLY_MESSAGE }, { quoted: message });
      } catch (error) {
        console.error(`Automatic reply failed for ${jid}:`, error?.message || error);
      }
    }
  });
  return sock;
}
module.exports = { attachMessageHandler, commandReply, getText, calculate, groups };
