export async function onRequestGet({ env }) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return Response.json(
      { ok: false, error: "Falta TELEGRAM_BOT_TOKEN" },
      { status: 500 }
    );
  }

  if (!env.TELEGRAM_ADMIN_CHAT_ID) {
    return Response.json(
      { ok: false, error: "Falta TELEGRAM_ADMIN_CHAT_ID" },
      { status: 500 }
    );
  }

  const telegramUrl =
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  const response = await fetch(telegramUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
      text: "✅ Telegram conectado correctamente.",
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    return Response.json(
      {
        ok: false,
        error: "Telegram rechazó la petición",
        telegram: data,
      },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    message: "Mensaje enviado correctamente a Telegram",
  });
}
