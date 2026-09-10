const MAX_TELEGRAM_TEXT = 3900;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function chunk(text, size = MAX_TELEGRAM_TEXT) {
  const value = String(text || "");
  const parts = [];
  for (let i = 0; i < value.length; i += size) parts.push(value.slice(i, i + size));
  return parts.length ? parts : [""];
}

async function telegramSend(env, text, replyMarkup = undefined) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) return false;
  for (const part of chunk(text)) {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
        text: part,
        disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    });
    if (!response.ok) console.error("Telegram telemetry error:", await response.text());
  }
  return true;
}

function safeString(value, fallback = "—") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function onTelemetryPost({ request, env }) {
  try {
    const origin = request.headers.get("Origin");
    if (origin && origin !== new URL(request.url).origin) {
      return jsonResponse({ success: false, error: "Origen no permitido." }, 403);
    }

    const body = await request.json();
    const type = body?.type;

    if (type === "chat") {
      const stats = body.stats || {};
      const names = Array.isArray(stats.topNames) ? stats.topNames : [];
      const words = Array.isArray(stats.topWords) ? stats.topWords : [];

      const message = [
        "📥 NUEVO CHAT ANALIZADO",
        `Plataforma: ${safeString(body.platform)}`,
        `Formato: ${safeString(body.fileType)}`,
        `Mensajes: ${Number(body.messages || stats.totalMessages || 0).toLocaleString("es-ES")}`,
        `Participantes: ${Number(body.users || 0)}`,
        `Palabras: ${Number(stats.totalWords || 0).toLocaleString("es-ES")}`,
        `Emojis: ${Number(stats.emojis || 0).toLocaleString("es-ES")}`,
        "",
        "🏷️ NOMBRES REPETIDOS",
        ...names.slice(0, 20).map((x, i) => `${i + 1}. ${safeString(x.name)} — ${x.count}`),
        "",
        "🔤 PALABRAS DESTACADAS",
        ...words.slice(0, 30).map((x, i) => `${i + 1}. ${safeString(x.word)} — ${x.count} (${safeString(x.user)})`),
      ].join("\n");

      await telegramSend(env, message);

      const candidateNames = names.filter(x => Number(x.count) >= 5).slice(0, 5);
      const candidateWords = words.filter(x => Number(x.count) >= 10).slice(0, 5);
      for (const item of candidateNames) {
        await telegramSend(env, `🔎 POSIBLE NOMBRE
${safeString(item.name)} — ${item.count} apariciones`, {
          inline_keyboard: [[
            { text: "✅ Añadir nombre", callback_data: `add:name:${safeString(item.name).slice(0, 50)}` },
            { text: "❌ Ignorar", callback_data: `ignore:name:${safeString(item.name).slice(0, 50)}` }
          ]]
        });
      }
      for (const item of candidateWords) {
        await telegramSend(env, `🔎 POSIBLE PALABRA
${safeString(item.word)} — ${item.count} apariciones`, {
          inline_keyboard: [[
            { text: "✅ Añadir palabra", callback_data: `add:word:${safeString(item.word).slice(0, 50)}` },
            { text: "❌ Ignorar", callback_data: `ignore:word:${safeString(item.word).slice(0, 50)}` }
          ]]
        });
      }
    } else if (type === "ai") {
      const report = body.report || {};
      const users = Array.isArray(body.users) ? body.users : [];
      const message = [
        "🤖 NUEVO ANÁLISIS IA",
        `Participantes: ${users.join(" y ") || "—"}`,
        "",
        `RESUMEN: ${safeString(report.summary)}`,
        `INTERÉS: ${report.interest_score ?? "—"}/100 — ${safeString(report.interest_label)}`,
        `RECIPROCIDAD: ${report.reciprocity_score ?? "—"}/100 — ${safeString(report.reciprocity_label)}`,
        `COMUNICACIÓN: ${report.communication_score ?? "—"}/100 — ${safeString(report.communication_label)}`,
        "",
        "DINÁMICA:", safeString(report.dynamic),
        "",
        "RED FLAGS:", ...(Array.isArray(report.red_flags) ? report.red_flags.map(x => `• ${x}`) : ["• —"]),
        "",
        "GREEN FLAGS:", ...(Array.isArray(report.green_flags) ? report.green_flags.map(x => `• ${x}`) : ["• —"]),
        "",
        "APEGO:", safeString(report.attachment),
        "",
        "CONCLUSIÓN:", safeString(report.conclusion),
      ].join("\n");

      await telegramSend(env, message);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Telemetry error:", error);
    return jsonResponse({ success: false }, 400);
  }
}
