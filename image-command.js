'use strict';

// image-command.js - Image generation for Brian Bot
// Handles .image, .img, .imagine, and .aiimage.

async function handleImage(sock, from, args, sender, message) {
  const promptText = String(args || '').trim();
  const quoted = message ? { quoted: message } : {};

  if (!promptText) {
    await sock.sendMessage(from, {
      text: '🖼️ *IMAGE GENERATOR*\n\nUsage: .image <what you want>\nExample: .image a lion wearing a crown'
    }, quoted);
    return;
  }

  await sock.sendMessage(from, {
    text: `🎨 Generating image...\n"${promptText}"\nPlease wait...`
  }, quoted);

  try {
    // Pollinations image generation does not require an API key.
    const prompt = encodeURIComponent(promptText);
    const seed = Math.floor(Math.random() * 9999);
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&seed=${seed}&nologo=true`;
    const senderId = String(sender || '').split('@')[0];
    const options = {
      image: { url },
      caption: `🖼️ *Generated:*\n"${promptText}"${senderId ? `\n\nRequested by @${senderId}` : ''}`
    };
    if (sender) options.mentions = [sender];

    await sock.sendMessage(from, options, quoted);
  } catch (error) {
    console.error('Image generation failed:', error?.message || error);
    await sock.sendMessage(from, {
      text: '❌ Failed to generate image. Try again.'
    }, quoted);
  }
}

module.exports = handleImage;
