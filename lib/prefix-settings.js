'use strict';

const fs = require('fs');
const path = require('path');
const runtime = require('./command-runtime');

const SETTINGS_PATH = process.env.PREFIX_SETTINGS_PATH || path.join(process.cwd(), 'prefix-settings.json');
const DEFAULT_PREFIX = '.';
const MAX_PREFIX_LENGTH = 20;
const pendingChoices = new Set();
let prefixes = new Map();

try {
  const saved = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    prefixes = new Map(Object.entries(saved).filter(([, prefix]) => isValidPrefix(prefix)));
  }
} catch (error) {
  if (error.code !== 'ENOENT') console.error('Could not load saved command prefixes:', error.message);
}

function isValidPrefix(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_PREFIX_LENGTH && !/\s/.test(value);
}

function savePrefixes() {
  const temporaryPath = `${SETTINGS_PATH}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(Object.fromEntries(prefixes), null, 2));
  fs.renameSync(temporaryPath, SETTINGS_PATH);
}

function senderId(message) {
  return message.key?.participant || message.key?.remoteJid;
}

function setMessageText(message, text) {
  // The runtime only needs the message text when dispatching a command. Keep the
  // key and other metadata intact so replies can still quote the original.
  message.message = { conversation: text };
}

function attachMessageHandler(sock) {
  if (!sock?.ev?.on) throw new TypeError('A valid Baileys socket is required.');

  // Register before the normal command handler so settings exchanges can be
  // consumed and custom prefixes can be translated to the runtime's default.
  sock.ev.on('messages.upsert', async ({ messages = [], type } = {}) => {
    if (type !== 'notify' && type !== 'append') return;

    const remaining = [];
    for (const message of messages) {
      const jid = message?.key?.remoteJid;
      if (!jid || message.key.fromMe) {
        remaining.push(message);
        continue;
      }

      const text = runtime.getText(message).trim();
      if (!text) {
        remaining.push(message);
        continue;
      }

      const user = senderId(message);
      if (!user) {
        remaining.push(message);
        continue;
      }

      if (pendingChoices.has(user)) {
        const choice = text;
        if (!isValidPrefix(choice)) {
          await sock.sendMessage(jid, {
            text: `Please reply with a non-empty prefix of up to ${MAX_PREFIX_LENGTH} characters, with no spaces. Try again, or send "cancel" to stop.`,
          }, { quoted: message });
          if (choice.toLowerCase() === 'cancel') pendingChoices.delete(user);
          continue;
        }
        if (choice.toLowerCase() === 'cancel') {
          pendingChoices.delete(user);
          await sock.sendMessage(jid, { text: 'Prefix selection cancelled.' }, { quoted: message });
          continue;
        }

        prefixes.set(user, choice);
        pendingChoices.delete(user);
        try {
          savePrefixes();
          await sock.sendMessage(jid, { text: `✅ Your bot prefix is now *${choice}*. For example, send *${choice}menu*.` }, { quoted: message });
        } catch (error) {
          console.error('Could not save command prefix:', error.message);
          await sock.sendMessage(jid, { text: `Your prefix is set to *${choice}* for this session, but could not be saved to disk.` }, { quoted: message });
        }
        continue;
      }

      const prefix = prefixes.get(user) || DEFAULT_PREFIX;
      if (text.startsWith(prefix)) {
        const command = text.slice(prefix.length).trim().split(/\s+/, 1)[0].toLowerCase();
        if (command === 'settings') {
          pendingChoices.add(user);
          await sock.sendMessage(jid, {
            text: `⚙️ What prefix would you like to use? Reply with any prefix (up to ${MAX_PREFIX_LENGTH} characters, no spaces). Send "cancel" to keep the current prefix (*${prefix}*).`,
          }, { quoted: message });
          continue;
        }
        if (prefix !== DEFAULT_PREFIX) setMessageText(message, `${DEFAULT_PREFIX}${text.slice(prefix.length)}`);
      }
      remaining.push(message);
    }

    // Baileys and the standard runtime both receive the same upsert payload.
    // Remove messages handled above so they do not get a duplicate response.
    messages.splice(0, messages.length, ...remaining);
  });

  return runtime.attachMessageHandler(sock);
}

module.exports = { attachMessageHandler };
