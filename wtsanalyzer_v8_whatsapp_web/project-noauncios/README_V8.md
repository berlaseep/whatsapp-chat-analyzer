# WhatsApp Chat Analyzer V8

## Incluido
- Vista móvil revisada.
- TXT y ZIP de WhatsApp; dentro del ZIP se detecta cualquier TXT de chat, sin depender de `_chat.txt`.
- Estadísticas básicas gratuitas.
- Estadísticas divertidas con puerta de anuncio recompensado.
- Gemini: se genera el informe y se requiere anuncio recompensado para leer/descargar el contenido completo.
- WhatsApp Wrapped con anuncio recompensado.
- Telemetría: envía al administrador de Telegram estadísticas agregadas de cada chat y el resultado del análisis IA. No envía el TXT completo por telemetría.
- Bot privado de Telegram para modificar `src/config.js` desde Telegram.
- Cambios del bot se hacen mediante GitHub API, por lo que el despliegue automático de Workers puede recogerlos.

## Anuncios
El proyecto incluye un adaptador `window.showRewardedAd` en el frontend. No se finge que un clic sea un anuncio: hasta integrar un proveedor real, las funciones protegidas informarán de que el anuncio recompensado no está configurado.

Cuando tengas el proveedor, debe existir:
`window.showRewardedAd = async ({ feature }) => true/false`

## Telegram + GitHub
Configura en Cloudflare los secretos/variables de `.dev.vars.example`.

El bot acepta, entre otros:
- `/add nombre María`
- `/del nombre María`
- `/add palabra bro`
- `/del palabra bro`
- `/add insulto palabra`
- `/add amor cariño`
- `/add gracias gracias`
- `/add perdon perdón`
- `/add risa jajaja`
- `/add stopword ejemplo`
- `/add propia javi`
- `/list nombre`
- `/help`

Para el webhook de Telegram usa `/api/telegram/webhook` y configura el `secret_token` para que coincida con `TELEGRAM_WEBHOOK_SECRET`.

El token de GitHub debe tener permiso para modificar el contenido del repositorio. No lo pongas en el frontend.

## Configurar webhook de Telegram
Una vez desplegado el Worker, configura el webhook de Telegram para que apunte a:
`https://TU-DOMINIO/api/telegram/webhook`

La llamada debe incluir el `secret_token` que hayas guardado como `TELEGRAM_WEBHOOK_SECRET`. Puedes hacerlo con la API oficial de Telegram desde tu terminal o desde cualquier herramienta HTTP. No pongas el token del bot en el frontend.

## Importante sobre anuncios
La lógica de las funciones bloqueadas está lista, pero el anuncio recompensado real depende del proveedor publicitario y de tu cuenta/publisher ID. El proyecto no inventa una recompensa: si `window.showRewardedAd` no existe, el botón avisa de que falta configurar el proveedor.
