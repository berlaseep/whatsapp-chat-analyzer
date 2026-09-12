export async function onRequestPost({ request, env }) {
  try {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Telegram no está configurado en el servidor.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body = await request.json();

    const {
      fileName,
      messageCount,
      participantCount,
      participants,
      firstDate,
      lastDate,
    } = body || {};

    if (!messageCount || !participantCount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Datos de análisis incompletos.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const safeFileName = String(fileName || "Sin nombre")
      .replace(/[\r\n]/g, " ")
      .slice(0, 120);

    const safeParticipants = Array.isArray(participants)
      ? participants
          .map((name) =>
            String(name)
              .replace(/[\r\n]/g, " ")
              .slice(0, 80)
          )
          .slice(0, 10)
      : [];

    const text = [
      "📥 <b>Nuevo chat analizado</b>",
      "",
      `📄 <b>Archivo:</b> ${escapeHtml(safeFileName)}`,
      `💬 <b>Mensajes:</b> ${Number(messageCount).toLocaleString("es-ES")}`,
      `👥 <b>Participantes:</b> ${Number(participantCount)}`,
      safeParticipants.length
        ? `🧑‍🤝‍🧑 <b>Nombres:</b> ${safeParticipants
            .map(escapeHtml)
            .join(", ")}`
        : "",
      firstDate
        ? `📅 <b>Inicio:</b> ${escapeHtml(firstDate)}`
        : "",
      lastDate
        ? `📅 <b>Fin:</b> ${escapeHtml(lastDate)}`
        : "",
      "",
      "🔒 <i>No se ha enviado el contenido del chat.</i>",
    ]
      .filter(Boolean)
      .join("\n");

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
          text,
          parse_mode: "HTML",
        }),
      }
    );

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok || !telegramData.ok) {
      console.error(
        "Error enviando notificación a Telegram:",
        telegramData
      );

      return new Response(
        JSON.stringify({
          success: false,
          error: "Telegram rechazó el mensaje.",
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error en /api/notify-upload:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno al enviar la notificación.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
