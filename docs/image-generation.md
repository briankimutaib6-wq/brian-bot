# Image generation

Send `.image <description>` in the bot chat to generate and receive an image. For example:

```text
.image a cute cat in Nairobi
```

The bot builds a Pollinations Image API URL at `https://image.pollinations.ai/prompt/<URL-encoded-description>` and sends the generated image to WhatsApp. Prompts are limited to 500 characters. The service must be reachable by WhatsApp/Baileys when the image is sent.
