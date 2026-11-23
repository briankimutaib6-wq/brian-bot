'use strict';

const PREFIX = '.';

// ===== AUTO REPLY - OFF BY DEFAULT + ANTI-SPAM =====
let autoReplyEnabled = String(process.env.AUTO_REPLY || 'false').toLowerCase() === 'true';
const AUTO_REPLY_MESSAGE = process.env.AUTO_REPLY_MESSAGE || '👋 Thanks for your message! I’m BRIAN BOT. Send *.menu* to see what I can do.';
const lastAutoReply = new Map();
const AUTO_REPLY_COOLDOWN = 10 * 60 * 1000; // 10 min

// ===== AUTO LIKE STATUS - ON BY DEFAULT =====
let autoLikeEnabled = String(process.env.AUTO_LIKE_STATUS || 'true').toLowerCase() !== 'false';
const LIKE_EMOJIS = ['❤️','🔥','😍','👍','🥰','😂','😮','👏','💯','🙌'];

// ===== BURN / UNBURN LISTS =====
const BURN_LINES = [
  "is so slow, even a tortoise beats you in a race! 🐢🔥",
  "your brain is like WiFi in Nandi - always disconnecting! 📶🔥",
  "you're the reason why the charger says 'charging slowly'! 🔌🔥",
  "even Google can't find your brain! ����🔥",
  "you're so dull, your shadow left you! 👤🔥",
  "your jokes are drier than ugali without soup! 🍲🔥",
  "you're like a broken phone - no one wants to pick you! 📱🔥",
  "if laziness was a job, you'd be CEO! 💼🔥",
  "your face is like a loading screen - never finishes! ⏳🔥",
  "you're so fake, even your selfie needs a filter! 🤳🔥",
  "your IQ is lower than your shoe size! 👟🔥",
  "you talk so much, even your phone goes on silent! 🤫🔥"
];
const UNBURN_LINES = [
  "is now cooled down! You are safe now, legend! 🧊✨",
  "has been saved! No more fire, only peace! 🕊️❤️",
  "is officially UNBURNED! You're a star! ⭐",
  "fire is out! You're too cool to burn! 😎🧊",
  "is now fresh like morning rain in Nandi! 🌧️✨",
  "has been rescued by BRIAN BOT! You're good! 🦸",
  "is now chill like ice cream! 🍦🧊",
  "burn reversed! You're now the coolest in the group! 👑"
];

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
  return `*┌───⭓ ʙʀɪᴀɴ-ʙᴏᴛ ⭓───*\n*│* 👤 *ᴜsᴇʀ:* ${fancy(pushName || 'BRIAN')}\n*│* 👑 *ᴏᴡɴᴇʀ:* ʙʀɪᴀɴ\n*│* 📱 *ʙᴀɪʟᴇʏs:* ᴍᴜʟᴛɪ ᴅᴇᴠɪᴄᴇ\n*│* 📅 *ᴅᴀᴛᴇ:* ${date}\n*│* ⚙️ *ᴛʏᴘᴇ:* ɴᴏᴅᴇᴊs\n*│* 🔑 *ᴘʀᴇғɪx:* .\n*│* 🛡️ *ᴍᴏᴅᴇ:* ᴘᴜʙʟɪᴄ\n*│* ❤️ *ᴀᴜᴛᴏʟɪᴋᴇ:* ${autoLikeEnabled ? 'ᴏɴ' : 'ᴏғғ'}\n*│* 📩 *ᴀᴜᴛᴏʀᴇᴘʟʏ:* ${autoReplyEnabled ? 'ᴏɴ' : 'ᴏғғ'}\n*│* 🟢 *sᴛᴀᴛᴜs:* *ᴏɴʟɪɴᴇ*\n*│* 📦 *ᴠᴇʀsɪᴏɴ:* 6.0.0\n*└───────────────────⭓*`;
}

