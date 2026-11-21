'use strict';

// Six interactive panels. Every panel contains at least 40 commands.
const categories = [
  {
    key: 'owner', title: 'Owner Panel', icon: '👑', prefix: 'owner', count: 40,
    responses: [
      'Owner Panel command is available.',
      'Owner access is protected.',
      'Use .status to inspect bot status.'
    ],
    commands: ['status', 'owners', 'broadcast', 'restart', 'shutdown', 'uptime', 'ping', 'health', 'logs', 'settings', 'config', 'backup', 'restore', 'database', 'cache', 'clearcache', 'maintenance', 'mode', 'version', 'stats', 'metrics', 'security', 'lock', 'unlock', 'ban', 'unban', 'suspend', 'unsuspend', 'announce', 'ownerinfo', 'sessions', 'auth', 'pair', 'update', 'deploy', 'diagnostics', 'test', 'debug', 'ownerhelp', 'panel']
  },
  {
    key: 'main', title: 'Main Panel', icon: '🛠️', prefix: 'main', count: 40,
    responses: ['Main Panel command executed successfully.'],
    commands: ['menu', 'help', 'hi', 'hello', 'ping', 'time', 'date', 'uptime', 'about', 'jid', 'calc', 'reverse', 'base64', 'ai', 'ask', 'profile', 'userinfo', 'info', 'id', 'rules', 'privacy', 'terms', 'support', 'feedback', 'report', 'translate', 'weather', 'currency', 'news', 'qrcode', 'password', 'random', 'uuid', 'shorturl', 'language', 'timezone', 'prefix', 'command', 'start', 'credits']
  },
  {
    key: 'downloads', title: 'Downloads', icon: '📥', prefix: 'download', count: 40,
    responses: ['Download request received. Reply to supported media or provide a valid link when the command requires it.'],
    commands: ['save', 'mediainfo', 'image', 'video', 'audio', 'document', 'sticker', 'youtube', 'ytmp3', 'ytmp4', 'facebook', 'instagram', 'tiktok', 'twitter', 'pinterest', 'spotify', 'soundcloud', 'mp3', 'mp4', 'gif', 'wallpaper', 'thumbnail', 'story', 'reels', 'post', 'avatar', 'mediafire', 'google', 'drive', 'dropbox', 'telegram', 'reddit', 'twitch', 'github', 'apk', 'ebook', 'pdf', 'zip', 'file', 'downloadhelp']
  },
  {
    key: 'group', title: 'Group Tools', icon: '👥', prefix: 'group', count: 40,
    responses: ['Group tool command executed.'],
    commands: ['groupinfo', 'members', 'tagall', 'promote', 'demote', 'kick', 'invite', 'link', 'revoke', 'leave', 'add', 'remove', 'mute', 'unmute', 'lock', 'unlock', 'announce', 'groupname', 'grouppic', 'description', 'rules', 'welcome', 'goodbye', 'antilink', 'antispam', 'antiflood', 'spamwatch', 'warn', 'warnings', 'unwarn', 'poll', 'vote', 'event', 'schedule', 'mention', 'hidetag', 'admins', 'ownerinfo', 'membercount', 'grouphelp']
  },
  {
    key: 'vpn', title: 'VPN Panel', icon: '🔥', prefix: 'vpn', count: 40,
    responses: ['VPN Panel command acknowledged. This bot does not create or bypass network restrictions unless you supply your own authorized VPN service integration.'],
    commands: ['vpninfo', 'status', 'servers', 'connect', 'disconnect', 'current', 'location', 'ping', 'speed', 'latency', 'protocol', 'wireguard', 'openvpn', 'ikev2', 'config', 'profile', 'addconfig', 'removeconfig', 'renew', 'subscription', 'plan', 'account', 'dns', 'ip', 'test', 'kill-switch', 'autoconnect', 'split-tunnel', 'logs', 'secure', 'insecure', 'country', 'city', 'region', 'recommend', 'favorites', 'history', 'support', 'setup', 'vpnhelp']
  },
  {
    key: 'book', title: 'Book Panel', icon: '📖', prefix: 'book', count: 40,
    responses: ['Book Panel command is ready.'],
    commands: ['booksearch', 'author', 'title', 'isbn', 'genre', 'category', 'recommend', 'reading', 'read', 'library', 'wishlist', 'bookmark', 'chapter', 'page', 'summary', 'synopsis', 'quote', 'reviews', 'rating', 'publisher', 'year', 'series', 'fiction', 'nonfiction', 'novel', 'poetry', 'comics', 'manga', 'textbook', 'children', 'history', 'science', 'biography', 'selfhelp', 'download', 'ebook', 'pdf', 'audiobook', 'random', 'bookhelp']
  }
];

const lookup = new Map();
for (const category of categories) {
  for (let index = 1; index <= category.count; index++) {
    lookup.set(`${category.prefix}${String(index).padStart(3, '0')}`, category);
  }
}

function getResponse(command) {
  const category = lookup.get(command);
  if (!category) return null;
  const choice = category.responses[Math.floor(Math.random() * category.responses.length)];
  return `${category.icon} ${choice}`;
}

function getCommand(categoryKey, number) {
  const category = categories.find(item => item.key === categoryKey);
  if (!category) return null;
  return category.commands[number - 1] || null;
}

function list(categoryKey, page = 1, pageSize = 20) {
  const category = categories.find(item => item.key === categoryKey);
  if (!category) return { page: 1, pages: 1, names: [], commands: [] };
  const pages = Math.ceil(category.count / pageSize);
  const safePage = Number.isFinite(page) ? Math.min(Math.max(1, page), pages) : 1;
  const start = (safePage - 1) * pageSize;
  const names = [];
  const commands = [];
  for (let offset = 0; offset < Math.min(pageSize, category.count - start); offset++) {
    const number = start + offset + 1;
    names.push(`${category.prefix}${String(number).padStart(3, '0')}`);
    commands.push(category.commands[number - 1]);
  }
  return { page: safePage, pages, names, commands };
}

module.exports = { categories, count: lookup.size, getResponse, getCommand, list };
