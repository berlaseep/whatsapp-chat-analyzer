import {
  onRequestPost,
  onRequestOptions,
} from "../functions/api/ai.js";

import {
  onRequestPost as onNotifyUploadPost,
} from "../functions/api/notify-upload.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

import {
  onRequestGet as onTelegramTestGet,
} from "../functions/api/telegram-test.js";
    
    // ---------------------------------------------------------
    // HEALTH CHECK
    // ---------------------------------------------------------

    if (
      url.pathname === "/api/health" &&
      request.method === "GET"
    ) {
      return new Response(
        JSON.stringify({
          ok: true,
          service: "whatsapp-chat-analyzer",
          runtime: "cloudflare-workers",
        }),
        {
          headers: {
            "Content-Type":
              "application/json; charset=utf-8",
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    // ---------------------------------------------------------
    // IA
    // ---------------------------------------------------------

    if (url.pathname === "/api/ai") {
      if (request.method === "OPTIONS") {
        return onRequestOptions();
      }

      if (request.method === "POST") {
        return onRequestPost({
          request,
          env,
          ctx,
        });
      }

      return new Response(
        "Method Not Allowed",
        {
          status: 405,
          headers: {
            Allow: "POST, OPTIONS",
          },
        }
      );
    }

    // ---------------------------------------------------------
    // NOTIFICACIÓN TELEGRAM
    // ---------------------------------------------------------

    if (url.pathname === "/api/notify-upload") {
      // GET is intentionally a diagnostic endpoint. It must return JSON
      // instead of falling through to the SPA, so deployment can be tested
      // directly from a browser.
      if (request.method === "GET") {
        return new Response(
          JSON.stringify({
            ok: true,
            endpoint: "/api/notify-upload",
            method: "POST",
            telegramConfigured: Boolean(
              env.TELEGRAM_BOT_TOKEN &&
              env.TELEGRAM_ADMIN_CHAT_ID
            ),
            message: "Endpoint activo. Usa POST para enviar una notificación."
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store",
            },
          }
        );
      }

      if (request.method === "POST") {
        return onNotifyUploadPost({
          request,
          env,
          ctx,
        });
      }

      return new Response(
        JSON.stringify({
          ok: false,
          error: "Method Not Allowed",
        }),
        {
          status: 405,
          headers: {
            Allow: "GET, POST",
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    }



    // ---------------------------------------------------------
    // PRUEBA TELEGRAM
    // ---------------------------------------------------------

    if (
      url.pathname === "/api/telegram-test" &&
      request.method === "GET"
    ) {
      return onTelegramTestGet({
        request,
        env,
        ctx,
      });
    }


    
    // ---------------------------------------------------------
    // FRONTEND
    // ---------------------------------------------------------

    return env.ASSETS.fetch(request);
  },
};