const groups = [
  { title: 'Owner Panel', key:'owner', commands: ['setreply','autoreply','listreply','delreply','setwelcome','listwelcome','delwelcome','setvoice','listvoice','delvoice','addsudo','delsudo','listsudo','save','anime','csong','movie','tv','forward','savesongs','autocsong','removesong','getdp','leave','join','jid','setpp','fullpp','set','gstatus','gjid','active','apply','profile','menutype','setting','game','schedule','schedules','unschedule','mytime','autolike','autolikestatus'] },
  { title: 'Main Panel', key:'main', commands: ['menu','ping','time','date','uptime','about','verse','sabbath','calc','reverse','base64','ai','ask','mediainfo','save','status'] },
  { title: 'Downloads', key:'downloads', commands: ['csong','savesongs','movie','tv','anime','play','video','ytmp3','ytmp4','tiktok','apk','pdf','image'] },
  { title: 'Group Tools', key:'group', commands: ['groupinfo','members','tagall','promote','demote','kick','clean','add','mute','unmute','invite','ginfo','lock','unlock'] },
  { title: 'VPN Panel', key:'vpn', commands: ['free','price','pay','status','server','setup','buy'] },
  { title: 'Book Panel', key:'book', commands: ['english','kiswahili','kalenjin','verse','sabbath','book'] },
  { title: 'Text & Math', key:'text', commands: ['calc','reverse','upper','lower','titlecase','wordcount','base64','unbase64'] },
  { title: 'Fun', key:'fun', commands: ['roll','flip','choose','8ball','coin','dice','quote','burn','unburn'] },
];
const knownCommands = new Set(groups.flatMap(group => group.commands));
const startedAt = Date.now();

