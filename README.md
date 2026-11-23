# BRIAN BOT

A WhatsApp assistant built with Node.js and Baileys, with an attractive pairing dashboard, automatic direct-message replies, and categorized command packs.

## Setup

```bash
npm install
npm start
```

Open `http://localhost:3000` to request a WhatsApp pairing code. On WhatsApp, choose **Linked devices → Link a device → Link with phone number instead**, then enter the code.

## Environment variables

- `PHONE_NUMBER` — optional default pairing phone number in international format, digits only.
- `OWNER_JID` — optional owner phone number (digits only); enables owner-only commands.
- `OFFICIAL_WHATSAPP_JID` — optional destination for the successful-link notice.
- `AUTO_REPLY` — set to `false` to disable automatic replies to incoming direct messages (enabled by default).
- `AUTO_REPLY_MESSAGE` — optional custom text for automatic replies. Defaults to a greeting with `.menu` instructions.
- `OPENAI_API_KEY` — optional; enables `.ai` and `.ask`.
- `AI_MODEL` — optional model name, defaults to `gpt-4o-mini`.
- `PORT` — dashboard port, defaults to `3000`.
- `PREFIX_SETTINGS_PATH` — optional path for persisted per-sender command prefixes.

Keep the generated `auth/` session private and out of source control.

## Commands

Send `.menu` for the styled command index. The bot includes owner, main, download, group, VPN, and book panels. `.apk <app name>` looks up an APK using the David Cyril Tech API, and `.csong <song or artist>` searches Apple Music/iTunes and returns matching tracks and preview links. Commands are handled normally; the automatic greeting applies only to non-command messages in direct chats, not groups.
