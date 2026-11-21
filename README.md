# BRIAN BOT

A WhatsApp assistant built with Node.js and Baileys, with an attractive pairing dashboard, an instant direct-message reply, and categorized command packs.

## Setup

```bash
npm install
npm start
```

Open `http://localhost:3000` to request a WhatsApp pairing code. On WhatsApp, choose **Linked devices → Link a device → Link with phone number instead**, then enter the code.

## Environment variables

- `PHONE_NUMBER` — optional default pairing phone number in international format, digits only.
- `OWNER_JID` — optional owner phone number (digits only); enables owner-only commands.
- `OFFICIAL_WHATSAPP_JID` — optional destination for the successful-link notice. Defaults to `OWNER_JID`, then the linked account.
- `AUTO_REPLY` — set to `false` to disable the instant greeting for ordinary one-to-one messages. Commands still work.
- `OPENAI_API_KEY` — optional; enables `.ai` and `.ask`.
- `AI_MODEL` — optional model name, defaults to `gpt-4o-mini`.
- `PORT` — dashboard port, defaults to `3000`.

When WhatsApp connects, BRIAN BOT sends a success message to the configured notification number. Keep the generated `auth/` session private and out of source control.

## Commands

Send `.menu` for the styled command index. Send `.menu quotes 1`, `.menu jokes 1`, `.menu facts 1`, `.menu affirmations 1`, or `.menu tips 1` to browse a category (20 commands per page). There are 510 numbered shortcuts: 102 in each of the five command packs. For example, `.joke001`, `.fact042`, and `.tip102`. Each pack command returns an item from its category.

Other commands include `.hi`, `.ping`, `.time`, `.date`, `.uptime`, `.about`, `.jid`, `.calc`, `.reverse`, `.base64`, `.ai`, `.ask`, `.groupinfo`, `.members`, `.tagall`, `.promote`, `.demote`, `.kick`, `.mediainfo`, `.save`, and owner-only `.status`, `.owners`, `.broadcast`.

Baileys links the bot as a WhatsApp companion device; this project is not the official WhatsApp Business Platform API.