function calculate(input) {
  const tokens = input.match(/\d+(?:\.\d+)?|[()+\-*\/%^]/g);
  if (!tokens || tokens.join('') !== input.replace(/\s+/g, '')) throw new Error('Use numbers and + − × ÷ ^ ( ).');
  let i = 0;
  function atom() { const token = tokens[i++]; if (token === '+') return atom(); if (token === '-') return -atom(); if (token === '(') { const value = expression(); if (tokens[i++] !== ')') throw new Error('Check your parentheses.'); return value; } if (!token || !/^\d/.test(token)) throw new Error('That calculation is incomplete.'); return Number(token); }
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

  // ===== AUTO LIKE STATUS =====
  if (command === 'autolike' || command === 'autolikestatus' || command === 'autolikes') {
    const arg = input.toLowerCase();
    if (arg === 'on' || arg === 'enable' || arg === '1') { autoLikeEnabled = true; return `*┌───⭓ ᴀᴜᴛᴏʟɪᴋᴇ ⭓───*\n*│* ❤️ *sᴛᴀᴛᴜs:* *ᴏɴ*\n*│* ✅ Auto-Like Status is now ON. Bot will like all statuses.\n*└───────────────────⭓*`; }
    if (arg === 'off' || arg === 'disable' || arg === '0') { autoLikeEnabled = false; return `*┌───⭓ ᴀᴜᴛᴏʟɪᴋᴇ ⭓───*\n*│* ❤️ *sᴛᴀᴛᴜs:* *ᴏғғ*\n*│* ❌ Auto-Like Status is now OFF.\n*└───────────────────⭓*`; }
    return `*┌───⭓ ᴀᴜᴛᴏʟɪᴋᴇ ⭓───*\n*│* ❤️ *sᴛᴀᴛᴜs:* *${autoLikeEnabled ? 'ᴏɴ' : 'ᴏғғ'}*\n*│* ⬡ .ᴀᴜᴛᴏʟɪᴋᴇ ᴏɴ - Turn ON\n*│* ⬡ .ᴀᴜᴛᴏʟɪᴋᴇ ᴏғғ - Turn OFF\n*└───────────────────⭓*`;
  }

  // ===== AUTO REPLY - OFF BY DEFAULT =====
  if (command === 'autoreply' || command === 'autorespond' || command === 'autoreplies') {
    const arg = input.toLowerCase();
    if (arg === 'on' || arg === 'enable' || arg === '1') { autoReplyEnabled = true; return `*┌───⭓ ᴀᴜᴛᴏʀᴇᴘʟʏ ⭓───*\n*│* ✅ *sᴛᴀᴛᴜs:* *ᴏɴ*\n*│* Bot will now auto-reply (1 per 10 min per person).\n*└───────────────────⭓*`; }
    if (arg === 'off' || arg === 'disable' || arg === '0') { autoReplyEnabled = false; return `*┌───⭓ ᴀᴜᴛᴏʀᴇᴘʟʏ ⭓───*\n*│* ❌ *sᴛᴀᴛᴜs:* *ᴏғғ*\n*│* Bot will NOT auto-reply anymore.\n*└───────────────────⭓*`; }
    return `*┌───⭓ ᴀᴜᴛᴏʀᴇᴘʟʏ ⭓───*\n*│* 📩 *sᴛᴀᴛᴜs:* *${autoReplyEnabled ? 'ᴏɴ' : 'ᴏғғ'}*\n*│* ⬡ .ᴀᴜᴛᴏʀᴇᴘʟʏ ᴏɴ - Turn ON\n*│* ⬡ .ᴀᴜᴛᴏʀᴇᴘʟʏ ᴏғғ - Turn OFF\n*│* ⚠️ Cooldown: 1 reply per 10 min per person\n*└───────────────────⭓*`;
  }

  // ===== BURN / UNBURN - NEW =====
  if (command === 'burn' || command === 'roast') {
    const target = input || name;
    const line = BURN_LINES[Math.floor(Math.random() * BURN_LINES.length)];
    return `*┌───⭓ 🔥 ʙᴜʀɴᴇᴅ! ⭓���──*\n*│* 🔥 *${target}* ${line}\n*│* 💀 *ʙᴜʀɴ ʟᴇᴠᴇʟ:* 100%\n*│* 🧊 Need help? Send .ᴜɴʙᴜʀɴ ${target}\n*└───────────────────⭓*`;
  }
  if (command === 'unburn' || command === 'unroast' || command === 'cool' || command === 'save') {
    const target = input || name;
    const line = UNBURN_LINES[Math.floor(Math.random() * UNBURN_LINES.length)];
    return `*┌───⭓ 🧊 ᴜɴʙᴜʀɴᴇᴅ! ⭓───*\n*│* 🧊 *${target}* ${line}\n*│* ❤️ *sᴛᴀᴛᴜs:* Saved by BRIAN BOT\n*└───────────────────⭓*`;
  }

  if (command === 'ping') return `*┌───⭓ ᴘᴏɴɢ ⭓───*\n*│* 🏓 *BRIAN BOT is responding.*\n*└───────────────────⭓*`;
  if (command === 'time') return `🕒 *Local time:* ${new Date().toLocaleTimeString()}`;
  if (command === 'date') return `📅 *Today:* ${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
  if (command === 'uptime' || command === 'status') { const seconds = Math.floor((Date.now() - startedAt) / 1000); return `*┌───⭓ ʙᴏᴛ sᴛᴀᴛᴜs ⭓───*\n*│* *State:* Online\n*│* *Uptime:* ${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s\n*│* *AutoLike:* ${autoLikeEnabled ? 'ON ❤️' : 'OFF'}\n*│* *AutoReply:* ${autoReplyEnabled ? 'ON 📩' : 'OFF'}\n*└───────────────────⭓*`; }
  if (command === 'about') return '✨ *BRIAN BOT* - A friendly WhatsApp assistant. Built with Node.js and Baileys. Send *.menu* to explore commands.';
  if (command === 'jid') return context.jid ? `🔎 *Chat ID:* ${context.jid}` : 'I could not read this chat ID.';
  if (command === 'calc') { try { return `🧮 *${input}* = *${calculate(input)}*`; } catch (error) { return `⚠️ ${error.message}\nExample: *.calc (12 + 8) / 4*`; } }
  if (command === 'reverse') return input ? `↩️ ${[...input].reverse().join('')}` : 'Usage: *.reverse your text*';
  if (command === 'upper') return input ? input.toLocaleUpperCase() : 'Usage: *.upper your text*';
  if (command === 'lower') return input ? input.toLocaleLowerCase() : 'Usage: *.lower YOUR TEXT*';
  if (command === 'titlecase') return input ? input.toLocaleLowerCase().replace(/\b\p{L}/gu, c => c.toLocaleUpperCase()) : 'Usage: *.titlecase your text*';
  if (command === 'wordcount') return input ? `📝 *Text stats*\nWords: ${words.length}\nCharacters: ${[...input].length}` : 'Usage: *.wordcount your text*';
  if (command === 'base64') return input ? `🔐 ${Buffer.from(input, 'utf8').toString('base64')}` : 'Usage: *.base64 text to encode*';
  if (command === 'unbase64') { if (!input || !/^[A-Za-z0-9+/]*={0,2}$/.test(input) || input.length % 4 !== 0) return 'Usage: *.unbase64 BASE64_TEXT*'; return `🔓 ${Buffer.from(input, 'base64').toString('utf8') || '(empty text)'}`; }
  if (command === 'roll' || command === 'dice') { const sides = Number(input || 6); if (!Number.isInteger(sides) || sides < 2 || sides > 1000) return 'Choose sides 2 to 1000. Example: *.roll 20*'; return `🎲 You rolled *${1 + Math.floor(Math.random() * sides)}* (d${sides})`; }
  if (command === 'flip' || command === 'coin') return `🪙 *${Math.random() < 0.5 ? 'Heads' : 'Tails'}!*`;
  if (command === 'choose') { const choices = input.split(/[|,]/).map(item => item.trim()).filter(Boolean); return choices.length > 1 ? `🎯 I choose: *${choices[Math.floor(Math.random() * choices.length)]}*` : 'Give me at least two options. Example: *.choose tea, coffee*'; }
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
function isDirectChat(jid) { return jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid'); }
function attachMessageHandler(sock) {
  if (!sock?.ev?.on) throw new TypeError('A valid Baileys socket is required.');
  sock.ev.on('messages.upsert', async ({ messages = [], type } = {}) => {
    if (type !== 'notify' && type !== 'append') return;
    for (const message of messages) {
      const jid = message?.key?.remoteJid;
      if (!jid) continue;

      // ===== AUTO LIKE STATUS =====
      if (jid === 'status@broadcast') {
        if (!autoLikeEnabled) continue;
        if (message.key.fromMe) continue;
        try {
          const emoji = LIKE_EMOJIS[Math.floor(Math.random() * LIKE_EMOJIS.length)];
          await sock.sendMessage(jid, { react: { text: emoji, key: message.key } });
          console.log(`❤️ Auto-liked status from ${message.key.participant} with ${emoji}`);
        } catch (e) { console.log('Auto-like failed:', e.message); }
        continue;
      }

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
        } catch (error) { console.error(`Command reply failed for ${jid}:`, error?.message || error); }
        continue;
      }

      // ===== AUTO REPLY - ANTI SPAM (1 per 10 min) =====
      if (!autoReplyEnabled || !text || !isDirectChat(jid)) continue;
      const lastTime = lastAutoReply.get(jid) || 0;
      if (Date.now() - lastTime < AUTO_REPLY_COOLDOWN) { console.log(`⏭️ Skipped auto-reply to ${jid} - Cooldown`); continue; }
      lastAutoReply.set(jid, Date.now());
      try { await sock.sendMessage(jid, { text: AUTO_REPLY_MESSAGE }, { quoted: message }); console.log(`✅ Auto-replied to ${jid}`); } catch (error) { console.error(`Automatic reply failed for ${jid}:`, error?.message || error); }
    }
  });
  return sock;
}
module.exports = { attachMessageHandler, commandReply, getText, calculate, groups };
