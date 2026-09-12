export async function onRequestPost({ request, env }) {
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });

  try {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) {
      console.error("Telegram secrets missing.");
      return json(
        { success: false, error: "Telegram no está configurado en el servidor." },
        500
      );
    }

    const body = await request.json();

    const messageCount = Number(body?.messageCount);
    const participantCount = Number(body?.participantCount);

    if (
      !Number.isFinite(messageCount) ||
      messageCount < 1 ||
      !Number.isFinite(participantCount) ||
      participantCount < 1
    ) {
      return json(
        { success: false, error: "Datos de análisis incompletos." },
        400
      );
    }

    const fileName = clean(body?.fileName, 120) || "Sin nombre";
    const firstDate = clean(body?.firstDate, 40);
    const lastDate = clean(body?.lastDate, 40);

    const text = [
      "📥 <b>Nuevo chat analizado</b>",
      "",
      `📄 <b>Archivo:</b> ${escapeHtml(fileName)}`,
      `💬 <b>Mensajes:</b> ${messageCount.toLocaleString("es-ES")}`,
      `👥 <b>Participantes:</b> ${participantCount}`,
      firstDate ? `📅 <b>Inicio:</b> ${escapeHtml(firstDate)}` : "",
      lastDate ? `📅 <b>Fin:</b> ${escapeHtml(lastDate)}` : "",
      "",
      "🔒 <i>No se ha enviado el contenido del chat.</i>",
    ]
      .filter(Boolean)
      .join("\n");

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok || !telegramData.ok) {
      console.error("Telegram sendMessage failed:", telegramData);
      return json(
        {
          success: false,
          error: "Telegram rechazó el mensaje.",
          telegramError: telegramData?.description || null,
        },
        502
      );
    }

    return json({ success: true });
  } catch (error) {
    console.error("Error en /api/notify-upload:", error);
    return json(
      { success: false, error: "Error interno al enviar la notificación." },
      500
    );
  }
}

function clean(value, maxLength) {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
