'use strict';

const { getText } = require('./command-runtime');

const PREFIX = '.';
const JIKAN_API = 'https://api.jikan.moe/v4/anime';
const SYNOPSIS_LIMIT = 400;

function animeSynopsis(anime) {
  const synopsis = String(anime.synopsis || 'No story description available.').trim();
  if (synopsis.length <= SYNOPSIS_LIMIT) return synopsis;
  return `${synopsis.slice(0, SYNOPSIS_LIMIT).trimEnd()}…`;
}

function animeCaption(anime) {
  const genres = Array.isArray(anime.genres) && anime.genres.length
    ? anime.genres.map(genre => genre.name).join(', ')
    : 'N/A';
  const year = anime.year || anime.aired?.prop?.from?.year || 'N/A';
  const status = anime.status || 'N/A';

  return `🎬 *${anime.title || 'Untitled anime'}*\n\n`
    + `⭐ Score: ${anime.score ?? 'N/A'}\n`
    + `📺 Episodes: ${anime.episodes ?? 'N/A'}\n`
    + `📅 Year: ${year} | Status: ${status}\n`
    + `🎭 Genres: ${genres}\n\n`
    + `📖 *Story / Description:*\n${animeSynopsis(anime)}\n\n`
    + `🔗 ${anime.url || 'No listing URL available.'}`;
}

async function searchAnime(sock, jid, message, query) {
  await sock.sendMessage(jid, { text: `🔍 Searching anime: *${query}*…` }, { quoted: message });

  try {
    const response = await fetch(`${JIKAN_API}?q=${encodeURIComponent(query)}&limit=1`);
    if (!response.ok) {
      throw new Error(response.status === 429
        ? 'The anime search service is busy. Please try again in a moment.'
        : `The anime search service returned HTTP ${response.status}. Please try again later.`);
    }

    const result = await response.json();
    const anime = result.data?.[0];
    if (!anime) {
      await sock.sendMessage(jid, { text: `No anime found for “${query}”. Check the title and try again.` }, { quoted: message });
      return;
    }

    const caption = animeCaption(anime);
    const imageUrl = anime.images?.jpg?.image_url;
    if (imageUrl) {
      await sock.sendMessage(jid, { image: { url: imageUrl }, caption }, { quoted: message });
    } else {
      await sock.sendMessage(jid, { text: caption }, { quoted: message });
    }
  } catch (error) {
    console.error('Anime search failed:', error.message);
    await sock.sendMessage(jid, {
      text: `⚠️ ${error.message || 'Anime search failed. Please try again later.'}`,
    }, { quoted: message });
  }
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

      const text = getText(message).trim();
      if (!text.startsWith(PREFIX)) {
        remaining.push(message);
        continue;
      }

      const [rawCommand = '', ...args] = text.slice(PREFIX.length).trim().split(/\s+/);
      if (rawCommand.toLowerCase() !== 'anime') {
        remaining.push(message);
        continue;
      }

      const query = args.join(' ').trim();
      if (!query) {
        work.push(sock.sendMessage(jid, {
          text: 'Usage: *.anime <name>*\nExamples: *.anime Naruto*, *.anime One Piece*, *.anime Demon Slayer*, *.anime Attack on Titan*, *.anime Jujutsu Kaisen*, *.anime Solo Leveling*.',
        }, { quoted: message }));
        continue;
      }

      work.push(searchAnime(sock, jid, message, query));
    }

    messages.splice(0, messages.length, ...remaining);
    Promise.allSettled(work).then(results => {
      for (const result of results) {
        if (result.status === 'rejected') console.error('Anime command handler failed:', result.reason?.message || result.reason);
      }
    });
  });

  return sock;
}

module.exports = { attachMessageHandler, animeCaption, animeSynopsis };
