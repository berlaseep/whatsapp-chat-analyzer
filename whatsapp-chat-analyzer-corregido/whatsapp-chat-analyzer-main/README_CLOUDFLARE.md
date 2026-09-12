# WhatsApp Chat Analyzer — Cloudflare Workers

## Cloudflare Workers Builds
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Non-production branch deploy command: `npx wrangler versions upload`
- Root directory: `/`
- API token: leave the Cloudflare-generated token selected

## Runtime secret
In Workers > Settings > Variables and Secrets, add an encrypted secret:
`GEMINI_API_KEY` = your Google Gemini API key.

## Local
1. `npm install`
2. `npm run dev`

For a local Cloudflare-style deployment, use Wrangler after installing it with `npx wrangler@latest dev`.

The frontend is built to `dist/`. The Worker serves those assets and handles `/api/ai` and `/api/health`.


## Telegram upload notifications
The Worker can notify the configured administrator when a WhatsApp chat is uploaded. The chat content is not sent to Telegram; only aggregate metadata is sent.

Add these encrypted Worker secrets in **Workers > Settings > Variables and Secrets**:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_CHAT_ID`

The notification endpoint is `POST /api/notify-upload`. A `GET` request reports whether both Telegram variables are present without exposing their values.
