'use strict';

async function run(command, query, { sock, jid, message } = {}) {
  const quoted = message ? { quoted: message } : undefined;

  if (command === 'tv') {
    if (!query) {
      return { text: '📺 *TV Series*\nWhat series name would you like to watch or search for?\n\nExample: .tv Stranger Things' };
    }
    return { text: `📺 *TV Series*\nSearch title: *${query}*\n\nTV and episode lookup is not configured yet.` };
  }

  if (command === 'movie') {
    if (!query) {
      return { text: '🎬 *Movie*\nWhat is the title of the movie?\n\nExample: .movie The Lion King' };
    }
    return { text: `🎬 *Movie*\nMovie title: *${query}*\n\nMovie lookup is not configured yet.` };
  }

  return { text: `Unknown request command: ${command}` };
}

module.exports = { run };
