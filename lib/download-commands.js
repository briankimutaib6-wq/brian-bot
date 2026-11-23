'use strict';

async function getJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
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

function formatApk(result) {
  if (typeof result === 'string') return result.slice(0, 3500);
  const lines = Object.entries(result).map(([key, value]) => {
    const printable = typeof value === 'string' ? value : JSON.stringify(value);
    return `*${key}:* ${printable}`;
  });
  return lines.join('\n').slice(0, 3500);
}

function formatCsong(results) {
  return results.map((track, index) => {
    const parts = [
      `*${index + 1}. ${track.trackName || 'Unknown track'}*`,
      track.artistName && `Artist: ${track.artistName}`,
      track.collectionName && `Album: ${track.collectionName}`,
      track.trackViewUrl && `Listen: ${track.trackViewUrl}`,
      track.previewUrl && `Preview: ${track.previewUrl}`,
    ].filter(Boolean);
    return parts.join('\n');
  }).join('\n\n').slice(0, 3500);
}

async function run(command, query) {
  if (command === 'apk') {
    if (!query) return 'Usage: .apk <app name> (for example: .apk WhatsApp)';
    const result = await fetchApk(query);
    return result ? `📦 *APK search result for ${query}:*\n${formatApk(result)}` : `No APK result found for "${query}". Please try another app name.`;
  }
  if (command === 'csong') {
    if (!query) return 'Usage: .csong <song or artist> (for example: .csong The Weeknd Blinding Lights)';
    const results = await fetchCsong(query);
    return results.length ? `🎵 *Song search results for ${query}:*\n\n${formatCsong(results)}` : `No songs found for "${query}". Please try another search.`;
  }
  return null;
}

module.exports = { fetchApk, fetchCsong, run };
