module.exports = async function handleImage(sock, from, args, sender) {
  if (!args) {
    await sock.sendMessage(from, { text: 'Usage: .image <prompt>\nExample: .image a lion with crown' });
    return;
  }
  await sock.sendMessage(from, { text: `🎨 Generating: "${args}"...` });
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(args)}?width=1024&height=1024&nologo=true`;
  await sock.sendMessage(from, { image: { url }, caption: `🖼️ ${args}` });
}
