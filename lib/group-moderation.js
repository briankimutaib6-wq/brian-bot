'use strict';

const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const PREFIX = '.';
const BOT_MODE = { value: 'public' };
const ANTIDELETE = { enabled: false };
const GROUP_POLICIES = new Map();
const RECENT_MESSAGES = new Map();
const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;

function unwrap(message) {
  let content = message || {};
  for (let depth = 0; depth < 8; depth += 1) {
    const wrapper = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension', 'documentWithCaptionMessage', 'editedMessage'].find(key => content[key]?.message);
    if (!wrapper) break;
    content = content[wrapper].message;
  }
  return content;
}

function textOf(message) {
  const content = unwrap(message?.message);
  return content.conversation
    || content.extendedTextMessage?.text
    || content.imageMessage?.caption
    || content.videoMessage?.caption
    || content.documentMessage?.caption
    || content.buttonsResponseMessage?.selectedButtonId
    || content.listResponseMessage?.singleSelectReply?.selectedRowId
    || '';
}

function normalize(jid = '') {
  return String(jid).split('@')[0].replace(/[^0-9]/g, '');
}

function sameUser(left, right) {
  return Boolean(left && right && (left === right || (normalize(left) && normalize(left) === normalize(right))));
}

function selfJid(sock) {
  return sock.user?.id || sock.user?.lid || '';
}

function isOwner(sock, sender) {
  return sameUser(sender, selfJid(sock))
    || Boolean(process.env.OWNER_JID && normalize(sender) === normalize(process.env.OWNER_JID));
}

function quotedContext(message) {
  const content = unwrap(message?.message);
  return content.extendedTextMessage?.contextInfo
    || content.imageMessage?.contextInfo
    || content.videoMessage?.contextInfo
    || content.documentMessage?.contextInfo
    || content.stickerMessage?.contextInfo
    || {};
}

function quotedParticipant(message) {
  const context = quotedContext(message);
  return context.participant || context.mentionedJid?.[0] || null;
}

function quotedText(message) {
  return textOf({ message: quotedContext(message).quotedMessage });
}

function digitsJid(input) {
  const raw = String(input || '').trim();
  const digits = raw.replace(/[^0-9]/g, '');
  return /^\d{7,15}$/.test(digits) ? `${digits}@s.whatsapp.net` : null;
}

function groupPolicy(jid) {
  if (!GROUP_POLICIES.has(jid)) GROUP_POLICIES.set(jid, { links: false, media: false, stickers: false });
  return GROUP_POLICIES.get(jid);
}

function participantIsAdmin(metadata, jid) {
  return metadata.participants?.some(participant => sameUser(participant.id, jid)
    && (participant.admin === 'admin' || participant.admin === 'superadmin')) || false;
}

async function sendText(sock, jid, message, text) {
  await sock.sendMessage(jid, { text }, { quoted: message });
}

async function requireGroupAdmin(sock, jid, sender, message) {
  if (!jid.endsWith('@g.us')) {
    await sendText(sock, jid, message, '⚠️ This command can only be used in a group chat.');
    return null;
  }
  const metadata = await sock.groupMetadata(jid);
  if (!participantIsAdmin(metadata, sender)) {
    await sendText(sock, jid, message, '⛔ Only group admins can use this command.');
    return null;
  }
  if (!participantIsAdmin(metadata, selfJid(sock))) {
    await sendText(sock, jid, message, '⚠️ Make the bot a group admin first so it can perform this action.');
    return null;
  }
  return metadata;
}

