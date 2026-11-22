# BRIAN BOT

A WhatsApp assistant built with Node.js and Baileys, with an attractive pairing dashboard, instant direct-message replies, and categorized command packs.

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
- `AUTO_REPLY` — set to `false` to disable instant greetings.
- `OPENAI_API_KEY` — optional; enables `.ai` and `.ask`.
- `AI_MODEL` — optional model name, defaults to `gpt-4o-mini`.
- `PORT` — dashboard port, defaults to `3000`.

Keep the generated `auth/` session private and out of source control.

## Commands

Send `.menu` for the styled command index. The bot includes owner, main, download, group, VPN, and book panels.
