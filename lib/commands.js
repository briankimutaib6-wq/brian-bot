'use strict';

// Command catalog shared by the dashboard and the message runtime.
const commandGroups = {
  owner: ['setreply', 'autoreply', 'listreply', 'delreply', 'setwelcome', 'listwelcome', 'delwelcome', 'setvoice', 'listvoice', 'delvoice', 'addsudo', 'delsudo', 'listsudo', 'save', 'anime', 'csong', 'movie', 'tv', 'forward', 'savesongs', 'autocsong', 'removesong', 'getdp', 'leave', 'join', 'jid', 'setpp', 'fullpp', 'set', 'gstatus', 'gjid', 'active', 'apply', 'profile', 'menutype', 'setting', 'game', 'schedule', 'schedules', 'unschedule', 'mytime'],
  main: ['menu', 'ping', 'time', 'date', 'uptime', 'about', 'verse', 'sabbath', 'calc', 'reverse', 'base64', 'ai', 'ask', 'mediainfo', 'save', 'status'],
  downloads: ['csong', 'savesongs', 'movie', 'tv', 'anime', 'play', 'video', 'ytmp3', 'ytmp4', 'tiktok', 'apk', 'pdf', 'image'],
  group: ['groupinfo', 'members', 'tagall', 'promote', 'demote', 'kick'],
  vpn: ['free', 'price', 'pay', 'status', 'server', 'setup', 'buy'],
  book: ['english', 'kiswahili', 'kalenjin', 'verse', 'sabbath', 'book']
};

const metadata = {
  owner: { title: 'Owner Panel', icon: '👑', prefix: 'owner', response: 'Owner command received.' },
  main: { title: 'Main Panel', icon: '🛠️', prefix: 'main', response: 'Main command received.' },
  downloads: { title: 'Downloads', icon: '📥', prefix: 'download', response: 'Download request received.' },
  group: { title: 'Group Tools', icon: '👥', prefix: 'group', response: 'Group command received.' },
  vpn: { title: 'VPN Panel', icon: '🔥', prefix: 'vpn', response: 'VPN command received. Use only authorized VPN services.' },
  book: { title: 'Book Panel', icon: '📖', prefix: 'book', response: 'Book command received.' }
};

const categories = Object.entries(commandGroups).map(([key, commands]) => ({
  key,
  ...metadata[key],
  commands,
  count: commands.length,
  responses: [metadata[key].response]
}));

const lookup = new Map();
for (const category of categories) {
  category.commands.forEach((command, index) => {
    lookup.set(command, category);
    lookup.set(`${category.prefix}${String(index + 1).padStart(3, '0')}`, category);
  });
}

function getResponse(command) {
  const category = lookup.get(String(command).toLowerCase());
  if (!category) return null;
  return `${category.icon} ${category.responses[0]}`;
}

function getCommand(categoryKey, number) {
  const category = categories.find(item => item.key === categoryKey);
  const index = Number(number) - 1;
  return category && Number.isInteger(index) ? category.commands[index] || null : null;
}

function list(categoryKey, page = 1, pageSize = 20) {
  const category = categories.find(item => item.key === categoryKey);
  if (!category) return { page: 1, pages: 1, names: [], commands: [] };
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 20;
  const pages = Math.max(1, Math.ceil(category.count / size));
  const safePage = Number.isFinite(page) ? Math.min(Math.max(1, Math.trunc(page)), pages) : 1;
  const start = (safePage - 1) * size;
  const commands = category.commands.slice(start, start + size);
  return {
    page: safePage,
    pages,
    names: commands.map((_, index) => `${category.prefix}${String(start + index + 1).padStart(3, '0')}`),
    commands
  };
}

module.exports = {
  categories,
  commandGroups,
  count: lookup.size,
  getResponse,
  getCommand,
  list
};