async function handleCommand(sock, jid, message, sender, command, args) {
  const words = args.trim().split(/\s+/).filter(Boolean);
  const lowerArgs = args.trim().toLowerCase();

  if (command === 'mode') {
    if (!isOwner(sock, sender)) {
      await sendText(sock, jid, message, '⛔ Only the linked bot account/owner can change the bot mode.');
      return true;
    }
    if (!['public', 'private'].includes(lowerArgs)) {
      await sendText(sock, jid, message, 'Usage: *.mode public* or *.mode private*');
      return true;
    }
    BOT_MODE.value = lowerArgs;
    await sendText(sock, jid, message, `✅ Bot mode is now *${lowerArgs}*.`);
    return true;
  }

  if (command === 'antidelete') {
    if (!isOwner(sock, sender)) {
      await sendText(sock, jid, message, '⛔ Only the linked bot account/owner can change antidelete.');
      return true;
    }
    if (!['on', 'off'].includes(lowerArgs)) {
      await sendText(sock, jid, message, 'Usage: *.antidelete on* or *.antidelete off*');
      return true;
    }
    ANTIDELETE.enabled = lowerArgs === 'on';
    await sendText(sock, jid, message, `✅ Antidelete is *${lowerArgs}*.`);
    return true;
  }

  if (['lock', 'unlock'].includes(command)) {
    const kind = lowerArgs.replace(/s$/, '');
    if (!['link', 'media', 'sticker'].includes(kind)) {
      await sendText(sock, jid, message, 'Usage: *.lock links*, *.lock media*, *.lock sticker* (or *.unlock* to allow them).');
      return true;
    }
    const metadata = await requireGroupAdmin(sock, jid, sender, message);
    if (!metadata) return true;
    const policy = groupPolicy(jid);
    const key = kind === 'link' ? 'links' : kind === 'sticker' ? 'stickers' : 'media';
    policy[key] = command === 'lock';
    const labels = { links: 'links', media: 'photos and videos', stickers: 'stickers' };
    await sendText(sock, jid, message, `✅ ${labels[key]} are now ${policy[key] ? 'blocked' : 'allowed'} in this group.`);
    return true;
  }

  if (command === 'kick' || command === 'add' || command === 'invite' || command === 'mute' || command === 'unmute') {
    const metadata = await requireGroupAdmin(sock, jid, sender, message);
    if (!metadata) return true;

    if (command === 'mute' || command === 'unmute') {
      await sock.groupSettingUpdate(jid, command === 'mute' ? 'announcement' : 'not_announcement');
      await sendText(sock, jid, message, command === 'mute'
        ? '🔒 Group muted: only admins can send messages.'
        : '🔓 Group unmuted: all members can send messages.');
      return true;
    }

    if (command === 'kick' || command === 'add') {
      const target = command === 'kick' ? quotedParticipant(message) : digitsJid(words[0]);
      if (!target) {
        await sendText(sock, jid, message, command === 'kick'
          ? 'Reply to the member’s message with *.kick*.'
          : 'Usage: *.add 2547…* (include the country code).');
        return true;
      }
      if (command === 'add' && metadata.participants?.some(item => sameUser(item.id, target))) {
        await sendText(sock, jid, message, 'ℹ️ That number is already in the group.');
        return true;
      }
      const action = command === 'kick' ? 'remove' : 'add';
      const results = await sock.groupParticipantsUpdate(jid, [target], action);
      const result = results?.[0];
      const succeeded = result?.status === '200' || result?.status === 200 || result?.status === 'ok' || !result?.status;
      await sendText(sock, jid, message, succeeded
        ? command === 'kick' ? `✅ Removed ${normalize(target)} from the group.` : `✅ Added ${normalize(target)} to the group.`
        : `⚠️ Could not ${command} that number (WhatsApp status: ${result.status}).`);
      return true;
    }

    const target = quotedParticipant(message) || digitsJid(words[0]);
    if (!target) {
      await sendText(sock, jid, message, 'Reply to a member or use *.invite 2547…* to send them a group invite link.');
      return true;
    }
    const code = await sock.groupInviteCode(jid);
    const link = `https://chat.whatsapp.com/${code}`;
    await sock.sendMessage(target, { text: `You’re invited to join *${metadata.subject || 'the group'}*:\n${link}` });
    await sendText(sock, jid, message, `✅ Group invite sent to ${normalize(target)}.`);
    return true;
  }

  if (command === 'join') {
    const source = `${args} ${quotedText(message)}`;
    const match = source.match(/(?:https?:\/\/)?chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/i);
    if (!match) {
      await sendText(sock, jid, message, 'Reply to a WhatsApp group invite link or use *.join <invite link>*.');
      return true;
    }
    const result = await sock.groupAcceptInvite(match[1]);
    await sendText(sock, jid, message, result
      ? `✅ Joined the group (${result}).`
      : '⚠️ Could not join. The link may be invalid, expired, or the bot may already be a member.');
    return true;
  }

  return false;
}

function messageKey(jid, id) { return `${jid}:${id}`; }

function cacheMessage(message) {
  const jid = message.key?.remoteJid;
  const id = message.key?.id;
  if (!jid || !id || jid === 'status@broadcast') return;
  RECENT_MESSAGES.set(messageKey(jid, id), message);
  const cutoff = Date.now() - MESSAGE_TTL_MS;
  for (const [key, value] of RECENT_MESSAGES) {
    if ((value.messageTimestamp || 0) * 1000 < cutoff) RECENT_MESSAGES.delete(key);
  }
}

