<p align="center">
  <a href="https://github.com/briankimutaib6-wq/brian-bot">
    <img src="https://capsule-render.vercel.app/api?type=waving&height=220&section=header&text=BRIAN%20BOT&fontSize=64&fontColor=ffffff&animation=twinkling&color=0:00c6ff,50:7b2ff7,100:f107a3" alt="Animated BRIAN BOT banner">
  </a>
</p>

<p align="center">
  <strong>A WhatsApp assistant built with Node.js, Express, and Baileys.</strong><br>
  Pair your WhatsApp account, chat with the bot, and explore its command packs.
</p>

<p align="center">
  <a href="https://brian-bot-uqaq.onrender.com/"><img alt="Open pairing dashboard" src="https://img.shields.io/badge/🔗_OPEN_PAIRING_DASHBOARD-25D366?style=for-the-badge"></a>
  <a href="https://katapump.com/"><img alt="Deploy on Katapump" src="https://img.shields.io/badge/🚀_DEPLOY_ON_KATAPUMP-6C4DF6?style=for-the-badge"></a>
</p>

## Pair your WhatsApp account

**[Click here to open the live pairing dashboard](https://brian-bot-uqaq.onrender.com/).** Enter your phone number in international format if prompted, then follow the dashboard instructions to get a pairing code.

On your phone, open WhatsApp and go to:

1. **Settings** (or the three-dot menu on Android)
2. **Linked devices**
3. **Link a device**
4. **Link with phone number instead**
5. Enter the pairing code shown on the dashboard

Keep your linked-device session private. Never share your pairing code or the generated `auth/` session files.

## Deploy on Katapump

<a href="https://katapump.com/"><img alt="Open Katapump" src="https://img.shields.io/badge/CLICK_TO_OPEN_KATAPUMP-6C4DF6?style=for-the-badge"></a>

Katapump deployment starts from its dashboard; this is a link to Katapump, not an automatic one-click import button. To deploy this repository:

1. Click **Open Katapump** above and sign in or create an account.
2. Create a new application/project and choose the option to deploy or clone from a Git repository.
3. Connect GitHub if asked, then select **`briankimutaib6-wq/brian-bot`** (or paste `https://github.com/briankimutaib6-wq/brian-bot`).
4. Choose **Node.js** and use **Node 20**. Set the start command to **`npm start`**.
5. Add any environment variables you need from the list below, then deploy.
6. Open the deployed app's URL to use its pairing dashboard. Pair your account using the steps above.

Keep the bot running on the hosting platform while using WhatsApp. Hosting-provider screens and available options can change; follow Katapump's current dashboard prompts if they differ.

## Run locally

Requirements: Node.js 20 and npm.

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) to request a WhatsApp pairing code. On WhatsApp, choose **Linked devices → Link a device → Link with phone number instead**, then enter the code.

## Features

- Web dashboard for WhatsApp phone-number pairing
- Automatic direct-message replies, enabled by default
- `.menu` command index with owner, main, download, group, VPN, and book panels
- Optional AI commands (`.ai` and `.ask`) when configured with an API key
- YouTube audio/video commands, including `.play`, `.ytmp3`, `.video`, and `.ytmp4`
- Additional utilities such as `.apk` and `.csong`

Send **`.menu`** in WhatsApp to see the available commands and usage details. Some commands depend on external services and may require configuration.

## Configuration

Set environment variables in your hosting dashboard or local environment as needed:

| Variable | Description |
| --- | --- |
| `PHONE_NUMBER` | Optional default pairing phone number in international format, digits only. |
| `OWNER_JID` | Optional owner phone number, digits only; enables owner-only commands. |
| `OFFICIAL_WHATSAPP_JID` | Optional destination for the successful-link notice. |
| `AUTO_REPLY` | Set to `false` to disable automatic replies to incoming direct messages. |
| `AUTO_REPLY_MESSAGE` | Optional custom automatic-reply text. |
| `OPENAI_API_KEY` | Optional API key; enables `.ai` and `.ask`. |
| `AI_MODEL` | Optional AI model name; defaults to `gpt-4o-mini`. |
| `PORT` | Dashboard port; defaults to `3000`. |
| `PREFIX_SETTINGS_PATH` | Optional path for persisted per-sender command prefixes. |

## Security

- Do not commit credentials, API keys, pairing codes, or WhatsApp session data.
- Keep the generated `auth/` directory private and out of source control.
- If a session or secret is exposed, revoke it and generate a new one.

## License

This project is distributed under the [MIT License](LICENSE).
