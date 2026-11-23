'use strict';

async function getJson(url) {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Request failed with HTTP ${response.status}`);
  return response.json();
}

async function fetchApk(appName) {
  try {
    const url = `https://api.davidcyriltech.my.id/apk?app=${encodeURIComponent(appName)}`;
    const data = await getJson(url);
    return data?.result || null;
  } catch (error) {
    console.error('APK API failed:', error.message);
    return null;
  }
}

async function fetchCsong(songName) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(songName)}&media=music&limit=5`;
    const data = await getJson(url);
    return Array.isArray(data?.results) ? data.results : [];
  } catch (error) {
    console.error('CSong API failed:', error.message);
    return [];
  }
}

function field(value, fallback) {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function isApplePreview(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'audio-ssl.itunes.apple.com';
  } catch {
    return false;
  }
}

async function run(command, query, { sock, jid, message } = {}) {
  const quoted = message ? { quoted: message } : undefined;
  if (!query) {
    return { text: command === 'apk'
      ? 'Usage: .apk <app name> (for example: .apk WhatsApp)'
      : 'Usage: .csong <song or artist> (for example: .csong The Weeknd Blinding Lights)' };
  }

  const searching = command === 'apk'
    ? `*┌───⭓ ᴀᴘᴋ ⭓───*\n*│* 🔍 Searching for *${query}*...\n*│* ⏳ Please wait...\n*└───────────────────⭓*`
    : `*┌───⭓ ᴄsᴏɴɢ ⭓───*\n*│* 🎵 Searching for *${query}*...\n*│* ⏳ Please wait...\n*└───────────────────⭓*`;
  if (sock && jid) await sock.sendMessage(jid, { text: searching }, quoted);

  if (command === 'apk') {
    const apk = await fetchApk(query);
    if (!apk) {
      return { text: `*┌───⭓ ᴀᴘᴋ ⭓───*\n*│* ❌ Could not find *${query}*\n*│* Try: .apk whatsapp\n*│* Or check spelling.\n*└───────────────────⭓*` };
    }
    const result = typeof apk === 'string' ? { download: apk } : apk;
    const appName = field(result.name, query);
    const developer = field(result.developer, 'Unknown');
    const rating = field(result.rating, 'N/A');
    const size = field(result.size, 'Unknown');
    const link = field(result.download || result.url, 'Check Play Store');
    return { text: `*┌───⭓ ᴀᴘᴋ ᴅᴏᴡɴʟᴏᴀᴅ ⭓───*\n*│* 📱 *ᴀᴘᴘ:* ${appName}\n*│* 👨‍💻 *ᴅᴇᴠ:* ${developer}\n*│* ⭐ *ʀᴀᴛɪɴɢ:* ${rating}\n*│* 📦 *sɪᴢᴇ:* ${size}\n*│* 🔗 *ʟɪɴᴋ:* ${link}\n*│*\n*│* 📥 Click link to download APK\n*└───────────────────⭓*` };
  }

  if (command === 'csong') {
    const results = await fetchCsong(query);
    if (!results.length) {
      return { text: `*┌───⭓ ᴄsᴏɴɢ ⭓───*\n*│* ❌ No song found for *${query}*\n*│* Try: .csong amazing grace\n*└───────────────────⭓*` };
    }

    let text = '*┌───⭓ ᴄsᴏɴɢ ʀᴇsᴜʟᴛs ⭓───*\n';
    results.slice(0, 3).forEach((song, index) => {
      text += `*│* ${index + 1}. 🎵 *${field(song.trackName, 'Unknown track')}*\n`;
      text += `*│*    👨‍🎤 ${field(song.artistName, 'Unknown artist')}\n`;
      text += `*│*    💿 ${field(song.collectionName, 'Single')}\n`;
      if (song.trackViewUrl) text += `*│*    🔗 ${song.trackViewUrl}\n`;
      text += '*│*\n';
    });
    text += '*│* 🎧 Tap a link to listen / download\n*└───────────────────⭓*';
    const previewUrl = results[0]?.previewUrl;
    return { text, audioUrl: isApplePreview(previewUrl) ? previewUrl : null };
  }

  return { text: `Unknown download command: ${command}` };
}

module.exports = { fetchApk, fetchCsong, run };
