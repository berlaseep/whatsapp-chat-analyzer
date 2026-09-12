# Telegram upload notification fix

The upload flow now POSTs aggregate chat metadata to `/api/notify-upload`.
The Worker routes that endpoint to the Telegram sender.

No chat message contents are sent to Telegram.
The notification includes only:
- uploaded file name
- total message count
- participant count
- first/last date

The endpoint also returns a small GET diagnostic indicating whether the two
required Telegram secrets are present, without exposing their values.

Required Cloudflare Worker secrets:
- TELEGRAM_BOT_TOKEN
- TELEGRAM_ADMIN_CHAT_ID
