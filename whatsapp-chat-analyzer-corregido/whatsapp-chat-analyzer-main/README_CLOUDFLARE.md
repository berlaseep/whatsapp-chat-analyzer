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


## Notificaciones de Telegram

El frontend notifica cada subida mediante `POST /api/notify-upload`. Solo se envian estadisticas agregadas; no se envia el contenido del chat.

Configura como Secrets del Worker:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_CHAT_ID`

Puedes comprobar que el endpoint desplegado esta activo abriendo:

`/api/notify-upload`

Debe responder JSON con `endpoint: "/api/notify-upload"`. Si aparece la web de la aplicacion, el Worker nuevo no esta desplegado.
