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
      if (request.method === "POST") {
        return onNotifyUploadPost({ request, env, ctx });
      }

      if (request.method === "GET") {
        return new Response(
          JSON.stringify({
            ok: true,
            telegramConfigured: Boolean(
              env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID
            ),
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

      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, POST" },
      });
    }

    // ---------------------------------------------------------
    // FRONTEND
    // ---------------------------------------------------------

    return env.ASSETS.fetch(request);
  },
};
