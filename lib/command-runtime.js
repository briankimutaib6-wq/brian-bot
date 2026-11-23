'use strict';

const PREFIX = '.';
const groups = [
  { title: '✨ GENERAL', commands: ['menu', 'help', 'about', 'ping', 'time', 'date', 'uptime', 'status', 'jid'] },
  { title: '🧰 TEXT & MATH', commands: ['calc', 'reverse', 'upper', 'lower', 'titlecase', 'wordcount', 'base64', 'unbase64'] },
  { title: '🎲 FUN', commands: ['roll', 'flip', 'choose', '8ball', 'coin', 'dice', 'quote'] },
  { title: '👥 GROUP TOOLS', commands: ['groupinfo', 'members', 'tagall', 'promote', 'demote', 'kick'] },
  { title: '📥 MEDIA', commands: ['play', 'video', 'ytmp3', 'ytmp4', 'tiktok', 'image', 'sticker', 'mediainfo'] },
  { title: '👑 OWNER', commands: ['setreply', 'autoreply', 'broadcast', 'restart', 'settings', 'ownerhelp'] }
];
const knownCommands = new Set(groups.flatMap(group => group.commands));
const startedAt = Date.now();

// Arithmetic-only recursive descent parser; user input is never evaluated as JavaScript.
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
function menu() {
  return `╭━━━〔 *BRIAN BOT* 〕━━━╮\n┃  Your handy WhatsApp companion\n╰━━━━━━━━━━━━━━━━━━╯\n\n${groups.map(group => `${group.title}\n${group.commands.map(name => `  › ${PREFIX}${name}`).join('  ')}`).join('\n\n')}\n\n_Reply with a command; use ${PREFIX}help for tips._`;
}
function commandReply(command, args, context = {}) {
  const input = String(args || '').trim();
  const words = input.split(/\s+/).filter(Boolean);
  if (command === 'menu' || command === 'help') return menu();
  if (command === 'ping') return '╭─〔 🏓 PONG 〕\n│ BRIAN BOT is responding.\n╰────────────────';
  if (command === 'time') return `🕒 *Local time:* ${new Date().toLocaleTimeString()}`;
  if (command === 'date') return `📅 *Today:* ${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
  if (command === 'uptime' || command === 'status') {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    return `╭─〔 🤖 BOT STATUS 〕\n│ State: *Online*\n│ Uptime: ${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s\n│ Runtime: Node.js ${process.versions.node}\n╰────────────────`;
  }
  if (command === 'about') return '╭─〔 ✨ ABOUT BRIAN BOT 〕\n│ A friendly WhatsApp assistant\n│ Built with Node.js and Baileys\n│ Send *.menu* to explore commands.\n╰────────────────';
  if (command === 'jid') return context.jid ? `🔎 *Chat ID:* ${context.jid}` : 'I could not read this chat ID.';
  if (command === 'calc') { try { return `🧮 *${input}* = *${calculate(input)}*`; } catch (error) { return `⚠️ ${error.message}\nExample: *.calc (12 + 8) / 4*`; } }
  if (command === 'reverse') return input ? `↩️ ${[...input].reverse().join('')}` : 'Usage: *.reverse your text*';
  if (command === 'upper') return input ? input.toLocaleUpperCase() : 'Usage: *.upper your text*';
  if (command === 'lower') return input ? input.toLocaleLowerCase() : 'Usage: *.lower YOUR TEXT*';
  if (command === 'titlecase') return input ? input.toLocaleLowerCase().replace(/\b\p{L}/gu, c => c.toLocaleUpperCase()) : 'Usage: *.titlecase your text*';
  if (command === 'wordcount') return input ? `📝 *Text stats*\nWords: ${words.length}\nCharacters: ${[...input].length}\nCharacters (no spaces): ${[...input.replace(/\s/g, '')].length}` : 'Usage: *.wordcount your text*';
  if (command === 'base64') return input ? `🔐 ${Buffer.from(input, 'utf8').toString('base64')}` : 'Usage: *.base64 text to encode*';
  if (command === 'unbase64') {
    if (!input || !/^[A-Za-z0-9+/]*={0,2}$/.test(input) || input.length % 4 !== 0) return 'Usage: *.unbase64 BASE64_TEXT*';
    return `🔓 ${Buffer.from(input, 'base64').toString('utf8') || '(empty text)'}`;
  }
  if (command === 'roll' || command === 'dice') {
    const sides = Number(input || 6);
    if (!Number.isInteger(sides) || sides < 2 || sides > 1000) return 'Choose a number of sides from 2 to 1000. Example: *.roll 20*';
    return `🎲 You rolled *${1 + Math.floor(Math.random() * sides)}* (d${sides})`;
  }
  if (command === 'flip' || command === 'coin') return `🪙 *${Math.random() < 0.5 ? 'Heads' : 'Tails'}!*`;
  if (command === 'choose') {
    const choices = input.split(/[|,]/).map(item => item.trim()).filter(Boolean);
    return choices.length > 1 ? `🎯 I choose: *${choices[Math.floor(Math.random() * choices.length)]}*` : 'Give me at least two options, separated by commas. Example: *.choose tea, coffee*';
  }
  if (command === '8ball') return input ? `🎱 ${['Absolutely!', 'Looks promising.', 'The signs say yes.', 'Ask again in a little while.', 'Hard to tell right now.', 'Probably not.', 'My answer is no.'][Math.floor(Math.random() * 7)]}` : '🎱 Ask a yes-or-no question. Example: *.8ball Should I take a break?*';
  if (command === 'quote') return `���� “${['Great things are done by a series of small things brought together. — Vincent van Gogh', 'It always seems impossible until it’s done. — Nelson Mandela', 'The secret of getting ahead is getting started. — Mark Twain', 'Well done is better than well said. — Benjamin Franklin'][Math.floor(Math.random() * 4)]}”`;
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
function attachMessageHandler(sock) {
  if (!sock?.ev?.on) throw new TypeError('A valid Baileys socket is required.');
  sock.ev.on('messages.upsert', async ({ messages = [], type } = {}) => {
    if (type !== 'notify') return;
    for (const message of messages) {
      const jid = message?.key?.remoteJid;
      if (!jid || message.key.fromMe || jid === 'status@broadcast') continue;
      const text = getText(message).trim();
      if (!text.startsWith(PREFIX)) continue;
      const [rawCommand = '', ...rest] = text.slice(PREFIX.length).trim().split(/\s+/);
      const command = rawCommand.toLowerCase();
      if (!command) continue;
      try {
        const reply = commandReply(command, rest.join(' '), { jid, sender: message.key.participant || jid });
        await sock.sendMessage(jid, { text: reply }, { quoted: message });
      } catch (error) {
        console.error(`Command reply failed for ${jid}:`, error?.message || error);
      }
    }
  });
  return sock;
}
module.exports = { attachMessageHandler, commandReply, getText, calculate, groups };