# BRIAN BOT

A WhatsApp assistant built with Node.js and Baileys, with an expanded command runtime and pairing dashboard.

## Setup

```bash
npm install
npm start
```

Open `http://localhost:3000` to request a WhatsApp pairing code. On WhatsApp, choose **Linked devices → Link a device → Link with phone number instead**, then enter the code.

## Commands

Send `.menu` or `.help` for the command menu.

BRIAN BOT provides 1000+ commands in each runtime category, including Utility, Fun, Media, Group, Owner, and Information panels. The numbered panel aliases are also available in `lib/commands.js`.

Working utility examples:

- `.ping`
- `.time`
- `.date`
- `.uptime`
- `.uuid`
- `.random [maximum]`
- `.password [length]`
- `.calc [expression]`
- `.reverse [text]`
- `.base64 [text]`
- `.status`
- `.stats`

## Environment variables

- `PHONE_NUMBER` — optional default pairing phone number in international format, digits only.
- `OWNER_JID` — optional owner phone number, enables owner-only command checks.
- `OFFICIAL_WHATSAPP_JID` — optional successful-link notice destination.
- `OPENAI_API_KEY` — optional AI integration key.
- `AI_MODEL` — optional AI model name, defaults to `gpt-4o-mini`.
- `PORT` — dashboard port, defaults to `3000`.
- `LOG_LEVEL` — Baileys log level, defaults to `warn`.

Keep `auth/` private and out of source control.
