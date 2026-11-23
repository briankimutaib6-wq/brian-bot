'use strict';

const fs = require('fs');
const path = require('path');
const runtime = require('./command-runtime');
const downloads = require('./download-commands');

const SETTINGS_PATH = process.env.PREFIX_SETTINGS_PATH || path.join(process.cwd(), 'prefix-settings.json');
const DEFAULT_PREFIX = '.';
const MAX_PREFIX_LENGTH = 20;
const pendingChoices = new Set();
let prefixes = new Map();

function isValidPrefix(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_PREFIX_LENGTH && !/\s/.test(value);
}

try {
  const saved = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    prefixes = new Map(Object.entries(saved).filter(([, prefix]) => isValidPrefix(prefix)));
  }
} catch (error) {
  if (error.code !== 'ENOENT') console.error('Could not load saved command prefixes:', error.message);
}

function savePrefixes() {
  const directory = path.dirname(SETTINGS_PATH);
  fs.mkdirSync(directory, { recursive: true });
  const temporaryPath = `${SETTINGS_PATH}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(Object.fromEntries(prefixes), null, 2));
  fs.renameSync(temporaryPath, SETTINGS_PATH);
}

function senderId(message) {
  return message.key?.participant || message.key?.remoteJid;
}

function setMessageText(message, text) {
  message.message = { conversation: text };
}

function attachMessageHandler(sock) {
  if (!sock?.ev?.on) throw new TypeError('A valid Baileys socket is required.');

  // This listener runs before the standard runtime. Remove handled messages from
  // the shared batch before awaiting network I/O to avoid duplicate replies.
  sock.ev.on('messages.upsert', ({ messages = [], type } = {}) => {
    if (type !== 'notify' && type !== 'append') return;

    const remaining = [];
    const work = [];

    for (const message of messages) {
      const jid = message?.key?.remoteJid;
      if (!jid || message.key.fromMe) {
        remaining.push(message);
        continue;
      }

      const text = runtime.getText(message).trim();
      const user = senderId(message);
      if (!text || !user) {
        remaining.push(message);
        continue;
      }

      if (pendingChoices.has(user)) {
        if (text.toLowerCase() === 'cancel') {
          pendingChoices.delete(user);
          work.push(sock.sendMessage(jid, { text: 'Prefix selection cancelled.' }, { quoted: message }));
        } else if (!isValidPrefix(text)) {
          work.push(sock.sendMessage(jid, {
            text: `Please reply with a non-empty prefix of up to ${MAX_PREFIX_LENGTH} characters, with no spaces. Try again, or send "cancel" to stop.`,
          }, { quoted: message }));
        } else {
          prefixes.set(user, text);
          pendingChoices.delete(user);
          try {
            savePrefixes();
            work.push(sock.sendMessage(jid, { text: `✅ Your bot prefix is now *${text}*. For example, send *${text}menu*.` }, { quoted: message }));
          } catch (error) {
            console.error('Could not save command prefix:', error.message);
            work.push(sock.sendMessage(jid, { text: `Your prefix is set to *${text}* for this session, but could not be saved to disk.` }, { quoted: message }));
          }
        }
        continue;
      }

      const prefix = prefixes.get(user) || DEFAULT_PREFIX;
      if (!text.startsWith(prefix)) {
        remaining.push(message);
        continue;
      }

      const withoutPrefix = text.slice(prefix.length).trim();
      const [rawCommand = '', ...args] = withoutPrefix.split(/\s+/);
      const command = rawCommand.toLowerCase();
      const query = args.join(' ');

      if (command === 'settings' || command === 'setting') {
        pendingChoices.add(user);
        work.push(sock.sendMessage(jid, {
          text: `⚙️ What prefix would you like to use? Reply with any prefix (up to ${MAX_PREFIX_LENGTH} characters, no spaces). Send "cancel" to keep the current prefix (*${prefix}*).`,
        }, { quoted: message }));
        continue;
      }

      if (command === 'apk' || command === 'csong') {
        work.push((async () => {
          try {
            const reply = await downloads.run(command, query);
            await sock.sendMessage(jid, { text: reply }, { quoted: message });
          } catch (error) {
            console.error(`${command} command failed:`, error.message);
            await sock.sendMessage(jid, { text: `⚠️ ${command} search failed. Please try again later.` }, { quoted: message });
          }
        })());
        continue;
      }

      if (prefix !== DEFAULT_PREFIX) setMessageText(message, `${DEFAULT_PREFIX}${withoutPrefix}`);
      remaining.push(message);
    }

    messages.splice(0, messages.length, ...remaining);
    Promise.allSettled(work).then(results => {
      for (const result of results) if (result.status === 'rejected') console.error('Prefix/download reply failed:', result.reason?.message || result.reason);
    });
  });

  return runtime.attachMessageHandler(sock);
}

module.exports = { attachMessageHandler };