async function deliverDeleted(sock, revoke) {
  if (!ANTIDELETE.enabled) return;
  const jid = revoke.key?.remoteJid;
  const originalKey = revoke.message?.protocolMessage?.key;
  if (!jid || !originalKey?.id) return;
  const original = RECENT_MESSAGES.get(messageKey(originalKey.remoteJid || jid, originalKey.id));
  RECENT_MESSAGES.delete(messageKey(originalKey.remoteJid || jid, originalKey.id));
  if (!original) return;

  const author = original.key?.participant || original.key?.remoteJid;
  const recipient = BOT_MODE.value === 'public' ? author : selfJid(sock);
  if (!recipient) return;
  const originalText = textOf(original);
  const content = unwrap(original.message);
  const mediaType = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].find(type => content[type]);
  try {
    if (mediaType) {
      const buffer = await downloadMediaMessage(original, 'buffer', {}, {
        logger: sock.logger,
        reuploadRequest: sock.updateMediaMessage,
      });
      const payload = { [mediaType.replace('Message', '')]: buffer };
      if (originalText && mediaType !== 'stickerMessage' && mediaType !== 'audioMessage') payload.caption = originalText;
      if (mediaType === 'audioMessage') payload.mimetype = content.audioMessage.mimetype || 'audio/ogg';
      if (mediaType === 'documentMessage') {
        payload.mimetype = content.documentMessage.mimetype;
        payload.fileName = content.documentMessage.fileName || 'deleted-file';
        if (originalText) payload.caption = originalText;
      }
      await sock.sendMessage(recipient, payload);
    } else if (originalText) {
      await sock.sendMessage(recipient, { text: `🗑️ Deleted message from ${normalize(author) || 'unknown'}:\n${originalText}` });
    }
  } catch (error) {
    console.error('Antidelete recovery failed:', error.message);
    if (originalText) await sock.sendMessage(recipient, { text: `🗑️ A message was deleted, but its media could not be recovered.\n${originalText}` }).catch(() => {});
  }
}

function isAdminMessage(metadata, sender) {
  return participantIsAdmin(metadata, sender);
}

function attachMessageHandler(sock) {
  if (!sock?.ev?.on) throw new TypeError('A valid Baileys socket is required.');

  sock.ev.on('messages.upsert', ({ messages = [], type } = {}) => {
    if (type !== 'notify' && type !== 'append') return;
    const remaining = [];
    const work = [];

    for (const message of messages) {
      const jid = message.key?.remoteJid;
      if (!jid) { remaining.push(message); continue; }
      const content = unwrap(message.message);
      if (content.protocolMessage?.type === 0 || content.protocolMessage?.type === 'REVOKE') {
        work.push(deliverDeleted(sock, message));
        continue;
      }
      cacheMessage(message);

      const text = textOf(message).trim();
      const sender = message.key.participant || (message.key.fromMe ? selfJid(sock) : jid);
      if (text.startsWith(PREFIX)) {
        const [rawCommand = '', ...args] = text.slice(PREFIX.length).trim().split(/\s+/);
        const command = rawCommand.toLowerCase();
        if (command && (['kick', 'add', 'invite', 'join', 'mute', 'unmute', 'lock', 'unlock', 'antidelete', 'mode'].includes(command))) {
          work.push((async () => {
            try {
              if (BOT_MODE.value === 'private' && !isOwner(sock, sender) && command !== 'mode') {
                await sendText(sock, jid, message, '🔒 This bot is in private mode. Only its linked account can use commands.');
                return;
              }
              await handleCommand(sock, jid, message, sender, command, args.join(' '));
            } catch (error) {
              console.error(`${command} command failed:`, error.message);
              await sendText(sock, jid, message, `⚠️ Could not complete .${command}. Check the link/number and make sure the bot has the required group admin permissions.`).catch(() => {});
            }
          })());
          continue;
        }
        if (BOT_MODE.value === 'private' && !isOwner(sock, sender)) {
          work.push(sendText(sock, jid, message, '🔒 This bot is in private mode. Only its linked account can use commands.'));
          continue;
        }
      }

      if (jid.endsWith('@g.us')) {
        const policy = groupPolicy(jid);
        const senderIsAdmin = sock.groupMetadata
          ? Promise.resolve(sock.groupMetadata(jid)).then(metadata => isAdminMessage(metadata, sender)).catch(() => false)
          : Promise.resolve(false);
        work.push(senderIsAdmin.then(async isAdmin => {
          if (isAdmin) return;
          const groupLink = policy.links && /(?:https?:\/\/)?(?:chat\.whatsapp\.com\/|https?:\/\/\S+)/i.test(text);
          const contentType = Object.keys(content).find(key => key.endsWith('Message')) || '';
          const blockedMedia = policy.media && ['imageMessage', 'videoMessage'].includes(contentType);
          const blockedSticker = policy.stickers && contentType === 'stickerMessage';
          if (groupLink || blockedMedia || blockedSticker) {
            try { await sock.sendMessage(jid, { delete: message.key }); }
            catch (error) { console.error('Could not delete blocked group message:', error.message); }
          }
        }));
      }
      remaining.push(message);
    }

    messages.splice(0, messages.length, ...remaining);
    Promise.allSettled(work).then(results => {
      for (const result of results) if (result.status === 'rejected') console.error('Group moderation handler failed:', result.reason?.message || result.reason);
    });
  });
  return sock;
}

module.exports = { attachMessageHandler };
