'use strict';

const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');

ffmpeg.setFfmpegPath(ffmpegPath);

const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const MAX_DURATION_SECONDS = 20 * 60;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be']);

function validateYouTubeUrl(input) {
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error('Send a YouTube video URL. Example: .play https://youtu.be/VIDEO_ID');
  }
  if (parsed.protocol !== 'https:' || !YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase()) || !ytdl.validateURL(input)) {
    throw new Error('Please provide a valid HTTPS YouTube video URL.');
  }
  return input;
}

function safeTitle(title) {
  return String(title || 'youtube-media').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 100);
}

function tempFile(extension) {
  return path.join(os.tmpdir(), `brian-bot-${randomUUID()}.${extension}`);
}

async function downloadBounded(source, filePath) {
  let bytes = 0;
  const limiter = new Transform({
    transform(chunk, encoding, callback) {
      bytes += chunk.length;
      if (bytes > MAX_MEDIA_BYTES) {
        callback(new Error('Media is too large to send through WhatsApp (50 MB limit).'));
        return;
      }
      callback(null, chunk);
    },
  });
  await pipeline(source, limiter, fs.createWriteStream(filePath, { flags: 'wx' }));
}

function convertToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate(128)
      .format('mp3')
      .on('error', reject)
      .on('end', resolve)
      .save(outputPath);
  });
}

async function downloadYouTube(command, input, sock, jid, message) {
  const url = validateYouTubeUrl(input);
  const audioOnly = command === 'play' || command === 'ytmp3';
  const sourcePath = tempFile('media');
  const outputPath = audioOnly ? tempFile('mp3') : tempFile('mp4');
  const quoted = { quoted: message };

  try {
    const info = await ytdl.getInfo(url);
    const duration = Number(info.videoDetails?.lengthSeconds || 0);
    if (!duration) throw new Error('Could not read the video duration.');
    if (duration > MAX_DURATION_SECONDS) throw new Error('Videos longer than 20 minutes are not supported.');

    const title = safeTitle(info.videoDetails?.title);
    const source = audioOnly
      ? ytdl(url, { quality: 'highestaudio', filter: 'audioonly', highWaterMark: 1 << 20 })
      : ytdl(url, {
          quality: 'highest',
          filter: format => format.container === 'mp4' && format.hasAudio && format.hasVideo,
          highWaterMark: 1 << 20,
        });

    if (!audioOnly && !ytdl.chooseFormat(info.formats, {
      quality: 'highest',
      filter: format => format.container === 'mp4' && format.hasAudio && format.hasVideo,
    })) {
      throw new Error('No MP4 format containing both audio and video is available for this video.');
    }

    await downloadBounded(source, sourcePath);
    let payloadPath = sourcePath;
    if (audioOnly) {
      await convertToMp3(sourcePath, outputPath);
      if (fs.statSync(outputPath).size > MAX_MEDIA_BYTES) {
        throw new Error('Converted audio is too large to send through WhatsApp (50 MB limit).');
      }
      payloadPath = outputPath;
    }

    await sock.sendMessage(jid, audioOnly
      ? { audio: { url: payloadPath }, mimetype: 'audio/mpeg', fileName: `${title}.mp3`, ptt: false }
      : { video: { url: payloadPath }, mimetype: 'video/mp4', fileName: `${title}.mp4`, caption: `🎬 ${info.videoDetails?.title || 'YouTube video'}` }, quoted);
  } finally {
    for (const filePath of [sourcePath, outputPath]) {
      try { fs.rmSync(filePath, { force: true }); } catch (error) { console.error('Temporary media cleanup failed:', error.message); }
    }
  }
}

module.exports = { downloadYouTube, validateYouTubeUrl, MAX_MEDIA_BYTES, MAX_DURATION_SECONDS };
