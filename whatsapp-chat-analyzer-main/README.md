# WhatsApp Chat Analyzer — MVP

## Qué incluye
- Importación local de TXT exportado de WhatsApp.
- Parser de fechas, horas, mensajes multilínea y participantes.
- Dashboard responsive/mobile-first.
- Mensajes totales, actividad diaria y horaria.
- Sesiones con umbral de 12 h.
- Tiempos de respuesta.
- Rankings básicos: mensajes, vocabulario, rapidez, amor, humor, gracias, perdón y palabrotas.
- Top palabras, nombres y emojis.
- Mensaje más largo.
- Secciones de personalidad, relación, IA y curiosidades.
- Sin backend ni API key en esta primera versión: el análisis estadístico ocurre en el navegador.

## Ejecutar
Necesitas Node.js 18+.

```bash
npm install
npm run dev
```

Abre la URL que indique Vite. Para usarlo en el teléfono dentro de la misma Wi‑Fi, ejecuta:

```bash
npm run dev -- --host 0.0.0.0
```

## Siguiente fase
La integración de IA debe hacerse mediante un backend/proxy para no exponer la API key. El proveedor se debe poder cambiar sin tocar el motor estadístico.

## Dónde editar listas

Todas las listas editables están en **`src/config.js`**:

- `BANNED_NAMES`: falsos positivos que no deben detectarse como personas.
- `BANNED_WORDS`: palabras que no entran al vocabulario.
- `USER_WORDS`: palabras propias que quieres conservar.
- `SWEARS`, `LOVE`, `THANKS`, `SORRY`, `LAUGH`: categorías usadas por los rankings.
- `STOPWORDS`: palabras comunes ignoradas.

Si detecta, por ejemplo, `Archivo` como nombre de una persona, añade `"Archivo"` a `BANNED_NAMES`.

## IA

La sección IA usa Gemini como proveedor inicial. Google mantiene un nivel gratuito para determinados modelos y límites; consulta los límites actuales antes de publicar. Fuente oficial: https://ai.google.dev/gemini-api/docs/pricing

Para desarrollo: ejecuta Vite y el proxy. La API key se introduce en la sección IA. Para producción, mueve la clave a una variable de entorno del servidor y no la guardes en `localStorage`.

## Ejecutar IA en desarrollo

La IA usa el endpoint local `/api/ai`, que Vite redirige a `http://localhost:8787`.
Por tanto, abre DOS terminales en la carpeta del proyecto:

Terminal 1:
`npm run dev`

Terminal 2:
`npm run server`

Después abre la web en la dirección de Vite. Si el servidor de IA no está activo, la interfaz ahora mostrará un error explicativo en lugar de `Unexpected end of JSON input`.
