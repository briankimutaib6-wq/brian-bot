'use strict';

const fs = require('fs');
const path = require('path');
const runtime = require('./command-runtime');
const downloads = require('./download-commands');
const { generateImageUrl } = require('./image-command');
const { downloadYouTube } = require('./youtube-downloads');

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

function formatNumber(jid) {
  const number = String(jid || '').split('@')[0].replace(/[^0-9]/g, '');
  return number ? `+${number}` : 'Unavailable';
}

function getQuotedParticipant(message) {
  const quoted = message?.message?.extendedTextMessage?.contextInfo;
  return quoted?.participant || quoted?.mentionedJid?.[0] || null;
}

function formatGroupInfo(metadata) {
  const participants = Array.isArray(metadata.participants) ? metadata.participants : [];
  const admins = participants.filter(participant => participant.admin === 'admin' || participant.admin === 'superadmin');
  const createdBy = metadata.owner || participants.find(participant => participant.admin === 'superadmin')?.id;
  const description = metadata.desc?.trim() || 'No description';
  const createdAt = metadata.creation
    ? new Date(Number(metadata.creation) * 1000).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })
    : 'Unavailable';

  return [
    '*┌───⭓ 👥 GROUP INFO ⭓───*',
    `*│* 🏷️ *Group name:* ${metadata.subject || 'Unknown'}`,
    `*│* 👥 *Total members:* ${participants.length}`,
    `*│* 🛡️ *Total admins:* ${admins.length}`,
    `*│* 📝 *Description:* ${description}`,
    `*│* 📅 *Created:* ${createdAt}`,
    `*│* 👤 *Created by:* ${formatNumber(createdBy)}`,
    '*└───────────────────⭓*',
  ].join('\n');
}

function formatGroupMembers(metadata) {
  const participants = Array.isArray(metadata.participants) ? metadata.participants : [];
  const lines = [
    '*┌───⭓ 👥 GROUP MEMBERS ⭓───*',
    `*│* 🏷️ *Group:* ${metadata.subject || 'Unknown'}`,
    `*│* 🔢 *Total:* ${participants.length}`,
    '*│*',
  ];

  if (!participants.length) {
    lines.push('*│* No members found.');
  } else {
    participants.forEach((participant, index) => {
      const role = participant.admin === 'superadmin'
        ? 'Owner'
        : participant.admin === 'admin'
          ? 'Admin'
          : 'Member';
      lines.push(`*│* ${index + 1}. ${formatNumber(participant.id)} — ${role}`);
    });
  }

  lines.push('*└───────────────────⭓*');
  return lines.join('\n');
}

function participantFromQuery(query) {
  const digits = String(query || '').replace(/[^0-9]/g, '');
  return digits ? `${digits}@s.whatsapp.net` : null;
}

function attachMessageHandler(sock) {
  if (!sock?.ev?.on) throw new TypeError('A valid Baileys socket is required.');

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

      if (command === 'promote' || command === 'demote') {
        work.push((async () => {
          try {
            if (!jid.endsWith('@g.us')) {
              await sock.sendMessage(jid, { text: `⚠️ .${command} can only be used inside a group chat.` }, { quoted: message });
              return;
            }

            const participant = getQuotedParticipant(message) || participantFromQuery(query);
            if (!participant) {
              await sock.sendMessage(jid, {
                text: `⚠️ Reply to someone's message or use .${command} <phone number>.`,
              }, { quoted: message });
              return;
            }

            if (command === 'promote') {
              await sock.groupParticipantsUpdate(jid, [participant], 'promote');
            } else {
              await sock.groupParticipantsUpdate(jid, [participant], 'demote');
            }

            await sock.sendMessage(jid, {
              text: command === 'promote'
                ? `✅ ${formatNumber(participant)} is now a group admin.`
                : `✅ ${formatNumber(participant)} is no longer a group admin.`,
            }, { quoted: message });
          } catch (error) {
            console.error(`${command} command failed:`, error.message);
            await sock.sendMessage(jid, { text: `⚠️ Could not ${command} that member. Make sure the bot is a group admin and try again.` }, { quoted: message });
          }
        })());
        continue;
      }

      if (command === 'groupinfo' || command === 'members') {
        work.push((async () => {
          try {
            if (!jid.endsWith('@g.us')) {
              await sock.sendMessage(jid, { text: `⚠️ .${command} can only be used inside a group chat.` }, { quoted: message });
              return;
            }
            const metadata = await sock.groupMetadata(jid);
            const response = command === 'groupinfo'
              ? formatGroupInfo(metadata)
              : formatGroupMembers(metadata);
            await sock.sendMessage(jid, { text: response }, { quoted: message });
          } catch (error) {
            console.error(`${command} command failed:`, error.message);
            await sock.sendMessage(jid, { text: `⚠️ Could not retrieve ${command === 'members' ? 'group members' : 'group information'}. Please try again later.` }, { quoted: message });
          }
        })());
        continue;
      }

      if (command === 'image') {
        work.push((async () => {
          try {
            const imageUrl = generateImageUrl(query);
            await sock.sendMessage(jid, {
              image: { url: imageUrl },
              caption: `🎨 Generated image for: ${query}`,
            }, { quoted: message });
          } catch (error) {
            await sock.sendMessage(jid, {
              text: `⚠️ ${error.message || 'Image generation failed. Please try again later.'}`,
            }, { quoted: message });
          }
        })());
        continue;
      }

      if (command === 'apk' || command === 'csong') {
        work.push((async () => {
          try {
            const result = await downloads.run(command, query, { sock, jid, message });
            await sock.sendMessage(jid, { text: result.text }, { quoted: message });
            if (command === 'csong' && result.audioUrl) {
              try {
                await sock.sendMessage(jid, { audio: { url: result.audioUrl }, mimetype: 'audio/mp4', ptt: false }, { quoted: message });
              } catch (error) {
                console.error('Could not send song preview:', error.message);
              }
            }
          } catch (error) {
            console.error(`${command} command failed:`, error.message);
            await sock.sendMessage(jid, { text: `⚠️ ${command} search failed. Please try again later.` }, { quoted: message });
          }
        })());
        continue;
      }

      if (['play', 'ytmp3', 'video', 'ytmp4'].includes(command)) {
        work.push((async () => {
          await sock.sendMessage(jid, { text: '⏳ Fetching YouTube media. Please wait…' }, { quoted: message });
          try {
            await downloadYouTube(command, query, sock, jid, message);
          } catch (error) {
            console.error(`${command} command failed:`, error.message);
            await sock.sendMessage(jid, { text: `⚠️ ${error.message || 'YouTube download failed. Please try again later.'}` }, { quoted: message });
          }
        })());
        continue;
      }

      if (prefix !== DEFAULT_PREFIX) setMessageText(message, `${DEFAULT_PREFIX}${withoutPrefix}`);
      remaining.push(message);
    }

    messages.splice(0, messages.length, ...remaining);
    Promise.allSettled(work).then(results => {
      for (const result of results) if (result.status === 'rejected') console.error('Prefix/group/media reply failed:', result.reason?.message || result.reason);
    });
  });

  return runtime.attachMessageHandler(sock);
}

module.exports = { attachMessageHandler };
