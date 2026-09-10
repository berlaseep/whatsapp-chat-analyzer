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


## V8 — Variables adicionales

Para el bot y la telemetría configura también en Workers > Settings > Variables and Secrets:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET`
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `ADMIN_PANEL_TOKEN`

Si tu proyecto de Workers Build sigue intentando ejecutar `npm clean-install`, usa `SKIP_DEPENDENCY_INSTALL=1` y como Build command `npm install && npm run build`.
