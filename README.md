# BRIAN BOT

A modern WhatsApp bot built with Node.js and Baileys.

## Setup

```bash
npm install
npm start
```

Open `http://localhost:3000` to generate a WhatsApp pairing code.

## Environment variables

- `PHONE_NUMBER` — default pairing number in international format, digits only.
- `OWNER_JID` — owner phone number for owner commands.
- `OFFICIAL_WHATSAPP_JID` — number that receives the successful connection notification.
- `OPENAI_API_KEY` — enables `.ai` and `.ask` commands.
- `AI_MODEL` — optional OpenAI model, default `gpt-4o-mini`.
- `PORT` — dashboard port, default `3000`.

If `OFFICIAL_WHATSAPP_JID` is omitted, the bot attempts to notify the linked account.

## Commands

Send `.menu` in WhatsApp to show the complete command list.
